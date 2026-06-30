// lib/db/completions.ts — Completion toggling (server-only)
import { createServerClient } from '@/lib/supabase/server'
import type { DayCompletionState } from '@/lib/supabase/types'
import { toAppDateString } from './entries'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db() { return createServerClient() as any }

type HabitCompRow = { habit_id: string; is_completed: boolean }
type SubitemCompRow = { subitem_id: string; is_completed: boolean }

export async function getDayCompletions(dayEntryId: string): Promise<DayCompletionState> {
  const [{ data: habitComps }, { data: subitemComps }] = await Promise.all([
    db().from('day_habit_completions').select('habit_id, is_completed').eq('day_entry_id', dayEntryId),
    db().from('day_subitem_completions').select('subitem_id, is_completed').eq('day_entry_id', dayEntryId),
  ])

  const habitCompletions: Record<string, boolean> = {}
  for (const row of (habitComps ?? []) as HabitCompRow[]) {
    habitCompletions[row.habit_id] = row.is_completed
  }

  const subitemCompletions: Record<string, boolean> = {}
  for (const row of (subitemComps ?? []) as SubitemCompRow[]) {
    subitemCompletions[row.subitem_id] = row.is_completed
  }

  return { habitCompletions, subitemCompletions }
}

export async function toggleHabitCompletion(dayEntryId: string, habitId: string, isCompleted: boolean): Promise<void> {
  const { error } = await db()
    .from('day_habit_completions')
    .upsert({ day_entry_id: dayEntryId, habit_id: habitId, is_completed: isCompleted }, { onConflict: 'day_entry_id,habit_id' })
  if (error) throw new Error(`toggleHabitCompletion: ${error.message}`)
}

export async function toggleSubitemCompletion(dayEntryId: string, subitemId: string, isCompleted: boolean): Promise<void> {
  const { error } = await db()
    .from('day_subitem_completions')
    .upsert({ day_entry_id: dayEntryId, subitem_id: subitemId, is_completed: isCompleted }, { onConflict: 'day_entry_id,subitem_id' })
  if (error) throw new Error(`toggleSubitemCompletion: ${error.message}`)
}

export async function syncChecklistParent(dayEntryId: string, habitId: string, subitemIds: string[], subitemCompletions: Record<string, boolean>): Promise<void> {
  if (subitemIds.length === 0) return
  const allComplete = subitemIds.every(id => subitemCompletions[id] === true)
  await toggleHabitCompletion(dayEntryId, habitId, allComplete)
}

export async function getCompletionsForMonth(year: number, month: number): Promise<{
  habitCompletions: Array<{ day_entry_id: string; habit_id: string; is_completed: boolean }>
  subitemCompletions: Array<{ day_entry_id: string; subitem_id: string; is_completed: boolean }>
}> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = toAppDateString(new Date(year, month, 0))

  const { data: entries } = await db()
    .from('day_entries')
    .select('id')
    .gte('date', startDate)
    .lte('date', endDate)

  const entryIds = ((entries ?? []) as { id: string }[]).map(e => e.id)
  if (entryIds.length === 0) return { habitCompletions: [], subitemCompletions: [] }

  const [{ data: hc }, { data: sc }] = await Promise.all([
    db().from('day_habit_completions').select('day_entry_id, habit_id, is_completed').in('day_entry_id', entryIds),
    db().from('day_subitem_completions').select('day_entry_id, subitem_id, is_completed').in('day_entry_id', entryIds),
  ])

  return {
    habitCompletions: (hc ?? []) as Array<{ day_entry_id: string; habit_id: string; is_completed: boolean }>,
    subitemCompletions: (sc ?? []) as Array<{ day_entry_id: string; subitem_id: string; is_completed: boolean }>,
  }
}
