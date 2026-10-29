'use server'
// actions/intention.actions.ts — Weekly Intention CRUD with strict auth & ownership verification
import { revalidatePath } from 'next/cache'
import { getSessionContext } from '@/lib/auth/session'
import { z } from 'zod'

const intentionSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  weekNumber: z.number().int().min(1).max(53),
  intention: z.string().max(500),
})

export async function getWeeklyIntentionAction(year: number, weekNumber: number): Promise<string> {
  const auth = await getSessionContext()
  if (!auth) return ''
  const { user, supabase: db } = auth

  try {
    const { data } = await db
      .from('weekly_intentions')
      .select('intention')
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('week_number', weekNumber)
      .maybeSingle()
    return data?.intention ?? ''
  } catch {
    return ''
  }
}

export async function saveWeeklyIntentionAction(input: z.infer<typeof intentionSchema>) {
  const auth = await getSessionContext()
  if (!auth) return { error: 'Not authenticated' }
  const { user, supabase: db } = auth

  const r = intentionSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }

  try {
    const { error } = await db
      .from('weekly_intentions')
      .upsert({
        user_id: user.id,
        year: r.data.year,
        week_number: r.data.weekNumber,
        intention: r.data.intention,
      }, { onConflict: 'user_id,year,week_number' })

    if (error) {
      console.warn('saveWeeklyIntention error:', error.message)
      return { error: error.message }
    }
    revalidatePath('/today')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to save intention' }
  }
}
