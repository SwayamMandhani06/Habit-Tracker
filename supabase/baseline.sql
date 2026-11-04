-- =============================================================================
-- Baseline Database Schema for 1% Better Habit Tracker
-- File: supabase/baseline.sql
--
-- TARGET: Empty Supabase / PostgreSQL database with supabase auth schema.
-- Includes:
-- - 10 application tables with all columns, defaults, foreign keys & CHECK constraints.
-- - Redundant indexes removed; canonical (user_id, date) constraints enforced.
-- - Clean RLS policies using (select auth.uid()) with parent-ownership enforcement.
-- - RPC functions: log_focus_session, delete_focus_session, seed_default_data.
-- - No legacy views (daily_scores, habit_monthly_stats omitted).
-- - Anonymous access revoked; authenticated access granted.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EXTENSIONS & PREREQUISITES
-- -----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 2. TRIGGER HELPER FUNCTIONS
-- -----------------------------------------------------------------------------
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- -----------------------------------------------------------------------------
-- 3. TABLES DEFINITIONS
-- -----------------------------------------------------------------------------

-- 3.1 TABLE: habits
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'checkbox' check (type in ('checkbox', 'checklist', 'amount')),
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  color text not null default 'sage' check (color in ('sage','clay','sky','amber','plum','rose','slate','teal')),
  icon text not null default 'check',
  notes text,
  target_value numeric check (target_value is null or target_value > 0),
  unit text check (unit is null or char_length(unit) <= 16),
  step_value numeric not null default 1 check (step_value > 0),
  created_at timestamptz not null default now(),
  constraint habits_amount_needs_target check (type <> 'amount' or (target_value is not null and unit is not null))
);

create index idx_habits_user_sort on public.habits (user_id, sort_order);

-- 3.2 TABLE: habit_subitems
create table public.habit_subitems (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_habit_subitems_habit_id on public.habit_subitems (habit_id);
create index idx_habit_subitems_user_id on public.habit_subitems (user_id);

-- 3.3 TABLE: day_entries
create table public.day_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  notes text,
  mood text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint day_entries_user_date_key unique (user_id, date)
);

create index idx_day_entries_user_date on public.day_entries (user_id, date);

create trigger day_entries_updated_at
  before update on public.day_entries
  for each row execute function public.update_updated_at();

-- 3.4 TABLE: day_habit_completions
create table public.day_habit_completions (
  id uuid primary key default gen_random_uuid(),
  day_entry_id uuid not null references public.day_entries(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  is_completed boolean not null default false,
  is_skipped boolean not null default false,
  amount numeric not null default 0 check (amount >= 0),
  target_snapshot numeric,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint day_habit_completions_entry_habit_key unique (day_entry_id, habit_id)
);

create index idx_day_habit_completions_day_entry on public.day_habit_completions (day_entry_id);
create index idx_day_habit_completions_habit on public.day_habit_completions (habit_id);
create index idx_day_habit_completions_user on public.day_habit_completions (user_id);

-- 3.5 TABLE: day_subitem_completions
create table public.day_subitem_completions (
  id uuid primary key default gen_random_uuid(),
  day_entry_id uuid not null references public.day_entries(id) on delete cascade,
  subitem_id uuid not null references public.habit_subitems(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint day_subitem_completions_entry_subitem_key unique (day_entry_id, subitem_id)
);

create index idx_day_subitem_completions_day_entry on public.day_subitem_completions (day_entry_id);
create index idx_day_subitem_completions_subitem on public.day_subitem_completions (subitem_id);
create index idx_day_subitem_completions_user on public.day_subitem_completions (user_id);

-- 3.6 TABLE: month_reviews
create table public.month_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  year integer not null,
  month integer not null check (month between 1 and 12),
  score_pct numeric,
  total_days integer,
  perfect_days integer,
  best_streak integer,
  best_habit_id uuid references public.habits(id) on delete set null,
  worst_habit_id uuid references public.habits(id) on delete set null,
  notes text,
  what_went_well text,
  habit_needs_work text,
  one_thing_to_change text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint month_reviews_user_year_month_key unique (user_id, year, month)
);

create index idx_month_reviews_user_year_month on public.month_reviews (user_id, year, month);

create trigger month_reviews_updated_at
  before update on public.month_reviews
  for each row execute function public.update_updated_at();

-- 3.7 TABLE: quotes
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null,
  author text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_quotes_user_active on public.quotes (user_id, is_active);

-- 3.8 TABLE: weekly_intentions
create table public.weekly_intentions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  year integer not null,
  week_number integer not null,
  intention text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_intentions_user_year_week_key unique (user_id, year, week_number)
);

create index idx_weekly_intentions_user_year_week on public.weekly_intentions (user_id, year, week_number);

create trigger weekly_intentions_updated_at
  before update on public.weekly_intentions
  for each row execute function public.update_updated_at();

-- 3.9 TABLE: habit_day_notes
create table public.habit_day_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  date date not null,
  note text not null check (char_length(note) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habit_day_notes_habit_date_key unique (habit_id, date)
);

create index idx_habit_day_notes_user_date on public.habit_day_notes (user_id, date);

create trigger habit_day_notes_updated_at
  before update on public.habit_day_notes
  for each row execute function public.update_updated_at();

-- 3.10 TABLE: focus_sessions
create table public.focus_sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  habit_id uuid references public.habits(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds between 60 and 43200),
  planned_seconds integer check (planned_seconds is null or planned_seconds > 0),
  mode text not null check (mode in ('countdown', 'pomodoro')),
  local_date date not null,
  habit_minutes_applied numeric not null default 0,
  created_at timestamptz not null default now(),
  constraint focus_sessions_ended_after_started check (ended_at > started_at)
);

create index idx_focus_sessions_user_date on public.focus_sessions (user_id, local_date);

-- -----------------------------------------------------------------------------
-- 4. RPC FUNCTIONS
-- -----------------------------------------------------------------------------

-- 4.1 FUNCTION: log_focus_session
create or replace function public.log_focus_session(
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
    raise exception 'log_focus_session: Not authenticated';
  end if;

  v_duration_seconds := extract(epoch from (p_ended - p_started))::integer;
  if v_duration_seconds < 60 then
    return; -- Ignore sessions under 60 seconds
  end if;
  if v_duration_seconds > 43200 then
    v_duration_seconds := 43200; -- Cap at 12 hours
  end if;

  if p_habit_id is not null then
    select * into v_habit
    from public.habits
    where id = p_habit_id and user_id = v_user_id;

    if found and v_habit.type = 'amount' and v_habit.unit is not null then
      if lower(v_habit.unit) in ('hours', 'hour', 'hr', 'hrs', 'h') then
        v_amount_to_apply := round((v_duration_seconds / 3600.0)::numeric, 2);
      elsif lower(v_habit.unit) in ('min', 'mins', 'minute', 'minutes', 'm') then
        v_amount_to_apply := round((v_duration_seconds / 60.0)::numeric, 1);
      end if;
    end if;
  end if;

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

  if v_inserted_id is null then
    return;
  end if;

  if p_habit_id is not null and v_amount_to_apply > 0 then
    insert into public.day_entries (user_id, date)
    values (v_user_id, p_local_date)
    on conflict (user_id, date) do update set updated_at = now()
    returning id into v_day_entry_id;

    if v_day_entry_id is null then
      select id into v_day_entry_id from public.day_entries where user_id = v_user_id and date = p_local_date;
    end if;

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

-- 4.2 FUNCTION: delete_focus_session
create or replace function public.delete_focus_session(p_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_session record;
  v_day_entry_id uuid;
  v_comp record;
  v_new_amount numeric;
  v_new_completed boolean;
begin
  select * into v_session
  from public.focus_sessions
  where id = p_id and user_id = auth.uid();

  if not found then
    return;
  end if;

  delete from public.focus_sessions where id = p_id and user_id = auth.uid();

  if v_session.habit_id is not null and v_session.habit_minutes_applied > 0 then
    select id into v_day_entry_id
    from public.day_entries
    where user_id = auth.uid() and date = v_session.local_date;

    if v_day_entry_id is not null then
      select * into v_comp
      from public.day_habit_completions
      where day_entry_id = v_day_entry_id and habit_id = v_session.habit_id and user_id = auth.uid();

      if found then
        v_new_amount := greatest(0, coalesce(v_comp.amount, 0) - v_session.habit_minutes_applied);
        v_new_completed := case
          when v_comp.target_snapshot is not null and v_comp.target_snapshot > 0 then (v_new_amount >= v_comp.target_snapshot)
          else false
        end;

        update public.day_habit_completions
        set amount = v_new_amount,
            is_completed = v_new_completed
        where id = v_comp.id;
      end if;
    end if;
  end if;
end;
$$;

-- 4.3 FUNCTION: seed_default_data
create or replace function public.seed_default_data()
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_morning_id uuid;
  v_night_id uuid;
  v_habits_count integer := 0;
  v_subitems_count integer := 0;
  v_quotes_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'seed_default_data: Not authenticated';
  end if;

  if exists (select 1 from public.habits where user_id = v_user_id)
     or exists (select 1 from public.day_entries where user_id = v_user_id) then
    return jsonb_build_object(
      'seeded', false,
      'reason', 'already_has_data',
      'user_id', v_user_id
    );
  end if;

  -- 13 curated habits
  insert into public.habits (user_id, name, type, sort_order, color, icon, is_archived)
  values (v_user_id, 'Morning Routine', 'checklist', 1, 'amber', 'sunrise', false)
  returning id into v_morning_id;

  insert into public.habits (user_id, name, type, sort_order, color, icon, is_archived)
  values (v_user_id, 'Gym / Workout', 'checkbox', 2, 'rose', 'dumbbell', false);

  insert into public.habits (user_id, name, type, sort_order, color, icon, target_value, unit, step_value, is_archived)
  values (v_user_id, '10k Steps', 'amount', 3, 'teal', 'footprints', 10000, 'steps', 1000, false);

  insert into public.habits (user_id, name, type, sort_order, color, icon, target_value, unit, step_value, is_archived)
  values (v_user_id, 'Drink 4L Water', 'amount', 4, 'sky', 'droplet', 4, 'L', 0.5, false);

  insert into public.habits (user_id, name, type, sort_order, color, icon, is_archived)
  values (v_user_id, 'Healthy Diet & Creatine', 'checkbox', 5, 'sage', 'sparkles', false);

  insert into public.habits (user_id, name, type, sort_order, color, icon, target_value, unit, step_value, is_archived)
  values (v_user_id, 'Deep Work (2-3 Hours)', 'amount', 6, 'slate', 'zap', 150, 'min', 15, false);

  insert into public.habits (user_id, name, type, sort_order, color, icon, is_archived)
  values (v_user_id, 'Skill Building (Coding / DSA / Projects)', 'checkbox', 7, 'clay', 'crosshair', false);

  insert into public.habits (user_id, name, type, sort_order, color, icon, is_archived)
  values (v_user_id, 'Book Reading', 'checkbox', 8, 'amber', 'book', false);

  insert into public.habits (user_id, name, type, sort_order, color, icon, is_archived)
  values (v_user_id, 'Journaling', 'checkbox', 9, 'plum', 'pen-tool', false);

  insert into public.habits (user_id, name, type, sort_order, color, icon, is_archived)
  values (v_user_id, 'Mandir / Prayer', 'checkbox', 10, 'sage', 'heart', false);

  insert into public.habits (user_id, name, type, sort_order, color, icon, is_archived)
  values (v_user_id, 'No Social Media / Reels', 'checkbox', 11, 'rose', 'shield', false);

  insert into public.habits (user_id, name, type, sort_order, color, icon, is_archived)
  values (v_user_id, 'No Fap', 'checkbox', 12, 'slate', 'target', false);

  insert into public.habits (user_id, name, type, sort_order, color, icon, is_archived)
  values (v_user_id, 'Night Routine', 'checklist', 13, 'plum', 'moon', false)
  returning id into v_night_id;

  v_habits_count := 13;

  -- Morning Routine Subitems (9 subitems)
  insert into public.habit_subitems (user_id, habit_id, name, sort_order)
  values
    (v_user_id, v_morning_id, 'No phone after waking up', 1),
    (v_user_id, v_morning_id, 'Make bed', 2),
    (v_user_id, v_morning_id, 'Brush teeth', 3),
    (v_user_id, v_morning_id, 'Wash face', 4),
    (v_user_id, v_morning_id, 'Drink water', 5),
    (v_user_id, v_morning_id, 'Morning sunlight', 6),
    (v_user_id, v_morning_id, 'Stretch', 7),
    (v_user_id, v_morning_id, 'Pray', 8),
    (v_user_id, v_morning_id, 'Plan Top 3 Tasks', 9);

  -- Night Routine Subitems (11 subitems)
  insert into public.habit_subitems (user_id, habit_id, name, sort_order)
  values
    (v_user_id, v_night_id, 'No phone before sleeping', 1),
    (v_user_id, v_night_id, 'Brush teeth', 2),
    (v_user_id, v_night_id, 'Skincare', 3),
    (v_user_id, v_night_id, 'Prepare clothes', 4),
    (v_user_id, v_night_id, 'Pack bag', 5),
    (v_user_id, v_night_id, 'Fill water bottle', 6),
    (v_user_id, v_night_id, 'Journal', 7),
    (v_user_id, v_night_id, 'Read', 8),
    (v_user_id, v_night_id, 'Pray', 9),
    (v_user_id, v_night_id, 'Set alarm', 10),
    (v_user_id, v_night_id, 'Sleep on time', 11);

  v_subitems_count := 20;

  -- Curated Quotes (15 quotes)
  insert into public.quotes (user_id, text, is_active)
  values
    (v_user_id, 'Motivation is what gets you started. Discipline is what keeps you going.', true),
    (v_user_id, 'The cost of discipline is always less than the cost of regret.', true),
    (v_user_id, 'You don''t rise to the level of your goals. You fall to the level of your systems.', true),
    (v_user_id, 'Stop waiting to feel like it.', true),
    (v_user_id, 'One day or day one. You decide.', true),
    (v_user_id, 'We are what we repeatedly do. Excellence is not an act but a habit.', true),
    (v_user_id, 'Your future self is watching you right now through your memories.', true),
    (v_user_id, 'Hard choices, easy life. Easy choices, hard life.', true),
    (v_user_id, 'The man who moves a mountain begins by carrying away small stones.', true),
    (v_user_id, 'Discipline is choosing between what you want now and what you want most.', true),
    (v_user_id, 'You will never always be motivated. You have to learn to be disciplined.', true),
    (v_user_id, 'Don''t wish it were easier. Wish you were better.', true),
    (v_user_id, 'Small disciplines repeated with consistency lead to great achievements gained slowly over time.', true),
    (v_user_id, 'The only way out is through.', true),
    (v_user_id, 'Do it even when you don''t want to. Especially when you don''t want to.', true);

  v_quotes_count := 15;

  return jsonb_build_object(
    'seeded', true,
    'habits_count', v_habits_count,
    'subitems_count', v_subitems_count,
    'quotes_count', v_quotes_count,
    'user_id', v_user_id
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
alter table public.habits enable row level security;
alter table public.habit_subitems enable row level security;
alter table public.day_entries enable row level security;
alter table public.day_habit_completions enable row level security;
alter table public.day_subitem_completions enable row level security;
alter table public.month_reviews enable row level security;
alter table public.quotes enable row level security;
alter table public.weekly_intentions enable row level security;
alter table public.habit_day_notes enable row level security;
alter table public.focus_sessions enable row level security;

-- 5.1 TABLE: habits
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

-- 5.2 TABLE: habit_subitems
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

-- 5.3 TABLE: day_entries
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

-- 5.4 TABLE: day_habit_completions
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

-- 5.5 TABLE: day_subitem_completions
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

-- 5.6 TABLE: month_reviews
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

-- 5.7 TABLE: quotes
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

-- 5.8 TABLE: weekly_intentions
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

-- 5.9 TABLE: habit_day_notes
create policy "habit_day_notes_select" on public.habit_day_notes
  for select using (user_id = (select auth.uid()));

create policy "habit_day_notes_insert" on public.habit_day_notes
  for insert with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.habits h
      where h.id = habit_day_notes.habit_id
        and h.user_id = (select auth.uid())
    )
  );

create policy "habit_day_notes_update" on public.habit_day_notes
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
  );

create policy "habit_day_notes_delete" on public.habit_day_notes
  for delete using (user_id = (select auth.uid()));

-- 5.10 TABLE: focus_sessions
create policy "focus_sessions_select" on public.focus_sessions
  for select using (user_id = (select auth.uid()));

create policy "focus_sessions_insert" on public.focus_sessions
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
  );

create policy "focus_sessions_update" on public.focus_sessions
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "focus_sessions_delete" on public.focus_sessions
  for delete using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 6. PERMISSIONS & PRIVILEGES
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all routines in schema public from anon;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on routines from anon;

grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant all on all routines in schema public to authenticated;

alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant all on sequences to authenticated;
alter default privileges in schema public grant all on routines to authenticated;

notify pgrst, 'reload schema';

