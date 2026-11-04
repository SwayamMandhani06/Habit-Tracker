// lib/db/stats.ts — All stat calculations using raw bounded queries & pure lib/scoring (server-only)
// ZERO database views used (no daily_scores, no habit_monthly_stats).
import { createServerClient } from '@/lib/supabase/server'
import type { DashboardStats, DailyScore, HabitMonthlyStat, Habit, HabitSubitem } from '@/lib/supabase/types'
import { CURATED_DISCIPLINE_QUOTES } from './quotes'
import { todayDate, getServerTimezone } from './entries'
import { getMonthDateRange, addDays } from '@/lib/date'
import {
  computeDailyScore,
  computeStreaks,
  computePeriodAverages,
  computeHabitRates,
  type DayScoreResult,
  type ScoringHabit,
  type ScoringSubitem,
  type ScoringCompletion,
} from '@/lib/scoring'
import { timeStep } from '@/lib/timing'

export { getServerTimezone }

/**
 * Returns raw bounded rows for the user and computes daily scores via lib/scoring.
 * Bounded to the last 400 calendar days for streak calculation and current month.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await createServerClient()
  const { data: { user } } = await timeStep('/dashboard', 'query_user', () => db.auth.getUser())
  const today = await timeStep('/dashboard', 'query_today_date', () => todayDate())
  const tz = await timeStep('/dashboard', 'query_timezone', () => getServerTimezone())

  if (!user) {
    return {
      todayScore: 0,
      todayTotal: 0,
      todayPct: 0,
      weeklyAvgPct: 0,
      monthlyAvgPct: 0,
      currentStreak: 0,
      longestStreak: 0,
      perfectDaysCount: 0,
      overallCompletionPct: 0,
      todayQuote: CURATED_DISCIPLINE_QUOTES[0],
      goalsThisMonth: null,
      weeklySparkline: [],
    }
  }

  const fourHundredDaysAgo = addDays(today, -400)

  // 1. Fetch raw bounded tables concurrently in one network batch
  const [habitsRes, subitemsRes, entriesRes, quotesRes] = await Promise.all([
    timeStep('/dashboard', 'query_habits', () =>
      db
        .from('habits')
        .select('id, name, type, sort_order, is_archived, archived_at, created_at, target_value, unit, step_value, color, icon')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })
    ),
    timeStep('/dashboard', 'query_subitems', () =>
      db
        .from('habit_subitems')
        .select('id, habit_id, name, sort_order, created_at')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })
    ),
    timeStep('/dashboard', 'query_entries_400d', () =>
      db
        .from('day_entries')
        .select('id, date')
        .eq('user_id', user.id)
        .gte('date', fourHundredDaysAgo)
        .lte('date', today)
        .order('date', { ascending: true })
    ),
    timeStep('/dashboard', 'query_quotes', () =>
      db
        .from('quotes')
        .select('text')
        .eq('user_id', user.id)
        .eq('is_active', true)
    ),
  ])

  const habits = (habitsRes.data ?? []) as ScoringHabit[]
  const subitems = (subitemsRes.data ?? []) as ScoringSubitem[]
  const entries = entriesRes.data ?? []

  // 2. Fetch completions for the bounded day_entries
  let habitCompletions: ScoringCompletion[] = []
  let subitemCompletions: Array<{ day_entry_id: string; subitem_id: string; is_completed: boolean }> = []

  if (entries.length > 0) {
    const entryIds = entries.map((e) => e.id)
    const [hCompRes, sCompRes] = await Promise.all([
      timeStep('/dashboard', 'query_habit_completions', () =>
        db
          .from('day_habit_completions')
          .select('day_entry_id, habit_id, is_completed, is_skipped, amount, target_snapshot')
          .eq('user_id', user.id)
          .in('day_entry_id', entryIds)
      ),
      timeStep('/dashboard', 'query_subitem_completions', () =>
        db
          .from('day_subitem_completions')
          .select('day_entry_id, subitem_id, is_completed')
          .eq('user_id', user.id)
          .in('day_entry_id', entryIds)
      ),
    ])
    habitCompletions = (hCompRes.data ?? []) as any[]
    subitemCompletions = (sCompRes.data ?? []) as any[]
  }

  // 3. Organize completions by date
  const entryDateById = new Map<string, string>()
  for (const e of entries) {
    entryDateById.set(e.id, e.date)
  }

  const completionsByDate = new Map<string, Map<string, ScoringCompletion>>()
  for (const hc of habitCompletions) {
    const d = entryDateById.get((hc as any).day_entry_id)
    if (!d) continue
    let dayMap = completionsByDate.get(d)
    if (!dayMap) {
      dayMap = new Map()
      completionsByDate.set(d, dayMap)
    }
    dayMap.set(hc.habit_id, hc)
  }

  const subitemCompletionsByDate = new Map<string, Map<string, boolean>>()
  for (const sc of subitemCompletions) {
    const d = entryDateById.get(sc.day_entry_id)
    if (!d) continue
    let daySubMap = subitemCompletionsByDate.get(d)
    if (!daySubMap) {
      daySubMap = new Map()
      subitemCompletionsByDate.set(d, daySubMap)
    }
    daySubMap.set(sc.subitem_id, Boolean(sc.is_completed))
  }

  // 4. Compute DailyScore for every date in the bounded entries
  const dayScoresMap = new Map<string, DayScoreResult>()
  const dayResultsList: DayScoreResult[] = []

  for (const e of entries) {
    const comps = completionsByDate.get(e.date) ?? new Map()
    const subComps = subitemCompletionsByDate.get(e.date) ?? new Map()
    const score = computeDailyScore({
      date: e.date,
      habits,
      completionsMap: comps,
      subitems,
      subitemCompletionsMap: subComps,
      timezone: tz,
    })
    dayScoresMap.set(e.date, score)
    dayResultsList.push(score)
  }

  // Ensure today is computed even if no day_entries row exists yet (reads never write!)
  let todayScore = dayScoresMap.get(today)
  if (!todayScore) {
    todayScore = computeDailyScore({
      date: today,
      habits,
      timezone: tz,
    })
    dayScoresMap.set(today, todayScore)
    dayResultsList.push(todayScore)
  }

  // 5. Streaks (canonical backward walk from today or yesterday)
  const { currentStreak, longestStreak } = computeStreaks(dayResultsList, today)

  // 6. Period Averages over CALENDAR days (missing entries count as 0%)
  const sevenDaysAgo = addDays(today, -6)
  const weekAvgResult = computePeriodAverages({
    startDate: sevenDaysAgo,
    endDate: today,
    today,
    habits,
    dayScoresMap,
    timezone: tz,
  })

  const monthStart = `${today.slice(0, 7)}-01`
  const monthAvgResult = computePeriodAverages({
    startDate: monthStart,
    endDate: today,
    today,
    habits,
    dayScoresMap,
    timezone: tz,
  })

  // 7. Perfect days count and overall stats
  const perfectDaysCount = dayResultsList.filter((d) => d.isPerfect).length

  // Overall average across all active recorded days
  const nonNeutralDays = dayResultsList.filter((d) => !d.isNeutral)
  const overallCompletionPct =
    nonNeutralDays.length > 0
      ? Math.round(nonNeutralDays.reduce((sum, d) => sum + d.completionPct, 0) / nonNeutralDays.length)
      : 0

  // 8. Weekly 7-day sparkline
  const DAY_INITIALS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weeklySparkline: Array<{ day: string; date: string; pct: number }> = []
  for (let i = 6; i >= 0; i--) {
    const dateStr = addDays(today, -i)
    const [y, m, d] = dateStr.split('-').map(Number)
    const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
    const score = dayScoresMap.get(dateStr) ?? computeDailyScore({ date: dateStr, habits, timezone: tz })
    weeklySparkline.push({
      day: DAY_INITIALS[dayOfWeek],
      date: dateStr,
      pct: score.isNeutral ? 0 : score.completionPct,
    })
  }

  // 9. Discipline quote & review goals
  let todayQuote: string = CURATED_DISCIPLINE_QUOTES[0]
  const quoteRows = (quotesRes.data ?? []) as { text: string }[]
  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24))
  if (quoteRows.length > 0) {
    todayQuote = quoteRows[daysSinceEpoch % quoteRows.length].text
  } else {
    todayQuote = CURATED_DISCIPLINE_QUOTES[daysSinceEpoch % CURATED_DISCIPLINE_QUOTES.length]
  }

  const now = new Date()
  const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth()
  const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

  const { data: lastReview } = await db
    .from('month_reviews')
    .select('goals_next_month')
    .eq('user_id', user.id)
    .eq('year', lastMonthYear)
    .eq('month', lastMonth)
    .maybeSingle()

  return {
    todayScore: todayScore.completedCount,
    todayTotal: todayScore.totalActive,
    todayPct: todayScore.completionPct,
    weeklyAvgPct: weekAvgResult.averagePct,
    monthlyAvgPct: monthAvgResult.averagePct,
    currentStreak,
    longestStreak,
    perfectDaysCount,
    overallCompletionPct,
    todayQuote,
    goalsThisMonth: lastReview?.goals_next_month ?? null,
    weeklySparkline,
  }
}

/**
 * Computes DailyScore rows for an entire month using raw table joins and lib/scoring.
 * Replaces direct queries to view daily_scores.
 */
export async function getDailyScoresForMonth(year: number, month: number): Promise<DailyScore[]> {
  const db = await createServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return []

  const tz = await getServerTimezone()
  const { startDate, endDate } = getMonthDateRange(year, month)

  const [habitsRes, subitemsRes, entriesRes] = await Promise.all([
    db
      .from('habits')
      .select('id, name, type, sort_order, is_archived, archived_at, created_at, target_value, unit, step_value')
      .eq('user_id', user.id),
    db
      .from('habit_subitems')
      .select('id, habit_id, name, sort_order, created_at')
      .eq('user_id', user.id),
    db
      .from('day_entries')
      .select('id, date, mood, energy, sleep_hours, weight_kg, screen_time_minutes, notes')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true }),
  ])

  const habits = (habitsRes.data ?? []) as ScoringHabit[]
  const subitems = (subitemsRes.data ?? []) as ScoringSubitem[]
  const entries = entriesRes.data ?? []

  if (entries.length === 0) return []

  const entryIds = entries.map((e) => e.id)
  const [hCompRes, sCompRes] = await Promise.all([
    db
      .from('day_habit_completions')
      .select('day_entry_id, habit_id, is_completed, is_skipped, amount, target_snapshot')
      .eq('user_id', user.id)
      .in('day_entry_id', entryIds),
    db
      .from('day_subitem_completions')
      .select('day_entry_id, subitem_id, is_completed')
      .eq('user_id', user.id)
      .in('day_entry_id', entryIds),
  ])

  const entryDateById = new Map<string, string>()
  const entryById = new Map<string, any>()
  for (const e of entries) {
    entryDateById.set(e.id, e.date)
    entryById.set(e.id, e)
  }

  const compsByDate = new Map<string, Map<string, ScoringCompletion>>()
  for (const hc of hCompRes.data ?? []) {
    const d = entryDateById.get((hc as any).day_entry_id)
    if (!d) continue
    let m = compsByDate.get(d)
    if (!m) {
      m = new Map()
      compsByDate.set(d, m)
    }
    m.set(hc.habit_id, hc as any)
  }

  const subCompsByDate = new Map<string, Map<string, boolean>>()
  for (const sc of sCompRes.data ?? []) {
    const d = entryDateById.get(sc.day_entry_id)
    if (!d) continue
    let m = subCompsByDate.get(d)
    if (!m) {
      m = new Map()
      subCompsByDate.set(d, m)
    }
    m.set(sc.subitem_id, Boolean(sc.is_completed))
  }

  return entries.map((e) => {
    const comps = compsByDate.get(e.date) ?? new Map()
    const subComps = subCompsByDate.get(e.date) ?? new Map()
    const score = computeDailyScore({
      date: e.date,
      habits,
      completionsMap: comps,
      subitems,
      subitemCompletionsMap: subComps,
      timezone: tz,
    })

    return {
      day_entry_id: e.id,
      date: e.date,
      total_active_habits: score.totalActive,
      completed_habits: score.completedCount,
      skipped_habits: score.skippedCount,
      completion_pct: score.completionPct,
      mood: e.mood,
      energy: e.energy,
      sleep_hours: e.sleep_hours,
      weight_kg: e.weight_kg,
      screen_time_minutes: e.screen_time_minutes,
      user_id: user.id,
    } as unknown as DailyScore
  })
}

/**
 * Returns daily score for a single date using raw table joins and lib/scoring.
 */
export async function getDailyScoreForDate(date: string): Promise<DailyScore | null> {
  const db = await createServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return null

  const tz = await getServerTimezone()

  const [habitsRes, subitemsRes, entryRes] = await Promise.all([
    db.from('habits').select('*').eq('user_id', user.id),
    db.from('habit_subitems').select('*').eq('user_id', user.id),
    db.from('day_entries').select('*').eq('user_id', user.id).eq('date', date).maybeSingle(),
  ])

  const habits = (habitsRes.data ?? []) as ScoringHabit[]
  const subitems = (subitemsRes.data ?? []) as ScoringSubitem[]
  const entry = entryRes.data

  if (!entry) return null

  const [hCompRes, sCompRes] = await Promise.all([
    db
      .from('day_habit_completions')
      .select('habit_id, is_completed, is_skipped, amount, target_snapshot')
      .eq('user_id', user.id)
      .eq('day_entry_id', entry.id),
    db
      .from('day_subitem_completions')
      .select('subitem_id, is_completed')
      .eq('user_id', user.id)
      .eq('day_entry_id', entry.id),
  ])

  const compsMap = new Map<string, ScoringCompletion>()
  for (const hc of hCompRes.data ?? []) {
    compsMap.set(hc.habit_id, hc as any)
  }

  const subCompsMap = new Map<string, boolean>()
  for (const sc of sCompRes.data ?? []) {
    subCompsMap.set(sc.subitem_id, Boolean(sc.is_completed))
  }

  const score = computeDailyScore({
    date,
    habits,
    completionsMap: compsMap,
    subitems,
    subitemCompletionsMap: subCompsMap,
    timezone: tz,
  })

  return {
    day_entry_id: entry.id,
    date,
    total_active_habits: score.totalActive,
    completed_habits: score.completedCount,
    skipped_habits: score.skippedCount,
    completion_pct: score.completionPct,
    mood: entry.mood,
    energy: entry.energy,
    sleep_hours: entry.sleep_hours,
    weight_kg: entry.weight_kg,
    screen_time_minutes: entry.screen_time_minutes,
    user_id: user.id,
  } as unknown as DailyScore
}

/**
 * Returns DailyScores across the calendar for Calendar view using raw tables & lib/scoring.
 */
export async function getAllDailyScoresForCalendar(): Promise<DailyScore[]> {
  const db = await createServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return []

  const tz = await getServerTimezone()
  const today = await todayDate()
  const fourHundredDaysAgo = addDays(today, -400)

  const [habitsRes, subitemsRes, entriesRes] = await Promise.all([
    db.from('habits').select('*').eq('user_id', user.id),
    db.from('habit_subitems').select('*').eq('user_id', user.id),
    db
      .from('day_entries')
      .select('id, date, mood, energy, sleep_hours, weight_kg, screen_time_minutes')
      .eq('user_id', user.id)
      .gte('date', fourHundredDaysAgo)
      .lte('date', today)
      .order('date', { ascending: true }),
  ])

  const habits = (habitsRes.data ?? []) as ScoringHabit[]
  const subitems = (subitemsRes.data ?? []) as ScoringSubitem[]
  const entries = entriesRes.data ?? []

  if (entries.length === 0) return []

  const entryIds = entries.map((e) => e.id)
  const [hCompRes, sCompRes] = await Promise.all([
    db
      .from('day_habit_completions')
      .select('day_entry_id, habit_id, is_completed, is_skipped, amount, target_snapshot')
      .eq('user_id', user.id)
      .in('day_entry_id', entryIds),
    db
      .from('day_subitem_completions')
      .select('day_entry_id, subitem_id, is_completed')
      .eq('user_id', user.id)
      .in('day_entry_id', entryIds),
  ])

  const entryDateById = new Map<string, string>()
  for (const e of entries) {
    entryDateById.set(e.id, e.date)
  }

  const compsByDate = new Map<string, Map<string, ScoringCompletion>>()
  for (const hc of hCompRes.data ?? []) {
    const d = entryDateById.get((hc as any).day_entry_id)
    if (!d) continue
    let m = compsByDate.get(d)
    if (!m) {
      m = new Map()
      compsByDate.set(d, m)
    }
    m.set(hc.habit_id, hc as any)
  }

  const subCompsByDate = new Map<string, Map<string, boolean>>()
  for (const sc of sCompRes.data ?? []) {
    const d = entryDateById.get(sc.day_entry_id)
    if (!d) continue
    let m = subCompsByDate.get(d)
    if (!m) {
      m = new Map()
      subCompsByDate.set(d, m)
    }
    m.set(sc.subitem_id, Boolean(sc.is_completed))
  }

  return entries.map((e) => {
    const comps = compsByDate.get(e.date) ?? new Map()
    const subComps = subCompsByDate.get(e.date) ?? new Map()
    const score = computeDailyScore({
      date: e.date,
      habits,
      completionsMap: comps,
      subitems,
      subitemCompletionsMap: subComps,
      timezone: tz,
    })

    return {
      day_entry_id: e.id,
      date: e.date,
      total_active_habits: score.totalActive,
      completed_habits: score.completedCount,
      skipped_habits: score.skippedCount,
      completion_pct: score.completionPct,
      mood: e.mood,
      energy: e.energy,
      sleep_hours: e.sleep_hours,
      weight_kg: e.weight_kg,
      screen_time_minutes: e.screen_time_minutes,
      user_id: user.id,
    } as unknown as DailyScore
  })
}

/**
 * Computes per-habit consistency stats for a given month using pure lib/scoring.
 * Replaces direct queries to view habit_monthly_stats.
 */
export async function getHabitMonthlyStats(year: number, month: number): Promise<HabitMonthlyStat[]> {
  const db = await createServerClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return []

  const tz = await getServerTimezone()
  const today = await todayDate()
  const { startDate, endDate } = getMonthDateRange(year, month)

  const [habitsRes, subitemsRes, entriesRes] = await Promise.all([
    db.from('habits').select('*').eq('user_id', user.id).order('sort_order', { ascending: true }),
    db.from('habit_subitems').select('*').eq('user_id', user.id),
    db
      .from('day_entries')
      .select('id, date')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate),
  ])

  const habits = (habitsRes.data ?? []) as ScoringHabit[]
  const subitems = (subitemsRes.data ?? []) as ScoringSubitem[]
  const entries = entriesRes.data ?? []

  const entryIds = entries.map((e) => e.id)
  let habitCompletions: any[] = []
  let subitemCompletions: any[] = []

  if (entryIds.length > 0) {
    const [hcRes, scRes] = await Promise.all([
      db
        .from('day_habit_completions')
        .select('day_entry_id, habit_id, is_completed, is_skipped, amount, target_snapshot')
        .eq('user_id', user.id)
        .in('day_entry_id', entryIds),
      db
        .from('day_subitem_completions')
        .select('day_entry_id, subitem_id, is_completed')
        .eq('user_id', user.id)
        .in('day_entry_id', entryIds),
    ])
    habitCompletions = hcRes.data ?? []
    subitemCompletions = scRes.data ?? []
  }

  const entryDateById = new Map<string, string>()
  for (const e of entries) {
    entryDateById.set(e.id, e.date)
  }

  // Group completions by habit_id -> date -> completion
  const compsByHabit = new Map<string, Map<string, ScoringCompletion>>()
  for (const hc of habitCompletions) {
    const d = entryDateById.get(hc.day_entry_id)
    if (!d) continue
    let hMap = compsByHabit.get(hc.habit_id)
    if (!hMap) {
      hMap = new Map()
      compsByHabit.set(hc.habit_id, hMap)
    }
    hMap.set(d, hc)
  }

  // Group subitems by habit_id
  const subitemsByHabit = new Map<string, ScoringSubitem[]>()
  for (const si of subitems) {
    const arr = subitemsByHabit.get(si.habit_id) ?? []
    arr.push(si)
    subitemsByHabit.set(si.habit_id, arr)
  }

  // Group subitem completions: date -> subitem_id -> boolean
  const subCompsByDate = new Map<string, Map<string, boolean>>()
  for (const sc of subitemCompletions) {
    const d = entryDateById.get(sc.day_entry_id)
    if (!d) continue
    let m = subCompsByDate.get(d)
    if (!m) {
      m = new Map()
      subCompsByDate.set(d, m)
    }
    m.set(sc.subitem_id, Boolean(sc.is_completed))
  }

  const results: HabitMonthlyStat[] = []

  for (const habit of habits) {
    const completionsByDate = compsByHabit.get(habit.id) ?? new Map()
    const habitSubitems = subitemsByHabit.get(habit.id) ?? []

    const rate = computeHabitRates({
      habit,
      startDate,
      endDate,
      today,
      completionsByDate,
      subitems: habitSubitems,
      subitemCompletionsByDate: subCompsByDate,
      timezone: tz,
    })

    results.push({
      habit_id: habit.id,
      name: habit.name ?? '',
      year,
      month,
      total_active_days: rate.activeDays,
      completed_days: rate.completedDays,
      skipped_days: rate.skippedDays,
      consistency_pct: rate.ratePct,
      user_id: user.id,
    } as unknown as HabitMonthlyStat)
  }

  return results.sort((a, b) => Number(b.consistency_pct) - Number(a.consistency_pct))
}
