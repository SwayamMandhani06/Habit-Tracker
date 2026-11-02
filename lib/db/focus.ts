// lib/db/focus.ts — Focus Timer data fetching and queries (server-side)
import { createServerClient } from '@/lib/supabase/server'
import { todayDate } from './entries'
import type { Habit, FocusSession } from '@/lib/supabase/types'

export interface FocusHabitInfo {
  id: string
  name: string
  type: string
  unit: string | null
  target_value: number | null
  color: string
  icon: string
  todayAmount: number
  isCompleted: boolean
  isSkipped: boolean
}

export interface FocusPagePayload {
  today: string
  habits: FocusHabitInfo[]
  todaySessions: (FocusSession & { habitName?: string; habitColor?: string; habitIcon?: string })[]
  soundEffectsEnabled: boolean
}

export async function getFocusPageData(): Promise<FocusPagePayload> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  const today = await todayDate()

  if (authError || !user) {
    return {
      today,
      habits: [],
      todaySessions: [],
      soundEffectsEnabled: true,
    }
  }

  // 1. Fetch active habits
  const { data: habitsRaw } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('sort_order', { ascending: true })

  const habitsList: Habit[] = habitsRaw ?? []

  // 2. Fetch today's day_entry & habit completions to know today's amounts
  const { data: todayEntry } = await supabase
    .from('day_entries')
    .select('id, day_habit_completions(habit_id, amount, is_completed, is_skipped, target_snapshot)')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle()

  const completionsMap = new Map<string, { amount: number; isCompleted: boolean; isSkipped: boolean }>()
  if (todayEntry?.day_habit_completions) {
    for (const c of todayEntry.day_habit_completions as any[]) {
      completionsMap.set(c.habit_id, {
        amount: Number(c.amount ?? 0),
        isCompleted: Boolean(c.is_completed),
        isSkipped: Boolean(c.is_skipped),
      })
    }
  }

  const focusHabits: FocusHabitInfo[] = habitsList.map((h) => {
    const comp = completionsMap.get(h.id)
    return {
      id: h.id,
      name: h.name,
      type: h.type,
      unit: h.unit ?? null,
      target_value: h.target_value ?? null,
      color: (h as any).color ?? 'sage',
      icon: (h as any).icon ?? 'circle-dot',
      todayAmount: comp ? comp.amount : 0,
      isCompleted: comp ? comp.isCompleted : false,
      isSkipped: comp ? comp.isSkipped : false,
    }
  })

  // 3. Fetch today's focus sessions (with graceful fallback if table not yet migrated)
  let sessions: FocusSession[] = []
  try {
    const { data: sessionRows, error: sessError } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('local_date', today)
      .order('started_at', { ascending: false })

    if (!sessError && sessionRows) {
      sessions = sessionRows as FocusSession[]
    }
  } catch {
    // Migration pending
    sessions = []
  }

  // Map habit info onto sessions
  const habitsById = new Map(habitsList.map((h) => [h.id, h]))
  const enrichedSessions = sessions.map((s) => {
    const h = s.habit_id ? habitsById.get(s.habit_id) : undefined
    return {
      ...s,
      habitName: h?.name,
      habitColor: (h as any)?.color ?? 'sage',
      habitIcon: (h as any)?.icon ?? 'clock',
    }
  })

  return {
    today,
    habits: focusHabits,
    todaySessions: enrichedSessions,
    soundEffectsEnabled: true,
  }
}

