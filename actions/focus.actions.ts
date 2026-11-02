'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { getOrCreateDayEntry } from '@/lib/db/entries'
import { setHabitAmount } from '@/lib/db/completions'

const logSessionSchema = z.object({
  id: z.string().uuid(),
  habitId: z.string().uuid().nullable().optional(),
  startedAt: z.string().datetime({ offset: true }),
  endedAt: z.string().datetime({ offset: true }),
  plannedSeconds: z.number().int().positive().nullable().optional(),
  mode: z.enum(['countdown', 'pomodoro']),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function logFocusSessionAction(input: z.infer<typeof logSessionSchema>) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  const parsed = logSessionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid session payload' }
  }

  const { id, habitId, startedAt, endedAt, plannedSeconds, mode, localDate } = parsed.data

  const startedMs = new Date(startedAt).getTime()
  const endedMs = new Date(endedAt).getTime()
  const durationSeconds = Math.round((endedMs - startedMs) / 1000)

  // Rule 7: Ignore sessions under 60 seconds
  if (durationSeconds < 60) {
    return { error: 'Session was under 60 seconds and was not logged.' }
  }

  try {
    // Attempt canonical Postgres transaction function
    const { error: rpcError } = await (supabase as any).rpc('log_focus_session', {
      p_id: id,
      p_habit_id: habitId ?? null,
      p_started: startedAt,
      p_ended: endedAt,
      p_planned: plannedSeconds ?? null,
      p_mode: mode,
      p_local_date: localDate,
    })

    if (rpcError) {
      // If RPC is missing because migration 012 is pending, run fallback
      if (rpcError.message.includes('function') && rpcError.message.includes('does not exist')) {
        return await fallbackLogFocusSession(user.id, parsed.data, durationSeconds)
      }
      return { error: `Failed to log session: ${rpcError.message}` }
    }

    revalidateAllFocusPaths()
    return { success: true, sessionId: id }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error logging session' }
  }
}

/**
 * Fallback logger if migration 012 RPC has not yet been executed by user.
 */
async function fallbackLogFocusSession(
  userId: string,
  data: z.infer<typeof logSessionSchema>,
  durationSeconds: number
) {
  const supabase = await createServerClient()
  let amountToApply = 0

  if (data.habitId) {
    const { data: habit } = await supabase
      .from('habits')
      .select('id, type, unit, target_value')
      .eq('id', data.habitId)
      .eq('user_id', userId)
      .maybeSingle()

    if (habit && habit.type === 'amount' && habit.unit) {
      const normalizedUnit = habit.unit.toLowerCase().trim()
      if (['hours', 'hour', 'hr', 'hrs', 'h'].includes(normalizedUnit)) {
        amountToApply = Number((durationSeconds / 3600).toFixed(2))
      } else {
        amountToApply = Number((durationSeconds / 60).toFixed(1))
      }

      // Upsert day_entry and completion
      const entry = await getOrCreateDayEntry(data.localDate)
      const { data: existingComp } = await supabase
        .from('day_habit_completions')
        .select('id, amount, target_snapshot')
        .eq('day_entry_id', entry.id)
        .eq('habit_id', habit.id)
        .eq('user_id', userId)
        .maybeSingle()

      const targetSnapshot =
        existingComp?.target_snapshot !== null && existingComp?.target_snapshot !== undefined
          ? Number(existingComp.target_snapshot)
          : (habit.target_value !== null ? Number(habit.target_value) : null)

      const currentAmount = existingComp?.amount ? Number(existingComp.amount) : 0
      const newAmount = currentAmount + amountToApply
      const isCompleted = targetSnapshot !== null ? newAmount >= targetSnapshot : false

      await setHabitAmount(entry.id, habit.id, newAmount, targetSnapshot, isCompleted, userId)
    }
  }

  // Insert session record
  try {
    await (supabase.from('focus_sessions') as any).insert({
      id: data.id,
      user_id: userId,
      habit_id: data.habitId ?? null,
      started_at: data.startedAt,
      ended_at: data.endedAt,
      duration_seconds: durationSeconds,
      planned_seconds: data.plannedSeconds ?? null,
      mode: data.mode,
      local_date: data.localDate,
      habit_minutes_applied: amountToApply,
    })
  } catch {
    // If table does not exist, amount was still logged
  }

  revalidateAllFocusPaths()
  return { success: true, sessionId: data.id }
}

const deleteSessionSchema = z.object({
  id: z.string().uuid(),
})

export async function deleteFocusSessionAction(input: z.infer<typeof deleteSessionSchema>) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  const parsed = deleteSessionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid session ID' }
  }

  try {
    const { error: rpcError } = await (supabase as any).rpc('delete_focus_session', {
      p_id: parsed.data.id,
    })

    if (rpcError) {
      if (rpcError.message.includes('function') && rpcError.message.includes('does not exist')) {
        // Fallback delete
        await (supabase.from('focus_sessions') as any)
          .delete()
          .eq('id', parsed.data.id)
          .eq('user_id', user.id)
      } else {
        return { error: `Failed to delete session: ${rpcError.message}` }
      }
    }

    revalidateAllFocusPaths()
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete session' }
  }
}

function revalidateAllFocusPaths() {
  revalidatePath('/focus')
  revalidatePath('/today')
  revalidatePath('/dashboard')
  revalidatePath('/grid')
  revalidatePath('/insights')
}

