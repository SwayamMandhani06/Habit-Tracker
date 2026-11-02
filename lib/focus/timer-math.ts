// lib/focus/timer-math.ts — Pure time calculation and state transitions for Focus Timer
// Zero React, zero DB, zero UTC derivations. Fully testable in Vitest.

export interface FocusSessionState {
  sessionId: string
  startedAt: number // epoch ms
  plannedSeconds: number
  mode: 'countdown' | 'pomodoro'
  habitId: string | null
  pausedAt: number | null // epoch ms
  accumulatedPausedMs: number
  pomodoroPhase?: 'focus' | 'break'
  pomodoroCompletedFocusCycles?: number
}

export interface FocusTimeCalculation {
  elapsedActiveMs: number
  elapsedSeconds: number
  remainingSeconds: number
  isFinished: boolean
  progressPct: number // 0 to 100
  displayMinutes: number
  displaySeconds: number
}

/**
 * Calculates accurate remaining time and elapsed active time derived from timestamps.
 * Immunity to throttled background tabs: remaining = endAt - now.
 */
export function calculateFocusTime(
  state: FocusSessionState,
  now: number
): FocusTimeCalculation {
  // If paused, time is frozen at pausedAt
  const effectiveNow = state.pausedAt !== null ? state.pausedAt : now
  const elapsedActiveMs = Math.max(
    0,
    effectiveNow - state.startedAt - state.accumulatedPausedMs
  )

  const elapsedSeconds = Math.floor(elapsedActiveMs / 1000)
  const remainingSeconds = Math.max(0, state.plannedSeconds - elapsedSeconds)
  const isFinished = remainingSeconds === 0

  const progressPct =
    state.plannedSeconds > 0
      ? Math.min(100, Math.max(0, Math.round((elapsedSeconds / state.plannedSeconds) * 100)))
      : 0

  const displayMinutes = Math.floor(remainingSeconds / 60)
  const displaySeconds = remainingSeconds % 60

  return {
    elapsedActiveMs,
    elapsedSeconds,
    remainingSeconds,
    isFinished,
    progressPct,
    displayMinutes,
    displaySeconds,
  }
}

/**
 * Pauses a running focus session by recording pausedAt timestamp.
 */
export function pauseFocusSession(
  state: FocusSessionState,
  now: number
): FocusSessionState {
  if (state.pausedAt !== null) {
    return state // Already paused
  }
  return {
    ...state,
    pausedAt: now,
  }
}

/**
 * Resumes a paused focus session by accumulating paused duration.
 */
export function resumeFocusSession(
  state: FocusSessionState,
  now: number
): FocusSessionState {
  if (state.pausedAt === null) {
    return state // Already running
  }
  const pausedDelta = Math.max(0, now - state.pausedAt)
  return {
    ...state,
    pausedAt: null,
    accumulatedPausedMs: state.accumulatedPausedMs + pausedDelta,
  }
}

/**
 * Creates a new focus session state.
 */
export function createFocusSession(params: {
  sessionId: string
  plannedSeconds: number
  mode: 'countdown' | 'pomodoro'
  habitId?: string | null
  now: number
  pomodoroPhase?: 'focus' | 'break'
  pomodoroCompletedFocusCycles?: number
}): FocusSessionState {
  return {
    sessionId: params.sessionId,
    startedAt: params.now,
    plannedSeconds: params.plannedSeconds,
    mode: params.mode,
    habitId: params.habitId ?? null,
    pausedAt: null,
    accumulatedPausedMs: 0,
    pomodoroPhase: params.pomodoroPhase ?? 'focus',
    pomodoroCompletedFocusCycles: params.pomodoroCompletedFocusCycles ?? 0,
  }
}

/**
 * Sanitizes duration in seconds according to rules:
 * - Sessions under 60 seconds return 0 (ignored)
 * - Sessions over 12 hours (43200s) capped at 43200
 */
export function sanitizeDurationSeconds(
  startedAtMs: number,
  endedAtMs: number
): number {
  const duration = Math.round((endedAtMs - startedAtMs) / 1000)
  if (duration < 60) return 0
  if (duration > 43200) return 43200
  return duration
}

/**
 * Splits MM:SS into individual digits for flip clock cards.
 */
export function formatTimerDigits(totalSeconds: number): {
  min1: string
  min2: string
  sec1: string
  sec2: string
} {
  const m = Math.floor(Math.max(0, totalSeconds) / 60)
  const s = Math.max(0, totalSeconds) % 60
  const mStr = String(m).padStart(2, '0')
  const sStr = String(s).padStart(2, '0')

  return {
    min1: mStr[0] ?? '0',
    min2: mStr[1] ?? '0',
    sec1: sStr[0] ?? '0',
    sec2: sStr[1] ?? '0',
  }
}

/**
 * Converts focus session duration (seconds) into habit unit amount (min or hours).
 */
export function convertDurationToHabitAmount(
  durationSeconds: number,
  unit?: string | null
): number {
  if (!unit) return Math.round(durationSeconds / 60)
  const normalized = unit.toLowerCase().trim()
  if (['hours', 'hour', 'hr', 'hrs', 'h'].includes(normalized)) {
    return Number((durationSeconds / 3600).toFixed(2))
  }
  return Number((durationSeconds / 60).toFixed(1))
}

