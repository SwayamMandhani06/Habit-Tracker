'use client'
// components/calendar/DayEntryModal.tsx — Click any day to view/edit its entry
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { X, Clock, Check } from 'lucide-react'
import type { HabitWithSubitems } from '@/lib/supabase/types'
import { SignalBarSelector } from '@/components/today/SignalBarSelector'
import { HabitRow } from '@/components/today/HabitRow'
import { toggleHabitCompletionAction, toggleSubitemCompletionAction, toggleHabitSkipAction } from '@/actions/completion.actions'
import { updateDayEntryAction } from '@/actions/entry.actions'
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet'

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
  const [noteTag, setNoteTag] = useState<'Note' | 'Planned' | 'Completed'>('Note')
  const [entryId, setEntryId] = useState<string | null>(null)

  const modalRef = useRef<HTMLDivElement>(null)
  const pendingUpdatesRef = useRef<{
    notes?: string
    sleep_hours?: number | null
    weight_kg?: number | null
    screen_time_minutes?: number | null
  }>({})
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [y, m, dayNum] = date.split('-').map(Number)
  const dUtc = new Date(Date.UTC(y, m - 1, dayNum))
  const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dUtc.getUTCDay()]
  const dateLabel = `${dayName}, ${MONTH_NAMES[m - 1]} ${dayNum}, ${y}`

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
          const rawNote = e.notes ?? ''
          setNotes(rawNote)
          if (rawNote.startsWith('[Planned]')) setNoteTag('Planned')
          else if (rawNote.startsWith('[Completed]')) setNoteTag('Completed')
          else setNoteTag('Note')
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
    <ResponsiveSheet
      isOpen={true}
      onClose={handleClose}
      title={dateLabel}
      description={`${pct}% completed · Habits and reflections`}
    >
      <div ref={modalRef} className="p-4 space-y-4 overflow-y-auto">
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

            {/* A Day Note — Streak Inspired Reflection Card */}
            <div className="card card-sm" style={{ marginBottom: '14px', padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                    A Day Note
                  </span>
                  {/* Type Chips */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {(['Note', 'Planned', 'Completed'] as const).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setNoteTag(tag)
                          const clean = notes.replace(/^\[(Note|Planned|Completed)\]\s*/, '')
                          const updated = `[${tag}] ${clean}`
                          setNotes(updated)
                          scheduleSave({ notes: updated })
                        }}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 99,
                          fontSize: '0.65rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: noteTag === tag ? 'var(--accent)' : 'var(--surface-raised)',
                          color: noteTag === tag ? '#FFFFFF' : 'var(--text-muted)',
                          border: `1px solid ${noteTag === tag ? 'var(--accent)' : 'var(--border)'}`,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'currentColor' }} />
                        <span>{tag}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  <Clock size={11} style={{ color: 'var(--accent)' }} />
                  <span>Target: 21:30</span>
                </div>
              </div>

              <textarea
                className="input textarea"
                value={notes}
                maxLength={500}
                rows={3}
                aria-label="Notes reflections for this day"
                onChange={e => {
                  setNotes(e.target.value)
                  scheduleSave({ notes: e.target.value })
                }}
                onBlur={flushSave}
                placeholder="Ten pages tonight, slower than usual but I kept going. How did today go?..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8125rem',
                  lineHeight: 1.5,
                  borderRadius: 'var(--radius-sm)',
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                <span>Reflect calmly &middot; auto-saved</span>
                <span style={{ color: notes.length > 450 ? 'var(--accent)' : undefined }}>
                  {notes.length} / 500 chars
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </ResponsiveSheet>
  )
}
