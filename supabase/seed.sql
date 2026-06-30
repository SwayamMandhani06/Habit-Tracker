-- =============================================================================
-- 1% Better — Seed Data
-- Run AFTER 001_initial_schema.sql
-- =============================================================================

-- Default Habits (13 top-level)
insert into habits (id, name, type, sort_order, created_at) values
  ('a1000000-0000-0000-0000-000000000001', 'Morning Routine',              'checklist', 1,  now()),
  ('a1000000-0000-0000-0000-000000000002', 'Gym / Workout',                'checkbox',  2,  now()),
  ('a1000000-0000-0000-0000-000000000003', '10k Steps',                    'checkbox',  3,  now()),
  ('a1000000-0000-0000-0000-000000000004', 'Drink 4L Water',               'checkbox',  4,  now()),
  ('a1000000-0000-0000-0000-000000000005', 'Healthy Diet & Creatine',      'checkbox',  5,  now()),
  ('a1000000-0000-0000-0000-000000000006', 'Deep Work (2–3 Hours)',        'checkbox',  6,  now()),
  ('a1000000-0000-0000-0000-000000000007', 'Skill Building (Coding / DSA / Projects)', 'checkbox', 7, now()),
  ('a1000000-0000-0000-0000-000000000008', 'Book Reading',                 'checkbox',  8,  now()),
  ('a1000000-0000-0000-0000-000000000009', 'Journaling',                   'checkbox',  9,  now()),
  ('a1000000-0000-0000-0000-000000000010', 'Mandir / Prayer',              'checkbox',  10, now()),
  ('a1000000-0000-0000-0000-000000000011', 'No Social Media / Reels',     'checkbox',  11, now()),
  ('a1000000-0000-0000-0000-000000000012', 'No Fap',                       'checkbox',  12, now()),
  ('a1000000-0000-0000-0000-000000000013', 'Night Routine',                'checklist', 13, now())
on conflict (id) do nothing;

-- Morning Routine sub-items (9)
insert into habit_subitems (habit_id, name, sort_order) values
  ('a1000000-0000-0000-0000-000000000001', 'No phone after waking up', 1),
  ('a1000000-0000-0000-0000-000000000001', 'Make bed',                 2),
  ('a1000000-0000-0000-0000-000000000001', 'Brush teeth',              3),
  ('a1000000-0000-0000-0000-000000000001', 'Wash face',                4),
  ('a1000000-0000-0000-0000-000000000001', 'Drink water',              5),
  ('a1000000-0000-0000-0000-000000000001', 'Morning sunlight',         6),
  ('a1000000-0000-0000-0000-000000000001', 'Stretch',                  7),
  ('a1000000-0000-0000-0000-000000000001', 'Pray',                     8),
  ('a1000000-0000-0000-0000-000000000001', 'Plan Top 3 Tasks',         9)
on conflict do nothing;

-- Night Routine sub-items (11)
insert into habit_subitems (habit_id, name, sort_order) values
  ('a1000000-0000-0000-0000-000000000013', 'No phone before sleeping', 1),
  ('a1000000-0000-0000-0000-000000000013', 'Brush teeth',              2),
  ('a1000000-0000-0000-0000-000000000013', 'Skincare',                 3),
  ('a1000000-0000-0000-0000-000000000013', 'Prepare clothes',          4),
  ('a1000000-0000-0000-0000-000000000013', 'Pack bag',                 5),
  ('a1000000-0000-0000-0000-000000000013', 'Fill water bottle',        6),
  ('a1000000-0000-0000-0000-000000000013', 'Journal',                  7),
  ('a1000000-0000-0000-0000-000000000013', 'Read',                     8),
  ('a1000000-0000-0000-0000-000000000013', 'Pray',                     9),
  ('a1000000-0000-0000-0000-000000000013', 'Set alarm',                10),
  ('a1000000-0000-0000-0000-000000000013', 'Sleep on time',            11)
on conflict do nothing;

-- Default Quotes
insert into quotes (text, is_active) values
  ('Getting 1% better every day.', true),
  ('Discipline is the bridge between goals and accomplishment.', true),
  ('Small consistent actions compound into extraordinary results.', true),
  ('The man who moves a mountain begins by carrying small stones.', true),
  ('Excellence is not an act but a habit.', true),
  ('Do the work. Every day, no matter what.', true),
  ('Your future self is watching you right now.', true),
  ('Show up even when you don''t feel like it — especially then.', true),
  ('Progress, not perfection. But still — show up.', true),
  ('The cost of discipline is always less than the cost of regret.', true),
  ('Hard choices, easy life. Easy choices, hard life.', true),
  ('One day or day one. You decide.', true),
  ('You don''t rise to the level of your goals, you fall to the level of your systems.', true),
  ('Every master was once a beginner who simply refused to quit.', true),
  ('Earn your rest. Make today count.', true)
on conflict do nothing;
