-- =============================================================================
-- Migration 005: Fix day_entries unique constraint for multi-user
-- =============================================================================
-- In single-user mode, day_entries had a unique constraint on (date).
-- In multi-user mode with RLS, each user must be able to have an entry for the same date.
-- This migration drops the old date-only constraint and enforces uniqueness per (date, user_id).
-- =============================================================================

-- 1. Drop the old single-column constraint on date
alter table day_entries 
  drop constraint if exists day_entries_date_key;

-- 2. Drop any previous naming variants
alter table day_entries 
  drop constraint if exists day_entries_user_date_key;

alter table day_entries 
  drop constraint if exists day_entries_date_user_key;

-- 3. Add the compound unique constraint (date, user_id)
alter table day_entries 
  add constraint day_entries_date_user_key 
  unique (date, user_id);

