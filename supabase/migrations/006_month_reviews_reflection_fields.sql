-- =============================================================================
-- Migration 006: Add detailed reflection fields to month_reviews
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- =============================================================================

alter table month_reviews
  add column if not exists what_went_well text,
  add column if not exists habit_needs_work text,
  add column if not exists one_thing_to_change text;

