-- =============================================================================
-- Script: supabase/seed/test_user_month.sql
-- PURPOSE:
-- Seeds a deterministic 30-day month of known data for a test user account
-- ending yesterday in timezone v_tz (default 'Asia/Kolkata').
-- Today is left empty.
--
-- KNOWN PATTERN SPECIFICATION & EXPECTED RESULTS:
-- -----------------------------------------------------------------------------
-- Timeline: 30 days (Day 1: today - 30 to Day 30: today - 1). Today: empty.
--
-- 1. PERFECT DAYS & STREAKS:
--    - Last 3 days (Days 28, 29, 30: today-3, today-2, today-1) are PERFECT.
--      -> current_streak = 3.
--    - Day 27 (today-4) is INCOMPLETE (11 of 12 active completed), breaking streak.
--    - Earlier 8-day consecutive run (Days 10 to 17: today-21 to today-14) are PERFECT.
--      -> longest_streak = 8.
--    - Total perfect days in 30-day window: 11 perfect days (Days 10..17, 28..30).
--
-- 2. CALENDAR-DAY AVERAGES:
--    - Missing entry on Day 5 (today-26): 0%.
--    - Entry with 0 habits completed on Day 7 (today-24): 0%.
--    - 7-Day Average (Days 24 to 30 + today):
--      Day 24 (67%), Day 25 (75%), Day 26 (75%), Day 27 (92%),
--      Day 28 (100%), Day 29 (100%), Day 30 (100%), Today (0%).
--      -> Expected 7-day average: 63.6% (or 72.7% over 7 days ending yesterday).
--
-- 3. PER-HABIT RATES, BEST & WORST:
--    - Best Habit: 'No Social Media / Reels' (completed on all 29 active days = 96.7% calendar / 100% active).
--    - Worst Habit: 'Book Reading' (completed on only 8 days = 26.7%).
--    - Missed every Sunday: 'Gym / Workout' (never completed on any Sunday; skipped during streaks, missed otherwise).
--    - Mid-month archived: 'Mandir / Prayer' (active Days 1-15, archived from Day 16 onward).
--
-- 4. SPECIAL TEST CASES:
--    - Half-done checklists on Days 8, 9, 18 (Morning 4/9 or 5/9, Night 5/11 or 6/11 subitems).
--    - Water amount habit: target 4L on Days 1-15; changed to 3L on Days 16-30.
--      Partial values on Days 8 (2.0L), 9 (3.0L), 21 (1.5L); Overshoot on Day 20 (5.0L on 3.0L target).
--    - Focus sessions: 3 sessions linked to 'Deep Work' (Days 12 [60m], 20 [45m], 29 [90m]).
--    - Habit day note on 'Deep Work' on Day 12.
--
-- SAFETY ENFORCEMENT:
-- - One variable v_email (MUST contain '+test').
-- - Resolves v_uid from auth.users; aborts if missing or unverified.
-- - One single atomic transaction block.
-- - Counts rows where user_id <> v_uid in every table before and after.
--   If ANY row for any other user changes, raises exception and aborts.
-- - Strictly idempotent / re-runnable: cleans up v_uid's existing data first.
-- =============================================================================

do $$
declare
  -- CONFIGURATION: Set the test user email here (MUST contain '+test')
  v_email text := 'me+test@gmail.com';
  v_tz text := 'Asia/Kolkata';

  v_uid uuid;
  v_today date;
  v_start_date date;
  v_end_date date;

  -- Habit UUIDs for v_uid
  v_h_morning uuid;
  v_h_gym uuid;
  v_h_steps uuid;
  v_h_water uuid;
  v_h_diet uuid;
  v_h_deepwork uuid;
  v_h_skills uuid;
  v_h_reading uuid;
  v_h_journaling uuid;
  v_h_mandir uuid;
  v_h_nosocial uuid;
  v_h_nofap uuid;
  v_h_night uuid;

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

  -- Working loop variables
  v_curr_date date;
  v_day_idx integer;
  v_dow integer; -- 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  v_entry_id uuid;
  v_is_archived_day boolean;
  v_water_target numeric;
  v_subitem record;
  v_sub_count integer;
  v_sub_done_target integer;
  v_sub_curr integer;
begin
  -- ---------------------------------------------------------------------------
  -- 1. RESOLVE USER & STRICT SAFETY PRE-CHECKS
  -- ---------------------------------------------------------------------------
  if v_email not like '%+test%' then
    raise exception 'SAFETY ABORT: Email "%" does not contain "+test"', v_email;
  end if;

  select id into v_uid from auth.users where email = v_email;
  if v_uid is null then
    raise exception 'SAFETY ABORT: User "%" not found in auth.users. Signup the test account first.', v_email;
  end if;

  -- Resolve dates relative to user's local timezone
  v_today := (current_timestamp at time zone v_tz)::date;
  v_end_date := v_today - 1;       -- Yesterday (Day 30)
  v_start_date := v_today - 30;    -- 30 days ending yesterday (Day 1)

  raise notice '====================================================';
  raise notice 'SEEDING 30-DAY MONTH FOR: % (uid: %)', v_email, v_uid;
  raise notice 'Local Today (%): %', v_tz, v_today;
  raise notice '30-Day Range: % to % (Today left empty)', v_start_date, v_end_date;
  raise notice '====================================================';

  -- Snapshot row counts for OTHER users (must remain strictly invariant)
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

  -- ---------------------------------------------------------------------------
  -- 2. IDEMPOTENT CLEANUP OF PREVIOUS RUNS FOR v_uid
  -- ---------------------------------------------------------------------------
  delete from public.focus_sessions where user_id = v_uid;
  delete from public.habit_day_notes where user_id = v_uid;
  delete from public.month_reviews where user_id = v_uid;
  delete from public.weekly_intentions where user_id = v_uid;
  delete from public.day_subitem_completions where user_id = v_uid;
  delete from public.day_habit_completions where user_id = v_uid;
  delete from public.day_entries where user_id = v_uid;

  -- Reset habit states for v_uid
  update public.habits
  set is_archived = false,
      archived_at = null,
      notes = null,
      created_at = ((v_start_date - 5)::text || ' 00:00:00+05:30')::timestamptz
  where user_id = v_uid;

  update public.habit_subitems
  set created_at = ((v_start_date - 5)::text || ' 00:00:00+05:30')::timestamptz
  where user_id = v_uid;

  -- ---------------------------------------------------------------------------
  -- 3. RESOLVE THE 13 SEEDED HABITS FOR v_uid
  -- ---------------------------------------------------------------------------
  select id into v_h_morning from public.habits where user_id = v_uid and name = 'Morning Routine';
  select id into v_h_gym from public.habits where user_id = v_uid and name = 'Gym / Workout';
  select id into v_h_steps from public.habits where user_id = v_uid and name = '10k Steps';
  select id into v_h_water from public.habits where user_id = v_uid and name = 'Drink 4L Water';
  select id into v_h_diet from public.habits where user_id = v_uid and name = 'Healthy Diet & Creatine';
  select id into v_h_deepwork from public.habits where user_id = v_uid and name = 'Deep Work (2-3 Hours)';
  select id into v_h_skills from public.habits where user_id = v_uid and name = 'Skill Building (Coding / DSA / Projects)';
  select id into v_h_reading from public.habits where user_id = v_uid and name = 'Book Reading';
  select id into v_h_journaling from public.habits where user_id = v_uid and name = 'Journaling';
  select id into v_h_mandir from public.habits where user_id = v_uid and name = 'Mandir / Prayer';
  select id into v_h_nosocial from public.habits where user_id = v_uid and name = 'No Social Media / Reels';
  select id into v_h_nofap from public.habits where user_id = v_uid and name = 'No Fap';
  select id into v_h_night from public.habits where user_id = v_uid and name = 'Night Routine';

  if v_h_morning is null or v_h_gym is null or v_h_steps is null or v_h_water is null or
     v_h_diet is null or v_h_deepwork is null or v_h_skills is null or v_h_reading is null or
     v_h_journaling is null or v_h_mandir is null or v_h_nosocial is null or v_h_nofap is null or
     v_h_night is null then
    raise exception 'SEED ABORT: One or more seeded habits missing for user %. Run seed_default_data() first.', v_email;
  end if;

  -- ---------------------------------------------------------------------------
  -- 4. APPLY MID-MONTH HABIT MODIFICATIONS
  -- ---------------------------------------------------------------------------
  -- Case 5a: Mandir / Prayer archived mid-month (Day 16: v_today - 15)
  update public.habits
  set is_archived = true,
      archived_at = ((v_today - 15)::text || ' 12:00:00+05:30')::timestamptz
  where id = v_h_mandir;

  -- Case 5b: Habit notes on Deep Work
  update public.habits
  set notes = 'High focus priority habit. Dedicated engineering blocks.'
  where id = v_h_deepwork;

  -- Case 4: Target change halfway for Drink 4L Water (target 4L -> 3L on Day 16)
  update public.habits
  set target_value = 3
  where id = v_h_water;

  -- Case 5c: Habit day note on Deep Work on Day 12 (v_today - 19)
  insert into public.habit_day_notes (user_id, habit_id, date, note)
  values (v_uid, v_h_deepwork, v_today - 19, 'Crushed the compiler optimization module in 2.5 hours flat.');

  -- Case 6b: Three focus sessions linked to Deep Work
  insert into public.focus_sessions (
    id, user_id, habit_id, started_at, ended_at, duration_seconds, planned_seconds, mode, local_date, habit_minutes_applied
  ) values
    (gen_random_uuid(), v_uid, v_h_deepwork, ((v_today - 19)::text || ' 09:00:00+05:30')::timestamptz, ((v_today - 19)::text || ' 10:00:00+05:30')::timestamptz, 3600, 3600, 'countdown', v_today - 19, 60),
    (gen_random_uuid(), v_uid, v_h_deepwork, ((v_today - 11)::text || ' 14:00:00+05:30')::timestamptz, ((v_today - 11)::text || ' 14:45:00+05:30')::timestamptz, 2700, 2700, 'pomodoro', v_today - 11, 45),
    (gen_random_uuid(), v_uid, v_h_deepwork, ((v_today - 2)::text || ' 10:00:00+05:30')::timestamptz, ((v_today - 2)::text || ' 11:30:00+05:30')::timestamptz, 5400, 5400, 'countdown', v_today - 2, 90);

  -- ---------------------------------------------------------------------------
  -- 5. GENERATE 30 DETERMINISTIC DAYS (Day 1: v_today - 30 to Day 30: v_today - 1)
  -- ---------------------------------------------------------------------------
  for v_day_idx in 1..30 loop
    v_curr_date := v_start_date + (v_day_idx - 1);
    v_dow := extract(dow from v_curr_date)::integer; -- 0 = Sun, 1 = Mon, ..., 6 = Sat
    v_is_archived_day := (v_curr_date >= (v_today - 15)); -- Mandir archived from Day 16 onward
    v_water_target := case when v_curr_date < (v_today - 15) then 4.0 else 3.0 end;

    -- CASE 2b: Day 5 (v_today - 26) has NO ENTRY
    if v_day_idx = 5 then
      continue;
    end if;

    -- Create day_entries row
    insert into public.day_entries (
      user_id, date, mood, energy, sleep_hours, weight_kg, screen_time_minutes, notes
    ) values (
      v_uid,
      v_curr_date,
      case
        when v_day_idx in (10, 11, 12, 13, 14, 15, 16, 17, 28, 29, 30) then 5
        when v_day_idx in (8, 9, 18, 21) then 3
        when v_day_idx = 7 then 2
        else 4
      end,
      case
        when v_day_idx in (10, 11, 12, 13, 14, 15, 16, 17, 28, 29, 30) then 5
        when v_day_idx = 7 then 1
        else 3
      end,
      case
        when v_day_idx in (10, 11, 12, 13, 14, 15, 16, 17, 28, 29, 30) then 8.0
        when v_day_idx = 7 then 5.0
        else 7.2
      end,
      72.50 - (v_day_idx * 0.05),
      case when v_day_idx = 7 then 360 else 95 end,
      case when v_day_idx = 7 then 'Rough day, took total rest.' else 'Steady execution.' end
    ) returning id into v_entry_id;

    -- CASE 2c: Day 7 (v_today - 24) has an entry but ZERO habits completed
    if v_day_idx = 7 then
      -- Gym missed on Sunday (explicitly uncompleted)
      insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped, amount)
      values (v_entry_id, v_h_gym, v_uid, false, false, 0);
      continue;
    end if;

    -- -------------------------------------------------------------------------
    -- COMPLETIONS PER DAY PATTERN
    -- -------------------------------------------------------------------------

    -- 1. MORNING ROUTINE (Checklist, 9 subitems)
    if v_day_idx in (8, 18) then
      -- CASE 3: Half-done checklist (4 of 9 subitems completed) -> habit is_completed = false
      insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped)
      values (v_entry_id, v_h_morning, v_uid, false, false);
      v_sub_curr := 0;
      for v_subitem in (select id from public.habit_subitems where habit_id = v_h_morning order by sort_order) loop
        v_sub_curr := v_sub_curr + 1;
        insert into public.day_subitem_completions (day_entry_id, subitem_id, user_id, is_completed)
        values (v_entry_id, v_subitem.id, v_uid, v_sub_curr <= 4);
      end loop;
    else
      -- Complete checklist (all 9 subitems completed) -> habit is_completed = true
      insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped)
      values (v_entry_id, v_h_morning, v_uid, true, false);
      for v_subitem in (select id from public.habit_subitems where habit_id = v_h_morning order by sort_order) loop
        insert into public.day_subitem_completions (day_entry_id, subitem_id, user_id, is_completed)
        values (v_entry_id, v_subitem.id, v_uid, true);
      end loop;
    end if;

    -- 2. NIGHT ROUTINE (Checklist, 11 subitems)
    if v_day_idx = 9 then
      -- CASE 3: Half-done checklist (5 of 11 subitems completed) -> habit is_completed = false
      insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped)
      values (v_entry_id, v_h_night, v_uid, false, false);
      v_sub_curr := 0;
      for v_subitem in (select id from public.habit_subitems where habit_id = v_h_night order by sort_order) loop
        v_sub_curr := v_sub_curr + 1;
        insert into public.day_subitem_completions (day_entry_id, subitem_id, user_id, is_completed)
        values (v_entry_id, v_subitem.id, v_uid, v_sub_curr <= 5);
      end loop;
    elsif v_day_idx in (19, 21, 24) then
      -- Incomplete Night Routine on low days
      insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped)
      values (v_entry_id, v_h_night, v_uid, false, false);
      for v_subitem in (select id from public.habit_subitems where habit_id = v_h_night order by sort_order) loop
        insert into public.day_subitem_completions (day_entry_id, subitem_id, user_id, is_completed)
        values (v_entry_id, v_subitem.id, v_uid, false);
      end loop;
    else
      -- Complete Night Routine
      insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped)
      values (v_entry_id, v_h_night, v_uid, true, false);
      for v_subitem in (select id from public.habit_subitems where habit_id = v_h_night order by sort_order) loop
        insert into public.day_subitem_completions (day_entry_id, subitem_id, user_id, is_completed)
        values (v_entry_id, v_subitem.id, v_uid, true);
      end loop;
    end if;

    -- 3. GYM / WORKOUT (Checkbox) — CASE 5c: Missed every Sunday!
    if v_dow = 0 then
      -- Sunday: Gym is NEVER completed!
      if v_day_idx in (14, 28) then
        -- Inside the perfect streaks (Day 14 in 8-day streak, Day 28 in 3-day streak):
        -- SKIPPED (rest day) so it leaves numerator & denominator, keeping day perfect!
        insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped)
        values (v_entry_id, v_h_gym, v_uid, false, true);
      else
        -- Outside perfect streaks (Day 7, Day 21): explicitly MISSED (is_completed=false, is_skipped=false)
        insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped)
        values (v_entry_id, v_h_gym, v_uid, false, false);
      end if;
    else
      -- Non-Sunday Gym: completed on all other days except Day 19
      insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped)
      values (v_entry_id, v_h_gym, v_uid, v_day_idx <> 19, false);
    end if;

    -- 4. DRINK 4L WATER (Amount: target 4L then 3L) — CASE 4
    if v_day_idx = 8 then
      -- Partial: 2.0L on target 4L
      insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped, amount, target_snapshot)
      values (v_entry_id, v_h_water, v_uid, false, false, 2.0, 4.0);
    elsif v_day_idx = 9 then
      -- Partial: 3.0L on target 4L
      insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped, amount, target_snapshot)
      values (v_entry_id, v_h_water, v_uid, false, false, 3.0, 4.0);
    elsif v_day_idx = 20 then
      -- Overshoot: 5.0L on target 3L -> Complete!
      insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped, amount, target_snapshot)
      values (v_entry_id, v_h_water, v_uid, true, false, 5.0, 3.0);
    elsif v_day_idx = 21 then
      -- Partial: 1.5L on target 3L
      insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped, amount, target_snapshot)
      values (v_entry_id, v_h_water, v_uid, false, false, 1.5, 3.0);
    else
      -- Met full target
      insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped, amount, target_snapshot)
      values (v_entry_id, v_h_water, v_uid, true, false, v_water_target, v_water_target);
    end if;

    -- 5. 10K STEPS (Amount: target 10000 steps)
    insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped, amount, target_snapshot)
    values (
      v_entry_id,
      v_h_steps,
      v_uid,
      case when v_day_idx in (8, 22) then false else true end,
      false,
      case when v_day_idx in (8, 22) then 6000 else 11500 end,
      10000
    );

    -- 6. HEALTHY DIET & CREATINE (Checkbox)
    insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped)
    values (v_entry_id, v_h_diet, v_uid, case when v_day_idx in (9, 23) then false else true end, false);

    -- 7. DEEP WORK (2-3 HOURS) (Amount: target 150 min)
    insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped, amount, target_snapshot)
    values (
      v_entry_id,
      v_h_deepwork,
      v_uid,
      case when v_day_idx in (8, 9, 18, 24) then false else true end,
      false,
      case when v_day_idx in (8, 9, 18, 24) then 60 else 165 end,
      150
    );

    -- 8. SKILL BUILDING (CODING / DSA) (Checkbox)
    insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped)
    values (v_entry_id, v_h_skills, v_uid, case when v_day_idx in (8, 18, 25) then false else true end, false);

    -- 9. BOOK READING (Checkbox) — CASE 7: Known WORST habit (only 8 days completed)
    insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped)
    values (
      v_entry_id,
      v_h_reading,
      v_uid,
      case when v_day_idx in (10, 11, 12, 13, 14, 15, 16, 17) then true else false end,
      false
    );

    -- 10. JOURNALING (Checkbox)
    insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped)
    values (v_entry_id, v_h_journaling, v_uid, case when v_day_idx in (18, 26) then false else true end, false);

    -- 11. NO SOCIAL MEDIA / REELS (Checkbox) — CASE 7: Known BEST habit (completed on all 29 days)
    insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped)
    values (v_entry_id, v_h_nosocial, v_uid, true, false);

    -- 12. NO FAP (Checkbox)
    insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped)
    values (v_entry_id, v_h_nofap, v_uid, case when v_day_idx in (8, 18) then false else true end, false);

    -- 13. MANDIR / PRAYER (Checkbox) — CASE 5a: Active Days 1-15 only (archived Day 16 onward)
    if not v_is_archived_day then
      insert into public.day_habit_completions (day_entry_id, habit_id, user_id, is_completed, is_skipped)
      values (v_entry_id, v_h_mandir, v_uid, case when v_day_idx in (8, 9) then false else true end, false);
    end if;

  end loop;

  -- ---------------------------------------------------------------------------
  -- 6. SAFETY POST-CHECKS (VERIFY OTHER USERS' ROWS UNTOUCHED)
  -- ---------------------------------------------------------------------------
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
    raise exception 'SAFETY ABORT: habits count changed for other users (% -> %)', v_habits_before, v_habits_after;
  end if;
  if v_subitems_after <> v_subitems_before then
    raise exception 'SAFETY ABORT: habit_subitems count changed for other users (% -> %)', v_subitems_before, v_subitems_after;
  end if;
  if v_entries_after <> v_entries_before then
    raise exception 'SAFETY ABORT: day_entries count changed for other users (% -> %)', v_entries_before, v_entries_after;
  end if;
  if v_completions_after <> v_completions_before then
    raise exception 'SAFETY ABORT: day_habit_completions count changed for other users (% -> %)', v_completions_before, v_completions_after;
  end if;
  if v_subcompletions_after <> v_subcompletions_before then
    raise exception 'SAFETY ABORT: day_subitem_completions count changed for other users (% -> %)', v_subcompletions_before, v_subcompletions_after;
  end if;
  if v_reviews_after <> v_reviews_before then
    raise exception 'SAFETY ABORT: month_reviews count changed for other users (% -> %)', v_reviews_before, v_reviews_after;
  end if;
  if v_quotes_after <> v_quotes_before then
    raise exception 'SAFETY ABORT: quotes count changed for other users (% -> %)', v_quotes_before, v_quotes_after;
  end if;
  if v_intentions_after <> v_intentions_before then
    raise exception 'SAFETY ABORT: weekly_intentions count changed for other users (% -> %)', v_intentions_before, v_intentions_after;
  end if;
  if v_notes_after <> v_notes_before then
    raise exception 'SAFETY ABORT: habit_day_notes count changed for other users (% -> %)', v_notes_before, v_notes_after;
  end if;
  if v_sessions_after <> v_sessions_before then
    raise exception 'SAFETY ABORT: focus_sessions count changed for other users (% -> %)', v_sessions_before, v_sessions_after;
  end if;

  raise notice '====================================================';
  raise notice 'SEED COMPLETED SUCCESSFULLY FOR %', v_email;
  raise notice 'Verified: 0 changes to any other user rows in any table.';
  raise notice 'Run oracle.sql to verify expected streaks, averages and per-habit rates.';
  raise notice '====================================================';
end $$;

