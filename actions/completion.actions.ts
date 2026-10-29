'use server'
// actions/completion.actions.ts — Habit completion actions with strict auth & ownership verification
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { toggleHabitCompletion, toggleSubitemCompletion, syncChecklistParent, toggleHabitSkip } from '@/lib/db/completions'
import { getOrCreateDayEntry } from '@/lib/db/entries'
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
  allSubitemIds: z.array(z.string().uuid()).optional(),
  currentSubitemCompletions: z.record(z.string(), z.boolean()).optional(),
})

const toggleSkipSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  habitId: z.string().uuid(),
  isSkipped: z.boolean(),
})

function revalidateCompletionPaths() {
  revalidatePath('/today')
  revalidatePath('/dashboard')
  revalidatePath('/calendar')
  revalidatePath('/grid')
  revalidatePath('/insights')
  revalidatePath('/review')
}

export async function toggleHabitCompletionAction(input: z.infer<typeof toggleSchema>) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  const result = toggleSchema.safeParse(input)
  if (!result.success) {
    return { error: 'Invalid input' }
  }

  const { date, habitId, isCompleted } = result.data

  // Verify habit ownership
  const { data: habit, error: habitError } = await supabase
    .from('habits')
    .select('id')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (habitError || !habit) {
    return { error: 'Habit not found or unauthorized' }
  }

  try {
    const entry = await getOrCreateDayEntry(date)
    await toggleHabitCompletion(entry.id, habitId, isCompleted)
    revalidateCompletionPaths()
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to toggle habit' }
  }
}

export async function toggleSubitemCompletionAction(input: z.infer<typeof subitemSchema>) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  const result = subitemSchema.safeParse(input)
  if (!result.success) {
    return { error: 'Invalid input' }
  }

  const { date, habitId, subitemId, isCompleted, allSubitemIds, currentSubitemCompletions } = result.data

  // Verify habit ownership
  const { data: habit, error: habitError } = await supabase
    .from('habits')
    .select('id')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (habitError || !habit) {
    return { error: 'Habit not found or unauthorized' }
  }

  // Verify subitem ownership
  const { data: subitem, error: subitemError } = await supabase
    .from('habit_subitems')
    .select('id')
    .eq('id', subitemId)
    .eq('habit_id', habitId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (subitemError || !subitem) {
    return { error: 'Sub-item not found or unauthorized' }
  }

  try {
    const entry = await getOrCreateDayEntry(date)

    // Toggle subitem
    await toggleSubitemCompletion(entry.id, subitemId, isCompleted)

    // Sync parent using database source of truth (prevents race conditions)
    await syncChecklistParent(entry.id, habitId)

    revalidateCompletionPaths()
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to toggle sub-item' }
  }
}

export async function toggleHabitSkipAction(input: z.infer<typeof toggleSkipSchema>) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  const result = toggleSkipSchema.safeParse(input)
  if (!result.success) {
    return { error: 'Invalid input' }
  }

  const { date, habitId, isSkipped } = result.data

  // Verify habit ownership
  const { data: habit, error: habitError } = await supabase
    .from('habits')
    .select('id')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (habitError || !habit) {
    return { error: 'Habit not found or unauthorized' }
  }

  try {
    const entry = await getOrCreateDayEntry(date)
    await toggleHabitSkip(entry.id, habitId, isSkipped)
    revalidateCompletionPaths()
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to toggle skip' }
  }
}
