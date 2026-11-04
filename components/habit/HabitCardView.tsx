'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Plus, Minus, ChevronDown, Clock, Ban, Play, MoreHorizontal, ArrowRight } from 'lucide-react'
import { renderHabitIcon, getHabitColorVar } from '@/lib/habit-theme'
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet'

export interface HabitCardViewProps {
  habitId?: string
  variant: 'amount' | 'checkbox' | 'checklist' | 'progress'
  title: string
  subtitle?: string | null
  icon?: React.ReactNode | string | null
  accentColor?: string | null
  completed: boolean
  isSkipped?: boolean
  progressPct: number
  valueDisplay?: string
  actionLabel?: string

  // Amount specifics
  currentAmount?: number
  targetAmount?: number | null
  unit?: string | null
  stepValue?: number
  onSetAmount?: (amount: number) => void
  forceTwoRow?: boolean

  // Checklist specifics
  subitems?: Array<{ id: string; name: string; completed: boolean }>
  onToggleSubitem?: (subitemId: string) => void

  // General action handlers
  onToggle?: () => void
  onToggleSkip?: () => void
  onIncrement?: (e: React.MouseEvent) => void
  onDecrement?: (e: React.MouseEvent) => void
  onOpenTimer?: () => void

  // 5-day strip minimal mode
  minimalMode?: boolean
  recentDays?: Array<{ date: string; dayLabel: string; dayNum: string; isToday: boolean }>
  dayCompletions?: Record<string, boolean>
  onToggleDay?: (date: string) => void

  // Presentation overrides
  isHovered?: boolean
  className?: string
  style?: React.CSSProperties
  ariaPressed?: boolean
}

/**
 * HabitCardView — Unified habit card component powering both the 3D Hero and the logged-in Today page.
 *
 * Requirements:
 * - Paper surface, 1px hairline border, radius 16px
 * - 36px tinted icon chip (Lucide icon)
 * - Mono name (weight 600, font-size >= 13px)
 * - Muted sub-label
 * - 3px bottom progress line in habit's chosen colour
 * - Amount card: "6 / 8 glasses", 44px - and + buttons, inline input (font-size 16px) on value tap
 * - Independent depth shadow layer (no box-shadow animation)
 * - No will-change on text for razor-sharp rendering
 */
export function HabitCardView({
  habitId,
  variant,
  title,
  subtitle,
  icon,
  accentColor,
  completed,
  isSkipped = false,
  progressPct,
  valueDisplay,
  actionLabel,
  currentAmount = 0,
  targetAmount,
  unit,
  stepValue = 1,
  onSetAmount,
  forceTwoRow = false,
  subitems = [],
  onToggleSubitem,
  onToggle,
  onToggleSkip,
  onIncrement,
  onDecrement,
  onOpenTimer,
  minimalMode = false,
  recentDays = [],
  dayCompletions = {},
  onToggleDay,
  isHovered = false,
  className = '',
  style = {},
  ariaPressed,
}: HabitCardViewProps) {
  const resolvedColor = getHabitColorVar(accentColor)
  const resolvedIcon = typeof icon === 'string' || !icon ? renderHabitIcon(icon as string) : icon

  // Inline amount editing state
  const [isEditingAmount, setIsEditingAmount] = useState(false)
  const [amountInputVal, setAmountInputVal] = useState(String(currentAmount))
  const [subitemsExpanded, setSubitemsExpanded] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isTimeHabit = Boolean(
    unit && ['min', 'mins', 'minute', 'minutes', 'hours', 'hour', 'hr', 'hrs', 'h', 'm'].includes(unit.toLowerCase().trim())
  )

  useEffect(() => {
    if (!isEditingAmount) {
      setAmountInputVal(String(currentAmount))
    }
  }, [currentAmount, isEditingAmount])

  useEffect(() => {
    if (isEditingAmount) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditingAmount])

  const commitAmountInput = () => {
    setIsEditingAmount(false)
    const parsed = parseFloat(amountInputVal)
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 1_000_000) {
      if (onSetAmount) onSetAmount(parsed)
    } else {
      setAmountInputVal(String(currentAmount))
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if (isSkipped) return
    if (variant === 'checkbox' && onToggle) {
      onToggle()
    } else if (variant === 'checklist') {
      setSubitemsExpanded((prev) => !prev)
    }
  }

  const handleStepIncrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onSetAmount) {
      const next = currentAmount + (stepValue || 1)
      onSetAmount(Math.round(next * 100) / 100)
    } else if (onIncrement) {
      onIncrement(e)
    }
  }

  const handleStepDecrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onSetAmount) {
      const next = Math.max(0, currentAmount - (stepValue || 1))
      onSetAmount(Math.round(next * 100) / 100)
    } else if (onDecrement) {
      onDecrement(e)
    }
  }

  return (
    <div
      onClick={handleCardClick}
      data-habit-id={habitId}
      className={`habit-card group relative text-left select-none outline-none transition-all ${className}`}
      style={{
        width: '100%',
        minHeight: 64,
        borderRadius: 16,
        padding: '13px 16px',
        backgroundColor: 'var(--surface-raised)',
        border: '1px solid var(--border)',
        cursor: isSkipped ? 'default' : 'pointer',
        opacity: isSkipped ? 0.45 : 1,
        ...style,
      }}
    >
      {/* Optical depth shadow layer underneath (no box-shadow animation) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
        style={{
          background:
            'radial-gradient(ellipse 90% 75% at 50% 65%, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 45%, transparent 75%)',
          opacity: isHovered ? 0.75 : 0.38,
          filter: 'blur(6px)',
          zIndex: -1,
        }}
      />

      {/* ── CARD LAYOUT (Two-row grid below 480px / mobile) ── */}
      <div className="w-full min-w-0">
        {/* ROW 1: 36px Icon chip, Name (wraps to 2 lines, never hidden), Right primary controls / More button */}
        <div className="flex items-center justify-between gap-2.5 min-w-0 w-full">
          {/* Left: 36px Tinted Icon + Name & Subtitle */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              aria-hidden="true"
              className="flex items-center justify-center rounded-[10px] flex-shrink-0 transition-transform group-hover:scale-105"
              style={{
                width: 36,
                height: 36,
                backgroundColor: `color-mix(in srgb, ${resolvedColor} 15%, transparent)`,
                color: resolvedColor,
                border: `1px solid color-mix(in srgb, ${resolvedColor} 25%, transparent)`,
              }}
            >
              {resolvedIcon}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {habitId ? (
                  <Link
                    href={`/habits/${habitId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="line-clamp-2 leading-snug hover:underline transition-colors font-mono font-semibold text-[13.5px] break-words"
                    style={{
                      color: completed ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecorationLine: completed ? 'line-through' : 'none',
                      letterSpacing: '-0.015em',
                      margin: 0,
                    }}
                  >
                    {title}
                  </Link>
                ) : (
                  <span
                    className="block line-clamp-2 leading-snug font-mono font-semibold text-[13.5px] break-words"
                    style={{
                      color: completed ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecorationLine: completed ? 'line-through' : 'none',
                      letterSpacing: '-0.015em',
                      margin: 0,
                    }}
                  >
                    {title}
                  </span>
                )}

                {isSkipped && (
                  <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)] font-bold flex-shrink-0">
                    SKIPPED
                  </span>
                )}
              </div>

              {subtitle && (
                <p
                  className="line-clamp-1 font-mono text-[11px] text-[var(--text-muted)] mt-0.5 truncate"
                  style={{ letterSpacing: '0.01em' }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Row 1 Right: Controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* 5-Day Strip (Minimal Mode) */}
            {minimalMode && recentDays.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 pr-1" onClick={(e) => e.stopPropagation()}>
                {recentDays.map((d) => {
                  const dayDone = dayCompletions[d.date] ?? false
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => onToggleDay && onToggleDay(d.date)}
                      title={`${d.dayLabel} ${d.date}: ${dayDone ? 'Completed' : 'Incomplete'}`}
                      className={`w-7 h-7 rounded-md font-mono text-[10px] font-bold transition-all flex items-center justify-center ${
                        dayDone
                          ? 'text-white shadow-xs'
                          : 'bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]'
                      }`}
                      style={{ backgroundColor: dayDone ? resolvedColor : undefined }}
                    >
                      {dayDone ? <Check size={12} strokeWidth={3} /> : d.dayNum}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Checkbox Variant: 44px touch target */}
            {variant === 'checkbox' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggle?.()
                }}
                aria-label={`Toggle ${title}`}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all cursor-pointer select-none active:scale-95"
                style={{
                  backgroundColor: completed ? resolvedColor : 'var(--surface)',
                  border: `1.5px solid ${completed ? resolvedColor : 'var(--border)'}`,
                  color: '#FFFFFF',
                }}
              >
                {completed && <Check size={18} strokeWidth={3} />}
              </button>
            )}

            {/* Checklist Variant: Subitems expansion toggle with 44px touch target */}
            {variant === 'checklist' && subitems.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setSubitemsExpanded((prev) => !prev)
                }}
                aria-expanded={subitemsExpanded}
                aria-label={`Toggle sub-items for ${title}`}
                className="min-h-[44px] px-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center gap-1.5 text-xs font-mono font-bold cursor-pointer transition-all active:scale-95"
              >
                <span className="text-[var(--text-muted)] tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {subitems.filter((s) => s.completed).length}/{subitems.length}
                </span>
                <div
                  className="transition-transform duration-200"
                  style={{ transform: subitemsExpanded ? 'rotate(180deg)' : 'none' }}
                >
                  <ChevronDown size={14} className="text-[var(--text-muted)]" />
                </div>
              </button>
            )}

            {/* Legacy Yes/No Amount Variant */}
            {variant === 'amount' && targetAmount === null && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggle?.()
                }}
                className="min-h-[44px] px-3 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                style={{
                  backgroundColor: completed ? resolvedColor : 'var(--surface)',
                  borderColor: completed ? resolvedColor : 'var(--border)',
                  color: completed ? '#FFFFFF' : 'var(--text-muted)',
                }}
              >
                {completed && <Check size={13} strokeWidth={2.5} />}
                <span>{completed ? 'Done' : 'Pending'}</span>
              </button>
            )}

            {/* Progress / Value Display (e.g. "120/150 min" or actionLabel "+15m") */}
            {(variant === 'progress' || Boolean(valueDisplay)) &&
              variant !== 'amount' &&
              variant !== 'checkbox' &&
              variant !== 'checklist' && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {valueDisplay && (
                    <span className="font-mono text-xs font-bold text-[var(--text-primary)] tabular-nums">
                      {valueDisplay}
                    </span>
                  )}
                  {actionLabel && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onIncrement?.(e)
                      }}
                      className="font-mono text-[10px] font-bold px-2 py-1 rounded-md bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)] hover:bg-[var(--accent)] hover:text-white transition-colors cursor-pointer select-none active:scale-95"
                    >
                      {actionLabel}
                    </button>
                  )}
                </div>
              )}

            {/* Desktop-only: Inline Stepper on large screens (>= 640px) */}
            {variant === 'amount' && targetAmount !== null && !forceTwoRow && (
              <div className="habit-card-stepper-desktop hidden sm:flex items-center gap-2">
                <div
                  className="flex items-center gap-1.5 bg-[var(--surface)] px-1.5 py-1 rounded-xl border border-[var(--border)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={handleStepDecrement}
                    aria-label={`Decrease ${title}`}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center transition-all bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] active:scale-95 cursor-pointer"
                  >
                    <Minus size={15} strokeWidth={2.5} />
                  </button>

                  <div className="px-2 text-center select-text tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {isEditingAmount ? (
                      <input
                        ref={inputRef}
                        type="number"
                        min="0"
                        max="1000000"
                        step={stepValue || 1}
                        value={amountInputVal}
                        onChange={(e) => setAmountInputVal(e.target.value)}
                        onBlur={commitAmountInput}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitAmountInput()
                          if (e.key === 'Escape') {
                            setIsEditingAmount(false)
                            setAmountInputVal(String(currentAmount))
                          }
                        }}
                        className="w-16 text-center font-mono font-bold bg-[var(--surface-raised)] border border-[var(--accent)] rounded px-1.5 py-1 text-[var(--text-primary)] outline-none"
                        style={{ fontSize: 16 }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingAmount(true)}
                        title="Click to type exact number"
                        className="font-mono text-xs font-bold transition-opacity hover:opacity-80 min-w-[44px] min-h-[44px] inline-flex items-center justify-center px-1 tabular-nums cursor-pointer"
                      >
                        <span style={{ color: completed ? resolvedColor : 'var(--text-primary)' }}>
                          {currentAmount}
                        </span>
                        <span className="text-[var(--text-muted)]"> / {targetAmount}</span>
                        {unit && <span className="text-[10px] text-[var(--text-muted)] font-normal ml-1 truncate">{unit}</span>}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleStepIncrement}
                    aria-label={`Increase ${title}`}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center transition-all bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] active:scale-95 cursor-pointer"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                  </button>
                </div>

                {isTimeHabit && (
                  <Link
                    href={habitId ? `/focus?habitId=${habitId}` : '/focus'}
                    onClick={(e) => e.stopPropagation()}
                    title={`Start Focus Timer for ${title}`}
                    aria-label={`Start Focus Timer for ${title}`}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] active:scale-95 shadow-2xs cursor-pointer flex-shrink-0"
                  >
                    <Play size={16} fill="currentColor" />
                  </Link>
                )}
              </div>
            )}

            {/* Desktop Quick Clock Button */}
            {onOpenTimer && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenTimer()
                }}
                title="Start Focus Timer"
                aria-label={`Focus Timer for ${title}`}
                className="hidden sm:flex w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl items-center justify-center border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors cursor-pointer"
              >
                <Clock size={16} />
              </button>
            )}

            {/* Desktop Quick Skip Button */}
            {onToggleSkip && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleSkip()
                }}
                title={isSkipped ? 'Unskip habit' : 'Skip habit for today'}
                aria-label={isSkipped ? `Unskip ${title}` : `Skip ${title} for today`}
                className={`hidden sm:flex w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl items-center justify-center border transition-colors cursor-pointer ${
                  isSkipped
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--surface)]'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--surface)]'
                }`}
              >
                <Ban size={15} />
              </button>
            )}

            {/* "More" Button (...) — Primary 44px Touch Target */}
            {(onToggleSkip || onOpenTimer || habitId) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setMoreMenuOpen(true)
                }}
                aria-label={`More options for ${title}`}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] active:scale-95 transition-all cursor-pointer flex-shrink-0"
              >
                <MoreHorizontal size={18} />
              </button>
            )}
          </div>
        </div>

        {/* ROW 2 (Mobile only or narrow card < 480px): Full-width Stepper [-] value / target unit [+] + Play Button */}
        {variant === 'amount' && targetAmount !== null && (
          <div
            className={
              forceTwoRow
                ? 'mt-2.5 pt-2.5 border-t border-[var(--border)]/70 flex items-center gap-2 w-full min-w-0'
                : 'habit-card-stepper-mobile sm:hidden mt-2.5 pt-2.5 border-t border-[var(--border)]/70 flex items-center gap-2 w-full min-w-0'
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 flex items-center justify-between bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)] min-w-0">
              <button
                type="button"
                onClick={handleStepDecrement}
                aria-label={`Decrease ${title}`}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center transition-all bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] active:scale-95 cursor-pointer flex-shrink-0"
              >
                <Minus size={16} strokeWidth={2.5} />
              </button>

              <div className="px-2 text-center min-w-0 flex-1 truncate select-text tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {isEditingAmount ? (
                  <input
                    ref={inputRef}
                    type="number"
                    min="0"
                    max="1000000"
                    step={stepValue || 1}
                    value={amountInputVal}
                    onChange={(e) => setAmountInputVal(e.target.value)}
                    onBlur={commitAmountInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitAmountInput()
                      if (e.key === 'Escape') {
                        setIsEditingAmount(false)
                        setAmountInputVal(String(currentAmount))
                      }
                    }}
                    className="w-full text-center font-mono font-bold bg-[var(--surface-raised)] border border-[var(--accent)] rounded py-1 px-1 text-[var(--text-primary)] outline-none"
                    style={{ fontSize: 16 }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingAmount(true)}
                    title="Click to type exact number"
                    className="font-mono text-xs font-bold min-h-[44px] w-full inline-flex items-center justify-center gap-1 cursor-pointer truncate tabular-nums"
                  >
                    <span className="tabular-nums" style={{ color: completed ? resolvedColor : 'var(--text-primary)' }}>
                      {currentAmount}
                    </span>
                    <span className="text-[var(--text-muted)] tabular-nums"> / {targetAmount}</span>
                    {unit && (
                      <span className="text-[10px] text-[var(--text-muted)] font-normal ml-0.5 truncate">
                        {unit}
                      </span>
                    )}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleStepIncrement}
                aria-label={`Increase ${title}`}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center transition-all bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] active:scale-95 cursor-pointer flex-shrink-0"
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Play button for time habits on row 2 */}
            {isTimeHabit && (
              <Link
                href={habitId ? `/focus?habitId=${habitId}` : '/focus'}
                onClick={(e) => e.stopPropagation()}
                title={`Start Focus Timer for ${title}`}
                aria-label={`Start Focus Timer for ${title}`}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center flex-shrink-0 bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all active:scale-95 shadow-2xs cursor-pointer"
              >
                <Play size={16} fill="currentColor" />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* "More" Action Bottom Sheet on Phones */}
      <ResponsiveSheet
        isOpen={moreMenuOpen}
        onClose={() => setMoreMenuOpen(false)}
        title={title}
        description={subtitle || 'Habit Actions'}
      >
        <div className="p-4 space-y-2.5 font-mono">
          {onOpenTimer && (
            <button
              type="button"
              onClick={() => {
                setMoreMenuOpen(false)
                onOpenTimer()
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)] hover:border-[var(--accent)] active:scale-98 transition-all min-h-[48px] text-xs font-bold cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-[var(--accent)]" />
                <span>Start Focus Timer</span>
              </div>
              <ArrowRight size={14} className="text-[var(--text-muted)]" />
            </button>
          )}

          {onToggleSkip && (
            <button
              type="button"
              onClick={() => {
                setMoreMenuOpen(false)
                onToggleSkip()
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)] hover:border-[var(--accent)] active:scale-98 transition-all min-h-[48px] text-xs font-bold cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Ban size={16} className={isSkipped ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
                <span>{isSkipped ? 'Unskip habit (make active today)' : 'Skip habit for today'}</span>
              </div>
              <ArrowRight size={14} className="text-[var(--text-muted)]" />
            </button>
          )}

          {habitId && (
            <Link
              href={`/habits/${habitId}`}
              onClick={() => setMoreMenuOpen(false)}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)] hover:border-[var(--accent)] active:scale-98 transition-all min-h-[48px] text-xs font-bold"
            >
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">i</div>
                <span>View Habit History & Details</span>
              </div>
              <ArrowRight size={14} className="text-[var(--text-muted)]" />
            </Link>
          )}
        </div>
      </ResponsiveSheet>

      {/* Subitems Drawer for Checklist habits */}
      <AnimatePresence>
        {variant === 'checklist' && subitemsExpanded && subitems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-[var(--border)] space-y-1.5 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {subitems.map((subitem) => (
              <div
                key={subitem.id}
                onClick={() => onToggleSubitem && onToggleSubitem(subitem.id)}
                className="flex items-center gap-2.5 py-1 px-2 rounded-lg cursor-pointer hover:bg-[var(--surface)] transition-colors text-xs font-mono"
              >
                <div
                  className="w-4 h-4 rounded flex items-center justify-center border transition-colors"
                  style={{
                    backgroundColor: subitem.completed ? resolvedColor : 'transparent',
                    borderColor: subitem.completed ? resolvedColor : 'var(--border)',
                    color: '#FFFFFF',
                  }}
                >
                  {subitem.completed && <Check size={10} strokeWidth={3} />}
                </div>
                <span
                  style={{
                    color: subitem.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                    textDecorationLine: subitem.completed ? 'line-through' : 'none',
                  }}
                >
                  {subitem.name}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3px bottom progress line along bottom in habit accent color */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl overflow-hidden bg-[var(--border)]"
      >
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${Math.min(100, Math.max(0, progressPct))}%`,
            backgroundColor: resolvedColor,
          }}
        />
      </div>
    </div>
  )
}
