'use client'
// components/calendar/CalendarView.tsx — Activity Heatmap with Week, Month, and Year views
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Grid, Columns } from 'lucide-react'
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
  const todayD = useMemo(() => new Date(today + 'T00:00:00'), [today])
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'year'>('month')
  const [year, setYear] = useState(todayD.getFullYear())
  const [month, setMonth] = useState(todayD.getMonth()) // 0-indexed
  const [weekOffset, setWeekOffset] = useState(0) // 0 = current week
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const scoreMap = useMemo(() => new Map(scores.map((s) => [s.date, s])), [scores])

  // Navigation handlers
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

  const prevYear = () => setYear((y) => y - 1)
  const nextYear = () => setYear((y) => y + 1)

  const prevWeek = () => setWeekOffset((w) => w - 1)
  const nextWeek = () => setWeekOffset((w) => w + 1)

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

    const intensity = Math.max(12, Math.round(pct))
    return {
      backgroundColor: `color-mix(in srgb, var(--accent) ${intensity}%, transparent)`,
      borderColor: `color-mix(in srgb, var(--accent) ${Math.min(100, intensity + 15)}%, transparent)`,
      color: pct >= 50 ? 'var(--text-primary)' : 'var(--text-muted)',
      fontWeight: 500,
    }
  }

  // Week days calculation
  const weekDays = useMemo(() => {
    const current = new Date(todayD)
    // Find previous Sunday
    const dayOfWeek = current.getDay()
    current.setDate(current.getDate() - dayOfWeek + weekOffset * 7)

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(current)
      d.setDate(current.getDate() + i)
      const dateStr = d.toISOString().slice(0, 10)
      const score = scoreMap.get(dateStr)
      return {
        dateStr,
        dayName: DAYS[i],
        dayNum: d.getDate(),
        monthName: MONTHS[d.getMonth()].slice(0, 3),
        score,
        pct: score ? Number(score.completion_pct) : undefined,
        isToday: dateStr === today,
        isFuture: dateStr > today,
      }
    })
  }, [todayD, weekOffset, today, scoreMap])

  // Month days calculation
  const firstDay = new Date(year, month, 1).getDay()
  const { daysInMonth } = getMonthDateRange(year, month + 1)

  return (
    <div className="page-container" style={{ maxWidth: 940, margin: '0 auto', paddingBottom: 64 }}>
      {/* Breadcrumb */}
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

      {/* Header with Title and Mode Switcher */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4 mb-8"
      >
        <div>
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
            Activity Heatmap
          </h1>
          <p className="font-mono text-xs text-[var(--text-muted)] mt-1">
            Track daily discipline across week, month, and year
          </p>
        </div>

        {/* View Mode Switcher: Week | Month | Year (Streak style) */}
        <div className="flex items-center gap-1 p-0.5 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] font-mono text-xs">
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 rounded-full transition-all font-semibold flex items-center gap-1.5 ${
              viewMode === 'week'
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs border border-[var(--border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Columns size={12} />
            <span>Week</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 rounded-full transition-all font-semibold flex items-center gap-1.5 ${
              viewMode === 'month'
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs border border-[var(--border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <CalendarIcon size={12} />
            <span>Month</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('year')}
            className={`px-3 py-1.5 rounded-full transition-all font-semibold flex items-center gap-1.5 ${
              viewMode === 'year'
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs border border-[var(--border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Grid size={12} />
            <span>Year</span>
          </button>
        </div>
      </motion.div>

      {/* ── Subheader Navigator ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        {viewMode === 'week' && (
          <div className="flex items-center gap-3">
            <button
              className="btn-icon"
              onClick={prevWeek}
              aria-label="Previous Week"
              style={{ width: 36, height: 36, minWidth: 36, minHeight: 36, padding: 0 }}
            >
              <ChevronLeft size={15} />
            </button>
            <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
              {weekDays[0].monthName} {weekDays[0].dayNum} — {weekDays[6].monthName} {weekDays[6].dayNum},{' '}
              {weekDays[0].dateStr.slice(0, 4)}
            </span>
            <button
              className="btn-icon"
              onClick={nextWeek}
              aria-label="Next Week"
              style={{ width: 36, height: 36, minWidth: 36, minHeight: 36, padding: 0 }}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {viewMode === 'month' && (
          <div className="flex items-center gap-3">
            <button
              className="btn-icon"
              onClick={prevMonth}
              aria-label="Previous Month"
              style={{ width: 36, height: 36, minWidth: 36, minHeight: 36, padding: 0 }}
            >
              <ChevronLeft size={15} />
            </button>
            <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
              {MONTHS[month]} {year}
            </span>
            <button
              className="btn-icon"
              onClick={nextMonth}
              aria-label="Next Month"
              style={{ width: 36, height: 36, minWidth: 36, minHeight: 36, padding: 0 }}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {viewMode === 'year' && (
          <div className="flex items-center gap-3">
            <button
              className="btn-icon"
              onClick={prevYear}
              aria-label="Previous Year"
              style={{ width: 36, height: 36, minWidth: 36, minHeight: 36, padding: 0 }}
            >
              <ChevronLeft size={15} />
            </button>
            <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
              {year} Annual Overview
            </span>
            <button
              className="btn-icon"
              onClick={nextYear}
              aria-label="Next Year"
              style={{ width: 36, height: 36, minWidth: 36, minHeight: 36, padding: 0 }}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-muted)] select-none">
          <span>0%</span>
          <div className="w-3 h-3 rounded-xs bg-[var(--surface)] border border-[var(--border)]" />
          <div
            className="w-3 h-3 rounded-xs"
            style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 30%, transparent)' }}
          />
          <div
            className="w-3 h-3 rounded-xs"
            style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 65%, transparent)' }}
          />
          <div className="w-3 h-3 rounded-xs" style={{ backgroundColor: 'var(--accent)' }} />
          <span>100%</span>
        </div>
      </div>

      {/* ── 1. WEEK VIEW ────────────────────────────────────────────────────── */}
      {viewMode === 'week' && (
        <motion.div
          key={`week-${weekOffset}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3 mb-10"
        >
          {weekDays.map((d) => {
            const cellStyle = getCellStyle(d.pct)
            return (
              <motion.button
                key={d.dateStr}
                whileHover={!d.isFuture ? { scale: 1.02, translateY: -2 } : {}}
                whileTap={!d.isFuture ? { scale: 0.98 } : {}}
                onClick={() => !d.isFuture && setSelectedDate(d.dateStr)}
                disabled={d.isFuture}
                className="flex flex-col justify-between p-4 rounded-xl border text-left transition-all"
                style={{
                  minHeight: 140,
                  cursor: d.isFuture ? 'default' : 'pointer',
                  opacity: d.isFuture ? 0.4 : 1,
                  borderColor: d.isToday ? 'var(--accent)' : 'var(--border)',
                  backgroundColor: 'var(--surface)',
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold uppercase text-[var(--text-muted)]">
                      {d.dayName}
                    </span>
                    {d.isToday && (
                      <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                    )}
                  </div>
                  <span className="font-mono text-xl font-bold text-[var(--text-primary)]">
                    {d.dayNum}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--border)]">
                  {d.pct !== undefined ? (
                    <div>
                      <div className="flex items-center justify-between font-mono text-[11px] mb-1.5">
                        <span className="font-bold text-[var(--text-primary)]">{Math.round(d.pct)}%</span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {d.score?.completed_habits ?? 0}/{d.score?.total_active_habits ?? 0}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.round(d.pct)}%`,
                            backgroundColor: 'var(--accent)',
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="font-mono text-[10px] text-[var(--text-muted)] italic">
                      No entry
                    </span>
                  )}
                </div>
              </motion.button>
            )
          })}
        </motion.div>
      )}

      {/* ── 2. MONTH VIEW ───────────────────────────────────────────────────── */}
      {viewMode === 'month' && (
        <motion.div
          key={`month-${year}-${month}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
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
          <div
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
          </div>
        </motion.div>
      )}

      {/* ── 3. YEAR VIEW (12 Mini Month Density Grids) ──────────────────────── */}
      {viewMode === 'year' && (
        <motion.div
          key={`year-${year}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          {MONTHS.map((mName, mIdx) => {
            const mFirstDay = new Date(year, mIdx, 1).getDay()
            const mDaysCount = new Date(Date.UTC(year, mIdx + 1, 0)).getUTCDate()

            return (
              <div
                key={mName}
                className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                    {mName}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">
                    {year}
                  </span>
                </div>

                {/* Mini 7-col weekday dots */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Leading blanks */}
                  {Array.from({ length: mFirstDay }).map((_, bIdx) => (
                    <div key={`blank-${bIdx}`} className="aspect-square" />
                  ))}

                  {/* Days */}
                  {Array.from({ length: mDaysCount }).map((_, dIdx) => {
                    const dayNum = dIdx + 1
                    const dateStr = `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                    const score = scoreMap.get(dateStr)
                    const pct = score ? Number(score.completion_pct) : undefined
                    const isToday = dateStr === today
                    const isFuture = dateStr > today
                    const cellStyle = getCellStyle(pct)

                    return (
                      <button
                        key={dateStr}
                        onClick={() => !isFuture && setSelectedDate(dateStr)}
                        disabled={isFuture}
                        title={`${dateStr}: ${pct !== undefined ? `${Math.round(pct)}%` : 'No entry'}`}
                        className={`aspect-square rounded-xs border transition-transform hover:scale-125 ${
                          isToday ? 'ring-1 ring-[var(--accent)] ring-offset-1' : ''
                        }`}
                        style={{
                          cursor: isFuture ? 'default' : 'pointer',
                          opacity: isFuture ? 0.25 : 1,
                          ...cellStyle,
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </motion.div>
      )}

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
