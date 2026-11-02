-- =============================================================================
-- Migration 011: Habit Day Notes with Strict Row Level Security
-- File: supabase/migrations/011_habit_day_notes.sql
--
-- Instructions:
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- =============================================================================

create table if not exists habit_day_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  date date not null,
  note text not null check (char_length(note) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, date)
);

-- Enable Row Level Security
alter table habit_day_notes enable row level security;

-- 1. Select policy: Users can only view their own notes
drop policy if exists "Users can view own habit day notes" on habit_day_notes;
create policy "Users can view own habit day notes" on habit_day_notes
  for select
  using (auth.uid() = user_id);

-- 2. Delete policy: Users can only delete their own notes
drop policy if exists "Users can delete own habit day notes" on habit_day_notes;
create policy "Users can delete own habit day notes" on habit_day_notes
  for delete
  using (auth.uid() = user_id);

-- 3. Update policy: Users can update their own notes
drop policy if exists "Users can update own habit day notes" on habit_day_notes;
create policy "Users can update own habit day notes" on habit_day_notes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Insert policy: Users can only insert notes for their own habits
drop policy if exists "Users can insert own habit day notes" on habit_day_notes;
create policy "Users can insert own habit day notes" on habit_day_notes
  for insert
  with check (
    auth.uid() = user_id and exists (
      select 1 from habits h where h.id = habit_id and h.user_id = auth.uid()
    )
  );

-- 5. Force PostgREST schema cache reload
notify pgrst, 'reload schema';

