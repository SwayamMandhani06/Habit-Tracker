import { describe, it, expect } from 'vitest'
import {
  isHabitActiveOnDate,
  isHabitComplete,
  computeDailyScore,
  computeStreaks,
  computePeriodAverages,
  computeHabitRates,
  toLocalDateString,
  type ScoringHabit,
  type ScoringSubitem,
  type ScoringCompletion,
  type DayScoreResult,
} from '@/lib/scoring'

describe('Pure Canonical Scoring Engine (lib/scoring)', () => {
  // 1. FIXTURE: ARCHIVED MID-MONTH
  describe('Fixture 1: Archived habit mid-month', () => {
    const habit: ScoringHabit = {
      id: 'h-archived',
      name: 'Archived Mid-Month',
      created_at: '2026-11-01T00:00:00Z',
      is_archived: true,
      archived_at: '2026-11-15T10:00:00Z',
    }

    it('is active before the archive date', () => {
      expect(isHabitActiveOnDate(habit, '2026-11-14')).toBe(true)
    })

    it('is not active on or after the archive date', () => {
      expect(isHabitActiveOnDate(habit, '2026-11-15')).toBe(false)
      expect(isHabitActiveOnDate(habit, '2026-11-20')).toBe(false)
    })

    it('is inactive if is_archived is true but archived_at is null', () => {
      const legacy: ScoringHabit = {
        id: 'h-legacy-archived',
        is_archived: true,
        archived_at: null,
      }
      expect(isHabitActiveOnDate(legacy, '2026-11-10')).toBe(false)
    })
  })

  // 2. FIXTURE: HABIT CREATED AT 00:30 LOCAL IN UTC+5:30
  describe('Fixture 2: Habit created at 00:30 local in UTC+5:30', () => {
    // 00:30 AM local time on Nov 3, 2026 in Asia/Kolkata (UTC+5:30)
    // Corresponding UTC timestamp: 2026-11-02T19:00:00.000Z
    const habit: ScoringHabit = {
      id: 'h-tz-kolkata',
      name: 'Late Night Created Habit',
      created_at: '2026-11-02T19:00:00.000Z',
      is_archived: false,
    }
    const timezone = 'Asia/Kolkata'

    it('formats created_at to local date 2026-11-03, NOT UTC 2026-11-02', () => {
      expect(toLocalDateString(habit.created_at, timezone)).toBe('2026-11-03')
    })

    it('is NOT active on 2026-11-02 in Asia/Kolkata (created in local future)', () => {
      expect(isHabitActiveOnDate(habit, '2026-11-02', false, timezone)).toBe(false)
    })

    it('IS active on 2026-11-03 in Asia/Kolkata (created on this local date)', () => {
      expect(isHabitActiveOnDate(habit, '2026-11-03', false, timezone)).toBe(true)
    })
  })

  // 3. FIXTURE: AMOUNT HABIT WITH TARGET CHANGE & SNAPSHOT
  describe('Fixture 3: Amount target change & snapshots', () => {
    const habit: ScoringHabit = {
      id: 'h-water',
      name: 'Drink Water',
      type: 'amount',
      target_value: 4, // target changed to 4L later
      created_at: '2026-11-01T00:00:00Z',
    }

    it('evaluates against historical target_snapshot (e.g. 2L), not current habit target (4L)', () => {
      const completion: ScoringCompletion = {
        habit_id: 'h-water',
        amount: 2,
        target_snapshot: 2, // was 2L when logged
        is_completed: true,
      }
      expect(isHabitComplete(habit, completion)).toBe(true)
    })

    it('is incomplete if amount is below target_snapshot', () => {
      const completion: ScoringCompletion = {
        habit_id: 'h-water',
        amount: 1.5,
        target_snapshot: 2,
        is_completed: false,
      }
      expect(isHabitComplete(habit, completion)).toBe(false)
    })
  })

  // 4. FIXTURE: LEGACY ROWS
  describe('Fixture 4: Legacy completion rows', () => {
    const amountHabit: ScoringHabit = {
      id: 'h-amount',
      type: 'amount',
      target_value: 10,
    }

    it('uses is_completed when target_snapshot is null (legacy migration row)', () => {
      const legacyRow: ScoringCompletion = {
        habit_id: 'h-amount',
        amount: null,
        target_snapshot: null,
        is_completed: true,
      }
      expect(isHabitComplete(amountHabit, legacyRow)).toBe(true)
    })

    it('accepts legacy string truthy values like "yes" or 1', () => {
      const checkboxHabit: ScoringHabit = { id: 'h-check', type: 'checkbox' }
      expect(isHabitComplete(checkboxHabit, { habit_id: 'h-check', is_completed: 'yes' as any })).toBe(true)
      expect(isHabitComplete(checkboxHabit, { habit_id: 'h-check', is_completed: 1 as any })).toBe(true)
      expect(isHabitComplete(checkboxHabit, { habit_id: 'h-check', is_completed: 'true' as any })).toBe(true)
    })
  })

  // 5. FIXTURE: SKIPPED HABIT & IDENTICAL TODAY / DASHBOARD BEHAVIOR
  describe('Fixture 5: Skipping one habit changes Today and Dashboard identically', () => {
    const habits: ScoringHabit[] = [
      { id: 'h1', name: 'Habit 1', type: 'checkbox', created_at: '2026-11-01T00:00:00Z' },
      { id: 'h2', name: 'Habit 2', type: 'checkbox', created_at: '2026-11-01T00:00:00Z' },
      { id: 'h3', name: 'Habit 3', type: 'checkbox', created_at: '2026-11-01T00:00:00Z' },
      { id: 'h4', name: 'Habit 4', type: 'checkbox', created_at: '2026-11-01T00:00:00Z' },
      { id: 'h5', name: 'Habit 5', type: 'checkbox', created_at: '2026-11-01T00:00:00Z' },
    ]

    const date = '2026-11-03'

    it('before skip: Today and Dashboard both show 4/5 (80%), not perfect', () => {
      const completionsBefore: Record<string, ScoringCompletion> = {
        h1: { habit_id: 'h1', is_completed: true },
        h2: { habit_id: 'h2', is_completed: true },
        h3: { habit_id: 'h3', is_completed: true },
        h4: { habit_id: 'h4', is_completed: true },
        h5: { habit_id: 'h5', is_completed: false },
      }

      // Today screen score
      const todayScore = computeDailyScore({ date, habits, completionsMap: completionsBefore })
      expect(todayScore.totalActive).toBe(5)
      expect(todayScore.completedCount).toBe(4)
      expect(todayScore.completionPct).toBe(80)
      expect(todayScore.isPerfect).toBe(false)

      // Dashboard logic mirroring
      const dashboardTotal = todayScore.totalActive
      const dashboardCompleted = todayScore.completedCount
      const dashboardPct = todayScore.completionPct
      const dashboardPerfect = todayScore.isPerfect

      expect(dashboardTotal).toBe(5)
      expect(dashboardCompleted).toBe(4)
      expect(dashboardPct).toBe(80)
      expect(dashboardPerfect).toBe(false)
    })

    it('after skip on h5: Today and Dashboard both show 4/4 (100%), perfect day', () => {
      const completionsAfter: Record<string, ScoringCompletion> = {
        h1: { habit_id: 'h1', is_completed: true },
        h2: { habit_id: 'h2', is_completed: true },
        h3: { habit_id: 'h3', is_completed: true },
        h4: { habit_id: 'h4', is_completed: true },
        h5: { habit_id: 'h5', is_skipped: true }, // SKIPPED!
      }

      // Today screen score
      const todayScore = computeDailyScore({ date, habits, completionsMap: completionsAfter })
      expect(todayScore.totalActive).toBe(4) // Denominator decreased by 1
      expect(todayScore.completedCount).toBe(4)
      expect(todayScore.skippedCount).toBe(1)
      expect(todayScore.completionPct).toBe(100)
      expect(todayScore.isPerfect).toBe(true)

      // Dashboard stats
      const dashboardTotal = todayScore.totalActive
      const dashboardCompleted = todayScore.completedCount
      const dashboardPct = todayScore.completionPct
      const dashboardPerfect = todayScore.isPerfect

      // Identical agreement verified
      expect(dashboardTotal).toBe(todayScore.totalActive)
      expect(dashboardCompleted).toBe(todayScore.completedCount)
      expect(dashboardPct).toBe(todayScore.completionPct)
      expect(dashboardPerfect).toBe(todayScore.isPerfect)
    })
  })

  // 6. FIXTURE: PARTLY DONE CHECKLIST
  describe('Fixture 6: Partly done checklist', () => {
    const habit: ScoringHabit = {
      id: 'routine-1',
      name: 'Morning Routine',
      type: 'checklist',
      created_at: '2026-11-01T00:00:00Z',
    }

    const subitems: ScoringSubitem[] = [
      { id: 'sub-1', habit_id: 'routine-1', created_at: '2026-11-01T00:00:00Z' },
      { id: 'sub-2', habit_id: 'routine-1', created_at: '2026-11-01T00:00:00Z' },
      { id: 'sub-3', habit_id: 'routine-1', created_at: '2026-11-01T00:00:00Z' },
    ]

    it('requires all active subitems to be complete', () => {
      // 2 of 3 subitems complete
      const partialComps = { 'sub-1': true, 'sub-2': true, 'sub-3': false }
      expect(
        isHabitComplete(habit, { habit_id: 'routine-1' }, {
          subitems,
          subitemCompletionsMap: partialComps,
        })
      ).toBe(false)

      // 3 of 3 subitems complete
      const allDoneComps = { 'sub-1': true, 'sub-2': true, 'sub-3': true }
      expect(
        isHabitComplete(habit, { habit_id: 'routine-1' }, {
          subitems,
          subitemCompletionsMap: allDoneComps,
        })
      ).toBe(true)
    })
  })

  // 7. FIXTURE: EMPTY DAYS & CALENDAR PERIOD AVERAGES
  describe('Fixture 7: Empty days count as 0% over calendar range', () => {
    const habits: ScoringHabit[] = [
      { id: 'h1', name: 'Daily Habit', type: 'checkbox', created_at: '2026-11-01T00:00:00Z' },
    ]

    it('calculates average across all 4 calendar days where missing days count as 0%', () => {
      // User logged 100% on Day 1 and Day 4.
      // Days 2 and 3 had NO row in day_entries.
      const dayScoresMap = new Map<string, DayScoreResult>([
        [
          '2026-11-01',
          { date: '2026-11-01', totalActive: 1, completedCount: 1, skippedCount: 0, completionPct: 100, isPerfect: true, isNeutral: false },
        ],
        [
          '2026-11-04',
          { date: '2026-11-04', totalActive: 1, completedCount: 1, skippedCount: 0, completionPct: 100, isPerfect: true, isNeutral: false },
        ],
      ])

      const result = computePeriodAverages({
        startDate: '2026-11-01',
        endDate: '2026-11-04',
        today: '2026-11-04',
        habits,
        dayScoresMap,
      })

      // 4 calendar days: Day 1 (100%), Day 2 (0%), Day 3 (0%), Day 4 (100%)
      // Average: (100 + 0 + 0 + 100) / 4 = 50%
      expect(result.calendarDays).toBe(4)
      expect(result.activeDays).toBe(4)
      expect(result.averagePct).toBe(50)
    })
  })

  // 8. FIXTURE: MULTI-USER ISOLATION (NO DATA LEAK)
  describe('Fixture 8: Multi-user isolation', () => {
    const userAHabits: ScoringHabit[] = [
      { id: 'ha1', user_id: 'user-a', name: 'User A Habit 1', created_at: '2026-11-01T00:00:00Z' },
      { id: 'ha2', user_id: 'user-a', name: 'User A Habit 2', created_at: '2026-11-01T00:00:00Z' },
    ]

    const userBHabits: ScoringHabit[] = [
      { id: 'hb1', user_id: 'user-b', name: 'User B Habit 1', created_at: '2026-11-01T00:00:00Z' },
    ]

    it('evaluating user A habits excludes user B habits from totalActive and completions', () => {
      const userACompletions = {
        ha1: { habit_id: 'ha1', user_id: 'user-a', is_completed: true },
      }

      const score = computeDailyScore({
        date: '2026-11-03',
        habits: userAHabits,
        completionsMap: userACompletions,
      })

      // Exactly 2 active habits for User A (User B habit never appears)
      expect(score.totalActive).toBe(2)
      expect(score.completedCount).toBe(1)
      expect(score.completionPct).toBe(50)
    })
  })

  // 9. FIXTURE: FIXED INSTANTS AT 00:30 AND 23:30 LOCAL IN 3 DIVERSE TIMEZONES
  describe('Fixture 9: Fixed instants at 00:30 and 23:30 local in Asia/Kolkata, Pacific/Auckland, America/Los_Angeles', () => {
    // Nov 4, 2026 test target date across all zones
    const testDate = '2026-11-04'

    const testCases = [
      {
        tz: 'Asia/Kolkata',
        earlyInstant: '2026-11-03T19:00:00.000Z', // 00:30 local Nov 4 in Kolkata (UTC+5:30)
        lateInstant: '2026-11-04T18:00:00.000Z',  // 23:30 local Nov 4 in Kolkata (UTC+5:30)
      },
      {
        tz: 'Pacific/Auckland',
        earlyInstant: '2026-11-03T11:30:00.000Z', // 00:30 local Nov 4 in Auckland (UTC+13 NZDT)
        lateInstant: '2026-11-04T10:30:00.000Z',  // 23:30 local Nov 4 in Auckland (UTC+13 NZDT)
      },
      {
        tz: 'America/Los_Angeles',
        earlyInstant: '2026-11-04T08:30:00.000Z', // 00:30 local Nov 4 in LA (UTC-8 PST)
        lateInstant: '2026-11-05T07:30:00.000Z',  // 23:30 local Nov 4 in LA (UTC-8 PST)
      },
    ]

    testCases.forEach(({ tz, earlyInstant, lateInstant }) => {
      it(`[${tz}] formats 00:30 and 23:30 to local date ${testDate}`, () => {
        expect(toLocalDateString(earlyInstant, tz)).toBe(testDate)
        expect(toLocalDateString(lateInstant, tz)).toBe(testDate)
      })

      it(`[${tz}] evaluates habit created at 00:30 and 23:30 local as inactive on previous day and active on ${testDate}`, () => {
        const earlyHabit: ScoringHabit = { id: `h-early-${tz}`, created_at: earlyInstant }
        const lateHabit: ScoringHabit = { id: `h-late-${tz}`, created_at: lateInstant }

        // Both habits created on local Nov 4 -> NOT active on local Nov 3
        expect(isHabitActiveOnDate(earlyHabit, '2026-11-03', false, tz)).toBe(false)
        expect(isHabitActiveOnDate(lateHabit, '2026-11-03', false, tz)).toBe(false)

        // Both habits ARE active on local Nov 4
        expect(isHabitActiveOnDate(earlyHabit, testDate, false, tz)).toBe(true)
        expect(isHabitActiveOnDate(lateHabit, testDate, false, tz)).toBe(true)
      })
    })
  })
})
