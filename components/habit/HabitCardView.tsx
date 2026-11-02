'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Plus, Minus, ChevronDown, Clock, Ban, Play } from 'lucide-react'
import { renderHabitIcon, getHabitColorVar } from '@/lib/habit-theme'

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
  const inputRef = useRef<HTMLInputElement>(null)

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
      role="button"
      tabIndex={0}
      aria-pressed={ariaPressed ?? completed}
      aria-label={`${title}. ${completed ? 'Completed' : 'Not completed'}.`}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (!isEditingAmount && e.target === e.currentTarget) {
            e.preventDefault()
            handleCardClick(e as any)
          }
        }
      }}
      className={`group relative text-left select-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 transition-all ${className}`}
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
        className="pointer-events-none absolute -inset-2 rounded-2xl transition-opacity duration-300"
        style={{
          background:
            'radial-gradient(ellipse 90% 75% at 50% 65%, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 45%, transparent 75%)',
          opacity: isHovered ? 0.75 : 0.38,
          zIndex: -1,
        }}
      />

      {/* Main Row */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: 36px Tinted Icon + Name & Subtitle */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
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
            <div className="flex items-center gap-2">
              {habitId ? (
                <Link
                  href={`/habits/${habitId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="truncate leading-snug hover:underline transition-colors"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    fontSize: 13.5,
                    color: completed ? 'var(--text-muted)' : 'var(--text-primary)',
                    textDecorationLine: completed ? 'line-through' : 'none',
                    letterSpacing: '-0.015em',
                    margin: 0,
                  }}
                >
                  {title}
                </Link>
              ) : (
                <h4
                  className="truncate leading-snug"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    fontSize: 13.5,
                    color: completed ? 'var(--text-muted)' : 'var(--text-primary)',
                    textDecorationLine: completed ? 'line-through' : 'none',
                    letterSpacing: '-0.015em',
                    margin: 0,
                  }}
                >
                  {title}
                </h4>
              )}

              {isSkipped && (
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)] font-bold">
                  SKIPPED
                </span>
              )}
            </div>

            {subtitle && (
              <p
                className="truncate"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.01em',
                  margin: '2px 0 0 0',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right Interaction Controls */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {/* 5-Day Strip (Minimal Mode) */}
          {minimalMode && recentDays.length > 0 && (
            <div className="flex items-center gap-1.5 pr-1" onClick={(e) => e.stopPropagation()}>
              {recentDays.map((d) => {
                const dayDone = dayCompletions[d.date] ?? false
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => onToggleDay && onToggleDay(d.date)}
                    title={`${d.dayLabel} ${d.date}: ${dayDone ? 'Completed' : 'Incomplete'}`}
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md font-mono text-[10px] font-bold transition-all flex items-center justify-center ${
                      dayDone
                        ? 'text-white shadow-xs'
                        : 'bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--accent)]'
                    }`}
                    style={{
                      backgroundColor: dayDone ? resolvedColor : undefined,
                    }}
                  >
                    {dayDone ? <Check size={12} strokeWidth={3} /> : d.dayNum}
                  </button>
                )
              })}
            </div>
          )}

          {/* Amount Steppers: [ - ] "6 / 8 glasses" [ + ] (or legacy yes/no row if targetAmount === null) */}
          {variant === 'amount' && (
            targetAmount === null ? (
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  if (onToggle) onToggle()
                }}
                className="px-2.5 py-1 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                style={{
                  backgroundColor: completed ? resolvedColor : 'var(--surface)',
                  borderColor: completed ? resolvedColor : 'var(--border)',
                  color: completed ? '#FFFFFF' : 'var(--text-muted)',
                }}
                title="Legacy record (Yes/No)"
              >
                {completed ? <Check size={13} strokeWidth={2.5} /> : null}
                <span>{completed ? 'Done' : 'Pending'}</span>
              </div>
            ) : (
              <>
                <div
                  className="flex items-center gap-1.5 bg-[var(--surface)] px-1.5 py-1 rounded-xl border border-[var(--border)]"
                  onClick={(e) => e.stopPropagation()}
                >
                {/* 44px Touch Target Decrement Button */}
                <button
                  type="button"
                  onClick={handleStepDecrement}
                  aria-label={`Decrease ${title}`}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center transition-all bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] active:scale-95"
                >
                  <Minus size={15} strokeWidth={2.5} />
                </button>

                {/* Tappable value display / inline 16px number input */}
                <div className="px-2 text-center select-text">
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
                      style={{ fontSize: 16 }} // 16px strictly avoids iOS viewport zooming
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingAmount(true)}
                      title="Click to type exact number"
                      className="font-mono text-xs font-bold transition-opacity hover:opacity-80 min-w-[44px] min-h-[44px] inline-flex items-center justify-center px-2"
                    >
                      <span
                        style={{
                          color: completed ? resolvedColor : 'var(--text-primary)',
                        }}
                      >
                        {currentAmount}
                      </span>
                      {targetAmount != null && (
                        <span className="text-[var(--text-muted)]">
                          {' '}
                          / {targetAmount}
                        </span>
                      )}
                      {unit && (
                        <span className="text-[10px] text-[var(--text-muted)] font-normal ml-1">
                          {unit}
                        </span>
                      )}
                    </button>
                  )}
                </div>

                {/* 44px Touch Target Increment Button */}
                <button
                  type="button"
                  onClick={handleStepIncrement}
                  aria-label={`Increase ${title}`}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center transition-all bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] active:scale-95"
                >
                  <Plus size={15} strokeWidth={2.5} />
                </button>
              </div>

              {/* Play button for time-based amount habits (min / hours) */}
              {unit && ['min', 'mins', 'minute', 'minutes', 'hours', 'hour', 'hr', 'hrs', 'h', 'm'].includes(unit.toLowerCase().trim()) && (
                <Link
                  href={habitId ? `/focus?habitId=${habitId}` : '/focus'}
                  onClick={(e) => e.stopPropagation()}
                  title={`Start Focus Timer for ${title}`}
                  aria-label={`Start Focus Timer for ${title}`}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-all bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] active:scale-95 shadow-2xs"
                >
                  <Play size={16} fill="currentColor" />
                </Link>
              )}
            </>
          ))}

          {/* Simple Checkbox */}
          {variant === 'checkbox' && (
            <div
              aria-hidden="true"
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200"
              style={{
                backgroundColor: completed ? resolvedColor : 'var(--surface)',
                border: `1.5px solid ${completed ? resolvedColor : 'var(--border)'}`,
                color: '#FFFFFF',
              }}
            >
              {completed && <Check size={16} strokeWidth={3} />}
            </div>
          )}

          {/* Checklist: Subitems Expansion Toggle */}
          {variant === 'checklist' && subitems.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[var(--text-muted)]">
                {subitems.filter((s) => s.completed).length}/{subitems.length}
              </span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] transition-transform"
                style={{ transform: subitemsExpanded ? 'rotate(180deg)' : 'none' }}
              >
                <ChevronDown size={14} />
              </div>
            </div>
          )}

          {/* Progress / Value Display (e.g. "120/150 min" or actionLabel "+15m") */}
          {(variant === 'progress' || Boolean(valueDisplay)) &&
            variant !== 'amount' &&
            variant !== 'checkbox' &&
            variant !== 'checklist' && (
              <div className="flex items-center gap-2">
                {valueDisplay && (
                  <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                    {valueDisplay}
                  </span>
                )}
                {actionLabel && (
                  <span className="font-mono text-[10px] font-bold px-2 py-1 rounded-md bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)]">
                    {actionLabel}
                  </span>
                )}
              </div>
            )}

          {/* Timer button */}
          {onOpenTimer && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpenTimer()
              }}
              title="Start Focus Timer"
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
            >
              <Clock size={13} />
            </button>
          )}

          {/* Skip button */}
          {onToggleSkip && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleSkip()
              }}
              title={isSkipped ? 'Unskip habit' : 'Skip habit for today'}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                isSkipped
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--surface)]'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--surface)]'
              }`}
            >
              <Ban size={13} />
            </button>
          )}
        </div>
      </div>

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
