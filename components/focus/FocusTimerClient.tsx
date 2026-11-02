'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  Clock,
  Sparkles,
  Check,
  ChevronDown,
  Trash2,
  Volume2,
  VolumeX,
  Bell,
  BellRing,
  Coffee,
  Flame,
  ArrowRight,
  Sliders,
} from 'lucide-react'
import type { FocusPagePayload, FocusHabitInfo } from '@/lib/db/focus'
import type { FocusSession } from '@/lib/supabase/types'
import { renderHabitIcon, getHabitColorVar } from '@/lib/habit-theme'
import { playCompletionChime, isCompletionSoundEnabled, setCompletionSoundEnabled } from '@/lib/audio'
import {
  calculateFocusTime,
  pauseFocusSession,
  resumeFocusSession,
  createFocusSession,
  sanitizeDurationSeconds,
  convertDurationToHabitAmount,
  type FocusSessionState,
} from '@/lib/focus/timer-math'
import { FlipClockDisplay } from './FlipClockDisplay'
import { RingClockDisplay } from './RingClockDisplay'
import { logFocusSessionAction, deleteFocusSessionAction } from '@/actions/focus.actions'

const LOCAL_STORAGE_KEY = 'focus_timer_active_session'

const COUNTDOWN_PRESETS = [
  { label: '25m', minutes: 25 },
  { label: '50m', minutes: 50 },
  { label: '90m', minutes: 90 },
]

interface Props {
  payload: FocusPagePayload
  initialHabitId?: string | null
}

export function FocusTimerClient({ payload, initialHabitId }: Props) {
  const { today, habits, todaySessions: serverSessions } = payload

  // Clock view mode: Flip (default) or Ring
  const [clockDisplay, setClockDisplay] = useState<'flip' | 'ring'>('flip')

  // Timer mode: Countdown or Pomodoro
  const [timerMode, setTimerMode] = useState<'countdown' | 'pomodoro'>('countdown')

  // Linked habit selection
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(
    initialHabitId ?? (habits.length > 0 ? habits[0].id : null)
  )

  // Countdown configuration
  const [countdownMinutes, setCountdownMinutes] = useState<number>(25)
  const [customInputMinutes, setCustomInputMinutes] = useState<string>('25')
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false)

  // Pomodoro configuration
  const [pomodoroFocusMinutes, setPomodoroFocusMinutes] = useState<number>(25)
  const [pomodoroBreakMinutes, setPomodoroBreakMinutes] = useState<number>(5)
  const [autoAdvancePomodoro, setAutoAdvancePomodoro] = useState<boolean>(true)

  // Active Session State (persisted in localStorage)
  const [sessionState, setSessionState] = useState<FocusSessionState | null>(null)
  const [nowTimestamp, setNowTimestamp] = useState<number>(() => Date.now())

  // Sound & Notification preferences
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')

  // Completed session ready to be confirmed & logged
  const [pendingLogSession, setPendingLogSession] = useState<{
    id: string
    habitId: string | null
    startedAt: string
    endedAt: string
    plannedSeconds: number
    durationSeconds: number
    mode: 'countdown' | 'pomodoro'
    localDate: string
  } | null>(null)

  const [isLogging, setIsLogging] = useState<boolean>(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [sessionsList, setSessionsList] = useState(serverSessions)

  // Screen Wake Lock Sentinel reference
  const wakeLockRef = useRef<any>(null)

  // Keep sessions list updated if server sessions change
  useEffect(() => {
    setSessionsList(serverSessions)
  }, [serverSessions])

  // Sync initial sound preference & notification status
  useEffect(() => {
    setSoundEnabled(isCompletionSoundEnabled())
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  // ── 1. SCREEN WAKE LOCK HANDLER ─────────────────────────────────────────────
  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
    try {
      wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
    } catch {
      // Fail silently
    }
  }, [])

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release()
      } catch {
        // Fail silently
      }
      wakeLockRef.current = null
    }
  }, [])

  // ── 2. LOCAL STORAGE REHYDRATION (On Mount) ─────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (stored) {
        const parsed: FocusSessionState = JSON.parse(stored)
        if (parsed && parsed.sessionId && parsed.startedAt && parsed.plannedSeconds) {
          const now = Date.now()
          const time = calculateFocusTime(parsed, now)
          if (time.isFinished) {
            // EndAt passed while user was away: offer to log it
            localStorage.removeItem(LOCAL_STORAGE_KEY)
            const durationSec = sanitizeDurationSeconds(
              parsed.startedAt,
              parsed.startedAt + parsed.plannedSeconds * 1000
            )
            if (durationSec >= 60) {
              setPendingLogSession({
                id: parsed.sessionId,
                habitId: parsed.habitId,
                startedAt: new Date(parsed.startedAt).toISOString(),
                endedAt: new Date(parsed.startedAt + parsed.plannedSeconds * 1000).toISOString(),
                plannedSeconds: parsed.plannedSeconds,
                durationSeconds: durationSec,
                mode: parsed.mode,
                localDate: today,
              })
            }
          } else {
            // Resume session
            setSessionState(parsed)
            if (parsed.habitId) setSelectedHabitId(parsed.habitId)
            setTimerMode(parsed.mode)
            if (parsed.pausedAt === null) {
              requestWakeLock()
            }
          }
        }
      }
    } catch {
      localStorage.removeItem(LOCAL_STORAGE_KEY)
    }
  }, [today, requestWakeLock])

  // ── 3. VISIBILITY CHANGE HANDLER (Re-acquire Wake Lock) ──────────────────────
  useEffect(() => {
    if (typeof document === 'undefined') return
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && sessionState && sessionState.pausedAt === null) {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [sessionState, requestWakeLock])

  // ── 4. TICK ENGINE (Derived from timestamps, immune to throttling) ───────────
  useEffect(() => {
    if (!sessionState || sessionState.pausedAt !== null) return

    const interval = setInterval(() => {
      const now = Date.now()
      setNowTimestamp(now)

      const time = calculateFocusTime(sessionState, now)
      if (time.isFinished) {
        clearInterval(interval)
        handleSessionFinished(sessionState, now)
      }
    }, 250) // Frequent check so UI repaints smoothly

    return () => clearInterval(interval)
  }, [sessionState])

  // ── 5. ON FINISH HANDLER ───────────────────────────────────────────────────
  const handleSessionFinished = useCallback(
    (finishedState: FocusSessionState, finishTimestamp: number) => {
      releaseWakeLock()
      localStorage.removeItem(LOCAL_STORAGE_KEY)

      // Audio Chime
      if (soundEnabled) {
        playCompletionChime()
      }

      // Vibration where supported
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([200, 100, 200])
        } catch {
          // Ignore
        }
      }

      // Desktop Notification if granted and document is hidden
      if (
        typeof document !== 'undefined' &&
        document.visibilityState !== 'visible' &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification('1% Better — Focus Complete', {
            body:
              finishedState.pomodoroPhase === 'break'
                ? 'Break time is over. Ready for your next focus session?'
                : 'Session finished! Ready to log your progress.',
          })
        } catch {
          // Fail silently
        }
      }

      // Handle Pomodoro break vs focus
      if (finishedState.mode === 'pomodoro' && finishedState.pomodoroPhase === 'break') {
        // Break finished: advance to next focus cycle
        setSessionState(null)
        if (autoAdvancePomodoro) {
          startNewSession('pomodoro', pomodoroFocusMinutes * 60, 'focus')
        }
        return
      }

      // Calculate logged duration
      const durationSec = sanitizeDurationSeconds(
        finishedState.startedAt,
        finishTimestamp
      )

      if (durationSec >= 60) {
        // Show confirm log card
        setPendingLogSession({
          id: finishedState.sessionId,
          habitId: finishedState.habitId,
          startedAt: new Date(finishedState.startedAt).toISOString(),
          endedAt: new Date(finishTimestamp).toISOString(),
          plannedSeconds: finishedState.plannedSeconds,
          durationSeconds: durationSec,
          mode: finishedState.mode,
          localDate: today,
        })
      }

      // If Pomodoro with auto-advance: prepare break phase
      if (finishedState.mode === 'pomodoro') {
        if (autoAdvancePomodoro) {
          startNewSession('pomodoro', pomodoroBreakMinutes * 60, 'break')
        } else {
          setSessionState(null)
        }
      } else {
        setSessionState(null)
      }
    },
    [
      releaseWakeLock,
      soundEnabled,
      autoAdvancePomodoro,
      pomodoroFocusMinutes,
      pomodoroBreakMinutes,
      today,
    ]
  )

  // ── 6. SESSION CONTROL ACTIONS ──────────────────────────────────────────────
  const startNewSession = useCallback(
    (
      mode: 'countdown' | 'pomodoro',
      plannedSeconds: number,
      pomodoroPhase: 'focus' | 'break' = 'focus'
    ) => {
      const now = Date.now()
      // Generate client UUID for idempotency
      const sessionId = crypto.randomUUID()
      const newState = createFocusSession({
        sessionId,
        plannedSeconds,
        mode,
        habitId: pomodoroPhase === 'focus' ? selectedHabitId : null,
        now,
        pomodoroPhase,
      })

      setSessionState(newState)
      setNowTimestamp(now)
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState))
      requestWakeLock()
    },
    [selectedHabitId, requestWakeLock]
  )

  const handleStart = () => {
    if (timerMode === 'countdown') {
      startNewSession('countdown', countdownMinutes * 60, 'focus')
    } else {
      startNewSession('pomodoro', pomodoroFocusMinutes * 60, 'focus')
    }
  }

  const handlePause = () => {
    if (!sessionState) return
    const now = Date.now()
    const updated = pauseFocusSession(sessionState, now)
    setSessionState(updated)
    setNowTimestamp(now)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
    releaseWakeLock()
  }

  const handleResume = () => {
    if (!sessionState) return
    const now = Date.now()
    const updated = resumeFocusSession(sessionState, now)
    setSessionState(updated)
    setNowTimestamp(now)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
    requestWakeLock()
  }

  const handleReset = () => {
    releaseWakeLock()
    localStorage.removeItem(LOCAL_STORAGE_KEY)
    setSessionState(null)
  }

  // ── 7. CONFIRM LOGGING ACTION ───────────────────────────────────────────────
  const handleConfirmLog = async () => {
    if (!pendingLogSession || isLogging) return
    setIsLogging(true)
    setActionError(null)

    const res = await logFocusSessionAction({
      id: pendingLogSession.id,
      habitId: pendingLogSession.habitId,
      startedAt: pendingLogSession.startedAt,
      endedAt: pendingLogSession.endedAt,
      plannedSeconds: pendingLogSession.plannedSeconds,
      mode: pendingLogSession.mode,
      localDate: pendingLogSession.localDate,
    })

    if ('error' in res) {
      setActionError(res.error ?? 'Failed to log session')
      setIsLogging(false)
      return
    }

    // Optimistically update sessions list
    const linkedHabit = habits.find((h) => h.id === pendingLogSession.habitId)
    const newSessionEntry: any = {
      id: pendingLogSession.id,
      user_id: '',
      habit_id: pendingLogSession.habitId,
      started_at: pendingLogSession.startedAt,
      ended_at: pendingLogSession.endedAt,
      duration_seconds: pendingLogSession.durationSeconds,
      planned_seconds: pendingLogSession.plannedSeconds,
      mode: pendingLogSession.mode,
      local_date: pendingLogSession.localDate,
      habit_minutes_applied: convertDurationToHabitAmount(
        pendingLogSession.durationSeconds,
        linkedHabit?.unit
      ),
      created_at: new Date().toISOString(),
      habitName: linkedHabit?.name,
      habitColor: linkedHabit?.color ?? 'sage',
      habitIcon: linkedHabit?.icon ?? 'clock',
    }

    setSessionsList((prev) => [newSessionEntry, ...prev.filter((s) => s.id !== pendingLogSession.id)])
    setPendingLogSession(null)
    setIsLogging(false)
  }

  const handleDiscardLog = () => {
    setPendingLogSession(null)
    setActionError(null)
  }

  const handleDeleteSession = async (sessionId: string) => {
    const prev = [...sessionsList]
    setSessionsList((curr) => curr.filter((s) => s.id !== sessionId))

    const res = await deleteFocusSessionAction({ id: sessionId })
    if ('error' in res) {
      setActionError(res.error ?? 'Failed to delete session')
      setSessionsList(prev)
    }
  }

  // ── 8. COMPUTED DISPLAY VALUES ──────────────────────────────────────────────
  const selectedHabit = useMemo(
    () => habits.find((h) => h.id === selectedHabitId) ?? null,
    [habits, selectedHabitId]
  )

  const activeCalculations = useMemo(() => {
    if (sessionState) {
      return calculateFocusTime(sessionState, nowTimestamp)
    }
    const planned =
      timerMode === 'countdown' ? countdownMinutes * 60 : pomodoroFocusMinutes * 60
    return {
      elapsedActiveMs: 0,
      elapsedSeconds: 0,
      remainingSeconds: planned,
      isFinished: false,
      progressPct: 0,
      displayMinutes: Math.floor(planned / 60),
      displaySeconds: 0,
    }
  }, [sessionState, nowTimestamp, timerMode, countdownMinutes, pomodoroFocusMinutes])

  const habitAccentColor = selectedHabit
    ? getHabitColorVar(selectedHabit.color)
    : 'var(--accent)'

  // Notification Permission Request (only on explicit user click)
  const handleRequestNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    try {
      const perm = await Notification.requestPermission()
      setNotificationPermission(perm)
    } catch {
      // Fail silently
    }
  }

  const toggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    setCompletionSoundEnabled(next)
  }

  return (
    <div
      className="page-container w-full mx-auto"
      style={{
        maxWidth: '720px',
        paddingLeft: 'clamp(16px, 4vw, 32px)',
        paddingRight: 'clamp(16px, 4vw, 32px)',
        paddingTop: '28px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
      }}
    >
      {/* ── TOP HEADER / BREADCRUMB ────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-xs text-[var(--text-muted)] tracking-wider mb-1">
            ~/ focus
          </p>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Focus & Discipline Timer
          </h1>
        </div>

        {/* View Switcher: Flip vs Ring */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <button
            type="button"
            onClick={() => setClockDisplay('flip')}
            className={`font-mono text-xs font-bold px-3 py-1 rounded-lg transition-all ${
              clockDisplay === 'flip'
                ? 'bg-[var(--surface-raised)] text-[var(--accent)] shadow-2xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Flip
          </button>
          <button
            type="button"
            onClick={() => setClockDisplay('ring')}
            className={`font-mono text-xs font-bold px-3 py-1 rounded-lg transition-all ${
              clockDisplay === 'ring'
                ? 'bg-[var(--surface-raised)] text-[var(--accent)] shadow-2xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Ring
          </button>
        </div>
      </div>

      {/* ── MODE SWITCHER & SETTINGS ROW ────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={sessionState !== null}
            onClick={() => setTimerMode('countdown')}
            className={`font-mono text-xs font-bold px-4 py-2 rounded-xl border transition-all ${
              timerMode === 'countdown'
                ? 'bg-[var(--surface-raised)] border-[var(--accent)] text-[var(--accent)]'
                : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            } ${sessionState !== null ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            Countdown
          </button>
          <button
            type="button"
            disabled={sessionState !== null}
            onClick={() => setTimerMode('pomodoro')}
            className={`font-mono text-xs font-bold px-4 py-2 rounded-xl border transition-all ${
              timerMode === 'pomodoro'
                ? 'bg-[var(--surface-raised)] border-[var(--accent)] text-[var(--accent)]'
                : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            } ${sessionState !== null ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            Pomodoro (25/5)
          </button>
        </div>

        {/* Ambient controls: Sound and Notification toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            title={soundEnabled ? 'Completion sound: ON' : 'Completion sound: OFF'}
            className="w-9 h-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
          >
            {soundEnabled ? <Volume2 size={16} className="text-[var(--accent)]" /> : <VolumeX size={16} />}
          </button>

          {notificationPermission !== 'granted' && (
            <button
              type="button"
              onClick={handleRequestNotification}
              title="Enable background notifications when timer finishes"
              className="px-2.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            >
              <Bell size={13} />
              <span>Notify</span>
            </button>
          )}
        </div>
      </div>

      {/* ── LINKED HABIT SELECTOR CARD ───────────────────────────────────────── */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border"
              style={{
                borderColor: habitAccentColor,
                color: habitAccentColor,
                backgroundColor: `color-mix(in srgb, ${habitAccentColor} 15%, transparent)`,
              }}
            >
              {selectedHabit ? renderHabitIcon(selectedHabit.icon, 18) : <Clock size={18} />}
            </span>

            <div className="min-w-0">
              <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-semibold">
                LINKED HABIT
              </span>
              <span className="font-mono text-sm font-bold text-[var(--text-primary)] truncate block">
                {selectedHabit ? selectedHabit.name : 'Unlinked Focus Session'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Show habit's progress today */}
            {selectedHabit && (
              <div className="text-right font-mono text-xs">
                <span className="text-[10px] text-[var(--text-muted)] block">TODAY</span>
                <span className="font-bold text-[var(--accent)]">
                  {selectedHabit.todayAmount}{' '}
                  {selectedHabit.target_value ? `/ ${selectedHabit.target_value}` : ''}{' '}
                  {selectedHabit.unit ?? ''}
                </span>
              </div>
            )}

            {/* Habit dropdown */}
            <select
              value={selectedHabitId ?? ''}
              disabled={sessionState !== null}
              onChange={(e) => setSelectedHabitId(e.target.value || null)}
              className="font-mono text-xs px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="">(None / General Focus)</option>
              {habits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} {h.unit ? `(${h.unit})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── PRESETS / DURATION SELECTOR (When timer is not running) ─────────── */}
      {!sessionState && (
        <div className="mb-6 flex flex-col items-center">
          {timerMode === 'countdown' ? (
            <div className="flex items-center justify-center flex-wrap gap-2">
              {COUNTDOWN_PRESETS.map((p) => {
                const active = countdownMinutes === p.minutes && !showCustomInput
                return (
                  <button
                    key={p.minutes}
                    type="button"
                    onClick={() => {
                      setCountdownMinutes(p.minutes)
                      setShowCustomInput(false)
                    }}
                    className={`font-mono text-xs font-bold px-4 py-1.5 rounded-full border transition-all ${
                      active
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs'
                        : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}

              <button
                type="button"
                onClick={() => setShowCustomInput((v) => !v)}
                className={`font-mono text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                  showCustomInput
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                    : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]'
                }`}
              >
                Custom
              </button>

              {showCustomInput && (
                <div className="flex items-center gap-1.5 ml-2">
                  <input
                    type="number"
                    min={1}
                    max={720}
                    value={customInputMinutes}
                    onChange={(e) => {
                      setCustomInputMinutes(e.target.value)
                      const n = parseInt(e.target.value, 10)
                      if (!isNaN(n) && n > 0) setCountdownMinutes(n)
                    }}
                    className="w-16 font-mono text-xs px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-center"
                    placeholder="min"
                  />
                  <span className="font-mono text-xs text-[var(--text-muted)]">min</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-muted)] font-bold">Focus:</span>
                <span className="font-bold text-[var(--text-primary)]">{pomodoroFocusMinutes}m</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-muted)] font-bold">Break:</span>
                <span className="font-bold text-[var(--accent)]">{pomodoroBreakMinutes}m</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer ml-3">
                <input
                  type="checkbox"
                  checked={autoAdvancePomodoro}
                  onChange={(e) => setAutoAdvancePomodoro(e.target.checked)}
                  className="rounded border-[var(--border)] accent-[var(--accent)]"
                />
                <span className="text-[var(--text-muted)]">Auto-advance</span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* ── MAIN TIMER DISPLAY (Flip or Ring) ─────────────────────────────────── */}
      <div className="p-6 sm:p-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs flex flex-col items-center justify-center mb-8 relative">
        {/* Pomodoro Status Indicator */}
        {timerMode === 'pomodoro' && sessionState && (
          <div className="mb-2">
            <span
              className={`font-mono text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${
                sessionState.pomodoroPhase === 'break'
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                  : 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30'
              }`}
            >
              {sessionState.pomodoroPhase === 'break' ? '☕ Short Break' : '⚡ Deep Focus'}
            </span>
          </div>
        )}

        {/* Display: Flip or Ring */}
        {clockDisplay === 'flip' ? (
          <FlipClockDisplay totalSeconds={activeCalculations.remainingSeconds} />
        ) : (
          <RingClockDisplay
            remainingSeconds={activeCalculations.remainingSeconds}
            plannedSeconds={
              sessionState
                ? sessionState.plannedSeconds
                : timerMode === 'countdown'
                ? countdownMinutes * 60
                : pomodoroFocusMinutes * 60
            }
            accentColor={habitAccentColor}
          />
        )}

        {/* ── TIMER CONTROLS ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-4 mt-6">
          {!sessionState ? (
            <button
              type="button"
              onClick={handleStart}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-[var(--accent)] hover:opacity-90 active:scale-95 text-white font-mono text-sm font-bold shadow-md transition-all cursor-pointer"
            >
              <Play size={18} fill="currentColor" />
              <span>Start Focus</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              {sessionState.pausedAt === null ? (
                <button
                  type="button"
                  onClick={handlePause}
                  className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] hover:border-[var(--accent)] active:scale-95 text-[var(--text-primary)] font-mono text-sm font-bold shadow-2xs transition-all cursor-pointer"
                >
                  <Pause size={18} />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResume}
                  className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[var(--accent)] hover:opacity-90 active:scale-95 text-white font-mono text-sm font-bold shadow-md transition-all cursor-pointer"
                >
                  <Play size={18} fill="currentColor" />
                  <span>Resume</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleReset}
                title="Reset timer"
                className="w-12 h-12 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-rose-500 transition-all flex items-center justify-center active:scale-95 cursor-pointer"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── CONFIRM SESSION FINISHED / LOGGING CARD ──────────────────────────── */}
      <AnimatePresence>
        {pendingLogSession && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="p-6 rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface)] shadow-lg mb-8"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] flex items-center justify-center">
                  <Check size={20} strokeWidth={2.5} />
                </span>
                <div>
                  <h3 className="font-mono text-sm font-bold text-[var(--text-primary)]">
                    Focus Session Complete!
                  </h3>
                  <p className="font-mono text-xs text-[var(--text-muted)]">
                    {Math.round(pendingLogSession.durationSeconds / 60)} minutes completed. Ready to log into habit.
                  </p>
                </div>
              </div>
            </div>

            {actionError && (
              <p className="font-mono text-xs text-rose-500 mb-3 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                {actionError}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={handleDiscardLog}
                disabled={isLogging}
                className="font-mono text-xs font-bold px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              >
                Discard
              </button>

              <button
                type="button"
                onClick={handleConfirmLog}
                disabled={isLogging}
                className="flex items-center gap-2 font-mono text-xs font-bold px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 active:scale-95 shadow-sm transition-all cursor-pointer"
              >
                {isLogging ? (
                  <span>Logging...</span>
                ) : (
                  <>
                    <Check size={14} strokeWidth={3} />
                    <span>
                      Log {Math.round(pendingLogSession.durationSeconds / 60)}m to{' '}
                      {selectedHabit ? selectedHabit.name : 'History'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TODAY'S COMPLETED SESSIONS HISTORY ──────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-xs uppercase tracking-[0.2em] font-bold text-[var(--text-muted)]">
            TODAY’S SESSIONS ————
          </span>
          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)]">
            {sessionsList.length} Sessions
          </span>
        </div>

        {sessionsList.length === 0 ? (
          <div className="p-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-center font-mono text-xs text-[var(--text-muted)]">
            No focus sessions completed today yet. Start a session above to build discipline.
          </div>
        ) : (
          <div className="space-y-2.5">
            {sessionsList.map((s) => {
              const habitColor = getHabitColorVar(s.habitColor)
              const durationMin = Math.round(s.duration_seconds / 60)
              const startedTime = new Date(s.started_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <div
                  key={s.id}
                  className="p-3.5 sm:p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-4 font-mono text-xs shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border"
                      style={{
                        borderColor: habitColor,
                        color: habitColor,
                        backgroundColor: `color-mix(in srgb, ${habitColor} 15%, transparent)`,
                      }}
                    >
                      {renderHabitIcon(s.habitIcon, 14)}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--text-primary)] truncate">
                          {s.habitName ?? 'General Focus'}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          ({s.mode})
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] block">
                        {startedTime} · {durationMin} min duration
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {s.habit_minutes_applied > 0 && (
                      <span className="font-bold text-[var(--accent)] text-xs">
                        +{s.habit_minutes_applied}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteSession(s.id)}
                      title="Delete session (reverses logged amount)"
                      className="w-7 h-7 rounded-lg border border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-rose-500 flex items-center justify-center transition-all cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
