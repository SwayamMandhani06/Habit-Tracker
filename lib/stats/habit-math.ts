// lib/stats/habit-math.ts — Pure statistics, streak calculations, and date mathematics
// Zero React, Zero DB dependencies. All dates are local calendar 'YYYY-MM-DD' strings.
// Never derives a day from a UTC Date.

export interface HabitRecord {
  isCompleted: boolean
  isSkipped?: boolean
  amount?: number
  targetSnapshot?: number | null
}

const MONTH_NAMES_SHORT = [
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

const WEEKDAY_NAMES_SHORT = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ── 1. Pure Date Math (Local Calendar YYYY-MM-DD) ────────────────────────────

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
  while (curr <= endDate) {
    result.push(curr)
    curr = addDays(curr, 1)
  }
  return result
}

// ── 2. Streaks Calculation ───────────────────────────────────────────────────

export function calculateHabitStreaks(
  records: Map<string, HabitRecord>,
  createdDateRaw: string,
  archivedDateRaw: string | null | undefined,
  todayDate: string
): { currentStreak: number; bestStreak: number } {
  const createdDate = createdDateRaw.slice(0, 10)
  const archivedDate = archivedDateRaw ? archivedDateRaw.slice(0, 10) : null
  const effectiveEndDate = archivedDate && todayDate > archivedDate ? archivedDate : todayDate

  // If habit was created after today, streaks are 0
  if (createdDate > effectiveEndDate) {
    return { currentStreak: 0, bestStreak: 0 }
  }

  // A. Current Streak (walking backward from today or yesterday)
  let currentStreak = 0
  let checkDate = effectiveEndDate

  const todayRecord = records.get(todayDate)
  const todayIsComplete = todayRecord?.isCompleted === true
  const todayIsSkipped = todayRecord?.isSkipped === true

  // If today is not completed and not skipped, start streak evaluation from yesterday
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
      // Missed day breaks current streak
      break
    }
  }

  // B. Best Streak (lifetime consecutive run, skipping bridges)
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

// ── 3. Consistency (90-day & Custom Range) ───────────────────────────────────

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

  // 1. Total completions across all records
  let totalCompletions = 0
  for (const rec of records.values()) {
    if (rec.isCompleted) {
      totalCompletions++
    }
  }

  // 2. Window bounds
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

// ── 4. Amount Habit Statistics ───────────────────────────────────────────────

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

// ── 5. Weekday Breakdown (Monday = 1 ... Sunday = 7) ─────────────────────────

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

  const eligible = [0, 0, 0, 0, 0, 0, 0, 0] // index 1..7
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

  // Weakest weekday: lowest completion rate among eligible weekdays
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

// ── 6. Monthly Completions for the Year (Jan to Dec) ─────────────────────────

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

// ── 7. Weekly Completions ────────────────────────────────────────────────────

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

  // Align todayDate to the end of the current week (Sunday)
  const todayWd = getWeekdayMon1(todayDate) // 1..7
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

// ── 8. 53 x 7 Year Grid Matrix ───────────────────────────────────────────────

export interface YearGridCell {
  date: string
  dayOfWeek: number // 1..7 (Mon..Sun)
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

  // 53 weeks ending on the current week's Sunday
  const todayWd = getWeekdayMon1(todayDate) // 1..7
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
      const dayNum = dayOffset + 1 // 1..7

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

// ── 9. Month Calendar Grid (Interactive Month Sheet) ─────────────────────────

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
  const firstDayWd = getWeekdayMon1(firstDayStr) // Mon=1..Sun=7
  const prevMonthPaddingDays = firstDayWd - 1

  const cells: MonthCalendarCell[] = []

  // Padding days from previous month
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

  // Days of current month
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

  // Trailing days to round out 35 or 42 grid cells
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
