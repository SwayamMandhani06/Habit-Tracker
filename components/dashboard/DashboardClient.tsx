'use client'
// components/dashboard/DashboardClient.tsx
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import type { DashboardStats } from '@/lib/supabase/types'
import { Calendar, Grid3X3, BookOpen, ChevronRight, Zap } from 'lucide-react'
import { CatCompanion } from '@/components/cat/CatCompanion'

interface Props {
  stats: DashboardStats
  date: string
}

// Count-up hook with spring easing
function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (target === 0) { setVal(0); return }
    let frame: number
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(ease * target))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])
  return val
}

// Pop entrance variant — used on all cards
const popIn = (delay = 0) => ({
  initial: { scale: 0.94, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { delay, type: 'spring' as const, stiffness: 300, damping: 24 },
})

// Section divider: "LABEL ————"
function Section({ label }: { label: string }) {
  return (
    <div className="section-header" style={{ marginBottom: 14, marginTop: 28 }}>
      <span className="section-label">{label}</span>
    </div>
  )
}

function StatCard({ label, value, suffix = '', accent = false, delay = 0 }: {
  label: string; value: number; suffix?: string; accent?: boolean; delay?: number
}) {
  const displayed = useCountUp(Math.round(value), 800)
  return (
    <motion.div {...popIn(delay)} className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
      <p className="text-label" style={{ marginBottom: 8 }}>{label}</p>
      <p style={{
        fontSize: '1.875rem',
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '-0.03em',
        color: accent ? 'var(--accent)' : 'var(--ink-primary)',
        lineHeight: 1,
      }}>
        {displayed}{suffix}
      </p>
    </motion.div>
  )
}

function ProgressCard({ label, pct, delay = 0, isPerfect = false, isToday = false }: {
  label: string; pct: number; delay?: number; isPerfect?: boolean; isToday?: boolean
}) {
  return (
    <motion.div
      {...popIn(delay)}
      className={`card ${isPerfect ? 'perfect-pulse' : ''}`}
      style={isToday ? {
        borderLeft: '2px solid var(--accent)',
        paddingLeft: 22,
        paddingTop: 20,
        paddingBottom: 20,
      } : undefined}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <p className="text-label">{label}</p>
        <span style={{
          fontSize: isToday ? '1.125rem' : '1rem',
          fontWeight: isToday ? 600 : 500,
          fontFamily: 'var(--font-mono)',
          color: isPerfect ? 'var(--accent)' : 'var(--ink-primary)',
        }}>
          {Math.round(pct)}%
        </span>
      </div>
      <div className="progress-track">
        <motion.div
          className="progress-fill"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: pct / 100 }}
          transition={{ delay: delay + 0.08, type: 'spring', stiffness: 100, damping: 20 }}
        />
      </div>
    </motion.div>
  )
}

const QUICK_LINKS = [
  { href: '/grid',     label: 'monthly grid',   icon: Grid3X3,  desc: 'full habit matrix' },
  { href: '/review',   label: 'monthly review',  icon: BookOpen, desc: 'end-of-month reflection' },
  { href: '/calendar', label: 'calendar view',   icon: Calendar, desc: 'browse past days' },
]

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function DashboardClient({ stats, date }: Props) {
  const d = new Date(date + 'T00:00:00')
  const isPerfectDay = stats.todayPct >= 100

  return (
    <div className="page-container">

      {/* Path breadcrumb */}
      <motion.p
        className="text-path"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{ marginBottom: 6 }}
      >
        ~/ dashboard
      </motion.p>

      {/* Title row + cat */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}
      >
        <div>
          <h1 style={{
            fontSize: '1.625rem',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '-0.02em',
            color: 'var(--ink-primary)',
            lineHeight: 1.1,
          }}>
            <span className="bracket">[ </span>
            {MONTH_NAMES[d.getMonth()]} {d.getFullYear()}
            <span className="bracket"> ]</span>
          </h1>
        </div>

        {/* Cat — lives here, in the title row corner */}
        <CatCompanion completionPct={stats.todayPct} />
      </motion.div>

      {/* Today's quote */}
      {stats.todayQuote && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08, duration: 0.35 }}
          style={{
            borderLeft: '2px solid var(--accent)',
            paddingLeft: 16,
            marginBottom: 24,
          }}
        >
          <p style={{
            fontSize: '0.875rem',
            fontFamily: 'var(--font-mono)',
            fontStyle: 'italic',
            color: 'var(--ink-secondary)',
            lineHeight: 1.7,
            fontWeight: 300,
          }}>
            &ldquo;{stats.todayQuote}&rdquo;
          </p>
        </motion.div>
      )}

      {/* Goals this month */}
      {stats.goalsThisMonth && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          style={{
            background: 'var(--bg-surface-1)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 18px',
            marginBottom: 24,
          }}
        >
          <p className="text-label" style={{ marginBottom: 6, color: 'var(--accent)' }}>GOALS THIS MONTH</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--ink-secondary)', lineHeight: 1.65 }}>
            {stats.goalsThisMonth}
          </p>
        </motion.div>
      )}

      {/* PROGRESS section */}
      <Section label="PROGRESS" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
        <ProgressCard label="TODAY" pct={stats.todayPct} delay={0.05} isPerfect={isPerfectDay} isToday />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
        <ProgressCard label="THIS WEEK"  pct={stats.weeklyAvgPct}  delay={0.1} />
        <ProgressCard label="THIS MONTH" pct={stats.monthlyAvgPct} delay={0.14} />
      </div>

      {/* STATS section */}
      <Section label="STATS" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
        <StatCard label="streak"       value={stats.currentStreak}               suffix=" d"  accent delay={0.1} />
        <StatCard label="best"         value={stats.longestStreak}               suffix=" d"        delay={0.13} />
        <StatCard label="perfect days" value={stats.perfectDaysCount}                               delay={0.16} />
        <StatCard label="overall"      value={Math.round(stats.overallCompletionPct)} suffix="%"    delay={0.19} />
      </div>

      {/* NAVIGATE section */}
      <Section label="NAVIGATE" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.22, duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        {QUICK_LINKS.map(({ href, label, icon: Icon, desc }, i) => (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '13px 16px',
              background: 'var(--bg-surface-1)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              textDecoration: 'none',
              color: 'inherit',
              transition: `border-color var(--duration-fast), background var(--duration-fast)`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--border-strong)'
              e.currentTarget.style.background = 'var(--bg-surface-2)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-default)'
              e.currentTarget.style.background = 'var(--bg-surface-1)'
            }}
          >
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-surface-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-tertiary)',
              flexShrink: 0,
            }}>
              <Icon size={14} strokeWidth={1.5} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-primary)', marginBottom: 1 }}>
                {label}
              </p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--ink-tertiary)' }}>{desc}</p>
            </div>
            <ChevronRight size={14} color="var(--ink-disabled)" />
          </Link>
        ))}
      </motion.div>

    </div>
  )
}
