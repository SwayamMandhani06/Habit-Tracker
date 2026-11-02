'use server'
// actions/habit-note.actions.ts — Server actions for habit day notes with strict auth & ownership validation
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const noteSchema = z.object({
  habitId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().min(1, 'Note cannot be empty').max(500, 'Note cannot exceed 500 characters'),
})

const deleteNoteSchema = z.object({
  habitId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function saveHabitDayNoteAction(input: z.infer<typeof noteSchema>) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  const result = noteSchema.safeParse(input)
  if (!result.success) {
    return { error: result.error.errors[0]?.message ?? 'Invalid note input' }
  }

  const { habitId, date, note } = result.data

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
    const payload = {
      habit_id: habitId,
      date,
      note,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }

    const { error: upsertError } = await supabase
      .from('habit_day_notes')
      .upsert(payload, { onConflict: 'habit_id,date' })

    if (upsertError) {
      // Graceful error if migration has not been run yet
      if (upsertError.message.includes('relation "habit_day_notes" does not exist')) {
        return { error: 'Database table habit_day_notes is not yet migrated in Supabase' }
      }
      return { error: upsertError.message }
    }

    revalidatePath(`/habits/${habitId}`)
    revalidatePath('/today')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to save note' }
  }
}

export async function deleteHabitDayNoteAction(input: z.infer<typeof deleteNoteSchema>) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  const result = deleteNoteSchema.safeParse(input)
  if (!result.success) {
    return { error: 'Invalid input' }
  }

  const { habitId, date } = result.data

  try {
    const { error } = await supabase
      .from('habit_day_notes')
      .delete()
      .eq('habit_id', habitId)
      .eq('date', date)
      .eq('user_id', user.id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath(`/habits/${habitId}`)
    revalidatePath('/today')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete note' }
  }
}

