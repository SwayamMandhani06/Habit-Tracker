// test/habit-math.test.ts — Unit tests for pure habit statistical calculations
import { describe, it, expect } from 'vitest'
import {
  parseYMD,
  formatYMD,
  addDays,
  diffInDays,
  getWeekdayMon1,
  isLeapYear,
  getDaysInMonth,
  calculateHabitStreaks,
  calculateHabitConsistency,
  calculateAmountStats,
  calculateWeekdayBreakdown,
  calculateYearMonthlyStats,
  calculateWeeklyCompletions,
  type HabitRecord,
} from '../lib/stats/habit-math'

describe('Pure Date Math (Local Calendar, Zero UTC Derivations)', () => {
  it('correctly maps weekdays with Monday as day 1 and Sunday as day 7', () => {
    // 2026-10-26 is Monday
    expect(getWeekdayMon1('2026-10-26')).toBe(1)
    // 2026-10-27 is Tuesday
    expect(getWeekdayMon1('2026-10-27')).toBe(2)
    // 2026-10-28 is Wednesday
    expect(getWeekdayMon1('2026-10-28')).toBe(3)
    // 2026-10-29 is Thursday
    expect(getWeekdayMon1('2026-10-29')).toBe(4)
    // 2026-10-30 is Friday
    expect(getWeekdayMon1('2026-10-30')).toBe(5)
    // 2026-10-31 is Saturday
    expect(getWeekdayMon1('2026-10-31')).toBe(6)
    // 2026-11-01 is Sunday
    expect(getWeekdayMon1('2026-11-01')).toBe(7)
  })

  it('handles leap day transitions accurately (Feb 28 -> Feb 29 -> Mar 1 in leap year)', () => {
    expect(isLeapYear(2024)).toBe(true)
    expect(isLeapYear(2025)).toBe(false)
    expect(isLeapYear(2028)).toBe(true)

    expect(getDaysInMonth(2024, 2)).toBe(29)
    expect(getDaysInMonth(2025, 2)).toBe(28)

    // Stepping across leap day
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01')
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29')

    // In non-leap year
    expect(addDays('2025-02-28', 1)).toBe('2025-03-01')
  })

  it('handles year boundary transitions (Dec 31 -> Jan 1)', () => {
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })
})

describe('Streak Calculations Across Boundaries', () => {
  it('maintains streak across month boundary (Jan 30 -> Feb 2)', () => {
    const records = new Map<string, HabitRecord>([
      ['2026-01-30', { isCompleted: true }],
      ['2026-01-31', { isCompleted: true }],
      ['2026-02-01', { isCompleted: true }],
      ['2026-02-02', { isCompleted: true }],
    ])

    const { currentStreak, bestStreak } = calculateHabitStreaks(
      records,
      '2026-01-01',
      null,
      '2026-02-02'
    )

    expect(currentStreak).toBe(4)
    expect(bestStreak).toBe(4)
  })

  it('maintains streak across year boundary (Dec 30 -> Jan 2)', () => {
    const records = new Map<string, HabitRecord>([
      ['2025-12-30', { isCompleted: true }],
      ['2025-12-31', { isCompleted: true }],
      ['2026-01-01', { isCompleted: true }],
      ['2026-01-02', { isCompleted: true }],
    ])

    const { currentStreak, bestStreak } = calculateHabitStreaks(
      records,
      '2025-12-01',
      null,
      '2026-01-02'
    )

    expect(currentStreak).toBe(4)
    expect(bestStreak).toBe(4)
  })

  it('maintains streak across leap day (Feb 28 -> Feb 29 -> Mar 1 in 2024)', () => {
    const records = new Map<string, HabitRecord>([
      ['2024-02-27', { isCompleted: true }],
      ['2024-02-28', { isCompleted: true }],
      ['2024-02-29', { isCompleted: true }],
      ['2024-03-01', { isCompleted: true }],
    ])

    const { currentStreak, bestStreak } = calculateHabitStreaks(
      records,
      '2024-01-01',
      null,
      '2024-03-01'
    )

    expect(currentStreak).toBe(4)
    expect(bestStreak).toBe(4)
  })

  it('bridges across skipped days without breaking or inflating streak', () => {
    const records = new Map<string, HabitRecord>([
      ['2026-10-25', { isCompleted: true }],
      ['2026-10-26', { isCompleted: true }],
      ['2026-10-27', { isCompleted: false, isSkipped: true }], // Rest day
      ['2026-10-28', { isCompleted: true }],
      ['2026-10-29', { isCompleted: true }],
    ])

    const { currentStreak, bestStreak } = calculateHabitStreaks(
      records,
      '2026-10-01',
      null,
      '2026-10-29'
    )

    // 4 completed days bridged across 1 skipped day
    expect(currentStreak).toBe(4)
    expect(bestStreak).toBe(4)
  })

  it('stops streak when habit reaches createdDate (days before creation are excluded, not missed)', () => {
    const records = new Map<string, HabitRecord>([
      ['2026-10-25', { isCompleted: true }],
      ['2026-10-26', { isCompleted: true }],
    ])

    // Habit created on Oct 25, 2026
    const { currentStreak, bestStreak } = calculateHabitStreaks(
      records,
      '2026-10-25',
      null,
      '2026-10-26'
    )

    expect(currentStreak).toBe(2)
    expect(bestStreak).toBe(2)
  })

  it('evaluates current streak from yesterday if today is not yet completed', () => {
    const records = new Map<string, HabitRecord>([
      ['2026-10-27', { isCompleted: true }],
      ['2026-10-28', { isCompleted: true }],
      // Today (10-29) is still in progress / incomplete
    ])

    const { currentStreak } = calculateHabitStreaks(
      records,
      '2026-10-01',
      null,
      '2026-10-29'
    )

    // Today is in progress, so active streak is 2 from yesterday
    expect(currentStreak).toBe(2)
  })

  it('drops current streak to 0 if yesterday was missed and today is incomplete', () => {
    const records = new Map<string, HabitRecord>([
      ['2026-10-26', { isCompleted: true }],
      // Yesterday 10-27 was missed
      // Today 10-28 is incomplete
    ])

    const { currentStreak, bestStreak } = calculateHabitStreaks(
      records,
      '2026-10-01',
      null,
      '2026-10-28'
    )

    expect(currentStreak).toBe(0)
    expect(bestStreak).toBe(1)
  })
})

describe('Consistency & Edge Cases (Mid-Range Creation, Archival)', () => {
  it('excludes days before habit creation from eligible days (never counts them as missed)', () => {
    // Habit created 10 days ago (2026-10-20), completed all 10 days
    const records = new Map<string, HabitRecord>()
    for (let d = 20; d <= 29; d++) {
      records.set(`2026-10-${d}`, { isCompleted: true })
    }

    const stats = calculateHabitConsistency(
      records,
      '2026-10-20',
      null,
      '2026-10-29',
      90
    )

    // Even though window is 90 days, habit only existed for 10 days
    expect(stats.eligibleDays).toBe(10)
    expect(stats.completedDays).toBe(10)
    expect(stats.consistencyPct).toBe(100)
    expect(stats.totalCompletions).toBe(10)
  })

  it('excludes days after habit archival from eligible days', () => {
    // Habit created 2026-10-01, archived on 2026-10-10, today is 2026-10-29
    const records = new Map<string, HabitRecord>()
    for (let d = 1; d <= 10; d++) {
      const dStr = `2026-10-${String(d).padStart(2, '0')}`
      records.set(dStr, { isCompleted: d % 2 === 0 }) // 5 completed
    }

    const stats = calculateHabitConsistency(
      records,
      '2026-10-01',
      '2026-10-10',
      '2026-10-29',
      90
    )

    // Days 11..29 are after archival, so eligible days = 10
    expect(stats.eligibleDays).toBe(10)
    expect(stats.completedDays).toBe(5)
    expect(stats.consistencyPct).toBe(50)
  })

  it('excludes skipped days from consistency calculation', () => {
    // 5 days: 3 completed, 1 skipped, 1 missed
    const records = new Map<string, HabitRecord>([
      ['2026-10-01', { isCompleted: true }],
      ['2026-10-02', { isCompleted: true }],
      ['2026-10-03', { isCompleted: false, isSkipped: true }], // Rest day
      ['2026-10-04', { isCompleted: true }],
      ['2026-10-05', { isCompleted: false }], // Missed
    ])

    const stats = calculateHabitConsistency(
      records,
      '2026-10-01',
      null,
      '2026-10-05',
      90
    )

    // Eligible days = 4 (skipped day excluded). Completed = 3. Pct = 3/4 = 75%
    expect(stats.eligibleDays).toBe(4)
    expect(stats.completedDays).toBe(3)
    expect(stats.consistencyPct).toBe(75)
  })
  it('bridges streak across a skipped leap day (Feb 28 done, Feb 29 skipped, Mar 1 done in 2024)', () => {
    const records = new Map<string, HabitRecord>([
      ['2024-02-28', { isCompleted: true }],
      ['2024-02-29', { isCompleted: false, isSkipped: true }],
      ['2024-03-01', { isCompleted: true }],
    ])

    const { currentStreak, bestStreak } = calculateHabitStreaks(
      records,
      '2024-02-01',
      null,
      '2024-03-01'
    )

    expect(currentStreak).toBe(2)
    expect(bestStreak).toBe(2)
  })

  it('correctly computes custom range consistency with rangeStartDate and archivedDate', () => {
    // Habit created 2026-09-01, archived 2026-10-15
    // Requested range: 2026-10-01 to 2026-10-20
    // Active range should only be 2026-10-01 to 2026-10-15 (15 days)
    const records = new Map<string, HabitRecord>()
    for (let d = 1; d <= 10; d++) {
      const dStr = `2026-10-${String(d).padStart(2, '0')}`
      records.set(dStr, { isCompleted: true })
    }

    const stats = calculateHabitConsistency(
      records,
      '2026-09-01',
      '2026-10-15',
      '2026-10-20',
      undefined,
      '2026-10-01'
    )

    expect(stats.eligibleDays).toBe(15)
    expect(stats.completedDays).toBe(10)
    expect(stats.consistencyPct).toBe(67) // 10/15 = 66.67% -> 67%
  })
})

describe('Weekday Breakdown & Weakest Day Identification', () => {
  it('correctly attributes completions to weekdays and identifies weakest day', () => {
    // 2 Mondays (Oct 19, Oct 26), 2 Tuesdays (Oct 20, Oct 27)
    const records = new Map<string, HabitRecord>([
      ['2026-10-19', { isCompleted: true }],  // Mon
      ['2026-10-26', { isCompleted: true }],  // Mon (100%)
      ['2026-10-20', { isCompleted: false }], // Tue (missed)
      ['2026-10-27', { isCompleted: false }], // Tue (missed, 0%)
    ])

    const { weekdays, weakestWeekday } = calculateWeekdayBreakdown(
      records,
      '2026-10-19',
      null,
      '2026-10-27'
    )

    const mon = weekdays.find(w => w.dayNumber === 1)
    const tue = weekdays.find(w => w.dayNumber === 2)

    expect(mon?.rate).toBe(100)
    expect(tue?.rate).toBe(0)
    expect(weakestWeekday?.dayNumber).toBe(2)
    expect(weakestWeekday?.dayLabel).toBe('Tue')
  })
})

describe('Amount Habit Calculations', () => {
  it('calculates total amount, average per day, and best day accurately', () => {
    const records = new Map<string, HabitRecord>([
      ['2026-10-21', { isCompleted: true, amount: 4 }],
      ['2026-10-22', { isCompleted: true, amount: 6 }],
      ['2026-10-23', { isCompleted: false, amount: 2 }],
    ])

    const stats = calculateAmountStats(records, 3)

    expect(stats.totalAmount).toBe(12)
    expect(stats.averagePerDay).toBe(4)
    expect(stats.bestDay?.date).toBe('2026-10-22')
    expect(stats.bestDay?.amount).toBe(6)
  })
})
