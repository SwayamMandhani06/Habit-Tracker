// lib/scoring/index.ts — Pure Canonical Scoring & Habit Statistics Engine (Zero I/O, Zero DB, Zero React)
// The single source of truth for:
// - active habits on a date
// - completion determination (amount snapshotting, checklist all-done, legacy compatibility)
// - daily completion % and perfect day
// - streaks (consecutive perfect days, neutral day bridging, habit streaks)
// - week, month, and all-time period averages (over calendar days, missing entries = 0%)
// - per-habit consistency rates, weekday breakdowns, and visualization grids
// - pure local calendar date arithmetic

export interface ScoringHabit {
  id: string
  user_id?: string | null
  name?: string | null
  type?: 'checkbox' | 'amount' | 'checklist' | string | null
  created_at?: string | null
  is_archived?: boolean | null
  archived_at?: string | null
  target_value?: number | null
  unit?: string | null
  step_value?: number | null
  color?: string | null
  icon?: string | null
  notes?: string | null
}

export interface ScoringSubitem {
  id: string
  habit_id: string
  user_id?: string | null
  name?: string | null
  created_at?: string | null
  sort_order?: number | null
}

export interface ScoringCompletion {
  habit_id: string
  user_id?: string | null
  is_completed?: boolean | string | number | null
  is_skipped?: boolean | null
  amount?: number | null
  target_snapshot?: number | null
}

export interface HabitRecord {
  isCompleted: boolean
  isSkipped?: boolean
  amount?: number
  targetSnapshot?: number | null
}

export interface DayScoreResult {
  date: string
  totalActive: number
  completedCount: number
  skippedCount: number
  completionPct: number
  isPerfect: boolean
  isNeutral: boolean
}

export interface StreakResult {
  currentStreak: number
  longestStreak: number
}

export interface PeriodAverageResult {
  periodStart: string
  periodEnd: string
  calendarDays: number
  activeDays: number
  averagePct: number
}

export interface HabitRateResult {
  habitId: string
  activeDays: number
  completedDays: number
  skippedDays: number
  ratePct: number
}

export const MONTH_NAMES_SHORT = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export const WEEKDAY_NAMES_SHORT = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ── 1. Pure Local Calendar Date Math ──────────────────────────────────────────

export function parseYMD(dateStr: string): { year: number; month: number; day: number } {
  const parts = dateStr.slice(0, 10).split('-').map(Number)
  return { year: parts[0], month: parts[1], day: parts[2] }
}

export function formatYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function getDaysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28
  }
  return [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month]
}

export function addDays(dateStr: string, count: number): string {
  const { year, month, day } = parseYMD(dateStr)
  const localDate = new Date(year, month - 1, day + count, 12, 0, 0)
  return formatYMD(localDate.getFullYear(), localDate.getMonth() + 1, localDate.getDate())
}

export const addDaysYMD = addDays

export function diffInDays(dateStrA: string, dateStrB: string): number {
  const a = parseYMD(dateStrA)
  const b = parseYMD(dateStrB)
  const dateA = new Date(a.year, a.month - 1, a.day, 12, 0, 0)
  const dateB = new Date(b.year, b.month - 1, b.day, 12, 0, 0)
  return Math.round((dateB.getTime() - dateA.getTime()) / 86_400_000)
}

/**
 * Weekday with Monday = 1 ... Sunday = 7.
 * Uses local calendar noon to prevent UTC shifting.
 */
export function getWeekdayMon1(dateStr: string): number {
  const { year, month, day } = parseYMD(dateStr)
  const localDate = new Date(year, month - 1, day, 12, 0, 0)
  const jsDay = localDate.getDay() // 0 = Sunday, 1 = Monday ... 6 = Saturday
  return jsDay === 0 ? 7 : jsDay
}

export function generateDateRange(startDate: string, endDate: string): string[] {
  if (startDate > endDate) return []
  const result: string[] = []
  let curr = startDate
  let safety = 0
  while (curr <= endDate && safety++ < 3660) {
    result.push(curr)
    curr = addDays(curr, 1)
  }
  return result
}

/**
 * Converts an ISO 8601 string or Date to YYYY-MM-DD in the user's local timezone.
 * Defaults to UTC if no timezone is provided.
 */
export function toLocalDateString(
  isoStringOrDate: string | Date | null | undefined,
  timezone?: string
): string {
  if (!isoStringOrDate) return ''
  const d = typeof isoStringOrDate === 'string' ? new Date(isoStringOrDate) : isoStringOrDate
  if (isNaN(d.getTime())) {
    if (typeof isoStringOrDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(isoStringOrDate)) {
      return isoStringOrDate
    }
    return ''
  }

  const tz = timezone || 'UTC'
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return formatter.format(d)
  } catch {
    return d.toISOString().slice(0, 10)
  }
}

// ── 2. Active Habit Determination ─────────────────────────────────────────────

/**
 * Determines whether a habit is active on a given calendar date D:
 * - created on or before D (compared as the user's LOCAL date, never UTC created_at::date)
 * - not archived on or before D (archived_at in local date <= D means inactive; is_archived with null archived_at is inactive)
 * - skipped habits are excluded from active count (leave both numerator and denominator)
 */
export function isHabitActiveOnDate(
  habit: ScoringHabit,
  dateStr: string,
  isSkipped = false,
  timezone?: string
): boolean {
  if (isSkipped) return false

  const createdLocal = habit.created_at ? toLocalDateString(habit.created_at, timezone) : ''
  if (createdLocal && dateStr < createdLocal) return false

  if (habit.archived_at) {
    const archivedLocal = toLocalDateString(habit.archived_at, timezone)
    if (archivedLocal && archivedLocal <= dateStr) return false
  } else if (habit.is_archived) {
    return false
  }

  return true
}

// ── 3. Habit Completion Logic ─────────────────────────────────────────────────

/**
 * Determines whether a completion record represents a complete habit:
 * - completed = is_completed (amount habits already snapshot their target)
 * - legacy rows with null target_snapshot use is_completed
 * - checklist: complete only when all active sub-items are completed
 */
export function isHabitComplete(
  habit: ScoringHabit,
  completion?: ScoringCompletion | null,
  options?: {
    dateStr?: string
    subitems?: ScoringSubitem[]
    subitemCompletionsMap?: Map<string, boolean> | Record<string, boolean>
    timezone?: string
  }
): boolean {
  if (!completion) return false
  if (completion.is_skipped) return false

  // Legacy truthy check ('yes', 1, 'true', true)
  const rawCompleted = completion.is_completed
  const isDirectlyCompleted =
    rawCompleted === true ||
    rawCompleted === 'true' ||
    rawCompleted === 'yes' ||
    rawCompleted === 1

  // Checklist: requires all active subitems completed
  if (habit.type === 'checklist' && options?.subitems && options.subitems.length > 0) {
    const habitSubitems = options.subitems.filter((si) => {
      if (si.habit_id !== habit.id) return false
      if (options.dateStr && si.created_at) {
        const siCreatedLocal = toLocalDateString(si.created_at, options.timezone)
        return siCreatedLocal <= options.dateStr
      }
      return true
    })

    if (habitSubitems.length > 0) {
      const compMap = options.subitemCompletionsMap
      const getSubComp = (id: string): boolean => {
        if (!compMap) return false
        if (compMap instanceof Map) return compMap.get(id) === true
        return compMap[id] === true
      }
      return habitSubitems.every((si) => getSubComp(si.id))
    }
  }

  // Amount: if snapshot is present, amount >= target_snapshot
  if (habit.type === 'amount') {
    if (
      completion.target_snapshot != null &&
      completion.target_snapshot > 0 &&
      completion.amount != null
    ) {
      return completion.amount >= completion.target_snapshot
    }
    // Legacy rows with null target_snapshot use is_completed
    return isDirectlyCompleted
  }

  return isDirectlyCompleted
}

function getFromMapOrRecord<T>(
  container: Map<string, T> | Record<string, T> | undefined,
  key: string
): T | undefined {
  if (!container) return undefined
  if (container instanceof Map) return container.get(key)
  return container[key]
}

// ── 4. Daily Scoring & Perfect Day ────────────────────────────────────────────

/**
 * Computes daily score for a given calendar date:
 * - active on D = created on or before D (local), not archived on or before D, minus skips
 * - skipped habits leave both numerator and denominator
 * - perfect day = active >= 1 and completed = active
 * - day with zero active habits is neutral
 */
export function computeDailyScore(input: {
  date: string
  habits: ScoringHabit[]
  completionsMap?: Map<string, ScoringCompletion> | Record<string, ScoringCompletion>
  subitems?: ScoringSubitem[]
  subitemCompletionsMap?: Map<string, boolean> | Record<string, boolean>
  habitSkipsMap?: Map<string, boolean> | Record<string, boolean>
  timezone?: string
}): DayScoreResult {
  const { date, habits, completionsMap, subitems, subitemCompletionsMap, habitSkipsMap, timezone } = input

  let totalActive = 0
  let completedCount = 0
  let skippedCount = 0

  for (const habit of habits) {
    const completion = getFromMapOrRecord(completionsMap, habit.id)
    const isSkipped =
      getFromMapOrRecord(habitSkipsMap, habit.id) === true ||
      completion?.is_skipped === true

    const active = isHabitActiveOnDate(habit, date, isSkipped, timezone)
    if (!active) {
      if (isSkipped) skippedCount++
      continue
    }

    totalActive++

    const complete = isHabitComplete(habit, completion, {
      dateStr: date,
      subitems,
      subitemCompletionsMap,
      timezone,
    })

    if (complete) {
      completedCount++
    }
  }

  const completionPct = totalActive > 0 ? Math.round((completedCount / totalActive) * 100) : 0
  const isPerfect = totalActive >= 1 && completedCount === totalActive
  const isNeutral = totalActive === 0

  return {
    date,
    totalActive,
    completedCount,
    skippedCount,
    completionPct,
    isPerfect,
    isNeutral,
  }
}

// ── 5. Streaks (Global & Per-Habit) ───────────────────────────────────────────

/**
 * Computes streaks from a list of daily results:
 * - current streak = consecutive perfect days ending today if today is perfect, otherwise ending yesterday
 * - day with zero active habits is neutral (excluded from averages and streaks, bridges without incrementing or breaking)
 * - non-perfect, non-neutral active days break streak
 */
export function computeStreaks(
  days: DayScoreResult[],
  todayStr?: string
): StreakResult {
  if (!days || days.length === 0) {
    return { currentStreak: 0, longestStreak: 0 }
  }

  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date))
  const today = todayStr ?? (sorted[sorted.length - 1]?.date || '')
  const dayMap = new Map(sorted.map((d) => [d.date, d]))

  // 1. Longest Streak (forward scan up to today)
  let longestStreak = 0
  let currentRun = 0

  for (const day of sorted) {
    if (day.date > today) continue

    if (day.isPerfect) {
      currentRun++
      if (currentRun > longestStreak) {
        longestStreak = currentRun
      }
    } else if (day.isNeutral) {
      // Neutral day bridges streak
      continue
    } else {
      // Missed active day breaks run
      currentRun = 0
    }
  }

  // 2. Current Streak:
  // Consecutive perfect days ending today if today is perfect, otherwise ending yesterday
  const todayResult = dayMap.get(today)
  const isTodayPerfect = todayResult?.isPerfect === true

  let walkDate = isTodayPerfect ? today : addDays(today, -1)
  let currentStreak = 0
  let safety = 0
  const maxIterations = 3650

  const earliestDate = sorted[0].date

  while (walkDate >= earliestDate && safety++ < maxIterations) {
    const res = dayMap.get(walkDate)

    if (!res || res.isNeutral) {
      // Missing or neutral day bridges across without breaking
      walkDate = addDays(walkDate, -1)
      continue
    }

    if (res.isPerfect) {
      currentStreak++
      walkDate = addDays(walkDate, -1)
    } else {
      // Incomplete active day breaks streak
      break
    }
  }

  return { currentStreak, longestStreak }
}

export function calculateHabitStreaks(
  records: Map<string, HabitRecord>,
  createdDateRaw: string,
  archivedDateRaw: string | null | undefined,
  todayDate: string
): { currentStreak: number; bestStreak: number } {
  const createdDate = createdDateRaw.slice(0, 10)
  const archivedDate = archivedDateRaw ? archivedDateRaw.slice(0, 10) : null
  const effectiveEndDate = archivedDate && todayDate > archivedDate ? archivedDate : todayDate

  if (createdDate > effectiveEndDate) {
    return { currentStreak: 0, bestStreak: 0 }
  }

  // Current Streak (walking backward from today or yesterday)
  let currentStreak = 0
  let checkDate = effectiveEndDate

  const todayRecord = records.get(todayDate)
  const todayIsComplete = todayRecord?.isCompleted === true
  const todayIsSkipped = todayRecord?.isSkipped === true

  if (!todayIsComplete && !todayIsSkipped) {
    checkDate = addDays(effectiveEndDate, -1)
  }

  while (checkDate >= createdDate) {
    const rec = records.get(checkDate)
    if (rec?.isCompleted === true) {
      currentStreak++
      checkDate = addDays(checkDate, -1)
    } else if (rec?.isSkipped === true) {
      // Skipped/rest day does not break active streak; bridge across it
      checkDate = addDays(checkDate, -1)
    } else {
      break
    }
  }

  // Best Streak (lifetime consecutive run, skipping bridges)
  let bestStreak = 0
  let currentRun = 0
  let walk = createdDate

  while (walk <= effectiveEndDate) {
    const rec = records.get(walk)
    if (rec?.isCompleted === true) {
      currentRun++
      if (currentRun > bestStreak) {
        bestStreak = currentRun
      }
    } else if (rec?.isSkipped === true) {
      // Skip bridges across without incrementing or resetting run
    } else {
      currentRun = 0
    }
    walk = addDays(walk, 1)
  }

  return { currentStreak, bestStreak }
}

// ── 6. Period Averages & All-Time ─────────────────────────────────────────────

/**
 * Computes period averages over CALENDAR days:
 * - range runs from max(period start, earliest habit created date) to min(period end, today)
 * - a day with no entry counts as 0% (if active habits exist)
 * - neutral days (0 active habits) are excluded from the denominator
 * - all-time starts at the earliest habit created date
 */
export function computePeriodAverages(input: {
  startDate: string
  endDate: string
  today: string
  habits: ScoringHabit[]
  dayScoresMap: Map<string, DayScoreResult> | Record<string, DayScoreResult>
  timezone?: string
}): PeriodAverageResult {
  const { startDate, endDate, today, habits, dayScoresMap, timezone } = input

  let firstHabitCreatedLocal: string | null = null
  for (const h of habits) {
    if (h.created_at) {
      const cLocal = toLocalDateString(h.created_at, timezone)
      if (!firstHabitCreatedLocal || cLocal < firstHabitCreatedLocal) {
        firstHabitCreatedLocal = cLocal
      }
    }
  }

  const periodStart = firstHabitCreatedLocal
    ? (firstHabitCreatedLocal > startDate ? firstHabitCreatedLocal : startDate)
    : startDate

  const periodEnd = endDate < today ? endDate : today

  if (periodStart > periodEnd) {
    return {
      periodStart,
      periodEnd,
      calendarDays: 0,
      activeDays: 0,
      averagePct: 0,
    }
  }

  const allDates = generateDateRange(periodStart, periodEnd)
  let sumPct = 0
  let activeDays = 0

  for (const d of allDates) {
    let score = getFromMapOrRecord(dayScoresMap, d)
    if (!score) {
      score = computeDailyScore({
        date: d,
        habits,
        timezone,
      })
    }

    if (!score.isNeutral) {
      activeDays++
      sumPct += score.completionPct
    }
  }

  const averagePct = activeDays > 0 ? Math.round((sumPct / activeDays) * 10) / 10 : 0

  return {
    periodStart,
    periodEnd,
    calendarDays: allDates.length,
    activeDays,
    averagePct,
  }
}

// ── 7. Per-Habit Rates & Consistency ──────────────────────────────────────────

/**
 * Computes per-habit consistency rates over calendar days in a period:
 * - range runs from max(startDate, habitCreatedLocal) to min(endDate, habitArchivedLocal ?? today)
 * - skips excluded from numerator and denominator
 */
export function computeHabitRates(input: {
  habit: ScoringHabit
  startDate: string
  endDate: string
  today: string
  completionsByDate: Record<string, ScoringCompletion> | Map<string, ScoringCompletion>
  subitems?: ScoringSubitem[]
  subitemCompletionsByDate?: Record<string, Record<string, boolean>> | Map<string, Map<string, boolean>>
  timezone?: string
}): HabitRateResult {
  const { habit, startDate, endDate, today, completionsByDate, subitems, subitemCompletionsByDate, timezone } = input

  const habitCreatedLocal = habit.created_at ? toLocalDateString(habit.created_at, timezone) : startDate
  const habitArchivedLocal = habit.is_archived && habit.archived_at ? toLocalDateString(habit.archived_at, timezone) : null

  const effectiveStart = habitCreatedLocal > startDate ? habitCreatedLocal : startDate
  const effectiveEndLimit = habitArchivedLocal && habitArchivedLocal < endDate ? habitArchivedLocal : endDate
  const effectiveEnd = effectiveEndLimit < today ? effectiveEndLimit : today

  if (effectiveStart > effectiveEnd) {
    return {
      habitId: habit.id,
      activeDays: 0,
      completedDays: 0,
      skippedDays: 0,
      ratePct: 0,
    }
  }

  const dates = generateDateRange(effectiveStart, effectiveEnd)
  let activeDays = 0
  let completedDays = 0
  let skippedDays = 0

  for (const d of dates) {
    const comp = getFromMapOrRecord(completionsByDate, d)
    const isSkipped = comp?.is_skipped === true

    if (isSkipped) {
      skippedDays++
      continue
    }

    const isActive = isHabitActiveOnDate(habit, d, false, timezone)
    if (!isActive) continue

    activeDays++

    let subCompMap: Record<string, boolean> | Map<string, boolean> | undefined = undefined
    if (subitemCompletionsByDate) {
      if (subitemCompletionsByDate instanceof Map) {
        subCompMap = subitemCompletionsByDate.get(d)
      } else {
        subCompMap = (subitemCompletionsByDate as Record<string, Record<string, boolean>>)[d]
      }
    }

    const complete = isHabitComplete(habit, comp, {
      dateStr: d,
      subitems,
      subitemCompletionsMap: subCompMap,
      timezone,
    })

    if (complete) {
      completedDays++
    }
  }

  const ratePct = activeDays > 0 ? Math.round((completedDays / activeDays) * 100) : 0

  return {
    habitId: habit.id,
    activeDays,
    completedDays,
    skippedDays,
    ratePct,
  }
}

export function calculateHabitConsistency(
  records: Map<string, HabitRecord>,
  createdDateRaw: string,
  archivedDateRaw: string | null | undefined,
  todayDate: string,
  daysWindow = 90,
  rangeStartDate?: string
): {
  eligibleDays: number
  completedDays: number
  consistencyPct: number
  totalCompletions: number
} {
  const createdDate = createdDateRaw.slice(0, 10)
  const archivedDate = archivedDateRaw ? archivedDateRaw.slice(0, 10) : null

  let totalCompletions = 0
  for (const rec of records.values()) {
    if (rec.isCompleted) {
      totalCompletions++
    }
  }

  const windowEnd = archivedDate && todayDate > archivedDate ? archivedDate : todayDate
  const defaultStart = addDays(todayDate, -(daysWindow - 1))
  const requestedStart = rangeStartDate ?? defaultStart
  const windowStart = createdDate > requestedStart ? createdDate : requestedStart

  let eligibleDays = 0
  let completedDays = 0

  if (windowStart <= windowEnd) {
    let curr = windowStart
    while (curr <= windowEnd) {
      const rec = records.get(curr)
      if (rec?.isSkipped !== true) {
        eligibleDays++
        if (rec?.isCompleted === true) {
          completedDays++
        }
      }
      curr = addDays(curr, 1)
    }
  }

  const consistencyPct = eligibleDays > 0 ? Math.round((completedDays / eligibleDays) * 100) : 0

  return {
    eligibleDays,
    completedDays,
    consistencyPct,
    totalCompletions,
  }
}

// ── 8. Amount Statistics ──────────────────────────────────────────────────────

export function calculateAmountStats(
  records: Map<string, HabitRecord>,
  eligibleDaysCount: number
): {
  totalAmount: number
  averagePerDay: number
  bestDay: { date: string; amount: number } | null
} {
  let totalAmount = 0
  let maxAmount = 0
  let bestDayDate: string | null = null

  for (const [date, rec] of records.entries()) {
    const val = Number(rec.amount ?? 0)
    if (val > 0) {
      totalAmount += val
      if (val > maxAmount) {
        maxAmount = val
        bestDayDate = date
      }
    }
  }

  const roundedTotal = Math.round(totalAmount * 100) / 100
  const averagePerDay =
    eligibleDaysCount > 0 ? Math.round((roundedTotal / eligibleDaysCount) * 10) / 10 : 0

  return {
    totalAmount: roundedTotal,
    averagePerDay,
    bestDay: bestDayDate ? { date: bestDayDate, amount: maxAmount } : null,
  }
}

// ── 9. Weekday Breakdown ──────────────────────────────────────────────────────

export function calculateWeekdayBreakdown(
  records: Map<string, HabitRecord>,
  createdDateRaw: string,
  archivedDateRaw: string | null | undefined,
  todayDate: string,
  rangeStartDate?: string
): {
  weekdays: Array<{
    dayNumber: number
    dayLabel: string
    completedDays: number
    eligibleDays: number
    rate: number
  }>
  weakestWeekday: {
    dayNumber: number
    dayLabel: string
    rate: number
    completedDays: number
    eligibleDays: number
  } | null
} {
  const createdDate = createdDateRaw.slice(0, 10)
  const archivedDate = archivedDateRaw ? archivedDateRaw.slice(0, 10) : null
  const effectiveStart = rangeStartDate && rangeStartDate > createdDate ? rangeStartDate : createdDate
  const effectiveEnd = archivedDate && todayDate > archivedDate ? archivedDate : todayDate

  const eligible = [0, 0, 0, 0, 0, 0, 0, 0]
  const completed = [0, 0, 0, 0, 0, 0, 0, 0]

  if (effectiveStart <= effectiveEnd) {
    let curr = effectiveStart
    while (curr <= effectiveEnd) {
      const rec = records.get(curr)
      if (rec?.isSkipped !== true) {
        const wd = getWeekdayMon1(curr)
        eligible[wd]++
        if (rec?.isCompleted === true) {
          completed[wd]++
        }
      }
      curr = addDays(curr, 1)
    }
  }

  const weekdays = [1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
    const elig = eligible[dayNum]
    const comp = completed[dayNum]
    const rate = elig > 0 ? Math.round((comp / elig) * 100) : 0
    return {
      dayNumber: dayNum,
      dayLabel: WEEKDAY_NAMES_SHORT[dayNum],
      completedDays: comp,
      eligibleDays: elig,
      rate,
    }
  })

  let weakest: (typeof weekdays)[0] | null = null
  for (const w of weekdays) {
    if (w.eligibleDays > 0) {
      if (!weakest || w.rate < weakest.rate || (w.rate === weakest.rate && w.eligibleDays > weakest.eligibleDays)) {
        weakest = w
      }
    }
  }

  return {
    weekdays,
    weakestWeekday: weakest,
  }
}

// ── 10. Year Monthly Stats & Weekly Completions ────────────────────────────────

export function calculateYearMonthlyStats(
  records: Map<string, HabitRecord>,
  createdDateRaw: string,
  archivedDateRaw: string | null | undefined,
  year: number,
  todayDate: string
): Array<{
  month: number
  monthLabel: string
  completedDays: number
  eligibleDays: number
  rate: number
}> {
  const createdDate = createdDateRaw.slice(0, 10)
  const archivedDate = archivedDateRaw ? archivedDateRaw.slice(0, 10) : null

  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
    const daysInM = getDaysInMonth(year, m)
    let eligible = 0
    let comp = 0

    for (let d = 1; d <= daysInM; d++) {
      const dStr = formatYMD(year, m, d)
      if (dStr > todayDate) continue
      if (dStr < createdDate) continue
      if (archivedDate && dStr > archivedDate) continue

      const rec = records.get(dStr)
      if (rec?.isSkipped !== true) {
        eligible++
        if (rec?.isCompleted === true) {
          comp++
        }
      }
    }

    const rate = eligible > 0 ? Math.round((comp / eligible) * 100) : 0
    return {
      month: m,
      monthLabel: MONTH_NAMES_SHORT[m],
      completedDays: comp,
      eligibleDays: eligible,
      rate,
    }
  })
}

export function calculateWeeklyCompletions(
  records: Map<string, HabitRecord>,
  createdDateRaw: string,
  archivedDateRaw: string | null | undefined,
  todayDate: string,
  weeksBack = 12
): Array<{
  weekLabel: string
  startDate: string
  endDate: string
  completions: number
  eligibleDays: number
  rate: number
}> {
  const createdDate = createdDateRaw.slice(0, 10)
  const archivedDate = archivedDateRaw ? archivedDateRaw.slice(0, 10) : null

  const todayWd = getWeekdayMon1(todayDate)
  const currentWeekEnd = addDays(todayDate, 7 - todayWd)

  const result = []

  for (let w = weeksBack - 1; w >= 0; w--) {
    const end = addDays(currentWeekEnd, -w * 7)
    const start = addDays(end, -6)
    const { month, day } = parseYMD(start)
    const label = `${MONTH_NAMES_SHORT[month]} ${day}`

    let completions = 0
    let eligible = 0

    let d = start
    while (d <= end) {
      if (d <= todayDate && d >= createdDate && (!archivedDate || d <= archivedDate)) {
        const rec = records.get(d)
        if (rec?.isSkipped !== true) {
          eligible++
          if (rec?.isCompleted) {
            completions++
          }
        }
      }
      d = addDays(d, 1)
    }

    const rate = eligible > 0 ? Math.round((completions / eligible) * 100) : 0
    result.push({
      weekLabel: label,
      startDate: start,
      endDate: end,
      completions,
      eligibleDays: eligible,
      rate,
    })
  }

  return result
}

// ── 11. Visual Matrix Generators ──────────────────────────────────────────────

export interface YearGridCell {
  date: string
  dayOfWeek: number
  status: 'completed' | 'partial' | 'missed' | 'skipped' | 'inactive'
  amount?: number
  target?: number | null
  hasNote?: boolean
}

export function generateYearGridData(
  records: Map<string, HabitRecord>,
  notesSet: Set<string>,
  createdDateRaw: string,
  archivedDateRaw: string | null | undefined,
  todayDate: string,
  targetValue?: number | null
): {
  weeks: Array<{
    weekIndex: number
    days: YearGridCell[]
  }>
  monthHeaders: Array<{ label: string; weekIndex: number }>
} {
  const createdDate = createdDateRaw.slice(0, 10)
  const archivedDate = archivedDateRaw ? archivedDateRaw.slice(0, 10) : null

  const todayWd = getWeekdayMon1(todayDate)
  const gridEndSunday = addDays(todayDate, 7 - todayWd)
  const gridStartMonday = addDays(gridEndSunday, -(53 * 7 - 1))

  const weeks: Array<{ weekIndex: number; days: YearGridCell[] }> = []
  const monthHeaders: Array<{ label: string; weekIndex: number }> = []
  let lastMonthSeen = 0

  let curr = gridStartMonday
  for (let w = 0; w < 53; w++) {
    const days: YearGridCell[] = []

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const { month } = parseYMD(curr)
      if (dayOffset === 0 && month !== lastMonthSeen) {
        monthHeaders.push({ label: MONTH_NAMES_SHORT[month], weekIndex: w })
        lastMonthSeen = month
      }

      const rec = records.get(curr)
      const dayNum = dayOffset + 1

      let status: YearGridCell['status'] = 'missed'
      if (curr < createdDate || (archivedDate && curr > archivedDate) || curr > todayDate) {
        status = 'inactive'
      } else if (rec?.isCompleted === true) {
        status = 'completed'
      } else if (rec?.isSkipped === true) {
        status = 'skipped'
      } else if (rec?.amount && rec.amount > 0) {
        status = 'partial'
      } else {
        status = 'missed'
      }

      days.push({
        date: curr,
        dayOfWeek: dayNum,
        status,
        amount: rec?.amount,
        target: rec?.targetSnapshot ?? targetValue ?? null,
        hasNote: notesSet.has(curr),
      })

      curr = addDays(curr, 1)
    }

    weeks.push({ weekIndex: w, days })
  }

  return { weeks, monthHeaders }
}

export interface MonthCalendarCell {
  date: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  status: 'completed' | 'partial' | 'missed' | 'skipped' | 'inactive'
  amount?: number
  target?: number | null
  hasNote?: boolean
}

export function generateMonthCalendarData(
  records: Map<string, HabitRecord>,
  notesSet: Set<string>,
  createdDateRaw: string,
  archivedDateRaw: string | null | undefined,
  year: number,
  month: number,
  todayDate: string,
  targetValue?: number | null
): MonthCalendarCell[] {
  const createdDate = createdDateRaw.slice(0, 10)
  const archivedDate = archivedDateRaw ? archivedDateRaw.slice(0, 10) : null
  const daysInM = getDaysInMonth(year, month)

  const firstDayStr = formatYMD(year, month, 1)
  const firstDayWd = getWeekdayMon1(firstDayStr)
  const prevMonthPaddingDays = firstDayWd - 1

  const cells: MonthCalendarCell[] = []

  if (prevMonthPaddingDays > 0) {
    const prevMonthStartDate = addDays(firstDayStr, -prevMonthPaddingDays)
    let d = prevMonthStartDate
    while (d < firstDayStr) {
      const { day } = parseYMD(d)
      cells.push({
        date: d,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: d === todayDate,
        status: 'inactive',
        hasNote: notesSet.has(d),
      })
      d = addDays(d, 1)
    }
  }

  for (let day = 1; day <= daysInM; day++) {
    const dStr = formatYMD(year, month, day)
    const rec = records.get(dStr)

    let status: MonthCalendarCell['status'] = 'missed'
    if (dStr < createdDate || (archivedDate && dStr > archivedDate) || dStr > todayDate) {
      status = 'inactive'
    } else if (rec?.isCompleted === true) {
      status = 'completed'
    } else if (rec?.isSkipped === true) {
      status = 'skipped'
    } else if (rec?.amount && rec.amount > 0) {
      status = 'partial'
    } else {
      status = 'missed'
    }

    cells.push({
      date: dStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dStr === todayDate,
      status,
      amount: rec?.amount,
      target: rec?.targetSnapshot ?? targetValue ?? null,
      hasNote: notesSet.has(dStr),
    })
  }

  const remainder = cells.length % 7
  if (remainder > 0) {
    const trailingCount = 7 - remainder
    let nextD = addDays(formatYMD(year, month, daysInM), 1)
    for (let t = 0; t < trailingCount; t++) {
      const { day } = parseYMD(nextD)
      cells.push({
        date: nextD,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: nextD === todayDate,
        status: 'inactive',
        hasNote: notesSet.has(nextD),
      })
      nextD = addDays(nextD, 1)
    }
  }

  return cells
}
