-- =============================================================================
-- Migration 009: Fix Views, RLS, Default auth.uid(), and Habit Skip Logic
-- File: supabase/migrations/009_fix_views_rls_and_skips.sql
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
--
-- This migration guarantees:
-- 1. Sets DEFAULT auth.uid() on user_id across all tables so user-scoped inserts
--    automatically receive the authenticated user's ID.
-- 2. Cleans up any orphaned rows in `quotes` where user_id IS NULL.
-- 3. Composite unique constraints for multi-user data isolation:
--    - month_reviews: (user_id, year, month)
--    - weekly_intentions: (user_id, year, week_number)
--    - day_entries: (date, user_id)
--    - day_habit_completions: (day_entry_id, habit_id)
--    - day_subitem_completions: (day_entry_id, subitem_id)
-- 4. Complete Row Level Security (RLS) policies for SELECT, INSERT, UPDATE, DELETE
--    using auth.uid() = user_id (both USING and WITH CHECK clauses).
-- 5. Hardened Analytics Views with (security_invoker = true):
--    - daily_scores: Strictly user-joined (h.user_id = de.user_id), projects de.user_id,
--      excludes skipped habits (dhc.is_skipped = true) from total_active_habits so rest
--      days do not penalize completion percentage or streaks, counts completions when
--      dhc.is_completed = true OR all checklist subitems completed, and safely handles
--      days where all active habits are skipped (total_active_habits = 0 -> completion_pct = 0).
--    - habit_monthly_stats: Strictly user-joined (de.user_id = h.user_id), projects h.user_id,
--      excludes skipped days from days_active, and counts completions when dhc.is_completed = true
--      OR all checklist subitems completed.
-- =============================================================================

-- =============================================================================
-- STEP 1: Set DEFAULT auth.uid() on user_id Columns
-- =============================================================================

alter table if exists habits                 alter column user_id set default auth.uid();
alter table if exists habit_subitems         alter column user_id set default auth.uid();
alter table if exists day_entries            alter column user_id set default auth.uid();
alter table if exists day_habit_completions   alter column user_id set default auth.uid();
alter table if exists day_subitem_completions alter column user_id set default auth.uid();
alter table if exists month_reviews          alter column user_id set default auth.uid();
alter table if exists quotes                 alter column user_id set default auth.uid();
alter table if exists weekly_intentions      alter column user_id set default auth.uid();

-- Clean up any orphaned rows in quotes where user_id IS NULL (e.g. from migration 007)
delete from quotes where user_id is null;


-- =============================================================================
-- STEP 2: Composite Unique Constraints for Multi-User Isolation
-- =============================================================================

-- 2.1 month_reviews: Drop single-user (year, month) and enforce (user_id, year, month)
alter table if exists month_reviews 
  drop constraint if exists month_reviews_year_month_key;

alter table if exists month_reviews 
  drop constraint if exists month_reviews_user_year_month_key;

alter table if exists month_reviews 
  drop constraint if exists month_reviews_user_id_year_month_key;

alter table if exists month_reviews 
  add constraint month_reviews_user_id_year_month_key 
  unique (user_id, year, month);

create index if not exists idx_month_reviews_user_year_month 
  on month_reviews (user_id, year, month);

-- Ensure habit foreign keys cascade set null on habit deletion
alter table if exists month_reviews
  drop constraint if exists month_reviews_best_habit_id_fkey,
  add constraint month_reviews_best_habit_id_fkey
    foreign key (best_habit_id) references habits(id) on delete set null;

alter table if exists month_reviews
  drop constraint if exists month_reviews_worst_habit_id_fkey,
  add constraint month_reviews_worst_habit_id_fkey
    foreign key (worst_habit_id) references habits(id) on delete set null;

-- 2.2 day_entries: Drop single-user date constraint and enforce (date, user_id)
alter table if exists day_entries 
  drop constraint if exists day_entries_date_key;

alter table if exists day_entries 
  drop constraint if exists day_entries_user_date_key;

alter table if exists day_entries 
  drop constraint if exists day_entries_date_user_key;

alter table if exists day_entries 
  add constraint day_entries_date_user_key 
  unique (date, user_id);

create index if not exists idx_day_entries_user_date 
  on day_entries (user_id, date);

-- 2.3 weekly_intentions: Ensure table exists and has composite constraint (user_id, year, week_number)
create table if not exists weekly_intentions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  year integer not null,
  week_number integer not null,
  intention text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists weekly_intentions 
  drop constraint if exists weekly_intentions_user_id_year_week_number_key;

alter table if exists weekly_intentions 
  add constraint weekly_intentions_user_id_year_week_number_key 
  unique (user_id, year, week_number);

create index if not exists idx_weekly_intentions_user_year_week 
  on weekly_intentions (user_id, year, week_number);

-- 2.4 day_habit_completions: Ensure is_skipped column and explicit unique constraint
alter table if exists day_habit_completions
  add column if not exists is_skipped boolean not null default false;

alter table if exists day_habit_completions 
  drop constraint if exists day_habit_completions_day_entry_id_habit_id_key;

alter table if exists day_habit_completions 
  add constraint day_habit_completions_day_entry_id_habit_id_key 
  unique (day_entry_id, habit_id);

create index if not exists idx_day_habit_completions_user_composite 
  on day_habit_completions (user_id, day_entry_id, habit_id);

-- 2.5 day_subitem_completions: Explicit unique constraint
alter table if exists day_subitem_completions 
  drop constraint if exists day_subitem_completions_day_entry_id_subitem_id_key;

alter table if exists day_subitem_completions 
  add constraint day_subitem_completions_day_entry_id_subitem_id_key 
  unique (day_entry_id, subitem_id);

create index if not exists idx_day_subitem_completions_user_composite 
  on day_subitem_completions (user_id, day_entry_id, subitem_id);


-- =============================================================================
-- STEP 3: Row Level Security Hardening (USING + WITH CHECK)
-- =============================================================================

-- Enable RLS on all tables
alter table if exists habits                 enable row level security;
alter table if exists habit_subitems         enable row level security;
alter table if exists day_entries            enable row level security;
alter table if exists day_habit_completions   enable row level security;
alter table if exists day_subitem_completions enable row level security;
alter table if exists month_reviews          enable row level security;
alter table if exists quotes                 enable row level security;
alter table if exists weekly_intentions      enable row level security;

-- 3.1 habits
drop policy if exists "habits: users can select own" on habits;
drop policy if exists "habits: users can insert own" on habits;
drop policy if exists "habits: users can update own" on habits;
drop policy if exists "habits: users can delete own" on habits;

create policy "habits: users can select own" on habits
  for select using (auth.uid() = user_id);

create policy "habits: users can insert own" on habits
  for insert with check (auth.uid() = user_id);

create policy "habits: users can update own" on habits
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "habits: users can delete own" on habits
  for delete using (auth.uid() = user_id);

-- 3.2 habit_subitems
drop policy if exists "habit_subitems: users can select own" on habit_subitems;
drop policy if exists "habit_subitems: users can insert own" on habit_subitems;
drop policy if exists "habit_subitems: users can update own" on habit_subitems;
drop policy if exists "habit_subitems: users can delete own" on habit_subitems;

create policy "habit_subitems: users can select own" on habit_subitems
  for select using (
    auth.uid() = user_id
    or exists (select 1 from habits h where h.id = habit_subitems.habit_id and h.user_id = auth.uid())
  );

create policy "habit_subitems: users can insert own" on habit_subitems
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from habits h where h.id = habit_subitems.habit_id and h.user_id = auth.uid())
  );

create policy "habit_subitems: users can update own" on habit_subitems
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "habit_subitems: users can delete own" on habit_subitems
  for delete using (auth.uid() = user_id);

-- 3.3 day_entries
drop policy if exists "day_entries: users can select own" on day_entries;
drop policy if exists "day_entries: users can insert own" on day_entries;
drop policy if exists "day_entries: users can update own" on day_entries;
drop policy if exists "day_entries: users can delete own" on day_entries;

create policy "day_entries: users can select own" on day_entries
  for select using (auth.uid() = user_id);

create policy "day_entries: users can insert own" on day_entries
  for insert with check (auth.uid() = user_id);

create policy "day_entries: users can update own" on day_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "day_entries: users can delete own" on day_entries
  for delete using (auth.uid() = user_id);

-- 3.4 day_habit_completions
drop policy if exists "day_habit_completions: users can select own" on day_habit_completions;
drop policy if exists "day_habit_completions: users can insert own" on day_habit_completions;
drop policy if exists "day_habit_completions: users can update own" on day_habit_completions;
drop policy if exists "day_habit_completions: users can delete own" on day_habit_completions;

create policy "day_habit_completions: users can select own" on day_habit_completions
  for select using (
    auth.uid() = user_id
    or exists (select 1 from day_entries de where de.id = day_habit_completions.day_entry_id and de.user_id = auth.uid())
  );

create policy "day_habit_completions: users can insert own" on day_habit_completions
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from day_entries de where de.id = day_habit_completions.day_entry_id and de.user_id = auth.uid())
  );

create policy "day_habit_completions: users can update own" on day_habit_completions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "day_habit_completions: users can delete own" on day_habit_completions
  for delete using (auth.uid() = user_id);

-- 3.5 day_subitem_completions
drop policy if exists "day_subitem_completions: users can select own" on day_subitem_completions;
drop policy if exists "day_subitem_completions: users can insert own" on day_subitem_completions;
drop policy if exists "day_subitem_completions: users can update own" on day_subitem_completions;
drop policy if exists "day_subitem_completions: users can delete own" on day_subitem_completions;

create policy "day_subitem_completions: users can select own" on day_subitem_completions
  for select using (
    auth.uid() = user_id
    or exists (select 1 from day_entries de where de.id = day_subitem_completions.day_entry_id and de.user_id = auth.uid())
  );

create policy "day_subitem_completions: users can insert own" on day_subitem_completions
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from day_entries de where de.id = day_subitem_completions.day_entry_id and de.user_id = auth.uid())
  );

create policy "day_subitem_completions: users can update own" on day_subitem_completions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "day_subitem_completions: users can delete own" on day_subitem_completions
  for delete using (auth.uid() = user_id);

-- 3.6 month_reviews
drop policy if exists "month_reviews: users can select own" on month_reviews;
drop policy if exists "month_reviews: users can insert own" on month_reviews;
drop policy if exists "month_reviews: users can update own" on month_reviews;
drop policy if exists "month_reviews: users can delete own" on month_reviews;

create policy "month_reviews: users can select own" on month_reviews
  for select using (auth.uid() = user_id);

create policy "month_reviews: users can insert own" on month_reviews
  for insert with check (auth.uid() = user_id);

create policy "month_reviews: users can update own" on month_reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "month_reviews: users can delete own" on month_reviews
  for delete using (auth.uid() = user_id);

-- 3.7 quotes
drop policy if exists "quotes: users can select own" on quotes;
drop policy if exists "quotes: users can insert own" on quotes;
drop policy if exists "quotes: users can update own" on quotes;
drop policy if exists "quotes: users can delete own" on quotes;

create policy "quotes: users can select own" on quotes
  for select using (auth.uid() = user_id);

create policy "quotes: users can insert own" on quotes
  for insert with check (auth.uid() = user_id);

create policy "quotes: users can update own" on quotes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "quotes: users can delete own" on quotes
  for delete using (auth.uid() = user_id);

-- 3.8 weekly_intentions
drop policy if exists "weekly_intentions: users can select own" on weekly_intentions;
drop policy if exists "weekly_intentions: users can insert own" on weekly_intentions;
drop policy if exists "weekly_intentions: users can update own" on weekly_intentions;
drop policy if exists "weekly_intentions: users can delete own" on weekly_intentions;

create policy "weekly_intentions: users can select own" on weekly_intentions
  for select using (auth.uid() = user_id);

create policy "weekly_intentions: users can insert own" on weekly_intentions
  for insert with check (auth.uid() = user_id);

create policy "weekly_intentions: users can update own" on weekly_intentions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "weekly_intentions: users can delete own" on weekly_intentions
  for delete using (auth.uid() = user_id);


-- =============================================================================
-- STEP 4: Multi-User Analytics Views with WITH (security_invoker = true)
-- =============================================================================

drop view if exists habit_monthly_stats cascade;
drop view if exists daily_scores cascade;

-- View 1: daily_scores
-- Computes daily completion rate respecting habit creation dates, skips, and checklist subitems
create or replace view daily_scores with (security_invoker = true) as
select
  de.id as day_entry_id,
  de.user_id,
  de.date,
  -- Active habits on this date, excluding any habit marked as skipped today
  count(distinct case when coalesce(dhc.is_skipped, false) = false then h.id else null end) as total_active_habits,
  -- Total habits skipped on this date
  count(distinct case when dhc.is_skipped = true then h.id else null end) as skipped_habits,
  -- Count completed habits: either dhc.is_completed = true OR all subitems completed for checklist habits
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
      -- Edge case: when all active habits on a day are skipped (or no habits exist), completion_pct is 0
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
-- Computes per-habit consistency percentage for a given month, excluding skipped days from days_active
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

