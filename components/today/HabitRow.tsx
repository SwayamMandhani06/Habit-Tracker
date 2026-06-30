'use client'
// components/today/HabitRow.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import type { HabitWithSubitems } from '@/lib/supabase/types'

interface Props {
  habit: HabitWithSubitems
  isCompleted: boolean
  subitemCompletions: Record<string, boolean>
  onToggle: () => void
  onToggleSubitem: (subitemId: string, allIds: string[]) => void
}

// Quick bounce sequence on check — typed correctly for Framer Motion v12
const BOUNCE_KEYFRAMES = [1, 1.28, 0.95, 1.06, 1] as const
const BOUNCE_TIMES    = [0, 0.3, 0.55, 0.75, 1]  as const

export function HabitRow({ habit, isCompleted, subitemCompletions, onToggle, onToggleSubitem }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [justChecked, setJustChecked] = useState(false)

  const isChecklist = habit.type === 'checklist'
  const allSubitemIds = habit.subitems.map(s => s.id)
  const completedSubitems = habit.subitems.filter(s => subitemCompletions[s.id] === true).length

  const handleToggle = () => {
    if (!isCompleted) {
      setJustChecked(true)
      setTimeout(() => setJustChecked(false), 400)
    }
    onToggle()
  }

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      style={{
        borderRadius: 'var(--radius-lg)',
        border: '1px solid',
        borderColor: isCompleted ? 'var(--accent)' : 'var(--border-default)',
        overflow: 'hidden',
        background: isCompleted ? 'var(--accent-subtle)' : 'var(--bg-surface-1)',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '11px 14px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={isChecklist ? () => setExpanded(e => !e) : handleToggle}
      >
        {/* Checkbox */}
        <motion.button
          onClick={e => { e.stopPropagation(); handleToggle() }}
          className={`habit-checkbox ${isCompleted ? 'checked' : ''}`}
          animate={justChecked
            ? { scale: [...BOUNCE_KEYFRAMES], transition: { duration: 0.32, times: [...BOUNCE_TIMES], ease: 'easeOut' as const } }
            : { scale: 1 }
          }
          aria-label={`Toggle ${habit.name}`}
          style={{ flexShrink: 0 }}
        >
          <AnimatePresence>
            {isCompleted && (
              <motion.div
                initial={{ scale: 0, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              >
                <Check size={12} color="white" strokeWidth={2.5} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Name */}
        <span style={{
          flex: 1,
          fontSize: '0.875rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: 400,
          letterSpacing: '0.01em',
          color: isCompleted ? 'var(--ink-tertiary)' : 'var(--ink-primary)',
          textDecoration: isCompleted ? 'line-through' : 'none',
          textDecorationColor: 'var(--ink-disabled)',
          transition: 'color 0.15s',
        }}>
          {habit.name}
        </span>

        {/* Checklist counter + chevron */}
        {isChecklist && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{
              fontSize: '0.6875rem',
              fontFamily: 'var(--font-mono)',
              color: completedSubitems === habit.subitems.length ? 'var(--accent)' : 'var(--ink-tertiary)',
            }}>
              {completedSubitems}/{habit.subitems.length}
            </span>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.18 }}
              style={{ color: 'var(--ink-tertiary)', display: 'flex' }}
            >
              <ChevronDown size={14} />
            </motion.div>
          </div>
        )}
      </div>

      {/* Sub-items */}
      <AnimatePresence>
        {isChecklist && expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              borderTop: '1px solid var(--border-subtle)',
              padding: '6px 14px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}>
              {habit.subitems.map(subitem => {
                const done = subitemCompletions[subitem.id] ?? false
                return (
                  <div
                    key={subitem.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '7px 4px',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                    }}
                    onClick={() => onToggleSubitem(subitem.id, allSubitemIds)}
                  >
                    <motion.div
                      className={`habit-checkbox ${done ? 'checked' : ''}`}
                      style={{ width: 17, height: 17, flexShrink: 0 }}
                      whileTap={{ scale: 0.88 }}
                    >
                      <AnimatePresence>
                        {done && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                          >
                            <Check size={9} color="white" strokeWidth={2.5} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                    <span style={{
                      fontSize: '0.8125rem',
                      fontFamily: 'var(--font-mono)',
                      color: done ? 'var(--ink-tertiary)' : 'var(--ink-secondary)',
                      textDecoration: done ? 'line-through' : 'none',
                      textDecorationColor: 'var(--ink-disabled)',
                    }}>
                      {subitem.name}
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
