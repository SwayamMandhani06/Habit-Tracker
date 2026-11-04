'use client'
// components/dashboard/DashboardClient.tsx — Refined editorial dashboard
import { useEffect, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { DashboardStats } from '@/lib/supabase/types'
import { CatCompanion } from '@/components/cat/CatCompanion'
import { ArrowRight } from 'lucide-react'

// Lazy-load Recharts sparkline code with next/dynamic
const SparklineChart = dynamic(
  () => import('./SparklineChart').then((mod) => mod.SparklineChart),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full rounded bg-[var(--surface-raised)] animate-pulse" />
    ),
  }
)

interface Props {
  stats: DashboardStats
  date: string
}

// Staggered section entrance variants
const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
}

// 600ms count-up with easeOut
function useCountUp(target: number, duration = 600) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (target === 0) {
      setVal(0)
      return
    }
    let frame: number
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - elapsed, 3) // easeOutCubic
      setVal(Math.round(ease * target))
      if (elapsed < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])
  return val
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function DashboardClient({ stats, date }: Props) {
  const d = new Date(date + 'T00:00:00')
  const monthName = MONTH_NAMES[d.getMonth()]
  const dayNumber = d.getDate()
  const yearNumber = d.getFullYear()

  const effectivePct = stats.todayTotal > 0 ? stats.todayPct : 0
  const isPerfectDay = effectivePct >= 100 && stats.todayTotal > 0 && stats.todayScore > 0
  const displayedTodayPct = useCountUp(Math.round(effectivePct), 600)

  // Sparkline data fallback
  const sparklineData = stats.weeklySparkline && stats.weeklySparkline.length > 0
    ? stats.weeklySparkline
    : [
        { day: 'Mon', pct: 0 },
        { day: 'Tue', pct: 0 },
        { day: 'Wed', pct: 0 },
        { day: 'Thu', pct: 0 },
        { day: 'Fri', pct: 0 },
        { day: 'Sat', pct: 0 },
        { day: 'Sun', pct: Math.round(stats.todayPct) },
      ]

  // Progress ring constants
  const size = 110
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, stats.todayPct)) / 100) * circumference

  return (
    <div
      className="page-container"
      style={{
        maxWidth: 880,
        margin: '0 auto',
        paddingBottom: 'calc(80px + var(--safe-bottom) + 16px)',
      }}
    >
      {/* ── 1. PAGE HEADER ─────────────────────────────────────────────── */}
      <motion.div
        custom={0}
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        style={{ marginBottom: 36 }}
      >
        <p
          className="text-path"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginBottom: 10,
            letterSpacing: '0.04em',
          }}
        >
          ~/ dashboard
        </p>

        {/* Huge date row with cat companion */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'clamp(2.5rem, 5.5vw, 4rem)',
                fontWeight: 800,
                color: 'var(--text-primary)',
                lineHeight: 1.05,
                letterSpacing: '-0.035em',
                margin: 0,
              }}
            >
              <span style={{ color: 'var(--accent)', fontWeight: 400 }}>[ </span>
              {monthName} {dayNumber}
              <span style={{ color: 'var(--accent)', fontWeight: 400 }}> ]</span>
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 400,
                  color: 'var(--text-muted)',
                  marginLeft: 14,
                  letterSpacing: '0.02em',
                }}
              >
                {yearNumber}
              </span>
            </h1>
          </div>

          <CatCompanion completionPct={effectivePct} />
        </div>

        {/* Today's quote in Instrument Serif italic */}
        {stats.todayQuote && (
          <div
            style={{
              borderLeft: '2px solid var(--accent)',
              paddingLeft: 18,
              marginTop: 22,
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(1.15rem, 2.4vw, 1.45rem)',
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--text-primary)',
                lineHeight: 1.5,
              }}
            >
              &ldquo;{stats.todayQuote}&rdquo;
            </p>
          </div>
        )}
      </motion.div>

      {/* ── 2. TODAY'S PROGRESS (Most Prominent Section) ────────────────── */}
      <motion.div
        custom={1}
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        className="rounded-2xl p-4 sm:p-5 md:p-0 md:bg-transparent md:border-none md:shadow-none bg-[var(--surface)] border border-[var(--border)] mb-7 transition-all"
        style={{
          boxShadow: isPerfectDay ? '0 0 0 1px var(--accent), 0 0 16px var(--accent-glow)' : undefined,
        }}
      >
        {/* On mobile: compact row with percent & ring side by side. On desktop: spacious editorial row */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Completion stats */}
          <div className="min-w-0 flex-1">
            <span className="section-label block mb-1">
              TODAY&apos;S PROGRESS
            </span>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'clamp(2.75rem, 6vw, 4.5rem)',
                fontWeight: 800,
                color: 'var(--accent)',
                lineHeight: 1,
                letterSpacing: '-0.04em',
                marginBottom: 6,
              }}
              className="tabular-nums"
            >
              {displayedTodayPct}
              <span style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)', fontWeight: 600, marginLeft: 2 }}>%</span>
            </div>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                letterSpacing: '0.02em',
              }}
              className="truncate"
            >
              {stats.todayScore} of {stats.todayTotal} habits complete today
            </p>
          </div>

          {/* Right: Progress Ring (SVG animated stroke) */}
          <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              {/* Background circle track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--border)"
                strokeWidth={strokeWidth}
              />
              {/* Animated progress circle */}
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--accent)',
              }}
            >
              {Math.round(stats.todayPct)}%
            </div>
          </div>
        </div>

        {/* Thin full-width progress bar below */}
        <div
          style={{
            marginTop: 16,
            height: 4,
            backgroundColor: 'var(--border)',
            borderRadius: 99,
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: Math.min(1, Math.max(0, stats.todayPct / 100)) }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{
              height: '100%',
              backgroundColor: 'var(--accent)',
              transformOrigin: 'left',
            }}
          />
        </div>
      </motion.div>

      {/* ── 3. STATS ROW (4 Cards in a row, 2x2 on mobile) ──────────────── */}
      <motion.div
        custom={2}
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        style={{ marginBottom: 32 }}
      >
        <span className="section-label" style={{ display: 'block', marginBottom: 12 }}>
          STATS
        </span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox label="Streak" value={stats.currentStreak} unit="d" accent />
          <StatBox label="Longest" value={stats.longestStreak} unit="d" />
          <StatBox label="Perfect Days" value={stats.perfectDaysCount} unit="" />
          <StatBox label="Weekly Avg" value={Math.round(stats.weeklyAvgPct)} unit="%" />
        </div>
      </motion.div>

      {/* ── 4. WEEKLY SPARKLINE & 5. MONTHLY PROGRESS ──────────────────── */}
      <motion.div
        custom={3}
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
          marginBottom: 36,
        }}
      >
        {/* Weekly Sparkline (Minimal 7-bar chart) */}
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <span className="section-label">WEEKLY SPARKLINE</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Last 7 Days
            </span>
          </div>

          <div style={{ width: '100%', height: 90 }}>
            <SparklineChart data={sparklineData} />
          </div>
        </div>

        {/* Monthly Progress */}
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <span className="section-label">MONTHLY PROGRESS</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                {Math.round(stats.monthlyAvgPct)}%
              </span>
            </div>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.825rem',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                marginBottom: 16,
              }}
            >
              Overall consistency across all tracked disciplines for {monthName}.
            </p>
          </div>

          <div
            style={{
              height: 4,
              backgroundColor: 'var(--border)',
              borderRadius: 99,
              overflow: 'hidden',
            }}
          >
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: Math.min(1, Math.max(0, stats.monthlyAvgPct / 100)) }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              style={{
                height: '100%',
                backgroundColor: 'var(--accent)',
                transformOrigin: 'left',
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* ── 6. QUICK NAVIGATE (Simple text links with hairline underline) ─── */}
      <motion.div
        custom={4}
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        style={{
          paddingTop: 24,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 32,
          flexWrap: 'wrap',
        }}
      >
        <span className="section-label">QUICK NAVIGATE:</span>

        <Link
          href="/grid"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--text-primary)',
            textDecoration: 'none',
            borderBottom: '1px solid var(--border)',
            paddingBottom: 2,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transition: 'border-color 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.color = 'var(--accent)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
        >
          Monthly Grid <ArrowRight size={13} />
        </Link>

        <Link
          href="/review"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--text-primary)',
            textDecoration: 'none',
            borderBottom: '1px solid var(--border)',
            paddingBottom: 2,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transition: 'border-color 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.color = 'var(--accent)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
        >
          Monthly Review <ArrowRight size={13} />
        </Link>
      </motion.div>
    </div>
  )
}

function StatBox({
  label,
  value,
  unit,
  accent = false,
}: {
  label: string
  value: number
  unit: string
  accent?: boolean
}) {
  const displayedValue = useCountUp(value, 600)

  return (
    <motion.div
      whileHover={{ y: -2 }}
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 16px',
        transition: 'border-color 0.15s ease',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        [ {label} ]
      </p>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '2rem',
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '-0.03em',
          color: accent ? 'var(--accent)' : 'var(--text-primary)',
          display: 'flex',
          alignItems: 'baseline',
          gap: 2,
        }}
      >
        <span>{displayedValue}</span>
        {unit && (
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
            {unit}
          </span>
        )}
      </div>
    </motion.div>
  )
}
