-- =============================================================================
-- Script: supabase/seed/oracle.sql
-- PURPOSE:
-- Independent Calculation Oracle (Pure PostgreSQL, Raw Tables Only, Zero App Code).
-- Computes streaks (gaps-and-islands), calendar-day averages, per-habit rates,
-- best/worst habits, and weekday consistency for a user account.
--
-- USAGE:
-- Run in Supabase SQL editor. Returns a single summary results table,
-- followed by per-habit and weekday breakdown tables.
-- =============================================================================

with config as (
  select
    -- Configure test user email and timezone
    'me+test@gmail.com'::text as v_email,
    'Asia/Kolkata'::text as v_tz
),
resolved_user as (
  select
    u.id as user_id,
    c.v_tz,
    (current_timestamp at time zone c.v_tz)::date as today,
    (current_timestamp at time zone c.v_tz)::date - 1 as yesterday,
    (current_timestamp at time zone c.v_tz)::date - 30 as start_date_30d,
    date_trunc('month', (current_timestamp at time zone c.v_tz)::date)::date as month_start
  from config c
  join auth.users u on u.email = c.v_email
),
-- All 31 calendar dates in the evaluation window (start_date_30d to today)
eval_dates as (
  select
    r.user_id,
    r.v_tz,
    r.today,
    r.yesterday,
    r.start_date_30d,
    r.month_start,
    d::date as cal_date,
    extract(dow from d)::integer as dow
  from resolved_user r
  cross join generate_series(r.start_date_30d, r.today, '1 day'::interval) d
),
-- Determine habit active status per habit per date
habit_date_status as (
  select
    ed.cal_date,
    ed.dow,
    ed.user_id,
    ed.today,
    ed.yesterday,
    ed.start_date_30d,
    ed.month_start,
    h.id as habit_id,
    h.name as habit_name,
    h.type as habit_type,
    h.target_value,
    -- Active if created on or before date, not archived on or before date, and not skipped on date
    (
      (h.created_at at time zone ed.v_tz)::date <= ed.cal_date
      and (h.archived_at is null or (h.archived_at at time zone ed.v_tz)::date > ed.cal_date)
      and coalesce(dhc.is_skipped, false) = false
    ) as is_active,
    coalesce(dhc.is_skipped, false) as is_skipped,
    -- Habit completion logic
    case
      -- Checklist completion
      when h.type = 'checklist' then (
        select count(*) > 0 and count(*) = count(*) filter (where dsc.is_completed = true)
        from public.habit_subitems hs
        left join public.day_subitem_completions dsc
          on dsc.subitem_id = hs.id
          and dsc.day_entry_id = de.id
          and dsc.user_id = ed.user_id
        where hs.habit_id = h.id
          and hs.user_id = ed.user_id
          and (hs.created_at at time zone ed.v_tz)::date <= ed.cal_date
      )
      -- Amount completion (snapshot aware)
      when h.type = 'amount' then (
        case
          when dhc.target_snapshot is not null and dhc.target_snapshot > 0 then
            coalesce(dhc.amount, 0) >= dhc.target_snapshot
          else
            coalesce(dhc.is_completed, false)
        end
      )
      -- Checkbox completion
      else coalesce(dhc.is_completed, false)
    end as is_completed
  from eval_dates ed
  cross join public.habits h
  left join public.day_entries de
    on de.user_id = ed.user_id
    and de.date = ed.cal_date
  left join public.day_habit_completions dhc
    on dhc.day_entry_id = de.id
    and dhc.habit_id = h.id
    and dhc.user_id = ed.user_id
  where h.user_id = ed.user_id
),
-- Daily scores per calendar date
daily_scores as (
  select
    cal_date,
    dow,
    user_id,
    today,
    yesterday,
    start_date_30d,
    month_start,
    count(*) filter (where is_active) as active_count,
    count(*) filter (where is_active and is_completed) as completed_count,
    case
      when count(*) filter (where is_active) > 0 then
        round((count(*) filter (where is_active and is_completed)::numeric / count(*) filter (where is_active)) * 100)
      else 0
    end as completion_pct,
    (count(*) filter (where is_active) >= 1 and count(*) filter (where is_active) = count(*) filter (where is_active and is_completed)) as is_perfect,
    (count(*) filter (where is_active) = 0) as is_neutral
  from habit_date_status
  group by cal_date, dow, user_id, today, yesterday, start_date_30d, month_start
),
-- Gaps-and-Islands streak calculation on non-neutral calendar days
island_numbered as (
  select
    cal_date,
    is_perfect,
    today,
    yesterday,
    row_number() over (order by cal_date) as rn_all,
    row_number() over (partition by is_perfect order by cal_date) as rn_grp
  from daily_scores
  where not is_neutral and cal_date <= today
),
islands as (
  select
    is_perfect,
    min(cal_date) as island_start,
    max(cal_date) as island_end,
    count(*) as streak_length
  from island_numbered
  where is_perfect
  group by (rn_all - rn_grp), is_perfect
),
streaks_summary as (
  select
    coalesce(max(streak_length), 0) as longest_streak,
    -- Current streak: island ending today if today is perfect, otherwise ending yesterday
    coalesce((
      select streak_length
      from islands
      where (
        case
          when (select is_perfect from daily_scores where cal_date = (select today from resolved_user)) then
            island_end = (select today from resolved_user)
          else
            island_end = (select yesterday from resolved_user)
        end
      )
    ), 0) as current_streak
  from islands
),
-- Period Averages (over calendar days, missing entries count as 0%)
period_averages as (
  select
    -- 7-Day Average (today - 6 to today)
    round(
      coalesce(
        sum(completion_pct) filter (where cal_date between today - 6 and today)::numeric /
        nullif(count(*) filter (where cal_date between today - 6 and today and not is_neutral), 0),
        0
      ), 1
    ) as seven_day_avg_pct,
    -- Month Average (month_start to today)
    round(
      coalesce(
        sum(completion_pct) filter (where cal_date between month_start and today)::numeric /
        nullif(count(*) filter (where cal_date between month_start and today and not is_neutral), 0),
        0
      ), 1
    ) as month_avg_pct,
    -- 30-Day Window Average (start_date_30d to yesterday)
    round(
      coalesce(
        sum(completion_pct) filter (where cal_date between start_date_30d and yesterday)::numeric /
        nullif(count(*) filter (where cal_date between start_date_30d and yesterday and not is_neutral), 0),
        0
      ), 1
    ) as thirty_day_avg_pct,
    -- Total perfect days in 30-day window ending yesterday
    count(*) filter (where is_perfect and cal_date between start_date_30d and yesterday) as perfect_days_30d,
    -- Total perfect days in current month up to today
    count(*) filter (where is_perfect and cal_date between month_start and today) as perfect_days_month
  from daily_scores
  cross join (select today, yesterday, start_date_30d, month_start from resolved_user) r
  group by today, yesterday, start_date_30d, month_start
),
-- Per-habit statistics over 30-day window
per_habit_rates as (
  select
    hds.habit_id,
    hds.habit_name,
    count(*) filter (where hds.is_active) as active_days,
    count(*) filter (where hds.is_active and hds.is_completed) as completed_days,
    count(*) filter (where hds.is_skipped) as skipped_days,
    case
      when count(*) filter (where hds.is_active) > 0 then
        round((count(*) filter (where hds.is_active and hds.is_completed)::numeric / count(*) filter (where hds.is_active)) * 100, 1)
      else 0
    end as rate_pct
  from habit_date_status hds
  where hds.cal_date between hds.start_date_30d and hds.yesterday
  group by hds.habit_id, hds.habit_name
),
best_worst as (
  select
    (select habit_name || ' (' || rate_pct || '%)' from per_habit_rates order by rate_pct desc, active_days desc limit 1) as best_habit,
    (select habit_name || ' (' || rate_pct || '%)' from per_habit_rates order by rate_pct asc, active_days desc limit 1) as worst_habit
),
-- Weekday rates over 30-day window
weekday_rates as (
  select
    jsonb_object_agg(
      case dow
        when 1 then 'Monday'
        when 2 then 'Tuesday'
        when 3 then 'Wednesday'
        when 4 then 'Thursday'
        when 5 then 'Friday'
        when 6 then 'Saturday'
        when 0 then 'Sunday'
      end,
      round(avg(completion_pct), 1)
    ) as weekday_consistency
  from daily_scores
  where cal_date between start_date_30d and yesterday
)
-- PRIMARY ORACLE RESULT ROW
select
  u.v_email as user_email,
  u.v_tz as timezone,
  u.today as evaluation_today,
  u.start_date_30d || ' to ' || u.yesterday as window_30d,
  s.current_streak,
  s.longest_streak,
  pa.perfect_days_30d,
  pa.perfect_days_month,
  pa.seven_day_avg_pct,
  pa.month_avg_pct,
  pa.thirty_day_avg_pct,
  bw.best_habit,
  bw.worst_habit,
  wr.weekday_consistency
from resolved_user u
cross join streaks_summary s
cross join period_averages pa
cross join best_worst bw
cross join weekday_rates wr;

