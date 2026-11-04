-- =============================================================================
-- Migration 015: Idempotent Seed Function (SECURITY INVOKER)
-- File: supabase/migrations/015_seed_function.sql
--
-- PURPOSE:
-- Creates public.seed_default_data() RPC function to seed default habits,
-- sub-items, and quotes in a single atomic database transaction.
--
-- PROPERTIES:
-- - Returns jsonb: {"seeded": true, "habits_count": 13, "subitems_count": 20, "quotes_count": 15}
--   or {"seeded": false, "reason": "already_has_data"}.
-- - SECURITY INVOKER: Runs with caller's authentication context (auth.uid()).
-- - Atomic: If any statement fails, the entire transaction rolls back.
-- - Strictly idempotent: Does nothing if user already has ANY habit or day_entry.
--
-- CHECK CONSTRAINTS VERIFIED:
-- 1. habits_type_check: type in ('checkbox', 'checklist', 'amount') -> verified.
-- 2. habits_amount_needs_target: type <> 'amount' or (target_value is not null and unit is not null) -> verified.
-- 3. habits.target_value: null or target_value > 0 -> 10000, 4, 150 are > 0 -> verified.
-- 4. habits.unit: null or length <= 16 -> 'steps' (5), 'L' (1), 'min' (3) <= 16 -> verified.
-- 5. habits.step_value: step_value > 0 -> 1000, 0.5, 15 are > 0 -> verified.
-- 6. habits.color: color in ('sage','clay','sky','amber','plum','rose','slate','teal') -> verified.
-- =============================================================================

create or replace function public.seed_default_data()
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_morning_id uuid;
  v_night_id uuid;
  v_habits_count integer := 0;
  v_subitems_count integer := 0;
  v_quotes_count integer := 0;
begin
  -- 1. Ensure caller is authenticated
  if v_user_id is null then
    raise exception 'seed_default_data: Not authenticated';
  end if;

  -- 2. Strictly idempotent: do nothing if user already has ANY habit or ANY day_entry
  if exists (select 1 from public.habits where user_id = v_user_id)
     or exists (select 1 from public.day_entries where user_id = v_user_id) then
    return jsonb_build_object(
      'seeded', false,
      'reason', 'already_has_data',
      'user_id', v_user_id
    );
  end if;

  -- 3. Insert 13 Habits (exact names and order from spec, with valid types, units, colors, icons)
  -- Habit 1: Morning Routine (checklist)
  insert into public.habits (user_id, name, type, sort_order, color, icon, is_archived)
  values (v_user_id, 'Morning Routine', 'checklist', 1, 'amber', 'sunrise', false)
  returning id into v_morning_id;

  -- Habit 2: Gym / Workout (checkbox)
  insert into public.habits (user_id, name, type, sort_order, color, icon, is_archived)
  values (v_user_id, 'Gym / Workout', 'checkbox', 2, 'rose', 'dumbbell', false);

  -- Habit 3: 10k Steps (amount: 10000 steps, step 1000)
  insert into public.habits (user_id, name, type, sort_order, color, icon, target_value, unit, step_value, is_archived)
  values (v_user_id, '10k Steps', 'amount', 3, 'teal', 'footprints', 10000, 'steps', 1000, false);

  -- Habit 4: Drink 4L Water (amount: 4 L, step 0.5)
  insert into public.habits (user_id, name, type, sort_order, color, icon, target_value, unit, step_value, is_archived)
  values (v_user_id, 'Drink 4L Water', 'amount', 4, 'sky', 'droplet', 4, 'L', 0.5, false);

  -- Habit 5: Healthy Diet & Creatine (checkbox)
  insert into public.habits (user_id, name, type, sort_order, color, icon, is_archived)
  values (v_user_id, 'Healthy Diet & Creatine', 'checkbox', 5, 'sage', 'sparkles', false);

  -- Habit 6: Deep Work (2-3 Hours) (amount: 150 min, step 15)
  insert into public.habits (user_id, name, type, sort_order, color, icon, target_value, unit, step_value, is_archived)
  values (v_user_id, 'Deep Work (2-3 Hours)', 'amount', 6, 'slate', 'zap', 150, 'min', 15, false);

  -- Habit 7: Skill Building (Coding / DSA / Projects) (checkbox)
  insert into public.habits (user_id, name, type, sort_order, color, icon, is_archived)
  values (v_user_id, 'Skill Building (Coding / DSA / Projects)', 'checkbox', 7, 'clay', 'crosshair', false);

  -- Habit 8: Book Reading (checkbox)
  insert into public.habits (user_id, name, type, sort_order, color, icon, is_archived)
  values (v_user_id, 'Book Reading', 'checkbox', 8, 'amber', 'book', false);

  -- Habit 9: Journaling (checkbox)
  insert into public.habits (user_id, name, type, sort_order, color, icon, is_archived)
  values (v_user_id, 'Journaling', 'checkbox', 9, 'plum', 'pen-tool', false);

  -- Habit 10: Mandir / Prayer (checkbox)
  insert into public.habits (user_id, name, type, sort_order, color, icon, is_archived)
  values (v_user_id, 'Mandir / Prayer', 'checkbox', 10, 'sage', 'heart', false);

  -- Habit 11: No Social Media / Reels (checkbox)
  insert into public.habits (user_id, name, type, sort_order, color, icon, is_archived)
  values (v_user_id, 'No Social Media / Reels', 'checkbox', 11, 'rose', 'shield', false);

  -- Habit 12: No Fap (checkbox)
  insert into public.habits (user_id, name, type, sort_order, color, icon, is_archived)
  values (v_user_id, 'No Fap', 'checkbox', 12, 'slate', 'target', false);

  -- Habit 13: Night Routine (checklist)
  insert into public.habits (user_id, name, type, sort_order, color, icon, is_archived)
  values (v_user_id, 'Night Routine', 'checklist', 13, 'plum', 'moon', false)
  returning id into v_night_id;

  v_habits_count := 13;

  -- 4. Insert Subitems for Morning Routine (9 subitems)
  insert into public.habit_subitems (user_id, habit_id, name, sort_order)
  values
    (v_user_id, v_morning_id, 'No phone after waking up', 1),
    (v_user_id, v_morning_id, 'Make bed', 2),
    (v_user_id, v_morning_id, 'Brush teeth', 3),
    (v_user_id, v_morning_id, 'Wash face', 4),
    (v_user_id, v_morning_id, 'Drink water', 5),
    (v_user_id, v_morning_id, 'Morning sunlight', 6),
    (v_user_id, v_morning_id, 'Stretch', 7),
    (v_user_id, v_morning_id, 'Pray', 8),
    (v_user_id, v_morning_id, 'Plan Top 3 Tasks', 9);

  -- 5. Insert Subitems for Night Routine (11 subitems)
  insert into public.habit_subitems (user_id, habit_id, name, sort_order)
  values
    (v_user_id, v_night_id, 'No phone before sleeping', 1),
    (v_user_id, v_night_id, 'Brush teeth', 2),
    (v_user_id, v_night_id, 'Skincare', 3),
    (v_user_id, v_night_id, 'Prepare clothes', 4),
    (v_user_id, v_night_id, 'Pack bag', 5),
    (v_user_id, v_night_id, 'Fill water bottle', 6),
    (v_user_id, v_night_id, 'Journal', 7),
    (v_user_id, v_night_id, 'Read', 8),
    (v_user_id, v_night_id, 'Pray', 9),
    (v_user_id, v_night_id, 'Set alarm', 10),
    (v_user_id, v_night_id, 'Sleep on time', 11);

  v_subitems_count := 20;

  -- 6. Insert Curated Quotes (15 quotes)
  insert into public.quotes (user_id, text, is_active)
  values
    (v_user_id, 'Motivation is what gets you started. Discipline is what keeps you going.', true),
    (v_user_id, 'The cost of discipline is always less than the cost of regret.', true),
    (v_user_id, 'You don''t rise to the level of your goals. You fall to the level of your systems.', true),
    (v_user_id, 'Stop waiting to feel like it.', true),
    (v_user_id, 'One day or day one. You decide.', true),
    (v_user_id, 'We are what we repeatedly do. Excellence is not an act but a habit.', true),
    (v_user_id, 'Your future self is watching you right now through your memories.', true),
    (v_user_id, 'Hard choices, easy life. Easy choices, hard life.', true),
    (v_user_id, 'The man who moves a mountain begins by carrying away small stones.', true),
    (v_user_id, 'Discipline is choosing between what you want now and what you want most.', true),
    (v_user_id, 'You will never always be motivated. You have to learn to be disciplined.', true),
    (v_user_id, 'Don''t wish it were easier. Wish you were better.', true),
    (v_user_id, 'Small disciplines repeated with consistency lead to great achievements gained slowly over time.', true),
    (v_user_id, 'The only way out is through.', true),
    (v_user_id, 'Do it even when you don''t want to. Especially when you don''t want to.', true);

  v_quotes_count := 15;

  -- 7. Return atomic success summary
  return jsonb_build_object(
    'seeded', true,
    'habits_count', v_habits_count,
    'subitems_count', v_subitems_count,
    'quotes_count', v_quotes_count,
    'user_id', v_user_id
  );
end;
$$;

-- Grant execution to authenticated users
grant execute on function public.seed_default_data() to authenticated;

notify pgrst, 'reload schema';
