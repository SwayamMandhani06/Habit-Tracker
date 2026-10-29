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

// Graceful fallback if 'notes' column does not exist or schema cache not refreshed
function isNotesOrSchemaError(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false
  const msg = (err.message ?? '').toLowerCase()
  return msg.includes('notes') || msg.includes('schema') || err.code === 'PGRST204' || err.code === '42703'
}

export async function createHabit(
  name: string,
  type: 'checkbox' | 'checklist',
  notes?: string | null
): Promise<Habit> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) throw new Error('Not authenticated')

  const trimmedName = name.trim()
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

  const insertPayload: Record<string, any> = {
    name: trimmedName,
    type,
    sort_order: nextOrder,
    is_archived: false,
    user_id: user.id, // Explicit user_id
  }

  // Only include notes column if non-empty notes were provided
  if (notes && notes.trim()) {
    insertPayload.notes = notes.trim()
  }

  let { data, error } = await supabase
    .from('habits')
    .insert(insertPayload as any)
    .select()
    .single()

  if (error && isNotesOrSchemaError(error)) {
    delete insertPayload.notes
    const fallback = await supabase
      .from('habits')
      .insert(insertPayload as any)
      .select()
      .single()
    data = fallback.data
    error = fallback.error
  }

  if (error) throw new Error(`createHabit: ${error.message}`)
  return data as Habit
}

export async function updateHabit(
  id: string,
  updates: { name?: string; type?: 'checkbox' | 'checklist'; notes?: string | null }
): Promise<void> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) throw new Error('Not authenticated')

  const payload: Database['public']['Tables']['habits']['Update'] = {}
  if (updates.name) payload.name = updates.name.trim()
  if (updates.type) payload.type = updates.type
  if ('notes' in updates) payload.notes = updates.notes ?? null

  let { error } = await supabase
    .from('habits')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)

  // Graceful fallback if 'notes' column does not exist or schema cache not refreshed
  if (error && isNotesOrSchemaError(error)) {
    const fallbackPayload = { ...payload }
    delete fallbackPayload.notes
    if (Object.keys(fallbackPayload).length > 0) {
      const fallback = await supabase
        .from('habits')
        .update(fallbackPayload)
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
