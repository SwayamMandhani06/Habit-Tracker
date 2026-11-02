'use client'
// components/grid/MonthlyGrid.tsx — Digitized paper habit tracker grid
import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Check, Minus, FileText, X } from 'lucide-react'
import type { Habit, DayEntry, DailyScore } from '@/lib/supabase/types'
import { toggleHabitCompletionAction } from '@/actions/completion.actions'
import { getMonthDateRange } from '@/lib/date'
import { getHabitColorVar } from '@/lib/habit-theme'
import { getWeekdayMon1, addDays } from '@/lib/stats/habit-math'
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet'

interface Props {
  year: number
  month: number
  habits: Habit[]
  entries: DayEntry[]
  completionData: {
    habitCompletions: Array<{
      day_entry_id: string
      habit_id: string
      is_completed: boolean
      is_skipped?: boolean
      amount?: number
      target_snapshot?: number | null
    }>
    subitemCompletions: Array<{ day_entry_id: string; subitem_id: string; is_completed: boolean }>
  }
  scores: DailyScore[]
  today: string
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function MonthlyGrid({ year, month, habits, entries, completionData, scores, today }: Props) {
  const router = useRouter()
  const { daysInMonth } = getMonthDateRange(year, month)

  // Build entry map: date → entry id
  const entryMap = useMemo(
    () => new Map(entries.map((e) => [e.date, e])),
    [entries]
  )

  // Local optimistic overrides map
  const [localOverrides, setLocalOverrides] = useState<Map<string, boolean>>(new Map())
  const [localSkipOverrides, setLocalSkipOverrides] = useState<Map<string, boolean>>(new Map())
  const [activeNote, setActiveNote] = useState<{ id: string; name: string; notes: string } | null>(null)

  // Reset local overrides when viewing a different month or year
  useEffect(() => {
    setLocalOverrides(new Map())
    setLocalSkipOverrides(new Map())
  }, [year, month])

  // Escape key handler for note modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeNote) {
        setActiveNote(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeNote])

  const compMap = useMemo(() => {
    const m = new Map<string, boolean>()
    for (const c of completionData.habitCompletions) {
      m.set(`${c.day_entry_id}__${c.habit_id}`, c.is_completed)
    }
    for (const [k, v] of localOverrides) m.set(k, v)
    return m
  }, [completionData, localOverrides])

  const skipMap = useMemo(() => {
    const m = new Map<string, boolean>()
    for (const c of completionData.habitCompletions) {
      if (c.is_skipped) {
        m.set(`${c.day_entry_id}__${c.habit_id}`, true)
      }
    }
    for (const [k, v] of localSkipOverrides) {
      if (v) {
        m.set(k, true)
      } else {
        m.delete(k)
      }
    }
    return m
  }, [completionData, localSkipOverrides])

  const amountMap = useMemo(() => {
    const m = new Map<string, { amount: number; targetSnapshot: number | null }>()
    for (const c of completionData.habitCompletions) {
      m.set(`${c.day_entry_id}__${c.habit_id}`, {
        amount: c.amount ?? 0,
        targetSnapshot: c.target_snapshot !== undefined ? c.target_snapshot : null,
      })
    }
    return m
  }, [completionData])

  // Build score map: date → score
  const scoreMap = new Map(scores.map((s) => [s.date, s]))

  const handleDateToggle = useCallback(
    async (dateStr: string, habitId: string) => {
      if (dateStr > today) return

      if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(8)
        } catch {}
      }

      const entry = entryMap.get(dateStr)
      const entryId = entry?.id

      if (!entryId) {
        await toggleHabitCompletionAction({ date: dateStr, habitId, isCompleted: true })
        router.refresh()
        return
      }

      const key = `${entryId}__${habitId}`
      const current = compMap.get(key) ?? false
      const next = !current
      const wasSkipped = skipMap.get(key) ?? false

      setLocalOverrides((prev) => new Map(prev).set(key, next))
      if (next && wasSkipped) {
        setLocalSkipOverrides((prev) => new Map(prev).set(key, false))
      }

      toggleHabitCompletionAction({ date: dateStr, habitId, isCompleted: next }).then((res) => {
        if (res?.error) {
          setLocalOverrides((prev) => new Map(prev).set(key, current))
          if (next && wasSkipped) {
            setLocalSkipOverrides((prev) => new Map(prev).set(key, true))
          }
        }
      })
    },
    [compMap, skipMap, entryMap, today, router]
  )

  const handleCellToggle = useCallback(
    async (day: number, habitId: string) => {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      await handleDateToggle(dateStr, habitId)
    },
    [handleDateToggle, year, month]
  )

  // Mobile week navigation state (anchored to today if in viewed month/year, else 1st of month)
  const initialMobileMonday = useMemo(() => {
    const todayYMD = today.slice(0, 10)
    const [tY, tM] = todayYMD.split('-').map(Number)
    let anchorDate = `${year}-${String(month).padStart(2, '0')}-01`
    if (tY === year && tM === month) {
      anchorDate = todayYMD
    }
    const weekday = getWeekdayMon1(anchorDate) // 1=Mon ... 7=Sun
    return addDays(anchorDate, -(weekday - 1))
  }, [year, month, today])

  const [mobileMonday, setMobileMonday] = useState(initialMobileMonday)

  useEffect(() => {
    setMobileMonday(initialMobileMonday)
  }, [initialMobileMonday])

  const mobileWeekDays = useMemo(() => {
    const res: Array<{ date: string; dayNum: string; dayLabel: string; isToday: boolean; isFuture: boolean }> = []
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    for (let i = 0; i < 7; i++) {
      const dStr = addDays(mobileMonday, i)
      res.push({
        date: dStr,
        dayNum: dStr.slice(8, 10),
        dayLabel: labels[i],
        isToday: dStr === today,
        isFuture: dStr > today,
      })
    }
    return res
  }, [mobileMonday, today])

  const handleMobilePrevWeek = () => {
    setMobileMonday((m) => addDays(m, -7))
  }

  const handleMobileNextWeek = () => {
    setMobileMonday((m) => addDays(m, 7))
  }

  const prevMonth = () => {
    const m = month === 1 ? 12 : month - 1
    const y = month === 1 ? year - 1 : year
    router.push(`/grid?year=${y}&month=${m}`)
  }
  const nextMonth = () => {
    const m = month === 12 ? 1 : month + 1
    const y = month === 12 ? year + 1 : year
    router.push(`/grid?year=${y}&month=${m}`)
  }

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <div className="page-container" style={{ paddingBottom: 64 }}>
      {/* Breadcrumb & Title */}
      <motion.p
        className="text-path"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          marginBottom: 10,
        }}
      >
        ~/ grid
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.025em',
            margin: 0,
          }}
        >
          Monthly Grid
        </h1>

        {/* Month navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn-icon"
            onClick={prevMonth}
            aria-label="Previous Month"
            style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, padding: 0 }}
          >
            <ChevronLeft size={16} />
          </button>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {MONTHS[month - 1]} {year}
          </span>
          <button
            className="btn-icon"
            onClick={nextMonth}
            aria-label="Next Month"
            style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, padding: 0 }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </motion.div>

      {/* ── MOBILE WEEK MATRIX (below 768px) ────────────────────────── */}
      <div className="md:hidden space-y-4">
        {/* Week navigation bar */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] font-mono text-xs">
          <button
            type="button"
            onClick={handleMobilePrevWeek}
            aria-label="Previous week"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="text-center">
            <span className="font-bold text-[var(--text-primary)] tracking-wide">
              {mobileWeekDays[0].date.slice(5)} – {mobileWeekDays[6].date.slice(5)}
            </span>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              Swipe or tap arrows to navigate
            </p>
          </div>

          <button
            type="button"
            onClick={handleMobileNextWeek}
            aria-label="Next week"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* 7-Day Matrix Table (Swipe-enabled) */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.x > 50 || info.velocity.x > 350) {
              handleMobilePrevWeek()
            } else if (info.offset.x < -50 || info.velocity.x < -350) {
              handleMobileNextWeek()
            }
          }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-2xs touch-pan-y"
        >
          {/* Day Headers */}
          <div className="grid grid-cols-[100px_repeat(7,1fr)] items-center border-b border-[var(--border)] bg-[var(--surface-raised)]/70 py-2.5 px-2 font-mono text-[10px]">
            <span className="text-[var(--text-muted)] font-bold uppercase tracking-wider pl-1">
              Habit
            </span>
            {mobileWeekDays.map((d) => (
              <div
                key={d.date}
                className={`text-center font-bold flex flex-col items-center ${
                  d.isToday
                    ? 'text-[var(--accent)] font-extrabold'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                <span>{d.dayLabel}</span>
                <span className="text-[9px] opacity-80">{d.dayNum}</span>
              </div>
            ))}
          </div>

          {/* Habit Rows */}
          <div className="divide-y divide-[var(--border)]">
            {habits.map((habit) => {
              const habitColor = getHabitColorVar(habit.color)
              const habitCreatedDate = habit.created_at ? habit.created_at.slice(0, 10) : ''
              const habitArchivedDate = habit.is_archived && habit.archived_at ? habit.archived_at.slice(0, 10) : ''

              return (
                <div
                  key={habit.id}
                  className="grid grid-cols-[100px_repeat(7,1fr)] items-center py-2 px-2"
                >
                  {/* Habit Name column */}
                  <div className="pr-1 min-w-0">
                    <Link
                      href={`/habits/${habit.id}`}
                      className="font-mono text-xs font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] hover:underline truncate block"
                      title={habit.name}
                    >
                      {habit.name}
                    </Link>
                    <span className="font-mono text-[9px] text-[var(--text-muted)] truncate block capitalize">
                      {habit.type}
                    </span>
                  </div>

                  {/* 7 Check Squares */}
                  {mobileWeekDays.map((d) => {
                    const isBeforeCreation = Boolean(habitCreatedDate && d.date < habitCreatedDate)
                    const isAfterArchived = Boolean(habitArchivedDate && d.date > habitArchivedDate)
                    const isInactive = isBeforeCreation || isAfterArchived
                    const isDisabled = d.isFuture || isInactive

                    const entry = entryMap.get(d.date)
                    const key = entry ? `${entry.id}__${habit.id}` : null
                    const done = key ? compMap.get(key) ?? false : false
                    const isSkipped = key ? skipMap.get(key) ?? false : false

                    return (
                      <div key={d.date} className="flex justify-center items-center py-0.5">
                        <button
                          type="button"
                          disabled={isDisabled}
                          onClick={() => handleDateToggle(d.date, habit.id)}
                          aria-label={`${habit.name} on ${d.date}: ${done ? 'Done' : 'Not done'}`}
                          className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg border flex items-center justify-center transition-all select-none ${
                            isDisabled
                              ? 'opacity-20 border-dashed border-[var(--border)] cursor-not-allowed bg-transparent'
                              : done
                              ? 'text-white shadow-xs cursor-pointer active:scale-90'
                              : isSkipped
                              ? 'bg-[var(--surface-raised)] border-[var(--border)] text-[var(--text-muted)] cursor-pointer'
                              : 'border-[var(--border)] hover:border-[var(--accent)]/50 active:scale-95 cursor-pointer bg-transparent'
                          }`}
                          style={{
                            backgroundColor: done ? habitColor : undefined,
                            borderColor: done ? habitColor : undefined,
                          }}
                        >
                          {done ? (
                            <Check size={16} strokeWidth={2.8} />
                          ) : isSkipped ? (
                            <Minus size={14} />
                          ) : null}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* ── DESKTOP MONTH GRID (768px+) ─────────────────────────────── */}
      <div
        className="hidden md:block"
        style={{
          width: '100%',
          maxWidth: '100%',
          overflowX: 'auto',
          overscrollBehaviorX: 'contain',
          WebkitOverflowScrolling: 'touch',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--surface)',
        }}
      >
        <table
          style={{
            borderCollapse: 'separate',
            borderSpacing: 0,
            width: '100%',
            minWidth: 'max-content',
          }}
        >
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--surface)' }}>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {/* Sticky first column (habit names) */}
              <th
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 12,
                  backgroundColor: 'var(--surface)',
                  minWidth: 170,
                  textAlign: 'left',
                  padding: '12px 14px',
                  fontSize: '0.65rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  borderBottom: '1px solid var(--border)',
                  borderRight: '1px solid var(--border)',
                }}
              >
                HABIT
              </th>

              {/* Day headers (1..31) */}
              {days.map((d) => {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                const isToday = dateStr === today
                return (
                  <th
                    key={d}
                    style={{
                      width: 32,
                      minWidth: 32,
                      textAlign: 'center',
                      padding: '8px 2px',
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: isToday ? 700 : 500,
                      color: isToday ? 'var(--accent)' : 'var(--text-muted)',
                      backgroundColor: isToday ? 'rgba(92, 107, 90, 0.08)' : 'transparent',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {d}
                  </th>
                )
              })}

              {/* % Consistency column header */}
              <th
                style={{
                  position: 'sticky',
                  right: 0,
                  zIndex: 3,
                  backgroundColor: 'var(--surface)',
                  minWidth: 54,
                  textAlign: 'center',
                  padding: '8px 6px',
                  fontSize: '0.65rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  borderBottom: '1px solid var(--border)',
                  borderLeft: '1px solid var(--border)',
                }}
              >
                %
              </th>
            </tr>
          </thead>

          <tbody>
            {habits.map((habit, rowIndex) => {
              const habitCreatedDate = habit.created_at ? habit.created_at.slice(0, 10) : ''
              const habitArchivedDate = habit.is_archived && habit.archived_at ? habit.archived_at.slice(0, 10) : ''

              // Calculate elapsed active days in this month (from habit creation to today/month-end, excluding skipped days)
              let activeDays = 0
              let daysCompleted = 0

              for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                if (dateStr > today) continue
                if (habitCreatedDate && dateStr < habitCreatedDate) continue
                if (habitArchivedDate && dateStr > habitArchivedDate) continue

                const entry = entryMap.get(dateStr)
                const isSkipped = entry ? skipMap.get(`${entry.id}__${habit.id}`) === true : false
                if (isSkipped) continue

                activeDays++
                if (entry && compMap.get(`${entry.id}__${habit.id}`) === true) {
                  daysCompleted++
                }
              }

              const consistency = activeDays > 0 ? Math.round((daysCompleted / activeDays) * 100) : 0

              return (
                <tr
                  key={habit.id}
                  style={{
                    borderBottom: rowIndex < habits.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {/* Sticky Habit Name column */}
                  <td
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 2,
                      backgroundColor: 'var(--surface)',
                      padding: '8px 14px',
                      fontSize: '0.85rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      maxWidth: 180,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      borderRight: '1px solid var(--border)',
                      borderBottom: '1px solid var(--border)',
                    }}
                    title={habit.notes ? `${habit.name}\n\nNote: ${habit.notes}` : habit.name}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <Link
                        href={`/habits/${habit.id}`}
                        className="hover:underline hover:text-[var(--accent)] transition-colors"
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'inherit',
                          textDecoration: 'none',
                        }}
                      >
                        {habit.name}
                      </Link>
                      {habit.notes && (
                        <button
                          type="button"
                          aria-label={`View notes for ${habit.name}`}
                          onClick={() => setActiveNote({ id: habit.id, name: habit.name, notes: habit.notes! })}
                          title={habit.notes}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            color: 'var(--accent)',
                            opacity: 0.85,
                          }}
                        >
                          <FileText size={12} />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Day cells (min 28x28px tappable on mobile) */}
                  {days.map((d) => {
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                    const isBeforeCreation = Boolean(habitCreatedDate && dateStr < habitCreatedDate)
                    const isAfterArchived = Boolean(habitArchivedDate && dateStr > habitArchivedDate)
                    const isInactiveForDate = isBeforeCreation || isAfterArchived

                    const entry = entryMap.get(dateStr)
                    const key = entry ? `${entry.id}__${habit.id}` : null
                    const done = key ? compMap.get(key) ?? false : false
                    const isSkipped = key ? skipMap.get(key) ?? false : false
                    const isFuture = dateStr > today
                    const isToday = dateStr === today
                    const isDisabled = isFuture || isInactiveForDate

                    const isAmount = habit.type === 'amount'
                    const habitColor = getHabitColorVar(habit.color)
                    const amtData = key ? amountMap.get(key) : null
                    const currentAmt = amtData?.amount ?? 0
                    const targetVal =
                      amtData?.targetSnapshot !== null && amtData?.targetSnapshot !== undefined
                        ? amtData.targetSnapshot
                        : (habit.target_value ?? null)

                    let cellTooltip = `${habit.name}, day ${d}: ${done ? 'Completed' : isSkipped ? 'Skipped' : 'Not completed'}`
                    if (isAmount) {
                      if (targetVal != null) {
                        cellTooltip = `${currentAmt} / ${targetVal}${habit.unit ? ' ' + habit.unit : ''} (${done ? 'Completed' : 'Incomplete'})`
                      } else {
                        cellTooltip = `${currentAmt}${habit.unit ? ' ' + habit.unit : ''} (${done ? 'Done' : 'Incomplete'})`
                      }
                    }

                    const progressPct =
                      isAmount && targetVal && targetVal > 0
                        ? Math.min(1, currentAmt / targetVal)
                        : 0

                    return (
                      <td
                        key={d}
                        style={{
                          padding: '3px 2px',
                          textAlign: 'center',
                          backgroundColor: isToday ? 'rgba(92, 107, 90, 0.08)' : 'transparent',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        {isInactiveForDate ? (
                          <span
                            style={{
                              width: 32,
                              height: 32,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-muted)',
                              opacity: 0.25,
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.75rem',
                              userSelect: 'none',
                            }}
                            title={isBeforeCreation ? 'Habit created after this date' : 'Habit archived'}
                          >
                            —
                          </span>
                        ) : (
                          <motion.button
                            whileTap={!isDisabled ? { scale: 0.88 } : {}}
                            onClick={() => !isDisabled && handleCellToggle(d, habit.id)}
                            disabled={isDisabled}
                            title={cellTooltip}
                            aria-label={cellTooltip}
                            style={{
                              width: 32,
                              height: 32,
                              minWidth: 32,
                              minHeight: 32,
                              borderRadius: 'var(--radius-sm)',
                              border: `1px solid ${
                                done
                                  ? habitColor
                                  : isSkipped
                                  ? 'var(--text-muted)'
                                  : 'var(--border)'
                              }`,
                              backgroundColor: done
                                ? habitColor
                                : isSkipped
                                ? 'var(--surface-raised)'
                                : 'transparent',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: isDisabled ? 'default' : 'pointer',
                              opacity: isFuture ? 0.35 : 1,
                              padding: 0,
                              transition: 'background-color 0.15s ease, border-color 0.15s ease',
                            }}
                          >
                            {done ? (
                              <Check size={13} color="#FFFFFF" strokeWidth={2.8} />
                            ) : isSkipped ? (
                              <Minus size={13} color="var(--text-muted)" strokeWidth={2} />
                            ) : isAmount && targetVal && targetVal > 0 && currentAmt > 0 ? (
                              <svg width="20" height="20" viewBox="0 0 24 24" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="12" cy="12" r="8" stroke="var(--border)" strokeWidth="2.5" fill="none" />
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="8"
                                  stroke={habitColor}
                                  strokeWidth="2.5"
                                  fill="none"
                                  strokeDasharray={50.2}
                                  strokeDashoffset={50.2 - 50.2 * progressPct}
                                  strokeLinecap="round"
                                />
                              </svg>
                            ) : null}
                          </motion.button>
                        )}
                      </td>
                    )
                  })}

                  {/* Habit consistency cell */}
                  <td
                    style={{
                      position: 'sticky',
                      right: 0,
                      zIndex: 2,
                      backgroundColor: 'var(--surface)',
                      padding: '8px 6px',
                      textAlign: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: consistency >= 80 ? 'var(--accent)' : 'var(--text-muted)',
                      borderLeft: '1px solid var(--border)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {consistency}%
                  </td>
                </tr>
              )
            })}

            {/* Bottom row: Daily score, bold */}
            <tr style={{ backgroundColor: 'var(--surface-raised)' }}>
              <td
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                  backgroundColor: 'var(--surface-raised)',
                  padding: '10px 14px',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                  borderRight: '1px solid var(--border)',
                }}
              >
                SCORE
              </td>

              {days.map((d) => {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                const score = scoreMap.get(dateStr)
                const pct = score ? Math.round(Number(score.completion_pct)) : null
                const isToday = dateStr === today

                return (
                  <td
                    key={d}
                    style={{
                      padding: '10px 2px',
                      textAlign: 'center',
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color:
                        pct === 100
                          ? 'var(--accent)'
                          : pct !== null && pct >= 50
                          ? 'var(--text-primary)'
                          : 'var(--text-muted)',
                      backgroundColor: isToday ? 'rgba(92, 107, 90, 0.08)' : 'transparent',
                    }}
                  >
                    {pct !== null ? `${pct}%` : ''}
                  </td>
                )
              })}

              <td
                style={{
                  position: 'sticky',
                  right: 0,
                  zIndex: 2,
                  backgroundColor: 'var(--surface-raised)',
                  borderLeft: '1px solid var(--border)',
                }}
              />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Habit Note Responsive Sheet (Bottom sheet on phone, centered modal on desktop) */}
      <ResponsiveSheet
        isOpen={Boolean(activeNote)}
        onClose={() => setActiveNote(null)}
        title={activeNote ? `[ ${activeNote.name} ]` : undefined}
        description="Habit intention and focus note"
      >
        {activeNote && (
          <div className="p-4 space-y-3 font-mono">
            <p className="text-sm font-serif italic text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
              &ldquo;{activeNote.notes}&rdquo;
            </p>
          </div>
        )}
      </ResponsiveSheet>
    </div>
  )
}
