'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  ChevronLeft,
  ChevronRight,
  ChevronRight as ArrowRightIcon,
  Flame,
  AlertTriangle,
  ArrowUpRight,
  TrendingDown,
  Sparkles,
} from 'lucide-react'

// Lazy-load Recharts line chart with next/dynamic
const InsightsLineChart = dynamic(
  () => import('./InsightsLineChart').then((mod) => mod.InsightsLineChart),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[220px] rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] animate-pulse" />
    ),
  }
)
import type { InsightsData } from '@/lib/db/insights'
import { renderHabitIcon, getHabitColorVar } from '@/lib/habit-theme'
import { calculateWeekdayBreakdown, type HabitRecord } from '@/lib/stats/habit-math'

interface Props {
  data: InsightsData
}

export function InsightsClient({ data }: Props) {
  const router = useRouter()

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

  // Find lowest habit (habitsWorstToBest is sorted lowest first)
  const lowestHabit = data.habitsWorstToBest.length > 0 ? data.habitsWorstToBest[0] : null

  // Compute "Where To Improve" using pure calculateWeekdayBreakdown
  const whereToImprove = useMemo(() => {
    if (!lowestHabit || !lowestHabit.dailyHeatmap || lowestHabit.dailyHeatmap.length === 0) {
      return null
    }

    const recordsMap = new Map<string, HabitRecord>()
    for (const d of lowestHabit.dailyHeatmap) {
      recordsMap.set(d.date, {
        isCompleted: d.completed,
        isSkipped: d.isSkipped ?? false,
      })
    }

    const monthStartStr = `${data.year}-${String(data.month).padStart(2, '0')}-01`
    const todayItem = data.dailyScores?.find((d) => d.isToday)
    const todayStr =
      todayItem?.date ??
      lowestHabit.dailyHeatmap[lowestHabit.dailyHeatmap.length - 1]?.date ??
      monthStartStr

    const breakdown = calculateWeekdayBreakdown(
      recordsMap,
      lowestHabit.created_at ?? monthStartStr,
      lowestHabit.archived_at,
      todayStr,
      monthStartStr
    )

    return {
      habit: lowestHabit,
      weakestWeekday: breakdown.weakestWeekday,
      weekdays: breakdown.weekdays,
    }
  }, [lowestHabit, data.year, data.month])

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
      {/* ── 1. HEADER SECTION (48px bottom margin) ───────────────────────── */}
      <section style={{ marginBottom: '48px' }}>
        <p className="font-mono text-xs text-[var(--text-muted)] tracking-wider mb-2">
          ~/ insights
        </p>

        {/* Month Navigator */}
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

        {/* 3 Top Metric Headline Tiles (2 across on mobile, 3 on sm+) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Tile 1: Perfect Days */}
          <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between shadow-2xs">
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

          {/* Tile 2: Avg Completion */}
          <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between shadow-2xs">
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

          {/* Tile 3: Current Streak */}
          <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between shadow-2xs">
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
      </section>

      {/* ── 2. CHARTS & WHERE TO IMPROVE SECTION (48px bottom margin) ───────── */}
      <section style={{ marginBottom: '48px' }}>
        <div className="flex items-center gap-3 mb-6">
          <span className="font-mono text-xs uppercase tracking-[0.2em] font-bold text-[var(--text-muted)]">
            PERFORMANCE & FOCUS ————
          </span>
          <div className="flex-1 h-[1px] bg-[var(--border)]" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Daily Completion Trend Line Chart (col-span-7, 24px padding = p-6) */}
          <div className="lg:col-span-7 p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider font-bold text-[var(--text-primary)] block">
                  DAILY COMPLETION TREND
                </span>
                <span className="font-mono text-[10px] text-[var(--text-muted)]">
                  Day-by-day score across {data.monthName}
                </span>
              </div>
              <span className="font-mono text-[10px] text-[var(--accent)] font-semibold px-2 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)]">
                Target: 80%
              </span>
            </div>

            <div className="w-full h-[220px]">
              <InsightsLineChart data={lineChartData} monthName={data.monthName} />
            </div>

            <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
              <span>Monthly Average: <strong className="text-[var(--text-primary)]">{data.avgCompletionPct}%</strong></span>
              <span>Perfect Days: <strong className="text-[var(--accent)]">{data.perfectDaysCount}</strong></span>
            </div>
          </div>

          {/* "Where To Improve" Card (col-span-5, 24px padding = p-6) */}
          <div className="lg:col-span-5 p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
                  <span className="font-mono text-xs uppercase tracking-wider font-bold text-[var(--text-primary)]">
                    WHERE TO IMPROVE
                  </span>
                </div>
                <span className="font-mono text-[10px] text-amber-500 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  Priority Focus
                </span>
              </div>

              {whereToImprove && whereToImprove.habit ? (
                <div className="space-y-4">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold block mb-1">
                      Lowest Consistency Habit
                    </span>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border"
                          style={{
                            borderColor: getHabitColorVar(whereToImprove.habit.color ?? 'sage'),
                            color: getHabitColorVar(whereToImprove.habit.color ?? 'sage'),
                            backgroundColor: `color-mix(in srgb, ${getHabitColorVar(
                              whereToImprove.habit.color ?? 'sage'
                            )} 15%, transparent)`,
                          }}
                        >
                          {renderHabitIcon(whereToImprove.habit.icon ?? 'circle-dot', 14)}
                        </span>
                        <span className="font-mono text-xs font-bold text-[var(--text-primary)] truncate">
                          {whereToImprove.habit.name}
                        </span>
                      </div>
                      <span className="font-mono text-sm font-black text-rose-500 ml-2">
                        {whereToImprove.habit.pct}%
                      </span>
                    </div>
                  </div>

                  {whereToImprove.weakestWeekday ? (
                    <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] font-mono text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">
                          Weakest Day of Week
                        </span>
                        <span className="font-bold text-rose-500 text-xs">
                          {whereToImprove.weakestWeekday.rate}% done
                        </span>
                      </div>
                      <p className="font-bold text-sm text-[var(--text-primary)]">
                        {whereToImprove.weakestWeekday.dayLabel}s
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                        Completed on {whereToImprove.weakestWeekday.completedDays} of{' '}
                        {whereToImprove.weakestWeekday.eligibleDays}{' '}
                        {whereToImprove.weakestWeekday.dayLabel}s this month. Consider scheduling a smaller target or morning reminder.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] font-mono text-xs text-[var(--text-muted)]">
                      No weekday drop pattern identified. Maintain consistent daily timing.
                    </div>
                  )}

                  <Link
                    href={`/habits/${whereToImprove.habit.id}`}
                    className="inline-flex items-center justify-between w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] transition-all font-mono text-xs font-bold text-[var(--accent)] hover:border-[var(--accent)] group"
                  >
                    <span>View Habit Details & Notes</span>
                    <ArrowUpRight
                      size={14}
                      className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                    />
                  </Link>
                </div>
              ) : (
                <div className="p-6 text-center font-mono text-xs text-[var(--text-muted)]">
                  <Sparkles size={20} className="mx-auto text-[var(--accent)] mb-2" />
                  <p className="font-bold text-[var(--text-primary)]">All Habits Strong</p>
                  <p className="text-[11px] mt-1">No habits identified as low consistency this month.</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--border)] font-mono text-[10px] text-[var(--text-muted)]">
              Focus on 1% incremental discipline to build momentum.
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. HABIT CONSISTENCY RANKING SECTION (Lowest First) ──────────────── */}
      <section style={{ marginBottom: '48px' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] font-bold text-[var(--text-muted)] block">
              HABIT CONSISTENCY RANKING ————
            </span>
            <p className="font-mono text-[10px] text-[var(--text-muted)] mt-0.5">
              Ranked from lowest to highest consistency · Click any habit to inspect full history, notes, and metrics
            </p>
          </div>
          <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)]">
            {data.habitsWorstToBest.length} Habits
          </span>
        </div>

        {data.habitsWorstToBest.length === 0 ? (
          <div className="text-center p-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] font-mono text-xs text-[var(--text-muted)]">
            No habits tracked for this month yet.
          </div>
        ) : (
          <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs divide-y divide-[var(--border)]">
            {data.habitsWorstToBest.map((habit, index) => {
              const habitColor = getHabitColorVar(habit.color ?? 'sage')
              return (
                <Link
                  key={habit.id}
                  href={`/habits/${habit.id}`}
                  className={`flex items-center justify-between gap-4 py-3.5 px-3 -mx-3 rounded-xl hover:bg-[var(--surface-raised)] transition-all cursor-pointer group ${
                    index === 0 ? 'pt-0' : ''
                  } ${index === data.habitsWorstToBest.length - 1 ? 'pb-0' : ''}`}
                >
                  {/* Left: Icon Chip + Habit Name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border transition-transform group-hover:scale-105"
                      style={{
                        borderColor: habitColor,
                        color: habitColor,
                        backgroundColor: `color-mix(in srgb, ${habitColor} 15%, transparent)`,
                      }}
                    >
                      {renderHabitIcon(habit.icon ?? 'circle-dot', 16)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                          {habit.name}
                        </span>
                        {habit.delta !== null && (
                          <span
                            className={`font-mono text-[10px] font-bold ${
                              habit.delta >= 0 ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            {habit.delta >= 0 ? `+${habit.delta}%` : `${habit.delta}%`}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-[var(--text-muted)] block">
                        {habit.totalCompletions} days completed · Best streak: {habit.bestStreak}d
                      </span>
                    </div>
                  </div>

                  {/* Middle: Thin Progress Bar in Habit Color */}
                  <div className="hidden sm:flex items-center gap-3 w-40 flex-shrink-0">
                    <div className="w-full h-1.5 bg-[var(--surface-raised)] border border-[var(--border)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(0, habit.pct))}%`,
                          backgroundColor: habitColor,
                        }}
                      />
                    </div>
                  </div>

                  {/* Right: Percentage & Arrow */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className="font-mono text-sm font-black w-12 text-right"
                      style={{ color: habitColor }}
                    >
                      {habit.pct}%
                    </span>
                    <ArrowRightIcon
                      size={15}
                      className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-all"
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
