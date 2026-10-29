// lib/db/completions.ts — Completion toggling & Habit Skip (server-only)
import { createServerClient, type TypedSupabaseClient } from '@/lib/supabase/server'
import type { DayCompletionState, Database } from '@/lib/supabase/types'
import { getMonthDateRange } from '@/lib/date'

async function db(): Promise<TypedSupabaseClient> { return createServerClient() }

async function getAuthenticatedUserId(client: Awaited<ReturnType<typeof db>>): Promise<string> {
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return user.id
}

type HabitCompRow = { habit_id: string; is_completed: boolean; is_skipped?: boolean }
type SubitemCompRow = { subitem_id: string; is_completed: boolean }

export async function getDayCompletions(dayEntryId: string): Promise<DayCompletionState> {
  const client = await db()
  const userId = await getAuthenticatedUserId(client)
  let habitComps: HabitCompRow[] = []

  const habitRes = await client
    .from('day_habit_completions')
    .select('habit_id, is_completed, is_skipped')
    .eq('day_entry_id', dayEntryId)
    .eq('user_id', userId)

  if (habitRes.error && habitRes.error.message.includes('is_skipped')) {
    const fallback = await client
      .from('day_habit_completions')
      .select('habit_id, is_completed')
      .eq('day_entry_id', dayEntryId)
      .eq('user_id', userId)
    habitComps = (fallback.data ?? []) as HabitCompRow[]
  } else {
    habitComps = (habitRes.data ?? []) as HabitCompRow[]
  }

  const { data: subitemComps } = await client
    .from('day_subitem_completions')
    .select('subitem_id, is_completed')
    .eq('day_entry_id', dayEntryId)
    .eq('user_id', userId)

  const habitCompletions: Record<string, boolean> = {}
  const habitSkips: Record<string, boolean> = {}
  for (const row of habitComps) {
    habitCompletions[row.habit_id] = row.is_completed
    if (row.is_skipped) {
      habitSkips[row.habit_id] = true
    }
  }

  const subitemCompletions: Record<string, boolean> = {}
  for (const row of (subitemComps ?? []) as SubitemCompRow[]) {
    subitemCompletions[row.subitem_id] = row.is_completed
  }

  return { habitCompletions, subitemCompletions, habitSkips }
}

export async function toggleHabitCompletion(dayEntryId: string, habitId: string, isCompleted: boolean): Promise<void> {
  const client = await db()
  const userId = await getAuthenticatedUserId(client)
  const payload: Database['public']['Tables']['day_habit_completions']['Insert'] = {
    day_entry_id: dayEntryId,
    habit_id: habitId,
    is_completed: isCompleted,
    is_skipped: false, // If marked complete, reset skip
    user_id: userId,
  }

  let { error } = await client
    .from('day_habit_completions')
    .upsert(payload, { onConflict: 'day_entry_id,habit_id' })

  if (error && error.message.includes('is_skipped')) {
    const fallback: Database['public']['Tables']['day_habit_completions']['Insert'] = {
      day_entry_id: dayEntryId,
      habit_id: habitId,
      is_completed: isCompleted,
      user_id: userId,
    }
    const res = await client
      .from('day_habit_completions')
      .upsert(fallback, { onConflict: 'day_entry_id,habit_id' })
    error = res.error
  }

  if (error) throw new Error(`toggleHabitCompletion: ${error.message}`)
}

export async function toggleHabitSkip(dayEntryId: string, habitId: string, isSkipped: boolean): Promise<void> {
  const client = await db()
  const userId = await getAuthenticatedUserId(client)
  const payload: Database['public']['Tables']['day_habit_completions']['Insert'] = {
    day_entry_id: dayEntryId,
    habit_id: habitId,
    is_completed: false, // Skipping unchecks habit
    is_skipped: isSkipped,
    user_id: userId,
  }

  const { error } = await client
    .from('day_habit_completions')
    .upsert(payload, { onConflict: 'day_entry_id,habit_id' })

  if (error) {
    throw new Error(`toggleHabitSkip: ${error.message}`)
  }
}

export async function toggleSubitemCompletion(dayEntryId: string, subitemId: string, isCompleted: boolean): Promise<void> {
  const client = await db()
  const userId = await getAuthenticatedUserId(client)
  const { error } = await client
    .from('day_subitem_completions')
    .upsert({ day_entry_id: dayEntryId, subitem_id: subitemId, is_completed: isCompleted, user_id: userId }, { onConflict: 'day_entry_id,subitem_id' })
  if (error) throw new Error(`toggleSubitemCompletion: ${error.message}`)
}

export async function syncChecklistParent(
  dayEntryId: string,
  habitId: string,
  subitemIds?: string[],
  subitemCompletions?: Record<string, boolean>
): Promise<void> {
  const client = await db()
  const userId = await getAuthenticatedUserId(client)

  // Query actual subitems for this habit from the database
  const { data: dbSubitems, error: subError } = await client
    .from('habit_subitems')
    .select('id')
    .eq('habit_id', habitId)
    .eq('user_id', userId)

  if (subError) throw new Error(`syncChecklistParent (subitems query): ${subError.message}`)
  if (!dbSubitems || dbSubitems.length === 0) return

  const targetIds = dbSubitems.map(s => s.id)
  const { data: dbCompletions, error: compError } = await client
    .from('day_subitem_completions')
    .select('subitem_id, is_completed')
    .eq('day_entry_id', dayEntryId)
    .eq('user_id', userId)
    .in('subitem_id', targetIds)

  if (compError) throw new Error(`syncChecklistParent (completions query): ${compError.message}`)

  const completedMap = new Map((dbCompletions ?? []).map(c => [c.subitem_id, c.is_completed]))
  const allComplete = targetIds.length > 0 && targetIds.every(id => completedMap.get(id) === true)

  await toggleHabitCompletion(dayEntryId, habitId, allComplete)
}

export async function getCompletionsForMonth(year: number, month: number): Promise<{
  habitCompletions: Array<{ day_entry_id: string; habit_id: string; is_completed: boolean; is_skipped?: boolean }>
  subitemCompletions: Array<{ day_entry_id: string; subitem_id: string; is_completed: boolean }>
}> {
  const client = await db()
  const userId = await getAuthenticatedUserId(client)
  const { startDate, endDate } = getMonthDateRange(year, month)

  const { data: entries } = await client
    .from('day_entries')
    .select('id')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)

  const entryIds = ((entries ?? []) as { id: string }[]).map(e => e.id)
  if (entryIds.length === 0) return { habitCompletions: [], subitemCompletions: [] }

  let habitComps: Array<{ day_entry_id: string; habit_id: string; is_completed: boolean; is_skipped?: boolean }> = []
  const hcRes = await client
    .from('day_habit_completions')
    .select('day_entry_id, habit_id, is_completed, is_skipped')
    .eq('user_id', userId)
    .in('day_entry_id', entryIds)

  if (hcRes.error && hcRes.error.message.includes('is_skipped')) {
    const fallback = await client
      .from('day_habit_completions')
      .select('day_entry_id, habit_id, is_completed')
      .eq('user_id', userId)
      .in('day_entry_id', entryIds)
    habitComps = (fallback.data ?? [])
  } else {
    habitComps = (hcRes.data ?? [])
  }

  const { data: sc } = await client
    .from('day_subitem_completions')
    .select('day_entry_id, subitem_id, is_completed')
    .eq('user_id', userId)
    .in('day_entry_id', entryIds)

  return {
    habitCompletions: habitComps,
    subitemCompletions: (sc ?? []) as Array<{ day_entry_id: string; subitem_id: string; is_completed: boolean }>,
  }
}

export async function getMultiDayHabitCompletions(dates: string[]): Promise<Record<string, Record<string, boolean>>> {
  const result: Record<string, Record<string, boolean>> = {}
  for (const d of dates) {
    result[d] = {}
  }
  if (dates.length === 0) return result

  const client = await db()
  const userId = await getAuthenticatedUserId(client)

  const { data: entries } = await client
    .from('day_entries')
    .select('id, date')
    .eq('user_id', userId)
    .in('date', dates)

  if (!entries || entries.length === 0) return result

  const entryIdToDate = new Map<string, string>()
  const entryIds: string[] = []
  for (const e of entries) {
    entryIdToDate.set(e.id, e.date)
    entryIds.push(e.id)
  }

  const { data: comps } = await client
    .from('day_habit_completions')
    .select('day_entry_id, habit_id, is_completed')
    .eq('user_id', userId)
    .in('day_entry_id', entryIds)

  for (const c of (comps ?? []) as Array<{ day_entry_id: string; habit_id: string; is_completed: boolean }>) {
    const d = entryIdToDate.get(c.day_entry_id)
    if (d && c.is_completed) {
      if (!result[d]) result[d] = {}
      result[d][c.habit_id] = true
    }
  }

  return result
}


