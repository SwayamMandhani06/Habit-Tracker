'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Trophy,
  Flame,
  AlertTriangle,
  Award,
  Check,
} from 'lucide-react'
import type { InsightsData } from '@/lib/db/insights'

interface Props {
  data: InsightsData
}

export function InsightsClient({ data }: Props) {
  const router = useRouter()
  const [expandedHabits, setExpandedHabits] = useState<Record<string, boolean>>({})

  const toggleHabit = (id: string) => {
    setExpandedHabits((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const prevMonth = () => {
    const m = data.month === 1 ? 12 : data.month - 1
    const y = data.month === 1 ? data.year - 1 : data.year
    router.push(`/insights?year=${y}&month=${m}`)
  }

  const nextMonth = () => {
    const m = data.month === 12 ? 1 : data.month + 1
    const y = data.month === 12 ? data.year + 1 : data.year
    router.push(`/insights?year=${y}&month=${m}`)
  }

  // Format line chart data
  const lineChartData = (data.dailyScores ?? []).map((d) => ({
    day: d.day,
    date: d.date,
    pct: d.isFuture ? null : (d.pct ?? 0),
    isToday: d.isToday,
  }))

  const tooltipStyle = {
    backgroundColor: 'var(--surface-raised)',
    borderColor: 'var(--border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
    padding: '8px 12px',
  }

  return (
    <div
      className="page-container w-full mx-auto"
      style={{
        maxWidth: '920px',
        paddingLeft: 'clamp(20px, 5vw, 40px)',
        paddingRight: 'clamp(20px, 5vw, 40px)',
        paddingTop: '32px',
        paddingBottom: '80px',
      }}
    >
      {/* ── 1. HEADER SECTION ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: '40px' }}>
        <p className="font-mono text-xs text-[var(--text-muted)] tracking-wider mb-2">
          ~/ insights
        </p>

        {/* Month Navigator: "< [ October 2026 ] >" */}
        <div className="flex items-center justify-between flex-wrap gap-4 select-none py-2 mb-6">
          <h1 className="font-mono text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Analytics & Insights
          </h1>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous Month"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer active:scale-95 shadow-2xs"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="font-mono text-xs font-bold px-4 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)]">
              [ {data.monthName} {data.year} ]
            </span>

            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next Month"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer active:scale-95 shadow-2xs"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* 3 Top Metric Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Chip 1: Perfect Days */}
          <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between shadow-2xs">
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-2">
              PERFECT DAYS
            </span>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-mono font-black text-[var(--text-primary)] leading-none">
                {data.perfectDaysCount}
              </span>
              <span className="font-mono text-xs text-[var(--text-muted)]">Days</span>
            </div>
            <p className="font-mono text-[10px] text-[var(--accent)] font-semibold">
              100% Habit Completion
            </p>
          </div>

          {/* Chip 2: Avg Completion */}
          <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between shadow-2xs">
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-2">
              AVG COMPLETION
            </span>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-mono font-black text-[var(--text-primary)] leading-none">
                {data.avgCompletionPct}
              </span>
              <span className="text-xl font-mono font-bold text-[var(--accent)]">%</span>
            </div>
            <p className="font-mono text-[10px] text-[var(--text-muted)]">
              Monthly Active Velocity
            </p>
          </div>

          {/* Chip 3: Current Streak */}
          <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between shadow-2xs">
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-2">
              CURRENT STREAK
            </span>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-mono font-black text-[var(--accent)] leading-none">
                {data.currentStreak}
              </span>
              <span className="font-mono text-xs text-[var(--text-muted)]">Days</span>
            </div>
            <p className="font-mono text-[10px] text-[var(--text-muted)]">
              Best Ever: {data.longestStreakEver} Days
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. SIGNATURE INLITX / STREAK ANALYTICS ───────────────────────────── */}
      <div style={{ marginBottom: '48px' }}>
        <div className="flex items-center gap-3 mb-6">
          <span className="font-mono text-xs uppercase tracking-[0.2em] font-bold text-[var(--accent)]">
            HABIT COMPARISON & CONSISTENCY ————
          </span>
          <div className="flex-1 h-[1px] bg-[var(--border)]" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Card 1: Habits Compared Donut & Ranking Card (col-span-7) */}
          <div className="lg:col-span-7 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border)]">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider font-bold text-[var(--text-primary)] block">
                  HABITS COMPARED
                </span>
                <span className="font-mono text-[10px] text-[var(--text-muted)]">
                  Volume share across monthly completions
                </span>
              </div>
              <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--accent)]">
                {data.totalCompletionsCount ?? 0} Total
              </span>
            </div>

            {/* Donut and Legend Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center mb-5">
              {/* Donut with center number */}
              <div className="relative w-full h-[180px] flex items-center justify-center">
                {data.habitComparison && data.habitComparison.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.habitComparison}
                          dataKey="completions"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={72}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {data.habitComparison.map((entry) => (
                            <Cell key={entry.id} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(val: unknown) => [typeof val === 'number' ? `${val} times` : '—', 'Done']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                      <span className="font-mono text-2xl font-black text-[var(--text-primary)] leading-none">
                        {data.totalCompletionsCount ?? 0}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)] mt-1 font-bold">
                        DONE
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="font-mono text-xs text-[var(--text-muted)] text-center">
                    No completions recorded
                  </div>
                )}
              </div>

              {/* Legend with percentages */}
              <div className="space-y-2 overflow-y-auto max-h-[170px] pr-1 no-scrollbar">
                {data.habitComparison &&
                  data.habitComparison.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[var(--text-primary)] truncate font-medium" title={item.name}>
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-bold text-[var(--text-primary)]">{item.completions}</span>
                        <span className="text-[var(--text-muted)] text-[10px] w-9 text-right font-semibold">
                          ({item.pctOfTotal}%)
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Ranked Horizontal Progress Bars */}
            <div className="space-y-2.5 pt-4 border-t border-[var(--border)]">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold block mb-1">
                RANKING BY VOLUME
              </span>
              {data.habitComparison &&
                data.habitComparison.slice(0, 5).map((item) => {
                  const maxVal = data.habitComparison[0]?.completions || 1
                  const barWidth = Math.min(100, Math.max(6, Math.round((item.completions / maxVal) * 100)))
                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-[var(--text-primary)] truncate max-w-[200px]">{item.name}</span>
                        <span className="font-bold text-xs" style={{ color: item.color }}>
                          {item.completions}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[var(--surface-raised)] border border-[var(--border)] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ duration: 0.6 }}
                          style={{ backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Cards 2 & 3: Consistency Radial Gauge + Day-of-Week Velocity (col-span-5) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Card 2: Consistency Radial Gauge */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs uppercase tracking-wider font-bold text-[var(--text-primary)]">
                  CONSISTENCY GAUGE
                </span>
                <span className="font-mono text-[10px] text-[var(--accent)] font-bold px-2 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)]">
                  Last 30 Days
                </span>
              </div>

              {/* Gauge Meter */}
              <div className="flex items-center justify-center my-4">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="var(--border)"
                      strokeWidth="7"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="7"
                      strokeDasharray="251.3"
                      strokeDashoffset={251.3 - (251.3 * (data.thirtyDayConsistencyPct ?? data.avgCompletionPct)) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="font-mono text-3xl font-extrabold text-[var(--text-primary)] leading-none">
                      {data.thirtyDayConsistencyPct ?? data.avgCompletionPct}%
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)] mt-1 font-bold">
                      VELOCITY
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center font-mono text-xs text-[var(--text-muted)]">
                {data.thirtyDayConsistencyPct >= 80 ? (
                  <span className="text-emerald-500 font-bold">✓ Exceptional Consistency (Top 1%)</span>
                ) : data.thirtyDayConsistencyPct >= 50 ? (
                  <span className="text-[var(--accent)] font-bold">Steady compounding momentum</span>
                ) : (
                  <span>Focus on 1% daily increments</span>
                )}
              </div>
            </div>

            {/* Card 3: "When Are You Most Consistent?" Day-of-Week Bar Chart */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs uppercase tracking-wider font-bold text-[var(--text-primary)]">
                  WHEN ARE YOU MOST CONSISTENT?
                </span>
                <span className="font-mono text-[10px] text-[var(--text-muted)]">
                  M T W T F S S
                </span>
              </div>

              {/* 7-Bar Chart Container */}
              <div className="w-full h-36 mt-2">
                {data.dayOfWeekConsistency && data.dayOfWeekConsistency.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.dayOfWeekConsistency}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                      <XAxis
                        dataKey="short"
                        axisLine={{ stroke: 'var(--border)' }}
                        tickLine={false}
                        tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-muted)' }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        unit="%"
                        axisLine={{ stroke: 'var(--border)' }}
                        tickLine={false}
                        tick={{ fontSize: 9, fontFamily: 'var(--font-mono)', fill: 'var(--text-muted)' }}
                        ticks={[0, 50, 100]}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(val: unknown) => [typeof val === 'number' ? `${val}%` : '0%', 'Consistency']}
                        labelFormatter={(_, items) => items?.[0]?.payload?.day ?? ''}
                      />
                      <Bar
                        dataKey="avgPct"
                        fill="var(--accent)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full font-mono text-xs text-[var(--text-muted)]">
                    No data recorded yet
                  </div>
                )}
              </div>

              <div className="mt-2 text-center font-mono text-[10px] text-[var(--text-muted)]">
                Average daily consistency distribution
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. OVERVIEW COMPLETION CHARTS ──────────────────────────────────── */}
      <div style={{ marginBottom: '48px' }}>
        <div className="flex items-center gap-3 mb-6">
          <span className="font-mono text-xs uppercase tracking-[0.2em] font-bold text-[var(--text-muted)]">
            MONTHLY TRENDS ————
          </span>
          <div className="flex-1 h-[1px] bg-[var(--border)]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Line Chart: Completion Trend */}
          <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs uppercase tracking-wider font-bold text-[var(--text-primary)]">
                DAILY COMPLETION TREND
              </span>
              <span className="font-mono text-[10px] text-[var(--accent)] font-semibold px-2 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)]">
                Target: 80%
              </span>
            </div>

            <div className="w-full h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 12, right: 16, left: -22, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                    tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-muted)' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    unit="%"
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                    tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--text-muted)' }}
                    ticks={[0, 25, 50, 75, 100]}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val: unknown) => [typeof val === 'number' ? `${val}%` : '—', 'Completion']}
                    labelFormatter={(day: unknown) => `${data.monthName} ${day}`}
                  />
                  <ReferenceLine y={80} stroke="var(--accent)" strokeDasharray="4 4" strokeOpacity={0.7} />
                  <Line
                    type="monotone"
                    dataKey="pct"
                    stroke="var(--accent)"
                    strokeWidth={2.5}
                    dot={{ r: 2.5, fill: 'var(--accent)', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: 'var(--accent)', stroke: 'var(--bg)', strokeWidth: 2 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Highlights Summary Card */}
          <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs uppercase tracking-wider font-bold text-[var(--text-primary)]">
                MONTHLY HIGHLIGHTS
              </span>
              <span className="font-mono text-[10px] text-[var(--text-muted)]">
                Key Calibrations
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs flex-1 flex flex-col justify-around">
              {/* Best Day */}
              <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Trophy size={14} className="text-amber-500 flex-shrink-0" />
                  <div>
                    <span className="font-bold block text-[var(--text-primary)]">Best Day</span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {data.highlights.bestDay ? `${data.monthName} ${data.highlights.bestDay.dayNumber}` : '—'}
                    </span>
                  </div>
                </div>
                <span className="font-bold text-[var(--accent)]">
                  {data.highlights.bestDay ? `${data.highlights.bestDay.pct}%` : '—'}
                </span>
              </div>

              {/* Hardest Day */}
              <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle size={14} className="text-rose-500 flex-shrink-0" />
                  <div>
                    <span className="font-bold block text-[var(--text-primary)]">Hardest Day</span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {data.highlights.hardestDay ? `${data.monthName} ${data.highlights.hardestDay.dayNumber}` : '—'}
                    </span>
                  </div>
                </div>
                <span className="font-bold text-rose-500">
                  {data.highlights.hardestDay ? `${data.highlights.hardestDay.pct}%` : '—'}
                </span>
              </div>

              {/* Best Habit */}
              <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Award size={14} className="text-emerald-500 flex-shrink-0" />
                  <div>
                    <span className="font-bold block text-[var(--text-primary)]">Strongest Habit</span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {data.highlights.bestHabit ? data.highlights.bestHabit.name : '—'}
                    </span>
                  </div>
                </div>
                <span className="font-bold text-emerald-500">
                  {data.highlights.bestHabit ? `${data.highlights.bestHabit.pct}%` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. HABIT BREAKDOWN SECTION (Worst to Best) ─────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] font-bold text-[var(--text-muted)] block">
              HABIT BREAKDOWN ————
            </span>
            <p className="font-mono text-[10px] text-[var(--text-muted)] mt-0.5">
              Ordered worst to best — Click any habit for sparkline history
            </p>
          </div>
        </div>

        {data.habitsWorstToBest.length === 0 ? (
          <div className="text-center p-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] font-mono text-xs text-[var(--text-muted)]">
            No habits tracked for this month yet.
          </div>
        ) : (
          <div className="space-y-3">
            {data.habitsWorstToBest.map((habit) => {
              const isExpanded = expandedHabits[habit.id] ?? false
              return (
                <div
                  key={habit.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden transition-all shadow-2xs"
                >
                  <div
                    onClick={() => toggleHabit(habit.id)}
                    className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-[var(--surface-raised)]/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center font-mono text-xs font-bold text-[var(--accent)]">
                        {habit.pct}%
                      </div>
                      <div className="min-w-0">
                        <span className="font-mono text-sm font-bold text-[var(--text-primary)] truncate block">
                          {habit.name}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--text-muted)]">
                          {habit.totalCompletions} completed · Best Streak: {habit.bestStreak}d
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Micro Progress Bar */}
                      <div className="hidden sm:block w-32 h-2 bg-[var(--surface-raised)] border border-[var(--border)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, habit.pct))}%`,
                            backgroundColor: 'var(--accent)',
                          }}
                        />
                      </div>
                      <ChevronDown
                        size={15}
                        className={`text-[var(--text-muted)] transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-[var(--border)] bg-[var(--surface-raised)]/30 p-4 sm:p-5 font-mono text-xs"
                      >
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-center">
                          <div className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                            <span className="text-[10px] text-[var(--text-muted)] block">COMPLETED</span>
                            <span className="font-bold text-sm text-[var(--text-primary)]">{habit.totalCompletions} Days</span>
                          </div>
                          <div className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                            <span className="text-[10px] text-[var(--text-muted)] block">MISSED</span>
                            <span className="font-bold text-sm text-rose-500">{habit.missedDays} Days</span>
                          </div>
                          <div className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                            <span className="text-[10px] text-[var(--text-muted)] block">ACTIVE STREAK</span>
                            <span className="font-bold text-sm text-[var(--accent)]">{habit.bestStreak} Days</span>
                          </div>
                          <div className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                            <span className="text-[10px] text-[var(--text-muted)] block">VS LAST MONTH</span>
                            <span className="font-bold text-sm text-[var(--text-primary)]">
                              {habit.delta !== null ? (habit.delta >= 0 ? `+${habit.delta}%` : `${habit.delta}%`) : '—'}
                            </span>
                          </div>
                        </div>

                        {/* Weekly Sparkline Bars */}
                        {habit.weeklySparkline && habit.weeklySparkline.length > 0 && (
                          <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block mb-2 font-bold">
                              4-Week Velocity
                            </span>
                            <div className="grid grid-cols-4 gap-2">
                              {habit.weeklySparkline.map((val, idx) => (
                                <div key={idx} className="space-y-1 text-center">
                                  <div className="h-10 bg-[var(--surface-raised)] rounded flex items-end justify-center p-1">
                                    <div
                                      className="w-full rounded-xs bg-[var(--accent)]"
                                      style={{ height: `${Math.max(4, val)}%` }}
                                    />
                                  </div>
                                  <span className="text-[9px] text-[var(--text-muted)]">W{idx + 1}: {val}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
