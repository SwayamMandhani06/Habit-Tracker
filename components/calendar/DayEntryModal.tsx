'use client'
// components/calendar/DayEntryModal.tsx — Click any day to view/edit its entry
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { HabitWithSubitems } from '@/lib/supabase/types'
import { SignalBarSelector } from '@/components/today/SignalBarSelector'
import { HabitRow } from '@/components/today/HabitRow'
import { toggleHabitCompletionAction, toggleSubitemCompletionAction } from '@/actions/completion.actions'
import { updateDayEntryAction } from '@/actions/entry.actions'

interface Props {
  date: string
  habits: HabitWithSubitems[]
  onClose: () => void
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

export function DayEntryModal({ date, habits, onClose }: Props) {
  const [loading, setLoading] = useState(true)
  const [habitComps, setHabitComps] = useState<Record<string, boolean>>({})
  const [subitemComps, setSubitemComps] = useState<Record<string, boolean>>({})
  const [mood, setMood] = useState<number | null>(null)
  const [energy, setEnergy] = useState<number | null>(null)
  const [sleep, setSleep] = useState('')
  const [weight, setWeight] = useState('')
  const [screenTime, setScreenTime] = useState('')
  const [notes, setNotes] = useState('')
  const [entryId, setEntryId] = useState<string | null>(null)

  const d = new Date(date + 'T00:00:00')
  const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]
  const dateLabel = `${dayName}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`

  // Load entry data
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/day-entry?date=${date}`)
        const data = await res.json()
        if (data.entry) {
          const e = data.entry
          setEntryId(e.id)
          setMood(e.mood)
          setEnergy(e.energy)
          setSleep(e.sleep_hours?.toString() ?? '')
          setWeight(e.weight_kg?.toString() ?? '')
          setScreenTime(e.screen_time_minutes?.toString() ?? '')
          setNotes(e.notes ?? '')
        }
        if (data.completions) {
          setHabitComps(data.completions.habitCompletions)
          setSubitemComps(data.completions.subitemCompletions)
        }
      } catch {
        // Entry may not exist yet
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [date])

  const handleMoodChange = async (v: number) => {
    setMood(v)
    await updateDayEntryAction({ date, mood: v })
  }
  const handleEnergyChange = async (v: number) => {
    setEnergy(v)
    await updateDayEntryAction({ date, energy: v })
  }
  const handleToggleHabit = async (habitId: string) => {
    const next = !(habitComps[habitId] ?? false)
    setHabitComps(prev => ({ ...prev, [habitId]: next }))
    await toggleHabitCompletionAction({ date, habitId, isCompleted: next })
  }
  const handleToggleSubitem = async (habitId: string, subitemId: string, allIds: string[]) => {
    const next = !(subitemComps[subitemId] ?? false)
    const updated = { ...subitemComps, [subitemId]: next }
    setSubitemComps(updated)
    const allDone = allIds.every(id => updated[id] === true)
    setHabitComps(prev => ({ ...prev, [habitId]: allDone }))
    await toggleSubitemCompletionAction({ date, habitId, subitemId, isCompleted: next, allSubitemIds: allIds, currentSubitemCompletions: updated })
  }

  const completedCount = habits.filter(h => habitComps[h.id] === true).length
  const pct = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
        }}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '90dvh',
          overflowY: 'auto',
          background: 'var(--bg-surface-1)',
          borderRadius: 'var(--radius-2xl) var(--radius-2xl) 0 0',
          zIndex: 101,
          padding: '24px 20px 40px',
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-strong)', margin: '0 auto 20px' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <p className="text-label" style={{ color: 'var(--ink-tertiary)', marginBottom: '2px' }}>Entry</p>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--ink-primary)' }}>
              {dateLabel}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="text-mono" style={{ fontSize: '1.25rem', fontWeight: 300, color: pct >= 100 ? 'var(--sage)' : 'var(--accent)' }}>
              {pct}%
            </span>
            <button className="btn-icon" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
          </div>
        ) : (
          <>
            {/* Habits */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '20px' }}>
              {habits.map(habit => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  isCompleted={habitComps[habit.id] ?? false}
                  subitemCompletions={subitemComps}
                  onToggle={() => handleToggleHabit(habit.id)}
                  onToggleSubitem={(sid, allIds) => handleToggleSubitem(habit.id, sid, allIds)}
                />
              ))}
            </div>

            {/* Wellbeing */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div className="card card-sm">
                <p style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)', marginBottom: '8px' }}>Mood</p>
                <SignalBarSelector value={mood} onChange={handleMoodChange} />
              </div>
              <div className="card card-sm">
                <p style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)', marginBottom: '8px' }}>Energy</p>
                <SignalBarSelector value={energy} onChange={handleEnergyChange} color="var(--sage)" />
              </div>
            </div>

            <div className="card card-sm" style={{ marginBottom: '10px' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)', marginBottom: '8px' }}>Notes</p>
              <textarea
                className="input textarea"
                value={notes}
                rows={3}
                onChange={e => {
                  setNotes(e.target.value)
                  updateDayEntryAction({ date, notes: e.target.value })
                }}
                placeholder="Reflections for this day..."
              />
            </div>
          </>
        )}
      </motion.div>
    </>
  )
}
