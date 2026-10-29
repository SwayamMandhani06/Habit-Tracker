-- =============================================================================
-- Migration 007: Curated discipline quotes
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- =============================================================================

-- Clear existing quotes
truncate table quotes;

-- Insert 15 curated brutal, honest discipline quotes
insert into quotes (text, is_active) values
  ('Motivation is what gets you started. Discipline is what keeps you going.', true),
  ('The cost of discipline is always less than the cost of regret.', true),
  ('You don''t rise to the level of your goals. You fall to the level of your systems.', true),
  ('Stop waiting to feel like it.', true),
  ('One day or day one. You decide.', true),
  ('We are what we repeatedly do. Excellence is not an act but a habit.', true),
  ('Your future self is watching you right now through your memories.', true),
  ('Hard choices, easy life. Easy choices, hard life.', true),
  ('The man who moves a mountain begins by carrying away small stones.', true),
  ('Discipline is choosing between what you want now and what you want most.', true),
  ('You will never always be motivated. You have to learn to be disciplined.', true),
  ('Don''t wish it were easier. Wish you were better.', true),
  ('Small disciplines repeated with consistency lead to great achievements gained slowly over time.', true),
  ('The only way out is through.', true),
  ('Do it even when you don''t want to. Especially when you don''t want to.', true);

