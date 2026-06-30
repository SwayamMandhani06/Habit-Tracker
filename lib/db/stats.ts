// lib/db/stats.ts — All stat calculations (server-only)
import { createServerClient } from '@/lib/supabase/server'
import type { DashboardStats, DailyScore, HabitMonthlyStat } from '@/lib/supabase/types'
import { toAppDateString } from './entries'

export async function getDailyScores(limit?: number): Promise<DailyScore[]> {
  const db = createServerClient()
  let query = db
    .from('daily_scores')
    .select('*')
    .order('date', { ascending: false })
  if (limit) query = query.limit(limit)
  const { data, error } = await query
  if (error) throw new Error(`getDailyScores: ${error.message}`)
  return (data ?? []) as unknown as DailyScore[]
}

export async function getDailyScoreForDate(date: string): Promise<DailyScore | null> {
  const db = createServerClient()
  const { data, error } = await db
    .from('daily_scores')
    .select('*')
    .eq('date', date)
    .single()
  if (error?.code === 'PGRST116') return null
  if (error) throw new Error(`getDailyScoreForDate: ${error.message}`)
  return (data as unknown as DailyScore) ?? null
}

export async function getDailyScoresForMonth(year: number, month: number): Promise<DailyScore[]> {
  const db = createServerClient()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = toAppDateString(new Date(year, month, 0))
  const { data, error } = await db
    .from('daily_scores')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
  if (error) throw new Error(`getDailyScoresForMonth: ${error.message}`)
  return (data ?? []) as unknown as DailyScore[]
}

function computeStreaks(scores: DailyScore[]): { currentStreak: number; longestStreak: number } {
  const sorted = [...scores].sort((a, b) => b.date.localeCompare(a.date))
  const perfectDays = new Set(sorted.filter(s => Number(s.completion_pct) >= 100).map(s => s.date))

  let currentStreak = 0
  const today = new Date()
  const checkDate = new Date(today)
  const todayStr = toAppDateString(today)
  if (!perfectDays.has(todayStr)) checkDate.setDate(checkDate.getDate() - 1)

  while (true) {
    const dateStr = toAppDateString(checkDate)
    if (perfectDays.has(dateStr)) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else break
  }

  const allDates = sorted.map(s => s.date).sort()
  let longestStreak = 0
  let currentRun = 0
  let prevDate: Date | null = null

  for (const dateStr of allDates) {
    if (!perfectDays.has(dateStr)) { currentRun = 0; prevDate = null; continue }
    const date = new Date(dateStr + 'T00:00:00')
    if (!prevDate) {
      currentRun = 1
    } else {
      const diff = Math.round((date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
      currentRun = diff === 1 ? currentRun + 1 : 1
    }
    prevDate = date
    longestStreak = Math.max(longestStreak, currentRun)
  }

  return { currentStreak, longestStreak }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = createServerClient()
  const today = new Date().toLocaleDateString('en-CA')

  const allScores = await getDailyScores()

  const todayScore = allScores.find(s => s.date === today)
  const todayPct = todayScore ? Number(todayScore.completion_pct) : 0
  const todayCompleted = todayScore ? Number(todayScore.completed_habits) : 0
  const todayTotal = todayScore ? Number(todayScore.total_active_habits) : 0

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  const sevenDaysAgoStr = toAppDateString(sevenDaysAgo)
  const weeklyScores = allScores.filter(s => s.date >= sevenDaysAgoStr)
  const weeklyAvgPct = weeklyScores.length > 0
    ? weeklyScores.reduce((sum, s) => sum + Number(s.completion_pct), 0) / weeklyScores.length
    : 0

  const monthStart = `${today.slice(0, 7)}-01`
  const monthlyScores = allScores.filter(s => s.date >= monthStart && s.date <= today)
  const monthlyAvgPct = monthlyScores.length > 0
    ? monthlyScores.reduce((sum, s) => sum + Number(s.completion_pct), 0) / monthlyScores.length
    : 0

  const perfectDaysCount = allScores.filter(s => Number(s.completion_pct) >= 100).length
  const overallCompletionPct = allScores.length > 0
    ? allScores.reduce((sum, s) => sum + Number(s.completion_pct), 0) / allScores.length
    : 0

  const { currentStreak, longestStreak } = computeStreaks(allScores)

  // Today's quote (deterministic by date)
  const { data: quotes } = await db
    .from('quotes')
    .select('text')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  let todayQuote: string | null = null
  const quoteRows = (quotes ?? []) as { text: string }[]
  if (quoteRows.length > 0) {
    const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24))
    todayQuote = quoteRows[daysSinceEpoch % quoteRows.length].text
  }

  // Goals this month from last month's review
  const now = new Date()
  const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth()
  const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const { data: lastReview } = await db
    .from('month_reviews')
    .select('goals_next_month')
    .eq('year', lastMonthYear)
    .eq('month', lastMonth)
    .single()

  const lastReviewRow = lastReview as { goals_next_month: string | null } | null

  return {
    todayScore: todayCompleted,
    todayTotal,
    todayPct,
    weeklyAvgPct,
    monthlyAvgPct,
    currentStreak,
    longestStreak,
    perfectDaysCount,
    overallCompletionPct,
    todayQuote,
    goalsThisMonth: lastReviewRow?.goals_next_month ?? null,
  }
}

export async function getHabitMonthlyStats(year: number, month: number): Promise<HabitMonthlyStat[]> {
  const db = createServerClient()
  const { data, error } = await db
    .from('habit_monthly_stats')
    .select('*')
    .eq('year', year)
    .eq('month', month)
    .order('consistency_pct', { ascending: false })
  if (error) throw new Error(`getHabitMonthlyStats: ${error.message}`)
  return (data ?? []) as unknown as HabitMonthlyStat[]
}

export async function getAllDailyScoresForCalendar(): Promise<DailyScore[]> {
  return getDailyScores()
}
