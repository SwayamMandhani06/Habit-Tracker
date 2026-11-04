-- =============================================================================
-- Migration 004: Data migration — assign existing rows to your user_id
--
-- WHEN TO RUN THIS:
--   1. Run migration 003 first (RLS setup)
--   2. Open the app at /login and CREATE YOUR ACCOUNT (email/password signup)
--   3. Go to Supabase Dashboard → Authentication → Users
--   4. Copy your user UUID (the "UID" column for your account)
--   5. Replace 'YOUR-USER-UUID-HERE' in this script with that UUID
--   6. Run this script in Supabase SQL Editor
--
-- SAFETY: This script only updates rows where user_id IS NULL
-- (i.e. existing pre-migration rows). New rows created after migration
-- 003 will already have user_id set via auth.uid() default.
-- =============================================================================

-- ⚠️  REPLACE THIS VALUE WITH YOUR ACTUAL USER UUID FROM auth.users
do $$
declare
  target_user_id uuid := 'YOUR-USER-UUID-HERE';
begin

  -- Update habits
  update habits set user_id = target_user_id where user_id is null;

  -- Update habit_subitems
  update habit_subitems set user_id = target_user_id where user_id is null;

  -- Update day_entries
  update day_entries set user_id = target_user_id where user_id is null;

  -- Update day_habit_completions
  update day_habit_completions set user_id = target_user_id where user_id is null;

  -- Update day_subitem_completions
  update day_subitem_completions set user_id = target_user_id where user_id is null;

  -- Update month_reviews
  update month_reviews set user_id = target_user_id where user_id is null;

  -- Update quotes
  update quotes set user_id = target_user_id where user_id is null;

  raise notice 'Migration complete. All existing rows assigned to user %', target_user_id;
end $$;

-- =============================================================================
-- VERIFICATION: Run these queries to confirm all rows are assigned
-- =============================================================================

-- select count(*) from habits               where user_id is null;  -- should be 0
-- select count(*) from habit_subitems       where user_id is null;  -- should be 0
-- select count(*) from day_entries          where user_id is null;  -- should be 0
-- select count(*) from day_habit_completions where user_id is null; -- should be 0
-- select count(*) from day_subitem_completions where user_id is null; -- should be 0
-- select count(*) from month_reviews        where user_id is null;  -- should be 0
-- select count(*) from quotes               where user_id is null;  -- should be 0
