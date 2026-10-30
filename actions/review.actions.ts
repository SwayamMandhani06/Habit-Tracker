'use server'
// actions/review.actions.ts — Month review actions with strict auth & ownership verification
import { revalidatePath } from 'next/cache'
import { getSessionContext } from '@/lib/auth/session'
import { getHabitMonthlyStats } from '@/lib/db/stats'
import { getMonthDateRange } from '@/lib/date'
import type { MonthReview, HabitMonthlyStat, Database } from '@/lib/supabase/types'
import { z } from 'zod'

const upsertSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  lessons_learned: z.string().max(5000).nullable().optional(),
  biggest_achievement: z.string().max(5000).nullable().optional(),
  goals_next_month: z.string().max(5000).nullable().optional(),
  final_reflection: z.string().max(5000).nullable().optional(),
  memorable_moments: z.string().max(5000).nullable().optional(),
  what_went_well: z.string().max(5000).nullable().optional(),
  habit_needs_work: z.string().max(5000).nullable().optional(),
  one_thing_to_change: z.string().max(5000).nullable().optional(),
})

export async function upsertMonthReviewAction(input: z.infer<typeof upsertSchema>) {
  const auth = await getSessionContext()
  if (!auth) return { error: 'Not authenticated' }
  const { user, supabase: db } = auth

  const r = upsertSchema.safeParse(input)
  if (!r.success) return { error: 'Invalid input' }

  try {
    const stats = await getHabitMonthlyStats(r.data.year, r.data.month)
    const bestHabit = stats.length > 0 ? (stats[0] as HabitMonthlyStat) : undefined
    const worstHabit = stats.length > 0 ? (stats[stats.length - 1] as HabitMonthlyStat) : undefined

    const { startDate, endDate } = getMonthDateRange(r.data.year, r.data.month)

    // Strictly scope daily_scores query to authenticated user with legacy fallback
    let { data: scores, error: scoresError } = await db
      .from('daily_scores')
      .select('completion_pct, sleep_hours')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)

    if (scoresError && (scoresError.message?.toLowerCase().includes('user_id') || scoresError.code === '42703')) {
      const fallback = await db
        .from('daily_scores')
        .select('completion_pct, sleep_hours')
        .gte('date', startDate)
        .lte('date', endDate)
      scores = fallback.data
    }

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
      .eq('user_id', user.id)
      .eq('year', priorYear)
      .eq('month', priorMonth)
      .maybeSingle()

    const priorReviewRow = priorReview as { goals_next_month: string | null } | null

    const basePayload: Database['public']['Tables']['month_reviews']['Insert'] = {
      user_id: user.id,
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

    // Try with extra fields first
    const fullPayload: Database['public']['Tables']['month_reviews']['Insert'] = {
      ...basePayload,
      what_went_well: r.data.what_went_well ?? null,
      habit_needs_work: r.data.habit_needs_work ?? null,
      one_thing_to_change: r.data.one_thing_to_change ?? null,
    }

    let { error } = await db
      .from('month_reviews')
      .upsert(fullPayload, { onConflict: 'user_id,year,month' })

    // Fallback if migration 006 not yet run in remote Supabase
    if (error && (error.message.includes('what_went_well') || error.message.includes('schema') || error.code === '42703')) {
      const fallbackResult = await db
        .from('month_reviews')
        .upsert(basePayload, { onConflict: 'user_id,year,month' })
      error = fallbackResult.error
    }

    if (error) throw error

    revalidatePath('/review')
    revalidatePath('/dashboard')
    revalidatePath('/insights')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to save review' }
  }
}

export async function getMonthReview(year: number, month: number): Promise<MonthReview | null> {
  const auth = await getSessionContext()
  if (!auth) return null
  const { user, supabase: db } = auth

  const { data } = await db
    .from('month_reviews')
    .select('*')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()
  return (data as unknown as MonthReview) ?? null
}
