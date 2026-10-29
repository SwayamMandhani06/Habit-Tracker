-- =============================================================================
-- Migration 008: Weekly intentions and Habit Skip / Rest Day
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- =============================================================================

-- Weekly intentions table
create table if not exists weekly_intentions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  year integer not null,
  week_number integer not null,
  intention text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, year, week_number)
);

alter table weekly_intentions enable row level security;

create policy "weekly_intentions: users can select own"
  on weekly_intentions for select using (auth.uid() = user_id);

create policy "weekly_intentions: users can insert own"
  on weekly_intentions for insert with check (auth.uid() = user_id);

create policy "weekly_intentions: users can update own"
  on weekly_intentions for update using (auth.uid() = user_id);

create policy "weekly_intentions: users can delete own"
  on weekly_intentions for delete using (auth.uid() = user_id);

-- Support skip / rest day on day_habit_completions
alter table day_habit_completions
  add column if not exists is_skipped boolean not null default false;

