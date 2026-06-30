'use client'
// components/review/MonthlyReviewClient.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { MonthReview, HabitMonthlyStat } from '@/lib/supabase/types'
import { upsertMonthReviewAction } from '@/actions/review.actions'

interface Props {
  year: number
  month: number
  avgCompletion: number
  avgSleep: number | null
  bestHabit: HabitMonthlyStat | null
  worstHabit: HabitMonthlyStat | null
  review: MonthReview | null
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function Field({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; rows?: number
}) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: '0.6875rem',
        fontFamily: 'var(--font-mono)',
        color: 'var(--ink-tertiary)',
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        marginBottom: 8,
      }}>
        {label}
      </label>
      <textarea
        className="input textarea"
        value={value}
        rows={rows}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ fontSize: '0.875rem' }}
      />
    </div>
  )
}

export function MonthlyReviewClient({ year, month, avgCompletion, avgSleep, bestHabit, worstHabit, review }: Props) {
  const router = useRouter()
  const [lessons, setLessons] = useState(review?.lessons_learned ?? '')
  const [achievement, setAchievement] = useState(review?.biggest_achievement ?? '')
  const [goals, setGoals] = useState(review?.goals_next_month ?? '')
  const [reflection, setReflection] = useState(review?.final_reflection ?? '')
  const [moments, setMoments] = useState(review?.memorable_moments ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const prevMonth = () => {
    const m = month === 1 ? 12 : month - 1
    const y = month === 1 ? year - 1 : year
    router.push(`/review?year=${y}&month=${m}`)
  }
  const nextMonth = () => {
    const m = month === 12 ? 1 : month + 1
    const y = month === 12 ? year + 1 : year
    router.push(`/review?year=${y}&month=${m}`)
  }

  const handleSave = async () => {
    setSaving(true)
    await upsertMonthReviewAction({
      year, month,
      lessons_learned: lessons || null,
      biggest_achievement: achievement || null,
      goals_next_month: goals || null,
      final_reflection: reflection || null,
      memorable_moments: moments || null,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="page-container">
      {/* Path */}
      <motion.p className="text-path" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: 6 }}>
        ~/ review
      </motion.p>

      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', color: 'var(--ink-primary)' }}>
          monthly review
        </h1>
      </motion.div>

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <button className="btn-icon" onClick={prevMonth}><ChevronLeft size={16} /></button>
        <h2 style={{
          fontSize: '0.9375rem',
          fontWeight: 400,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.01em',
          color: 'var(--ink-primary)',
        }}>
          <span className="bracket">[ </span>
          {MONTHS[month - 1].toLowerCase()} {year}
          <span className="bracket"> ]</span>
        </h2>
        <button className="btn-icon" onClick={nextMonth}><ChevronRight size={16} /></button>
      </div>

      {/* Goals this month (carried from prior review) */}
      {review?.goals_this_month && (
        <div style={{
          borderLeft: '2px solid var(--accent)',
          paddingLeft: 16,
          marginBottom: 24,
        }}>
          <p className="text-label" style={{ color: 'var(--accent)', marginBottom: 6 }}>goals this month</p>
          <p style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)', lineHeight: 1.7 }}>
            {review.goals_this_month}
          </p>
        </div>
      )}

      {/* Auto-calculated stats */}
      <div className="section-header" style={{ marginBottom: 14 }}>
        <span className="section-label">STATS</span>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 300, fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: '-0.02em' }}>
              {Math.round(avgCompletion)}%
            </span>
            <span className="text-label">completion</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 300, fontFamily: 'var(--font-mono)', color: 'var(--ink-primary)', letterSpacing: '-0.02em' }}>
              {avgSleep != null ? avgSleep.toFixed(1) : '—'}
            </span>
            <span className="text-label">avg sleep</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)', textAlign: 'center', lineHeight: 1.3, fontWeight: 400 }}>
              {bestHabit?.habit_name?.split(' ').slice(0, 2).join(' ') ?? '—'}
            </span>
            <span className="text-label">best habit</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)', textAlign: 'center', lineHeight: 1.3, fontWeight: 400 }}>
              {worstHabit?.habit_name?.split(' ').slice(0, 2).join(' ') ?? '—'}
            </span>
            <span className="text-label">needs work</span>
          </div>
        </div>
      </div>

      {/* Journal fields */}
      <div className="section-header" style={{ marginBottom: 14 }}>
        <span className="section-label">REFLECTION</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        <Field label="Biggest Achievement" value={achievement} onChange={setAchievement}
          placeholder="what was your biggest win this month?" />
        <Field label="Lessons Learned" value={lessons} onChange={setLessons}
          placeholder="what did you learn? what patterns did you notice?" rows={4} />
        <Field label="Memorable Moments" value={moments} onChange={setMoments}
          placeholder="moments worth remembering from this month..." />
        <Field label="Final Reflection" value={reflection} onChange={setReflection}
          placeholder="overall, how was this month? what would you tell your future self?" rows={4} />
        <Field label="Goals for Next Month" value={goals} onChange={setGoals}
          placeholder="what do you want to focus on next month? these will carry forward." rows={3} />
      </div>

      <button
        className="btn btn-primary"
        onClick={handleSave}
        disabled={saving}
        style={{ width: '100%', padding: '11px', fontSize: '0.875rem', letterSpacing: '0.04em' }}
      >
        {saving ? 'saving...' : saved ? '✓ saved' : 'save review'}
      </button>
    </div>
  )
}
