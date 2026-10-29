'use client'
// components/today/TodayClient.tsx — Daily check-in with refined typography & auto-save
import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { HabitWithSubitems, DayEntry, DayCompletionState } from '@/lib/supabase/types'
import { toggleHabitCompletionAction, toggleHabitSkipAction, toggleSubitemCompletionAction } from '@/actions/completion.actions'
import { updateDayEntryAction } from '@/actions/entry.actions'
import { HabitRow } from './HabitRow'
import { SignalBarSelector } from './SignalBarSelector'
import { CelebrationOverlay } from './CelebrationOverlay'
import { WeeklyIntention } from './WeeklyIntention'
import { FocusTimerModal } from './FocusTimerModal'
import { playCompletionChime } from '@/lib/audio'
import Link from 'next/link'
import { ArrowRight, Clock, SlidersHorizontal, Grid } from 'lucide-react'

interface Props {
  date: string
  entry: DayEntry
  habits: HabitWithSubitems[]
  completions: DayCompletionState
  yesterdayEmpty?: boolean
  yesterdayDate?: string
  initialIntention?: string
  recentDays?: Array<{ date: string; dayLabel: string; dayNum: string; isToday: boolean }>
  recentCompletions?: Record<string, Record<string, boolean>>
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function TodayClient({
  date,
  entry,
  habits,
  completions,
  yesterdayEmpty,
  yesterdayDate,
  initialIntention,
  recentDays = [],
  recentCompletions = {},
}: Props) {
  const [habitComps, setHabitComps] = useState(completions.habitCompletions)
  const [habitSkips, setHabitSkips] = useState<Record<string, boolean>>(completions.habitSkips ?? {})
  const [subitemComps, setSubitemComps] = useState(completions.subitemCompletions)

  // 5-Day Minimal Strip & Focus Timer State
  const [viewMode, setViewMode] = useState<'classic' | 'minimal'>('classic')
  const [recentComps, setRecentComps] = useState<Record<string, Record<string, boolean>>>(recentCompletions)
  const [focusTimerOpen, setFocusTimerOpen] = useState(false)
  const [focusTimerHabit, setFocusTimerHabit] = useState<HabitWithSubitems | null>(null)

  const [mood, setMood] = useState<number | null>(entry.mood)
  const [energy, setEnergy] = useState<number | null>(entry.energy)
  const [sleep, setSleep] = useState<string>(entry.sleep_hours?.toString() ?? '')
  const [weight, setWeight] = useState<string>(entry.weight_kg?.toString() ?? '')
  const [screenTime, setScreenTime] = useState<string>(entry.screen_time_minutes?.toString() ?? '')
  const [notes, setNotes] = useState<string>(entry.notes ?? '')
  const [showCelebration, setShowCelebration] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // In-flight tracking to prevent race conditions on rapid clicking
  const inFlightHabitsRef = useRef<Set<string>>(new Set())
  const inFlightSubitemsRef = useRef<Set<string>>(new Set())
  const inFlightSkipsRef = useRef<Set<string>>(new Set())

  // Ensure celebrations only trigger from real user actions, not page loads/re-renders
  const isUserActionRef = useRef(false)
  const isFirstMount = useRef(true)

  // Client-side date synchronization check
  useEffect(() => {
    try {
      const localDate = new Intl.DateTimeFormat('en-CA').format(new Date())
      if (localDate && localDate !== date && typeof window !== 'undefined' && !window.location.search.includes('date=')) {
        window.location.replace(`/today?date=${localDate}`)
      }
    } catch {}
  }, [date])

  // A skipped habit doesn't count against completion % — excluded from denominator
  const activeHabits = habits.filter((h) => !habitSkips[h.id])
  const completedCount = activeHabits.filter((h) => habitComps[h.id] === true).length
  const totalCount = activeHabits.length
  // If all habits are skipped or user has 0 habits, completion is 0% and does not falsely trigger celebration
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const isPerfect = totalCount > 0 && completedCount > 0 && pct >= 100

  // Debounced auto-save
  const debouncedMood = useDebounce(mood, 500)
  const debouncedEnergy = useDebounce(energy, 500)
  const debouncedSleep = useDebounce(sleep, 700)
  const debouncedWeight = useDebounce(weight, 700)
  const debouncedScreenTime = useDebounce(screenTime, 700)
  const debouncedNotes = useDebounce(notes, 1000)

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }

    const parsedSleep = debouncedSleep ? parseFloat(debouncedSleep) : null
    const parsedWeight = debouncedWeight ? parseFloat(debouncedWeight) : null
    const parsedScreenTime = debouncedScreenTime ? parseInt(debouncedScreenTime, 10) : null
    const currentNotes = debouncedNotes

    const initialSleep = entry.sleep_hours ?? null
    const initialWeight = entry.weight_kg ?? null
    const initialScreenTime = entry.screen_time_minutes ?? null
    const initialNotes = entry.notes ?? ''
    const initialMood = entry.mood ?? null
    const initialEnergy = entry.energy ?? null

    const hasChanged =
      debouncedMood !== initialMood ||
      debouncedEnergy !== initialEnergy ||
      parsedSleep !== initialSleep ||
      parsedWeight !== initialWeight ||
      parsedScreenTime !== initialScreenTime ||
      currentNotes !== initialNotes

    if (!hasChanged) return

    updateDayEntryAction({
      date,
      mood: debouncedMood,
      energy: debouncedEnergy,
      sleep_hours: parsedSleep,
      weight_kg: parsedWeight,
      screen_time_minutes: parsedScreenTime,
      notes: currentNotes,
    }).then((res) => {
      if (res?.error) {
        setActionError(`Auto-save failed: ${res.error}`)
        setTimeout(() => setActionError(null), 3500)
      } else {
        setShowSaved(true)
        const timer = setTimeout(() => setShowSaved(false), 1400)
        return () => clearTimeout(timer)
      }
    }).catch(() => {
      setActionError('Auto-save network error')
      setTimeout(() => setActionError(null), 3500)
    })
  }, [date, entry, debouncedMood, debouncedEnergy, debouncedSleep, debouncedWeight, debouncedScreenTime, debouncedNotes])

  const handleToggleHabit = useCallback((habitId: string) => {
    if (inFlightHabitsRef.current.has(habitId)) return
    inFlightHabitsRef.current.add(habitId)
    isUserActionRef.current = true

    const prev = habitComps[habitId] ?? false
    const next = !prev
    const prevSkip = habitSkips[habitId] ?? false

    setHabitComps((c) => ({ ...c, [habitId]: next }))
    if (next && prevSkip) {
      setHabitSkips((s) => ({ ...s, [habitId]: false }))
    }

    toggleHabitCompletionAction({ date, habitId, isCompleted: next })
      .then((res) => {
        if (res?.error) {
          setHabitComps((c) => ({ ...c, [habitId]: prev }))
          if (next && prevSkip) {
            setHabitSkips((s) => ({ ...s, [habitId]: true }))
          }
          setActionError(`Could not update habit: ${res.error}`)
          setTimeout(() => setActionError(null), 3500)
        }
      })
      .catch(() => {
        setHabitComps((c) => ({ ...c, [habitId]: prev }))
        if (next && prevSkip) {
          setHabitSkips((s) => ({ ...s, [habitId]: true }))
        }
        setActionError('Network error updating habit')
        setTimeout(() => setActionError(null), 3500)
      })
      .finally(() => {
        inFlightHabitsRef.current.delete(habitId)
      })
  }, [habitComps, habitSkips, date])

  const handleToggleSubitem = useCallback(
    (habitId: string, subitemId: string, allSubitemIds: string[]) => {
      if (inFlightSubitemsRef.current.has(subitemId)) return
      inFlightSubitemsRef.current.add(subitemId)
      isUserActionRef.current = true

      const prev = subitemComps[subitemId] ?? false
      const next = !prev
      const prevHabitComp = habitComps[habitId] ?? false
      const prevSkip = habitSkips[habitId] ?? false
      const updatedSubComps = { ...subitemComps, [subitemId]: next }
      const allDone = allSubitemIds.every((id) => updatedSubComps[id] === true)

      setSubitemComps(updatedSubComps)
      setHabitComps((c) => ({ ...c, [habitId]: allDone }))
      if (next && prevSkip) {
        setHabitSkips((s) => ({ ...s, [habitId]: false }))
      }

      toggleSubitemCompletionAction({
        date,
        habitId,
        subitemId,
        isCompleted: next,
        allSubitemIds,
        currentSubitemCompletions: updatedSubComps,
      })
        .then((res) => {
          if (res?.error) {
            setSubitemComps((c) => ({ ...c, [subitemId]: prev }))
            setHabitComps((c) => ({ ...c, [habitId]: prevHabitComp }))
            if (next && prevSkip) {
              setHabitSkips((s) => ({ ...s, [habitId]: true }))
            }
            setActionError(`Could not update checklist item: ${res.error}`)
            setTimeout(() => setActionError(null), 3500)
          }
        })
        .catch(() => {
          setSubitemComps((c) => ({ ...c, [subitemId]: prev }))
          setHabitComps((c) => ({ ...c, [habitId]: prevHabitComp }))
          if (next && prevSkip) {
            setHabitSkips((s) => ({ ...s, [habitId]: true }))
          }
          setActionError('Network error updating checklist item')
          setTimeout(() => setActionError(null), 3500)
        })
        .finally(() => {
          inFlightSubitemsRef.current.delete(subitemId)
        })
    },
    [subitemComps, habitComps, habitSkips, date]
  )

  const handleToggleSkip = useCallback((habitId: string) => {
    if (inFlightSkipsRef.current.has(habitId)) return
    inFlightSkipsRef.current.add(habitId)
    isUserActionRef.current = true

    const prev = habitSkips[habitId] ?? false
    const next = !prev
    setHabitSkips((s) => ({ ...s, [habitId]: next }))
    if (next) {
      setHabitComps((c) => ({ ...c, [habitId]: false }))
    }

    toggleHabitSkipAction({ date, habitId, isSkipped: next })
      .then((res) => {
        if (res?.error) {
          setHabitSkips((s) => ({ ...s, [habitId]: prev }))
          setActionError(`Could not update skip status: ${res.error}`)
          setTimeout(() => setActionError(null), 3500)
        }
      })
      .catch(() => {
        setHabitSkips((s) => ({ ...s, [habitId]: prev }))
        setActionError('Network error updating skip status')
        setTimeout(() => setActionError(null), 3500)
      })
      .finally(() => {
        inFlightSkipsRef.current.delete(habitId)
      })
  }, [habitSkips, date])

  const handleToggleDay = useCallback((targetDate: string, habitId: string) => {
    if (targetDate === date) {
      handleToggleHabit(habitId)
      return
    }

    const currentVal = recentComps[targetDate]?.[habitId] ?? false
    const nextVal = !currentVal

    setRecentComps((prev) => ({
      ...prev,
      [targetDate]: {
        ...(prev[targetDate] ?? {}),
        [habitId]: nextVal,
      },
    }))

    if (nextVal) {
      playCompletionChime()
    }

    toggleHabitCompletionAction({ date: targetDate, habitId, isCompleted: nextVal })
      .then((res) => {
        if (res?.error) {
          setRecentComps((prev) => ({
            ...prev,
            [targetDate]: {
              ...(prev[targetDate] ?? {}),
              [habitId]: currentVal,
            },
          }))
          setActionError(`Failed to update ${targetDate}: ${res.error}`)
          setTimeout(() => setActionError(null), 3500)
        }
      })
      .catch(() => {
        setRecentComps((prev) => ({
          ...prev,
          [targetDate]: {
            ...(prev[targetDate] ?? {}),
            [habitId]: currentVal,
          },
        }))
        setActionError(`Network error updating ${targetDate}`)
        setTimeout(() => setActionError(null), 3500)
      })
  }, [date, recentComps, handleToggleHabit])

  // Sync today's completions into recentComps[date]
  useEffect(() => {
    setRecentComps((prev) => ({
      ...prev,
      [date]: habitComps,
    }))
  }, [date, habitComps])

  const prevPctRef = useRef(pct)
  useEffect(() => {
    // Only celebrate if this transition was triggered by a user action and reached 100%
    if (isUserActionRef.current && totalCount > 0 && completedCount > 0 && pct >= 100 && prevPctRef.current < 100) {
      setShowCelebration(true)
      playCompletionChime()
      const timer = setTimeout(() => setShowCelebration(false), 1800)
      return () => clearTimeout(timer)
    }
    prevPctRef.current = pct
  }, [pct, totalCount, completedCount])

  const d = new Date(date + 'T00:00:00')
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()]
  const formattedDate = `${dayName}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`

  return (
    <div className="page-container" style={{ maxWidth: 740, margin: '0 auto', paddingBottom: 64 }}>
      <AnimatePresence>{showCelebration && <CelebrationOverlay />}</AnimatePresence>

      {/* Weekly Intention Line at Very Top */}
      <WeeklyIntention initialIntention={initialIntention} />

      {/* Yesterday Quick-Fill Banner if empty */}
      {yesterdayEmpty && yesterdayDate && date !== yesterdayDate && (
        <Link
          href={`/today?date=${yesterdayDate}`}
          className="flex items-center justify-between px-3 py-2 rounded bg-[var(--surface-raised)] border border-[var(--border)] text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors mb-4 group"
        >
          <span>[ Yesterday Is Empty ] · Fill it in</span>
          <ArrowRight size={13} className="text-[var(--accent)] group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* Notice if viewing a backfill / past date */}
      {date === yesterdayDate && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded bg-[var(--surface-raised)] border border-[var(--border)] text-xs font-mono text-[var(--accent)] mb-4">
          <span>[ Backfilling Yesterday: {yesterdayDate} ]</span>
          <Link href="/today" className="hover:underline text-[var(--text-primary)]">
            Return to Today →
          </Link>
        </div>
      )}

      {/* Path Breadcrumb & Saved status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p
          className="text-path"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.04em',
            margin: 0,
          }}
        >
          ~/ today
        </p>

        {/* Auto-save indicator */}
        <AnimatePresence>
          {showSaved && (
            <motion.span
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.2 }}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                color: 'var(--accent)',
                letterSpacing: '0.08em',
                fontWeight: 600,
              }}
            >
              &middot; Saved
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* User Action Error Toast */}
      <AnimatePresence>
        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center justify-between p-3 rounded mb-4 font-mono text-xs"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--color-danger, #ef4444)',
            }}
          >
            <span>[ Alert ] {actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer ml-3 font-mono"
              aria-label="Dismiss alert"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with Compact Progress: X/13 · X% · today's date */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        style={{
          padding: '20px 22px',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 32,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div className="flex items-center gap-3">
            <h1
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Check-In
            </h1>
            <button
              type="button"
              onClick={() => {
                setFocusTimerHabit(null)
                setFocusTimerOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--accent)] font-mono text-xs font-semibold hover:border-[var(--accent)] active:scale-95 transition-all shadow-2xs"
              title="Open Pomodoro & Focus Clock"
            >
              <Clock size={12} />
              <span>Focus Timer</span>
            </button>
          </div>

          {/* Compact Progress (X/13 · X% · today's date) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {completedCount}/{totalCount}
            </span>
            <span>&middot;</span>
            <span style={{ fontWeight: 700, color: isPerfect ? 'var(--accent)' : 'var(--text-primary)' }}>
              {pct}%
            </span>
            <span>&middot;</span>
            <span style={{ fontSize: '0.8rem' }}>{formattedDate}</span>
          </div>
        </div>

        {/* Progress track */}
        <div
          style={{
            marginTop: 14,
            height: 4,
            backgroundColor: 'var(--border)',
            borderRadius: 99,
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: pct / 100 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            style={{
              height: '100%',
              backgroundColor: 'var(--accent)',
              transformOrigin: 'left',
            }}
          />
        </div>
      </motion.div>

      {/* ── HABITS LIST & VIEW SWITCHER ───────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span className="section-label">DAILY DISCIPLINES</span>

        {/* View Switcher: Classic vs. 5-Day Strip */}
        <div className="flex items-center gap-1 p-0.5 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] font-mono text-[11px]">
          <button
            type="button"
            onClick={() => setViewMode('classic')}
            className={`px-3 py-1 rounded-full transition-all font-semibold flex items-center gap-1.5 ${
              viewMode === 'classic'
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs border border-[var(--border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <SlidersHorizontal size={11} />
            <span>Classic</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('minimal')}
            className={`px-3 py-1 rounded-full transition-all font-semibold flex items-center gap-1.5 ${
              viewMode === 'minimal'
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs border border-[var(--border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Grid size={11} />
            <span>5-Day Strip</span>
          </button>
        </div>
      </div>

      {/* Minimal Mode Column Headers (Weekdays) */}
      {viewMode === 'minimal' && recentDays.length > 0 && (
        <div className="flex items-center justify-between px-4 py-1.5 mb-2 font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
          <span>HABIT</span>
          <div className="flex items-center gap-1.5 pr-1">
            {recentDays.map((d) => (
              <span
                key={d.date}
                className={`w-6 sm:w-7 text-center font-bold ${
                  d.isToday ? 'text-[var(--accent)] font-extrabold' : ''
                }`}
              >
                {d.dayLabel.slice(0, 3)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 44 }}>
        {habits.length === 0 ? (
          <div
            style={{
              padding: '36px 24px',
              textAlign: 'center',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--surface)',
            }}
          >
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              No habits configured yet. Build your personal system.
            </p>
            <Link
              href="/settings"
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.8125rem',
                padding: '8px 18px',
              }}
            >
              + Add Your First Habit
            </Link>
          </div>
        ) : (
          habits.map((habit, i) => {
            // Build 5-day completions lookup map for this habit
            const dayCompletionsMap: Record<string, boolean> = {}
            for (const d of recentDays) {
              dayCompletionsMap[d.date] = d.isToday
                ? habitComps[habit.id] ?? false
                : recentComps[d.date]?.[habit.id] ?? false
            }

            return (
              <motion.div
                key={habit.id}
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.025, duration: 0.3 }}
              >
                <HabitRow
                  habit={habit}
                  isCompleted={habitComps[habit.id] ?? false}
                  isSkipped={habitSkips[habit.id] ?? false}
                  subitemCompletions={subitemComps}
                  onToggle={() => handleToggleHabit(habit.id)}
                  onToggleSkip={() => handleToggleSkip(habit.id)}
                  onToggleSubitem={(subitemId, allIds) => handleToggleSubitem(habit.id, subitemId, allIds)}
                  onOpenTimer={(h) => {
                    setFocusTimerHabit(h)
                    setFocusTimerOpen(true)
                  }}
                  minimalMode={viewMode === 'minimal'}
                  recentDays={recentDays}
                  dayCompletions={dayCompletionsMap}
                  onToggleDay={(d) => handleToggleDay(d, habit.id)}
                />
              </motion.div>
            )
          })
        )}
      </div>

      {/* ── WELLBEING SECTION (Clean, uncluttered) ───────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span className="section-label">WELLBEING & NOTES</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Mood & Energy in 2-col grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div
            style={{
              padding: '16px 18px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <p className="section-label" style={{ marginBottom: 12 }}>
              Mood
            </p>
            <SignalBarSelector value={mood} onChange={setMood} color="var(--accent)" />
          </div>

          <div
            style={{
              padding: '16px 18px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <p className="section-label" style={{ marginBottom: 12 }}>
              Energy
            </p>
            <SignalBarSelector value={energy} onChange={setEnergy} color="var(--accent)" />
          </div>
        </div>

        {/* Sleep, Weight, Screen Time in 3-col grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <p className="section-label" style={{ marginBottom: 8 }}>
              Sleep (Hrs)
            </p>
            <input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={sleep}
              onChange={(e) => setSleep(e.target.value)}
              placeholder="7.5"
              style={{
                width: '100%',
                padding: '8px 10px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.9rem',
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <p className="section-label" style={{ marginBottom: 8 }}>
              Weight (Kg)
            </p>
            <input
              type="number"
              min="0"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="70.0"
              style={{
                width: '100%',
                padding: '8px 10px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.9rem',
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <p className="section-label" style={{ marginBottom: 8 }}>
              Screen (Min)
            </p>
            <input
              type="number"
              min="0"
              step="5"
              value={screenTime}
              onChange={(e) => setScreenTime(e.target.value)}
              placeholder="120"
              style={{
                width: '100%',
                padding: '8px 10px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.9rem',
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Daily reflection notes */}
        <div
          style={{
            padding: '16px 18px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <p className="section-label" style={{ marginBottom: 8 }}>
            Daily Reflections
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did today go? Context, thoughts, or wins..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.875rem',
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Distraction-Free Focus & Pomodoro Timer Modal */}
      <FocusTimerModal
        isOpen={focusTimerOpen}
        onClose={() => setFocusTimerOpen(false)}
        habit={focusTimerHabit}
        habits={habits}
        onCompleteHabit={(habitId) => {
          if (!habitComps[habitId]) {
            handleToggleHabit(habitId)
          }
        }}
      />
    </div>
  )
}
