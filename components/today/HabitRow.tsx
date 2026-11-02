'use client'
// components/today/HabitRow.tsx — Habit row with spring checkbox pop, long-press/right-click skip menu
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check, Minus, Plus, Clock } from 'lucide-react'
import type { HabitWithSubitems } from '@/lib/supabase/types'

interface Props {
  habit: HabitWithSubitems
  isCompleted: boolean
  isSkipped?: boolean
  subitemCompletions: Record<string, boolean>
  onToggle: () => void
  onToggleSkip?: () => void
  onToggleSubitem: (subitemId: string, allIds: string[]) => void
  onOpenTimer?: (habit: HabitWithSubitems) => void
  minimalMode?: boolean
  recentDays?: Array<{ date: string; dayLabel: string; dayNum: string; isToday: boolean }>
  dayCompletions?: Record<string, boolean>
  onToggleDay?: (date: string) => void
}

export function HabitRow({
  habit,
  isCompleted,
  isSkipped = false,
  subitemCompletions,
  onToggle,
  onToggleSkip,
  onToggleSubitem,
  onOpenTimer,
  minimalMode = false,
  recentDays = [],
  dayCompletions = {},
  onToggleDay,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [justChecked, setJustChecked] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null)

  const isChecklist = habit.type === 'checklist'
  const allSubitemIds = habit.subitems.map((s) => s.id)
  const completedSubitems = habit.subitems.filter((s) => subitemCompletions[s.id] === true).length

  const handleToggle = () => {
    if (!isCompleted && !isSkipped) {
      setJustChecked(true)
      setTimeout(() => setJustChecked(false), 350)
    }
    onToggle()
  }

  // Handle right-click (desktop)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowMenu(true)
  }

  // Handle long-press (mobile touch)
  const handleTouchStart = () => {
    touchTimerRef.current = setTimeout(() => {
      setShowMenu(true)
    }, 500)
  }

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current)
    }
  }

  return (
    <div className="relative">
      <motion.div
        whileHover={{ y: -1 }}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          borderRadius: 'var(--radius-lg)',
          border: '1px solid',
          borderColor: isCompleted
            ? 'var(--accent)'
            : isSkipped
            ? 'rgba(0,0,0,0.15)'
            : 'var(--border)',
          overflow: 'hidden',
          backgroundColor: isCompleted
            ? 'rgba(92, 107, 90, 0.08)'
            : isSkipped
            ? 'var(--surface-raised)'
            : 'var(--surface)',
          opacity: isSkipped ? 0.75 : 1,
          transition: 'border-color 0.15s ease, background-color 0.15s ease, opacity 0.15s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '13px 16px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onClick={isChecklist ? () => setExpanded((e) => !e) : handleToggle}
        >
          {/* Checkbox with scale pop (0.85 → 1.1 → 1) with 44x44px accessible touch target */}
          <div
            onClick={(e) => {
              e.stopPropagation()
              handleToggle()
            }}
            style={{
              width: 44,
              height: 44,
              minWidth: 44,
              minHeight: 44,
              margin: '-12px -10px -12px -12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <motion.button
              type="button"
              className={`habit-checkbox ${isCompleted ? 'checked' : ''}`}
              animate={
                justChecked
                  ? { scale: [0.85, 1.1, 1], transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }
                  : { scale: 1 }
              }
              aria-label={`Toggle ${habit.name}`}
              style={{
                width: 20,
                height: 20,
                borderRadius: 'var(--radius-sm)',
                border: `1.5px solid ${
                  isCompleted
                    ? 'var(--accent)'
                    : isSkipped
                    ? 'var(--text-muted)'
                    : 'var(--border)'
                }`,
                backgroundColor: isCompleted
                  ? 'var(--accent)'
                  : isSkipped
                  ? 'var(--surface-raised)'
                  : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <AnimatePresence>
                {isCompleted && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                  >
                    <Check size={13} color="#FFFFFF" strokeWidth={2.5} />
                  </motion.div>
                )}
                {isSkipped && !isCompleted && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Minus size={13} color="var(--text-muted)" strokeWidth={2.5} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {/* Habit Name */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
            <Link
              href={`/habits/${habit.id}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:underline hover:text-[var(--accent)] transition-colors"
              style={{
                fontSize: '0.95rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
                letterSpacing: '0.01em',
                color: isCompleted || isSkipped ? 'var(--text-muted)' : 'var(--text-primary)',
                textDecorationLine: isCompleted || isSkipped ? 'line-through' : 'none',
                textDecorationColor: 'var(--border)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {habit.name}
            </Link>

            {isSkipped && (
              <span
                style={{
                  fontSize: '0.62rem',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  padding: '1px 5px',
                  backgroundColor: 'var(--surface-raised)',
                  flexShrink: 0,
                }}
              >
                [ Rest Day ]
              </span>
            )}
            {/* Focus Timer Button */}
            {onOpenTimer && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenTimer(habit)
                }}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-raised)] transition-all flex-shrink-0"
                title="Start Focus Timer for this habit"
              >
                <Clock size={13} />
              </button>
            )}

            {/* Minimal 5-Day Pill Strip */}
            {minimalMode && recentDays.length > 0 && (
              <div
                className="flex items-center gap-1.5 flex-shrink-0 ml-1"
                onClick={(e) => e.stopPropagation()}
              >
                {recentDays.map((d) => {
                  const isDone = d.isToday ? isCompleted : dayCompletions[d.date] === true
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => onToggleDay?.(d.date)}
                      className={`w-6 sm:w-7 h-7 rounded-md flex items-center justify-center font-mono text-[9px] font-bold transition-all cursor-pointer ${
                        isDone
                          ? 'bg-[var(--accent)] text-white shadow-2xs'
                          : 'bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--accent)]'
                      } ${d.isToday ? 'ring-1.5 ring-[var(--accent)] ring-offset-1' : ''}`}
                      title={`${d.dayLabel} (${d.date}): ${isDone ? 'Completed' : 'Incomplete'}`}
                    >
                      {isDone ? <Check size={10} strokeWidth={3} /> : d.dayNum}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Checklist Counter, Steppers & Chevron */}
          {isChecklist && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {/* Stepper buttons like Streak amount habits */}
              <div
                className="flex items-center gap-1 bg-[var(--surface-raised)] border border-[var(--border)] rounded-full px-1.5 py-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const allSubIds = habit.subitems.map((s) => s.id)
                    const lastCompleted = [...habit.subitems].reverse().find((s) => subitemCompletions[s.id])
                    if (lastCompleted) onToggleSubitem(lastCompleted.id, allSubIds)
                  }}
                  disabled={completedSubitems === 0}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Step down"
                >
                  <Minus size={10} />
                </button>

                <span
                  style={{
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    color: completedSubitems === habit.subitems.length ? 'var(--accent)' : 'var(--text-muted)',
                    fontWeight: 600,
                    padding: '0 2px',
                  }}
                >
                  {completedSubitems}/{habit.subitems.length}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const allSubIds = habit.subitems.map((s) => s.id)
                    const nextIncomplete = habit.subitems.find((s) => !subitemCompletions[s.id])
                    if (nextIncomplete) onToggleSubitem(nextIncomplete.id, allSubIds)
                  }}
                  disabled={completedSubitems === habit.subitems.length}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[var(--accent)] hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold"
                  title="Step up"
                >
                  <Plus size={10} strokeWidth={2.5} />
                </button>
              </div>

              <motion.div
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                style={{ color: 'var(--text-muted)', display: 'flex' }}
              >
                <ChevronDown size={14} />
              </motion.div>
            </div>
          )}
        </div>

        {/* Checklist subitems */}
        <AnimatePresence initial={false}>
          {isChecklist && expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div
                style={{
                  borderTop: '1px solid var(--border)',
                  padding: '8px 16px 12px 50px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {habit.subitems.map((sub) => {
                  const done = subitemCompletions[sub.id] === true
                  return (
                    <div
                      key={sub.id}
                      onClick={() => onToggleSubitem(sub.id, allSubitemIds)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <button
                        className={`habit-checkbox ${done ? 'checked' : ''}`}
                        aria-label={`Toggle ${sub.name}`}
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 'var(--radius-xs)',
                          border: `1.5px solid ${done ? 'var(--accent)' : 'var(--border)'}`,
                          backgroundColor: done ? 'var(--accent)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          padding: 0,
                          flexShrink: 0,
                        }}
                      >
                        {done && <Check size={10} color="#FFFFFF" strokeWidth={2.5} />}
                      </button>
                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontFamily: 'var(--font-mono)',
                          color: done ? 'var(--text-muted)' : 'var(--text-primary)',
                          textDecorationLine: done ? 'line-through' : 'none',
                          textDecorationColor: 'var(--border)',
                        }}
                      >
                        {sub.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Context Menu (Desktop Right-Click & Mobile Long-Press) */}
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-30"
              onClick={() => setShowMenu(false)}
            />
            {/* Menu Popover */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-6 top-10 z-40 bg-[var(--surface-raised)] border border-[var(--border)] rounded shadow-lg py-1 min-w-[170px] font-mono text-xs"
            >
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false)
                  if (!isCompleted) handleToggle()
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[var(--surface)] text-[var(--text-primary)] transition-colors flex items-center justify-between"
              >
                <span>Mark Complete</span>
                {isCompleted && <Check size={12} className="text-[var(--accent)]" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false)
                  if (onToggleSkip) onToggleSkip()
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[var(--surface)] text-[var(--text-primary)] transition-colors flex items-center justify-between"
              >
                <span>{isSkipped ? 'Unskip (Clear Rest)' : 'Skip Today (Rest Day)'}</span>
                {isSkipped && <Minus size={12} className="text-[var(--text-muted)]" />}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
