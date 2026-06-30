// lib/db/entries.ts — Day entry CRUD (server-only)
import { createServerClient } from '@/lib/supabase/server'
import type { DayEntry } from '@/lib/supabase/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db() { return createServerClient() as any }

/**
 * Returns today's date as YYYY-MM-DD in the app's configured timezone.
 *
 * On Vercel, Node.js always runs in UTC — so `new Date().toLocaleDateString()`
 * returns the UTC date, which is wrong for users east of UTC after midnight.
 *
 * Set APP_TIMEZONE in your Vercel environment variables (e.g. "Asia/Kolkata")
 * to get the correct local date server-side.
 */
export function todayDate(): string {
  const tz = process.env.APP_TIMEZONE ?? 'UTC'
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/**
 * Converts any Date object to YYYY-MM-DD in the app timezone.
 * Use this instead of date.toLocaleDateString('en-CA') everywhere.
 */
export function toAppDateString(date: Date): string {
  const tz = process.env.APP_TIMEZONE ?? 'UTC'
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}


export async function getDayEntry(date: string): Promise<DayEntry | null> {
  const { data, error } = await db()
    .from('day_entries')
    .select('*')
    .eq('date', date)
    .single()
  if (error?.code === 'PGRST116') return null
  if (error) throw new Error(`getDayEntry: ${error.message}`)
  return (data as DayEntry) ?? null
}

export async function getOrCreateDayEntry(date: string): Promise<DayEntry> {
  const existing = await getDayEntry(date)
  if (existing) return existing

  const { data, error } = await db()
    .from('day_entries')
    .insert({ date })
    .select()
    .single()
  if (error) throw new Error(`getOrCreateDayEntry: ${error.message}`)
  return data as DayEntry
}

export async function updateDayEntry(
  id: string,
  updates: Partial<Pick<DayEntry, 'mood' | 'energy' | 'sleep_hours' | 'weight_kg' | 'screen_time_minutes' | 'notes'>>
): Promise<void> {
  const { error } = await db()
    .from('day_entries')
    .update(updates)
    .eq('id', id)
  if (error) throw new Error(`updateDayEntry: ${error.message}`)
}

export async function getDayEntriesForMonth(year: number, month: number): Promise<DayEntry[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = toAppDateString(new Date(year, month, 0))
  const { data, error } = await db()
    .from('day_entries')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
  if (error) throw new Error(`getDayEntriesForMonth: ${error.message}`)
  return (data ?? []) as DayEntry[]
}

export async function getAllDayEntries(): Promise<DayEntry[]> {
  const { data, error } = await db()
    .from('day_entries')
    .select('*')
    .order('date', { ascending: true })
  if (error) throw new Error(`getAllDayEntries: ${error.message}`)
  return (data ?? []) as DayEntry[]
}
