'use client'
// components/grid/MonthlyGrid.tsx — Digitized paper habit tracker grid
import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Check, Minus, FileText, X } from 'lucide-react'
import type { Habit, DayEntry, DailyScore } from '@/lib/supabase/types'
import { toggleHabitCompletionAction } from '@/actions/completion.actions'
import { getMonthDateRange } from '@/lib/date'

interface Props {
  year: number
  month: number
  habits: Habit[]
  entries: DayEntry[]
  completionData: {
    habitCompletions: Array<{ day_entry_id: string; habit_id: string; is_completed: boolean; is_skipped?: boolean }>
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

  // Build score map: date → score
  const scoreMap = new Map(scores.map((s) => [s.date, s]))

  const handleCellToggle = useCallback(
    async (day: number, habitId: string) => {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      if (dateStr > today) return

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
    [compMap, skipMap, entryMap, year, month, today, router]
  )

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

      {/* Scrollable grid table */}
      <div
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
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{habit.name}</span>
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
                            aria-label={`${habit.name}, day ${d}: ${done ? 'Completed' : isSkipped ? 'Skipped' : 'Not completed'}`}
                            style={{
                              width: 32,
                              height: 32,
                              minWidth: 32,
                              minHeight: 32,
                              borderRadius: 'var(--radius-sm)',
                              border: `1px solid ${
                                done
                                  ? 'var(--accent)'
                                  : isSkipped
                                  ? 'var(--text-muted)'
                                  : 'var(--border)'
                              }`,
                              backgroundColor: done
                                ? 'var(--accent)'
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
                              <Check size={13} color="#FFFFFF" strokeWidth={2.5} />
                            ) : isSkipped ? (
                              <Minus size={13} color="var(--text-muted)" strokeWidth={2} />
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

      {/* Habit Note Modal / Popover on tap */}
      {activeNote && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Habit notes for ${activeNote.name}`}
          onClick={() => setActiveNote(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-sm p-5 max-w-sm w-full space-y-3 font-mono shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <span className="text-xs uppercase tracking-wider text-[var(--accent)] font-semibold truncate">
                [ {activeNote.name} ]
              </span>
              <button
                type="button"
                aria-label="Close notes modal"
                onClick={() => setActiveNote(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-xs font-serif italic text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
              &ldquo;{activeNote.notes}&rdquo;
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
