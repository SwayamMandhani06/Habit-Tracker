'use client'

import React from 'react'
import { Check, Plus, Minus } from 'lucide-react'

export interface HabitCardViewProps {
  variant: 'amount' | 'checkbox' | 'progress'
  title: string
  subtitle: string
  icon: React.ReactNode
  accentColor: string
  completed: boolean
  progressPct: number
  valueDisplay?: string
  actionLabel?: string
  onToggle?: () => void
  onIncrement?: (e: React.MouseEvent) => void
  onDecrement?: (e: React.MouseEvent) => void
  isHovered?: boolean
  className?: string
  style?: React.CSSProperties
  ariaPressed?: boolean
}

/**
 * HabitCardView — Pure presentation component for floating 3D habit cards.
 * Follows exact design requirements:
 * - Paper surface, 1px hairline border, radius 16px
 * - 36px tinted icon chip (Lucide icon)
 * - Mono name (weight 600, font-size >= 13px)
 * - Muted sub-label
 * - 3px bottom progress bar in habit accent color
 * - Independent shadow layer whose opacity shifts with depth (no box-shadow animations)
 * - Zero will-change on text-bearing elements for razor-sharp rendering
 */
export function HabitCardView({
  variant,
  title,
  subtitle,
  icon,
  accentColor,
  completed,
  progressPct,
  valueDisplay,
  actionLabel,
  onToggle,
  onIncrement,
  onDecrement,
  isHovered = false,
  className = '',
  style = {},
  ariaPressed,
}: HabitCardViewProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === 'checkbox' && onToggle) {
      onToggle()
    } else if ((variant === 'amount' || variant === 'progress') && onIncrement) {
      onIncrement(e)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={ariaPressed ?? completed}
      aria-label={`${title}, ${subtitle}. ${completed ? 'Completed' : 'Not completed'}. Click to advance.`}
      className={`group relative text-left select-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${className}`}
      style={{
        width: '100%',
        maxWidth: 290,
        borderRadius: 16,
        padding: '12px 14px',
        backgroundColor: 'var(--surface-raised)',
        border: '1px solid var(--border)',
        cursor: 'pointer',
        display: 'block',
        ...style,
      }}
    >
      {/* Optical depth shadow layer underneath (opacity shifts with depth/hover, no box-shadow animation) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-2.5 rounded-2xl transition-opacity duration-300"
        style={{
          background: 'radial-gradient(ellipse 90% 75% at 50% 65%, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.18) 45%, transparent 75%)',
          opacity: isHovered ? 0.75 : 0.42,
          zIndex: -1,
        }}
      />

      {/* Main card row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* 36px Tinted Icon Chip */}
          <div
            aria-hidden="true"
            className="flex items-center justify-center rounded-[10px] flex-shrink-0 transition-transform group-hover:scale-105"
            style={{
              width: 36,
              height: 36,
              backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
              color: accentColor,
              border: `1px solid color-mix(in srgb, ${accentColor} 25%, transparent)`,
            }}
          >
            {icon}
          </div>

          {/* Text block */}
          <div className="min-w-0">
            <h4
              className="truncate leading-snug"
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                fontSize: 13.5,
                color: 'var(--text-primary)',
                letterSpacing: '-0.015em',
                margin: 0,
              }}
            >
              {title}
            </h4>
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
          </div>
        </div>

        {/* Right side interaction controls */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          {variant === 'checkbox' && (
            <div
              aria-hidden="true"
              className="w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200"
              style={{
                backgroundColor: completed ? accentColor : 'var(--surface)',
                border: `1.5px solid ${completed ? accentColor : 'var(--border)'}`,
                color: '#FFFFFF',
              }}
            >
              {completed && <Check size={14} strokeWidth={3} />}
            </div>
          )}

          {variant === 'amount' && (
            <div className="flex items-center gap-1">
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  if (onDecrement) onDecrement(e)
                }}
                role="button"
                tabIndex={0}
                aria-label="Decrement amount"
                className="w-5 h-5 rounded flex items-center justify-center border transition-colors hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-raised)' }}
              >
                <Minus size={11} strokeWidth={2.5} />
              </span>

              <span
                className="font-mono text-xs font-bold px-1"
                style={{
                  color: completed ? accentColor : 'var(--text-primary)',
                  minWidth: 32,
                  textAlign: 'center',
                }}
              >
                {valueDisplay ?? ''}
              </span>

              <span
                onClick={(e) => {
                  e.stopPropagation()
                  if (onIncrement) onIncrement(e)
                }}
                role="button"
                tabIndex={0}
                aria-label="Increment amount"
                className="w-5 h-5 rounded flex items-center justify-center border transition-colors hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-raised)' }}
              >
                <Plus size={11} strokeWidth={2.5} />
              </span>
            </div>
          )}

          {variant === 'progress' && (
            <div className="flex items-center gap-1">
              <span
                className="font-mono text-[10.5px] font-bold px-2 py-0.5 rounded-full border transition-all"
                style={{
                  backgroundColor: completed ? accentColor : 'var(--surface)',
                  borderColor: completed ? accentColor : 'var(--border)',
                  color: completed ? '#FFFFFF' : 'var(--text-muted)',
                }}
              >
                {completed ? 'DONE' : (actionLabel ?? valueDisplay ?? '+1')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3px bottom progress line along bottom in habit accent color */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl overflow-hidden bg-[var(--border)]"
      >
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${Math.min(100, Math.max(0, progressPct))}%`,
            backgroundColor: accentColor,
          }}
        />
      </div>
    </button>
  )
}

