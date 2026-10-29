'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  Flame,
  Sparkles,
  Trophy,
  Plus,
  Droplet,
  Zap,
  Dumbbell,
  BookOpen,
  Wifi,
  Signal,
  Sliders,
  Calendar,
  Home,
  BarChart2,
  CheckCircle2,
} from 'lucide-react'
import { playCompletionChime } from '@/lib/audio'

interface HabitState {
  id: string
  title: string
  subtitle: string
  icon: 'water' | 'focus' | 'exercise' | 'read' | 'hygiene'
  category: string
  type: 'stepper' | 'check'
  current: number
  total: number
  unit: string
  accentColor: string
  completed: boolean
}

export function HeroPhoneMockup() {
  const [filter, setFilter] = useState<'all' | 'morning' | 'evening'>('all')
  const [justCelebrated, setJustCelebrated] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const [habits, setHabits] = useState<HabitState[]>([
    {
      id: 'h1',
      title: 'Drink 4L Water',
      subtitle: '6/8 glasses',
      icon: 'water',
      category: 'morning',
      type: 'stepper',
      current: 6,
      total: 8,
      unit: 'glasses',
      accentColor: '#38BDF8', // Cyan
      completed: false,
    },
    {
      id: 'h2',
      title: 'Deep Work Sprint',
      subtitle: '90/90 min',
      icon: 'focus',
      category: 'morning',
      type: 'check',
      current: 90,
      total: 90,
      unit: 'min',
      accentColor: '#7AA080', // Sage green
      completed: true,
    },
    {
      id: 'h3',
      title: 'Morning Exercise',
      subtitle: '0/30 min',
      icon: 'exercise',
      category: 'morning',
      type: 'check',
      current: 0,
      total: 30,
      unit: 'min',
      accentColor: '#F59E0B', // Amber
      completed: false,
    },
    {
      id: 'h4',
      title: 'Brush & Floss',
      subtitle: '1/2',
      icon: 'hygiene',
      category: 'evening',
      type: 'stepper',
      current: 1,
      total: 2,
      unit: 'times',
      accentColor: '#10B981', // Emerald
      completed: false,
    },
    {
      id: 'h5',
      title: 'Read 20 Pages',
      subtitle: '12/20 pages',
      icon: 'read',
      category: 'evening',
      type: 'check',
      current: 12,
      total: 20,
      unit: 'pages',
      accentColor: '#A855F7', // Violet
      completed: false,
    },
  ])

  // Stats calculation
  const totalCompleted = habits.filter((h) => h.completed).length
  const completionPct = Math.round((totalCompleted / habits.length) * 100)

  // Increment stepper habit (cycles back to 0 if max reached for replayability)
  const handleIncrement = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h
        const nextVal = h.current >= h.total ? 0 : h.current + 1
        const isNowDone = nextVal >= h.total
        if (isNowDone && !h.completed) {
          playCompletionChime()
          if (totalCompleted + 1 === habits.length) {
            triggerCelebration()
          }
        }
        return {
          ...h,
          current: nextVal,
          completed: isNowDone,
        }
      })
    )
  }

  // Toggle check habit
  const handleToggle = (id: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h
        const nextDone = !h.completed
        if (nextDone) {
          playCompletionChime()
          if (totalCompleted + 1 === habits.length) {
            triggerCelebration()
          }
        }
        return {
          ...h,
          completed: nextDone,
          current: nextDone ? h.total : 0,
        }
      })
    )
  }

  const triggerCelebration = () => {
    setJustCelebrated(true)
    setTimeout(() => setJustCelebrated(false), 3500)
  }

  // Weekdays strip
  const daysOfWeek = [
    { label: 'M', date: '26', pct: 100, active: false },
    { label: 'T', date: '27', pct: 100, active: false },
    { label: 'W', date: '28', pct: 100, active: false },
    { label: 'T', date: '29', pct: 75, active: false },
    { label: 'F', date: '30', pct: completionPct, active: true },
    { label: 'S', date: '31', pct: 0, active: false },
    { label: 'S', date: '01', pct: 0, active: false },
  ]

  return (
    <div className="relative w-full max-w-[420px] mx-auto select-none flex items-center justify-center py-6">
      {/* Ambient Backdrop Glow */}
      <div
        className="absolute -inset-6 rounded-full opacity-25 blur-3xl pointer-events-none transition-all duration-700"
        style={{
          background:
            completionPct === 100
              ? 'radial-gradient(circle, var(--accent) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(92,107,90,0.4) 0%, transparent 70%)',
        }}
      />

      {/* Floating Trophy Satellite Pill (Top Right) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
        className="hidden sm:flex absolute -top-2 -right-4 z-30 items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-xl backdrop-blur-md"
        style={{
          backgroundColor: 'var(--surface-raised)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
        }}
      >
        <Trophy size={13} className="text-amber-500 fill-amber-500" />
        <span className="font-mono text-[11px] font-bold tracking-tight">Top 1% Consistency</span>
      </motion.div>

      {/* Floating Streak Satellite Pill (Bottom Left) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
        className="hidden sm:flex absolute -bottom-2 -left-4 z-30 items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-xl backdrop-blur-md"
        style={{
          backgroundColor: 'var(--surface-raised)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
        }}
      >
        <Flame size={13} className="text-amber-500 fill-amber-500 animate-pulse" />
        <span className="font-mono text-[11px] font-bold">28-Day Perfect Streak</span>
      </motion.div>

      {/* 3D Tilted iPhone Frame */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        whileHover={
          isDesktop
            ? {
                rotateY: -6,
                rotateX: 3,
                rotateZ: -2,
                y: -8,
                transition: { duration: 0.4 },
              }
            : { y: -4, transition: { duration: 0.3 } }
        }
        className="relative w-[315px] sm:w-[335px] h-[670px] rounded-[48px] p-3 shadow-2xl transition-transform duration-500"
        style={{
          transform: isDesktop
            ? 'perspective(1200px) rotateY(-12deg) rotateX(6deg) rotateZ(-5deg)'
            : 'none',
          backgroundColor: '#1E1D1A', // Deep metallic edge bezel
          boxShadow:
            '0 30px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.12), inset 0 2px 4px rgba(255,255,255,0.18)',
        }}
      >
        {/* Outer Titanium Trim Rim */}
        <div className="relative w-full h-full rounded-[40px] overflow-hidden flex flex-col bg-[var(--surface)] text-[var(--text-primary)] border border-black/20 dark:border-white/10">
          {/* Dynamic Island Cutout */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-40 flex items-center justify-between px-2.5 pointer-events-none">
            <div className="w-2.5 h-2.5 rounded-full bg-[#181818] border border-white/10" />
            <div className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse" />
          </div>

          {/* iOS Status Bar */}
          <div className="pt-3.5 px-6 pb-1.5 flex items-center justify-between font-mono text-[11px] font-bold select-none z-30 opacity-90">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <Signal size={11} strokeWidth={2.5} />
              <Wifi size={11} strokeWidth={2.5} />
              <div className="w-5 h-2.5 rounded-[3px] border border-current p-[1.5px] flex items-center">
                <div className="h-full w-3 bg-current rounded-[1px]" />
              </div>
            </div>
          </div>

          {/* App Header Inside Phone */}
          <div className="px-5 pt-1.5 pb-2 border-b border-[var(--border)] flex items-center justify-between">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold text-[var(--accent)]">
                TODAY’S RITUAL
              </p>
              <h3 className="font-serif italic text-xl font-normal leading-tight">
                Friday, Oct 30
              </h3>
            </div>
            <div className="text-right">
              <span className="font-mono text-base font-extrabold tracking-tight">
                {completionPct}%
              </span>
              <p className="font-mono text-[9px] text-[var(--text-muted)] tracking-wider">
                {totalCompleted}/{habits.length} DONE
              </p>
            </div>
          </div>

          {/* 7-Day Mini Calendar Strip */}
          <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--surface-raised)]/50">
            <div className="flex items-center justify-between">
              {daysOfWeek.map((day, idx) => {
                const isDone = day.pct === 100
                return (
                  <div
                    key={idx}
                    className={`flex flex-col items-center gap-1 px-1.5 py-1 rounded-lg transition-all ${
                      day.active ? 'bg-[var(--accent)] text-white shadow-xs' : 'opacity-80'
                    }`}
                  >
                    <span className="font-mono text-[8px] font-bold">{day.label}</span>
                    <div className="relative w-5 h-5 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 24 24">
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          fill="none"
                          stroke={day.active ? 'rgba(255,255,255,0.25)' : 'var(--border)'}
                          strokeWidth="2.5"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          fill="none"
                          stroke={day.active ? '#FFFFFF' : 'var(--accent)'}
                          strokeWidth="2.5"
                          strokeDasharray="56.5"
                          strokeDashoffset={56.5 - (56.5 * day.pct) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute font-mono text-[8px] font-bold">
                        {day.date}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Time-of-Day Filter Pills */}
          <div className="px-5 py-2 flex items-center gap-1.5">
            {(['all', 'morning', 'evening'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`font-mono text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all capitalize ${
                  filter === t
                    ? 'bg-[var(--accent)] text-white shadow-2xs'
                    : 'bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t === 'all' ? 'All Day' : t}
              </button>
            ))}
          </div>

          {/* Habit Cards Scrollable List */}
          <div className="flex-1 px-4 py-1 space-y-2.5 overflow-y-auto no-scrollbar">
            {habits
              .filter((h) => filter === 'all' || h.category === filter)
              .map((habit) => {
              const isDone = habit.completed
              const progressPct = Math.round((habit.current / habit.total) * 100)

              return (
                <motion.div
                  key={habit.id}
                  onClick={() => habit.type === 'check' && handleToggle(habit.id)}
                  whileTap={{ scale: 0.98 }}
                  className={`group relative p-3 rounded-2xl border transition-all cursor-pointer ${
                    isDone
                      ? 'bg-[var(--surface-raised)] border-[var(--accent)]/40 shadow-xs'
                      : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)]/50'
                  }`}
                >
                  {/* Subtle Colored Progress Background Fill */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-10 pointer-events-none transition-all duration-300"
                    style={{
                      width: `${progressPct}%`,
                      backgroundColor: habit.accentColor,
                    }}
                  />

                  <div className="relative flex items-center justify-between gap-2.5">
                    {/* Left Icon + Title */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-2xs"
                        style={{ backgroundColor: habit.accentColor }}
                      >
                        {habit.icon === 'water' && <Droplet size={14} className="fill-current" />}
                        {habit.icon === 'focus' && <Zap size={14} className="fill-current" />}
                        {habit.icon === 'exercise' && <Dumbbell size={14} />}
                        {habit.icon === 'read' && <BookOpen size={14} />}
                        {habit.icon === 'hygiene' && <Sparkles size={14} />}
                      </div>

                      <div className="min-w-0">
                        <p
                          className={`font-mono text-xs font-bold truncate transition-colors ${
                            isDone ? 'line-through text-[var(--text-muted)]' : ''
                          }`}
                        >
                          {habit.title}
                        </p>
                        <p className="font-mono text-[9px] text-[var(--text-muted)] truncate">
                          {habit.type === 'stepper'
                            ? `${habit.current} / ${habit.total} ${habit.unit}`
                            : habit.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Right Action / Control */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {habit.type === 'stepper' ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[10px] font-bold text-[var(--accent)]">
                            {habit.current}/{habit.total}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleIncrement(habit.id, e)}
                            className="w-6 h-6 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center shadow-xs active:scale-90 hover:opacity-90 transition-all"
                            title="Add glass"
                          >
                            <Plus size={12} strokeWidth={3} />
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                            isDone
                              ? 'bg-[var(--accent)] text-white'
                              : 'border-2 border-[var(--border)] group-hover:border-[var(--accent)]'
                          }`}
                        >
                          {isDone && <Check size={13} strokeWidth={3} />}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Micro Progress Bar */}
                  <div className="relative mt-2 w-full h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${progressPct}%`,
                        backgroundColor: habit.accentColor,
                      }}
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Celebration Banner when 100% achieved */}
          <AnimatePresence>
            {justCelebrated && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute inset-x-3 bottom-14 z-50 p-3 rounded-2xl bg-[var(--surface-raised)] border border-[var(--accent)] shadow-2xl flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500 animate-spin" />
                  <span className="font-mono text-xs font-bold text-[var(--accent)]">
                    100% Day Perfect!
                  </span>
                </div>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--accent)] text-white">
                  +1 STREAK
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phone Bottom Navigation Bar */}
          <div className="relative px-6 py-2 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between text-[var(--text-muted)]">
            <Home size={17} className="text-[var(--accent)]" />
            <Calendar size={17} />

            {/* Central Floating Action Plus Button */}
            <div className="relative -top-3 w-10 h-10 rounded-full bg-[var(--accent)] text-white shadow-lg flex items-center justify-center border-2 border-[var(--surface)] hover:scale-105 active:scale-95 transition-transform cursor-pointer">
              <Plus size={18} strokeWidth={2.5} />
            </div>

            <BarChart2 size={17} />
            <Sliders size={17} />
          </div>

          {/* iOS Bottom Home Bar Indicator */}
          <div className="w-full pb-2 pt-1 flex justify-center pointer-events-none">
            <div className="w-28 h-1 rounded-full bg-current opacity-25" />
          </div>
        </div>
      </motion.div>
    </div>
  )
}

