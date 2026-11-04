-- =============================================================================
-- Migration 014: Reconcile Live Schema
-- File: supabase/migrations/014_reconcile_live_schema.sql
--
-- CHANGES RECONCILED:
-- 1. Ensure user_id column exists on all user-owned tables with DEFAULT auth.uid().
-- 2. Ensure missing habit styling & amount columns exist (target_value, unit,
--    step_value, color, icon, notes) and check constraints permit 'amount'.
-- 3. Ensure day_habit_completions columns exist (is_skipped, amount, target_snapshot).
-- 4. Ensure month_reviews columns exist (what_went_well, habit_needs_work, one_thing_to_change)
--    and composite unique constraint (user_id, year, month).
-- 5. Recreate month_reviews best/worst habit foreign keys with ON DELETE SET NULL.
-- 6. Ensure weekly_intentions table exists with composite unique (user_id, year, week_number).
-- 7. Clean duplicate index/constraint on day_entries: drop redundant (date, user_id)
--    and idx_day_entries_user_id; preserve canonical day_entries_user_date_key (user_id, date).
-- 8. Pre-check DO block: verifies 0 NULLs in user_id across all user-owned tables
--    (raises exception if orphaned rows remain). Sets NOT NULL once 0 NULLs verified.
-- 9. REVOKE ALL on all tables, sequences, functions in schema public from anon,
--    plus matching ALTER DEFAULT PRIVILEGES.
-- 10. Consolidate RLS policies: drops all existing policies and establishes exactly
--     one canonical policy per command (SELECT, INSERT, UPDATE, DELETE) per table
--     using (select auth.uid()) for optimal initplan evaluation. Completions and
--     sub-items keep parent-ownership checks on INSERT and repeat them in UPDATE WITH CHECK.
-- 11. Update log_focus_session function to align ON CONFLICT with canonical (user_id, date).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EXTENSIONS & PREREQUISITES
-- -----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 2. ENSURE COLUMNS, DEFAULTS & CONSTRAINTS ON USER-OWNED TABLES
-- -----------------------------------------------------------------------------

-- 2.1 habits
alter table if exists public.habits
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table if exists public.habits
  alter column user_id set default auth.uid();

alter table if exists public.habits
  add column if not exists notes text,
  add column if not exists target_value numeric check (target_value is null or target_value > 0),
  add column if not exists unit text check (unit is null or char_length(unit) <= 16),
  add column if not exists step_value numeric not null default 1 check (step_value > 0),
  add column if not exists color text not null default 'sage'
    check (color in ('sage','clay','sky','amber','plum','rose','slate','teal')),
  add column if not exists icon text not null default 'check';

-- Check constraints on habits.type
alter table if exists public.habits drop constraint if exists habits_type_check;
alter table if exists public.habits add constraint habits_type_check
  check (type in ('checkbox', 'checklist', 'amount'));

alter table if exists public.habits drop constraint if exists habits_amount_needs_target;
alter table if exists public.habits add constraint habits_amount_needs_target
  check (type <> 'amount' or (target_value is not null and unit is not null));

-- 2.2 habit_subitems
alter table if exists public.habit_subitems
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table if exists public.habit_subitems
  alter column user_id set default auth.uid();

-- 2.3 day_entries
alter table if exists public.day_entries
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table if exists public.day_entries
  alter column user_id set default auth.uid();

-- 2.4 day_habit_completions
alter table if exists public.day_habit_completions
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists is_skipped boolean not null default false,
  add column if not exists amount numeric not null default 0 check (amount >= 0),
  add column if not exists target_snapshot numeric;
alter table if exists public.day_habit_completions
  alter column user_id set default auth.uid();

-- 2.5 day_subitem_completions
alter table if exists public.day_subitem_completions
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table if exists public.day_subitem_completions
  alter column user_id set default auth.uid();

-- 2.6 month_reviews
alter table if exists public.month_reviews
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists what_went_well text,
  add column if not exists habit_needs_work text,
  add column if not exists one_thing_to_change text;
alter table if exists public.month_reviews
  alter column user_id set default auth.uid();

alter table if exists public.month_reviews drop constraint if exists month_reviews_year_month_key;
alter table if exists public.month_reviews drop constraint if exists month_reviews_user_year_month_key;
alter table if exists public.month_reviews
  add constraint month_reviews_user_year_month_key unique (user_id, year, month);

-- Recreate month_reviews best/worst habit foreign keys with ON DELETE SET NULL
do $$
declare
  c_name text;
begin
  for c_name in (
    select conname
    from pg_constraint
    where conrelid = 'public.month_reviews'::regclass
      and confrelid = 'public.habits'::regclass
  ) loop
    execute format('alter table public.month_reviews drop constraint if exists %I', c_name);
  end loop;
end;
$$;

alter table if exists public.month_reviews
  add constraint month_reviews_best_habit_id_fkey
    foreign key (best_habit_id) references public.habits(id) on delete set null,
  add constraint month_reviews_worst_habit_id_fkey
    foreign key (worst_habit_id) references public.habits(id) on delete set null;

-- 2.7 quotes
alter table if exists public.quotes
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table if exists public.quotes
  alter column user_id set default auth.uid();

-- 2.8 weekly_intentions
create table if not exists public.weekly_intentions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  year integer not null,
  week_number integer not null,
  intention text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_intentions_user_year_week_key unique (user_id, year, week_number)
);
alter table if exists public.weekly_intentions
  alter column user_id set default auth.uid();

-- 2.9 habit_day_notes & focus_sessions (ensure default auth.uid() if created)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'habit_day_notes') then
    alter table public.habit_day_notes alter column user_id set default auth.uid();
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'focus_sessions') then
    alter table public.focus_sessions alter column user_id set default auth.uid();
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. DROP REDUNDANT INDEXES & DUPLICATE CONSTRAINTS ON day_entries
-- Keep canonical (user_id, date) constraint and index.
-- -----------------------------------------------------------------------------
-- Drop legacy single-column date constraint if still present
alter table if exists public.day_entries
  drop constraint if exists day_entries_date_key;

-- Drop redundant reverse compound constraint (date, user_id)
alter table if exists public.day_entries
  drop constraint if exists day_entries_date_user_key;
alter table if exists public.day_entries
  drop constraint if exists day_entries_date_user_id_key;

-- Drop redundant standalone user_id index (leading column in (user_id, date) makes it redundant)
drop index if exists public.idx_day_entries_user_id;
drop index if exists public.idx_day_entries_date_user;
drop index if exists public.idx_day_entries_date_user_id;

-- Ensure canonical compound constraint and index on (user_id, date)
alter table if exists public.day_entries
  drop constraint if exists day_entries_user_date_key;
alter table if exists public.day_entries
  add constraint day_entries_user_date_key unique (user_id, date);

create index if not exists idx_day_entries_user_date
  on public.day_entries (user_id, date);

-- -----------------------------------------------------------------------------
-- 4. VERIFY ZERO NULL user_id VALUES BEFORE SETTING NOT NULL
-- Raises an exception with exact table counts if orphaned rows exist.
-- -----------------------------------------------------------------------------
do $$
declare
  null_found boolean := false;
  null_details text := '';
  t text;
  c bigint;
  tables_to_check text[] := array[
    'habits',
    'habit_subitems',
    'day_entries',
    'day_habit_completions',
    'day_subitem_completions',
    'month_reviews',
    'quotes',
    'weekly_intentions',
    'habit_day_notes',
    'focus_sessions'
  ];
begin
  foreach t in array tables_to_check loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'user_id'
    ) then
      execute format('select count(*) from public.%I where user_id is null', t) into c;
      if c > 0 then
        null_found := true;
        null_details := null_details || format('[Table "%s": %s orphaned row(s) with NULL user_id] ', t, c);
      end if;
    end if;
  end loop;

  if null_found then
    raise exception 'PRE-CHECK FAILED: Cannot set NOT NULL on user_id. % Clean, delete, or backfill ownerless rows first.', null_details;
  end if;
end;
$$;

-- Enforce NOT NULL on all tables once proven 0 NULLs
alter table if exists public.habits
  alter column user_id set not null;
alter table if exists public.habit_subitems
  alter column user_id set not null;
alter table if exists public.day_entries
  alter column user_id set not null;
alter table if exists public.day_habit_completions
  alter column user_id set not null;
alter table if exists public.day_subitem_completions
  alter column user_id set not null;
alter table if exists public.month_reviews
  alter column user_id set not null;
alter table if exists public.quotes
  alter column user_id set not null;
alter table if exists public.weekly_intentions
  alter column user_id set not null;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'habit_day_notes') then
    alter table public.habit_day_notes alter column user_id set not null;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'focus_sessions') then
    alter table public.focus_sessions alter column user_id set not null;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. REVOKE ALL FROM anon & SECURE DEFAULT PRIVILEGES
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all routines in schema public from anon;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on routines from anon;

-- Ensure authenticated role maintains standard privileges
grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant all on all routines in schema public to authenticated;

alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant all on sequences to authenticated;
alter default privileges in schema public grant all on routines to authenticated;

-- -----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY CONSOLIDATION
-- Drop all legacy duplicate policies and establish exactly 1 canonical policy
-- per command (SELECT, INSERT, UPDATE, DELETE) per table using (select auth.uid()).
-- Completions and sub-items enforce parent-ownership checks on INSERT and repeat
-- them in UPDATE WITH CHECK.
-- -----------------------------------------------------------------------------

-- 6.1 Enable RLS on all user tables
alter table if exists public.habits enable row level security;
alter table if exists public.habit_subitems enable row level security;
alter table if exists public.day_entries enable row level security;
alter table if exists public.day_habit_completions enable row level security;
alter table if exists public.day_subitem_completions enable row level security;
alter table if exists public.month_reviews enable row level security;
alter table if exists public.quotes enable row level security;
alter table if exists public.weekly_intentions enable row level security;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'habit_day_notes') then
    alter table public.habit_day_notes enable row level security;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'focus_sessions') then
    alter table public.focus_sessions enable row level security;
  end if;
end;
$$;

-- 6.2 Drop all pre-existing policies on these tables
do $$
declare
  pol record;
begin
  for pol in (
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'habits',
        'habit_subitems',
        'day_entries',
        'day_habit_completions',
        'day_subitem_completions',
        'month_reviews',
        'quotes',
        'weekly_intentions',
        'habit_day_notes',
        'focus_sessions'
      )
  ) loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end;
$$;

-- 6.3 TABLE: habits
create policy "habits_select" on public.habits
  for select using (user_id = (select auth.uid()));

create policy "habits_insert" on public.habits
  for insert with check (user_id = (select auth.uid()));

create policy "habits_update" on public.habits
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "habits_delete" on public.habits
  for delete using (user_id = (select auth.uid()));

-- 6.4 TABLE: habit_subitems (verifies parent habit ownership on INSERT and UPDATE)
create policy "habit_subitems_select" on public.habit_subitems
  for select using (user_id = (select auth.uid()));

create policy "habit_subitems_insert" on public.habit_subitems
  for insert with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.habits h
      where h.id = habit_subitems.habit_id
        and h.user_id = (select auth.uid())
    )
  );

create policy "habit_subitems_update" on public.habit_subitems
  for update
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.habits h
      where h.id = habit_subitems.habit_id
        and h.user_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.habits h
      where h.id = habit_subitems.habit_id
        and h.user_id = (select auth.uid())
    )
  );

create policy "habit_subitems_delete" on public.habit_subitems
  for delete using (user_id = (select auth.uid()));

-- 6.5 TABLE: day_entries
create policy "day_entries_select" on public.day_entries
  for select using (user_id = (select auth.uid()));

create policy "day_entries_insert" on public.day_entries
  for insert with check (user_id = (select auth.uid()));

create policy "day_entries_update" on public.day_entries
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "day_entries_delete" on public.day_entries
  for delete using (user_id = (select auth.uid()));

-- 6.6 TABLE: day_habit_completions (verifies parent day_entry & habit ownership on INSERT and UPDATE)
create policy "day_habit_completions_select" on public.day_habit_completions
  for select using (user_id = (select auth.uid()));

create policy "day_habit_completions_insert" on public.day_habit_completions
  for insert with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.day_entries de
      where de.id = day_habit_completions.day_entry_id
        and de.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.habits h
      where h.id = day_habit_completions.habit_id
        and h.user_id = (select auth.uid())
    )
  );

create policy "day_habit_completions_update" on public.day_habit_completions
  for update
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.day_entries de
      where de.id = day_habit_completions.day_entry_id
        and de.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.habits h
      where h.id = day_habit_completions.habit_id
        and h.user_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.day_entries de
      where de.id = day_habit_completions.day_entry_id
        and de.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.habits h
      where h.id = day_habit_completions.habit_id
        and h.user_id = (select auth.uid())
    )
  );

create policy "day_habit_completions_delete" on public.day_habit_completions
  for delete using (user_id = (select auth.uid()));

-- 6.7 TABLE: day_subitem_completions (verifies parent day_entry & subitem ownership on INSERT and UPDATE)
create policy "day_subitem_completions_select" on public.day_subitem_completions
  for select using (user_id = (select auth.uid()));

create policy "day_subitem_completions_insert" on public.day_subitem_completions
  for insert with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.day_entries de
      where de.id = day_subitem_completions.day_entry_id
        and de.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.habit_subitems hs
      where hs.id = day_subitem_completions.subitem_id
        and hs.user_id = (select auth.uid())
    )
  );

create policy "day_subitem_completions_update" on public.day_subitem_completions
  for update
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.day_entries de
      where de.id = day_subitem_completions.day_entry_id
        and de.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.habit_subitems hs
      where hs.id = day_subitem_completions.subitem_id
        and hs.user_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.day_entries de
      where de.id = day_subitem_completions.day_entry_id
        and de.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.habit_subitems hs
      where hs.id = day_subitem_completions.subitem_id
        and hs.user_id = (select auth.uid())
    )
  );

create policy "day_subitem_completions_delete" on public.day_subitem_completions
  for delete using (user_id = (select auth.uid()));

-- 6.8 TABLE: month_reviews
create policy "month_reviews_select" on public.month_reviews
  for select using (user_id = (select auth.uid()));

create policy "month_reviews_insert" on public.month_reviews
  for insert with check (user_id = (select auth.uid()));

create policy "month_reviews_update" on public.month_reviews
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "month_reviews_delete" on public.month_reviews
  for delete using (user_id = (select auth.uid()));

-- 6.9 TABLE: quotes
create policy "quotes_select" on public.quotes
  for select using (user_id = (select auth.uid()));

create policy "quotes_insert" on public.quotes
  for insert with check (user_id = (select auth.uid()));

create policy "quotes_update" on public.quotes
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "quotes_delete" on public.quotes
  for delete using (user_id = (select auth.uid()));

-- 6.10 TABLE: weekly_intentions
create policy "weekly_intentions_select" on public.weekly_intentions
  for select using (user_id = (select auth.uid()));

create policy "weekly_intentions_insert" on public.weekly_intentions
  for insert with check (user_id = (select auth.uid()));

create policy "weekly_intentions_update" on public.weekly_intentions
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "weekly_intentions_delete" on public.weekly_intentions
  for delete using (user_id = (select auth.uid()));

-- 6.11 TABLE: habit_day_notes (if table exists)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'habit_day_notes') then
    execute 'create policy "habit_day_notes_select" on public.habit_day_notes
      for select using (user_id = (select auth.uid()))';

    execute 'create policy "habit_day_notes_insert" on public.habit_day_notes
      for insert with check (
        user_id = (select auth.uid())
        and exists (
          select 1 from public.habits h
          where h.id = habit_day_notes.habit_id
            and h.user_id = (select auth.uid())
        )
      )';

    execute 'create policy "habit_day_notes_update" on public.habit_day_notes
      for update
      using (
        user_id = (select auth.uid())
        and exists (
          select 1 from public.habits h
          where h.id = habit_day_notes.habit_id
            and h.user_id = (select auth.uid())
        )
      )
      with check (
        user_id = (select auth.uid())
        and exists (
          select 1 from public.habits h
          where h.id = habit_day_notes.habit_id
            and h.user_id = (select auth.uid())
        )
      )';

    execute 'create policy "habit_day_notes_delete" on public.habit_day_notes
      for delete using (user_id = (select auth.uid()))';
  end if;
end;
$$;

-- 6.12 TABLE: focus_sessions (if table exists)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'focus_sessions') then
    execute 'create policy "focus_sessions_select" on public.focus_sessions
      for select using (user_id = (select auth.uid()))';

    execute 'create policy "focus_sessions_insert" on public.focus_sessions
      for insert with check (
        user_id = (select auth.uid())
        and (
          habit_id is null
          or exists (
            select 1 from public.habits h
            where h.id = focus_sessions.habit_id
              and h.user_id = (select auth.uid())
          )
        )
      )';

    execute 'create policy "focus_sessions_update" on public.focus_sessions
      for update
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()))';

    execute 'create policy "focus_sessions_delete" on public.focus_sessions
      for delete using (user_id = (select auth.uid()))';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. RE-ALIGN log_focus_session ON CONFLICT TARGET WITH (user_id, date)
-- -----------------------------------------------------------------------------
create or replace function log_focus_session(
  p_id uuid,
  p_habit_id uuid,
  p_started timestamptz,
  p_ended timestamptz,
  p_planned integer,
  p_mode text,
  p_local_date date
)
returns void
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_duration_seconds integer;
  v_habit record;
  v_amount_to_apply numeric := 0;
  v_day_entry_id uuid;
  v_comp record;
  v_target_snapshot numeric;
  v_new_amount numeric;
  v_is_completed boolean;
  v_inserted_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_duration_seconds := extract(epoch from (p_ended - p_started))::integer;
  if v_duration_seconds < 60 then
    return; -- Ignore sessions under 60 seconds
  end if;
  if v_duration_seconds > 43200 then
    v_duration_seconds := 43200; -- Cap at 12 hours
  end if;

  -- Check if habit exists and is an amount habit with unit min or hours
  if p_habit_id is not null then
    select * into v_habit
    from public.habits
    where id = p_habit_id and user_id = v_user_id;

    if found and v_habit.type = 'amount' and v_habit.unit is not null then
      if lower(v_habit.unit) in ('hours', 'hour', 'hr', 'hrs', 'h') then
        -- Convert minutes to hours (2 decimal places)
        v_amount_to_apply := round((v_duration_seconds / 3600.0)::numeric, 2);
      elsif lower(v_habit.unit) in ('min', 'mins', 'minute', 'minutes', 'm') then
        -- Minutes (1 decimal place)
        v_amount_to_apply := round((v_duration_seconds / 60.0)::numeric, 1);
      end if;
    end if;
  end if;

  -- 1. Insert session (idempotent; on conflict do nothing)
  insert into public.focus_sessions (
    id,
    user_id,
    habit_id,
    started_at,
    ended_at,
    duration_seconds,
    planned_seconds,
    mode,
    local_date,
    habit_minutes_applied,
    created_at
  ) values (
    p_id,
    v_user_id,
    p_habit_id,
    p_started,
    p_ended,
    v_duration_seconds,
    p_planned,
    p_mode,
    p_local_date,
    v_amount_to_apply,
    now()
  )
  on conflict (id) do nothing
  returning id into v_inserted_id;

  -- If nothing was inserted (already logged), return immediately
  if v_inserted_id is null then
    return;
  end if;

  -- 2. If habit amount applied > 0, upsert day_entries and day_habit_completions
  if p_habit_id is not null and v_amount_to_apply > 0 then
    -- Upsert day_entries using canonical (user_id, date) conflict specification
    insert into public.day_entries (user_id, date)
    values (v_user_id, p_local_date)
    on conflict (user_id, date) do update set updated_at = now()
    returning id into v_day_entry_id;

    if v_day_entry_id is null then
      select id into v_day_entry_id from public.day_entries where user_id = v_user_id and date = p_local_date;
    end if;

    -- Look up existing completion row
    select * into v_comp
    from public.day_habit_completions
    where day_entry_id = v_day_entry_id and habit_id = p_habit_id and user_id = v_user_id;

    if found then
      v_target_snapshot := coalesce(v_comp.target_snapshot, v_habit.target_value);
      v_new_amount := coalesce(v_comp.amount, 0) + v_amount_to_apply;
      v_is_completed := case
        when v_target_snapshot is not null and v_target_snapshot > 0 then (v_new_amount >= v_target_snapshot)
        else false
      end;

      update public.day_habit_completions
      set amount = v_new_amount,
          target_snapshot = v_target_snapshot,
          is_completed = v_is_completed
      where id = v_comp.id;
    else
      v_target_snapshot := v_habit.target_value;
      v_new_amount := v_amount_to_apply;
      v_is_completed := case
        when v_target_snapshot is not null and v_target_snapshot > 0 then (v_new_amount >= v_target_snapshot)
        else false
      end;

      insert into public.day_habit_completions (
        day_entry_id,
        habit_id,
        user_id,
        amount,
        target_snapshot,
        is_completed,
        is_skipped
      ) values (
        v_day_entry_id,
        p_habit_id,
        v_user_id,
        v_new_amount,
        v_target_snapshot,
        v_is_completed,
        false
      );
    end if;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. RELOAD POSTGREST SCHEMA CACHE
-- -----------------------------------------------------------------------------
notify pgrst, 'reload schema';
