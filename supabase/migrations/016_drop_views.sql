-- =============================================================================
-- Migration 016: Drop Legacy Views
-- File: supabase/migrations/016_drop_views.sql
--
-- RUN ONLY AFTER THE CODE THAT STOPS READING THEM IS DEPLOYED
-- =============================================================================

drop view if exists public.daily_scores cascade;
drop view if exists public.habit_monthly_stats cascade;

notify pgrst, 'reload schema';
