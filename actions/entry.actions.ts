'use server'
// actions/entry.actions.ts
import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/auth/session'
import { getOrCreateDayEntry, updateDayEntry } from '@/lib/db/entries'
import { z } from 'zod'

const updateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mood: z.number().int().min(1).max(5).nullable().optional(),
  energy: z.number().int().min(1).max(5).nullable().optional(),
  sleep_hours: z.number().min(0).max(24).nullable().optional(),
  weight_kg: z.number().min(0).max(500).nullable().optional(),
  screen_time_minutes: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
})

export async function updateDayEntryAction(input: z.infer<typeof updateSchema>) {
  if (!(await verifySession())) return { error: 'Unauthorized' }
  const r = updateSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }

  try {
    const { date, ...updates } = r.data
    const entry = await getOrCreateDayEntry(date)
    await updateDayEntry(entry.id, updates)
    revalidatePath('/today')
    revalidatePath('/')
    revalidatePath('/calendar')
    revalidatePath('/insights')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to update entry' }
  }
}
