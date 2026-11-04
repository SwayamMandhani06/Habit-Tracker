-- =============================================================================
-- Migration 999: Ensure All Columns & Tables Exist + Reload PostgREST Cache
-- File: supabase/migrations/999_ensure_all_columns_and_reload_cache.sql
--
-- RUN THIS IN SUPABASE SQL EDITOR TO FIX ANY "column not found in schema cache" ERRORS:
-- https://supabase.com/dashboard/project/_/sql
--
-- This script is completely idempotent:
-- 1. Adds all columns introduced in migrations 002–009 if they are missing
-- 2. Sets DEFAULT auth.uid() on all user_id columns
-- 3. Creates the weekly_intentions table if missing
-- 4. Recreates daily_scores and habit_monthly_stats views with security_invoker = true
-- 5. Hardens composite unique constraints and RLS policies
-- 6. Sends NOTIFY pgrst, 'reload schema' to force PostgREST to reload its schema cache
-- =============================================================================

-- ── 1. Habits table ─────────────────────────────────────────────────────────
alter table if exists habits
  add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  add column if not exists notes text;

alter table if exists habits alter column user_id set default auth.uid();

-- ── 2. Habit Subitems table ───────────────────────────────────────────────────
alter table if exists habit_subitems
  add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

alter table if exists habit_subitems alter column user_id set default auth.uid();

-- ── 3. Day Entries table ─────────────────────────────────────────────────────
alter table if exists day_entries
  add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

alter table if exists day_entries alter column user_id set default auth.uid();

-- Drop old single-user date constraint and ensure composite unique (date, user_id)
alter table if exists day_entries drop constraint if exists day_entries_date_key;
alter table if exists day_entries drop constraint if exists day_entries_user_date_key;
alter table if exists day_entries drop constraint if exists day_entries_date_user_key;
alter table if exists day_entries add constraint day_entries_date_user_key unique (date, user_id);
create index if not exists idx_day_entries_user_date on day_entries (user_id, date);

-- ── 4. Day Habit Completions table ───────────────────────────────────────────
alter table if exists day_habit_completions
  add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  add column if not exists is_skipped boolean not null default false;

alter table if exists day_habit_completions alter column user_id set default auth.uid();
create index if not exists idx_day_habit_completions_user_composite on day_habit_completions (user_id, day_entry_id, habit_id);

-- ── 5. Day Subitem Completions table ─────────────────────────────────────────
alter table if exists day_subitem_completions
  add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

alter table if exists day_subitem_completions alter column user_id set default auth.uid();
create index if not exists idx_day_subitem_completions_user_composite on day_subitem_completions (user_id, day_entry_id, subitem_id);

-- ── 6. Month Reviews table ───────────────────────────────────────────────────
alter table if exists month_reviews
  add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  add column if not exists what_went_well text,
  add column if not exists habit_needs_work text,
  add column if not exists one_thing_to_change text;

alter table if exists month_reviews alter column user_id set default auth.uid();

-- Ensure multi-user composite unique constraint (user_id, year, month)
alter table if exists month_reviews drop constraint if exists month_reviews_year_month_key;
alter table if exists month_reviews drop constraint if exists month_reviews_user_year_month_key;
alter table if exists month_reviews drop constraint if exists month_reviews_user_id_year_month_key;
alter table if exists month_reviews add constraint month_reviews_user_id_year_month_key unique (user_id, year, month);
create index if not exists idx_month_reviews_user_year_month on month_reviews (user_id, year, month);

-- Ensure foreign keys cascade set null on habit deletion
alter table if exists month_reviews drop constraint if exists month_reviews_best_habit_id_fkey;
alter table if exists month_reviews add constraint month_reviews_best_habit_id_fkey foreign key (best_habit_id) references habits(id) on delete set null;

alter table if exists month_reviews drop constraint if exists month_reviews_worst_habit_id_fkey;
alter table if exists month_reviews add constraint month_reviews_worst_habit_id_fkey foreign key (worst_habit_id) references habits(id) on delete set null;

-- ── 7. Quotes table ──────────────────────────────────────────────────────────
alter table if exists quotes
  add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

alter table if exists quotes alter column user_id set default auth.uid();
delete from quotes where user_id is null;

-- ── 8. Weekly Intentions table ───────────────────────────────────────────────
create table if not exists weekly_intentions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  year integer not null,
  week_number integer not null,
  intention text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists weekly_intentions alter column user_id set default auth.uid();
alter table if exists weekly_intentions drop constraint if exists weekly_intentions_user_id_year_week_number_key;
alter table if exists weekly_intentions add constraint weekly_intentions_user_id_year_week_number_key unique (user_id, year, week_number);
create index if not exists idx_weekly_intentions_user_year_week on weekly_intentions (user_id, year, week_number);

-- ── 9. Enable Row Level Security (RLS) on all tables ─────────────────────────
alter table if exists habits                 enable row level security;
alter table if exists habit_subitems         enable row level security;
alter table if exists day_entries            enable row level security;
alter table if exists day_habit_completions   enable row level security;
alter table if exists day_subitem_completions enable row level security;
alter table if exists month_reviews          enable row level security;
alter table if exists quotes                 enable row level security;
alter table if exists weekly_intentions      enable row level security;

-- Policies: habits
drop policy if exists "habits: users can select own" on habits;
drop policy if exists "habits: users can insert own" on habits;
drop policy if exists "habits: users can update own" on habits;
drop policy if exists "habits: users can delete own" on habits;
create policy "habits: users can select own" on habits for select using (auth.uid() = user_id);
create policy "habits: users can insert own" on habits for insert with check (auth.uid() = user_id);
create policy "habits: users can update own" on habits for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habits: users can delete own" on habits for delete using (auth.uid() = user_id);

-- Policies: habit_subitems
drop policy if exists "habit_subitems: users can select own" on habit_subitems;
drop policy if exists "habit_subitems: users can insert own" on habit_subitems;
drop policy if exists "habit_subitems: users can update own" on habit_subitems;
drop policy if exists "habit_subitems: users can delete own" on habit_subitems;
create policy "habit_subitems: users can select own" on habit_subitems for select using (auth.uid() = user_id or exists (select 1 from habits h where h.id = habit_subitems.habit_id and h.user_id = auth.uid()));
create policy "habit_subitems: users can insert own" on habit_subitems for insert with check (auth.uid() = user_id and exists (select 1 from habits h where h.id = habit_subitems.habit_id and h.user_id = auth.uid()));
create policy "habit_subitems: users can update own" on habit_subitems for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habit_subitems: users can delete own" on habit_subitems for delete using (auth.uid() = user_id);

-- Policies: day_entries
drop policy if exists "day_entries: users can select own" on day_entries;
drop policy if exists "day_entries: users can insert own" on day_entries;
drop policy if exists "day_entries: users can update own" on day_entries;
drop policy if exists "day_entries: users can delete own" on day_entries;
create policy "day_entries: users can select own" on day_entries for select using (auth.uid() = user_id);
create policy "day_entries: users can insert own" on day_entries for insert with check (auth.uid() = user_id);
create policy "day_entries: users can update own" on day_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "day_entries: users can delete own" on day_entries for delete using (auth.uid() = user_id);

-- Policies: day_habit_completions
drop policy if exists "day_habit_completions: users can select own" on day_habit_completions;
drop policy if exists "day_habit_completions: users can insert own" on day_habit_completions;
drop policy if exists "day_habit_completions: users can update own" on day_habit_completions;
drop policy if exists "day_habit_completions: users can delete own" on day_habit_completions;
create policy "day_habit_completions: users can select own" on day_habit_completions for select using (auth.uid() = user_id or exists (select 1 from day_entries de where de.id = day_habit_completions.day_entry_id and de.user_id = auth.uid()));
create policy "day_habit_completions: users can insert own" on day_habit_completions for insert with check (auth.uid() = user_id and exists (select 1 from day_entries de where de.id = day_habit_completions.day_entry_id and de.user_id = auth.uid()));
create policy "day_habit_completions: users can update own" on day_habit_completions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "day_habit_completions: users can delete own" on day_habit_completions for delete using (auth.uid() = user_id);

-- Policies: day_subitem_completions
drop policy if exists "day_subitem_completions: users can select own" on day_subitem_completions;
drop policy if exists "day_subitem_completions: users can insert own" on day_subitem_completions;
drop policy if exists "day_subitem_completions: users can update own" on day_subitem_completions;
drop policy if exists "day_subitem_completions: users can delete own" on day_subitem_completions;
create policy "day_subitem_completions: users can select own" on day_subitem_completions for select using (auth.uid() = user_id or exists (select 1 from day_entries de where de.id = day_subitem_completions.day_entry_id and de.user_id = auth.uid()));
create policy "day_subitem_completions: users can insert own" on day_subitem_completions for insert with check (auth.uid() = user_id and exists (select 1 from day_entries de where de.id = day_subitem_completions.day_entry_id and de.user_id = auth.uid()));
create policy "day_subitem_completions: users can update own" on day_subitem_completions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "day_subitem_completions: users can delete own" on day_subitem_completions for delete using (auth.uid() = user_id);

-- Policies: month_reviews
drop policy if exists "month_reviews: users can select own" on month_reviews;
drop policy if exists "month_reviews: users can insert own" on month_reviews;
drop policy if exists "month_reviews: users can update own" on month_reviews;
drop policy if exists "month_reviews: users can delete own" on month_reviews;
create policy "month_reviews: users can select own" on month_reviews for select using (auth.uid() = user_id);
create policy "month_reviews: users can insert own" on month_reviews for insert with check (auth.uid() = user_id);
create policy "month_reviews: users can update own" on month_reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "month_reviews: users can delete own" on month_reviews for delete using (auth.uid() = user_id);

-- Policies: quotes
drop policy if exists "quotes: users can select own" on quotes;
drop policy if exists "quotes: users can insert own" on quotes;
drop policy if exists "quotes: users can update own" on quotes;
drop policy if exists "quotes: users can delete own" on quotes;
create policy "quotes: users can select own" on quotes for select using (auth.uid() = user_id);
create policy "quotes: users can insert own" on quotes for insert with check (auth.uid() = user_id);
create policy "quotes: users can update own" on quotes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "quotes: users can delete own" on quotes for delete using (auth.uid() = user_id);

-- Policies: weekly_intentions
drop policy if exists "weekly_intentions: users can select own" on weekly_intentions;
drop policy if exists "weekly_intentions: users can insert own" on weekly_intentions;
drop policy if exists "weekly_intentions: users can update own" on weekly_intentions;
drop policy if exists "weekly_intentions: users can delete own" on weekly_intentions;
create policy "weekly_intentions: users can select own" on weekly_intentions for select using (auth.uid() = user_id);
create policy "weekly_intentions: users can insert own" on weekly_intentions for insert with check (auth.uid() = user_id);
create policy "weekly_intentions: users can update own" on weekly_intentions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weekly_intentions: users can delete own" on weekly_intentions for delete using (auth.uid() = user_id);

-- ── 10. Recreate Multi-User Views with WITH (security_invoker = true) ────────
drop view if exists habit_monthly_stats cascade;
drop view if exists daily_scores cascade;

-- View 1: daily_scores
create or replace view daily_scores with (security_invoker = true) as
select
  de.id as day_entry_id,
  de.user_id,
  de.date,
  count(distinct case when coalesce(dhc.is_skipped, false) = false then h.id else null end) as total_active_habits,
  count(distinct case when dhc.is_skipped = true then h.id else null end) as skipped_habits,
  count(distinct case
    when coalesce(dhc.is_skipped, false) = false and (
      dhc.is_completed = true
      or (
        h.type = 'checklist'
        and (
          select count(*) from habit_subitems si
          where si.habit_id = h.id
            and si.created_at <= (de.date + interval '1 day')
        ) > 0
        and (
          select count(*) from habit_subitems si
          left join day_subitem_completions dsc
            on dsc.subitem_id = si.id and dsc.day_entry_id = de.id
          where si.habit_id = h.id
            and si.created_at <= (de.date + interval '1 day')
            and (dsc.is_completed is null or dsc.is_completed = false)
        ) = 0
      )
    ) then h.id
    else null
  end) as completed_habits,
  round(
    case
      when count(distinct case when coalesce(dhc.is_skipped, false) = false then h.id else null end) = 0 then 0
      else (
        count(distinct case
          when coalesce(dhc.is_skipped, false) = false and (
            dhc.is_completed = true
            or (
              h.type = 'checklist'
              and (
                select count(*) from habit_subitems si
                where si.habit_id = h.id
                  and si.created_at <= (de.date + interval '1 day')
              ) > 0
              and (
                select count(*) from habit_subitems si
                left join day_subitem_completions dsc
                  on dsc.subitem_id = si.id and dsc.day_entry_id = de.id
                where si.habit_id = h.id
                  and si.created_at <= (de.date + interval '1 day')
                  and (dsc.is_completed is null or dsc.is_completed = false)
              ) = 0
            )
          ) then h.id
          else null
        end)::numeric * 100.0 / count(distinct case when coalesce(dhc.is_skipped, false) = false then h.id else null end)
      )
    end, 2
  ) as completion_pct,
  de.mood,
  de.energy,
  de.sleep_hours
from day_entries de
join habits h
  on h.user_id = de.user_id
left join day_habit_completions dhc
  on dhc.day_entry_id = de.id and dhc.habit_id = h.id
where
  h.created_at::date <= de.date
  and (
    h.is_archived = false
    or (h.is_archived = true and h.archived_at::date > de.date)
  )
group by de.id, de.user_id, de.date, de.mood, de.energy, de.sleep_hours;

-- View 2: habit_monthly_stats
create or replace view habit_monthly_stats with (security_invoker = true) as
select
  h.id as habit_id,
  h.user_id,
  h.name as habit_name,
  extract(year from de.date)::integer as year,
  extract(month from de.date)::integer as month,
  count(distinct case when coalesce(dhc.is_skipped, false) = false then de.id else null end) as days_active,
  count(distinct case
    when coalesce(dhc.is_skipped, false) = false and (
      dhc.is_completed = true
      or (
        h.type = 'checklist'
        and (
          select count(*) from habit_subitems si
          where si.habit_id = h.id
            and si.created_at <= (de.date + interval '1 day')
        ) > 0
        and (
          select count(*) from habit_subitems si
          left join day_subitem_completions dsc
            on dsc.subitem_id = si.id and dsc.day_entry_id = de.id
          where si.habit_id = h.id
            and si.created_at <= (de.date + interval '1 day')
            and (dsc.is_completed is null or dsc.is_completed = false)
        ) = 0
      )
    ) then de.id
    else null
  end) as days_completed,
  round(
    case
      when count(distinct case when coalesce(dhc.is_skipped, false) = false then de.id else null end) = 0 then 0
      else (
        count(distinct case
          when coalesce(dhc.is_skipped, false) = false and (
            dhc.is_completed = true
            or (
              h.type = 'checklist'
              and (
                select count(*) from habit_subitems si
                where si.habit_id = h.id
                  and si.created_at <= (de.date + interval '1 day')
              ) > 0
              and (
                select count(*) from habit_subitems si
                left join day_subitem_completions dsc
                  on dsc.subitem_id = si.id and dsc.day_entry_id = de.id
                where si.habit_id = h.id
                  and si.created_at <= (de.date + interval '1 day')
                  and (dsc.is_completed is null or dsc.is_completed = false)
              ) = 0
            )
          ) then de.id
          else null
        end)::numeric * 100.0 / count(distinct case when coalesce(dhc.is_skipped, false) = false then de.id else null end)
      )
    end, 2
  ) as consistency_pct
from habits h
join day_entries de
  on de.user_id = h.user_id
left join day_habit_completions dhc
  on dhc.day_entry_id = de.id and dhc.habit_id = h.id
where
  h.created_at::date <= de.date
  and (
    h.is_archived = false
    or (h.is_archived = true and h.archived_at::date > de.date)
  )
group by h.id, h.user_id, h.name, extract(year from de.date), extract(month from de.date);

-- ── 11. RELOAD SCHEMA CACHE IN POSTGREST ─────────────────────────────────────
NOTIFY pgrst, 'reload schema';

