'use client'

import React, { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatTimerDigits } from '@/lib/focus/timer-math'

interface Props {
  totalSeconds: number
}

interface SingleDigitProps {
  digit: string
  label: string
}

const SingleDigit = memo(function SingleDigit({ digit, label }: SingleDigitProps) {
  return (
    <div
      className="flex flex-col items-center"
      style={{
        perspective: 800,
      }}
    >
      <div
        className="relative w-14 sm:w-20 md:w-24 h-20 sm:h-28 md:h-32 rounded-xl text-[#F7F5F2] shadow-xl select-none"
        style={{
          backgroundColor: '#1E1C19',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 16px 32px -8px rgba(0, 0, 0, 0.45)',
          transformStyle: 'preserve-3d',
        }}
        aria-label={`${label} digit ${digit}`}
      >
        {/* Top Half (static current/next) */}
        <div
          className="absolute inset-x-0 top-0 h-1/2 overflow-hidden rounded-t-xl bg-[#25221E] border-b border-black/40 flex items-end justify-center"
          style={{
            lineHeight: 1,
          }}
        >
          <span
            className="font-mono font-black text-3xl sm:text-5xl md:text-6xl text-[#F7F5F2]"
            style={{
              transform: 'translateY(50%)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {digit}
          </span>
        </div>

        {/* Bottom Half (static current) */}
        <div
          className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden rounded-b-xl bg-[#1C1A17] flex items-start justify-center"
          style={{
            lineHeight: 1,
          }}
        >
          <span
            className="font-mono font-black text-3xl sm:text-5xl md:text-6xl text-[#E8E6E3]"
            style={{
              transform: 'translateY(-50%)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {digit}
          </span>
        </div>

        {/* Animated Folding Flap (3D top-down fold) */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={digit}
            initial={{ rotateX: 0 }}
            animate={{ rotateX: -180 }}
            transition={{ duration: 0.35, ease: [0.45, 0.05, 0.55, 0.95] }}
            className="absolute inset-x-0 top-0 h-1/2 overflow-hidden rounded-t-xl bg-[#282521] border-b border-black/50 flex items-end justify-center origin-bottom pointer-events-none"
            style={{
              backfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d',
            }}
          >
            <span
              className="font-mono font-black text-3xl sm:text-5xl md:text-6xl text-[#F7F5F2]"
              style={{
                transform: 'translateY(50%)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {digit}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Physical Mechanical Center Slit Line */}
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1.5px] bg-[#0E0D0B] z-10 pointer-events-none shadow-xs"
          style={{
            boxShadow: '0 1px 2px rgba(0,0,0,0.8)',
          }}
        />

        {/* Subtle Side Pegs / Hinges */}
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-3 rounded-l-xs bg-[#12110F] border-r border-black/60 z-20" />
        <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-3 rounded-r-xs bg-[#12110F] border-l border-black/60 z-20" />
      </div>
    </div>
  )
})

export function FlipClockDisplay({ totalSeconds }: Props) {
  const { min1, min2, sec1, sec2 } = formatTimerDigits(totalSeconds)

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 my-4 select-none">
      {/* Minutes Group */}
      <div className="flex items-center gap-1 sm:gap-2">
        <SingleDigit digit={min1} label="Minutes tens" />
        <SingleDigit digit={min2} label="Minutes ones" />
      </div>

      {/* Colon Separator */}
      <div className="flex flex-col gap-2.5 sm:gap-4 px-1 sm:px-2 pb-2">
        <span className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-[var(--accent)] shadow-xs" />
        <span className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-[var(--accent)] shadow-xs" />
      </div>

      {/* Seconds Group */}
      <div className="flex items-center gap-1 sm:gap-2">
        <SingleDigit digit={sec1} label="Seconds tens" />
        <SingleDigit digit={sec2} label="Seconds ones" />
      </div>
    </div>
  )
}

