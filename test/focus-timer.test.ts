// test/focus-timer.test.ts — Unit tests for Focus Timer time calculations and persistence
import { describe, it, expect } from 'vitest'
import {
  calculateFocusTime,
  pauseFocusSession,
  resumeFocusSession,
  createFocusSession,
  sanitizeDurationSeconds,
  formatTimerDigits,
  convertDurationToHabitAmount,
  type FocusSessionState,
} from '../lib/focus/timer-math'

describe('Focus Timer Pure Math & Background Tab Immunity', () => {
  it('calculates exact remaining time from timestamps without drift', () => {
    const startedAt = 1000000
    const state: FocusSessionState = {
      sessionId: 'test-uuid-1',
      startedAt,
      plannedSeconds: 1500, // 25 min
      mode: 'countdown',
      habitId: null,
      pausedAt: null,
      accumulatedPausedMs: 0,
    }

    // After 10 seconds (10,000ms)
    const t1 = calculateFocusTime(state, startedAt + 10000)
    expect(t1.remainingSeconds).toBe(1490)
    expect(t1.displayMinutes).toBe(24)
    expect(t1.displaySeconds).toBe(50)
    expect(t1.isFinished).toBe(false)

    // After 60 seconds in throttled background tab
    const t2 = calculateFocusTime(state, startedAt + 60000)
    expect(t2.remainingSeconds).toBe(1440)
    expect(t2.displayMinutes).toBe(24)
    expect(t2.displaySeconds).toBe(0)

    // At exact finish (25 minutes = 1,500,000ms)
    const t3 = calculateFocusTime(state, startedAt + 1500000)
    expect(t3.remainingSeconds).toBe(0)
    expect(t3.isFinished).toBe(true)
    expect(t3.progressPct).toBe(100)
  })

  it('correctly handles pause and resume with accumulated paused time', () => {
    const startedAt = 1000000
    let state = createFocusSession({
      sessionId: 'test-uuid-2',
      plannedSeconds: 1500,
      mode: 'countdown',
      now: startedAt,
    })

    // Run for 30 seconds
    const now1 = startedAt + 30000
    const timeBeforePause = calculateFocusTime(state, now1)
    expect(timeBeforePause.remainingSeconds).toBe(1470)

    // Pause at +30s
    state = pauseFocusSession(state, now1)
    expect(state.pausedAt).toBe(now1)

    // While paused, advancing time does NOT reduce remaining time
    const pausedTime1 = calculateFocusTime(state, now1 + 45000) // 45 seconds later
    expect(pausedTime1.remainingSeconds).toBe(1470) // Still 1470!

    // Resume after 60 seconds of pause (at now1 + 60000)
    const resumeTime = now1 + 60000
    state = resumeFocusSession(state, resumeTime)
    expect(state.pausedAt).toBeNull()
    expect(state.accumulatedPausedMs).toBe(60000)

    // Run for another 10 seconds after resume
    const now2 = resumeTime + 10000
    const timeAfterResume = calculateFocusTime(state, now2)
    // Total elapsed wall time: 30s active + 60s paused + 10s active = 100s
    // Active elapsed time: 40s
    expect(timeAfterResume.elapsedSeconds).toBe(40)
    expect(timeAfterResume.remainingSeconds).toBe(1460) // 1500 - 40 = 1460
  })

  it('correctly restores state after reload from serialized JSON', () => {
    const startedAt = 5000000
    const originalState: FocusSessionState = {
      sessionId: 'session-rehydrate-uuid',
      startedAt,
      plannedSeconds: 1500,
      mode: 'pomodoro',
      habitId: 'deep-work-habit',
      pausedAt: startedAt + 20000, // paused 20s in
      accumulatedPausedMs: 5000,
      pomodoroPhase: 'focus',
      pomodoroCompletedFocusCycles: 2,
    }

    // Simulate localStorage stringify and parse
    const serialized = JSON.stringify(originalState)
    const rehydrated: FocusSessionState = JSON.parse(serialized)

    expect(rehydrated.sessionId).toBe('session-rehydrate-uuid')
    expect(rehydrated.habitId).toBe('deep-work-habit')

    // Check calculations on rehydrated state
    const calc = calculateFocusTime(rehydrated, startedAt + 999999)
    // Since pausedAt was startedAt + 20000, active time is 20s - 5s = 15s
    expect(calc.elapsedSeconds).toBe(15)
    expect(calc.remainingSeconds).toBe(1485)
  })

  it('enforces session boundaries: ignores sessions under 60s and caps at 12 hours', () => {
    // 59 seconds -> ignored (returns 0)
    expect(sanitizeDurationSeconds(1000000, 1059000)).toBe(0)

    // Exactly 60 seconds -> accepted
    expect(sanitizeDurationSeconds(1000000, 1060000)).toBe(60)

    // 25 minutes (1500s) -> accepted
    expect(sanitizeDurationSeconds(1000000, 2500000)).toBe(1500)

    // 14 hours (50400s) -> capped at 43200 (12 hours)
    expect(sanitizeDurationSeconds(1000000, 1000000 + 50400 * 1000)).toBe(43200)
  })

  it('accurately splits digits for 3D flip clock cards', () => {
    const digits1 = formatTimerDigits(1499) // 24:59
    expect(digits1).toEqual({ min1: '2', min2: '4', sec1: '5', sec2: '9' })

    const digits2 = formatTimerDigits(305) // 05:05
    expect(digits2).toEqual({ min1: '0', min2: '5', sec1: '0', sec2: '5' })

    const digits3 = formatTimerDigits(0) // 00:00
    expect(digits3).toEqual({ min1: '0', min2: '0', sec1: '0', sec2: '0' })
  })

  it('correctly converts focus minutes to habit unit amounts', () => {
    // 25 minutes into 'min'
    expect(convertDurationToHabitAmount(1500, 'min')).toBe(25)
    expect(convertDurationToHabitAmount(1500, 'mins')).toBe(25)

    // 60 minutes into 'hours'
    expect(convertDurationToHabitAmount(3600, 'hours')).toBe(1)
    expect(convertDurationToHabitAmount(3600, 'hour')).toBe(1)

    // 30 minutes into 'hours' (0.50 hours)
    expect(convertDurationToHabitAmount(1800, 'hours')).toBe(0.5)

    // 45 minutes into 'hours' (0.75 hours)
    expect(convertDurationToHabitAmount(2700, 'hours')).toBe(0.75)
  })
})

