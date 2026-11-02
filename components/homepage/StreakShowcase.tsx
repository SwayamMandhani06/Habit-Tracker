'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Minus,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Flame,
  Trophy,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar as CalendarIcon,
  BarChart3,
  SlidersHorizontal,
  ChevronDown,
  Edit3,
  Zap,
  Target,
  Sparkles,
  Dumbbell,
  BookOpen,
  Code2,
  ShieldCheck,
} from 'lucide-react'
import { playCompletionChime } from '@/lib/audio'

// ── Phone 1: Amount Habits (Deep Work · Hours) ───────────────────────────────
function AmountHabitPhone() {
  const [hours, setHours] = useState(3.5)
  const targetHours = 4.0

  const handleDecrement = () => setHours((h) => Math.max(0, Math.round((h - 0.5) * 10) / 10))
  const handleIncrement = () => {
    setHours((h) => {
      const next = Math.round((h + 0.5) * 10) / 10
      if (next >= targetHours && h < targetHours) playCompletionChime()
      return next
    })
  }

  const progressPct = Math.min(100, Math.round((hours / targetHours) * 100))

  return (
    <div className="flex flex-col h-full text-[var(--text-primary)]">
      {/* Top Header */}
      <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[var(--surface-raised)] flex items-center justify-center text-[var(--text-muted)] text-[10px]">
            <Zap size={11} className="text-[var(--accent)]" />
          </div>
          <span className="font-mono text-xs font-bold">Deep Work</span>
        </div>
        <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] font-bold">
          Daily Goal
        </span>
      </div>

      <div className="flex-1 px-4 py-3 flex flex-col justify-between overflow-y-auto no-scrollbar">
        {/* Main Quantitative Stepper Card */}
        <div className="my-2 p-3 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)]">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                Focused Time
              </span>
              <div className="font-mono text-2xl font-black text-[var(--text-primary)] leading-tight">
                {hours.toFixed(1)} <span className="text-xs font-normal text-[var(--text-muted)]">/ {targetHours.toFixed(1)} hrs</span>
              </div>
            </div>
            <span className="font-mono text-sm font-bold text-[var(--accent)]">
              {progressPct}%
            </span>
          </div>

          {/* Linear Progress Bar */}
          <div className="w-full h-2.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden mb-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-[var(--accent)] rounded-full"
            />
          </div>

          {/* Stepper Controls */}
          <div className="flex items-center justify-center gap-4 pt-1">
            <button
              onClick={handleDecrement}
              className="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center active:scale-90 hover:border-[var(--accent)] transition-all cursor-pointer"
              aria-label="Decrease hours"
            >
              <Minus size={13} />
            </button>
            <span className="font-mono text-xs font-bold text-[var(--text-muted)]">
              &plusmn; 0.5h step
            </span>
            <button
              onClick={handleIncrement}
              className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center active:scale-90 shadow-xs hover:opacity-90 transition-all cursor-pointer"
              aria-label="Increase hours"
            >
              <Plus size={13} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Running Volume Trend Curve */}
        <div className="p-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
          <div className="flex items-center justify-between mb-1.5 font-mono text-[9px]">
            <span className="uppercase tracking-wider font-bold text-[var(--text-muted)]">
              Daily Output Velocity
            </span>
            <span className="text-[var(--accent)] font-bold">Avg 4.2 hrs</span>
          </div>

          {/* SVG Spark Area */}
          <div className="w-full h-14">
            <svg viewBox="0 0 200 60" className="w-full h-full">
              <defs>
                <linearGradient id="deepWorkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 10 40 Q 40 45 70 25 T 130 18 T 190 12 L 190 55 L 10 55 Z"
                fill="url(#deepWorkGrad)"
              />
              <path
                d="M 10 40 Q 40 45 70 25 T 130 18 T 190 12"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="190" cy="12" r="3.5" fill="var(--accent)" />
            </svg>
          </div>
        </div>

        {/* Streaks Row */}
        <div className="grid grid-cols-3 gap-1.5 mt-2">
          <div className="p-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-center">
            <Flame size={12} className="text-amber-500 mx-auto mb-0.5" />
            <div className="font-mono text-[11px] font-bold">14 days</div>
            <div className="font-mono text-[8px] text-[var(--text-muted)]">Current</div>
          </div>
          <div className="p-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-center">
            <Trophy size={12} className="text-amber-500 mx-auto mb-0.5" />
            <div className="font-mono text-[11px] font-bold">21 days</div>
            <div className="font-mono text-[8px] text-[var(--text-muted)]">Best</div>
          </div>
          <div className="p-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-center">
            <Check size={12} className="text-emerald-500 mx-auto mb-0.5" />
            <div className="font-mono text-[11px] font-bold">6 / 7</div>
            <div className="font-mono text-[8px] text-[var(--text-muted)]">This Week</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Phone 2: Week Matrix (Our 5 Real Habits) ─────────────────────────────────
function WeekMatrixPhone() {
  interface HabitRowState {
    id: string
    title: string
    color: string
    days: boolean[]
  }

  const [rows, setRows] = useState<HabitRowState[]>([
    { id: '1', title: 'Deep Work', color: '#5C6B5A', days: [true, true, true, true, true, false, true] },
    { id: '2', title: 'DSA Practice', color: '#4A7A96', days: [true, true, true, true, false, true, true] },
    { id: '3', title: 'Gym / Workout', color: '#A36B54', days: [true, true, false, true, true, false, true] },
    { id: '4', title: 'Book Reading', color: '#B87D3B', days: [true, true, true, true, true, true, true] },
    { id: '5', title: 'No Social Media', color: '#7D5A88', days: [true, false, true, true, true, true, false] },
  ])

  const toggleDay = (rowId: string, dayIdx: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r
        const newDays = [...r.days]
        newDays[dayIdx] = !newDays[dayIdx]
        if (newDays[dayIdx]) playCompletionChime()
        return { ...r, days: newDays }
      })
    )
  }

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <div className="flex flex-col h-full text-[var(--text-primary)]">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <span className="font-mono text-xs font-bold block">Week Matrix</span>
          <span className="font-mono text-[9px] text-[var(--text-muted)]">Oct 26 – Nov 01</span>
        </div>
        <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-[var(--accent)]/15 text-[var(--accent)]">
          7-DAY VIEW
        </span>
      </div>

      <div className="flex-1 px-3 py-2 flex flex-col justify-between overflow-y-auto no-scrollbar">
        {/* Table Header */}
        <div className="flex items-center justify-between px-1 py-1 font-mono text-[9px] text-[var(--text-muted)] border-b border-[var(--border)]">
          <span className="uppercase tracking-wider font-bold">HABIT</span>
          <div className="flex items-center gap-1.5 pr-0.5">
            {dayLabels.map((d, i) => (
              <span
                key={i}
                className={`w-5 text-center font-bold ${
                  i === 4 ? 'text-[var(--accent)] font-extrabold' : ''
                }`}
              >
                {d}
              </span>
            ))}
          </div>
        </div>

        {/* Habit Rows */}
        <div className="space-y-1.5 my-auto">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between p-1.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]"
            >
              <div className="flex items-center gap-1.5 min-w-0 pr-1">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: row.color }}
                />
                <span className="font-mono text-[10px] font-bold truncate">
                  {row.title}
                </span>
              </div>

              {/* 7 Check Squares */}
              <div className="flex items-center gap-1">
                {row.days.map((done, dayIdx) => (
                  <button
                    key={dayIdx}
                    onClick={() => toggleDay(row.id, dayIdx)}
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                      done
                        ? 'text-white shadow-xs scale-100'
                        : 'bg-black/5 dark:bg-white/5 border border-[var(--border)] opacity-40'
                    }`}
                    style={{
                      backgroundColor: done ? row.color : undefined,
                    }}
                    aria-label={`${row.title} day ${dayIdx + 1}`}
                  >
                    {done && <Check size={11} strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Summary */}
        <div className="p-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-between font-mono text-[9px]">
          <span className="text-[var(--text-muted)]">Week Completion</span>
          <span className="font-bold text-[var(--accent)]">29 / 35 Checked (83%)</span>
        </div>
      </div>
    </div>
  )
}

// ── Phone 3: Habit Insights & Ranking ────────────────────────────────────────
function ConsistencyStatsPhone() {
  const habits = [
    { name: 'Deep Work', val: 94, color: '#5C6B5A' },
    { name: 'DSA Practice', val: 88, color: '#4A7A96' },
    { name: 'Gym / Workout', val: 85, color: '#A36B54' },
    { name: 'Book Reading', val: 82, color: '#B87D3B' },
    { name: 'No Social Media', val: 78, color: '#7D5A88' },
  ]

  const weeklyVelocity = [
    { day: 'M', height: 85 },
    { day: 'T', height: 100 },
    { day: 'W', height: 95 },
    { day: 'T', height: 80 },
    { day: 'F', height: 100 },
    { day: 'S', height: 75 },
    { day: 'S', height: 90 },
  ]

  return (
    <div className="flex flex-col h-full text-[var(--text-primary)]">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <span className="font-mono text-xs font-bold">Analytics & Insights</span>
        <span className="font-mono text-[9px] text-[var(--text-muted)]">October 2026</span>
      </div>

      <div className="flex-1 px-4 py-2.5 flex flex-col justify-between overflow-y-auto no-scrollbar">
        {/* Metric Headline Row */}
        <div className="grid grid-cols-3 gap-1.5 my-1">
          <div className="p-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-center">
            <span className="font-mono text-base font-extrabold text-[var(--accent)] block leading-none">
              91%
            </span>
            <span className="font-mono text-[8px] text-[var(--text-muted)]">Avg Score</span>
          </div>
          <div className="p-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-center">
            <span className="font-mono text-base font-extrabold text-[var(--text-primary)] block leading-none">
              24
            </span>
            <span className="font-mono text-[8px] text-[var(--text-muted)]">Perfect Days</span>
          </div>
          <div className="p-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-center">
            <span className="font-mono text-base font-extrabold text-amber-500 block leading-none">
              18d
            </span>
            <span className="font-mono text-[8px] text-[var(--text-muted)]">Current Streak</span>
          </div>
        </div>

        {/* Habit Consistency Ranking */}
        <div className="p-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] space-y-1.5">
          <span className="font-mono text-[9px] uppercase tracking-wider font-bold text-[var(--text-muted)] block">
            Discipline Consistency Ranking
          </span>
          {habits.map((h, idx) => (
            <div key={idx} className="space-y-0.5">
              <div className="flex justify-between font-mono text-[9px]">
                <span className="truncate pr-1">{h.name}</span>
                <span className="font-bold">{h.val}%</span>
              </div>
              <div className="w-full h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${h.val}%`,
                    backgroundColor: h.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Weekly Velocity Bars */}
        <div className="p-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex flex-col justify-between">
          <div className="flex items-center justify-between font-mono text-[8px] text-[var(--text-muted)] mb-1">
            <span className="font-bold">Daily Completion Velocity</span>
            <span className="text-[var(--accent)] font-bold">100% Peak on Fri</span>
          </div>
          <div className="flex items-end justify-between h-9 px-2">
            {weeklyVelocity.map((v, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className="w-2 rounded-t-xs"
                  style={{
                    height: `${(v.height / 100) * 26}px`,
                    backgroundColor: v.height === 100 ? 'var(--accent)' : 'var(--text-muted)',
                    opacity: v.height === 100 ? 1 : 0.6,
                  }}
                />
                <span className="font-mono text-[7px] text-[var(--text-muted)]">
                  {v.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Phone 4: Calendar & Daily Reflections ───────────────────────────────────
function CalendarNotePhone() {
  const [tab, setTab] = useState<'calendar' | 'note'>('note')
  const [noteTag, setNoteTag] = useState<'Note' | 'Planned' | 'Completed'>('Completed')
  const [saved, setSaved] = useState(false)

  // 31 days
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const completedDays = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26, 28, 29, 30]

  return (
    <div className="flex flex-col h-full text-[var(--text-primary)]">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <span className="font-mono text-xs font-bold">October 2026</span>
        {/* Tab Toggle */}
        <div className="flex items-center p-0.5 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] font-mono text-[9px]">
          <button
            onClick={() => setTab('calendar')}
            className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
              tab === 'calendar' ? 'bg-[var(--surface)] text-[var(--text-primary)] font-bold shadow-2xs' : 'text-[var(--text-muted)]'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setTab('note')}
            className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
              tab === 'note' ? 'bg-[var(--accent)] text-white font-bold' : 'text-[var(--text-muted)]'
            }`}
          >
            Note
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-3 flex flex-col justify-between overflow-y-auto no-scrollbar">
        {tab === 'calendar' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between font-mono text-[9px] text-[var(--text-muted)]">
              <span>Monthly Heatmap</span>
              <span className="font-bold text-[var(--accent)]">26 / 31 Perfect</span>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5 justify-items-center">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <span key={i} className="font-mono text-[8px] font-bold text-[var(--text-muted)]">{d}</span>
              ))}
              {days.map((day) => {
                const isComplete = completedDays.includes(day)
                return (
                  <div
                    key={day}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[9px] font-bold transition-all ${
                      isComplete
                        ? 'bg-[var(--accent)] text-white shadow-2xs'
                        : 'bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--border)]'
                    }`}
                  >
                    {day}
                  </div>
                )
              })}
            </div>

            <div className="p-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] font-mono text-[9px]">
              <span className="font-bold text-[var(--text-primary)] block mb-0.5">Continuous Momentum</span>
              <p className="text-[var(--text-muted)] leading-tight">
                92% month completion rate. Consistent execution across all 5 active disciplines.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 flex-1 flex flex-col">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5">
              {(['Note', 'Planned', 'Completed'] as const).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setNoteTag(tag)}
                  className={`font-mono text-[9px] font-bold px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                    noteTag === tag
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--surface-raised)] text-[var(--text-muted)]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Note Editor Area */}
            <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex-1 flex flex-col justify-between font-mono">
              <p className="text-[10px] leading-relaxed italic text-[var(--text-primary)]">
                &ldquo;Completed 4.0 hours of Deep Work on compiler AST. Read 30 pages of distributed systems. Kept the streak unbroken.&rdquo;
              </p>
              <div className="flex items-center justify-between text-[8px] text-[var(--text-muted)] pt-2 border-t border-[var(--border)] mt-2">
                <span>Target: 21:30</span>
                <span>112 / 500 chars</span>
              </div>
            </div>

            {/* Save Note Button */}
            <button
              onClick={() => {
                setSaved(true)
                playCompletionChime()
                setTimeout(() => setSaved(false), 2000)
              }}
              className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white font-mono text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              {saved ? '✓ Reflection Saved' : 'Save Evening Note'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Phone 5: Integrated Focus Clock ──────────────────────────────────────────
function FocusClockPhone() {
  const [minutes, setMinutes] = useState(25)
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [clockMode, setClockMode] = useState<'flip' | 'ring'>('flip')

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((s) => {
          if (s > 0) return s - 1
          setMinutes((m) => {
            if (m > 0) return m - 1
            setIsRunning(false)
            playCompletionChime()
            return 0
          })
          return 59
        })
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning])

  return (
    <div className="flex flex-col h-full text-[var(--text-primary)]">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <span className="font-mono text-xs font-bold">Focus Clock</span>
        {/* Flip / Ring toggle */}
        <div className="flex items-center p-0.5 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] font-mono text-[8px]">
          <button
            onClick={() => setClockMode('flip')}
            className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
              clockMode === 'flip' ? 'bg-[var(--accent)] text-white font-bold' : 'text-[var(--text-muted)]'
            }`}
          >
            Flip
          </button>
          <button
            onClick={() => setClockMode('ring')}
            className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
              clockMode === 'ring' ? 'bg-[var(--accent)] text-white font-bold' : 'text-[var(--text-muted)]'
            }`}
          >
            Ring
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-3 flex flex-col items-center justify-between overflow-y-auto no-scrollbar">
        {/* Linked Habit Banner */}
        <div className="text-center">
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--accent)] font-bold">
            LOGGING TO: DEEP WORK
          </span>
          <p className="font-serif italic text-sm text-[var(--text-muted)]">
            Single-task deliberate focus
          </p>
        </div>

        {/* Clock Display */}
        {clockMode === 'flip' ? (
          <div className="flex flex-col items-center gap-2 my-auto">
            <div className="relative w-36 h-20 rounded-2xl bg-[#1A1815] text-[#F7F5F2] border border-white/10 shadow-xl flex items-center justify-center overflow-hidden">
              <span className="font-mono text-5xl font-black tracking-tight">
                {String(minutes).padStart(2, '0')}
              </span>
              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/60 shadow-xs" />
            </div>

            <div className="relative w-36 h-20 rounded-2xl bg-[#1A1815] text-[#F7F5F2] border border-white/10 shadow-xl flex items-center justify-center overflow-hidden">
              <span className="font-mono text-5xl font-black tracking-tight">
                {String(seconds).padStart(2, '0')}
              </span>
              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/60 shadow-xs" />
            </div>
          </div>
        ) : (
          <div className="relative w-44 h-44 my-auto flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="var(--border)"
                strokeWidth="4"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="4"
                strokeDasharray="264"
                strokeDashoffset={264 - (264 * (minutes * 60 + seconds)) / 1500}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="font-mono text-3xl font-extrabold tracking-tight">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--accent)] font-bold">
                DEEP WORK
              </span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="w-full space-y-2 mt-auto">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setMinutes((m) => m + 5)}
              className="px-3 py-1.5 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] font-mono text-[10px] font-bold hover:border-[var(--accent)] transition-all cursor-pointer"
            >
              +5 min
            </button>

            <button
              onClick={() => setIsRunning(!isRunning)}
              className="px-6 py-2 rounded-full bg-[var(--accent)] text-white font-mono text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isRunning ? <Pause size={12} /> : <Play size={12} />}
              <span>{isRunning ? 'Pause' : 'Start'}</span>
            </button>

            <button
              onClick={() => {
                setIsRunning(false)
                setMinutes(25)
                setSeconds(0)
              }}
              className="p-2 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] hover:border-[var(--accent)] transition-all cursor-pointer"
              aria-label="Reset timer"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          <p className="font-mono text-[9px] text-center text-[var(--text-muted)]">
            Elapsed time automatically credits to Deep Work
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Showcase Master Component ────────────────────────────────────────────────
export function StreakShowcase() {
  const containerRef = useRef<HTMLDivElement>(null)

  const screens = [
    {
      id: 'screen-1',
      title: 'Amount Habits with Steppers',
      tag: 'QUANTITATIVE',
      subtitle: 'Track hours, pages, or liters with customizable increments and running volume curves.',
      component: <AmountHabitPhone />,
    },
    {
      id: 'screen-2',
      title: 'Compact 7-Day Week Matrix',
      tag: 'GLANCEABLE',
      subtitle: 'A dense, tactile habit grid built specifically for rapid one-thumb daily check-ins.',
      component: <WeekMatrixPhone />,
    },
    {
      id: 'screen-3',
      title: 'Habit Consistency & Insights',
      tag: 'ANALYTICS',
      subtitle: 'Automatic streak calculations, velocity distributions, and prioritized focus areas.',
      component: <ConsistencyStatsPhone />,
    },
    {
      id: 'screen-4',
      title: 'Calendar Heatmap & Day Notes',
      tag: 'REFLECTION',
      subtitle: 'Full-month completion heatmaps paired with structured evening reflections.',
      component: <CalendarNotePhone />,
    },
    {
      id: 'screen-5',
      title: 'Integrated Focus Clock',
      tag: 'DEEP WORK',
      subtitle: 'Pomodoro and countdown timers that automatically credit elapsed minutes to your habits.',
      component: <FocusClockPhone />,
    },
  ]

  const handleScroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return
    const scrollAmount = 320
    containerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  return (
    <div className="w-full select-none">
      {/* Controls Bar */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
            FIVE CORE SCREENS
          </span>
          <p className="font-serif italic text-xl sm:text-2xl text-[var(--text-primary)]">
            Engineered for calm, daily execution.
          </p>
        </div>

        {/* Carousel Navigation Buttons (Min 44x44px touch targets) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleScroll('left')}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)] flex items-center justify-center hover:border-[var(--accent)] active:scale-95 transition-all shadow-xs cursor-pointer"
            aria-label="Previous screen"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => handleScroll('right')}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)] flex items-center justify-center hover:border-[var(--accent)] active:scale-95 transition-all shadow-xs cursor-pointer"
            aria-label="Next screen"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* 5-Phone Horizontal Container (Scroll Snap, ~1.2 phones visible on mobile) */}
      <div
        ref={containerRef}
        className="flex items-stretch gap-6 overflow-x-auto pb-6 pt-2 no-scrollbar snap-x snap-mandatory px-1"
        style={{ scrollBehavior: 'smooth' }}
      >
        {screens.map((screen, idx) => (
          <div
            key={screen.id}
            className="flex-shrink-0 w-[275px] sm:w-[285px] snap-center flex flex-col"
          >
            {/* Phone Mockup Frame (Same as Hero) */}
            <div
              className="w-full h-[540px] rounded-[42px] p-2.5 bg-[#1C1A17] shadow-xl border border-white/10 relative overflow-hidden transition-transform duration-300 hover:-translate-y-1"
              style={{
                boxShadow:
                  '0 20px 40px -10px rgba(0,0,0,0.4), inset 0 2px 3px rgba(255,255,255,0.15)',
              }}
            >
              {/* Inner Screen */}
              <div className="relative w-full h-full rounded-[34px] bg-[var(--surface)] overflow-hidden flex flex-col border border-black/20 dark:border-white/10">
                {/* Dynamic Island Cutout */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-40 flex items-center justify-between px-2 pointer-events-none">
                  <div className="w-2 h-2 rounded-full bg-[#181818] border border-white/10" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                </div>

                {/* Status Bar */}
                <div className="pt-2.5 px-5 pb-1 flex items-center justify-between font-mono text-[9px] font-bold select-none z-30 opacity-80">
                  <span>9:41</span>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-1.5 rounded-[2px] border border-current p-[1px] flex">
                      <span className="h-full w-2 bg-current" />
                    </span>
                  </div>
                </div>

                {/* Phone Active Content */}
                <div className="flex-1 overflow-hidden">{screen.component}</div>

                {/* iOS Home Indicator Bar */}
                <div className="w-full pb-1.5 pt-1 flex justify-center pointer-events-none">
                  <div className="w-20 h-1 rounded-full bg-current opacity-20" />
                </div>
              </div>
            </div>

            {/* Caption & Description Underneath */}
            <div className="mt-4 px-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)]">
                  {screen.tag}
                </span>
                <span className="font-mono text-[9px] text-[var(--text-muted)]">
                  0{idx + 1} / 05
                </span>
              </div>
              <h4 className="font-mono text-sm font-bold text-[var(--text-primary)]">
                {screen.title}
              </h4>
              <p className="font-serif italic text-xs text-[var(--text-muted)] mt-1 leading-snug">
                {screen.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Illustrative data note under gallery */}
      <p className="text-center font-mono text-[11px] text-[var(--text-muted)] mt-6">
        Illustrative data &middot; Rendered from real app components
      </p>
    </div>
  )
}
