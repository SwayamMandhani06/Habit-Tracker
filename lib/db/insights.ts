// lib/db/insights.ts — Deep analytics & stats calculation for Insights and Review pages (server-only)
import { createServerClient } from '@/lib/supabase/server'
import { toAppDateString, todayDate } from './entries'
import { getMonthDateRange } from '@/lib/date'
import type { Habit, MonthReview } from '@/lib/supabase/types'
import {
  computeDailyScore,
  computeStreaks,
  isHabitActiveOnDate,
  calculateHabitStreaks,
  type DayScoreResult,
  type HabitRecord,
} from '@/lib/scoring'
import { getDailyScoresForMonth, getAllDailyScoresForCalendar, getHabitMonthlyStats } from './stats'
import { timeStep } from '@/lib/timing'

export interface DailyPoint {
  day: number
  date: string
  pct: number | null
  completed: number
  total: number
  isToday: boolean
  isFuture: boolean
  sleepHours: number | null
  missedHabitNames?: string[]
}

export interface HabitInsightItem {
  id: string
  name: string
  notes: string | null
  color?: string
  icon?: string
  type?: string
  target_value?: number | null
  unit?: string | null
  created_at?: string
  archived_at?: string | null
  pct: number
  lastMonthPct: number | null
  delta: number | null
  bestStreak: number
  totalCompletions: number
  missedDays: number
  daysActive: number
  weeklySparkline: number[] // 4 numbers 0..100
  dailyHeatmap: Array<{ day: number; date: string; completed: boolean; isFuture: boolean; isSkipped?: boolean }>
}

export interface WeeklyInsightItem {
  weekNumber: number
  label: string
  dateRange: string
  avgPct: number
  perfectDays: number
  totalDays: number
  habitCompletions: Array<{ name: string; completed: number; total: number; pct: number }>
}

export interface HabitComparisonItem {
  id: string
  name: string
  completions: number
  pctOfTotal: number
  color: string
}

export interface DayOfWeekConsistencyItem {
  day: string
  short: string
  avgPct: number
  totalDays: number
}

export interface InsightsData {
  year: number
  month: number
  monthName: string
  perfectDaysCount: number
  avgCompletionPct: number
  currentStreak: number
  longestStreakEver: number
  monthLongestStreak: number
  dailyScores: DailyPoint[]
  habitsBestToWorst: HabitInsightItem[]
  habitsWorstToBest: HabitInsightItem[]
  weeklyAnalysis: WeeklyInsightItem[]
  highlights: {
    bestDay: { date: string; dayNumber: number; pct: number; completedCount: number; totalCount: number } | null
    hardestDay: { date: string; dayNumber: number; pct: number; completedCount: number; missedHabits: string[] } | null
    bestHabit: { name: string; pct: number } | null
    needsWorkHabit: { name: string; pct: number } | null
  }
  streakDots: Array<{
    day: number
    date: string
    pct: number
    isToday: boolean
    isFuture: boolean
  }>
  totalCompletionsCount: number
  habitComparison: HabitComparisonItem[]
  thirtyDayConsistencyPct: number
  dayOfWeekConsistency: DayOfWeekConsistencyItem[]
}

export interface ReviewData {
  year: number
  month: number
  monthName: string
  isCurrentMonth: boolean
  isPriorMonth: boolean
  daysRemaining: number
  totalDays: number
  stats: {
    overallCompletionPct: number
    perfectDaysCount: number
    bestHabit: { id: string; name: string; pct: number } | null
    worstHabit: { id: string; name: string; pct: number } | null
    avgSleepHours: number | null
    workoutConsistencyPct: number | null
    readingConsistencyPct: number | null
    deepWorkConsistencyPct: number | null
    longestStreakMonth: number
    totalHabitsCompleted: number
  }
  habitStats: Array<{
    id: string
    name: string
    pct: number
    daysCompleted: number
    daysActive: number
  }>
  review: MonthReview | null
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? ''
}

export async function getInsightsData(year: number, month: number): Promise<InsightsData> {
  const db = await createServerClient()
  const { data: { user } } = await db.auth.getUser()
  const userId = user?.id ?? ''

  const today = await todayDate()
  const { startDate, endDate, daysInMonth } = getMonthDateRange(year, month)

  const priorMonth = month === 1 ? 12 : month - 1
  const priorYear = month === 1 ? year - 1 : year

  // Run database queries in parallel using raw tables and pure lib/scoring (NO views)
  const [
    habitsRes,
    monthEntriesRes,
    dailyScoresData,
    allScoresData,
    thisMonthStatsData,
    priorMonthStatsData,
  ] = await Promise.all([
    timeStep('/insights', 'query_habits', () =>
      db.from('habits').select('*').eq('user_id', userId).order('sort_order', { ascending: true })
    ),
    timeStep('/insights', 'query_month_entries', () =>
      db.from('day_entries')
        .select('id, date, sleep_hours, day_habit_completions(habit_id, is_completed, is_skipped)')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
    ),
    timeStep('/insights', 'query_daily_scores_month', () =>
      getDailyScoresForMonth(year, month)
    ),
    timeStep('/insights', 'query_calendar_scores', () =>
      getAllDailyScoresForCalendar()
    ),
    timeStep('/insights', 'query_this_month_stats', () =>
      getHabitMonthlyStats(year, month)
    ),
    timeStep('/insights', 'query_prior_month_stats', () =>
      getHabitMonthlyStats(priorYear, priorMonth)
    ),
  ])

  const habits = (habitsRes.data ?? []) as Habit[]
  const monthEntries = (monthEntriesRes.data ?? []) as Array<{
    id: string
    date: string
    sleep_hours: number | null
    day_habit_completions: Array<{ habit_id: string; is_completed: boolean; is_skipped?: boolean }>
  }>
  const dailyScores = (dailyScoresData ?? []) as Array<{
    day_entry_id: string
    date: string
    total_active_habits: number
    skipped_habits?: number
    completed_habits: number
    completion_pct: number
    sleep_hours: number | null
  }>
  const allScores = (allScoresData ?? []) as Array<{
    date: string
    completion_pct: number
    total_active_habits?: number
    completed_habits?: number
    skipped_habits?: number
  }>
  const thisMonthStats = (thisMonthStatsData ?? []) as Array<{
    habit_id: string
    habit_name: string
    days_active: number
    days_completed: number
    consistency_pct: number
  }>
  const priorMonthStats = (priorMonthStatsData ?? []) as Array<{
    habit_id: string
    consistency_pct: number
  }>

  // Maps for fast lookup
  const scoresByDate = new Map<string, typeof dailyScores[0]>()
  for (const s of dailyScores) {
    scoresByDate.set(s.date, s)
  }

  const entriesByDate = new Map<string, typeof monthEntries[0]>()
  for (const e of monthEntries) {
    entriesByDate.set(e.date, e)
  }

  const priorStatByHabit = new Map<string, number>()
  for (const s of priorMonthStats) {
    priorStatByHabit.set(s.habit_id, Number(s.consistency_pct))
  }

  const thisStatByHabit = new Map<string, typeof thisMonthStats[0]>()
  for (const s of thisMonthStats) {
    thisStatByHabit.set(s.habit_id, s)
  }

  // Habits map for name lookup
  const habitMap = new Map<string, Habit>()
  for (const h of habits) {
    habitMap.set(h.id, h)
  }

  // 1. Calculate Daily Points for the month
  const dailyPoints: DailyPoint[] = []
  let perfectDaysCount = 0
  let totalScoreSum = 0
  let scoredDaysCount = 0

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const isToday = dateStr === today
    const isFuture = dateStr > today
    const score = scoresByDate.get(dateStr)
    const entry = entriesByDate.get(dateStr)

    const compsMap: Record<string, { habit_id: string; is_completed: boolean; is_skipped?: boolean; amount?: number | null; target_snapshot?: number | null }> = {}
    if (entry && entry.day_habit_completions) {
      for (const c of entry.day_habit_completions) {
        compsMap[c.habit_id] = c
      }
    }

    const dayScore = computeDailyScore({
      date: dateStr,
      habits,
      completionsMap: compsMap,
    })

    const pct = isFuture ? null : (score ? Math.round(Number(score.completion_pct)) : dayScore.completionPct)
    const completed = score ? Number(score.completed_habits) : dayScore.completedCount
    const total = score ? Number(score.total_active_habits) : dayScore.totalActive

    if (!isFuture) {
      if (pct !== null && pct >= 100 && completed > 0 && total > 0) perfectDaysCount++
      if (pct !== null) {
        totalScoreSum += pct
        scoredDaysCount++
      }
    }

    // Find missed habits if any using canonical isHabitActiveOnDate
    const missedHabitNames: string[] = []
    if (!isFuture) {
      for (const h of habits) {
        const c = compsMap[h.id]
        const isSkipped = c?.is_skipped === true
        if (isHabitActiveOnDate(h, dateStr, isSkipped) && !c?.is_completed) {
          missedHabitNames.push(h.name)
        }
      }
    }

    dailyPoints.push({
      day: d,
      date: dateStr,
      pct,
      completed,
      total,
      isToday,
      isFuture,
      sleepHours: entry?.sleep_hours ?? score?.sleep_hours ?? null,
      missedHabitNames,
    })
  }

  const avgCompletionPct = scoredDaysCount > 0 ? Math.round(totalScoreSum / scoredDaysCount) : 0

  // 2. Streaks calculation using canonical lib/scoring
  const allDayResults: DayScoreResult[] = allScores.map(s => {
    const active = Number(s.total_active_habits ?? 0)
    const completed = Number(s.completed_habits ?? 0)
    const pct = Number(s.completion_pct ?? 0)
    return {
      date: s.date,
      totalActive: active,
      completedCount: completed,
      skippedCount: Number((s as any).skipped_habits ?? 0),
      completionPct: pct,
      isPerfect: pct >= 100 && active > 0 && completed > 0,
      isNeutral: active === 0,
    }
  })

  // Ensure current month points are reflected
  for (const pt of dailyPoints) {
    if (pt.isFuture) continue
    const existing = allDayResults.find(d => d.date === pt.date)
    if (existing) {
      existing.totalActive = pt.total
      existing.completedCount = pt.completed
      existing.completionPct = pt.pct ?? 0
      existing.isPerfect = (pt.pct ?? 0) >= 100 && pt.total > 0 && pt.completed > 0
      existing.isNeutral = pt.total === 0
    } else {
      allDayResults.push({
        date: pt.date,
        totalActive: pt.total,
        completedCount: pt.completed,
        skippedCount: 0,
        completionPct: pt.pct ?? 0,
        isPerfect: (pt.pct ?? 0) >= 100 && pt.total > 0 && pt.completed > 0,
        isNeutral: pt.total === 0,
      })
    }
  }

  const { currentStreak, longestStreak: longestStreakEver } = computeStreaks(allDayResults, today)

  // Month's longest streak
  const monthDayResults: DayScoreResult[] = dailyPoints
    .filter(pt => !pt.isFuture)
    .map(pt => ({
      date: pt.date,
      totalActive: pt.total,
      completedCount: pt.completed,
      skippedCount: 0,
      completionPct: pt.pct ?? 0,
      isPerfect: (pt.pct ?? 0) >= 100 && pt.total > 0 && pt.completed > 0,
      isNeutral: pt.total === 0,
    }))
  const { longestStreak: monthLongestStreak } = computeStreaks(monthDayResults, today)

  // 3. Per-Habit Deep Analysis
  const habitItems: HabitInsightItem[] = []

  // Pre-calculate habit completions & records per day
  const habitCompletionDates = new Map<string, Set<string>>()
  const habitRecordsMap = new Map<string, Map<string, HabitRecord>>()
  for (const e of monthEntries) {
    if (!e.day_habit_completions) continue
    for (const c of e.day_habit_completions) {
      if (!habitRecordsMap.has(c.habit_id)) {
        habitRecordsMap.set(c.habit_id, new Map())
      }
      habitRecordsMap.get(c.habit_id)!.set(e.date, {
        isCompleted: Boolean(c.is_completed),
        isSkipped: Boolean(c.is_skipped),
      })
      if (c.is_completed) {
        if (!habitCompletionDates.has(c.habit_id)) {
          habitCompletionDates.set(c.habit_id, new Set())
        }
        habitCompletionDates.get(c.habit_id)!.add(e.date)
      }
    }
  }

  // 4 weeks buckets:
  // W1: 1-7 (7 days), W2: 8-14 (7 days), W3: 15-21 (7 days), W4: 22-daysInMonth (remaining days)
  const weekDayRanges = [
    { start: 1, end: 7 },
    { start: 8, end: 14 },
    { start: 15, end: 21 },
    { start: 22, end: daysInMonth },
  ]

  for (const h of habits) {
    const compSet = habitCompletionDates.get(h.id) ?? new Set<string>()
    const thisStat = thisStatByHabit.get(h.id)
    const lastPct = priorStatByHabit.has(h.id) ? priorStatByHabit.get(h.id)! : null

    const createdDate = h.created_at ? h.created_at.slice(0, 10) : ''
    const archivedDate = h.is_archived && h.archived_at ? h.archived_at.slice(0, 10) : ''

    // Skip habits that were archived prior to this month
    if (h.is_archived && archivedDate && archivedDate < startDate) {
      continue
    }

    // Calculate eligible active days for this habit in the month (respecting creation date, archived date, and skips)
    let habitEligibleDays = 0
    const [todayY, todayM, todayD] = today.split('-').map(Number)
    const isPastMonth = year < todayY || (year === todayY && month < todayM)
    const maxDayToCheck = isPastMonth ? daysInMonth : Math.min(todayD, daysInMonth)

    for (let d = 1; d <= maxDayToCheck; d++) {
      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      if (createdDate && dStr < createdDate) continue
      if (archivedDate && dStr > archivedDate) continue

      const entry = entriesByDate.get(dStr)
      const isSkipped = entry?.day_habit_completions?.some((c: any) => c.habit_id === h.id && c.is_skipped)
      if (isSkipped) continue
      habitEligibleDays++
    }

    // Days completed this month
    const totalCompletions = compSet.size
    const daysActive = thisStat ? Number(thisStat.days_active) : habitEligibleDays
    const pct = daysActive > 0 ? Math.round((totalCompletions / daysActive) * 100) : 0
    const missedDays = Math.max(0, daysActive - totalCompletions)
    const delta = lastPct !== null ? pct - Math.round(lastPct) : null

    // Habit best streak this month via canonical calculateHabitStreaks from lib/scoring
    const recMap = habitRecordsMap.get(h.id) ?? new Map()
    const { bestStreak: habitBestStreak } = calculateHabitStreaks(
      recMap,
      createdDate || startDate,
      archivedDate || null,
      endDate
    )

    // Weekly sparkline: 4 bars
    const weeklySparkline = weekDayRanges.map(range => {
      let count = 0
      let activeRangeDays = 0
      for (let d = range.start; d <= range.end; d++) {
        const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        if (createdDate && dStr < createdDate) continue
        if (archivedDate && dStr > archivedDate) continue
        const entry = entriesByDate.get(dStr)
        const isSkipped = entry?.day_habit_completions?.some((c: any) => c.habit_id === h.id && c.is_skipped)
        if (isSkipped) continue
        activeRangeDays++
        if (compSet.has(dStr)) count++
      }
      return activeRangeDays > 0 ? Math.round((count / activeRangeDays) * 100) : 0
    })

    // Daily heatmap: all days of the month
    const dailyHeatmap = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const entry = entriesByDate.get(dStr)
      const isSkipped = entry?.day_habit_completions?.some((c: any) => c.habit_id === h.id && c.is_skipped)
      dailyHeatmap.push({
        day: d,
        date: dStr,
        completed: compSet.has(dStr),
        isSkipped: Boolean(isSkipped),
        isFuture: dStr > today,
      })
    }

    habitItems.push({
      id: h.id,
      name: h.name,
      notes: h.notes ?? null,
      color: (h as any).color ?? 'sage',
      icon: (h as any).icon ?? 'circle-dot',
      type: (h as any).type ?? 'boolean',
      target_value: (h as any).target_value ?? null,
      unit: (h as any).unit ?? null,
      created_at: h.created_at,
      archived_at: h.archived_at,
      pct,
      lastMonthPct: lastPct !== null ? Math.round(lastPct) : null,
      delta,
      bestStreak: habitBestStreak,
      totalCompletions,
      missedDays,
      daysActive,
      weeklySparkline,
      dailyHeatmap,
    })
  }

  // Sorted views
  const habitsBestToWorst = [...habitItems].sort((a, b) => b.pct - a.pct)
  const habitsWorstToBest = [...habitItems].sort((a, b) => a.pct - b.pct)

  // 4. Weekly Analysis
  const weeklyAnalysis: WeeklyInsightItem[] = weekDayRanges.map((w, idx) => {
    const weekNum = idx + 1
    const startStr = `${year}-${String(month).padStart(2, '0')}-${String(w.start).padStart(2, '0')}`
    const endStr = `${year}-${String(month).padStart(2, '0')}-${String(w.end).padStart(2, '0')}`
    const sDate = new Date(startStr + 'T00:00:00')
    const eDate = new Date(endStr + 'T00:00:00')

    const shortMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const dateRange = `${shortMonths[sDate.getMonth()]} ${sDate.getDate()} – ${shortMonths[eDate.getMonth()]} ${eDate.getDate()}`

    const weekScores = dailyPoints.filter(p => p.day >= w.start && p.day <= w.end && p.pct !== null && !p.isFuture)
    const avgPct = weekScores.length > 0
      ? Math.round(weekScores.reduce((acc, s) => acc + (s.pct ?? 0), 0) / weekScores.length)
      : 0
    const perfectDays = weekScores.filter(s => (s.pct ?? 0) >= 100).length
    const totalDays = w.end - w.start + 1

    // Per habit completion in this week
    const habitCompletions = habits.map(h => {
      const compSet = habitCompletionDates.get(h.id) ?? new Set<string>()
      const createdDate = h.created_at ? h.created_at.slice(0, 10) : ''
      const archivedDate = h.is_archived && h.archived_at ? h.archived_at.slice(0, 10) : ''
      let count = 0
      let activeWeekDays = 0
      for (let d = w.start; d <= w.end; d++) {
        const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        if (createdDate && dStr < createdDate) continue
        if (archivedDate && dStr > archivedDate) continue
        const entry = entriesByDate.get(dStr)
        const isSkipped = entry?.day_habit_completions?.some((c: any) => c.habit_id === h.id && c.is_skipped)
        if (isSkipped) continue
        activeWeekDays++
        if (compSet.has(dStr)) count++
      }
      return {
        name: h.name,
        completed: count,
        total: activeWeekDays,
        pct: activeWeekDays > 0 ? Math.round((count / activeWeekDays) * 100) : 0,
      }
    }).sort((a, b) => b.pct - a.pct)

    return {
      weekNumber: weekNum,
      label: `Week ${weekNum}`,
      dateRange,
      avgPct,
      perfectDays,
      totalDays,
      habitCompletions,
    }
  })

  // 5. Highlights (Best Day / Hardest Day, Best Habit / Needs Work)
  const trackedDays = dailyPoints.filter(p => p.pct !== null && !p.isFuture)
  let bestDay: InsightsData['highlights']['bestDay'] = null
  let hardestDay: InsightsData['highlights']['hardestDay'] = null

  if (trackedDays.length > 0) {
    const sortedByPctDesc = [...trackedDays].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))
    const b = sortedByPctDesc[0]
    bestDay = {
      date: b.date,
      dayNumber: b.day,
      pct: b.pct ?? 0,
      completedCount: b.completed,
      totalCount: b.total,
    }

    const sortedByPctAsc = [...trackedDays].sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))
    const h = sortedByPctAsc[0]
    hardestDay = {
      date: h.date,
      dayNumber: h.day,
      pct: h.pct ?? 0,
      completedCount: h.completed,
      missedHabits: h.missedHabitNames ?? [],
    }
  }

  const bestHabit = habitsBestToWorst.length > 0
    ? { name: habitsBestToWorst[0].name, pct: habitsBestToWorst[0].pct }
    : null
  const needsWorkHabit = habitsWorstToBest.length > 0
    ? { name: habitsWorstToBest[0].name, pct: habitsWorstToBest[0].pct }
    : null

  // 6. Streak Dots row
  const streakDots = dailyPoints.map(p => ({
    day: p.day,
    date: p.date,
    pct: p.pct ?? 0,
    isToday: p.isToday,
    isFuture: p.isFuture,
  }))

  // 7. Signature Analytics (InlitX / Streak Comparisons & Consistency)
  const COMPARISON_COLORS = [
    '#5C6B5A', // Sage green
    '#8BA888', // Light sage
    '#38BDF8', // Cyan
    '#A855F7', // Violet
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#EC4899', // Pink
    '#6366F1', // Indigo
  ]

  const totalCompletionsCount = habitsBestToWorst.reduce((sum, h) => sum + (h.totalCompletions ?? 0), 0)

  const habitComparison: HabitComparisonItem[] = habitsBestToWorst.map((h, i) => ({
    id: h.id,
    name: h.name,
    completions: h.totalCompletions ?? 0,
    pctOfTotal: totalCompletionsCount > 0 ? Math.round(((h.totalCompletions ?? 0) / totalCompletionsCount) * 100) : 0,
    color: COMPARISON_COLORS[i % COMPARISON_COLORS.length],
  }))

  const trackedScores = dailyPoints.filter(p => !p.isFuture && p.pct !== null)
  const thirtyDayConsistencyPct = trackedScores.length > 0
    ? Math.round(trackedScores.reduce((acc, p) => acc + (p.pct ?? 0), 0) / trackedScores.length)
    : avgCompletionPct

  // Day of week consistency (Mon through Sun)
  const daysOfWeekMeta = [
    { day: 'Monday', short: 'M', dayIdx: 1 },
    { day: 'Tuesday', short: 'T', dayIdx: 2 },
    { day: 'Wednesday', short: 'W', dayIdx: 3 },
    { day: 'Thursday', short: 'T', dayIdx: 4 },
    { day: 'Friday', short: 'F', dayIdx: 5 },
    { day: 'Saturday', short: 'S', dayIdx: 6 },
    { day: 'Sunday', short: 'S', dayIdx: 0 },
  ]

  const dayOfWeekConsistency: DayOfWeekConsistencyItem[] = daysOfWeekMeta.map(({ day, short, dayIdx }) => {
    const matching = trackedScores.filter(p => {
      const dt = new Date(p.date + 'T00:00:00')
      return dt.getDay() === dayIdx
    })
    const avg = matching.length > 0
      ? Math.round(matching.reduce((sum, p) => sum + (p.pct ?? 0), 0) / matching.length)
      : 0
    return {
      day,
      short,
      avgPct: avg,
      totalDays: matching.length,
    }
  })

  return {
    year,
    month,
    monthName: getMonthName(month),
    perfectDaysCount,
    avgCompletionPct,
    currentStreak,
    longestStreakEver,
    monthLongestStreak,
    dailyScores: dailyPoints,
    habitsBestToWorst,
    habitsWorstToBest,
    weeklyAnalysis,
    highlights: {
      bestDay,
      hardestDay,
      bestHabit,
      needsWorkHabit,
    },
    streakDots,
    totalCompletionsCount,
    habitComparison,
    thirtyDayConsistencyPct,
    dayOfWeekConsistency,
  }
}

export async function getMonthlyReviewData(year: number, month: number): Promise<ReviewData> {
  const db = await createServerClient()
  const today = await todayDate()
  const todayObj = new Date(today + 'T00:00:00')
  const curYear = todayObj.getFullYear()
  const curMonth = todayObj.getMonth() + 1
  const { daysInMonth } = getMonthDateRange(year, month)

  const isCurrentMonth = year === curYear && month === curMonth
  const isPriorMonth = (year < curYear) || (year === curYear && month < curMonth)
  const daysRemaining = isCurrentMonth ? Math.max(0, daysInMonth - todayObj.getDate()) : 0

  const { data: { user } } = await db.auth.getUser()
  const userId = user?.id ?? ''

  const [insights, reviewRes] = await Promise.all([
    timeStep('/review', 'query_insights_data', () => getInsightsData(year, month)),
    timeStep('/review', 'query_month_reviews', () =>
      db.from('month_reviews')
        .select('*')
        .eq('user_id', userId)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle()
    ),
  ])

  const review = (reviewRes.data ?? null) as MonthReview | null

  // Calculate workout, reading, deep work consistency
  let workoutConsistencyPct: number | null = null
  let readingConsistencyPct: number | null = null
  let deepWorkConsistencyPct: number | null = null

  const workoutHabit = insights.habitsBestToWorst.find(h =>
    /workout|gym|exercise|run|training|lift|yoga|walk|cardio/i.test(h.name)
  )
  if (workoutHabit) workoutConsistencyPct = workoutHabit.pct

  const readingHabit = insights.habitsBestToWorst.find(h =>
    /read|book|kindle|pages/i.test(h.name)
  )
  if (readingHabit) readingConsistencyPct = readingHabit.pct

  const deepWorkHabit = insights.habitsBestToWorst.find(h =>
    /deep work|focus|code|programming|study|write|work|project/i.test(h.name)
  )
  if (deepWorkHabit) deepWorkConsistencyPct = deepWorkHabit.pct

  // Calculate average sleep
  const sleepDays = insights.dailyScores.filter(d => d.sleepHours !== null)
  const avgSleepHours = sleepDays.length > 0
    ? Number((sleepDays.reduce((acc, d) => acc + (d.sleepHours ?? 0), 0) / sleepDays.length).toFixed(1))
    : null

  // Total habits completed (raw count)
  const totalHabitsCompleted = insights.dailyScores.reduce((acc, d) => acc + d.completed, 0)

  const habitStats = insights.habitsBestToWorst.map(h => ({
    id: h.id,
    name: h.name,
    pct: h.pct,
    daysCompleted: h.totalCompletions,
    daysActive: h.daysActive,
  }))

  return {
    year,
    month,
    monthName: insights.monthName,
    isCurrentMonth,
    isPriorMonth,
    daysRemaining,
    totalDays: daysInMonth,
    stats: {
      overallCompletionPct: insights.avgCompletionPct,
      perfectDaysCount: insights.perfectDaysCount,
      bestHabit: insights.highlights.bestHabit && insights.habitsBestToWorst.length > 0 ? { id: insights.habitsBestToWorst[0].id, name: insights.highlights.bestHabit.name, pct: insights.highlights.bestHabit.pct } : null,
      worstHabit: insights.highlights.needsWorkHabit && insights.habitsWorstToBest.length > 0 ? { id: insights.habitsWorstToBest[0].id, name: insights.highlights.needsWorkHabit.name, pct: insights.highlights.needsWorkHabit.pct } : null,
      avgSleepHours,
      workoutConsistencyPct,
      readingConsistencyPct,
      deepWorkConsistencyPct,
      longestStreakMonth: insights.monthLongestStreak,
      totalHabitsCompleted,
    },
    habitStats,
    review,
  }
}
