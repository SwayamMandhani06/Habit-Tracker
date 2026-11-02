// lib/db/habits.ts — All habit-related DB queries (server-only)
import { createServerClient } from '@/lib/supabase/server'
import type { Habit, HabitSubitem, HabitWithSubitems, Database } from '@/lib/supabase/types'

export async function getActiveHabits(): Promise<Habit[]> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return []

  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`getActiveHabits: ${error.message}`)
  return (data ?? []) as Habit[]
}

export async function getAllHabits(): Promise<Habit[]> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return []

  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id)
    .order('is_archived', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`getAllHabits: ${error.message}`)
  return (data ?? []) as Habit[]
}

export async function getHabitsWithSubitems(): Promise<HabitWithSubitems[]> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return []

  const { data: habits, error: hErr } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('sort_order', { ascending: true })

  if (hErr) throw new Error(`getHabitsWithSubitems habits: ${hErr.message}`)

  let habitList = (habits ?? []) as Habit[]

  const habitIds = habitList.filter(h => h.type === 'checklist').map(h => h.id)
  let subitems: HabitSubitem[] = []

  if (habitIds.length > 0) {
    const { data, error: sErr } = await supabase
      .from('habit_subitems')
      .select('*')
      .eq('user_id', user.id)
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
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return []

  const { data, error } = await supabase
    .from('habit_subitems')
    .select('*')
    .eq('user_id', user.id)
    .eq('habit_id', habitId)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`getHabitSubitems: ${error.message}`)
  return (data ?? []) as HabitSubitem[]
}

// Graceful fallback if 'notes' or new amount/styling columns do not exist or schema cache not refreshed
function isNotesOrSchemaError(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false
  const msg = (err.message ?? '').toLowerCase()
  return (
    msg.includes('notes') ||
    msg.includes('target_value') ||
    msg.includes('unit') ||
    msg.includes('step_value') ||
    msg.includes('color') ||
    msg.includes('icon') ||
    msg.includes('schema') ||
    err.code === 'PGRST204' ||
    err.code === '42703'
  )
}

export type CreateHabitInput = {
  name: string
  type: 'checkbox' | 'checklist' | 'amount'
  notes?: string | null
  target_value?: number | null
  unit?: string | null
  step_value?: number
  color?: string
  icon?: string
}

export async function createHabit(
  nameOrOptions: string | CreateHabitInput,
  maybeType?: 'checkbox' | 'checklist' | 'amount',
  maybeNotes?: string | null
): Promise<Habit> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) throw new Error('Not authenticated')

  const options: CreateHabitInput =
    typeof nameOrOptions === 'string'
      ? {
          name: nameOrOptions,
          type: maybeType ?? 'checkbox',
          notes: maybeNotes,
        }
      : nameOrOptions

  const trimmedName = options.name.trim()
  if (!trimmedName) throw new Error('Habit name cannot be empty')
  if (trimmedName.length > 100) throw new Error('Habit name cannot exceed 100 characters')

  // Find current max sort_order across all habits (including archived) deterministically
  const { data: maxData } = await supabase
    .from('habits')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const maxRow = maxData as { sort_order: number } | null
  const nextOrder = (maxRow?.sort_order ?? 0) + 1

  const fullPayload: Record<string, any> = {
    name: trimmedName,
    type: options.type,
    sort_order: nextOrder,
    is_archived: false,
    user_id: user.id, // Explicit user_id
  }

  if (options.notes && options.notes.trim()) fullPayload.notes = options.notes.trim()
  if (options.target_value !== undefined && options.target_value !== null) fullPayload.target_value = options.target_value
  if (options.unit !== undefined && options.unit !== null) fullPayload.unit = options.unit.trim()
  if (options.step_value !== undefined && options.step_value !== null) fullPayload.step_value = options.step_value
  if (options.color) fullPayload.color = options.color
  if (options.icon) fullPayload.icon = options.icon

  // 1. Try inserting full payload
  let { data, error } = await supabase
    .from('habits')
    .insert(fullPayload as any)
    .select()
    .single()

  if (!error && data) {
    return data as Habit
  }

  // 2. Fallback if new columns do not exist yet in DB schema
  if (error && isNotesOrSchemaError(error)) {
    const basePayload: Record<string, any> = {
      name: trimmedName,
      type: options.type === 'amount' ? 'checkbox' : options.type,
      sort_order: nextOrder,
      is_archived: false,
      user_id: user.id,
    }

    const fallback = await supabase
      .from('habits')
      .insert(basePayload as any)
      .select('id, name, type, sort_order, is_archived, user_id, created_at, updated_at')
      .single()

    data = fallback.data as any
    error = fallback.error
  }

  if (error) throw new Error(`createHabit: ${error.message}`)
  return data as Habit
}

export type UpdateHabitInput = {
  name?: string
  type?: 'checkbox' | 'checklist' | 'amount'
  notes?: string | null
  target_value?: number | null
  unit?: string | null
  step_value?: number
  color?: string
  icon?: string
}

export async function updateHabit(
  id: string,
  updates: UpdateHabitInput
): Promise<void> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) throw new Error('Not authenticated')

  const payload: Record<string, any> = {}
  if (updates.name) payload.name = updates.name.trim()
  if (updates.type) payload.type = updates.type
  if ('notes' in updates) payload.notes = updates.notes ?? null
  if ('target_value' in updates) payload.target_value = updates.target_value ?? null
  if ('unit' in updates) payload.unit = updates.unit ? updates.unit.trim() : null
  if ('step_value' in updates && updates.step_value) payload.step_value = updates.step_value
  if ('color' in updates && updates.color) payload.color = updates.color
  if ('icon' in updates && updates.icon) payload.icon = updates.icon

  let { error } = await supabase
    .from('habits')
    .update(payload as any)
    .eq('id', id)
    .eq('user_id', user.id)

  // Graceful fallback if new columns do not exist yet in DB schema
  if (error && isNotesOrSchemaError(error)) {
    const fallbackPayload: Record<string, any> = {}
    if (updates.name) fallbackPayload.name = updates.name.trim()
    if (updates.type && updates.type !== 'amount') fallbackPayload.type = updates.type

    if (Object.keys(fallbackPayload).length > 0) {
      const fallback = await supabase
        .from('habits')
        .update(fallbackPayload as any)
        .eq('id', id)
        .eq('user_id', user.id)
      error = fallback.error
    } else {
      error = null
    }
  }

  if (error) throw new Error(`updateHabit: ${error.message}`)
}

export async function reorderHabits(orderedIds: string[]): Promise<void> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) throw new Error('Not authenticated')

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('habits')
        .update({ sort_order: index + 1 })
        .eq('id', id)
        .eq('user_id', user.id)
    )
  )
}

export async function archiveHabit(id: string): Promise<void> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('habits')
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(`archiveHabit: ${error.message}`)
}

export async function unarchiveHabit(id: string): Promise<void> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('habits')
    .update({ is_archived: false, archived_at: null })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(`unarchiveHabit: ${error.message}`)
}

export async function deleteHabit(id: string): Promise<void> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) throw new Error('Not authenticated')

  // 1. Clear foreign key references in month_reviews to avoid FK violation
  await supabase
    .from('month_reviews')
    .update({ best_habit_id: null })
    .eq('user_id', user.id)
    .eq('best_habit_id', id)

  await supabase
    .from('month_reviews')
    .update({ worst_habit_id: null })
    .eq('user_id', user.id)
    .eq('worst_habit_id', id)

  // 2. Delete completions for this habit
  await supabase
    .from('day_habit_completions')
    .delete()
    .eq('habit_id', id)
    .eq('user_id', user.id)

  // 3. Delete subitem completions if any
  const { data: subitems } = await supabase
    .from('habit_subitems')
    .select('id')
    .eq('habit_id', id)
    .eq('user_id', user.id)

  const subitemIds = ((subitems ?? []) as { id: string }[]).map(s => s.id)
  if (subitemIds.length > 0) {
    await supabase
      .from('day_subitem_completions')
      .delete()
      .in('subitem_id', subitemIds)
      .eq('user_id', user.id)
  }

  // 4. Delete subitems
  await supabase
    .from('habit_subitems')
    .delete()
    .eq('habit_id', id)
    .eq('user_id', user.id)

  // 5. Delete the habit itself
  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(`deleteHabit: ${error.message}`)
}

export async function addSubitem(habitId: string, name: string): Promise<HabitSubitem> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) throw new Error('Not authenticated')

  const { data: maxData } = await supabase
    .from('habit_subitems')
    .select('sort_order')
    .eq('user_id', user.id)
    .eq('habit_id', habitId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const maxRow = maxData as { sort_order: number } | null
  const nextOrder = (maxRow?.sort_order ?? 0) + 1

  const { data, error } = await supabase
    .from('habit_subitems')
    .insert({
      habit_id: habitId,
      name: name.trim(),
      sort_order: nextOrder,
      user_id: user.id, // Explicit user_id
    })
    .select()
    .single()

  if (error) throw new Error(`addSubitem: ${error.message}`)
  return data as HabitSubitem
}

export async function updateSubitem(id: string, name: string): Promise<void> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('habit_subitems')
    .update({ name: name.trim() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(`updateSubitem: ${error.message}`)
}

export async function removeSubitem(id: string): Promise<void> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('habit_subitems')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(`removeSubitem: ${error.message}`)
}

export async function reorderSubitems(orderedIds: string[]): Promise<void> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) throw new Error('Not authenticated')

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('habit_subitems')
        .update({ sort_order: index + 1 })
        .eq('id', id)
        .eq('user_id', user.id)
    )
  )
}
