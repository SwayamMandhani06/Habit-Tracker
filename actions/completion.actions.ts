'use server'
// actions/completion.actions.ts — Habit completion actions with strict auth & ownership verification
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { toggleHabitCompletion, toggleSubitemCompletion, syncChecklistParent, toggleHabitSkip, setHabitAmount } from '@/lib/db/completions'
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

import { isFutureDate } from '@/lib/date'
import { getServerTimezone } from '@/lib/date.server'

const setAmountSchema = z.object({
  habitId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().finite().min(0).max(1_000_000),
})

export async function setHabitAmountAction(input: z.infer<typeof setAmountSchema>) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  const result = setAmountSchema.safeParse(input)
  if (!result.success) {
    return { error: result.error.errors[0]?.message ?? 'Invalid input' }
  }

  const { date, habitId, amount } = result.data

  const userTz = await getServerTimezone()
  if (isFutureDate(date, new Date(), userTz)) {
    return { error: 'Date must be a valid date and not in the future' }
  }

  // Verify habit ownership and fetch habit target_value
  const { data: habit, error: habitError } = await supabase
    .from('habits')
    .select('id, target_value, type')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (habitError || !habit) {
    return { error: 'Habit not found or unauthorized' }
  }

  try {
    const entry = await getOrCreateDayEntry(date)

    // Check if completion row already exists to preserve frozen target_snapshot
    const { data: existingRow } = await supabase
      .from('day_habit_completions')
      .select('id, target_snapshot')
      .eq('day_entry_id', entry.id)
      .eq('habit_id', habitId)
      .eq('user_id', user.id)
      .maybeSingle()

    // Rule 2: target_snapshot is copied from habit when day's row is first written
    // If existingRow already has a target_snapshot, retain it. Otherwise freeze habit.target_value.
    const targetSnapshot =
      existingRow?.target_snapshot !== undefined && existingRow?.target_snapshot !== null
        ? Number(existingRow.target_snapshot)
        : (habit.target_value != null ? Number(habit.target_value) : null)

    // Rule 1: An amount habit is complete when amount >= target_snapshot
    const isCompleted = targetSnapshot !== null ? amount >= targetSnapshot : false

    await setHabitAmount(entry.id, habitId, amount, targetSnapshot, isCompleted, user.id)

    revalidateCompletionPaths()
    return { success: true, isCompleted, targetSnapshot, amount }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to set habit amount' }
  }
}
