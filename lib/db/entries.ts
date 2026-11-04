// lib/db/entries.ts — Day entry CRUD (server-only)
import { createServerClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/session'
import type { DayEntry } from '@/lib/supabase/types'
import { getTodayInServerTimezone, getServerTimezone } from '@/lib/date.server'
import { formatDateInTz, getMonthDateRange } from '@/lib/date'

export { getServerTimezone }

/**
 * Returns today's date as YYYY-MM-DD in the user's detected client/server timezone.
 */
export async function todayDate(): Promise<string> {
  return getTodayInServerTimezone()
}

/**
 * Converts any Date object to YYYY-MM-DD in the specified timezone (or UTC).
 */
export function toAppDateString(date: Date, timezone?: string): string {
  return formatDateInTz(date, timezone ?? 'UTC')
}

export async function getDayEntry(date: string, userId?: string): Promise<DayEntry | null> {
  const user = await getSessionUser()
  if (!user) return null

  if (userId && userId !== user.id) {
    throw new Error('Forbidden: Cannot access day entry for another user')
  }

  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('day_entries')
    .select('*')
    .eq('date', date)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`getDayEntry: ${error.message}`)
  }
  return (data as unknown as DayEntry) ?? null
}

export async function getOrCreateDayEntry(
  date: string
): Promise<DayEntry> {
  const user = await getSessionUser()
  if (!user) throw new Error('Not authenticated')

  const supabase = await createServerClient()

  // 1. Check for existing row
  const { data: existing } = await supabase
    .from('day_entries')
    .select('*')
    .eq('date', date)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) return existing as DayEntry

  // 2. Insert with ignoreDuplicates: true (ON CONFLICT DO NOTHING — does not fire update_updated_at trigger on existing)
  await supabase
    .from('day_entries')
    .upsert({ date, user_id: user.id }, { onConflict: 'user_id,date', ignoreDuplicates: true })

  // 3. Select the created or concurrently inserted row
  const { data: created, error } = await supabase
    .from('day_entries')
    .select('*')
    .eq('date', date)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !created) {
    throw new Error(`getOrCreateDayEntry: ${error?.message || 'Failed to select day entry'}`)
  }

  return created as DayEntry
}

export async function updateDayEntry(
  id: string,
  updates: Partial<Pick<DayEntry, 'mood' | 'energy' | 'sleep_hours' | 'weight_kg' | 'screen_time_minutes' | 'notes'>>
): Promise<void> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('day_entries')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(`updateDayEntry: ${error.message}`)
}

export async function getDayEntriesForMonth(year: number, month: number): Promise<DayEntry[]> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { startDate, endDate } = getMonthDateRange(year, month)
  const { data, error } = await supabase
    .from('day_entries')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) throw new Error(`getDayEntriesForMonth: ${error.message}`)
  return (data ?? []) as DayEntry[]
}

export async function getAllDayEntries(): Promise<DayEntry[]> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('day_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: true })

  if (error) throw new Error(`getAllDayEntries: ${error.message}`)
  return (data ?? []) as DayEntry[]
}
