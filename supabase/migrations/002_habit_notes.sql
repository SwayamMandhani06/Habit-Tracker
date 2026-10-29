-- =============================================================================
-- Migration 002: Add notes column to habits table
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- =============================================================================

alter table habits
  add column if not exists notes text;
