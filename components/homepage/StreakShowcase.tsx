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
  Droplet,
  Dumbbell,
  BookOpen,
  Coffee,
  Sparkles,
  Camera,
  Image as ImageIcon,
  Clock,
  Calendar as CalendarIcon,
  BarChart3,
  SlidersHorizontal,
  ChevronDown,
  Share2,
  Edit3,
} from 'lucide-react'
import { playCompletionChime } from '@/lib/audio'

// ── Phone 1: An Amount Habit (Drink Water) ──────────────────────────────────
function AmountHabitPhone() {
  const [glasses, setGlasses] = useState(8)
  const maxGlasses = 8

  const handleDecrement = () => setGlasses((g) => Math.max(0, g - 1))
  const handleIncrement = () => {
    setGlasses((g) => {
      const next = Math.min(maxGlasses, g + 1)
      if (next === maxGlasses) playCompletionChime()
      return next
    })
  }

  return (
    <div className="flex flex-col h-full text-[var(--text-primary)]">
      {/* Top Header */}
      <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[var(--surface-raised)] flex items-center justify-center text-[var(--text-muted)] text-[10px]">
            ✕
          </div>
          <span className="font-mono text-xs font-bold">Drink water</span>
        </div>
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Share2 size={12} />
          <Edit3 size={12} />
        </div>
      </div>

      <div className="flex-1 px-4 py-3 flex flex-col justify-between overflow-y-auto no-scrollbar">
        {/* Daily Tag */}
        <div>
          <span className="inline-block font-mono text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#38BDF8]/15 text-[#38BDF8]">
            Daily
          </span>
        </div>

        {/* 8 Glasses Visual Grid */}
        <div className="my-2 p-3 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)]">
          <div className="grid grid-cols-4 gap-2 justify-items-center mb-2">
            {Array.from({ length: 8 }).map((_, i) => {
              const isFilled = i < glasses
              return (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    const next = i + 1 === glasses ? i : i + 1
                    setGlasses(next)
                    if (next === maxGlasses) playCompletionChime()
                  }}
                  className="w-8 h-10 rounded-b-xl rounded-t-sm border-2 relative overflow-hidden flex flex-col justify-end p-0.5 cursor-pointer transition-all"
                  style={{
                    borderColor: isFilled ? '#38BDF8' : 'var(--border)',
                    backgroundColor: isFilled ? 'rgba(56,189,248,0.1)' : 'transparent',
                  }}
                >
                  {isFilled && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: '80%' }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="w-full bg-[#38BDF8] rounded-b-lg"
                    />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center font-mono text-[8px] font-bold opacity-60">
                    {i + 1}
                  </span>
                </motion.div>
              )
            })}
          </div>

          <div className="text-center">
            <span className="font-mono text-xs font-extrabold text-[var(--text-primary)]">
              {glasses} / {maxGlasses} glasses
            </span>
            <p className="font-mono text-[9px] text-[var(--text-muted)]">Daily Goal (2,000 ml)</p>
          </div>

          {/* Stepper Controls */}
          <div className="flex items-center justify-center gap-4 mt-2.5">
            <button
              onClick={handleDecrement}
              className="w-7 h-7 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center active:scale-90 hover:border-[#38BDF8] transition-all"
            >
              <Minus size={12} />
            </button>
            <button
              onClick={handleIncrement}
              className="w-7 h-7 rounded-full bg-[#38BDF8] text-white flex items-center justify-center active:scale-90 shadow-xs hover:opacity-90 transition-all"
            >
              <Plus size={12} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Amount Per Day Area Chart */}
        <div className="p-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
          <div className="flex items-center justify-between mb-1.5 font-mono text-[9px]">
            <span className="uppercase tracking-wider font-bold text-[var(--text-muted)]">
              Amount Per Day
            </span>
            <span className="text-[#38BDF8] font-bold">Avg 7.8 gl</span>
          </div>

          {/* SVG Area Chart */}
          <div className="w-full h-14">
            <svg viewBox="0 0 200 60" className="w-full h-full">
              <defs>
                <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 10 35 Q 40 45 70 20 T 130 18 T 190 12 L 190 55 L 10 55 Z"
                fill="url(#waterGrad)"
              />
              <path
                d="M 10 35 Q 40 45 70 20 T 130 18 T 190 12"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Highlight dot on today */}
              <circle cx="190" cy="12" r="3.5" fill="#38BDF8" />
            </svg>
          </div>
        </div>

        {/* Streaks Row */}
        <div className="grid grid-cols-3 gap-1.5 mt-2">
          <div className="p-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-center">
            <Flame size={12} className="text-amber-500 mx-auto mb-0.5" />
            <div className="font-mono text-[11px] font-bold">9 days</div>
            <div className="font-mono text-[8px] text-[var(--text-muted)]">Current</div>
          </div>
          <div className="p-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-center">
            <Trophy size={12} className="text-amber-500 mx-auto mb-0.5" />
            <div className="font-mono text-[11px] font-bold">12 days</div>
            <div className="font-mono text-[8px] text-[var(--text-muted)]">Best</div>
          </div>
          <div className="p-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-center">
            <Check size={12} className="text-emerald-500 mx-auto mb-0.5" />
            <div className="font-mono text-[11px] font-bold">7 / 7</div>
            <div className="font-mono text-[8px] text-[var(--text-muted)]">This Week</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Phone 2: Minimal Style & Streaks ────────────────────────────────────────
function MinimalStylePhone() {
  const [category, setCategory] = useState<'All' | 'Fitness' | 'Health' | 'Learning'>('All')

  interface RowData {
    id: string
    title: string
    category: 'Fitness' | 'Health' | 'Learning'
    color: string
    days: boolean[]
  }

  const [rows, setRows] = useState<RowData[]>([
    { id: '1', title: 'Gym session', category: 'Fitness', color: '#6366F1', days: [true, true, true, false, true] },
    { id: '2', title: 'No sugar', category: 'Health', color: '#10B981', days: [true, true, true, true, true] },
    { id: '3', title: 'Read before bed', category: 'Learning', color: '#A855F7', days: [true, true, true, true, false] },
    { id: '4', title: 'Drink water (4L)', category: 'Health', color: '#06B6D4', days: [true, true, true, true, true] },
    { id: '5', title: 'Morning run (5k)', category: 'Fitness', color: '#F97316', days: [false, true, true, true, true] },
    { id: '6', title: 'Meditate (15m)', category: 'Health', color: '#14B8A6', days: [true, true, false, true, true] },
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

  const filtered = category === 'All' ? rows : rows.filter((r) => r.category === category)
  const dayLabels = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="flex flex-col h-full text-[var(--text-primary)]">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <span className="font-mono text-xs font-bold">Streaks</span>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-[var(--surface-raised)] flex items-center justify-center font-mono text-[10px]">
            +
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-2 flex flex-col justify-between overflow-y-auto no-scrollbar">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto no-scrollbar py-1">
          {(['All', 'Fitness', 'Health', 'Learning'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`font-mono text-[9px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap transition-all ${
                category === cat
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Days Header */}
        <div className="flex items-center justify-between px-2 text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
          <span>Habit</span>
          <div className="flex items-center gap-1.5 pr-0.5">
            {dayLabels.map((l, idx) => (
              <span key={idx} className="w-[18px] text-center font-bold text-[7px]">
                {l}
              </span>
            ))}
          </div>
        </div>

        {/* Habit Rows */}
        <div className="space-y-1.5 flex-1">
          {filtered.map((row) => (
            <div
              key={row.id}
              className="p-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-between gap-1.5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: row.color }}
                />
                <span className="font-mono text-[10px] font-bold truncate">
                  {row.title}
                </span>
              </div>

              {/* 5-day Streak Strip */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {row.days.map((isDone, dIdx) => (
                  <button
                    key={dIdx}
                    onClick={() => toggleDay(row.id, dIdx)}
                    className="w-4 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer"
                    style={{
                      backgroundColor: isDone ? row.color : 'rgba(0,0,0,0.06)',
                      color: '#FFFFFF',
                    }}
                  >
                    {isDone && <Check size={8} strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Glance Info */}
        <div className="mt-3 p-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-between font-mono text-[9px]">
          <span className="text-[var(--text-muted)]">5-Day Success Rate</span>
          <span className="font-bold text-emerald-500">92% Unbroken</span>
        </div>
      </div>
    </div>
  )
}

// ── Phone 3: Flip & Ring Focus Clock ────────────────────────────────────────
function FocusClockPhone() {
  const [clockMode, setClockMode] = useState<'flip' | 'ring'>('flip')
  const [isRunning, setIsRunning] = useState(false)
  const [minutes, setMinutes] = useState(24)
  const [seconds, setSeconds] = useState(59)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isRunning) {
      timer = setInterval(() => {
        setSeconds((s) => {
          if (s > 0) return s - 1
          setMinutes((m) => (m > 0 ? m - 1 : 25))
          return 59
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [isRunning])

  return (
    <div className="flex flex-col h-full text-[var(--text-primary)]">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
          <span>Focus Clock</span>
        </div>
        <div className="flex items-center gap-1 p-0.5 rounded-full bg-[var(--surface-raised)]">
          <button
            onClick={() => setClockMode('flip')}
            className={`font-mono text-[8px] font-bold px-2 py-0.5 rounded-full transition-all ${
              clockMode === 'flip' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)]'
            }`}
          >
            Flip
          </button>
          <button
            onClick={() => setClockMode('ring')}
            className={`font-mono text-[8px] font-bold px-2 py-0.5 rounded-full transition-all ${
              clockMode === 'ring' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)]'
            }`}
          >
            Ring
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-3 flex flex-col items-center justify-between overflow-y-auto no-scrollbar">
        <div className="text-center">
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--accent)] font-bold">
            MEDITATION & FOCUS
          </span>
          <p className="font-serif italic text-sm text-[var(--text-muted)]">
            Single-task flow state
          </p>
        </div>

        {/* Clock Display */}
        {clockMode === 'flip' ? (
          <div className="flex flex-col items-center gap-2 my-auto">
            {/* Split Flip Tile Top: Minutes */}
            <div className="relative w-36 h-20 rounded-2xl bg-[#1A1815] text-[#F7F5F2] border border-white/10 shadow-xl flex items-center justify-center overflow-hidden">
              <span className="font-mono text-5xl font-black tracking-tight">
                {String(minutes).padStart(2, '0')}
              </span>
              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/60 shadow-xs" />
            </div>

            {/* Split Flip Tile Bottom: Seconds */}
            <div className="relative w-36 h-20 rounded-2xl bg-[#1A1815] text-[#F7F5F2] border border-white/10 shadow-xl flex items-center justify-center overflow-hidden">
              <span className="font-mono text-5xl font-black tracking-tight">
                {String(seconds).padStart(2, '0')}
              </span>
              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/60 shadow-xs" />
            </div>
          </div>
        ) : (
          <div className="relative w-44 h-44 my-auto flex items-center justify-center">
            {/* Circular Progress Ring */}
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
                MEDITATE
              </span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="w-full space-y-2 mt-auto">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setMinutes((m) => m + 1)}
              className="px-3 py-1.5 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] font-mono text-[10px] font-bold hover:border-[var(--accent)] transition-all"
            >
              +1 min
            </button>

            <button
              onClick={() => setIsRunning(!isRunning)}
              className="px-6 py-2 rounded-full bg-[var(--accent)] text-white font-mono text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-1.5"
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
              className="p-2 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] hover:border-[var(--accent)] transition-all"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          <p className="font-mono text-[9px] text-center text-[var(--text-muted)] cursor-pointer hover:underline">
            + List subtasks (Deep Reading)
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Phone 4: Calendar & Day Note ────────────────────────────────────────────
function CalendarNotePhone() {
  const [tab, setTab] = useState<'calendar' | 'note'>('calendar')
  const [noteStatus, setNoteStatus] = useState<'Note' | 'Planned' | 'Completed'>('Note')
  const [saved, setSaved] = useState(false)

  // Calendar dates
  const days = Array.from({ length: 30 }, (_, i) => i + 1)
  const completedDays = [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 28, 29, 30]

  return (
    <div className="flex flex-col h-full text-[var(--text-primary)]">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <span className="font-mono text-xs font-bold">September</span>
        <div className="flex items-center gap-1 p-0.5 rounded-full bg-[var(--surface-raised)]">
          <button
            onClick={() => setTab('calendar')}
            className={`font-mono text-[8px] font-bold px-2 py-0.5 rounded-full transition-all ${
              tab === 'calendar' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)]'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setTab('note')}
            className={`font-mono text-[8px] font-bold px-2 py-0.5 rounded-full transition-all ${
              tab === 'note' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)]'
            }`}
          >
            Day Note
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-3 flex flex-col justify-between overflow-y-auto no-scrollbar">
        {tab === 'calendar' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between font-mono text-[9px] text-[var(--text-muted)]">
              <span>Week · Month · Year</span>
              <span className="font-bold text-[var(--accent)]">23 / 30 Days</span>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-1 text-center font-mono text-[8px] font-bold text-[var(--text-muted)]">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5 justify-items-center">
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

            {/* Bottom Insight */}
            <div className="p-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] font-mono text-[9px] space-y-1">
              <div className="flex justify-between font-bold">
                <span>Streak Consistency</span>
                <span className="text-[var(--accent)]">76.6%</span>
              </div>
              <p className="text-[var(--text-muted)] leading-tight">
                September was 14% higher than August. Unbroken 6-day streak active.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 flex-1 flex flex-col">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5">
              {(['Note', 'Planned', 'Completed'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setNoteStatus(s)}
                  className={`font-mono text-[9px] font-bold px-2.5 py-1 rounded-full transition-all ${
                    noteStatus === s
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--surface-raised)] text-[var(--text-muted)]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Note Editor Area */}
            <div className="p-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex-1 flex flex-col justify-between font-mono">
              <p className="text-[10px] leading-relaxed italic text-[var(--text-primary)]">
                “Ten pages tonight. Slower reading pace than usual, but Marcus Aurelius demands digestion. Kept the streak alive.”
              </p>
              <span className="text-[8px] text-[var(--text-muted)] self-end">
                54 / 500 chars
              </span>
            </div>

            {/* Photo & Target Time */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="p-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center gap-1.5 font-mono text-[9px]">
                <Camera size={11} className="text-[var(--accent)]" />
                <span>Photos (0)</span>
              </div>
              <div className="p-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center gap-1.5 font-mono text-[9px]">
                <Clock size={11} className="text-[var(--accent)]" />
                <span>Target: 21:30</span>
              </div>
            </div>

            {/* Save Note Button */}
            <button
              onClick={() => {
                setSaved(true)
                playCompletionChime()
                setTimeout(() => setSaved(false), 2000)
              }}
              className="w-full py-2 rounded-xl bg-[var(--accent)] text-white font-mono text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              {saved ? '✓ Note Saved' : 'Save Note'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Phone 5: Habits Compared & Consistency ──────────────────────────────────
function ConsistencyStatsPhone() {
  const [activeSegment, setActiveSegment] = useState<'all' | 'sugar' | 'read' | 'meditate'>('all')

  const habits = [
    { name: 'No sugar', val: 215, pct: 25, color: '#10B981' },
    { name: 'Read before bed', val: 196, pct: 22, color: '#A855F7' },
    { name: 'Meditate', val: 179, pct: 21, color: '#14B8A6' },
    { name: 'Drink water', val: 160, pct: 18, color: '#06B6D4' },
  ]

  const daysOfWeekVelocity = [
    { day: 'M', height: 60 },
    { day: 'T', height: 75 },
    { day: 'W', height: 95 },
    { day: 'T', height: 80 },
    { day: 'F', height: 100 },
    { day: 'S', height: 70 },
    { day: 'S', height: 85 },
  ]

  return (
    <div className="flex flex-col h-full text-[var(--text-primary)]">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <span className="font-mono text-xs font-bold">Statistics</span>
        <span className="font-mono text-[9px] text-[var(--text-muted)]">By Habit</span>
      </div>

      <div className="flex-1 px-4 py-3 flex flex-col justify-between overflow-y-auto no-scrollbar">
        {/* Donut Chart with Center Metric */}
        <div className="flex items-center justify-center gap-3 my-1">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90">
              {/* Multi-segment Donut */}
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#10B981" strokeWidth="4.5" strokeDasharray="25 75" strokeDashoffset="0" />
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#A855F7" strokeWidth="4.5" strokeDasharray="22 78" strokeDashoffset="-25" />
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#14B8A6" strokeWidth="4.5" strokeDasharray="21 79" strokeDashoffset="-47" />
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#06B6D4" strokeWidth="4.5" strokeDasharray="18 82" strokeDashoffset="-68" />
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#F59E0B" strokeWidth="4.5" strokeDasharray="14 86" strokeDashoffset="-86" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="font-mono text-sm font-extrabold tracking-tight">873</span>
              <span className="font-mono text-[7px] text-[var(--text-muted)] uppercase">Done</span>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-1 font-mono text-[8px]">
            {habits.map((h, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: h.color }} />
                <span className="text-[var(--text-muted)]">{h.name}:</span>
                <span className="font-bold">{h.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ranking Bars */}
        <div className="p-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] space-y-1.5">
          <span className="font-mono text-[9px] uppercase tracking-wider font-bold text-[var(--text-muted)]">
            Habit Ranking
          </span>
          {habits.map((h, idx) => (
            <div key={idx} className="space-y-0.5">
              <div className="flex justify-between font-mono text-[9px]">
                <span>{h.name}</span>
                <span className="font-bold">{h.val}</span>
              </div>
              <div className="w-full h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(h.val / 220) * 100}%`,
                    backgroundColor: h.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Consistency + Day-of-Week Velocity */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          {/* Consistency Gauge */}
          <div className="p-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-center flex flex-col items-center justify-center">
            <span className="font-mono text-base font-extrabold text-[var(--accent)]">
              78%
            </span>
            <span className="font-mono text-[8px] text-[var(--text-muted)]">
              Last 30 Days
            </span>
          </div>

          {/* Day of Week Vertical Bars */}
          <div className="p-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex flex-col justify-between">
            <span className="font-mono text-[8px] text-[var(--text-muted)] font-bold text-center">
              Most Consistent
            </span>
            <div className="flex items-end justify-between h-7 px-1 pt-1">
              {daysOfWeekVelocity.map((v, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <div
                    className="w-1.5 bg-[var(--accent)] rounded-t-xs"
                    style={{ height: `${(v.height / 100) * 22}px` }}
                  />
                  <span className="font-mono text-[6px] text-[var(--text-muted)]">
                    {v.day}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Showcase Master Component ────────────────────────────────────────────────
export function StreakShowcase() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollProgress, setScrollProgress] = useState(0)

  const phones = [
    {
      id: 'phone-1',
      title: 'An amount habit',
      tag: 'QUANTITATIVE',
      subtitle: 'Visual steppers, glass capacity grids, and running intake curves.',
      component: <AmountHabitPhone />,
    },
    {
      id: 'phone-2',
      title: 'Minimal style',
      tag: 'GLANCEABLE',
      subtitle: 'High-density habit rows paired with 5-day streak strips for rapid checks.',
      component: <MinimalStylePhone />,
    },
    {
      id: 'phone-3',
      title: 'Flip & Ring clock',
      tag: 'DEEP WORK',
      subtitle: 'Mechanical flip digits and calming ambient rings for single-task flow.',
      component: <FocusClockPhone />,
    },
    {
      id: 'phone-4',
      title: 'Calendar and notes',
      tag: 'REFLECTION',
      subtitle: 'Unified monthly heatmaps paired with structured evening journaling.',
      component: <CalendarNotePhone />,
    },
    {
      id: 'phone-5',
      title: 'Habits compared & Month by month',
      tag: 'METRICS',
      subtitle: 'Donut distribution, ranking velocities, and day-of-week analytics.',
      component: <ConsistencyStatsPhone />,
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

        {/* Carousel Navigation Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleScroll('left')}
            className="w-10 h-10 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)] flex items-center justify-center hover:border-[var(--accent)] active:scale-95 transition-all shadow-xs"
            aria-label="Previous screen"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => handleScroll('right')}
            className="w-10 h-10 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)] flex items-center justify-center hover:border-[var(--accent)] active:scale-95 transition-all shadow-xs"
            aria-label="Next screen"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* 5-Phone Horizontal Container */}
      <div
        ref={containerRef}
        className="flex items-stretch gap-6 overflow-x-auto pb-8 pt-2 no-scrollbar snap-x snap-mandatory px-1"
        style={{ scrollBehavior: 'smooth' }}
      >
        {phones.map((phone, idx) => (
          <div
            key={phone.id}
            className="flex-shrink-0 w-[275px] sm:w-[285px] snap-center flex flex-col"
          >
            {/* Phone Mockup Frame */}
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
                <div className="flex-1 overflow-hidden">{phone.component}</div>

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
                  {phone.tag}
                </span>
                <span className="font-mono text-[9px] text-[var(--text-muted)]">
                  0{idx + 1} / 05
                </span>
              </div>
              <h4 className="font-mono text-sm font-bold text-[var(--text-primary)]">
                {phone.title}
              </h4>
              <p className="font-serif italic text-xs text-[var(--text-muted)] mt-1 leading-snug">
                {phone.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

