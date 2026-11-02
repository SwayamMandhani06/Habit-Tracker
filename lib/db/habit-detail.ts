// lib/db/habit-detail.ts — Single-range query aggregator for Habit Detail Page
import { createServerClient } from '@/lib/supabase/server'
import type { Habit, HabitDayNote } from '@/lib/supabase/types'
import type { HabitRecord } from '@/lib/stats/habit-math'

export interface HabitDetailPayload {
  habit: Habit
  records: Record<string, HabitRecord> // date YYYY-MM-DD → HabitRecord
  notes: HabitDayNote[] // sorted newest first
  today: string
}

export async function getHabitDetailData(
  habitId: string,
  todayStr: string
): Promise<HabitDetailPayload | null> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  // 1. Fetch Habit
  const { data: habit, error: habitError } = await supabase
    .from('habits')
    .select('*')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (habitError || !habit) {
    return null
  }

  // 2. Fetch Completions with day_entries date in ONE query
  // Select amount and target_snapshot with graceful fallback if migration is pending
  let completionRows: any[] = []

  const fullCompQuery = await supabase
    .from('day_habit_completions')
    .select('is_completed, is_skipped, amount, target_snapshot, day_entries!inner(date)')
    .eq('habit_id', habitId)
    .eq('user_id', user.id)

  if (fullCompQuery.error) {
    // Fallback if amount or target_snapshot columns not yet present in schema
    const fallbackQuery = await supabase
      .from('day_habit_completions')
      .select('is_completed, is_skipped, day_entries!inner(date)')
      .eq('habit_id', habitId)
      .eq('user_id', user.id)

    completionRows = fallbackQuery.data ?? []
  } else {
    completionRows = fullCompQuery.data ?? []
  }

  const records: Record<string, HabitRecord> = {}
  for (const row of completionRows) {
    const date = (row.day_entries as any)?.date
    if (date) {
      records[date] = {
        isCompleted: Boolean(row.is_completed),
        isSkipped: Boolean(row.is_skipped),
        amount: row.amount !== undefined && row.amount !== null ? Number(row.amount) : undefined,
        targetSnapshot:
          row.target_snapshot !== undefined && row.target_snapshot !== null
            ? Number(row.target_snapshot)
            : null,
      }
    }
  }

  // 3. Fetch Day Notes in ONE query (newest first) with graceful fallback if table not migrated yet
  let notes: HabitDayNote[] = []
  try {
    const { data: notesData, error: notesError } = await supabase
      .from('habit_day_notes')
      .select('*')
      .eq('habit_id', habitId)
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (!notesError && notesData) {
      notes = notesData as HabitDayNote[]
    }
  } catch {
    notes = []
  }

  return {
    habit: habit as Habit,
    records,
    notes,
    today: todayStr,
  }
}

