// lib/supabase/types.ts
// Database type definitions in Supabase's required schema format
// This allows the typed client to properly infer return types from .from() calls

export type HabitType = 'checkbox' | 'checklist'

// ── Row types (returned by SELECT) ───────────────────────────────────────────
export interface Habit {
  id: string
  name: string
  type: HabitType
  sort_order: number
  is_archived: boolean
  archived_at: string | null
  created_at: string
}

export interface HabitSubitem {
  id: string
  habit_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface DayEntry {
  id: string
  date: string
  mood: number | null
  energy: number | null
  sleep_hours: number | null
  weight_kg: number | null
  screen_time_minutes: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DayHabitCompletion {
  id: string
  day_entry_id: string
  habit_id: string
  is_completed: boolean
}

export interface DaySubitemCompletion {
  id: string
  day_entry_id: string
  subitem_id: string
  is_completed: boolean
}

export interface MonthReview {
  id: string
  year: number
  month: number
  overall_completion_pct: number | null
  best_habit_id: string | null
  worst_habit_id: string | null
  avg_sleep_hours: number | null
  avg_water_consistency: number | null
  workout_consistency_pct: number | null
  reading_consistency_pct: number | null
  deep_work_consistency_pct: number | null
  lessons_learned: string | null
  biggest_achievement: string | null
  goals_next_month: string | null
  final_reflection: string | null
  memorable_moments: string | null
  goals_this_month: string | null
  created_at: string
  updated_at: string
}

export interface Quote {
  id: string
  text: string
  is_active: boolean
  created_at: string
}

export interface DailyScore {
  day_entry_id: string
  date: string
  total_active_habits: number
  completed_habits: number
  completion_pct: number
  mood: number | null
  energy: number | null
  sleep_hours: number | null
}

export interface HabitMonthlyStat {
  habit_id: string
  habit_name: string
  year: number
  month: number
  days_active: number
  days_completed: number
  consistency_pct: number
}

// ── Supabase Database schema (required format for typed client) ───────────────
export type Database = {
  public: {
    Tables: {
      habits: {
        Row: Habit
        Insert: Omit<Habit, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Habit, 'id' | 'created_at'>>
        Relationships: []
      }
      habit_subitems: {
        Row: HabitSubitem
        Insert: Omit<HabitSubitem, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<HabitSubitem, 'id' | 'created_at'>>
        Relationships: []
      }
      day_entries: {
        Row: DayEntry
        Insert: Omit<DayEntry, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<DayEntry, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      day_habit_completions: {
        Row: DayHabitCompletion
        Insert: Omit<DayHabitCompletion, 'id'> & { id?: string }
        Update: Partial<Omit<DayHabitCompletion, 'id'>>
        Relationships: []
      }
      day_subitem_completions: {
        Row: DaySubitemCompletion
        Insert: Omit<DaySubitemCompletion, 'id'> & { id?: string }
        Update: Partial<Omit<DaySubitemCompletion, 'id'>>
        Relationships: []
      }
      month_reviews: {
        Row: MonthReview
        Insert: Omit<MonthReview, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<MonthReview, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      quotes: {
        Row: Quote
        Insert: Omit<Quote, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Quote, 'id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: {
      daily_scores: {
        Row: DailyScore
        Relationships: []
      }
      habit_monthly_stats: {
        Row: HabitMonthlyStat
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// ── Composite types used in the app ──────────────────────────────────────────
export interface HabitWithSubitems extends Habit {
  subitems: HabitSubitem[]
}

export interface DayCompletionState {
  habitCompletions: Record<string, boolean>   // habit_id → is_completed
  subitemCompletions: Record<string, boolean> // subitem_id → is_completed
}

export interface DashboardStats {
  todayScore: number
  todayTotal: number
  todayPct: number
  weeklyAvgPct: number
  monthlyAvgPct: number
  currentStreak: number
  longestStreak: number
  perfectDaysCount: number
  overallCompletionPct: number
  todayQuote: string | null
  goalsThisMonth: string | null
}
