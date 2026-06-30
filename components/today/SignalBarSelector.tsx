'use client'
// components/today/SignalBarSelector.tsx
// 1-5 signal bar / battery-style selector for mood and energy
import { motion } from 'framer-motion'

interface Props {
  value: number | null
  onChange: (v: number) => void
  color?: string
}

const HEIGHTS = [8, 12, 16, 20, 24] // ascending bar heights

export function SignalBarSelector({ value, onChange, color = 'var(--accent)' }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height: '28px' }}>
      {HEIGHTS.map((h, i) => {
        const level = i + 1
        const active = value !== null && level <= value
        return (
          <motion.button
            key={level}
            onClick={() => onChange(level)}
            whileTap={{ scale: 0.88 }}
            aria-label={`Level ${level}`}
            style={{
              width: 18,
              height: h,
              borderRadius: '2px',
              background: active ? color : 'var(--bg-surface-3)',
              border: active ? 'none' : '1px solid var(--border-default)',
              cursor: 'pointer',
              transition: 'background var(--duration-fast) var(--ease-out)',
              flexShrink: 0,
            }}
          />
        )
      })}
    </div>
  )
}
