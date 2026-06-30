'use server'
// actions/review.actions.ts
import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/auth/session'
import { createServerClient } from '@/lib/supabase/server'
import { getHabitMonthlyStats } from '@/lib/db/stats'
import type { MonthReview, HabitMonthlyStat, DailyScore } from '@/lib/supabase/types'
import { z } from 'zod'

const upsertSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  lessons_learned: z.string().max(5000).nullable().optional(),
  biggest_achievement: z.string().max(5000).nullable().optional(),
  goals_next_month: z.string().max(5000).nullable().optional(),
  final_reflection: z.string().max(5000).nullable().optional(),
  memorable_moments: z.string().max(5000).nullable().optional(),
})

export async function upsertMonthReviewAction(input: z.infer<typeof upsertSchema>) {
  if (!(await verifySession())) return { error: 'Unauthorized' }
  const r = upsertSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }

  const db = createServerClient()

  try {
    const stats = await getHabitMonthlyStats(r.data.year, r.data.month)
    const bestHabit = stats[0] as HabitMonthlyStat | undefined
    const worstHabit = stats[stats.length - 1] as HabitMonthlyStat | undefined

    const startDate = `${r.data.year}-${String(r.data.month).padStart(2, '0')}-01`
    const endDate = new Date(r.data.year, r.data.month, 0).toLocaleDateString('en-CA')

    const { data: scores } = await db
      .from('daily_scores')
      .select('completion_pct, sleep_hours')
      .gte('date', startDate)
      .lte('date', endDate)

    const scoreRows = (scores ?? []) as unknown as Array<{ completion_pct: number; sleep_hours: number | null }>

    const avgCompletion = scoreRows.length > 0
      ? scoreRows.reduce((s, x) => s + Number(x.completion_pct), 0) / scoreRows.length
      : 0

    const sleepEntries = scoreRows.filter(x => x.sleep_hours != null)
    const avgSleep = sleepEntries.length > 0
      ? sleepEntries.reduce((s, x) => s + Number(x.sleep_hours), 0) / sleepEntries.length
      : null

    const priorMonth = r.data.month === 1 ? 12 : r.data.month - 1
    const priorYear = r.data.month === 1 ? r.data.year - 1 : r.data.year
    const { data: priorReview } = await db
      .from('month_reviews')
      .select('goals_next_month')
      .eq('year', priorYear)
      .eq('month', priorMonth)
      .single()

    const priorReviewRow = priorReview as { goals_next_month: string | null } | null

    const payload = {
      year: r.data.year,
      month: r.data.month,
      overall_completion_pct: avgCompletion,
      best_habit_id: bestHabit?.habit_id ?? null,
      worst_habit_id: worstHabit?.habit_id ?? null,
      avg_sleep_hours: avgSleep,
      goals_this_month: priorReviewRow?.goals_next_month ?? null,
      lessons_learned: r.data.lessons_learned ?? null,
      biggest_achievement: r.data.biggest_achievement ?? null,
      goals_next_month: r.data.goals_next_month ?? null,
      final_reflection: r.data.final_reflection ?? null,
      memorable_moments: r.data.memorable_moments ?? null,
    }

    const { error } = await db
      .from('month_reviews')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(payload as any, { onConflict: 'year,month' })

    if (error) throw error

    revalidatePath('/review')
    revalidatePath('/')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

export async function getMonthReview(year: number, month: number): Promise<MonthReview | null> {
  if (!(await verifySession())) return null
  const db = createServerClient()
  const { data } = await db
    .from('month_reviews')
    .select('*')
    .eq('year', year)
    .eq('month', month)
    .single()
  return (data as unknown as MonthReview) ?? null
}
