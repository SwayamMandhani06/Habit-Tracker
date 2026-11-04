-- =============================================================================
-- Supabase Schema Audit Script
-- SELECT-only, completely safe to run anywhere.
-- Does not reference any user table directly.
-- Returns one unified result set: kind, object, status ('ok' or 'MISSING'), detail.
-- Ends with an aggregate summary count of ok vs MISSING.
-- =============================================================================

with expected_tables as (
  select unnest(array[
    'habits',
    'habit_subitems',
    'day_entries',
    'day_habit_completions',
    'day_subitem_completions',
    'month_reviews',
    'quotes',
    'weekly_intentions',
    'habit_day_notes',
    'focus_sessions'
  ]) as table_name
),
expected_columns as (
  select * from (values
    ('habits', 'id'),
    ('habits', 'user_id'),
    ('habits', 'name'),
    ('habits', 'type'),
    ('habits', 'sort_order'),
    ('habits', 'is_archived'),
    ('habits', 'archived_at'),
    ('habits', 'notes'),
    ('habits', 'target_value'),
    ('habits', 'unit'),
    ('habits', 'step_value'),
    ('habits', 'color'),
    ('habits', 'icon'),
    ('habits', 'created_at'),

    ('habit_subitems', 'id'),
    ('habit_subitems', 'habit_id'),
    ('habit_subitems', 'user_id'),
    ('habit_subitems', 'name'),
    ('habit_subitems', 'sort_order'),
    ('habit_subitems', 'created_at'),

    ('day_entries', 'id'),
    ('day_entries', 'user_id'),
    ('day_entries', 'date'),
    ('day_entries', 'mood'),
    ('day_entries', 'energy'),
    ('day_entries', 'sleep_hours'),
    ('day_entries', 'weight_kg'),
    ('day_entries', 'screen_time_minutes'),
    ('day_entries', 'notes'),
    ('day_entries', 'created_at'),
    ('day_entries', 'updated_at'),

    ('day_habit_completions', 'id'),
    ('day_habit_completions', 'day_entry_id'),
    ('day_habit_completions', 'habit_id'),
    ('day_habit_completions', 'user_id'),
    ('day_habit_completions', 'is_completed'),
    ('day_habit_completions', 'is_skipped'),
    ('day_habit_completions', 'amount'),
    ('day_habit_completions', 'target_snapshot'),

    ('day_subitem_completions', 'id'),
    ('day_subitem_completions', 'day_entry_id'),
    ('day_subitem_completions', 'subitem_id'),
    ('day_subitem_completions', 'user_id'),
    ('day_subitem_completions', 'is_completed'),

    ('month_reviews', 'id'),
    ('month_reviews', 'user_id'),
    ('month_reviews', 'year'),
    ('month_reviews', 'month'),
    ('month_reviews', 'overall_completion_pct'),
    ('month_reviews', 'best_habit_id'),
    ('month_reviews', 'worst_habit_id'),
    ('month_reviews', 'avg_sleep_hours'),
    ('month_reviews', 'avg_water_consistency'),
    ('month_reviews', 'workout_consistency_pct'),
    ('month_reviews', 'reading_consistency_pct'),
    ('month_reviews', 'deep_work_consistency_pct'),
    ('month_reviews', 'lessons_learned'),
    ('month_reviews', 'biggest_achievement'),
    ('month_reviews', 'goals_next_month'),
    ('month_reviews', 'final_reflection'),
    ('month_reviews', 'memorable_moments'),
    ('month_reviews', 'goals_this_month'),
    ('month_reviews', 'what_went_well'),
    ('month_reviews', 'habit_needs_work'),
    ('month_reviews', 'one_thing_to_change'),
    ('month_reviews', 'created_at'),
    ('month_reviews', 'updated_at'),

    ('quotes', 'id'),
    ('quotes', 'user_id'),
    ('quotes', 'text'),
    ('quotes', 'is_active'),
    ('quotes', 'created_at'),

    ('weekly_intentions', 'id'),
    ('weekly_intentions', 'user_id'),
    ('weekly_intentions', 'year'),
    ('weekly_intentions', 'week_number'),
    ('weekly_intentions', 'intention'),
    ('weekly_intentions', 'created_at'),
    ('weekly_intentions', 'updated_at'),

    ('habit_day_notes', 'id'),
    ('habit_day_notes', 'user_id'),
    ('habit_day_notes', 'habit_id'),
    ('habit_day_notes', 'date'),
    ('habit_day_notes', 'note'),
    ('habit_day_notes', 'created_at'),
    ('habit_day_notes', 'updated_at'),

    ('focus_sessions', 'id'),
    ('focus_sessions', 'user_id'),
    ('focus_sessions', 'habit_id'),
    ('focus_sessions', 'started_at'),
    ('focus_sessions', 'ended_at'),
    ('focus_sessions', 'duration_seconds'),
    ('focus_sessions', 'planned_seconds'),
    ('focus_sessions', 'mode'),
    ('focus_sessions', 'local_date'),
    ('focus_sessions', 'habit_minutes_applied'),
    ('focus_sessions', 'created_at')
  ) as t(table_name, column_name)
),
expected_views as (
  select unnest(array[
    'daily_scores',
    'habit_monthly_stats'
  ]) as view_name
),
expected_functions as (
  select unnest(array[
    'update_updated_at',
    'log_focus_session',
    'delete_focus_session'
  ]) as routine_name
),
expected_indexes as (
  select unnest(array[
    'idx_habits_user_id',
    'idx_habit_subitems_user_id',
    'idx_habit_subitems_habit_id',
    'idx_day_entries_user_id',
    'idx_day_entries_user_date',
    'idx_day_habit_completions_user_id',
    'idx_day_habit_completions_day_entry',
    'idx_day_habit_completions_habit',
    'idx_day_subitem_completions_user_id',
    'idx_month_reviews_user_id',
    'idx_month_reviews_user_year_month',
    'idx_quotes_user_id',
    'focus_sessions_user_date'
  ]) as index_name
),
expected_triggers as (
  select * from (values
    ('day_entries', 'day_entries_updated_at'),
    ('month_reviews', 'month_reviews_updated_at')
  ) as t(table_name, trigger_name)
),
audit_results as (
  -- 1. Tables check
  select
    'TABLE' as kind,
    et.table_name as object,
    case when to_regclass('public.' || et.table_name) is not null then 'ok' else 'MISSING' end as status,
    case when to_regclass('public.' || et.table_name) is not null then 'Found in public schema' else 'Table does not exist' end as detail
  from expected_tables et

  union all

  -- 2. Columns check
  select
    'COLUMN' as kind,
    ec.table_name || '.' || ec.column_name as object,
    case when c.column_name is not null then 'ok' else 'MISSING' end as status,
    coalesce(c.data_type || case when c.is_nullable = 'NO' then ' NOT NULL' else '' end, 'Column missing from ' || ec.table_name) as detail
  from expected_columns ec
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = ec.table_name
   and c.column_name = ec.column_name

  union all

  -- 3. Views check
  select
    'VIEW' as kind,
    ev.view_name as object,
    case when v.table_name is not null then 'ok' else 'MISSING' end as status,
    case when v.table_name is not null then 'View exists' else 'View does not exist' end as detail
  from expected_views ev
  left join information_schema.views v
    on v.table_schema = 'public'
   and v.table_name = ev.view_name

  union all

  -- 4. Functions check
  select
    'FUNCTION' as kind,
    ef.routine_name as object,
    case when r.routine_name is not null then 'ok' else 'MISSING' end as status,
    coalesce('Type: ' || r.routine_type || ', Security: ' || r.security_type, 'Routine does not exist') as detail
  from expected_functions ef
  left join information_schema.routines r
    on r.routine_schema = 'public'
   and r.routine_name = ef.routine_name

  union all

  -- 5. Indexes check
  select
    'INDEX' as kind,
    ei.index_name as object,
    case when i.indexname is not null then 'ok' else 'MISSING' end as status,
    coalesce('On table: ' || i.tablename, 'Index does not exist') as detail
  from expected_indexes ei
  left join pg_catalog.pg_indexes i
    on i.schemaname = 'public'
   and i.indexname = ei.index_name

  union all

  -- 6. Triggers check
  select
    'TRIGGER' as kind,
    et.table_name || ' -> ' || et.trigger_name as object,
    case when tr.trigger_name is not null then 'ok' else 'MISSING' end as status,
    case when tr.trigger_name is not null then 'Trigger exists on ' || et.table_name else 'Trigger missing' end as detail
  from expected_triggers et
  left join information_schema.triggers tr
    on tr.trigger_schema = 'public'
   and tr.event_object_table = et.table_name
   and tr.trigger_name = et.trigger_name

  union all

  -- 7. RLS Enabled check
  select
    'RLS_ENABLED' as kind,
    et.table_name as object,
    case when cls.relrowsecurity = true then 'ok' else 'MISSING' end as status,
    case when cls.relrowsecurity = true then 'RLS is enabled' else 'RLS is DISABLED' end as detail
  from expected_tables et
  left join pg_catalog.pg_class cls
    on cls.relnamespace = 'public'::regnamespace
   and cls.relname = et.table_name
)
select
  kind,
  object,
  status,
  detail
from audit_results

union all

-- 8. End summary count
select
  'SUMMARY' as kind,
  'TOTAL_CHECKS' as object,
  case when count(*) filter (where status = 'MISSING') = 0 then 'ok' else 'MISSING' end as status,
  'ok: ' || count(*) filter (where status = 'ok') || ', MISSING: ' || count(*) filter (where status = 'MISSING') as detail
from audit_results
order by kind desc, object asc;

