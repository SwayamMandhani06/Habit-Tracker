'use server'
// actions/completion.actions.ts
import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/auth/session'
import { toggleHabitCompletion, toggleSubitemCompletion, syncChecklistParent } from '@/lib/db/completions'
import { getOrCreateDayEntry } from '@/lib/db/entries'
import { getHabitSubitems } from '@/lib/db/habits'
import { z } from 'zod'

const toggleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  habitId: z.string().uuid(),
  isCompleted: z.boolean(),
})

const subitemSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  habitId: z.string().uuid(),
  subitemId: z.string().uuid(),
  isCompleted: z.boolean(),
  allSubitemIds: z.array(z.string().uuid()),
  currentSubitemCompletions: z.record(z.string(), z.boolean()),
})

export async function toggleHabitCompletionAction(input: z.infer<typeof toggleSchema>) {
  if (!(await verifySession())) return { error: 'Unauthorized' }

  const result = toggleSchema.safeParse(input)
  if (!result.success) return { error: 'Invalid input' }

  const { date, habitId, isCompleted } = result.data

  try {
    const entry = await getOrCreateDayEntry(date)
    await toggleHabitCompletion(entry.id, habitId, isCompleted)
    revalidatePath('/today')
    revalidatePath('/')
    revalidatePath('/calendar')
    revalidatePath('/grid')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to toggle habit' }
  }
}

export async function toggleSubitemCompletionAction(input: z.infer<typeof subitemSchema>) {
  if (!(await verifySession())) return { error: 'Unauthorized' }

  const result = subitemSchema.safeParse(input)
  if (!result.success) return { error: 'Invalid input' }

  const { date, habitId, subitemId, isCompleted, allSubitemIds, currentSubitemCompletions } = result.data

  try {
    const entry = await getOrCreateDayEntry(date)

    // Toggle subitem
    await toggleSubitemCompletion(entry.id, subitemId, isCompleted)

    // Build updated completions state to sync parent
    const updatedCompletions = { ...currentSubitemCompletions, [subitemId]: isCompleted }
    await syncChecklistParent(entry.id, habitId, allSubitemIds, updatedCompletions)

    revalidatePath('/today')
    revalidatePath('/')
    revalidatePath('/calendar')
    revalidatePath('/grid')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to toggle sub-item' }
  }
}
