'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Flame,
  Trophy,
  CheckCircle2,
  Percent,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Minus,
  StickyNote,
  SlidersHorizontal,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from 'recharts'
import type { Habit, HabitDayNote } from '@/lib/supabase/types'
import { getHabitColorVar, renderHabitIcon } from '@/lib/habit-theme'
import {
  calculateHabitStreaks,
  calculateHabitConsistency,
  calculateAmountStats,
  calculateWeekdayBreakdown,
  calculateYearMonthlyStats,
  calculateWeeklyCompletions,
  generateYearGridData,
  generateMonthCalendarData,
  parseYMD,
  formatYMD,
  addDays,
  type HabitRecord,
} from '@/lib/stats/habit-math'
import { saveHabitDayNoteAction, deleteHabitDayNoteAction } from '@/actions/habit-note.actions'
import { toggleHabitCompletionAction, setHabitAmountAction } from '@/actions/completion.actions'

interface Props {
  habit: Habit
  initialRecords: Record<string, HabitRecord>
  initialNotes: HabitDayNote[]
  today: string
}

export function HabitDetailClient({
  habit,
  initialRecords,
  initialNotes,
  today,
}: Props) {
  const [rangeMode, setRangeMode] = useState<'week' | 'month' | 'year'>('month')
  const [records, setRecords] = useState<Record<string, HabitRecord>>(initialRecords)
  const [notes, setNotes] = useState<HabitDayNote[]>(initialNotes)

  // Current calendar viewing month/year
  const todayParts = useMemo(() => parseYMD(today), [today])
  const [calYear, setCalYear] = useState(todayParts.year)
  const [calMonth, setCalMonth] = useState(todayParts.month)

  // Day Sheet / Note Modal State
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [editingNoteText, setEditingNoteText] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Tooltip state for year grid cells
  const [activeCellInfo, setActiveCellInfo] = useState<{
    date: string
    status: string
    amount?: number
    target?: number | null
    hasNote?: boolean
  } | null>(null)

  const resolvedColor = getHabitColorVar(habit.color)
  const isAmountHabit = habit.type === 'amount'
  const targetVal = habit.target_value ?? null

  // Notes lookup set and map
  const notesSet = useMemo(() => new Set(notes.map((n) => n.date)), [notes])
  const notesByDate = useMemo(() => new Map(notes.map((n) => [n.date, n])), [notes])

  // Map of records for pure math calculations
  const recordsMap = useMemo(() => new Map(Object.entries(records)), [records])

  // ── 1. Statistics Calculations ──────────────────────────────────────────────
  const { currentStreak, bestStreak } = useMemo(
    () => calculateHabitStreaks(recordsMap, habit.created_at, habit.archived_at, today),
    [recordsMap, habit.created_at, habit.archived_at, today]
  )

  const consistency90 = useMemo(
    () => calculateHabitConsistency(recordsMap, habit.created_at, habit.archived_at, today, 90),
    [recordsMap, habit.created_at, habit.archived_at, today]
  )

  const amountStats = useMemo(() => {
    if (!isAmountHabit) return null
    return calculateAmountStats(recordsMap, consistency90.eligibleDays)
  }, [isAmountHabit, recordsMap, consistency90.eligibleDays])

  // Weekday breakdown (Mon..Sun)
  const weekdayData = useMemo(
    () => calculateWeekdayBreakdown(recordsMap, habit.created_at, habit.archived_at, today),
    [recordsMap, habit.created_at, habit.archived_at, today]
  )

  // Year monthly stats (Jan..Dec)
  const monthlyData = useMemo(
    () => calculateYearMonthlyStats(recordsMap, habit.created_at, habit.archived_at, calYear, today),
    [recordsMap, habit.created_at, habit.archived_at, calYear, today]
  )

  // Weekly completions (last 12 weeks)
  const weeklyData = useMemo(
    () => calculateWeeklyCompletions(recordsMap, habit.created_at, habit.archived_at, today, 12),
    [recordsMap, habit.created_at, habit.archived_at, today]
  )

  // Daily amount trend (last 30 days) for amount habits
  const dailyAmountData = useMemo(() => {
    if (!isAmountHabit) return []
    const dates = []
    for (let i = 29; i >= 0; i--) {
      dates.push(addDays(today, -i))
    }
    return dates.map((d) => {
      const { month, day } = parseYMD(d)
      const rec = records[d]
      return {
        date: d,
        label: `${month}/${day}`,
        amount: rec?.amount ?? 0,
        target: rec?.targetSnapshot ?? targetVal ?? 0,
      }
    })
  }, [isAmountHabit, today, records, targetVal])

  // 53x7 Year Grid Data
  const yearGrid = useMemo(
    () =>
      generateYearGridData(
        recordsMap,
        notesSet,
        habit.created_at,
        habit.archived_at,
        today,
        targetVal
      ),
    [recordsMap, notesSet, habit.created_at, habit.archived_at, today, targetVal]
  )

  // Month Calendar Data
  const monthCalendarCells = useMemo(
    () =>
      generateMonthCalendarData(
        recordsMap,
        notesSet,
        habit.created_at,
        habit.archived_at,
        calYear,
        calMonth,
        today,
        targetVal
      ),
    [recordsMap, notesSet, habit.created_at, habit.archived_at, calYear, calMonth, today, targetVal]
  )

  // Navigation for month calendar
  const handlePrevCalMonth = () => {
    if (calMonth === 1) {
      setCalMonth(12)
      setCalYear((y) => y - 1)
    } else {
      setCalMonth((m) => m - 1)
    }
  }

  const handleNextCalMonth = () => {
    if (calMonth === 12) {
      setCalMonth(1)
      setCalYear((y) => y + 1)
    } else {
      setCalMonth((m) => m + 1)
    }
  }

  // Day Sheet & Note Handlers
  const handleOpenDaySheet = (date: string) => {
    setSelectedDate(date)
    const existing = notesByDate.get(date)
    setEditingNoteText(existing?.note ?? '')
    setNoteModalOpen(true)
  }

  const handleToggleDayCompletion = async (date: string) => {
    const currentRec = records[date]
    const nextCompleted = !(currentRec?.isCompleted ?? false)

    setRecords((prev) => ({
      ...prev,
      [date]: {
        ...(prev[date] ?? {}),
        isCompleted: nextCompleted,
      },
    }))

    if (isAmountHabit) {
      const newAmt = nextCompleted ? targetVal ?? 1 : 0
      await setHabitAmountAction({ habitId: habit.id, date, amount: newAmt })
    } else {
      await toggleHabitCompletionAction({ habitId: habit.id, date, isCompleted: nextCompleted })
    }
  }

  const handleSaveNote = async () => {
    if (!selectedDate || !editingNoteText.trim()) return
    setIsSavingNote(true)
    setActionError(null)

    const res = await saveHabitDayNoteAction({
      habitId: habit.id,
      date: selectedDate,
      note: editingNoteText.trim(),
    })

    setIsSavingNote(false)

    if (res?.error) {
      setActionError(res.error)
      return
    }

    // Optimistically update notes list
    const updatedNote: HabitDayNote = {
      id: notesByDate.get(selectedDate)?.id ?? crypto.randomUUID(),
      user_id: habit.user_id ?? '',
      habit_id: habit.id,
      date: selectedDate,
      note: editingNoteText.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setNotes((prev) => {
      const filtered = prev.filter((n) => n.date !== selectedDate)
      return [updatedNote, ...filtered].sort((a, b) => b.date.localeCompare(a.date))
    })

    setNoteModalOpen(false)
  }

  const handleDeleteNote = async (date: string) => {
    if (!confirm('Delete this day note?')) return
    await deleteHabitDayNoteAction({ habitId: habit.id, date })
    setNotes((prev) => prev.filter((n) => n.date !== date))
    if (selectedDate === date) {
      setEditingNoteText('')
      setNoteModalOpen(false)
    }
  }

  return (
    <div
      className="page-container w-full mx-auto"
      style={{
        maxWidth: '1240px',
        paddingLeft: 'clamp(16px, 4vw, 36px)',
        paddingRight: 'clamp(16px, 4vw, 36px)',
        paddingTop: '28px',
        paddingBottom: '96px',
      }}
    >
      {/* ── 1. HEADER SECTION ───────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <Link
            href="/today"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors py-1 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)]"
          >
            <ArrowLeft size={13} />
            <span>Today</span>
          </Link>

          {/* Range Control: Week | Month | Year */}
          <div className="inline-flex items-center p-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] select-none">
            {(['week', 'month', 'year'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRangeMode(r)}
                className={`font-mono text-xs font-semibold px-3 py-1 rounded-lg transition-all capitalize ${
                  rangeMode === r
                    ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Habit Identity Row */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* 44px Tinted Icon Chip */}
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: `color-mix(in srgb, ${resolvedColor} 15%, transparent)`,
                color: resolvedColor,
                border: `1px solid color-mix(in srgb, ${resolvedColor} 25%, transparent)`,
              }}
            >
              {renderHabitIcon(habit.icon, 22)}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] truncate">
                  {habit.name}
                </h1>

                {/* Type Badge */}
                <span
                  className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${resolvedColor} 10%, transparent)`,
                    color: resolvedColor,
                    borderColor: `color-mix(in srgb, ${resolvedColor} 25%, transparent)`,
                  }}
                >
                  {isAmountHabit
                    ? `Amount · ${habit.target_value ?? 1} ${habit.unit ?? ''}`
                    : habit.type}
                </span>

                {habit.is_archived && (
                  <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]">
                    Archived
                  </span>
                )}
              </div>

              {/* Static Habit Note (from Manage Habits) */}
              {habit.notes && (
                <p className="font-serif italic text-xs sm:text-sm text-[var(--text-muted)] mt-1 truncate">
                  &ldquo;{habit.notes}&rdquo;
                </p>
              )}
            </div>
          </div>

          <Link
            href="/settings"
            className="btn btn-ghost inline-flex items-center gap-1.5 font-mono text-xs py-2 px-3.5 border border-[var(--border)] bg-[var(--surface)]"
            title="Edit habit settings"
          >
            <Pencil size={13} />
            <span>Edit Habit</span>
          </Link>
        </div>
      </div>

      {/* ── 2. FOUR HEADLINE TILES (+ Amount Stats) ─────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {/* Tile 1: Current Streak */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">
              Current Streak
            </span>
            <Flame size={15} style={{ color: currentStreak > 0 ? resolvedColor : undefined }} />
          </div>
          <p className="font-mono text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {currentStreak}{' '}
            <span className="text-xs sm:text-sm font-medium text-[var(--text-muted)]">Days</span>
          </p>
        </div>

        {/* Tile 2: Best Streak */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">
              Best Streak
            </span>
            <Trophy size={15} style={{ color: resolvedColor }} />
          </div>
          <p className="font-mono text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {bestStreak}{' '}
            <span className="text-xs sm:text-sm font-medium text-[var(--text-muted)]">Days</span>
          </p>
        </div>

        {/* Tile 3: Total Completions */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">
              Total Completions
            </span>
            <CheckCircle2 size={15} style={{ color: resolvedColor }} />
          </div>
          <p className="font-mono text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {consistency90.totalCompletions}{' '}
            <span className="text-xs sm:text-sm font-medium text-[var(--text-muted)]">Days</span>
          </p>
        </div>

        {/* Tile 4: Consistency (90-Day) */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs">
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">
              Consistency (90d)
            </span>
            <Percent size={15} style={{ color: resolvedColor }} />
          </div>
          <p className="font-mono text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {consistency90.consistencyPct}%
          </p>
          <span className="font-mono text-[10px] text-[var(--text-muted)] block mt-0.5">
            {consistency90.completedDays} / {consistency90.eligibleDays} active days
          </span>
        </div>
      </div>

      {/* Amount Habits Extras */}
      {isAmountHabit && amountStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
            <span className="font-mono text-xs text-[var(--text-muted)]">Average Per Day</span>
            <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
              {amountStats.averagePerDay} {habit.unit ?? ''}
            </span>
          </div>
          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
            <span className="font-mono text-xs text-[var(--text-muted)]">Best Day</span>
            <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
              {amountStats.bestDay
                ? `${amountStats.bestDay.amount} ${habit.unit ?? ''} (${amountStats.bestDay.date.slice(5)})`
                : '—'}
            </span>
          </div>
          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
            <span className="font-mono text-xs text-[var(--text-muted)]">Total Logged</span>
            <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
              {amountStats.totalAmount} {habit.unit ?? ''}
            </span>
          </div>
        </div>
      )}

      {/* ── TWO-COLUMN RESPONSIVE LAYOUT (Mobile: 1 Col, Desktop: 2 Col) ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── LEFT COLUMN (Desktop: 7 Cols) ─────────────────────────────────── */}
        <div className="lg:col-span-7 space-y-8">
          {/* Charts Section */}
          <div className="p-5 sm:p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] block">
                  {isAmountHabit ? 'DAILY AMOUNT TRACKING' : 'WEEKLY COMPLETION VELOCITY'} ————
                </span>
                <p className="font-mono text-[11px] text-[var(--text-muted)] mt-0.5">
                  {isAmountHabit
                    ? `Daily logged ${habit.unit ?? 'units'} vs. target threshold`
                    : 'Completions per week over recent 12 weeks'}
                </p>
              </div>
            </div>

            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                {isAmountHabit ? (
                  <LineChart data={dailyAmountData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'var(--surface-raised)',
                        borderColor: 'var(--border)',
                        borderRadius: '8px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                      }}
                    />
                    {targetVal != null && (
                      <ReferenceLine
                        y={targetVal}
                        stroke={resolvedColor}
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        label={{
                          value: `Target (${targetVal})`,
                          fill: resolvedColor,
                          fontSize: 10,
                          position: 'top',
                        }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke={resolvedColor}
                      strokeWidth={2.4}
                      dot={{ r: 3, fill: resolvedColor }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="weekLabel" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'var(--surface-raised)',
                        borderColor: 'var(--border)',
                        borderRadius: '8px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="completions" fill={resolvedColor} radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekday & Year Monthly Distribution Charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Weekday Breakdown */}
            <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <span className="font-mono text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] block mb-1">
                WEEKDAY CONSISTENCY
              </span>
              {weekdayData.weakestWeekday && (
                <p className="font-mono text-[10px] text-[var(--text-muted)] mb-3">
                  Weakest on{' '}
                  <span className="font-bold text-amber-500">
                    {weekdayData.weakestWeekday.dayLabel} ({weekdayData.weakestWeekday.rate}%)
                  </span>
                </p>
              )}
              <div style={{ width: '100%', height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekdayData.weekdays} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <XAxis dataKey="dayLabel" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={9} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'var(--surface-raised)',
                        borderColor: 'var(--border)',
                        borderRadius: '6px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                      }}
                    />
                    <Bar dataKey="rate" fill={resolvedColor} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Year Monthly Trend */}
            <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <span className="font-mono text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] block mb-1">
                {calYear} MONTHLY RUNS
              </span>
              <p className="font-mono text-[10px] text-[var(--text-muted)] mb-3">
                Total completed days per month
              </p>
              <div style={{ width: '100%', height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <XAxis dataKey="monthLabel" stroke="var(--text-muted)" fontSize={9} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={9} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'var(--surface-raised)',
                        borderColor: 'var(--border)',
                        borderRadius: '6px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                      }}
                    />
                    <Bar dataKey="completedDays" fill={resolvedColor} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── 6. DAY NOTES SECTION ───────────────────────────────────────── */}
          <div className="p-5 sm:p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] block">
                  DAY NOTES ————
                </span>
                <p className="font-mono text-[11px] text-[var(--text-muted)] mt-0.5">
                  Reflections, obstacles, and context logged for this habit
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenDaySheet(today)}
                className="btn btn-ghost inline-flex items-center gap-1 font-mono text-xs py-1.5 px-3 border border-[var(--border)]"
              >
                <Plus size={13} />
                <span>Add Note</span>
              </button>
            </div>

            {notes.length === 0 ? (
              <p className="font-mono text-xs text-[var(--text-muted)] text-center py-8">
                No notes yet
              </p>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] flex items-start justify-between gap-3 text-xs font-mono"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--accent)]">{note.date}</span>
                        {note.date === today && (
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)]">
                            Today
                          </span>
                        )}
                      </div>
                      <p className="text-[var(--text-primary)] whitespace-pre-wrap break-words leading-relaxed">
                        {note.note}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenDaySheet(note.date)}
                        className="btn-icon p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        title="Edit note"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.date)}
                        className="btn-icon p-1 text-[var(--text-muted)] hover:text-rose-500"
                        title="Delete note"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN (Desktop: 5 Cols) ────────────────────────────────── */}
        <div className="lg:col-span-5 space-y-8">
          {/* ── 3. MONTH CALENDAR ──────────────────────────────────────────── */}
          <div className="p-5 sm:p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs uppercase tracking-wider font-bold text-[var(--text-primary)]">
                {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
                  new Date(calYear, calMonth - 1, 1)
                )}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevCalMonth}
                  className="btn-icon w-8 h-8 rounded-lg border border-[var(--border)]"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleNextCalMonth}
                  className="btn-icon w-8 h-8 rounded-lg border border-[var(--border)]"
                  aria-label="Next month"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-[var(--text-muted)] font-bold mb-2">
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>T</span>
              <span>F</span>
              <span>S</span>
              <span>S</span>
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs">
              {monthCalendarCells.map((cell) => {
                const isClickable = cell.status !== 'inactive'
                return (
                  <button
                    key={cell.date}
                    type="button"
                    disabled={!isClickable}
                    onClick={() => handleOpenDaySheet(cell.date)}
                    title={`${cell.date}: ${cell.status}${cell.hasNote ? ' (Has Note)' : ''}`}
                    className={`relative h-9 rounded-lg flex items-center justify-center font-bold transition-all ${
                      cell.isToday ? 'ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--surface)]' : ''
                    } ${
                      cell.status === 'completed'
                        ? 'text-white'
                        : cell.status === 'partial'
                        ? 'border border-[var(--accent)] text-[var(--accent)] bg-[var(--surface-raised)]'
                        : cell.status === 'skipped'
                        ? 'text-[var(--text-muted)] bg-[var(--surface-raised)] line-through'
                        : cell.status === 'missed'
                        ? 'border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]'
                        : 'opacity-20 text-[var(--text-muted)] cursor-default'
                    }`}
                    style={{
                      backgroundColor: cell.status === 'completed' ? resolvedColor : undefined,
                    }}
                  >
                    <span>{cell.dayNumber}</span>

                    {/* Dot on days with a note */}
                    {cell.hasNote && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-1 w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: cell.status === 'completed' ? '#FFFFFF' : resolvedColor,
                        }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Calendar Legend */}
            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] pt-4 mt-4 border-t border-[var(--border)]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: resolvedColor }} />
                <span>Done</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded border border-[var(--accent)] bg-[var(--surface-raised)]" />
                <span>Partial</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded border border-[var(--border)]" />
                <span>Missed</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                <span>Note</span>
              </span>
            </div>
          </div>

          {/* ── 4. 53 x 7 YEAR GRID ────────────────────────────────────────── */}
          <div className="p-5 sm:p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] block">
                YEAR GRID (53 × 7) ————
              </span>
              <span className="font-mono text-[10px] text-[var(--text-muted)]">
                Newest at right →
              </span>
            </div>

            {/* Horizontally scrollable year container */}
            <div className="overflow-x-auto pb-2 select-none">
              <div className="inline-block min-w-max">
                {/* 53 Columns x 7 Rows Grid */}
                <div className="flex gap-1">
                  {yearGrid.weeks.map((week) => (
                    <div key={week.weekIndex} className="flex flex-col gap-1">
                      {week.days.map((d) => {
                        const isDone = d.status === 'completed'
                        const isPartial = d.status === 'partial'
                        const isSkipped = d.status === 'skipped'
                        const isInactive = d.status === 'inactive'

                        return (
                          <div
                            key={d.date}
                            onClick={() => {
                              if (!isInactive) {
                                setActiveCellInfo(d)
                                handleOpenDaySheet(d.date)
                              }
                            }}
                            title={`${d.date}: ${d.status}${d.hasNote ? ' (Has Note)' : ''}`}
                            className={`w-3 h-3 rounded-xs transition-transform hover:scale-125 relative cursor-pointer ${
                              isDone
                                ? 'shadow-2xs'
                                : isPartial
                                ? 'border border-[var(--accent)]'
                                : isSkipped
                                ? 'bg-[var(--surface-raised)] border border-[var(--border)]'
                                : isInactive
                                ? 'opacity-15 bg-[var(--surface-raised)] cursor-default'
                                : 'bg-[var(--surface-raised)] border border-[var(--border)]'
                            }`}
                            style={{
                              backgroundColor: isDone ? resolvedColor : undefined,
                            }}
                          >
                            {d.hasNote && !isInactive && (
                              <span
                                className="absolute -top-0.5 -right-0.5 w-1 h-1 rounded-full bg-amber-400"
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── INTERACTIVE DAY SHEET & NOTE MODAL (Bottom Sheet / Drawer) ───────── */}
      <AnimatePresence>
        {noteModalOpen && selectedDate && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div>
                  <h3 className="font-mono text-sm font-bold text-[var(--text-primary)]">
                    Day Log · {selectedDate}
                  </h3>
                  <p className="font-mono text-[10px] text-[var(--text-muted)]">
                    {habit.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNoteModalOpen(false)}
                  className="btn-icon w-8 h-8 rounded-lg"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Habit Completion / Amount Toggle in Sheet */}
              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                  Completion Status
                </span>

                <button
                  type="button"
                  onClick={() => handleToggleDayCompletion(selectedDate)}
                  className={`font-mono text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
                    records[selectedDate]?.isCompleted
                      ? 'text-white'
                      : 'border-[var(--border)] text-[var(--text-muted)] bg-[var(--surface-raised)]'
                  }`}
                  style={{
                    backgroundColor: records[selectedDate]?.isCompleted ? resolvedColor : undefined,
                    borderColor: records[selectedDate]?.isCompleted ? resolvedColor : undefined,
                  }}
                >
                  {records[selectedDate]?.isCompleted && <Check size={13} strokeWidth={3} />}
                  <span>{records[selectedDate]?.isCompleted ? 'Completed' : 'Mark Done'}</span>
                </button>
              </div>

              {/* Note Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-xs font-semibold text-[var(--text-muted)]">
                    Day Note (Max 500 chars)
                  </label>
                  <span
                    className={`font-mono text-[10px] ${
                      editingNoteText.length > 500 ? 'text-rose-500 font-bold' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {editingNoteText.length} / 500
                  </span>
                </div>

                <textarea
                  value={editingNoteText}
                  onChange={(e) => setEditingNoteText(e.target.value.slice(0, 500))}
                  placeholder="What went well? Any obstacles or context for this habit today..."
                  rows={4}
                  className="w-full font-mono text-xs p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              {actionError && (
                <p className="font-mono text-xs text-rose-500 font-bold">{actionError}</p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                {notesByDate.has(selectedDate) ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(selectedDate)}
                    className="font-mono text-xs text-rose-500 hover:underline py-2"
                  >
                    Delete Note
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNoteModalOpen(false)}
                    className="btn btn-ghost font-mono text-xs py-2 px-3 border border-[var(--border)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSavingNote || !editingNoteText.trim()}
                    onClick={handleSaveNote}
                    className="btn btn-primary font-mono text-xs py-2 px-4 inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSavingNote ? 'Saving…' : 'Save Note'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

