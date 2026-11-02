-- =============================================================================
-- Migration 010: Amount Habits + Habit Color and Icon Styling
-- File: supabase/migrations/010_amount_habits_and_styling.sql
--
-- Instructions:
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- =============================================================================

-- 1. Extend habits table with amount configuration and visual styling
alter table if exists habits
  add column if not exists target_value numeric check (target_value is null or target_value > 0),
  add column if not exists unit text check (unit is null or char_length(unit) <= 16),
  add column if not exists step_value numeric not null default 1 check (step_value > 0),
  add column if not exists color text not null default 'sage'
    check (color in ('sage','clay','sky','amber','plum','rose','slate','teal')),
  add column if not exists icon text not null default 'check';

-- 2. Update habits.type check constraint to permit 'amount'
alter table if exists habits drop constraint if exists habits_type_check;
alter table if exists habits add constraint habits_type_check
  check (type in ('checkbox', 'checklist', 'amount'));

-- 3. Ensure amount habits require both target_value and unit
alter table if exists habits drop constraint if exists habits_amount_needs_target;
alter table if exists habits add constraint habits_amount_needs_target
  check (type <> 'amount' or (target_value is not null and unit is not null));

-- 4. Extend day_habit_completions with amount and frozen target snapshot
alter table if exists day_habit_completions
  add column if not exists amount numeric not null default 0 check (amount >= 0),
  add column if not exists target_snapshot numeric;

-- 5. Force PostgREST to reload its schema cache immediately
notify pgrst, 'reload schema';

