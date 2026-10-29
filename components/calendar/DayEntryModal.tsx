'use client'
// components/calendar/DayEntryModal.tsx — Click any day to view/edit its entry
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { HabitWithSubitems } from '@/lib/supabase/types'
import { SignalBarSelector } from '@/components/today/SignalBarSelector'
import { HabitRow } from '@/components/today/HabitRow'
import { toggleHabitCompletionAction, toggleSubitemCompletionAction, toggleHabitSkipAction } from '@/actions/completion.actions'
import { updateDayEntryAction } from '@/actions/entry.actions'

interface Props {
  date: string
  habits: HabitWithSubitems[]
  onClose: () => void
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

export function DayEntryModal({ date, habits, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [habitComps, setHabitComps] = useState<Record<string, boolean>>({})
  const [habitSkips, setHabitSkips] = useState<Record<string, boolean>>({})
  const [subitemComps, setSubitemComps] = useState<Record<string, boolean>>({})
  const [mood, setMood] = useState<number | null>(null)
  const [energy, setEnergy] = useState<number | null>(null)
  const [sleep, setSleep] = useState('')
  const [weight, setWeight] = useState('')
  const [screenTime, setScreenTime] = useState('')
  const [notes, setNotes] = useState('')
  const [entryId, setEntryId] = useState<string | null>(null)

  const modalRef = useRef<HTMLDivElement>(null)
  const pendingUpdatesRef = useRef<{
    notes?: string
    sleep_hours?: number | null
    weight_kg?: number | null
    screen_time_minutes?: number | null
  }>({})
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const d = new Date(date + 'T00:00:00')
  const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]
  const dateLabel = `${dayName}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    const updates = { ...pendingUpdatesRef.current }
    if (Object.keys(updates).length === 0) return
    pendingUpdatesRef.current = {}
    await updateDayEntryAction({ date, ...updates })
    router.refresh()
  }, [date, router])

  const scheduleSave = useCallback((updates: {
    notes?: string
    sleep_hours?: number | null
    weight_kg?: number | null
    screen_time_minutes?: number | null
  }) => {
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      await flushSave()
    }, 800)
  }, [flushSave])

  const handleClose = useCallback(async () => {
    await flushSave()
    router.refresh()
    onClose()
  }, [flushSave, router, onClose])

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleClose])

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  // Focus trap inside modal
  useEffect(() => {
    const modalEl = modalRef.current
    if (!modalEl || loading) return

    const focusable = modalEl.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length > 0) {
      focusable[0].focus()
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const elements = modalEl.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (elements.length === 0) return
      const first = elements[0]
      const last = elements[elements.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    modalEl.addEventListener('keydown', handleTab)
    return () => modalEl.removeEventListener('keydown', handleTab)
  }, [loading])

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
          setHabitComps(data.completions.habitCompletions ?? {})
          setHabitSkips(data.completions.habitSkips ?? {})
          setSubitemComps(data.completions.subitemCompletions ?? {})
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
    router.refresh()
  }
  const handleEnergyChange = async (v: number) => {
    setEnergy(v)
    await updateDayEntryAction({ date, energy: v })
    router.refresh()
  }
  const handleToggleHabit = async (habitId: string) => {
    const next = !(habitComps[habitId] ?? false)
    setHabitComps(prev => ({ ...prev, [habitId]: next }))
    if (next && habitSkips[habitId]) {
      setHabitSkips(prev => ({ ...prev, [habitId]: false }))
    }
    await toggleHabitCompletionAction({ date, habitId, isCompleted: next })
    router.refresh()
  }
  const handleToggleSkip = async (habitId: string) => {
    const next = !(habitSkips[habitId] ?? false)
    setHabitSkips(prev => ({ ...prev, [habitId]: next }))
    if (next) {
      setHabitComps(prev => ({ ...prev, [habitId]: false }))
    }
    await toggleHabitSkipAction({ date, habitId, isSkipped: next })
    router.refresh()
  }
  const handleToggleSubitem = async (habitId: string, subitemId: string, allIds: string[]) => {
    const next = !(subitemComps[subitemId] ?? false)
    const updated = { ...subitemComps, [subitemId]: next }
    setSubitemComps(updated)
    const allDone = allIds.every(id => updated[id] === true)
    setHabitComps(prev => ({ ...prev, [habitId]: allDone }))
    if (next && habitSkips[habitId]) {
      setHabitSkips(prev => ({ ...prev, [habitId]: false }))
    }
    await toggleSubitemCompletionAction({ date, habitId, subitemId, isCompleted: next, allSubitemIds: allIds, currentSubitemCompletions: updated })
    router.refresh()
  }

  // Habits that existed on or before this date
  const eligibleHabits = habits.filter(h => {
    if (h.created_at && date < h.created_at.slice(0, 10)) return false
    if (h.is_archived && h.archived_at && date > h.archived_at.slice(0, 10)) return false
    return true
  })

  const activeHabits = eligibleHabits.filter(h => !habitSkips[h.id])
  const completedCount = activeHabits.filter(h => habitComps[h.id] === true).length
  const totalCount = activeHabits.length
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
        }}
      />

      {/* Modal */}
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-entry-modal-title"
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
            <h2 id="day-entry-modal-title" style={{ fontSize: '1.125rem', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--ink-primary)' }}>
              {dateLabel}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="text-mono" style={{ fontSize: '1.25rem', fontWeight: 300, color: 'var(--accent)' }}>
              {pct}%
            </span>
            <button className="btn-icon" onClick={handleClose} aria-label="Close dialog">
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
              {eligibleHabits.length === 0 ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--ink-tertiary)', padding: '12px 0' }}>
                  No habits active for this date.
                </p>
              ) : (
                eligibleHabits.map(habit => (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    isCompleted={habitComps[habit.id] ?? false}
                    isSkipped={habitSkips[habit.id] ?? false}
                    subitemCompletions={subitemComps}
                    onToggle={() => handleToggleHabit(habit.id)}
                    onToggleSkip={() => handleToggleSkip(habit.id)}
                    onToggleSubitem={(sid, allIds) => handleToggleSubitem(habit.id, sid, allIds)}
                  />
                ))
              )}
            </div>

            {/* Wellbeing: Mood & Energy */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div className="card card-sm">
                <p style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)', marginBottom: '8px' }}>Mood</p>
                <SignalBarSelector value={mood} onChange={handleMoodChange} label="Mood" />
              </div>
              <div className="card card-sm">
                <p style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)', marginBottom: '8px' }}>Energy</p>
                <SignalBarSelector value={energy} onChange={handleEnergyChange} label="Energy" />
              </div>
            </div>

            {/* Health & Focus Metrics: Sleep, Weight, Screen Time */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
              <div className="card card-sm">
                <p style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)', marginBottom: '6px' }}>Sleep (Hrs)</p>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  className="input"
                  aria-label="Sleep in hours"
                  value={sleep}
                  placeholder="7.5"
                  style={{ width: '100%', fontSize: '0.8125rem', padding: '6px 8px' }}
                  onChange={e => {
                    setSleep(e.target.value)
                    scheduleSave({ sleep_hours: e.target.value ? parseFloat(e.target.value) : null })
                  }}
                  onBlur={flushSave}
                />
              </div>
              <div className="card card-sm">
                <p style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)', marginBottom: '6px' }}>Weight (Kg)</p>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="input"
                  aria-label="Weight in kg"
                  value={weight}
                  placeholder="70.0"
                  style={{ width: '100%', fontSize: '0.8125rem', padding: '6px 8px' }}
                  onChange={e => {
                    setWeight(e.target.value)
                    scheduleSave({ weight_kg: e.target.value ? parseFloat(e.target.value) : null })
                  }}
                  onBlur={flushSave}
                />
              </div>
              <div className="card card-sm">
                <p style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)', marginBottom: '6px' }}>Screen (Mins)</p>
                <input
                  type="number"
                  min="0"
                  step="5"
                  className="input"
                  aria-label="Screen time in minutes"
                  value={screenTime}
                  placeholder="120"
                  style={{ width: '100%', fontSize: '0.8125rem', padding: '6px 8px' }}
                  onChange={e => {
                    setScreenTime(e.target.value)
                    scheduleSave({ screen_time_minutes: e.target.value ? parseInt(e.target.value, 10) : null })
                  }}
                  onBlur={flushSave}
                />
              </div>
            </div>

            {/* Reflections / Notes */}
            <div className="card card-sm" style={{ marginBottom: '10px' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)', marginBottom: '8px' }}>Notes</p>
              <textarea
                className="input textarea"
                value={notes}
                rows={3}
                aria-label="Notes reflections for this day"
                onChange={e => {
                  setNotes(e.target.value)
                  scheduleSave({ notes: e.target.value })
                }}
                onBlur={flushSave}
                placeholder="Reflections for this day..."
              />
            </div>
          </>
        )}
      </motion.div>
    </>
  )
}
