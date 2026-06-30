'use client'
// components/calendar/CalendarView.tsx
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DailyScore, HabitWithSubitems } from '@/lib/supabase/types'
import { DayEntryModal } from './DayEntryModal'

interface Props {
  scores: DailyScore[]
  habits: HabitWithSubitems[]
  today: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export function CalendarView({ scores, habits, today }: Props) {
  const todayD = new Date(today + 'T00:00:00')
  const [year, setYear] = useState(todayD.getFullYear())
  const [month, setMonth] = useState(todayD.getMonth()) // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const scoreMap = new Map(scores.map(s => [s.date, s]))

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const getCellStyle = (pct: number | undefined): React.CSSProperties => {
    if (pct === undefined) return { background: 'transparent' }
    if (pct >= 100) return { background: 'var(--accent-subtle)', borderColor: 'var(--accent-muted)' }
    if (pct >= 75)  return { background: `rgba(107,127,163,${0.10 + pct/100*0.15})` }
    if (pct >= 50)  return { background: `rgba(107,127,163,${0.06 + pct/100*0.10})` }
    if (pct >= 1)   return { background: `rgba(107,127,163,0.05)` }
    return { background: 'transparent' }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '28px' }}
      >
        <p className="text-label" style={{ color: 'var(--ink-tertiary)', marginBottom: '4px' }}>Browse</p>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 300, letterSpacing: '-0.03em', color: 'var(--ink-primary)' }}>
          Calendar
        </h1>
      </motion.div>

      {/* Month navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button className="btn-icon" onClick={prevMonth} aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--ink-primary)' }}>
          {MONTHS[month]} {year}
        </h2>
        <button className="btn-icon" onClick={nextMonth} aria-label="Next month">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.05em', color: 'var(--ink-tertiary)', padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <motion.div
        key={`${year}-${month}`}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}
      >
        {/* Empty cells */}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const score = scoreMap.get(dateStr)
          const pct = score ? Number(score.completion_pct) : undefined
          const isToday = dateStr === today
          const isFuture = dateStr > today

          return (
            <motion.button
              key={day}
              className={`calendar-day ${isToday ? 'today' : ''}`}
              onClick={() => !isFuture && setSelectedDate(dateStr)}
              disabled={isFuture}
              style={{
                ...getCellStyle(pct),
                color: isFuture ? 'var(--ink-disabled)' : 'var(--ink-primary)',
                cursor: isFuture ? 'default' : 'pointer',
                fontSize: '0.8125rem',
                fontWeight: isToday ? 600 : 400,
              }}
              whileTap={!isFuture ? { scale: 0.94 } : {}}
            >
              {day}
              {pct !== undefined && pct >= 100 && (
                <div style={{
                  position: 'absolute',
                  bottom: 2,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                }} />
              )}
            </motion.button>
          )
        })}
      </motion.div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
        {[
          { label: 'Perfect', color: 'var(--accent-subtle)', border: 'var(--accent-muted)' },
          { label: '75%+', color: 'rgba(107,127,163,0.22)' },
          { label: '50%+', color: 'rgba(107,127,163,0.13)' },
          { label: 'Any', color: 'rgba(107,127,163,0.05)' },
        ].map(({ label, color, border }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: 12, height: 12, borderRadius: '2px', background: color, border: border ? `1px solid ${border}` : '1px solid var(--border-subtle)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Day entry modal */}
      <AnimatePresence>
        {selectedDate && (
          <DayEntryModal
            date={selectedDate}
            habits={habits}
            onClose={() => setSelectedDate(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
