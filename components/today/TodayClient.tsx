'use client'
// components/today/TodayClient.tsx — Daily check-in with refined typography & auto-save
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import type { HabitWithSubitems, DayEntry, DayCompletionState } from '@/lib/supabase/types'
import { computeDailyScore, isHabitActiveOnDate } from '@/lib/scoring'
import {
  toggleHabitCompletionAction,
  toggleHabitSkipAction,
  toggleSubitemCompletionAction,
  setHabitAmountAction,
} from '@/actions/completion.actions'
import { seedDefaultDataAction } from '@/actions/habit.actions'
import { updateDayEntryAction } from '@/actions/entry.actions'
import { HabitCardView } from '@/components/habit/HabitCardView'
import { SignalBarSelector } from './SignalBarSelector'
import { CelebrationOverlay } from './CelebrationOverlay'
import { WeeklyIntention } from './WeeklyIntention'
import { FocusTimerModal } from './FocusTimerModal'
import { playCompletionChime } from '@/lib/audio'
import { addDays } from '@/lib/stats/habit-math'
import { enqueueOfflineMutation } from '@/lib/offline-queue'
import Link from 'next/link'
import { ArrowRight, Clock, SlidersHorizontal, Grid, Check, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  userId?: string
  date: string
  today?: string
  entry: DayEntry | null
  habits: HabitWithSubitems[]
  completions: DayCompletionState
  weekStrip?: Array<{
    date: string
    dayLabel: string
    dayNum: string
    isViewing: boolean
    isToday: boolean
    isFuture: boolean
    completionPct: number
  }>
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
  userId,
  date,
  today,
  entry,
  habits,
  completions,
  weekStrip = [],
  yesterdayEmpty,
  yesterdayDate,
  initialIntention,
  recentDays = [],
  recentCompletions = {},
}: Props) {
  const router = useRouter()
  const currentUserId = userId || entry?.user_id || habits[0]?.user_id || ''
  const [habitComps, setHabitComps] = useState(completions.habitCompletions)
  const [habitSkips, setHabitSkips] = useState<Record<string, boolean>>(completions.habitSkips ?? {})
  const [subitemComps, setSubitemComps] = useState(completions.subitemCompletions)
  const [habitAmounts, setHabitAmounts] = useState<Record<string, number>>(completions.habitAmounts ?? {})
  const [habitTargets, setHabitTargets] = useState<Record<string, number | null>>(completions.habitTargets ?? {})

  // Zero habits auto-seed handling
  const [isSeeding, setIsSeeding] = useState(false)
  const [seedError, setSeedError] = useState<string | null>(null)

  const handleSeedDefaultHabits = async () => {
    setIsSeeding(true)
    setSeedError(null)
    try {
      const res = await seedDefaultDataAction()
      if (res.success) {
        router.refresh()
      } else {
        setSeedError(res.error || 'Failed to seed default habits')
      }
    } catch (err: any) {
      setSeedError(err?.message || 'Network error while attempting to set up default habits')
    } finally {
      setIsSeeding(false)
    }
  }

  // Status Filter: All, To Do, Done
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'done'>('all')

  // Haptic feedback function for habit check
  const triggerHaptic = useCallback(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(8)
      } catch {}
    }
  }, [])

  // Week navigation
  const handlePrevWeek = useCallback(() => {
    if (weekStrip.length > 0) {
      const prevMonday = addDays(weekStrip[0].date, -7)
      router.push(`/today?date=${prevMonday}`)
    }
  }, [weekStrip, router])

  const handleNextWeek = useCallback(() => {
    if (weekStrip.length > 0) {
      const nextMonday = addDays(weekStrip[0].date, 7)
      const maxDate = today ?? date
      if (nextMonday <= maxDate) {
        router.push(`/today?date=${nextMonday}`)
      } else if (today && weekStrip[0].date < today) {
        router.push(`/today?date=${today}`)
      }
    }
  }, [weekStrip, today, date, router])

  // 5-Day Minimal Strip & Focus Timer State
  const [viewMode, setViewMode] = useState<'classic' | 'minimal'>('classic')
  const [recentComps, setRecentComps] = useState<Record<string, Record<string, boolean>>>(recentCompletions)
  const [focusTimerOpen, setFocusTimerOpen] = useState(false)
  const [focusTimerHabit, setFocusTimerHabit] = useState<HabitWithSubitems | null>(null)

  const [mood, setMood] = useState<number | null>(entry?.mood ?? null)
  const [energy, setEnergy] = useState<number | null>(entry?.energy ?? null)
  const [sleep, setSleep] = useState<string>(entry?.sleep_hours?.toString() ?? '')
  const [weight, setWeight] = useState<string>(entry?.weight_kg?.toString() ?? '')
  const [screenTime, setScreenTime] = useState<string>(entry?.screen_time_minutes?.toString() ?? '')
  const [notes, setNotes] = useState<string>(entry?.notes ?? '')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'focus' | 'body' | 'mind' | 'routine'>('all')
  const [noteTag, setNoteTag] = useState<'Note' | 'Planned' | 'Completed'>(() => {
    const raw = entry?.notes ?? ''
    if (raw.startsWith('[Planned]')) return 'Planned'
    if (raw.startsWith('[Completed]')) return 'Completed'
    return 'Note'
  })
  const [showCelebration, setShowCelebration] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // In-flight tracking to prevent race conditions on rapid clicking
  const inFlightHabitsRef = useRef<Set<string>>(new Set())
  const inFlightSubitemsRef = useRef<Set<string>>(new Set())
  const inFlightSkipsRef = useRef<Set<string>>(new Set())

  // Debouncing for amount habit updates (300ms)
  const amountDebounceTimers = useRef<Record<string, NodeJS.Timeout>>({})
  const lastCommittedAmounts = useRef<Record<string, number>>({})

  useEffect(() => {
    return () => {
      Object.values(amountDebounceTimers.current).forEach((t) => clearTimeout(t))
    }
  }, [])

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

  // Canonical scoring from lib/scoring
  const allSubitems = useMemo(() => habits.flatMap((h) => h.subitems ?? []), [habits])
  const completionsMap = useMemo(() => {
    const map: Record<string, { habit_id: string; is_completed: boolean; is_skipped: boolean }> = {}
    for (const h of habits) {
      map[h.id] = {
        habit_id: h.id,
        is_completed: habitComps[h.id] === true,
        is_skipped: habitSkips[h.id] === true,
      }
    }
    return map
  }, [habits, habitComps, habitSkips])

  const dailyScore = useMemo(() => {
    return computeDailyScore({
      date,
      habits,
      completionsMap,
      subitems: allSubitems,
      subitemCompletionsMap: subitemComps,
      habitSkipsMap: habitSkips,
    })
  }, [date, habits, completionsMap, allSubitems, subitemComps, habitSkips])

  const activeHabits = useMemo(() => {
    return habits.filter((h) => isHabitActiveOnDate(h, date, habitSkips[h.id] === true))
  }, [habits, date, habitSkips])

  const completedCount = dailyScore.completedCount
  const totalCount = dailyScore.totalActive
  const pct = dailyScore.completionPct
  const isPerfect = dailyScore.isPerfect

  // Category classification helper for Streak-style category filter pills
  const getHabitCategory = useCallback((h: HabitWithSubitems): 'focus' | 'body' | 'mind' | 'routine' => {
    const text = `${h.name} ${h.notes ?? ''}`.toLowerCase()
    if (text.match(/work|code|study|read|focus|learn|write|sprint|project|tasks?|deep|book|course/)) return 'focus'
    if (text.match(/gym|exercise|workout|run|walk|steps?|water|sleep|stretch|diet|eat|food|train|fitness/)) return 'body'
    if (text.match(/meditat|reflect|journal|calm|mind|breathe|gratitude|pray|peace|silence/)) return 'mind'
    return 'routine'
  }, [])

  const filteredHabits = habits.filter((h) => {
    if (selectedCategory !== 'all' && getHabitCategory(h) !== selectedCategory) {
      return false
    }
    const isDone = habitComps[h.id] === true
    const isSkipped = habitSkips[h.id] === true
    if (statusFilter === 'todo') {
      return !isDone && !isSkipped
    }
    if (statusFilter === 'done') {
      return isDone
    }
    return true
  })

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

    const initialSleep = entry?.sleep_hours ?? null
    const initialWeight = entry?.weight_kg ?? null
    const initialScreenTime = entry?.screen_time_minutes ?? null
    const initialNotes = entry?.notes ?? ''
    const initialMood = entry?.mood ?? null
    const initialEnergy = entry?.energy ?? null

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
    if (next) {
      triggerHaptic()
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (currentUserId) {
        enqueueOfflineMutation(currentUserId, 'setHabitCompletion', { date, habitId, isCompleted: next })
      }
      inFlightHabitsRef.current.delete(habitId)
      return
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
        // Enqueue offline rather than reverting
        if (currentUserId) {
          enqueueOfflineMutation(currentUserId, 'setHabitCompletion', { date, habitId, isCompleted: next })
        }
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
      if (next) {
        triggerHaptic()
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (currentUserId) {
          enqueueOfflineMutation(currentUserId, 'setSubitemCompletion', {
            date,
            habitId,
            subitemId,
            isCompleted: next,
            allSubitemIds,
            currentSubitemCompletions: updatedSubComps,
          })
        }
        inFlightSubitemsRef.current.delete(subitemId)
        return
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
          if (currentUserId) {
            enqueueOfflineMutation(currentUserId, 'setSubitemCompletion', {
              date,
              habitId,
              subitemId,
              isCompleted: next,
              allSubitemIds,
              currentSubitemCompletions: updatedSubComps,
            })
          }
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

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (currentUserId) {
        enqueueOfflineMutation(currentUserId, 'setHabitSkip', { date, habitId, isSkipped: next })
      }
      inFlightSkipsRef.current.delete(habitId)
      return
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
        if (currentUserId) {
          enqueueOfflineMutation(currentUserId, 'setHabitSkip', { date, habitId, isSkipped: next })
        }
      })
      .finally(() => {
        inFlightSkipsRef.current.delete(habitId)
      })
  }, [habitSkips, date])

  const handleSetAmount = useCallback(
    (habit: HabitWithSubitems, newAmount: number) => {
      const habitId = habit.id
      isUserActionRef.current = true

      const cleanAmount = Math.max(0, Math.min(1_000_000, Math.round(newAmount * 100) / 100))
      const prevAmount = habitAmounts[habitId] ?? 0
      const prevCompleted = habitComps[habitId] ?? false
      const prevSkip = habitSkips[habitId] ?? false

      if (lastCommittedAmounts.current[habitId] === undefined) {
        lastCommittedAmounts.current[habitId] = prevAmount
      }

      const target = habitTargets[habitId] !== undefined ? habitTargets[habitId] : (habit.target_value ?? null)
      const isComplete = target !== null ? cleanAmount >= target : false

      // Optimistic updates
      setHabitAmounts((prev) => ({ ...prev, [habitId]: cleanAmount }))
      setHabitComps((prev) => ({ ...prev, [habitId]: isComplete }))
      if (isComplete && prevSkip) {
        setHabitSkips((s) => ({ ...s, [habitId]: false }))
      }

      if (isComplete && !prevCompleted) {
        try {
          triggerHaptic()
          playCompletionChime()
        } catch {}
      }

      // 300ms debounce: rapid taps (+ + +) collapse into one write
      if (amountDebounceTimers.current[habitId]) {
        clearTimeout(amountDebounceTimers.current[habitId])
      }

      amountDebounceTimers.current[habitId] = setTimeout(async () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          if (currentUserId) {
            enqueueOfflineMutation(currentUserId, 'setHabitAmount', { habitId, date, amount: cleanAmount })
          }
          lastCommittedAmounts.current[habitId] = cleanAmount
          delete amountDebounceTimers.current[habitId]
          return
        }

        try {
          const res = await setHabitAmountAction({ habitId, date, amount: cleanAmount })
          if (res?.error) {
            const rollbackAmt = lastCommittedAmounts.current[habitId] ?? prevAmount
            const rollbackComp = target !== null ? rollbackAmt >= target : false
            setHabitAmounts((prev) => ({ ...prev, [habitId]: rollbackAmt }))
            setHabitComps((prev) => ({ ...prev, [habitId]: rollbackComp }))
            setActionError(`Could not save amount: ${res.error}`)
            setTimeout(() => setActionError(null), 3500)
          } else {
            lastCommittedAmounts.current[habitId] = cleanAmount
            if (res?.targetSnapshot !== undefined) {
              setHabitTargets((prev) => ({ ...prev, [habitId]: res.targetSnapshot }))
            }
          }
        } catch {
          // Enqueue offline rather than rolling back
          if (currentUserId) {
            enqueueOfflineMutation(currentUserId, 'setHabitAmount', { habitId, date, amount: cleanAmount })
          }
          lastCommittedAmounts.current[habitId] = cleanAmount
        } finally {
          delete amountDebounceTimers.current[habitId]
        }
      }, 300)
    },
    [habitAmounts, habitComps, habitSkips, habitTargets, date]
  )

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
      triggerHaptic()
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
    <div className="page-container" style={{ maxWidth: 740, margin: '0 auto', paddingBottom: 'calc(64px + var(--safe-bottom))' }}>
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

      {/* ── 7-DAY WEEK STRIP WITH COMPLETION RINGS ──────────────────── */}
      {weekStrip.length > 0 && (
        <div className="mb-6 p-3 sm:p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xs select-none">
          {/* Week Label & Navigation Buttons */}
          <div className="flex items-center justify-between mb-3 font-mono text-xs">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="p-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] active:scale-95 transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Previous week"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--text-primary)] tracking-wide">
                {weekStrip[0].dayNum} {MONTH_NAMES[parseInt(weekStrip[0].date.slice(5, 7), 10) - 1]?.slice(0, 3)} –{' '}
                {weekStrip[6].dayNum} {MONTH_NAMES[parseInt(weekStrip[6].date.slice(5, 7), 10) - 1]?.slice(0, 3)}
              </span>
              {date !== (today ?? date) && (
                <button
                  type="button"
                  onClick={() => router.push(today ? `/today?date=${today}` : '/today')}
                  className="text-[10px] uppercase font-bold px-3 py-2 rounded bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)]/25 transition-colors cursor-pointer min-h-[44px] inline-flex items-center"
                >
                  Today
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleNextWeek}
              disabled={Boolean(today && weekStrip[0].date >= today)}
              className="p-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Next week"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* 7 Day Circles with SVG Progress Rings (Swipe/Drag supported) */}
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x > 50 || info.velocity.x > 350) {
                handlePrevWeek()
              } else if (info.offset.x < -50 || info.velocity.x < -350) {
                handleNextWeek()
              }
            }}
            className="grid grid-cols-7 gap-1 sm:gap-2 touch-pan-y"
          >
            {weekStrip.map((day) => {
              const isViewing = day.isViewing
              const isFuture = day.isFuture
              const isToday = day.isToday
              const pctVal = isViewing ? pct : day.completionPct

              return (
                <button
                  key={day.date}
                  type="button"
                  disabled={isFuture}
                  onClick={() => {
                    if (!isFuture && !isViewing) {
                      router.push(`/today?date=${day.date}`)
                    }
                  }}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all min-h-[58px] select-none ${
                    isViewing
                      ? 'bg-[var(--surface-raised)] border border-[var(--accent)] shadow-xs scale-[1.03]'
                      : isFuture
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:bg-[var(--surface-raised)]/60 cursor-pointer'
                  }`}
                  aria-label={`${day.dayLabel} ${day.date}, ${pctVal}% completed`}
                  aria-current={isViewing ? 'date' : undefined}
                >
                  <span
                    className={`font-mono text-[10px] uppercase font-bold tracking-wider mb-1 ${
                      isViewing
                        ? 'text-[var(--accent)]'
                        : isToday
                        ? 'text-[var(--text-primary)] font-extrabold'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {day.dayLabel}
                  </span>

                  {/* SVG Completion Ring */}
                  <div className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="var(--border)"
                        strokeWidth="2.8"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="2.8"
                        strokeDasharray="88"
                        strokeDashoffset={88 - (88 * Math.min(100, pctVal)) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-300"
                      />
                    </svg>
                    <span
                      className={`absolute font-mono text-[10px] sm:text-xs font-bold ${
                        isViewing
                          ? 'text-[var(--text-primary)]'
                          : isToday
                          ? 'text-[var(--accent)]'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {day.dayNum}
                    </span>
                  </div>

                  {/* Tiny Today Indicator Dot */}
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1" />
                  )}
                </button>
              )
            })}
          </motion.div>
        </div>
      )}

      {/* ── STICKY COMPLETION HEADER ──────────────────────────────────── */}
      <div
        className="sticky top-0 z-30 -mx-4 px-4 bg-[var(--bg)]/95 backdrop-blur-md border-b border-[var(--border)] mb-4 flex items-center justify-between shadow-2xs"
        style={{
          paddingTop: 'calc(10px + var(--safe-top))',
          paddingBottom: 10,
        }}
      >
        <div className="flex items-center gap-2 font-mono text-xs font-semibold text-[var(--text-primary)]">
          <span className="text-[var(--accent)]">[</span>
          <span>
            {completedCount} of {totalCount} Done
          </span>
          <span className="text-[var(--accent)]">]</span>
          <span className="text-[var(--text-muted)]">&middot;</span>
          <span className="font-bold text-[var(--accent)]">{pct}%</span>
        </div>
        <div className="w-24 sm:w-36 h-2 bg-[var(--border)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.3 }}
            className="h-full bg-[var(--accent)] rounded-full"
          />
        </div>
      </div>

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
          marginBottom: 24,
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--accent)] font-mono text-xs font-semibold hover:border-[var(--accent)] active:scale-95 transition-all shadow-2xs cursor-pointer min-h-[44px]"
              title="Open Pomodoro & Focus Clock"
            >
              <Clock size={14} />
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

      {/* ── FILTER CHIPS (All, To Do, Done) ───────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar select-none">
        {[
          { key: 'all', label: 'All', count: activeHabits.length },
          { key: 'todo', label: 'To Do', count: activeHabits.filter((h) => !habitComps[h.id]).length },
          { key: 'done', label: 'Done', count: activeHabits.filter((h) => habitComps[h.id]).length },
        ].map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setStatusFilter(chip.key as any)}
            className={`px-3.5 py-2.5 rounded-full font-mono text-xs font-semibold transition-all flex items-center gap-1.5 min-h-[44px] cursor-pointer ${
              statusFilter === chip.key
                ? 'bg-[var(--accent)] text-white shadow-xs'
                : 'bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)]'
            }`}
            aria-pressed={statusFilter === chip.key}
          >
            <span>{chip.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                statusFilter === chip.key
                  ? 'bg-black/25 text-white'
                  : 'bg-[var(--surface)] text-[var(--text-muted)]'
              }`}
            >
              {chip.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── HABITS LIST & VIEW SWITCHER ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-3">
        <span className="section-label">DAILY DISCIPLINES</span>

        {/* View Switcher: Classic vs. Week Strip (Title above, toggle below on phones) */}
        <div className="flex items-center gap-1 p-0.5 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] font-mono text-[11px] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('classic')}
            className={`px-3 py-1.5 rounded-full transition-all font-semibold flex items-center gap-1.5 min-h-[36px] sm:min-h-0 ${
              viewMode === 'classic'
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs border border-[var(--border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <SlidersHorizontal size={13} />
            <span>Classic</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('minimal')}
            className={`px-3 py-1.5 rounded-full transition-all font-semibold flex items-center gap-1.5 min-h-[36px] sm:min-h-0 ${
              viewMode === 'minimal'
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs border border-[var(--border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Grid size={13} />
            <span>Week</span>
          </button>
        </div>
      </div>

      {/* Streak-Style Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-3.5 no-scrollbar select-none">
        {[
          { key: 'all', label: 'All', count: activeHabits.length },
          { key: 'focus', label: 'Focus', count: activeHabits.filter((h) => getHabitCategory(h) === 'focus').length },
          { key: 'body', label: 'Body', count: activeHabits.filter((h) => getHabitCategory(h) === 'body').length },
          { key: 'mind', label: 'Mind', count: activeHabits.filter((h) => getHabitCategory(h) === 'mind').length },
          { key: 'routine', label: 'Routine', count: activeHabits.filter((h) => getHabitCategory(h) === 'routine').length },
        ].map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setSelectedCategory(cat.key as any)}
            className={`px-3 py-1 rounded-full font-mono text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              selectedCategory === cat.key
                ? 'bg-[var(--accent)] text-white shadow-xs'
                : 'bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)]'
            }`}
          >
            <span>{cat.label}</span>
            {cat.count > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedCategory === cat.key
                    ? 'bg-black/25 text-white'
                    : 'bg-[var(--surface)] text-[var(--text-muted)]'
                }`}
              >
                {cat.count}
              </span>
            )}
          </button>
        ))}
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
              padding: '40px 24px',
              textAlign: 'center',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--surface)',
              maxWidth: 440,
              margin: '0 auto',
              width: '100%',
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.375rem',
                fontWeight: 400,
                color: 'var(--text-main)',
                marginBottom: 8,
              }}
            >
              Build Your Daily System
            </h3>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              You have no active habits yet. Start with our 13 curated discipline habits, or build your routine from scratch.
            </p>

            {seedError && (
              <p
                role="alert"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--accent-rose, #d95f4f)',
                  marginBottom: 16,
                }}
              >
                Error: {seedError}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <button
                onClick={handleSeedDefaultHabits}
                disabled={isSeeding}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: '0.8125rem',
                  padding: '10px 20px',
                  width: '100%',
                  maxWidth: 260,
                  cursor: isSeeding ? 'not-allowed' : 'pointer',
                }}
              >
                {isSeeding ? 'Setting up habits...' : 'Start with the default habits'}
              </button>

              <Link
                href="/settings"
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8125rem',
                  padding: '10px 20px',
                  width: '100%',
                  maxWidth: 260,
                  textDecoration: 'none',
                }}
              >
                Start blank
              </Link>
            </div>
          </div>
        ) : filteredHabits.length === 0 ? (
          <div
            style={{
              padding: '28px 20px',
              textAlign: 'center',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--surface)',
            }}
          >
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              No habits under &ldquo;{selectedCategory}&rdquo; category.
            </p>
          </div>
        ) : (
          filteredHabits.map((habit, i) => {
            // Build 5-day completions lookup map for this habit
            const dayCompletionsMap: Record<string, boolean> = {}
            for (const d of recentDays) {
              dayCompletionsMap[d.date] = d.isToday
                ? habitComps[habit.id] ?? false
                : recentComps[d.date]?.[habit.id] ?? false
            }

            const isCompleted = habitComps[habit.id] ?? false
            const isSkipped = habitSkips[habit.id] ?? false
            const currentAmt = habitAmounts[habit.id] ?? 0
            const targetVal = habitTargets[habit.id] !== undefined ? habitTargets[habit.id] : (habit.target_value ?? null)
            const progressPct =
              habit.type === 'amount' && targetVal && targetVal > 0
                ? Math.min(100, Math.round((currentAmt / targetVal) * 100))
                : habit.type === 'checklist' && habit.subitems?.length
                ? Math.round(
                    (habit.subitems.filter((s) => subitemComps[s.id] === true).length / habit.subitems.length) * 100
                  )
                : isCompleted
                ? 100
                : 0

            return (
              <motion.div
                key={habit.id}
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.025, duration: 0.3 }}
              >
                <HabitCardView
                  habitId={habit.id}
                  variant={habit.type as 'amount' | 'checkbox' | 'checklist'}
                  title={habit.name}
                  subtitle={habit.notes}
                  icon={habit.icon}
                  accentColor={habit.color}
                  completed={isCompleted}
                  isSkipped={isSkipped}
                  progressPct={progressPct}
                  currentAmount={currentAmt}
                  targetAmount={targetVal}
                  unit={habit.unit}
                  stepValue={habit.step_value ?? 1}
                  onSetAmount={(val) => handleSetAmount(habit, val)}
                  subitems={habit.subitems.map((s) => ({
                    id: s.id,
                    name: s.name,
                    completed: subitemComps[s.id] ?? false,
                  }))}
                  onToggleSubitem={(subitemId) =>
                    handleToggleSubitem(
                      habit.id,
                      subitemId,
                      habit.subitems.map((s) => s.id)
                    )
                  }
                  onToggle={() => handleToggleHabit(habit.id)}
                  onToggleSkip={() => handleToggleSkip(habit.id)}
                  onOpenTimer={() => {
                    setFocusTimerHabit(habit)
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
        {/* Mood & Energy in 1-col on mobile, 2-col on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        {/* A Day Note — Streak Inspired Reflection Card */}
        <div
          style={{
            padding: '20px 22px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          {/* Header Row: Title + Type Chips + Target Time & Save Indicator */}
          <div className="flex items-center justify-between flex-wrap gap-2.5 mb-3.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                A Day Note
              </span>

              {/* Type Chips (Note, Planned, Completed) */}
              <div className="flex items-center gap-1 font-mono text-[11px]">
                {(['Note', 'Planned', 'Completed'] as const).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setNoteTag(tag)
                      const clean = notes.replace(/^\[(Note|Planned|Completed)\]\s*/, '')
                      setNotes(`[${tag}] ${clean}`)
                    }}
                    className={`px-2.5 py-0.5 rounded-full border transition-all text-[10px] font-semibold flex items-center gap-1.5 ${
                      noteTag === tag
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs'
                        : 'bg-[var(--surface-raised)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Time & Save Status */}
            <div className="flex items-center gap-3 font-mono text-[11px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)]">
                <Clock size={11} className="text-[var(--accent)]" />
                <span>Target: 21:30</span>
              </span>
              {showSaved && (
                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                  <Check size={12} />
                  <span>Saved</span>
                </span>
              )}
            </div>
          </div>

          <textarea
            value={notes}
            maxLength={500}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ten pages tonight, slower than usual but I kept going. How did today go? Context, thoughts, or wins..."
            rows={3}
            style={{
              width: '100%',
              padding: '12px 14px',
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

          {/* Footer Row: Live Character Counter */}
          <div className="flex items-center justify-between pt-2.5 font-mono text-[10px] text-[var(--text-muted)]">
            <span>Reflect calmly &middot; auto-saved securely</span>
            <span className={notes.length > 450 ? 'text-amber-500 font-bold' : ''}>
              {notes.length} / 500 chars
            </span>
          </div>
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
