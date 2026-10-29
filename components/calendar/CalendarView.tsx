'use client'
// components/calendar/CalendarView.tsx — Heatmap calendar with smooth accent gradient
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DailyScore, HabitWithSubitems } from '@/lib/supabase/types'
import { getMonthDateRange } from '@/lib/date'
import { DayEntryModal } from './DayEntryModal'

interface Props {
  scores: DailyScore[]
  habits: HabitWithSubitems[]
  today: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function CalendarView({ scores, habits, today }: Props) {
  const todayD = new Date(today + 'T00:00:00')
  const [year, setYear] = useState(todayD.getFullYear())
  const [month, setMonth] = useState(todayD.getMonth()) // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const scoreMap = new Map(scores.map((s) => [s.date, s]))

  const firstDay = new Date(year, month, 1).getDay()
  const { daysInMonth } = getMonthDateRange(year, month + 1)

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  // Smooth gradient scale: 0% = transparent, 100% = full accent
  const getCellStyle = (pct: number | undefined): React.CSSProperties => {
    if (pct === undefined || pct === 0) {
      return {
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)',
        color: 'var(--text-muted)',
      }
    }

    if (pct >= 100) {
      return {
        backgroundColor: 'var(--accent)',
        borderColor: 'var(--accent)',
        color: '#FFFFFF',
        fontWeight: 700,
      }
    }

    // Smooth gradient tint using color-mix on the single accent token
    const intensity = Math.max(12, Math.round(pct))
    return {
      backgroundColor: `color-mix(in srgb, var(--accent) ${intensity}%, transparent)`,
      borderColor: `color-mix(in srgb, var(--accent) ${Math.min(100, intensity + 15)}%, transparent)`,
      color: pct >= 50 ? 'var(--text-primary)' : 'var(--text-muted)',
      fontWeight: 500,
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: 840, margin: '0 auto', paddingBottom: 64 }}>
      {/* Breadcrumb & Header */}
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
        ~/ calendar
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
          marginBottom: 28,
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
          Calendar Heatmap
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
            {MONTHS[month]} {year}
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

      {/* Weekday column headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 6,
          marginBottom: 8,
          textAlign: 'center',
        }}
      >
        {DAYS.map((d) => (
          <span
            key={d}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              padding: '4px 0',
            }}
          >
            {d}
          </span>
        ))}
      </div>

      {/* Calendar Grid */}
      <motion.div
        key={`${year}-${month}`}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 6,
        }}
      >
        {/* Leading empty offset days */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} style={{ aspectRatio: '1' }} />
        ))}

        {/* Month day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const score = scoreMap.get(dateStr)
          const pct = score ? Number(score.completion_pct) : undefined
          const isToday = dateStr === today
          const isFuture = dateStr > today
          const cellStyle = getCellStyle(pct)

          return (
            <motion.button
              key={dateStr}
              whileHover={!isFuture ? { scale: 1.04 } : {}}
              whileTap={!isFuture ? { scale: 0.96 } : {}}
              onClick={() => !isFuture && setSelectedDate(dateStr)}
              disabled={isFuture}
              style={{
                aspectRatio: '1',
                borderRadius: 'var(--radius-md)',
                border: isToday ? '2px solid var(--accent)' : '1px solid',
                fontFamily: 'var(--font-mono)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isFuture ? 'default' : 'pointer',
                opacity: isFuture ? 0.35 : 1,
                position: 'relative',
                padding: 4,
                ...cellStyle,
                transition: 'transform 0.15s ease, border-color 0.15s ease',
              }}
              title={`${dateStr}: ${pct !== undefined ? `${Math.round(pct)}%` : 'No entry'}`}
            >
              <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>{day}</span>
              {pct !== undefined && (
                <span
                  style={{
                    fontSize: '0.625rem',
                    opacity: 0.85,
                    marginTop: 3,
                    lineHeight: 1,
                  }}
                >
                  {Math.round(pct)}%
                </span>
              )}
            </motion.button>
          )
        })}
      </motion.div>

      {/* Heatmap Legend */}
      <div
        style={{
          marginTop: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 6,
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
        }}
      >
        <span>0%</span>
        <div style={{ width: 14, height: 14, borderRadius: 2, backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} />
        <div style={{ width: 14, height: 14, borderRadius: 2, backgroundColor: 'color-mix(in srgb, var(--accent) 30%, transparent)' }} />
        <div style={{ width: 14, height: 14, borderRadius: 2, backgroundColor: 'color-mix(in srgb, var(--accent) 65%, transparent)' }} />
        <div style={{ width: 14, height: 14, borderRadius: 2, backgroundColor: 'var(--accent)' }} />
        <span>100%</span>
      </div>

      {/* Day Entry Modal on day click */}
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
