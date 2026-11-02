'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'
import {
  Droplet,
  Dumbbell,
  Zap,
  Sunrise,
  Flame,
  Check,
  Signal,
  Wifi,
  Sparkles,
  Calendar,
  Grid,
  CheckSquare,
  BarChart2,
  Plus,
} from 'lucide-react'
import { HabitCardView } from '@/components/habit/HabitCardView'
import { playCompletionChime } from '@/lib/audio'

interface HabitItemState {
  id: string
  variant: 'amount' | 'checkbox' | 'progress'
  title: string
  subtitle: string
  icon: React.ReactNode
  accentColor: string
  completed: boolean
  current: number
  total: number
  unit: string
  targetZ: number
  xOffset: number
  yPos: number
  actionLabel?: string
}

/**
 * Hero3DScene — High-end Layered 3D Pop-Out Scene for 1% Better.
 *
 * Designed to match the editorial reference aesthetic:
 * - Upright sleek iPhone frame tilted slightly in 3D (perspective 1400px, rx 7deg, ry -14deg, rz -2deg)
 * - Rich in-screen app canvas (status bar, Today header, week strip, ambient calm backdrop)
 * - 4 interactive habit cards popping OUT towards the left/viewer over the phone bezel (z: 60-120px)
 * - Realistic directional drop shadows cast onto the phone screen beneath
 * - Full interactive responsiveness (steppers, checkmark toggle, sound chimes, haptics)
 * - Zero flattening CSS properties on any ancestor between cards and .stage
 */
export function Hero3DScene() {
  const reducedMotion = useReducedMotion()
  const stageRef = useRef<HTMLDivElement>(null)

  const [isDesktop, setIsDesktop] = useState(false)
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)
  const [allDoneCelebrated, setAllDoneCelebrated] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Resting 3D angles: subtle, upright, natural tilt towards the left/viewer
  const baseRx = isDesktop ? 7 : 4
  const baseRy = isDesktop ? -14 : -8
  const baseRz = isDesktop ? -2 : -1

  // Mouse tilt spring values (desktop)
  const mouseTiltX = useMotionValue(0)
  const mouseTiltY = useMotionValue(0)
  const springTiltX = useSpring(mouseTiltX, { stiffness: 120, damping: 20 })
  const springTiltY = useSpring(mouseTiltY, { stiffness: 120, damping: 20 })

  // Touch drag tilt spring values (mobile)
  const touchTiltX = useMotionValue(0)
  const touchTiltY = useMotionValue(0)
  const springTouchTiltX = useSpring(touchTiltX, { stiffness: 160, damping: 22 })
  const springTouchTiltY = useSpring(touchTiltY, { stiffness: 160, damping: 22 })

  // Interactive habit states
  const [habits, setHabits] = useState<HabitItemState[]>([
    {
      id: 'water',
      variant: 'amount',
      title: 'Drink Water',
      subtitle: 'Hydration & energy',
      icon: <Droplet size={18} strokeWidth={2.4} />,
      accentColor: '#38BDF8', // Cyan
      completed: false,
      current: 6,
      total: 8,
      unit: 'glasses',
      targetZ: 65,
      xOffset: -255, // pops out to the left over phone rim
      yPos: 155,
    },
    {
      id: 'gym',
      variant: 'checkbox',
      title: 'Gym / Workout',
      subtitle: 'Upper body hypertrophy',
      icon: <Dumbbell size={18} strokeWidth={2.4} />,
      accentColor: '#7AA080', // Sage green
      completed: true,
      current: 1,
      total: 1,
      unit: 'session',
      targetZ: 90,
      xOffset: -248,
      yPos: 242,
    },
    {
      id: 'deepwork',
      variant: 'progress',
      title: 'Deep Work',
      subtitle: 'Focused engineering block',
      icon: <Zap size={18} strokeWidth={2.4} />,
      accentColor: '#F59E0B', // Warm Amber
      completed: false,
      current: 120,
      total: 150,
      unit: 'min',
      targetZ: 115,
      xOffset: -258,
      yPos: 329,
      actionLabel: '+15m',
    },
    {
      id: 'morning',
      variant: 'progress',
      title: 'Morning Routine',
      subtitle: 'Cold wash, journal & plan',
      icon: <Sunrise size={18} strokeWidth={2.4} />,
      accentColor: '#818CF8', // Indigo
      completed: false,
      current: 7,
      total: 9,
      unit: 'steps',
      targetZ: 135,
      xOffset: -252,
      yPos: 416,
      actionLabel: '+1 step',
    },
  ])

  const totalDone = habits.filter((h) => h.completed).length
  const completionPct = Math.round((totalDone / habits.length) * 100)

  useEffect(() => {
    if (totalDone === habits.length && !allDoneCelebrated) {
      setAllDoneCelebrated(true)
      playCompletionChime()
      const timer = setTimeout(() => setAllDoneCelebrated(false), 4000)
      return () => clearTimeout(timer)
    }
  }, [totalDone, habits.length, allDoneCelebrated])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDesktop || reducedMotion) return
      const rect = stageRef.current?.getBoundingClientRect()
      if (!rect) return
      const nx = (e.clientX - rect.left) / rect.width - 0.5
      const ny = (e.clientY - rect.top) / rect.height - 0.5
      mouseTiltX.set(-ny * 10)
      mouseTiltY.set(nx * 14)
    },
    [isDesktop, reducedMotion, mouseTiltX, mouseTiltY]
  )

  const handlePointerLeave = useCallback(() => {
    if (!isDesktop) return
    mouseTiltX.set(0)
    mouseTiltY.set(0)
  }, [isDesktop, mouseTiltX, mouseTiltY])

  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDesktop || reducedMotion) return
    const touch = e.touches[0]
    if (touch) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDesktop || reducedMotion || !touchStartRef.current) return
    const touch = e.touches[0]
    if (!touch) return
    const dx = touch.clientX - touchStartRef.current.x
    const dy = touch.clientY - touchStartRef.current.y
    touchTiltY.set(Math.max(-8, Math.min(8, dx * 0.12)))
    touchTiltX.set(Math.max(-6, Math.min(6, -dy * 0.1)))
  }

  const handleTouchEnd = () => {
    if (isDesktop || reducedMotion) return
    touchStartRef.current = null
    touchTiltX.set(0)
    touchTiltY.set(0)
  }

  const handleToggleHabit = (id: string) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(8)
    }
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h
        const nextDone = !h.completed
        if (nextDone) playCompletionChime()
        return {
          ...h,
          completed: nextDone,
          current: nextDone ? h.total : 0,
        }
      })
    )
  }

  const handleIncrement = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(8)
    }
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h
        let step = 1
        if (h.id === 'deepwork') step = 15
        const nextVal = h.current >= h.total ? 0 : Math.min(h.total, h.current + step)
        const isNowDone = nextVal >= h.total
        if (isNowDone && !h.completed) playCompletionChime()
        return {
          ...h,
          current: nextVal,
          completed: isNowDone,
        }
      })
    )
  }

  const handleDecrement = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(8)
    }
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h
        let step = 1
        if (h.id === 'deepwork') step = 15
        const nextVal = Math.max(0, h.current - step)
        return {
          ...h,
          current: nextVal,
          completed: nextVal >= h.total,
        }
      })
    )
  }

  const daysOfWeek = [
    { label: 'M', num: '26', done: true },
    { label: 'T', num: '27', done: true },
    { label: 'W', num: '28', done: true },
    { label: 'T', num: '29', done: true },
    { label: 'F', num: '30', done: completionPct === 100, active: true },
    { label: 'S', num: '31', done: false },
    { label: 'S', num: '01', done: false },
  ]

  return (
    <div
      ref={stageRef}
      role="region"
      aria-label="Interactive habit demo"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="stage relative select-none"
      style={{
        perspective: '1400px',
        perspectiveOrigin: '50% 45%',
        transformStyle: 'preserve-3d',
        width: '100%',
        maxWidth: 390,
        height: 670,
        margin: '0 auto',
        touchAction: 'pan-y',
      }}
    >
      {/* ── THE 3D RIG ── */}
      <motion.div
        className="rig relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          rotateX: isDesktop ? springTiltX : springTouchTiltX,
          rotateY: isDesktop ? springTiltY : springTouchTiltY,
        }}
        initial={
          reducedMotion
            ? { scale: 1, y: 0, rotateX: baseRx, rotateY: baseRy, rotateZ: baseRz }
            : { scale: 0.95, y: 20, rotateX: baseRx, rotateY: baseRy, rotateZ: baseRz }
        }
        animate={
          reducedMotion
            ? { scale: 1, y: 0, rotateX: baseRx, rotateY: baseRy, rotateZ: baseRz }
            : {
                scale: 1,
                y: 0,
                rotateX: baseRx,
                rotateY: baseRy,
                rotateZ: baseRz,
                transition: {
                  type: 'spring',
                  stiffness: 110,
                  damping: 18,
                  mass: 1,
                },
              }
        }
      >
        {/* ── 1. GROUND SHADOW (z: -50) ── */}
        <div
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'translateX(-50%) translateZ(-50px) rotateX(90deg)',
            left: '50%',
            bottom: -30,
            width: 350,
            height: 100,
            borderRadius: '50%',
            background:
              'radial-gradient(ellipse 65% 50% at 50% 50%, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.2) 45%, transparent 75%)',
            zIndex: 0,
          }}
        />

        {/* ── 2. PHONE CHASSIS (z: 0) ── */}
        <div
          className="absolute left-1/2 rounded-[46px] p-2.5 transition-shadow duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'translateX(-50%) translateZ(0px)',
            width: 320,
            height: 648,
            backgroundColor: '#1E1D1A', // Deep titanium bezel
            boxShadow: allDoneCelebrated
              ? '0 0 0 2px var(--accent), 0 32px 64px -14px rgba(0, 0, 0, 0.7), 0 0 45px rgba(122, 160, 128, 0.45)'
              : '0 28px 60px -15px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.12), inset 0 2px 3px rgba(255, 255, 255, 0.2)',
            zIndex: 10,
          }}
        >
          {/* Screen Container — overflow-hidden clipped INSIDE screen only */}
          <div
            className="relative w-full h-full rounded-[38px] overflow-hidden flex flex-col bg-[var(--surface)] text-[var(--text-primary)] border border-black/30 dark:border-white/10"
            style={{
              backgroundImage:
                'radial-gradient(circle, var(--dot-color) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          >
            {/* Dynamic Island */}
            <div
              aria-hidden="true"
              className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-40 flex items-center justify-between px-2.5 pointer-events-none"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#181818] border border-white/10" />
              <div
                className={`w-2 h-2 rounded-full ${
                  allDoneCelebrated ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500/80'
                }`}
              />
            </div>

            {/* Status Bar */}
            <div
              aria-hidden="true"
              className="pt-3.5 px-6 pb-1 flex items-center justify-between font-mono text-[11px] font-bold select-none z-30 opacity-90"
            >
              <span>9:41</span>
              <div className="flex items-center gap-1.5">
                <Signal size={11} strokeWidth={2.5} />
                <Wifi size={11} strokeWidth={2.5} />
                <div className="w-5 h-2.5 rounded-[3px] border border-current p-[1.5px] flex items-center">
                  <div className="h-full w-3 bg-current rounded-[1px]" />
                </div>
              </div>
            </div>

            {/* In-Phone Header */}
            <div className="px-5 pt-1.5 pb-2 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold text-[var(--accent)]">
                  TODAY’S RITUAL
                </p>
                <h3 className="font-serif italic text-xl font-normal leading-tight text-[var(--text-primary)]">
                  Friday, Oct 30
                </h3>
              </div>
              <div className="text-right">
                <span className="font-mono text-base font-extrabold tracking-tight text-[var(--text-primary)]">
                  {completionPct}%
                </span>
                <p className="font-mono text-[9px] text-[var(--text-muted)] tracking-wider">
                  {totalDone}/4 DONE
                </p>
              </div>
            </div>

            {/* 7-Day Mini Calendar Strip */}
            <div className="px-3.5 py-1.5 border-b border-[var(--border)] bg-[var(--surface-raised)]/60">
              <div className="flex items-center justify-between">
                {daysOfWeek.map((day) => (
                  <div
                    key={day.num}
                    className={`flex flex-col items-center justify-center w-7 py-1 rounded-md text-[10px] font-mono transition-all ${
                      day.active
                        ? 'bg-[var(--accent)] text-white font-bold shadow-xs'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <span className="text-[9px] opacity-80">{day.label}</span>
                    <span className="font-semibold">{day.num}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Filter Pills row */}
            <div className="px-3.5 py-1 flex items-center justify-center gap-1.5 border-b border-[var(--border)]/40 text-[9px] font-mono">
              <span className="px-2 py-0.5 rounded-full text-[var(--text-muted)]">Morning</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--surface-raised)] text-[var(--text-primary)] font-semibold border border-[var(--border)]">
                All Day
              </span>
              <span className="px-2 py-0.5 rounded-full text-[var(--text-muted)]">Evening</span>
            </div>

            {/* In-Screen Habit Canvas (Rich background slots underlying the 3D pop-outs) */}
            <div className="flex-1 px-3.5 pt-2.5 space-y-2.5 relative opacity-35 pointer-events-none">
              {habits.map((h) => (
                <div
                  key={h.id}
                  className="h-[64px] rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/80 px-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs"
                      style={{ backgroundColor: h.accentColor }}
                    >
                      {h.completed ? <Check size={14} strokeWidth={3} /> : '·'}
                    </div>
                    <div>
                      <div className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                        {h.title}
                      </div>
                      <div className="font-mono text-[10px] text-[var(--text-muted)]">
                        {h.subtitle}
                      </div>
                    </div>
                  </div>
                  <div className="w-12 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${h.total > 0 ? (h.current / h.total) * 100 : 0}%`,
                        backgroundColor: h.accentColor,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* In-Phone Bottom Navigation Bar with Center Floating '+' Button */}
            <div
              aria-hidden="true"
              className="relative px-5 py-2.5 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between text-[var(--text-muted)] text-[10px] font-mono"
            >
              <div className="flex flex-col items-center text-[var(--accent)] font-bold">
                <CheckSquare size={14} />
                <span className="mt-0.5">Today</span>
              </div>
              <div className="flex flex-col items-center">
                <Grid size={14} />
                <span className="mt-0.5">Grid</span>
              </div>
              {/* Floating Center '+' Button */}
              <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-md -mt-3 border-2 border-[var(--surface)]">
                <Plus size={16} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col items-center">
                <Calendar size={14} />
                <span className="mt-0.5">Calendar</span>
              </div>
              <div className="flex flex-col items-center">
                <BarChart2 size={14} />
                <span className="mt-0.5">Insights</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. FLOAT CHIP: RING (z: 50, top-right edge) ── */}
        <div
          className="absolute pointer-events-none"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'translateZ(50px)',
            top: 26,
            right: 4,
            zIndex: 50,
          }}
        >
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-xl backdrop-blur-md"
            style={{
              backgroundColor: 'var(--surface-raised)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="relative w-5 h-5 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="12" fill="none" stroke="var(--border)" strokeWidth="3" />
                <circle
                  cx="16"
                  cy="16"
                  r="12"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="3"
                  strokeDasharray="75.4"
                  strokeDashoffset={75.4 - (75.4 * completionPct) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </svg>
            </div>
            <div className="font-mono text-[10px] leading-tight pr-0.5">
              <span className="font-bold text-[var(--accent)]">{completionPct}%</span>
              <span className="text-[9px] text-[var(--text-muted)] ml-1">
                {totalDone}/4
              </span>
            </div>
          </div>
        </div>

        {/* ── 4. FOUR FLOATING 3D POP-OUT CARDS (z: 65, 90, 115, 135) ── */}
        {habits.map((habit) => {
          const isHovered = hoveredCardId === habit.id
          const currentZ = isHovered ? habit.targetZ + 35 : habit.targetZ
          const progressPct =
            habit.total > 0 ? Math.round((habit.current / habit.total) * 100) : 0
          const actualX = isDesktop ? habit.xOffset : -166

          return (
            <div
              key={habit.id}
              className="absolute left-1/2 cursor-pointer"
              onMouseEnter={() => setHoveredCardId(habit.id)}
              onMouseLeave={() => setHoveredCardId(null)}
              style={{
                transformStyle: 'preserve-3d',
                transform: `translateX(${actualX}px) translateZ(${currentZ}px) scale(${isHovered ? 1.025 : 1})`,
                top: habit.yPos,
                width: 312,
                zIndex: habit.targetZ + 30,
                transition: 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <div
                style={{
                  filter: 'drop-shadow(6px 14px 20px rgba(0,0,0,0.52)) drop-shadow(0 2px 5px rgba(0,0,0,0.25))',
                }}
              >
                <HabitCardView
                  variant={habit.variant}
                  title={habit.title}
                  subtitle={habit.subtitle}
                  icon={habit.icon}
                  accentColor={habit.accentColor}
                  completed={habit.completed}
                  progressPct={progressPct}
                  valueDisplay={
                    habit.variant === 'amount'
                      ? `${habit.current}/${habit.total}`
                      : habit.variant === 'progress'
                      ? `${habit.current}/${habit.total} ${habit.unit}`
                      : undefined
                  }
                  currentAmount={habit.current}
                  targetAmount={habit.total}
                  unit={habit.unit}
                  actionLabel={habit.actionLabel}
                  onToggle={() => handleToggleHabit(habit.id)}
                  onIncrement={(e) => handleIncrement(habit.id, e)}
                  onDecrement={(e) => handleDecrement(habit.id, e)}
                  isHovered={isHovered}
                />
              </div>
            </div>
          )
        })}

        {/* ── 5. FLOAT CHIP: STREAK (z: 140, bottom-left edge) ── */}
        <div
          className="absolute pointer-events-none"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'translateZ(140px)',
            bottom: 55,
            left: isDesktop ? -16 : 6,
            zIndex: 140,
          }}
        >
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-2xl backdrop-blur-md"
            style={{
              backgroundColor: 'var(--surface-raised)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <Flame size={14} className="text-amber-500 fill-amber-500 animate-pulse" />
            <span className="font-mono text-[11px] font-bold">12-day streak</span>
          </div>
        </div>

        {/* ── 6. ALL DONE CELEBRATION CHIP (z: 160) ── */}
        {allDoneCelebrated && (
          <motion.div
            className="absolute left-1/2 pointer-events-none"
            style={{
              transformStyle: 'preserve-3d',
              transform: 'translateX(-50%) translateZ(160px)',
              top: 285,
              zIndex: 160,
            }}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1.06 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16 }}
          >
            <div
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border shadow-2xl backdrop-blur-md"
              style={{
                backgroundColor: 'var(--surface-raised)',
                borderColor: 'var(--accent)',
                color: 'var(--accent)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.45), 0 0 25px rgba(122,160,128,0.4)',
              }}
            >
              <Sparkles size={16} className="text-amber-400 fill-amber-400" />
              <span className="font-mono text-xs font-black tracking-wide">
                ★ PERFECT DAY &middot; 100%
              </span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
