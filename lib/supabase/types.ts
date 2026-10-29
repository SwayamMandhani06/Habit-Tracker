// lib/supabase/types.ts
// Database type definitions matching migrations 001 through 009
// Strictly typed without any `any` casts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type HabitType = 'checkbox' | 'checklist'

// ── Row types (returned by SELECT) ───────────────────────────────────────────
export type Habit = {
  id: string
  name: string
  type: HabitType
  sort_order: number
  is_archived: boolean
  archived_at: string | null
  notes: string | null
  user_id: string | null
  created_at: string
}

export type HabitSubitem = {
  id: string
  habit_id: string
  name: string
  sort_order: number
  user_id: string | null
  created_at: string
}

export type DayEntry = {
  id: string
  date: string
  mood: number | null
  energy: number | null
  sleep_hours: number | null
  weight_kg: number | null
  screen_time_minutes: number | null
  notes: string | null
  user_id: string | null
  created_at: string
  updated_at: string
}

export type DayHabitCompletion = {
  id: string
  day_entry_id: string
  habit_id: string
  is_completed: boolean
  is_skipped: boolean
  user_id: string | null
}

export type WeeklyIntention = {
  id: string
  user_id: string
  year: number
  week_number: number
  intention: string
  created_at: string
  updated_at: string
}

export type DaySubitemCompletion = {
  id: string
  day_entry_id: string
  subitem_id: string
  is_completed: boolean
  user_id: string | null
}

export type MonthReview = {
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
  what_went_well: string | null
  habit_needs_work: string | null
  one_thing_to_change: string | null
  user_id: string | null
  created_at: string
  updated_at: string
}

export type Quote = {
  id: string
  text: string
  is_active: boolean
  user_id: string | null
  created_at: string
}

export type DailyScore = {
  day_entry_id: string
  user_id: string | null
  date: string
  total_active_habits: number
  skipped_habits?: number
  completed_habits: number
  completion_pct: number
  mood: number | null
  energy: number | null
  sleep_hours: number | null
}

export type HabitMonthlyStat = {
  habit_id: string
  user_id: string | null
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
        Insert: {
          id?: string
          name: string
          type: HabitType
          sort_order?: number
          is_archived?: boolean
          archived_at?: string | null
          notes?: string | null
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: HabitType
          sort_order?: number
          is_archived?: boolean
          archived_at?: string | null
          notes?: string | null
          user_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      habit_subitems: {
        Row: HabitSubitem
        Insert: {
          id?: string
          habit_id: string
          name: string
          sort_order?: number
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          habit_id?: string
          name?: string
          sort_order?: number
          user_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'habit_subitems_habit_id_fkey'
            columns: ['habit_id']
            isOneToOne: false
            referencedRelation: 'habits'
            referencedColumns: ['id']
          }
        ]
      }
      day_entries: {
        Row: DayEntry
        Insert: {
          id?: string
          date: string
          mood?: number | null
          energy?: number | null
          sleep_hours?: number | null
          weight_kg?: number | null
          screen_time_minutes?: number | null
          notes?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          mood?: number | null
          energy?: number | null
          sleep_hours?: number | null
          weight_kg?: number | null
          screen_time_minutes?: number | null
          notes?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      day_habit_completions: {
        Row: DayHabitCompletion
        Insert: {
          id?: string
          day_entry_id: string
          habit_id: string
          is_completed?: boolean
          is_skipped?: boolean
          user_id?: string | null
        }
        Update: {
          id?: string
          day_entry_id?: string
          habit_id?: string
          is_completed?: boolean
          is_skipped?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'day_habit_completions_day_entry_id_fkey'
            columns: ['day_entry_id']
            isOneToOne: false
            referencedRelation: 'day_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'day_habit_completions_habit_id_fkey'
            columns: ['habit_id']
            isOneToOne: false
            referencedRelation: 'habits'
            referencedColumns: ['id']
          }
        ]
      }
      day_subitem_completions: {
        Row: DaySubitemCompletion
        Insert: {
          id?: string
          day_entry_id: string
          subitem_id: string
          is_completed?: boolean
          user_id?: string | null
        }
        Update: {
          id?: string
          day_entry_id?: string
          subitem_id?: string
          is_completed?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'day_subitem_completions_day_entry_id_fkey'
            columns: ['day_entry_id']
            isOneToOne: false
            referencedRelation: 'day_entries'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'day_subitem_completions_subitem_id_fkey'
            columns: ['subitem_id']
            isOneToOne: false
            referencedRelation: 'habit_subitems'
            referencedColumns: ['id']
          }
        ]
      }
      month_reviews: {
        Row: MonthReview
        Insert: {
          id?: string
          year: number
          month: number
          overall_completion_pct?: number | null
          best_habit_id?: string | null
          worst_habit_id?: string | null
          avg_sleep_hours?: number | null
          avg_water_consistency?: number | null
          workout_consistency_pct?: number | null
          reading_consistency_pct?: number | null
          deep_work_consistency_pct?: number | null
          lessons_learned?: string | null
          biggest_achievement?: string | null
          goals_next_month?: string | null
          final_reflection?: string | null
          memorable_moments?: string | null
          goals_this_month?: string | null
          what_went_well?: string | null
          habit_needs_work?: string | null
          one_thing_to_change?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          year?: number
          month?: number
          overall_completion_pct?: number | null
          best_habit_id?: string | null
          worst_habit_id?: string | null
          avg_sleep_hours?: number | null
          avg_water_consistency?: number | null
          workout_consistency_pct?: number | null
          reading_consistency_pct?: number | null
          deep_work_consistency_pct?: number | null
          lessons_learned?: string | null
          biggest_achievement?: string | null
          goals_next_month?: string | null
          final_reflection?: string | null
          memorable_moments?: string | null
          goals_this_month?: string | null
          what_went_well?: string | null
          habit_needs_work?: string | null
          one_thing_to_change?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'month_reviews_best_habit_id_fkey'
            columns: ['best_habit_id']
            isOneToOne: false
            referencedRelation: 'habits'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'month_reviews_worst_habit_id_fkey'
            columns: ['worst_habit_id']
            isOneToOne: false
            referencedRelation: 'habits'
            referencedColumns: ['id']
          }
        ]
      }
      quotes: {
        Row: Quote
        Insert: {
          id?: string
          text: string
          is_active?: boolean
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          text?: string
          is_active?: boolean
          user_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      weekly_intentions: {
        Row: WeeklyIntention
        Insert: {
          id?: string
          user_id?: string | null
          year: number
          week_number: number
          intention?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          year?: number
          week_number?: number
          intention?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'weekly_intentions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
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
export type HabitWithSubitems = Habit & {
  subitems: HabitSubitem[]
}

export type DayCompletionState = {
  habitCompletions: Record<string, boolean>   // habit_id → is_completed
  subitemCompletions: Record<string, boolean> // subitem_id → is_completed
  habitSkips?: Record<string, boolean>        // habit_id → is_skipped
}

export type DashboardStats = {
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
  weeklySparkline?: Array<{ day: string; date: string; pct: number }>
}
