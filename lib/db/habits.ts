// lib/db/habits.ts — All habit-related DB queries (server-only)
// Note: eslint-disable-next-line @typescript-eslint/no-explicit-any is used throughout
// because Supabase SDK v2's TypeScript types don't correctly infer insert/update
// parameter types when using custom Database type definitions. Return types are
// explicitly annotated on all functions for full safety at the call site.

import { createServerClient } from '@/lib/supabase/server'
import type { Habit, HabitSubitem, HabitWithSubitems } from '@/lib/supabase/types'

// Helper to get a typed but cast-ready query builder
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db() { return createServerClient() as any }

export async function getActiveHabits(): Promise<Habit[]> {
  const { data, error } = await db()
    .from('habits')
    .select('*')
    .eq('is_archived', false)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(`getActiveHabits: ${error.message}`)
  return (data ?? []) as Habit[]
}

export async function getAllHabits(): Promise<Habit[]> {
  const { data, error } = await db()
    .from('habits')
    .select('*')
    .order('is_archived', { ascending: true })
    .order('sort_order', { ascending: true })
  if (error) throw new Error(`getAllHabits: ${error.message}`)
  return (data ?? []) as Habit[]
}

export async function getHabitsWithSubitems(): Promise<HabitWithSubitems[]> {
  const { data: habits, error: hErr } = await db()
    .from('habits')
    .select('*')
    .eq('is_archived', false)
    .order('sort_order', { ascending: true })
  if (hErr) throw new Error(`getHabitsWithSubitems habits: ${hErr.message}`)

  const habitList = (habits ?? []) as Habit[]
  const habitIds = habitList.filter(h => h.type === 'checklist').map(h => h.id)
  let subitems: HabitSubitem[] = []

  if (habitIds.length > 0) {
    const { data, error: sErr } = await db()
      .from('habit_subitems')
      .select('*')
      .in('habit_id', habitIds)
      .order('sort_order', { ascending: true })
    if (sErr) throw new Error(`getHabitsWithSubitems subitems: ${sErr.message}`)
    subitems = (data ?? []) as HabitSubitem[]
  }

  return habitList.map(h => ({
    ...h,
    subitems: subitems.filter(s => s.habit_id === h.id),
  }))
}

export async function getHabitSubitems(habitId: string): Promise<HabitSubitem[]> {
  const { data, error } = await db()
    .from('habit_subitems')
    .select('*')
    .eq('habit_id', habitId)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(`getHabitSubitems: ${error.message}`)
  return (data ?? []) as HabitSubitem[]
}

export async function createHabit(name: string, type: 'checkbox' | 'checklist'): Promise<Habit> {
  const { data: maxData } = await db()
    .from('habits')
    .select('sort_order')
    .eq('is_archived', false)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const maxRow = maxData as { sort_order: number } | null
  const nextOrder = (maxRow?.sort_order ?? 0) + 1

  const { data, error } = await db()
    .from('habits')
    .insert({ name: name.trim(), type, sort_order: nextOrder, is_archived: false })
    .select()
    .single()
  if (error) throw new Error(`createHabit: ${error.message}`)
  return data as Habit
}

export async function updateHabit(id: string, updates: { name?: string; type?: 'checkbox' | 'checklist' }): Promise<void> {
  const payload: Record<string, string> = {}
  if (updates.name) payload.name = updates.name.trim()
  if (updates.type) payload.type = updates.type
  const { error } = await db()
    .from('habits')
    .update(payload)
    .eq('id', id)
  if (error) throw new Error(`updateHabit: ${error.message}`)
}

export async function reorderHabits(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      db().from('habits').update({ sort_order: index + 1 }).eq('id', id)
    )
  )
}

export async function archiveHabit(id: string): Promise<void> {
  const { error } = await db()
    .from('habits')
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`archiveHabit: ${error.message}`)
}

export async function addSubitem(habitId: string, name: string): Promise<HabitSubitem> {
  const { data: maxData } = await db()
    .from('habit_subitems')
    .select('sort_order')
    .eq('habit_id', habitId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const maxRow = maxData as { sort_order: number } | null
  const nextOrder = (maxRow?.sort_order ?? 0) + 1

  const { data, error } = await db()
    .from('habit_subitems')
    .insert({ habit_id: habitId, name: name.trim(), sort_order: nextOrder })
    .select()
    .single()
  if (error) throw new Error(`addSubitem: ${error.message}`)
  return data as HabitSubitem
}

export async function updateSubitem(id: string, name: string): Promise<void> {
  const { error } = await db()
    .from('habit_subitems')
    .update({ name: name.trim() })
    .eq('id', id)
  if (error) throw new Error(`updateSubitem: ${error.message}`)
}

export async function removeSubitem(id: string): Promise<void> {
  const { error } = await db().from('habit_subitems').delete().eq('id', id)
  if (error) throw new Error(`removeSubitem: ${error.message}`)
}

export async function reorderSubitems(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      db().from('habit_subitems').update({ sort_order: index + 1 }).eq('id', id)
    )
  )
}
