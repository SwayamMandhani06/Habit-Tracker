'use client'
// components/today/SignalBarSelector.tsx
// 1-5 signal bar / battery-style selector for mood and energy
import { motion } from 'framer-motion'

interface Props {
  value: number | null
  onChange: (v: number) => void
  color?: string
  disabled?: boolean
  label?: string
}

const HEIGHTS = [8, 12, 16, 20, 24] // ascending bar heights

export function SignalBarSelector({
  value,
  onChange,
  color = 'var(--accent)',
  disabled = false,
  label,
}: Props) {
  return (
    <div
      role="radiogroup"
      aria-label={label ?? 'Level selector (1 to 5)'}
      style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '44px' }}
    >
      {HEIGHTS.map((h, i) => {
        const level = i + 1
        const active = value !== null && level <= value
        const isSelected = value === level
        return (
          <motion.button
            key={level}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => !disabled && onChange(level)}
            whileTap={disabled ? undefined : { scale: 0.88 }}
            aria-label={`${label ? `${label}: ` : ''}Level ${level} of 5`}
            style={{
              width: 28,
              minWidth: 28,
              height: 44,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: 4,
              background: 'transparent',
              border: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 18,
                height: h,
                borderRadius: '2px',
                background: active ? color : 'var(--surface-raised)',
                border: active ? 'none' : '1px solid var(--border)',
                transition: 'background 0.15s ease',
              }}
            />
          </motion.button>
        )
      })}
    </div>
  )
}
