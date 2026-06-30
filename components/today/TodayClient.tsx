'use client'
// components/today/TodayClient.tsx — Full interactive Today check-in
import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { HabitWithSubitems, DayEntry, DayCompletionState } from '@/lib/supabase/types'
import { toggleHabitCompletionAction, toggleSubitemCompletionAction } from '@/actions/completion.actions'
import { updateDayEntryAction } from '@/actions/entry.actions'
import { HabitRow } from './HabitRow'
import { SignalBarSelector } from './SignalBarSelector'
import { CelebrationOverlay } from './CelebrationOverlay'

interface Props {
  date: string
  entry: DayEntry
  habits: HabitWithSubitems[]
  completions: DayCompletionState
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

// Reusable section header
function Section({ label }: { label: string }) {
  return (
    <div className="section-header" style={{ marginTop: 28, marginBottom: 12 }}>
      <span className="section-label">{label}</span>
    </div>
  )
}

export function TodayClient({ date, entry, habits, completions }: Props) {
  const [habitComps, setHabitComps] = useState(completions.habitCompletions)
  const [subitemComps, setSubitemComps] = useState(completions.subitemCompletions)

  const [mood, setMood] = useState<number | null>(entry.mood)
  const [energy, setEnergy] = useState<number | null>(entry.energy)
  const [sleep, setSleep] = useState<string>(entry.sleep_hours?.toString() ?? '')
  const [weight, setWeight] = useState<string>(entry.weight_kg?.toString() ?? '')
  const [screenTime, setScreenTime] = useState<string>(entry.screen_time_minutes?.toString() ?? '')
  const [notes, setNotes] = useState<string>(entry.notes ?? '')
  const [showCelebration, setShowCelebration] = useState(false)

  const completedCount = habits.filter(h => habitComps[h.id] === true).length
  const totalCount = habits.length
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const isPerfect = pct >= 100

  // Debounced auto-save
  const debouncedMood       = useDebounce(mood, 600)
  const debouncedEnergy     = useDebounce(energy, 600)
  const debouncedSleep      = useDebounce(sleep, 1000)
  const debouncedWeight     = useDebounce(weight, 1000)
  const debouncedScreenTime = useDebounce(screenTime, 1000)
  const debouncedNotes      = useDebounce(notes, 1500)

  useEffect(() => {
    updateDayEntryAction({
      date,
      mood: debouncedMood,
      energy: debouncedEnergy,
      sleep_hours: debouncedSleep ? parseFloat(debouncedSleep) : null,
      weight_kg: debouncedWeight ? parseFloat(debouncedWeight) : null,
      screen_time_minutes: debouncedScreenTime ? parseInt(debouncedScreenTime) : null,
      notes: debouncedNotes,
    })
  }, [date, debouncedMood, debouncedEnergy, debouncedSleep, debouncedWeight, debouncedScreenTime, debouncedNotes])

  const handleToggleHabit = useCallback(async (habitId: string) => {
    const next = !(habitComps[habitId] ?? false)
    setHabitComps(prev => ({ ...prev, [habitId]: next }))
    await toggleHabitCompletionAction({ date, habitId, isCompleted: next })
  }, [habitComps, date])

  const handleToggleSubitem = useCallback(async (habitId: string, subitemId: string, allSubitemIds: string[]) => {
    const next = !(subitemComps[subitemId] ?? false)
    const updatedSubComps = { ...subitemComps, [subitemId]: next }
    setSubitemComps(updatedSubComps)
    const allDone = allSubitemIds.every(id => updatedSubComps[id] === true)
    setHabitComps(prev => ({ ...prev, [habitId]: allDone }))
    await toggleSubitemCompletionAction({ date, habitId, subitemId, isCompleted: next, allSubitemIds, currentSubitemCompletions: updatedSubComps })
  }, [subitemComps, date])

  const prevPctRef = { current: pct }
  useEffect(() => {
    if (pct >= 100 && prevPctRef.current < 100) {
      setShowCelebration(true)
      setTimeout(() => setShowCelebration(false), 1600)
    }
    prevPctRef.current = pct
  }, [pct])

  const d = new Date(date + 'T00:00:00')
  const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]
  const dateLabel = `${dayName.toLowerCase()}, ${MONTH_NAMES[d.getMonth()].toLowerCase()} ${d.getDate()}`

  return (
    <div className="page-container">
      <AnimatePresence>{showCelebration && <CelebrationOverlay />}</AnimatePresence>

      {/* Path breadcrumb */}
      <motion.p
        className="text-path"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ marginBottom: 6 }}
      >
        ~/ today
      </motion.p>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        style={{ marginBottom: 24 }}
      >
        <p style={{
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--ink-tertiary)',
          marginBottom: 6,
          letterSpacing: '0.03em',
        }}>
          {dateLabel}
        </p>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '-0.02em',
            color: 'var(--ink-primary)',
          }}>
            check-in
          </h1>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{
              fontSize: '1.75rem',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '-0.03em',
              color: isPerfect ? 'var(--accent)' : 'var(--ink-primary)',
            }}>
              {pct}%
            </span>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)' }}>
              {completedCount}/{totalCount}
            </span>
          </div>
        </div>

        {/* Progress track */}
        <div className="progress-track" style={{ marginTop: 12 }}>
          <motion.div
            className="progress-fill"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: pct / 100 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
        </div>
      </motion.div>

      {/* HABITS section */}
      <Section label="HABITS" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {habits.map((habit, i) => (
          <motion.div
            key={habit.id}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.025, type: 'spring', stiffness: 300, damping: 26 }}
          >
            <HabitRow
              habit={habit}
              isCompleted={habitComps[habit.id] ?? false}
              subitemCompletions={subitemComps}
              onToggle={() => handleToggleHabit(habit.id)}
              onToggleSubitem={(subitemId, allIds) => handleToggleSubitem(habit.id, subitemId, allIds)}
            />
          </motion.div>
        ))}
      </div>

      {/* WELLBEING section */}
      <Section label="WELLBEING" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        {/* Mood */}
        <div className="card" style={{ padding: '14px 16px' }}>
          <p className="text-label" style={{ marginBottom: 10 }}>mood</p>
          <SignalBarSelector value={mood} onChange={setMood} color="var(--accent)" />
        </div>
        {/* Energy */}
        <div className="card" style={{ padding: '14px 16px' }}>
          <p className="text-label" style={{ marginBottom: 10 }}>energy</p>
          <SignalBarSelector value={energy} onChange={setEnergy} color="var(--accent)" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div className="card" style={{ padding: '14px 16px' }}>
          <p className="text-label" style={{ marginBottom: 8 }}>sleep (hrs)</p>
          <input className="input" type="number" min="0" max="24" step="0.5"
            value={sleep} onChange={e => setSleep(e.target.value)}
            placeholder="7.5" style={{ padding: '6px 10px', fontSize: '0.875rem' }} />
        </div>
        <div className="card" style={{ padding: '14px 16px' }}>
          <p className="text-label" style={{ marginBottom: 8 }}>weight (kg)</p>
          <input className="input" type="number" min="0" step="0.1"
            value={weight} onChange={e => setWeight(e.target.value)}
            placeholder="70.0" style={{ padding: '6px 10px', fontSize: '0.875rem' }} />
        </div>
        <div className="card" style={{ padding: '14px 16px' }}>
          <p className="text-label" style={{ marginBottom: 8 }}>screen (min)</p>
          <input className="input" type="number" min="0" step="5"
            value={screenTime} onChange={e => setScreenTime(e.target.value)}
            placeholder="120" style={{ padding: '6px 10px', fontSize: '0.875rem' }} />
        </div>
      </div>

      {/* Notes */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <p className="text-label" style={{ marginBottom: 8 }}>notes</p>
        <textarea
          className="input textarea"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="how did today go? any reflections..."
          rows={3}
        />
      </div>

    </div>
  )
}
