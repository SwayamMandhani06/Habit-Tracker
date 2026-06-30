'use server'
// actions/habit.actions.ts
import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/auth/session'
import {
  createHabit, updateHabit, reorderHabits, archiveHabit,
  addSubitem, updateSubitem, removeSubitem, reorderSubitems
} from '@/lib/db/habits'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['checkbox', 'checklist']),
})
const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['checkbox', 'checklist']).optional(),
})
const idSchema = z.object({ id: z.string().uuid() })
const reorderSchema = z.object({ orderedIds: z.array(z.string().uuid()) })
const subitemCreateSchema = z.object({ habitId: z.string().uuid(), name: z.string().min(1).max(100) })
const subitemUpdateSchema = z.object({ id: z.string().uuid(), name: z.string().min(1).max(100) })

function paths() {
  revalidatePath('/settings')
  revalidatePath('/today')
  revalidatePath('/')
  revalidatePath('/grid')
}

export async function createHabitAction(input: z.infer<typeof createSchema>) {
  if (!(await verifySession())) return { error: 'Unauthorized' }
  const r = createSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }
  try {
    const habit = await createHabit(r.data.name, r.data.type)
    paths()
    return { success: true, habit }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

export async function updateHabitAction(input: z.infer<typeof updateSchema>) {
  if (!(await verifySession())) return { error: 'Unauthorized' }
  const r = updateSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }
  try {
    const { id, ...updates } = r.data
    await updateHabit(id, updates)
    paths()
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

export async function reorderHabitsAction(input: z.infer<typeof reorderSchema>) {
  if (!(await verifySession())) return { error: 'Unauthorized' }
  const r = reorderSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }
  try {
    await reorderHabits(r.data.orderedIds)
    revalidatePath('/settings')
    revalidatePath('/today')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

export async function archiveHabitAction(input: z.infer<typeof idSchema>) {
  if (!(await verifySession())) return { error: 'Unauthorized' }
  const r = idSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }
  try {
    await archiveHabit(r.data.id)
    paths()
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

export async function addSubitemAction(input: z.infer<typeof subitemCreateSchema>) {
  if (!(await verifySession())) return { error: 'Unauthorized' }
  const r = subitemCreateSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }
  try {
    const subitem = await addSubitem(r.data.habitId, r.data.name)
    revalidatePath('/settings')
    revalidatePath('/today')
    return { success: true, subitem }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

export async function updateSubitemAction(input: z.infer<typeof subitemUpdateSchema>) {
  if (!(await verifySession())) return { error: 'Unauthorized' }
  const r = subitemUpdateSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }
  try {
    await updateSubitem(r.data.id, r.data.name)
    revalidatePath('/settings')
    revalidatePath('/today')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

export async function removeSubitemAction(input: z.infer<typeof idSchema>) {
  if (!(await verifySession())) return { error: 'Unauthorized' }
  const r = idSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }
  try {
    await removeSubitem(r.data.id)
    revalidatePath('/settings')
    revalidatePath('/today')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

export async function reorderSubitemsAction(input: z.infer<typeof reorderSchema>) {
  if (!(await verifySession())) return { error: 'Unauthorized' }
  const r = reorderSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }
  try {
    await reorderSubitems(r.data.orderedIds)
    revalidatePath('/settings')
    revalidatePath('/today')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}
