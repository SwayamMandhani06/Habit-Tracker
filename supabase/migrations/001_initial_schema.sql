-- =============================================================================
-- 1% Better — Habit Tracker
-- Full Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- =============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================================================
-- TABLE: habits
-- =============================================================================
create table if not exists habits (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  type          text not null check (type in ('checkbox', 'checklist')),
  sort_order    integer not null default 0,
  is_archived   boolean not null default false,
  archived_at   timestamptz,
  created_at    timestamptz not null default now()
);

-- =============================================================================
-- TABLE: habit_subitems
-- =============================================================================
create table if not exists habit_subitems (
  id          uuid primary key default uuid_generate_v4(),
  habit_id    uuid not null references habits(id) on delete cascade,
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- TABLE: day_entries
-- =============================================================================
create table if not exists day_entries (
  id                   uuid primary key default uuid_generate_v4(),
  date                 date not null unique,
  mood                 integer check (mood between 1 and 5),
  energy               integer check (energy between 1 and 5),
  sleep_hours          numeric(4,1),
  weight_kg            numeric(5,2),
  screen_time_minutes  integer,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger day_entries_updated_at
  before update on day_entries
  for each row execute function update_updated_at();

-- =============================================================================
-- TABLE: day_habit_completions
-- =============================================================================
create table if not exists day_habit_completions (
  id            uuid primary key default uuid_generate_v4(),
  day_entry_id  uuid not null references day_entries(id) on delete cascade,
  habit_id      uuid not null references habits(id) on delete cascade,
  is_completed  boolean not null default false,
  unique(day_entry_id, habit_id)
);

-- =============================================================================
-- TABLE: day_subitem_completions
-- =============================================================================
create table if not exists day_subitem_completions (
  id            uuid primary key default uuid_generate_v4(),
  day_entry_id  uuid not null references day_entries(id) on delete cascade,
  subitem_id    uuid not null references habit_subitems(id) on delete cascade,
  is_completed  boolean not null default false,
  unique(day_entry_id, subitem_id)
);

-- =============================================================================
-- TABLE: month_reviews
-- =============================================================================
create table if not exists month_reviews (
  id                        uuid primary key default uuid_generate_v4(),
  year                      integer not null,
  month                     integer not null check (month between 1 and 12),
  overall_completion_pct    numeric(5,2),
  best_habit_id             uuid references habits(id),
  worst_habit_id            uuid references habits(id),
  avg_sleep_hours           numeric(4,1),
  avg_water_consistency     numeric(5,2),
  workout_consistency_pct   numeric(5,2),
  reading_consistency_pct   numeric(5,2),
  deep_work_consistency_pct numeric(5,2),
  lessons_learned           text,
  biggest_achievement       text,
  goals_next_month          text,
  final_reflection          text,
  memorable_moments         text,
  goals_this_month          text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique(year, month)
);

create trigger month_reviews_updated_at
  before update on month_reviews
  for each row execute function update_updated_at();

-- =============================================================================
-- TABLE: quotes
-- =============================================================================
create table if not exists quotes (
  id         uuid primary key default uuid_generate_v4(),
  text       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- INDEXES for performance
-- =============================================================================
create index if not exists idx_habits_sort_order on habits(sort_order) where not is_archived;
create index if not exists idx_habit_subitems_habit_id on habit_subitems(habit_id);
create index if not exists idx_day_entries_date on day_entries(date);
create index if not exists idx_day_habit_completions_day_entry on day_habit_completions(day_entry_id);
create index if not exists idx_day_habit_completions_habit on day_habit_completions(habit_id);
create index if not exists idx_day_subitem_completions_day_entry on day_subitem_completions(day_entry_id);
create index if not exists idx_month_reviews_year_month on month_reviews(year, month);

-- =============================================================================
-- VIEW: daily_scores
-- Computes completion stats per day_entry, respecting active habits at that date
-- =============================================================================
create or replace view daily_scores as
select
  de.id as day_entry_id,
  de.date,
  -- Count habits that were active (created before or on this date, not yet archived or archived after this date)
  count(distinct h.id) as total_active_habits,
  -- Count completed habits for this day
  count(distinct case
    when h.type = 'checkbox' and dhc.is_completed = true then h.id
    when h.type = 'checklist' and (
      -- All subitems completed
      select count(*) from habit_subitems si
      where si.habit_id = h.id
        and si.created_at <= (de.date + interval '1 day')
    ) > 0
    and (
      select count(*) from habit_subitems si
      left join day_subitem_completions dsc
        on dsc.subitem_id = si.id and dsc.day_entry_id = de.id
      where si.habit_id = h.id
        and si.created_at <= (de.date + interval '1 day')
        and (dsc.is_completed is null or dsc.is_completed = false)
    ) = 0
    then h.id
    else null
  end) as completed_habits,
  round(
    case when count(distinct h.id) = 0 then 0
    else count(distinct case
      when h.type = 'checkbox' and dhc.is_completed = true then h.id
      when h.type = 'checklist' and (
        select count(*) from habit_subitems si
        where si.habit_id = h.id
          and si.created_at <= (de.date + interval '1 day')
      ) > 0
      and (
        select count(*) from habit_subitems si
        left join day_subitem_completions dsc
          on dsc.subitem_id = si.id and dsc.day_entry_id = de.id
        where si.habit_id = h.id
          and si.created_at <= (de.date + interval '1 day')
          and (dsc.is_completed is null or dsc.is_completed = false)
      ) = 0
      then h.id
      else null
    end)::numeric * 100.0 / count(distinct h.id)
    end, 2
  ) as completion_pct,
  de.mood,
  de.energy,
  de.sleep_hours
from day_entries de
cross join habits h
left join day_habit_completions dhc
  on dhc.day_entry_id = de.id and dhc.habit_id = h.id
where
  -- Habit was created before or on this date
  h.created_at::date <= de.date
  and (
    -- Habit is not archived, OR was archived after this date
    h.is_archived = false
    or (h.is_archived = true and h.archived_at::date > de.date)
  )
group by de.id, de.date, de.mood, de.energy, de.sleep_hours;

-- =============================================================================
-- VIEW: habit_monthly_stats
-- Per-habit monthly consistency
-- =============================================================================
create or replace view habit_monthly_stats as
select
  h.id as habit_id,
  h.name as habit_name,
  extract(year from de.date)::integer as year,
  extract(month from de.date)::integer as month,
  count(distinct de.id) as days_active,
  count(distinct case
    when h.type = 'checkbox' and dhc.is_completed = true then de.id
    when h.type = 'checklist' and (
      select count(*) from habit_subitems si
      where si.habit_id = h.id
        and si.created_at <= (de.date + interval '1 day')
    ) > 0
    and (
      select count(*) from habit_subitems si
      left join day_subitem_completions dsc
        on dsc.subitem_id = si.id and dsc.day_entry_id = de.id
      where si.habit_id = h.id
        and si.created_at <= (de.date + interval '1 day')
        and (dsc.is_completed is null or dsc.is_completed = false)
    ) = 0
    then de.id
    else null
  end) as days_completed,
  round(
    case when count(distinct de.id) = 0 then 0
    else count(distinct case
      when h.type = 'checkbox' and dhc.is_completed = true then de.id
      when h.type = 'checklist' and (
        select count(*) from habit_subitems si
        where si.habit_id = h.id
          and si.created_at <= (de.date + interval '1 day')
      ) > 0
      and (
        select count(*) from habit_subitems si
        left join day_subitem_completions dsc
          on dsc.subitem_id = si.id and dsc.day_entry_id = de.id
        where si.habit_id = h.id
          and si.created_at <= (de.date + interval '1 day')
          and (dsc.is_completed is null or dsc.is_completed = false)
      ) = 0
      then de.id
      else null
    end)::numeric * 100.0 / count(distinct de.id)
    end, 2
  ) as consistency_pct
from habits h
cross join day_entries de
left join day_habit_completions dhc
  on dhc.day_entry_id = de.id and dhc.habit_id = h.id
where
  h.created_at::date <= de.date
  and (
    h.is_archived = false
    or (h.is_archived = true and h.archived_at::date > de.date)
  )
group by h.id, h.name, extract(year from de.date), extract(month from de.date);
