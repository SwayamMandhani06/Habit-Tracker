'use server'
// actions/habit.actions.ts — Habit and Subitem CRUD actions with strict auth & ownership verification
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  createHabit, updateHabit, reorderHabits, archiveHabit, unarchiveHabit, deleteHabit,
  addSubitem, updateSubitem, removeSubitem, reorderSubitems
} from '@/lib/db/habits'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().trim().min(1, 'Habit name is required').max(100),
  type: z.enum(['checkbox', 'checklist']),
  notes: z.string().trim().max(500).nullable().optional(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['checkbox', 'checklist']).optional(),
  notes: z.string().max(500).nullable().optional(),
})

const idSchema = z.object({ id: z.string().uuid() })
const reorderSchema = z.object({ orderedIds: z.array(z.string().uuid()) })
const subitemCreateSchema = z.object({ habitId: z.string().uuid(), name: z.string().min(1).max(100) })
const subitemUpdateSchema = z.object({ id: z.string().uuid(), name: z.string().min(1).max(100) })

function revalidateAllHabitPaths() {
  revalidatePath('/settings')
  revalidatePath('/today')
  revalidatePath('/dashboard')
  revalidatePath('/grid')
  revalidatePath('/insights')
  revalidatePath('/review')
}

export async function createHabitAction(input: z.infer<typeof createSchema>) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) return { error: 'Not authenticated' }

  const r = createSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }

  try {
    const habit = await createHabit(r.data.name, r.data.type, r.data.notes)
    revalidateAllHabitPaths()
    return { success: true, habit }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to create habit' }
  }
}

export async function updateHabitAction(input: z.infer<typeof updateSchema>) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) return { error: 'Not authenticated' }

  const r = updateSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }

  // Verify ownership before mutation
  const { data: existing, error: findError } = await supabase
    .from('habits')
    .select('id')
    .eq('id', r.data.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (findError || !existing) {
    return { error: 'Habit not found or unauthorized' }
  }

  try {
    const { id, ...updates } = r.data
    await updateHabit(id, updates)
    revalidateAllHabitPaths()
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to update habit' }
  }
}

export async function reorderHabitsAction(input: z.infer<typeof reorderSchema>) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) return { error: 'Not authenticated' }

  const r = reorderSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }

  if (r.data.orderedIds.length > 0) {
    // Verify all habits belong to the authenticated user
    const { count, error: countError } = await supabase
      .from('habits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('id', r.data.orderedIds)

    if (countError || count !== r.data.orderedIds.length) {
      return { error: 'One or more habits do not belong to you' }
    }
  }

  try {
    await reorderHabits(r.data.orderedIds)
    revalidateAllHabitPaths()
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to reorder habits' }
  }
}

export async function archiveHabitAction(input: z.infer<typeof idSchema>) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) return { error: 'Not authenticated' }

  const r = idSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }

  // Verify ownership
  const { data: existing, error: findError } = await supabase
    .from('habits')
    .select('id')
    .eq('id', r.data.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (findError || !existing) {
    return { error: 'Habit not found or unauthorized' }
  }

  try {
    await archiveHabit(r.data.id)
    revalidateAllHabitPaths()
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to archive habit' }
  }
}

export async function unarchiveHabitAction(input: z.infer<typeof idSchema>) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) return { error: 'Not authenticated' }

  const r = idSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }

  // Verify ownership
  const { data: existing, error: findError } = await supabase
    .from('habits')
    .select('id')
    .eq('id', r.data.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (findError || !existing) {
    return { error: 'Habit not found or unauthorized' }
  }

  try {
    await unarchiveHabit(r.data.id)
    revalidateAllHabitPaths()
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to unarchive habit' }
  }
}

export async function deleteHabitAction(input: z.infer<typeof idSchema>) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) return { error: 'Not authenticated' }

  const r = idSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }

  // Verify ownership
  const { data: existing, error: findError } = await supabase
    .from('habits')
    .select('id')
    .eq('id', r.data.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (findError || !existing) {
    return { error: 'Habit not found or unauthorized' }
  }

  try {
    await deleteHabit(r.data.id)
    revalidateAllHabitPaths()
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to delete habit' }
  }
}

export async function addSubitemAction(input: z.infer<typeof subitemCreateSchema>) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) return { error: 'Not authenticated' }

  const r = subitemCreateSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }

  // Verify parent habit ownership
  const { data: habit, error: habitError } = await supabase
    .from('habits')
    .select('id')
    .eq('id', r.data.habitId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (habitError || !habit) {
    return { error: 'Parent habit not found or unauthorized' }
  }

  try {
    const subitem = await addSubitem(r.data.habitId, r.data.name)
    revalidateAllHabitPaths()
    return { success: true, subitem }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to add sub-item' }
  }
}

export async function updateSubitemAction(input: z.infer<typeof subitemUpdateSchema>) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) return { error: 'Not authenticated' }

  const r = subitemUpdateSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }

  // Verify subitem ownership
  const { data: subitem, error: subitemError } = await supabase
    .from('habit_subitems')
    .select('id')
    .eq('id', r.data.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (subitemError || !subitem) {
    return { error: 'Sub-item not found or unauthorized' }
  }

  try {
    await updateSubitem(r.data.id, r.data.name)
    revalidateAllHabitPaths()
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to update sub-item' }
  }
}

export async function removeSubitemAction(input: z.infer<typeof idSchema>) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) return { error: 'Not authenticated' }

  const r = idSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }

  // Verify subitem ownership
  const { data: subitem, error: subitemError } = await supabase
    .from('habit_subitems')
    .select('id')
    .eq('id', r.data.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (subitemError || !subitem) {
    return { error: 'Sub-item not found or unauthorized' }
  }

  try {
    await removeSubitem(r.data.id)
    revalidateAllHabitPaths()
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to remove sub-item' }
  }
}

export async function reorderSubitemsAction(input: z.infer<typeof reorderSchema>) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) return { error: 'Not authenticated' }

  const r = reorderSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }

  if (r.data.orderedIds.length > 0) {
    // Verify all subitems belong to user
    const { count, error: countError } = await supabase
      .from('habit_subitems')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('id', r.data.orderedIds)

    if (countError || count !== r.data.orderedIds.length) {
      return { error: 'One or more sub-items do not belong to you' }
    }
  }

  try {
    await reorderSubitems(r.data.orderedIds)
    revalidateAllHabitPaths()
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to reorder sub-items' }
  }
}
