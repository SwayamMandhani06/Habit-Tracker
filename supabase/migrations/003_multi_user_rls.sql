-- =============================================================================
-- Migration 003: Multi-User Auth + Row Level Security
-- Run this AFTER migration 002 in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
--
-- IMPORTANT: Run this BEFORE creating your new auth account.
-- The DEFAULT auth.uid() will auto-populate user_id on new inserts.
-- Existing rows will have user_id = NULL until you run migration 004.
-- =============================================================================

-- =============================================================================
-- STEP 1: Add user_id column to all user-owned tables
-- Using SET DEFAULT auth.uid() so all new inserts auto-assign user
-- =============================================================================

alter table habits
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table habit_subitems
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table day_entries
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table day_habit_completions
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table day_subitem_completions
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table month_reviews
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table quotes
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- =============================================================================
-- STEP 2: Enable Row Level Security on all tables
-- =============================================================================

alter table habits               enable row level security;
alter table habit_subitems       enable row level security;
alter table day_entries          enable row level security;
alter table day_habit_completions enable row level security;
alter table day_subitem_completions enable row level security;
alter table month_reviews        enable row level security;
alter table quotes               enable row level security;

-- =============================================================================
-- STEP 3: RLS Policies — habits
-- =============================================================================

create policy "habits: users can select own"   on habits for select using (auth.uid() = user_id);
create policy "habits: users can insert own"   on habits for insert with check (auth.uid() = user_id);
create policy "habits: users can update own"   on habits for update using (auth.uid() = user_id);
create policy "habits: users can delete own"   on habits for delete using (auth.uid() = user_id);

-- =============================================================================
-- STEP 4: RLS Policies — habit_subitems
-- Enforce via own user_id AND via parent habit's user_id
-- =============================================================================

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
  for update using (auth.uid() = user_id);

create policy "habit_subitems: users can delete own" on habit_subitems
  for delete using (auth.uid() = user_id);

-- =============================================================================
-- STEP 5: RLS Policies — day_entries
-- =============================================================================

create policy "day_entries: users can select own"   on day_entries for select using (auth.uid() = user_id);
create policy "day_entries: users can insert own"   on day_entries for insert with check (auth.uid() = user_id);
create policy "day_entries: users can update own"   on day_entries for update using (auth.uid() = user_id);
create policy "day_entries: users can delete own"   on day_entries for delete using (auth.uid() = user_id);

-- =============================================================================
-- STEP 6: RLS Policies — day_habit_completions
-- Enforce via own user_id AND via parent day_entry's user_id
-- =============================================================================

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
  for update using (auth.uid() = user_id);

create policy "day_habit_completions: users can delete own" on day_habit_completions
  for delete using (auth.uid() = user_id);

-- =============================================================================
-- STEP 7: RLS Policies — day_subitem_completions
-- =============================================================================

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
  for update using (auth.uid() = user_id);

create policy "day_subitem_completions: users can delete own" on day_subitem_completions
  for delete using (auth.uid() = user_id);

-- =============================================================================
-- STEP 8: RLS Policies — month_reviews
-- =============================================================================

create policy "month_reviews: users can select own"   on month_reviews for select using (auth.uid() = user_id);
create policy "month_reviews: users can insert own"   on month_reviews for insert with check (auth.uid() = user_id);
create policy "month_reviews: users can update own"   on month_reviews for update using (auth.uid() = user_id);
create policy "month_reviews: users can delete own"   on month_reviews for delete using (auth.uid() = user_id);

-- =============================================================================
-- STEP 9: RLS Policies — quotes
-- =============================================================================

create policy "quotes: users can select own"   on quotes for select using (auth.uid() = user_id);
create policy "quotes: users can insert own"   on quotes for insert with check (auth.uid() = user_id);
create policy "quotes: users can update own"   on quotes for update using (auth.uid() = user_id);
create policy "quotes: users can delete own"   on quotes for delete using (auth.uid() = user_id);

-- =============================================================================
-- STEP 10: Update UNIQUE constraints that assumed single-user
-- day_entries had: unique(date) — now must be unique per user
-- month_reviews had: unique(year, month) — now must be unique per user
-- =============================================================================

-- Drop old single-user unique constraints
alter table day_entries   drop constraint if exists day_entries_date_key;
alter table month_reviews drop constraint if exists month_reviews_year_month_key;

-- Re-add as per-user unique constraints
alter table day_entries   add constraint day_entries_user_date_key unique (user_id, date);
alter table month_reviews add constraint month_reviews_user_year_month_key unique (user_id, year, month);

-- =============================================================================
-- STEP 11: Add indexes on user_id for query performance
-- =============================================================================

create index if not exists idx_habits_user_id               on habits(user_id);
create index if not exists idx_habit_subitems_user_id        on habit_subitems(user_id);
create index if not exists idx_day_entries_user_id           on day_entries(user_id);
create index if not exists idx_day_habit_completions_user_id on day_habit_completions(user_id);
create index if not exists idx_day_subitem_completions_user_id on day_subitem_completions(user_id);
create index if not exists idx_month_reviews_user_id         on month_reviews(user_id);
create index if not exists idx_quotes_user_id                on quotes(user_id);
