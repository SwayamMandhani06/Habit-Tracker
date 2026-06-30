'use client'
// components/grid/MonthlyGrid.tsx — Digitized paper habit tracker grid
import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import type { Habit, DayEntry, DailyScore } from '@/lib/supabase/types'
import { toggleHabitCompletionAction } from '@/actions/completion.actions'
import { getOrCreateDayEntry } from '@/lib/db/entries'

interface Props {
  year: number
  month: number
  habits: Habit[]
  entries: DayEntry[]
  completionData: {
    habitCompletions: Array<{ day_entry_id: string; habit_id: string; is_completed: boolean }>
    subitemCompletions: Array<{ day_entry_id: string; subitem_id: string; is_completed: boolean }>
  }
  scores: DailyScore[]
  today: string
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export function MonthlyGrid({ year, month, habits, entries, completionData, scores, today }: Props) {
  const router = useRouter()
  const daysInMonth = new Date(year, month, 0).getDate()

  // Build entry map: date → entry id
  const entryMap = new Map(entries.map(e => [e.date, e]))

  // Build completion map: `${entryId}__${habitId}` → boolean
  const [compMap, setCompMap] = useState<Map<string, boolean>>(() => {
    const m = new Map<string, boolean>()
    for (const c of completionData.habitCompletions) {
      m.set(`${c.day_entry_id}__${c.habit_id}`, c.is_completed)
    }
    return m
  })

  // Build score map: date → score
  const scoreMap = new Map(scores.map(s => [s.date, s]))

  // Per-habit monthly consistency
  const getHabitDaysCompleted = (habitId: string) => {
    let count = 0
    for (const entry of entries) {
      const key = `${entry.id}__${habitId}`
      if (compMap.get(key) === true) count++
    }
    return count
  }

  const handleCellToggle = useCallback(async (day: number, habitId: string) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (dateStr > today) return

    const entry = entryMap.get(dateStr)
    const entryId = entry?.id

    // If no entry exists, we need to create it server-side
    if (!entryId) {
      await toggleHabitCompletionAction({ date: dateStr, habitId, isCompleted: true })
      router.refresh()
      return
    }

    const key = `${entryId}__${habitId}`
    const current = compMap.get(key) ?? false
    const next = !current

    // Optimistic
    setCompMap(prev => new Map(prev).set(key, next))
    await toggleHabitCompletionAction({ date: dateStr, habitId, isCompleted: next })
  }, [compMap, entryMap, year, month, today, router])

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
    <div className="page-container" style={{ overflowX: 'hidden' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '20px' }}>
        <p className="text-label" style={{ color: 'var(--ink-tertiary)', marginBottom: '4px' }}>Tracker</p>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 300, letterSpacing: '-0.03em', color: 'var(--ink-primary)' }}>
          Monthly Grid
        </h1>
      </motion.div>

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button className="btn-icon" onClick={prevMonth}><ChevronLeft size={18} /></button>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--ink-primary)' }}>
          {MONTHS[month - 1]} {year}
        </h2>
        <button className="btn-icon" onClick={nextMonth}><ChevronRight size={18} /></button>
      </div>

      {/* Scrollable grid */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: '3px', minWidth: 'max-content' }}>
          <thead>
            <tr>
              {/* Habit name column */}
              <th style={{
                position: 'sticky', left: 0, zIndex: 2,
                background: 'var(--bg-base)',
                minWidth: 150,
                textAlign: 'left',
                padding: '4px 8px',
                fontSize: '0.6875rem',
                fontWeight: 500,
                letterSpacing: '0.06em',
                color: 'var(--ink-tertiary)',
                textTransform: 'uppercase',
              }}>
                Habit
              </th>
              {/* Day columns */}
              {days.map(d => {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                const isToday = dateStr === today
                return (
                  <th key={d} style={{
                    width: 28,
                    textAlign: 'center',
                    padding: '4px 0',
                    fontSize: '0.65rem',
                    fontWeight: isToday ? 700 : 400,
                    color: isToday ? 'var(--accent)' : 'var(--ink-tertiary)',
                  }}>
                    {d}
                  </th>
                )
              })}
              {/* Consistency column */}
              <th style={{
                position: 'sticky', right: 0, zIndex: 2,
                background: 'var(--bg-base)',
                minWidth: 52,
                textAlign: 'center',
                padding: '4px 8px',
                fontSize: '0.6875rem',
                fontWeight: 500,
                letterSpacing: '0.06em',
                color: 'var(--ink-tertiary)',
                textTransform: 'uppercase',
              }}>
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {habits.map(habit => {
              const daysCompleted = getHabitDaysCompleted(habit.id)
              const activeDays = entries.length
              const consistency = activeDays > 0 ? Math.round((daysCompleted / activeDays) * 100) : 0

              return (
                <tr key={habit.id}>
                  {/* Habit name */}
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 1,
                    background: 'var(--bg-base)',
                    padding: '3px 8px',
                    fontSize: '0.8125rem',
                    fontWeight: 400,
                    color: 'var(--ink-secondary)',
                    whiteSpace: 'nowrap',
                    maxWidth: 160,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {habit.name}
                  </td>

                  {/* Day cells */}
                  {days.map(d => {
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                    const entry = entryMap.get(dateStr)
                    const key = entry ? `${entry.id}__${habit.id}` : null
                    const done = key ? (compMap.get(key) ?? false) : false
                    const isFuture = dateStr > today

                    return (
                      <td key={d} style={{ padding: '3px 0', textAlign: 'center' }}>
                        <motion.button
                          className={`grid-cell ${done ? 'completed' : ''}`}
                          whileTap={!isFuture ? { scale: 0.86 } : {}}
                          onClick={() => !isFuture && handleCellToggle(d, habit.id)}
                          disabled={isFuture}
                          style={{ opacity: isFuture ? 0.3 : 1, cursor: isFuture ? 'default' : 'pointer' }}
                        >
                          {done && <Check size={11} color="var(--accent)" strokeWidth={2.5} />}
                        </motion.button>
                      </td>
                    )
                  })}

                  {/* Consistency */}
                  <td style={{
                    position: 'sticky', right: 0, zIndex: 1,
                    background: 'var(--bg-base)',
                    padding: '3px 8px',
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: consistency >= 80 ? 'var(--sage)' : consistency >= 50 ? 'var(--accent)' : 'var(--ink-tertiary)',
                  }}>
                    {consistency}%
                  </td>
                </tr>
              )
            })}

            {/* Score row */}
            <tr style={{ borderTop: '1px solid var(--border-default)' }}>
              <td style={{
                position: 'sticky', left: 0, zIndex: 1,
                background: 'var(--bg-base)',
                padding: '8px 8px 3px',
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
                color: 'var(--ink-tertiary)',
                textTransform: 'uppercase',
              }}>
                Score
              </td>
              {days.map(d => {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                const score = scoreMap.get(dateStr)
                const pct = score ? Math.round(Number(score.completion_pct)) : null

                return (
                  <td key={d} style={{
                    padding: '8px 0 3px',
                    textAlign: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: pct === 100 ? 'var(--sage)' : pct && pct >= 50 ? 'var(--accent)' : 'var(--ink-tertiary)',
                  }}>
                    {pct !== null ? pct : ''}
                  </td>
                )
              })}
              <td style={{
                position: 'sticky', right: 0, zIndex: 1,
                background: 'var(--bg-base)',
                padding: '8px 8px 3px',
              }} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
