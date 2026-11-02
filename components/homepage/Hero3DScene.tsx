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
 * Hero3DScene — Layered 3D Pop-Out Scene for the 1% Better Homepage Hero.
 *
 * Architecture strictly adheres to 3D CSS preservation specifications:
 * - .stage: perspective 1800px; perspective-origin: 55% 40%; transform-style: preserve-3d;
 * - .rig: transform-style: preserve-3d; opacity: 1; rotateX/Y/Z driven by springs;
 * - <GroundShadow />: z -60, radial-gradient ellipse, no filter
 * - <PhoneFrame />: z 0, titanium bezel, screen content clipped INSIDE only
 * - <FloatChip kind="ring" />: z 40, circular progress ring + "n of 4 done"
 * - <HabitCardView /> x4: z 70, 90, 100, 130 as SIBLINGS of PhoneFrame
 * - <FloatChip kind="streak" />: z 160, flame icon + "12-day streak"
 * - All ancestors between card and .stage have transform-style: preserve-3d and zero flattening properties.
 */
export function Hero3DScene() {
  const reducedMotion = useReducedMotion()
  const stageRef = useRef<HTMLDivElement>(null)

  const [isDesktop, setIsDesktop] = useState(false)
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)
  const [allDoneCelebrated, setAllDoneCelebrated] = useState(false)
  const [hasSettled, setHasSettled] = useState(false)

  // Track media query for desktop vs touch/mobile
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Resting angles
  // Desktop: rx: 14deg, ry: -26deg, rz: 6deg
  // Mobile: reduced by 40% -> rx: 8.4deg, ry: -15.6deg, rz: 3.6deg
  const baseRx = isDesktop ? 14 : 8.4
  const baseRy = isDesktop ? -26 : -15.6
  const baseRz = isDesktop ? 6 : 3.6

  // Mouse tilt motion values (desktop pointer devices)
  const mouseTiltX = useMotionValue(0)
  const mouseTiltY = useMotionValue(0)
  const springTiltX = useSpring(mouseTiltX, { stiffness: 140, damping: 22 })
  const springTiltY = useSpring(mouseTiltY, { stiffness: 140, damping: 22 })

  // Touch drag tilt motion values
  const touchTiltX = useMotionValue(0)
  const touchTiltY = useMotionValue(0)
  const springTouchTiltX = useSpring(touchTiltX, { stiffness: 180, damping: 24 })
  const springTouchTiltY = useSpring(touchTiltY, { stiffness: 180, damping: 24 })

  // Interactive habit states
  const [habits, setHabits] = useState<HabitItemState[]>([
    {
      id: 'water',
      variant: 'amount',
      title: 'Drink 4L Water',
      subtitle: 'Hydration & alertness',
      icon: <Droplet size={18} strokeWidth={2.4} />,
      accentColor: '#38BDF8', // Cyan
      completed: false,
      current: 6,
      total: 8,
      unit: 'glasses',
      targetZ: 70,
      xOffset: -18,
      yPos: 165,
    },
    {
      id: 'gym',
      variant: 'checkbox',
      title: 'Gym / Workout',
      subtitle: 'Upper body hypertrophy',
      icon: <Dumbbell size={18} strokeWidth={2.4} />,
      accentColor: '#7AA080', // Sage green
      completed: true, // starts checked
      current: 1,
      total: 1,
      unit: 'session',
      targetZ: 90,
      xOffset: 34,
      yPos: 255,
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
      targetZ: 100,
      xOffset: -6,
      yPos: 345,
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
      targetZ: 130,
      xOffset: 48,
      yPos: 435,
      actionLabel: '+1 step',
    },
  ])

  const totalDone = habits.filter((h) => h.completed).length
  const completionPct = Math.round((totalDone / habits.length) * 100)

  // Trigger celebration when all 4 habits are completed
  useEffect(() => {
    if (totalDone === habits.length && !allDoneCelebrated) {
      setAllDoneCelebrated(true)
      playCompletionChime()
      const timer = setTimeout(() => {
        setAllDoneCelebrated(false)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [totalDone, habits.length, allDoneCelebrated])

  // Mark load animation settled
  useEffect(() => {
    const timer = setTimeout(() => setHasSettled(true), 1200)
    return () => clearTimeout(timer)
  }, [])

  // Pointer move handler over stage (desktop)
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDesktop || reducedMotion) return
      const rect = stageRef.current?.getBoundingClientRect()
      if (!rect) return
      const nx = (e.clientX - rect.left) / rect.width - 0.5
      const ny = (e.clientY - rect.top) / rect.height - 0.5
      mouseTiltX.set(-ny * 12) // max 6deg X
      mouseTiltY.set(nx * 16) // max 8deg Y
    },
    [isDesktop, reducedMotion, mouseTiltX, mouseTiltY]
  )

  const handlePointerLeave = useCallback(() => {
    if (!isDesktop) return
    mouseTiltX.set(0)
    mouseTiltY.set(0)
  }, [isDesktop, mouseTiltX, mouseTiltY])

  // Touch drag-to-tilt handlers (mobile)
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
    // Clamp subtle tilt
    touchTiltY.set(Math.max(-10, Math.min(10, dx * 0.15)))
    touchTiltX.set(Math.max(-8, Math.min(8, -dy * 0.12)))
  }

  const handleTouchEnd = () => {
    if (isDesktop || reducedMotion) return
    touchStartRef.current = null
    touchTiltX.set(0)
    touchTiltY.set(0)
  }

  // Card interaction handlers
  const handleToggleHabit = (id: string) => {
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

  // Days of week strip
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
        perspective: '1800px',
        perspectiveOrigin: '55% 40%',
        transformStyle: 'preserve-3d',
        width: '100%',
        maxWidth: 380,
        height: 680,
        margin: '0 auto',
        touchAction: 'pan-y',
      }}
    >
      {/* ── THE RIG ── */}
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
            : { scale: 0.94, y: 24, rotateX: baseRx, rotateY: baseRy, rotateZ: baseRz }
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
        {/* ── 1. GROUND SHADOW (z: -60, radial-gradient ellipse, no filter) ── */}
        <div
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'translateX(-50%) translateZ(-60px) rotateX(90deg)',
            left: '50%',
            bottom: -35,
            width: 360,
            height: 110,
            borderRadius: '50%',
            background:
              'radial-gradient(ellipse 65% 50% at 50% 50%, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.22) 42%, transparent 74%)',
            zIndex: 0,
          }}
        />

        {/* ── 2. PHONE FRAME (z: 0; screen content clipped INSIDE only) ── */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-[46px] p-2.5 transition-shadow duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'translateX(-50%) translateZ(0px)',
            width: 320,
            height: 648,
            backgroundColor: '#1E1D1A', // Deep titanium bezel
            boxShadow: allDoneCelebrated
              ? '0 0 0 2px var(--accent), 0 35px 70px -15px rgba(0, 0, 0, 0.7), 0 0 45px rgba(122, 160, 128, 0.45)'
              : '0 28px 60px -15px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.12), inset 0 2px 3px rgba(255, 255, 255, 0.2)',
            zIndex: 10,
          }}
        >
          {/* Screen Container — overflow-hidden is clipped INSIDE this element only */}
          <div
            className="relative w-full h-full rounded-[38px] overflow-hidden flex flex-col bg-[var(--surface)] text-[var(--text-primary)] border border-black/30 dark:border-white/10"
            style={{
              backgroundImage:
                'radial-gradient(circle, var(--dot-color) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          >
            {/* Dynamic Island Cutout */}
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

            {/* iOS Status Bar */}
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

            {/* Phone Screen Canvas: Background guides where floating cards pop out */}
            <div className="flex-1 px-4 pt-3 space-y-3 relative opacity-20 pointer-events-none">
              <div className="h-[68px] rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-raised)]" />
              <div className="h-[68px] rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-raised)]" />
              <div className="h-[68px] rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-raised)]" />
              <div className="h-[68px] rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-raised)]" />
            </div>

            {/* In-Phone Bottom Navigation Bar */}
            <div
              aria-hidden="true"
              className="px-6 py-2 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between text-[var(--text-muted)] text-[10px] font-mono"
            >
              <div className="flex flex-col items-center text-[var(--accent)] font-bold">
                <CheckSquare size={14} />
                <span className="mt-0.5">Today</span>
              </div>
              <div className="flex flex-col items-center">
                <Grid size={14} />
                <span className="mt-0.5">Grid</span>
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

        {/* ── 3. FLOAT CHIP: RING (z: 40, overlaps phone's top-right edge) ── */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'translateZ(40px)',
            top: 36,
            right: 0,
            zIndex: 40,
          }}
          initial={reducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border shadow-xl"
            style={{
              backgroundColor: 'var(--surface-raised)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            {/* Circular SVG Ring */}
            <div className="relative w-6 h-6 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
                <circle
                  cx="16"
                  cy="16"
                  r="12"
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="3"
                />
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
            <div className="font-mono text-[11px] leading-tight pr-1">
              <span className="font-bold block text-[var(--accent)]">{completionPct}%</span>
              <span className="text-[9.5px] text-[var(--text-muted)]">
                {totalDone} of 4 done
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── 4. FOUR FLOATING HABIT CARDS (z: 70, 90, 100, 130) ── */}
        {habits.map((habit, index) => {
          const isHovered = hoveredCardId === habit.id
          const currentZ = isHovered ? habit.targetZ + 40 : habit.targetZ
          const progressPct =
            habit.total > 0 ? Math.round((habit.current / habit.total) * 100) : 0

          return (
            <motion.div
              key={habit.id}
              className="absolute left-1/2"
              onMouseEnter={() => setHoveredCardId(habit.id)}
              onMouseLeave={() => setHoveredCardId(null)}
              style={{
                transformStyle: 'preserve-3d',
                transform: `translateX(calc(-50% + ${habit.xOffset}px)) translateZ(${currentZ}px)`,
                top: habit.yPos,
                width: 290,
                zIndex: habit.targetZ,
                transition: 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
              initial={
                reducedMotion
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 16 }
              }
              animate={{
                opacity: 1,
                y: 0,
                scale: isHovered ? 1.03 : 1,
                transition: {
                  delay: reducedMotion ? 0 : 0.2 + index * 0.12,
                  type: 'spring',
                  stiffness: 140,
                  damping: 18,
                },
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
                actionLabel={habit.actionLabel}
                onToggle={() => handleToggleHabit(habit.id)}
                onIncrement={(e) => handleIncrement(habit.id, e)}
                onDecrement={(e) => handleDecrement(habit.id, e)}
                isHovered={isHovered}
              />
            </motion.div>
          )
        })}

        {/* ── 5. FLOAT CHIP: STREAK (z: 160, flame icon + "12-day streak") ── */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'translateZ(160px)',
            bottom: 70,
            left: -12,
            zIndex: 160,
          }}
          initial={reducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.65, duration: 0.4 }}
        >
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-2xl"
            style={{
              backgroundColor: 'var(--surface-raised)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <Flame size={14} className="text-amber-500 fill-amber-500 animate-pulse" />
            <span className="font-mono text-[11px] font-bold">12-day streak</span>
          </div>
        </motion.div>

        {/* ── 6. ALL DONE CELEBRATION CHIP (z: 160, rises in when 4/4 habits done) ── */}
        {allDoneCelebrated && (
          <motion.div
            className="absolute left-1/2 pointer-events-none"
            style={{
              transformStyle: 'preserve-3d',
              transform: 'translateX(-50%) translateZ(160px)',
              top: 290,
              zIndex: 160,
            }}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1.08 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16 }}
          >
            <div
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border shadow-2xl backdrop-blur-sm"
              style={{
                backgroundColor: 'var(--surface-raised)',
                borderColor: 'var(--accent)',
                color: 'var(--accent)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 25px rgba(122,160,128,0.4)',
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

