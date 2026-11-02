'use client'

// components/review/MonthlyReviewClient.tsx — Complete Visual Redesign Pass
import { useState, useEffect, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Trophy,
  AlertCircle,
  Moon,
  CheckSquare,
  Target,
  Eye,
  Edit3,
  Check,
} from 'lucide-react'
import type { ReviewData } from '@/lib/db/insights'
import { upsertMonthReviewAction } from '@/actions/review.actions'

interface Props {
  data: ReviewData
}

export function MonthlyReviewClient({ data }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<'view' | 'write'>('write')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Form state
  const [whatWentWell, setWhatWentWell] = useState(data.review?.what_went_well ?? '')
  const [habitNeedsWork, setHabitNeedsWork] = useState(data.review?.habit_needs_work ?? '')
  const [biggestWin, setBiggestWin] = useState(data.review?.biggest_achievement ?? '')
  const [oneThingToChange, setOneThingToChange] = useState(
    data.review?.one_thing_to_change ?? data.review?.lessons_learned ?? ''
  )
  const [goalsNextMonth, setGoalsNextMonth] = useState(data.review?.goals_next_month ?? '')
  const [memorableMoments, setMemorableMoments] = useState(data.review?.memorable_moments ?? '')
  const [finalReflection, setFinalReflection] = useState(data.review?.final_reflection ?? '')

  // Disappear saved indicator after 3 seconds
  useEffect(() => {
    if (saveStatus === 'saved' || saveStatus === 'error') {
      const timer = setTimeout(() => {
        setSaveStatus('idle')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [saveStatus])

  const prevMonth = () => {
    const m = data.month === 1 ? 12 : data.month - 1
    const y = data.month === 1 ? data.year - 1 : data.year
    router.push(`/review?year=${y}&month=${m}`)
  }

  const nextMonth = () => {
    const m = data.month === 12 ? 1 : data.month + 1
    const y = data.month === 12 ? data.year + 1 : data.year
    router.push(`/review?year=${y}&month=${m}`)
  }

  // Auto-save on blur
  const handleAutoSave = async () => {
    setSaveStatus('saving')
    try {
      const res = await upsertMonthReviewAction({
        year: data.year,
        month: data.month,
        what_went_well: whatWentWell || null,
        habit_needs_work: habitNeedsWork || null,
        biggest_achievement: biggestWin || null,
        one_thing_to_change: oneThingToChange || null,
        lessons_learned: oneThingToChange || null,
        goals_next_month: goalsNextMonth || null,
        memorable_moments: memorableMoments || null,
        final_reflection: finalReflection || null,
      })

      if (res?.error) {
        setSaveStatus('error')
      } else {
        setSaveStatus('saved')
        startTransition(() => {
          router.refresh()
        })
      }
    } catch {
      setSaveStatus('error')
    }
  }

  // Habits sorted worst to best
  const sortedHabits = [...data.habitStats].sort((a, b) => a.pct - b.pct)

  return (
    <div
      className="page-container w-full mx-auto"
      style={{
        maxWidth: '900px',
        paddingLeft: 'clamp(24px, 5vw, 48px)',
        paddingRight: 'clamp(24px, 5vw, 48px)',
        paddingTop: '40px',
        paddingBottom: '80px',
      }}
    >
      {/* ── 1. HEADER SECTION ───────────────────────────────────────────────── */}
      <div className="space-y-4" style={{ marginBottom: '40px' }}>
        {/* Breadcrumb: 0.75rem, muted */}
        <p className="font-mono text-[0.75rem] text-[var(--text-muted)] tracking-wider">
          ~/ review
        </p>

        {/* Progress Banner: small pill/badge positioned above month title, left-aligned */}
        <div>
          {data.isCurrentMonth ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] text-xs font-mono text-[var(--accent)] font-semibold shadow-2xs">
              <Clock size={12} className="text-[var(--accent)]" />
              <span>[ Month In Progress ] · {data.daysRemaining} Days Remaining</span>
            </div>
          ) : data.isPriorMonth ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold shadow-2xs">
              <CheckCircle2 size={12} />
              <span>[ Month Completed ]</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] text-xs font-mono text-[var(--text-muted)] font-semibold shadow-2xs">
              <span>[ Upcoming Month ]</span>
            </div>
          )}
        </div>

        {/* Month Title & View/Write Clean Pill Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              aria-label="Previous Month"
              className="w-10 h-10 flex items-center justify-center rounded-[6px] border border-[var(--border)] hover:bg-[var(--surface-raised)] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer active:scale-95 shadow-2xs"
            >
              <ChevronLeft size={18} />
            </button>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-mono tracking-tight text-[var(--text-primary)] whitespace-nowrap">
              <span className="text-[var(--text-muted)] font-normal">[ </span>
              {data.monthName} {data.year}
              <span className="text-[var(--text-muted)] font-normal"> ]</span> REVIEW
            </h1>
            <button
              onClick={nextMonth}
              aria-label="Next Month"
              className="w-10 h-10 flex items-center justify-center rounded-[6px] border border-[var(--border)] hover:bg-[var(--surface-raised)] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer active:scale-95 shadow-2xs"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Clean Pill Toggle */}
          <div className="inline-flex items-center p-1 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] font-mono text-xs select-none self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setMode('view')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                mode === 'view'
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] font-bold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Eye size={13} />
              <span>[ View ]</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('write')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                mode === 'write'
                  ? 'bg-[var(--accent)] text-white font-bold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Edit3 size={13} />
              <span>[ Write ]</span>
            </button>
          </div>
        </div>
      </div>

      {/* Goals carried forward from prior review */}
      {data.review?.goals_this_month && (
        <div
          className="rounded-[8px] border-l-3 border-l-[var(--accent)] bg-[var(--surface)] border border-[var(--border)] p-5 mb-8"
        >
          <span className="text-[0.65rem] font-mono uppercase tracking-[0.16em] font-bold text-[var(--accent)] flex items-center gap-2 mb-2">
            <Target size={14} /> GOALS COMMITTED FOR THIS MONTH (FROM PRIOR REVIEW)
          </span>
          <p className="font-mono text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed">
            {data.review.goals_this_month}
          </p>
        </div>
      )}

      {/* ── 2. PERFORMANCE METRICS SECTION ──────────────────────────────────── */}
      <div style={{ marginBottom: '40px' }}>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-[0.68rem] font-mono uppercase tracking-[0.2em] font-bold text-[var(--text-muted)]">
            PERFORMANCE METRICS ————
          </span>
          <div className="flex-1 h-[1px] bg-[var(--border)]" />
        </div>

        <div className="space-y-3">
          {/* Row 1 — 3 PRIMARY STATS (2 across on mobile, 3 on sm+) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Completion */}
            <div
              className="rounded-[8px] border flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                padding: '24px',
              }}
            >
              <span className="text-[0.65rem] font-mono uppercase tracking-[0.16em] font-semibold text-[var(--text-muted)] mb-3">
                COMPLETION
              </span>
              <div className="text-[2.5rem] font-bold font-mono leading-none mb-2" style={{ color: 'var(--accent)' }}>
                {data.stats.overallCompletionPct}%
              </div>
              <p className="text-[0.7rem] font-mono text-[var(--text-muted)]">
                Overall Month
              </p>
            </div>

            {/* Perfect Days */}
            <div
              className="rounded-[8px] border flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                padding: '24px',
              }}
            >
              <span className="text-[0.65rem] font-mono uppercase tracking-[0.16em] font-semibold text-[var(--text-muted)] mb-3">
                PERFECT DAYS
              </span>
              <div className="text-[2.5rem] font-bold font-mono leading-none mb-2 text-[var(--text-primary)]">
                {data.stats.perfectDaysCount}
              </div>
              <p className="text-[0.7rem] font-mono text-[var(--text-muted)]">
                Full Habit Days
              </p>
            </div>

            {/* Longest Streak */}
            <div
              className="rounded-[8px] border flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                padding: '24px',
              }}
            >
              <span className="text-[0.65rem] font-mono uppercase tracking-[0.16em] font-semibold text-[var(--text-muted)] mb-3">
                LONGEST STREAK
              </span>
              <div className="text-[2.5rem] font-bold font-mono leading-none mb-2" style={{ color: 'var(--accent)' }}>
                {data.stats.longestStreakMonth}d
              </div>
              <p className="text-[0.7rem] font-mono text-[var(--text-muted)]">
                Consecutive Days
              </p>
            </div>
          </div>

          {/* Row 2 — 5 SECONDARY STATS (smaller, 1.5rem semibold, 24px padding, 12px gap) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* 1. Best Habit */}
            <div
              className="rounded-[8px] border flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                padding: '24px',
              }}
            >
              <div>
                <Trophy size={16} className="text-[var(--accent)] mb-2" />
                <span className="text-[0.62rem] font-mono uppercase tracking-[0.14em] font-semibold text-[var(--text-muted)] block mb-1">
                  BEST HABIT
                </span>
              </div>
              <div className="mt-2">
                <p className="text-sm font-semibold font-mono text-[var(--text-primary)] truncate" title={data.stats.bestHabit?.name ?? '—'}>
                  {data.stats.bestHabit ? data.stats.bestHabit.name : '—'}
                </p>
                <span className="text-xs font-mono font-bold text-[var(--accent)]">
                  {data.stats.bestHabit ? `${data.stats.bestHabit.pct}%` : ''}
                </span>
              </div>
            </div>

            {/* 2. Worst Habit */}
            <div
              className="rounded-[8px] border flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                padding: '24px',
              }}
            >
              <div>
                <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 mb-2" />
                <span className="text-[0.62rem] font-mono uppercase tracking-[0.14em] font-semibold text-[var(--text-muted)] block mb-1">
                  WORST HABIT
                </span>
              </div>
              <div className="mt-2">
                <p className="text-sm font-semibold font-mono text-[var(--text-primary)] truncate" title={data.stats.worstHabit?.name ?? '—'}>
                  {data.stats.worstHabit ? data.stats.worstHabit.name : '—'}
                </p>
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                  {data.stats.worstHabit ? `${data.stats.worstHabit.pct}%` : ''}
                </span>
              </div>
            </div>

            {/* 3. Avg Sleep */}
            <div
              className="rounded-[8px] border flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                padding: '24px',
              }}
            >
              <div>
                <Moon size={16} className="text-[var(--text-muted)] mb-2" />
                <span className="text-[0.62rem] font-mono uppercase tracking-[0.14em] font-semibold text-[var(--text-muted)] block mb-1">
                  AVG SLEEP
                </span>
              </div>
              <div className="text-[1.5rem] font-semibold font-mono text-[var(--text-primary)] leading-none mt-2">
                {data.stats.avgSleepHours !== null ? `${data.stats.avgSleepHours}h` : '—'}
              </div>
            </div>

            {/* 4. Total Checks */}
            <div
              className="rounded-[8px] border flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                padding: '24px',
              }}
            >
              <div>
                <CheckSquare size={16} className="text-[var(--accent)] mb-2" />
                <span className="text-[0.62rem] font-mono uppercase tracking-[0.14em] font-semibold text-[var(--text-muted)] block mb-1">
                  TOTAL CHECKS
                </span>
              </div>
              <div className="text-[1.5rem] font-semibold font-mono text-[var(--text-primary)] leading-none mt-2">
                {data.stats.totalHabitsCompleted}
              </div>
            </div>

            {/* 5. Total Completions / Consistency */}
            <div
              className="rounded-[8px] border flex flex-col justify-between col-span-2 sm:col-span-1"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                padding: '24px',
              }}
            >
              <div>
                <Target size={16} className="text-[var(--accent)] mb-2" />
                <span className="text-[0.62rem] font-mono uppercase tracking-[0.14em] font-semibold text-[var(--text-muted)] block mb-1">
                  WORKOUT
                </span>
              </div>
              <div className="text-[1.5rem] font-semibold font-mono text-[var(--text-primary)] leading-none mt-2">
                {data.stats.workoutConsistencyPct !== null ? `${data.stats.workoutConsistencyPct}%` : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. HABIT BREAKDOWN (WORST → BEST) SECTION ───────────────────────── */}
      <div style={{ marginBottom: '56px' }}>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-[0.68rem] font-mono uppercase tracking-[0.2em] font-bold text-[var(--text-muted)]">
            HABIT BREAKDOWN (WORST → BEST) ————
          </span>
          <div className="flex-1 h-[1px] bg-[var(--border)]" />
        </div>

        {/* Breakdown Card */}
        <div
          className="rounded-[8px] border"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
            padding: '24px',
          }}
        >
          {sortedHabits.length === 0 ? (
            /* When empty: centered empty state with 40px vertical padding */
            <div
              className="flex flex-col items-center justify-center font-mono text-xs text-[var(--text-muted)] gap-1.5 text-center"
              style={{ padding: '40px 16px' }}
            >
              <p className="font-semibold text-[var(--text-primary)]">No Habits Tracked For This Month</p>
              <p className="text-[0.7rem] opacity-75">Complete habits on the Today page to see your breakdown.</p>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[320px] overflow-y-auto pr-1.5 py-1">
              {sortedHabits.map(h => (
                <div key={h.id} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="truncate max-w-[260px] text-[var(--text-primary)] font-medium" title={h.name}>
                      {h.name}
                    </span>
                    <span className="text-[var(--text-muted)] text-[0.7rem] shrink-0">
                      {h.daysCompleted}/{h.daysActive} Days · <span className="text-[var(--accent)] font-bold">{h.pct}%</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[var(--surface-raised)] border border-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(0, h.pct))}%`,
                        backgroundColor: 'var(--accent)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 4. YOUR REFLECTION SECTION ──────────────────────────────────────── */}
      <div>
        {/* Section label with small accent-colored "Save Now" text button on top-right */}
        <div className="flex items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-[0.68rem] font-mono uppercase tracking-[0.2em] font-bold text-[var(--text-muted)]">
              YOUR REFLECTION ————
            </span>
            <div className="flex-1 h-[1px] bg-[var(--border)]" />
          </div>

          {mode === 'write' && (
            <button
              type="button"
              onClick={handleAutoSave}
              disabled={saveStatus === 'saving'}
              className="text-xs font-mono text-[var(--accent)] hover:opacity-80 transition-opacity font-semibold cursor-pointer shrink-0 ml-2"
            >
              Save Now
            </button>
          )}
        </div>

        {mode === 'view' ? (
          /* READ-ONLY / NOTEBOOK VIEW */
          <div
            className="rounded-[8px] border space-y-10 font-mono"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
              padding: '32px',
            }}
          >
            {/* Field 1 */}
            <div className="space-y-2">
              <span className="text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold">
                WHAT WENT WELL THIS MONTH?
              </span>
              <p className="text-sm text-[var(--text-primary)] font-serif italic whitespace-pre-wrap leading-relaxed">
                {whatWentWell || <span className="font-mono not-italic text-xs text-[var(--text-muted)]">— No Notes Recorded</span>}
              </p>
            </div>

            <div className="h-[1px] w-full bg-[var(--border)]" />

            {/* Field 2 */}
            <div className="space-y-2">
              <span className="text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold">
                WHAT HABIT NEEDS THE MOST WORK?
              </span>
              <p className="text-sm text-[var(--text-primary)] font-serif italic whitespace-pre-wrap leading-relaxed">
                {habitNeedsWork || <span className="font-mono not-italic text-xs text-[var(--text-muted)]">— No Notes Recorded</span>}
              </p>
            </div>

            <div className="h-[1px] w-full bg-[var(--border)]" />

            {/* Field 3 */}
            <div className="space-y-2">
              <span className="text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold">
                BIGGEST WIN THIS MONTH
              </span>
              <p className="text-sm text-[var(--text-primary)] font-serif italic whitespace-pre-wrap leading-relaxed">
                {biggestWin || <span className="font-mono not-italic text-xs text-[var(--text-muted)]">— No Notes Recorded</span>}
              </p>
            </div>

            <div className="h-[1px] w-full bg-[var(--border)]" />

            {/* Field 4 */}
            <div className="space-y-2">
              <span className="text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold">
                ONE THING TO CHANGE NEXT MONTH
              </span>
              <p className="text-sm text-[var(--text-primary)] font-serif italic whitespace-pre-wrap leading-relaxed">
                {oneThingToChange || <span className="font-mono not-italic text-xs text-[var(--text-muted)]">— No Notes Recorded</span>}
              </p>
            </div>

            <div className="h-[1px] w-full bg-[var(--border)]" />

            {/* Field 5 */}
            <div className="space-y-2 border-l-2 border-[var(--accent)] pl-4">
              <span className="text-[0.65rem] uppercase tracking-[0.16em] text-[var(--accent)] font-semibold">
                GOALS FOR NEXT MONTH
              </span>
              <p className="text-sm text-[var(--text-primary)] font-serif italic whitespace-pre-wrap leading-relaxed">
                {goalsNextMonth || <span className="font-mono not-italic text-xs text-[var(--text-muted)]">— No Goals Recorded</span>}
              </p>
              <p className="text-[0.7rem] text-[var(--text-muted)] font-serif italic opacity-75">
                This will appear on your Dashboard next month.
              </p>
            </div>

            <div className="h-[1px] w-full bg-[var(--border)]" />

            {/* Field 6 */}
            <div className="space-y-2">
              <span className="text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold">
                MEMORABLE MOMENTS
              </span>
              <p className="text-sm text-[var(--text-primary)] font-serif italic whitespace-pre-wrap leading-relaxed">
                {memorableMoments || <span className="font-mono not-italic text-xs text-[var(--text-muted)]">— No Moments Recorded</span>}
              </p>
            </div>

            <div className="h-[1px] w-full bg-[var(--border)]" />

            {/* Field 7 */}
            <div className="space-y-2">
              <span className="text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold">
                FINAL REFLECTION
              </span>
              <p className="text-sm text-[var(--text-primary)] font-serif italic whitespace-pre-wrap leading-relaxed">
                {finalReflection || <span className="font-mono not-italic text-xs text-[var(--text-muted)]">— No Reflection Recorded</span>}
              </p>
            </div>

            <div className="pt-4 border-t border-[var(--border)] flex justify-end">
              <button
                type="button"
                onClick={() => setMode('write')}
                className="px-4 py-2 bg-[var(--accent)] text-white rounded-[6px] font-mono text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <Edit3 size={13} />
                <span>Edit Reflection</span>
              </button>
            </div>
          </div>
        ) : (
          /* WRITE MODE — BORDERLESS TEXTAREAS WITH HAIRLINE ONLY, 40px GAP + SEPARATING HAIRLINES */
          <div
            className="rounded-[8px] border font-mono"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
              padding: '32px',
            }}
          >
            {/* Field 1: What Went Well This Month? */}
            <div className="space-y-2 group">
              <label className="block text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold">
                WHAT WENT WELL THIS MONTH?
              </label>
              {/* Below label: 1px hairline, full width. Focus state turns accent color */}
              <div className="h-[1px] w-full bg-[var(--border)] group-focus-within:bg-[var(--accent)] transition-colors" />
              <textarea
                value={whatWentWell}
                onChange={e => setWhatWentWell(e.target.value)}
                onBlur={handleAutoSave}
                placeholder="What went well this month? Celebrate your consistency, habits that stuck, or routines that felt effortless..."
                rows={3}
                className="w-full min-h-[120px] bg-transparent border-0 p-2 font-mono text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:opacity-40 focus:outline-none focus:ring-0 resize-y"
              />
            </div>

            {/* Separator Hairline between fields: 40px gap */}
            <div className="h-[1px] w-full bg-[var(--border)] my-10" />

            {/* Field 2: What Habit Needs The Most Work? */}
            <div className="space-y-2 group">
              <label className="block text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold">
                WHAT HABIT NEEDS THE MOST WORK?
              </label>
              <div className="h-[1px] w-full bg-[var(--border)] group-focus-within:bg-[var(--accent)] transition-colors" />
              <textarea
                value={habitNeedsWork}
                onChange={e => setHabitNeedsWork(e.target.value)}
                onBlur={handleAutoSave}
                placeholder="What habit needs the most work? What was causing friction or missed days..."
                rows={3}
                className="w-full min-h-[120px] bg-transparent border-0 p-2 font-mono text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:opacity-40 focus:outline-none focus:ring-0 resize-y"
              />
            </div>

            <div className="h-[1px] w-full bg-[var(--border)] my-10" />

            {/* Field 3: Biggest Win This Month */}
            <div className="space-y-2 group">
              <label className="block text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold">
                BIGGEST WIN THIS MONTH
              </label>
              <div className="h-[1px] w-full bg-[var(--border)] group-focus-within:bg-[var(--accent)] transition-colors" />
              <textarea
                value={biggestWin}
                onChange={e => setBiggestWin(e.target.value)}
                onBlur={handleAutoSave}
                placeholder="Biggest win this month — a milestone reached, a breakthrough day, or a personal best..."
                rows={3}
                className="w-full min-h-[120px] bg-transparent border-0 p-2 font-mono text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:opacity-40 focus:outline-none focus:ring-0 resize-y"
              />
            </div>

            <div className="h-[1px] w-full bg-[var(--border)] my-10" />

            {/* Field 4: One Thing To Change Next Month */}
            <div className="space-y-2 group">
              <label className="block text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold">
                ONE THING TO CHANGE NEXT MONTH
              </label>
              <div className="h-[1px] w-full bg-[var(--border)] group-focus-within:bg-[var(--accent)] transition-colors" />
              <textarea
                value={oneThingToChange}
                onChange={e => setOneThingToChange(e.target.value)}
                onBlur={handleAutoSave}
                placeholder="One thing to change next month — an adjustment to your schedule, environment, or triggers..."
                rows={3}
                className="w-full min-h-[120px] bg-transparent border-0 p-2 font-mono text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:opacity-40 focus:outline-none focus:ring-0 resize-y"
              />
            </div>

            <div className="h-[1px] w-full bg-[var(--border)] my-10" />

            {/* Field 5: Goals For Next Month */}
            <div className="space-y-2 group">
              <label className="block text-[0.65rem] uppercase tracking-[0.16em] text-[var(--accent)] font-semibold">
                GOALS FOR NEXT MONTH
              </label>
              <div className="h-[1px] w-full bg-[var(--border)] group-focus-within:bg-[var(--accent)] transition-colors" />
              <textarea
                value={goalsNextMonth}
                onChange={e => setGoalsNextMonth(e.target.value)}
                onBlur={handleAutoSave}
                placeholder="Goals for next month — what will you focus on? This commitment will be pinned on your dashboard..."
                rows={3}
                className="w-full min-h-[120px] bg-transparent border-0 p-2 font-mono text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:opacity-40 focus:outline-none focus:ring-0 resize-y"
              />
              {/* Annotation below: tiny italic muted */}
              <p className="text-[0.7rem] font-serif italic text-[var(--text-muted)] opacity-80 pt-1">
                * This will appear on your Dashboard next month.
              </p>
            </div>

            <div className="h-[1px] w-full bg-[var(--border)] my-10" />

            {/* Field 6: Memorable Moments */}
            <div className="space-y-2 group">
              <label className="block text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold">
                MEMORABLE MOMENTS
              </label>
              <div className="h-[1px] w-full bg-[var(--border)] group-focus-within:bg-[var(--accent)] transition-colors" />
              <textarea
                value={memorableMoments}
                onChange={e => setMemorableMoments(e.target.value)}
                onBlur={handleAutoSave}
                placeholder="Memorable moments — experiences, realizations, books read, conversations worth keeping..."
                rows={3}
                className="w-full min-h-[120px] bg-transparent border-0 p-2 font-mono text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:opacity-40 focus:outline-none focus:ring-0 resize-y"
              />
            </div>

            <div className="h-[1px] w-full bg-[var(--border)] my-10" />

            {/* Field 7: Final Reflection */}
            <div className="space-y-2 group">
              <label className="block text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-muted)] font-semibold">
                FINAL REFLECTION
              </label>
              <div className="h-[1px] w-full bg-[var(--border)] group-focus-within:bg-[var(--accent)] transition-colors" />
              <textarea
                value={finalReflection}
                onChange={e => setFinalReflection(e.target.value)}
                onBlur={handleAutoSave}
                placeholder="Final reflection — what would you tell your future self looking back on this month?"
                rows={4}
                className="w-full min-h-[120px] bg-transparent border-0 p-2 font-mono text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:opacity-40 focus:outline-none focus:ring-0 resize-y"
              />
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom-Right Auto-Save Indicator: fixed, tiny, disappears 3s after save */}
      <AnimatePresence>
        {saveStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-40 bg-[var(--surface-raised)] border border-[var(--border)] px-3.5 py-1.5 rounded-full shadow-lg text-xs font-mono flex items-center gap-2 pointer-events-none select-none"
          >
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <span className="animate-spin inline-block w-2.5 h-2.5 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
                ○ Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Check size={13} />
                ● Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-amber-600 font-semibold">
                Save Failed
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
