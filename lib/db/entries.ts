// lib/db/entries.ts — Day entry CRUD (server-only)
import { createServerClient } from '@/lib/supabase/server'
import type { DayEntry } from '@/lib/supabase/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db() { return createServerClient() as any }

export function todayDate(): string {
  return new Date().toLocaleDateString('en-CA')
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
  const endDate = new Date(year, month, 0).toLocaleDateString('en-CA')
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
