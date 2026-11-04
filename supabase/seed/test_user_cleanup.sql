-- =============================================================================
-- Script: supabase/seed/test_user_cleanup.sql
-- PURPOSE:
-- Safely cleans up all generated month activity data for a test user account.
-- Leaves default seeded habits intact and unarchives any habits.
--
-- SAFETY ENFORCEMENT:
-- 1. One variable v_email.
-- 2. Must resolve v_uid from auth.users; aborts if missing or if email does not contain '+test'.
-- 3. Pre-checks and post-checks row counts for user_id <> v_uid in every table.
--    If ANY other user's rows change, raises exception and rolls back transaction.
-- 4. Prints deleted rows per table.
-- =============================================================================

do $$
declare
  -- CONFIGURATION: Set the test user email here (MUST contain '+test')
  v_email text := 'me+test@gmail.com';

  v_uid uuid;

  -- Safety counts before
  v_habits_before bigint;
  v_subitems_before bigint;
  v_entries_before bigint;
  v_completions_before bigint;
  v_subcompletions_before bigint;
  v_reviews_before bigint;
  v_quotes_before bigint;
  v_intentions_before bigint;
  v_notes_before bigint;
  v_sessions_before bigint;

  -- Safety counts after
  v_habits_after bigint;
  v_subitems_after bigint;
  v_entries_after bigint;
  v_completions_after bigint;
  v_subcompletions_after bigint;
  v_reviews_after bigint;
  v_quotes_after bigint;
  v_intentions_after bigint;
  v_notes_after bigint;
  v_sessions_after bigint;

  -- Deletion counts for reporting
  v_del_entries bigint := 0;
  v_del_completions bigint := 0;
  v_del_subcompletions bigint := 0;
  v_del_reviews bigint := 0;
  v_del_intentions bigint := 0;
  v_del_notes bigint := 0;
  v_del_sessions bigint := 0;
begin
  -- 1. RESOLVE USER & VALIDATE EMAIL
  if v_email not like '%+test%' then
    raise exception 'SAFETY ABORT: Email "%" does not contain "+test"', v_email;
  end if;

  select id into v_uid from auth.users where email = v_email;
  if v_uid is null then
    raise exception 'SAFETY ABORT: User with email "%" not found in auth.users', v_email;
  end if;

  raise notice 'Starting cleanup for test user % (uid: %)', v_email, v_uid;

  -- 2. SNAPSHOT COUNTS FOR OTHER USERS (SAFETY PRE-CHECK)
  select count(*) into v_habits_before from public.habits where user_id <> v_uid;
  select count(*) into v_subitems_before from public.habit_subitems where user_id <> v_uid;
  select count(*) into v_entries_before from public.day_entries where user_id <> v_uid;
  select count(*) into v_completions_before from public.day_habit_completions where user_id <> v_uid;
  select count(*) into v_subcompletions_before from public.day_subitem_completions where user_id <> v_uid;
  select count(*) into v_reviews_before from public.month_reviews where user_id <> v_uid;
  select count(*) into v_quotes_before from public.quotes where user_id <> v_uid;
  select count(*) into v_intentions_before from public.weekly_intentions where user_id <> v_uid;
  select count(*) into v_notes_before from public.habit_day_notes where user_id <> v_uid;
  select count(*) into v_sessions_before from public.focus_sessions where user_id <> v_uid;

  -- 3. SCOPED DELETIONS (Strictly where user_id = v_uid)
  delete from public.focus_sessions where user_id = v_uid;
  get diagnostics v_del_sessions = row_count;

  delete from public.habit_day_notes where user_id = v_uid;
  get diagnostics v_del_notes = row_count;

  delete from public.month_reviews where user_id = v_uid;
  get diagnostics v_del_reviews = row_count;

  delete from public.weekly_intentions where user_id = v_uid;
  get diagnostics v_del_intentions = row_count;

  delete from public.day_subitem_completions where user_id = v_uid;
  get diagnostics v_del_subcompletions = row_count;

  delete from public.day_habit_completions where user_id = v_uid;
  get diagnostics v_del_completions = row_count;

  delete from public.day_entries where user_id = v_uid;
  get diagnostics v_del_entries = row_count;

  -- 4. RESET HABIT ATTRIBUTES FOR v_uid (Restore baseline targets, unarchive)
  update public.habits
  set is_archived = false,
      archived_at = null,
      notes = null
  where user_id = v_uid;

  update public.habits
  set target_value = 4
  where user_id = v_uid and name = 'Drink 4L Water';

  -- 5. SAFETY POST-CHECK (VERIFY OTHER USERS' DATA UNTOUCHED)
  select count(*) into v_habits_after from public.habits where user_id <> v_uid;
  select count(*) into v_subitems_after from public.habit_subitems where user_id <> v_uid;
  select count(*) into v_entries_after from public.day_entries where user_id <> v_uid;
  select count(*) into v_completions_after from public.day_habit_completions where user_id <> v_uid;
  select count(*) into v_subcompletions_after from public.day_subitem_completions where user_id <> v_uid;
  select count(*) into v_reviews_after from public.month_reviews where user_id <> v_uid;
  select count(*) into v_quotes_after from public.quotes where user_id <> v_uid;
  select count(*) into v_intentions_after from public.weekly_intentions where user_id <> v_uid;
  select count(*) into v_notes_after from public.habit_day_notes where user_id <> v_uid;
  select count(*) into v_sessions_after from public.focus_sessions where user_id <> v_uid;

  if v_habits_after <> v_habits_before then
    raise exception 'SAFETY ABORT: habits count for other users changed (% -> %)', v_habits_before, v_habits_after;
  end if;
  if v_subitems_after <> v_subitems_before then
    raise exception 'SAFETY ABORT: habit_subitems count for other users changed (% -> %)', v_subitems_before, v_subitems_after;
  end if;
  if v_entries_after <> v_entries_before then
    raise exception 'SAFETY ABORT: day_entries count for other users changed (% -> %)', v_entries_before, v_entries_after;
  end if;
  if v_completions_after <> v_completions_before then
    raise exception 'SAFETY ABORT: day_habit_completions count for other users changed (% -> %)', v_completions_before, v_completions_after;
  end if;
  if v_subcompletions_after <> v_subcompletions_before then
    raise exception 'SAFETY ABORT: day_subitem_completions count for other users changed (% -> %)', v_subcompletions_before, v_subcompletions_after;
  end if;
  if v_reviews_after <> v_reviews_before then
    raise exception 'SAFETY ABORT: month_reviews count for other users changed (% -> %)', v_reviews_before, v_reviews_after;
  end if;
  if v_quotes_after <> v_quotes_before then
    raise exception 'SAFETY ABORT: quotes count for other users changed (% -> %)', v_quotes_before, v_quotes_after;
  end if;
  if v_intentions_after <> v_intentions_before then
    raise exception 'SAFETY ABORT: weekly_intentions count for other users changed (% -> %)', v_intentions_before, v_intentions_after;
  end if;
  if v_notes_after <> v_notes_before then
    raise exception 'SAFETY ABORT: habit_day_notes count for other users changed (% -> %)', v_notes_before, v_notes_after;
  end if;
  if v_sessions_after <> v_sessions_before then
    raise exception 'SAFETY ABORT: focus_sessions count for other users changed (% -> %)', v_sessions_before, v_sessions_after;
  end if;

  -- 6. REPORT DELETED ROW COUNTS
  raise notice '====================================================';
  raise notice 'CLEANUP COMPLETED SUCCESSFULLY FOR %', v_email;
  raise notice 'Deleted day_entries:            %', v_del_entries;
  raise notice 'Deleted day_habit_completions:  %', v_del_completions;
  raise notice 'Deleted day_subitem_completions:%', v_del_subcompletions;
  raise notice 'Deleted focus_sessions:         %', v_del_sessions;
  raise notice 'Deleted habit_day_notes:        %', v_del_notes;
  raise notice 'Deleted month_reviews:          %', v_del_reviews;
  raise notice 'Deleted weekly_intentions:      %', v_del_intentions;
  raise notice 'All habit attributes reset to default baseline.';
  raise notice '====================================================';
end $$;

