// lib/db/stats.ts — All stat calculations with strict auth & user scoping (server-only)
import { createServerClient } from '@/lib/supabase/server'
import type { DashboardStats, DailyScore, HabitMonthlyStat } from '@/lib/supabase/types'
import { CURATED_DISCIPLINE_QUOTES } from './quotes'
import { toAppDateString, todayDate, getServerTimezone } from './entries'
import { getMonthDateRange, addDays } from '@/lib/date'

// Helper to detect if 'user_id' column is missing from views (e.g. legacy schema)
function isUserIdError(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false
  const msg = (err.message ?? '').toLowerCase()
  return (
    msg.includes('user_id') ||
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    err.code === '42703' ||
    err.code === 'PGRST204'
  )
}

export async function getDailyScores(limit?: number): Promise<DailyScore[]> {
  const db = await createServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return []

  let query = db
    .from('daily_scores')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
  if (limit) query = query.limit(limit)
  let { data, error } = await query

  // Resilient fallback if view does not expose user_id column yet
  if (error && isUserIdError(error)) {
    let fallbackQuery = db
      .from('daily_scores')
      .select('*')
      .order('date', { ascending: false })
    if (limit) fallbackQuery = fallbackQuery.limit(limit)
    const fallback = await fallbackQuery
    data = fallback.data
    error = fallback.error
  }

  if (error) throw new Error(`getDailyScores: ${error.message}`)
  return (data ?? []) as unknown as DailyScore[]
}

export async function getDailyScoreForDate(date: string): Promise<DailyScore | null> {
  const db = await createServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return null

  let { data, error } = await db
    .from('daily_scores')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .maybeSingle()

  // Resilient fallback if view does not expose user_id column yet
  if (error && isUserIdError(error)) {
    const fallback = await db
      .from('daily_scores')
      .select('*')
      .eq('date', date)
      .maybeSingle()
    data = fallback.data
    error = fallback.error
  }

  if (error && error.code !== 'PGRST116') throw new Error(`getDailyScoreForDate: ${error.message}`)
  return (data as unknown as DailyScore) ?? null
}

export async function getDailyScoresForMonth(year: number, month: number): Promise<DailyScore[]> {
  const db = await createServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return []

  const { startDate, endDate } = getMonthDateRange(year, month)
  let { data, error } = await db
    .from('daily_scores')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  // Resilient fallback if view does not expose user_id column yet
  if (error && isUserIdError(error)) {
    const fallback = await db
      .from('daily_scores')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
    data = fallback.data
    error = fallback.error
  }

  if (error) throw new Error(`getDailyScoresForMonth: ${error.message}`)
  return (data ?? []) as unknown as DailyScore[]
}

function computeStreaks(scores: DailyScore[], todayStrParam?: string): { currentStreak: number; longestStreak: number } {
  const sorted = [...scores].sort((a, b) => b.date.localeCompare(a.date))

  // Perfect day: 100% completion on at least 1 habit, with non-zero effective habits
  const perfectDays = new Set(
    sorted
      .filter(s => Number(s.completion_pct) >= 100 && Number(s.total_active_habits) > 0 && Number(s.completed_habits) > 0)
      .map(s => s.date)
  )

  // Rest day: all active habits were skipped (skipped_habits > 0 and total_active_habits === 0)
  const restDays = new Set(
    sorted
      .filter(s => Number((s as any).skipped_habits ?? 0) > 0 && Number(s.total_active_habits) === 0)
      .map(s => s.date)
  )

  let currentStreak = 0
  let checkDate = todayStrParam ?? toAppDateString(new Date())

  // If today is neither perfect nor a rest day, start checking from yesterday
  if (!perfectDays.has(checkDate) && !restDays.has(checkDate)) {
    checkDate = addDays(checkDate, -1)
  }

  while (true) {
    if (perfectDays.has(checkDate)) {
      currentStreak++
      checkDate = addDays(checkDate, -1)
    } else if (restDays.has(checkDate)) {
      // Skipped/rest day does NOT break current streak; bridge across it
      checkDate = addDays(checkDate, -1)
    } else {
      break
    }
  }

  const allDates = [...new Set(sorted.map(s => s.date))].sort()
  let longestStreak = 0
  let currentRun = 0
  let prevDateStr: string | null = null

  for (const dateStr of allDates) {
    if (restDays.has(dateStr)) {
      // Rest day: if we are in an active streak, bridge across the rest day
      if (prevDateStr && addDays(prevDateStr, 1) === dateStr) {
        prevDateStr = dateStr
      }
      continue
    }

    if (!perfectDays.has(dateStr)) {
      currentRun = 0
      prevDateStr = null
      continue
    }

    if (!prevDateStr) {
      currentRun = 1
    } else {
      const isConsecutive = addDays(prevDateStr, 1) === dateStr
      currentRun = isConsecutive ? currentRun + 1 : 1
    }
    prevDateStr = dateStr
    longestStreak = Math.max(longestStreak, currentRun)
  }

  return { currentStreak, longestStreak }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await createServerClient()
  const { data: { user } } = await db.auth.getUser()
  const today = await todayDate()
  const tz = await getServerTimezone()

  const allScores = await getDailyScores()

  const todayScore = allScores.find(s => s.date === today)
  const todayPct = todayScore ? Number(todayScore.completion_pct) : 0
  const todayCompleted = todayScore ? Number(todayScore.completed_habits) : 0
  let todayTotal = todayScore ? Number(todayScore.total_active_habits) : 0

  if (!todayScore && user) {
    const { count } = await db
      .from('habits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_archived', false)
    todayTotal = count ?? 0
  }

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  const sevenDaysAgoStr = toAppDateString(sevenDaysAgo, tz)
  const weeklyScores = allScores.filter(s => s.date >= sevenDaysAgoStr)
  const weeklyAvgPct = weeklyScores.length > 0
    ? weeklyScores.reduce((sum, s) => sum + Number(s.completion_pct), 0) / weeklyScores.length
    : 0

  const monthStart = `${today.slice(0, 7)}-01`
  const monthlyScores = allScores.filter(s => s.date >= monthStart && s.date <= today)
  const monthlyAvgPct = monthlyScores.length > 0
    ? monthlyScores.reduce((sum, s) => sum + Number(s.completion_pct), 0) / monthlyScores.length
    : 0

  const perfectDaysCount = allScores.filter(s => Number(s.completion_pct) >= 100 && Number(s.total_active_habits) > 0 && Number(s.completed_habits) > 0).length
  const overallCompletionPct = allScores.length > 0
    ? allScores.reduce((sum, s) => sum + Number(s.completion_pct), 0) / allScores.length
    : 0

  const { currentStreak, longestStreak } = computeStreaks(allScores, today)

  // Today's quote (deterministic by date, scoped to user quotes if present)
  let quotesQuery = db
    .from('quotes')
    .select('text')
    .eq('is_active', true)
  if (user) {
    quotesQuery = quotesQuery.eq('user_id', user.id)
  }
  const { data: quotes } = await quotesQuery.order('created_at', { ascending: true })

  let todayQuote: string | null = null
  const quoteRows = (quotes ?? []) as { text: string }[]
  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24))
  if (quoteRows.length > 0) {
    todayQuote = quoteRows[daysSinceEpoch % quoteRows.length].text
  } else {
    todayQuote = CURATED_DISCIPLINE_QUOTES[daysSinceEpoch % CURATED_DISCIPLINE_QUOTES.length]
  }

  // Goals this month from last month's review (strictly scoped to user)
  const now = new Date()
  const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth()
  const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

  let lastReviewRow: { goals_next_month: string | null } | null = null
  if (user) {
    const { data: lastReview } = await db
      .from('month_reviews')
      .select('goals_next_month')
      .eq('user_id', user.id)
      .eq('year', lastMonthYear)
      .eq('month', lastMonth)
      .maybeSingle()
    lastReviewRow = lastReview as { goals_next_month: string | null } | null
  }

  const DAY_INITIALS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weeklySparkline: Array<{ day: string; date: string; pct: number }> = []
  for (let i = 6; i >= 0; i--) {
    const dateStr = addDays(today, -i)
    const [y, m, d] = dateStr.split('-').map(Number)
    const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
    const scoreRow = allScores.find(s => s.date === dateStr)
    weeklySparkline.push({
      day: DAY_INITIALS[dayOfWeek],
      date: dateStr,
      pct: scoreRow ? Math.round(Number(scoreRow.completion_pct)) : 0,
    })
  }

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
    weeklySparkline,
  }
}

export async function getHabitMonthlyStats(year: number, month: number): Promise<HabitMonthlyStat[]> {
  const db = await createServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return []

  let { data, error } = await db
    .from('habit_monthly_stats')
    .select('*')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('month', month)
    .order('consistency_pct', { ascending: false })

  // Resilient fallback if view does not expose user_id column yet
  if (error && isUserIdError(error)) {
    const fallback = await db
      .from('habit_monthly_stats')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .order('consistency_pct', { ascending: false })
    data = fallback.data
    error = fallback.error
  }

  if (error) throw new Error(`getHabitMonthlyStats: ${error.message}`)
  return (data ?? []) as unknown as HabitMonthlyStat[]
}

export async function getAllDailyScoresForCalendar(): Promise<DailyScore[]> {
  return getDailyScores()
}
