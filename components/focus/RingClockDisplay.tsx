'use client'

import React from 'react'

interface Props {
  remainingSeconds: number
  plannedSeconds: number
  accentColor?: string
}

export function RingClockDisplay({
  remainingSeconds,
  plannedSeconds,
  accentColor = 'var(--accent)',
}: Props) {
  const m = Math.floor(Math.max(0, remainingSeconds) / 60)
  const s = Math.max(0, remainingSeconds) % 60
  const timeFormatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

  const size = 260
  const strokeWidth = 8
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius

  const progress = plannedSeconds > 0 ? (plannedSeconds - remainingSeconds) / plannedSeconds : 0
  const strokeDashoffset = circumference - progress * circumference

  return (
    <div className="relative flex items-center justify-center my-4 select-none">
      <svg
        width={size}
        height={size}
        className="-rotate-90 transform"
        style={{
          filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.12))',
        }}
      >
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Dynamic Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={accentColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          style={{
            transition: 'stroke-dashoffset 0.5s ease-out, stroke 0.3s ease',
          }}
        />
      </svg>

      {/* Centre Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className="font-mono text-5xl sm:text-6xl font-black text-[var(--text-primary)] tracking-tight"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {timeFormatted}
        </span>
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--text-muted)] mt-2 font-bold">
          REMAINING
        </span>
      </div>
    </div>
  )
}

