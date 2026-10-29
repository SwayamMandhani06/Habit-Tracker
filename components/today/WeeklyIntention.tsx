'use client'
// components/today/WeeklyIntention.tsx — Subtle editable intention line, auto-cleared every Monday
import { useState, useEffect, useRef } from 'react'
import { saveWeeklyIntentionAction } from '@/actions/intention.actions'
import { getIsoWeek } from '@/lib/date'

interface Props {
  initialIntention?: string
}

export function WeeklyIntention({ initialIntention = '' }: Props) {
  const { year, week } = getIsoWeek()
  const storageKey = `weekly_intention_${year}_W${week}`
  const [intention, setIntention] = useState(initialIntention)
  const [lastSaved, setLastSaved] = useState(initialIntention)
  const [isEditing, setIsEditing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const inFlightRef = useRef(false)
  const pendingValueRef = useRef<string | null>(null)

  useEffect(() => {
    // Check localStorage cache if initial from server is empty
    if (!initialIntention && typeof window !== 'undefined') {
      const cached = localStorage.getItem(storageKey)
      if (cached) {
        setIntention(cached)
        setLastSaved(cached)
      }
    }
  }, [initialIntention, storageKey])

  const handleSave = async (val: string) => {
    setIsEditing(false)
    const trimmed = val.trim()
    if (trimmed === lastSaved) return

    if (inFlightRef.current) {
      pendingValueRef.current = trimmed
      return
    }

    inFlightRef.current = true
    setErrorMsg(null)

    // Optimistically cache locally
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, trimmed)
    }

    try {
      const res = await saveWeeklyIntentionAction({
        year,
        weekNumber: week,
        intention: trimmed,
      })

      if (res?.error) {
        // Rollback
        setIntention(lastSaved)
        if (typeof window !== 'undefined') {
          localStorage.setItem(storageKey, lastSaved)
        }
        setErrorMsg('Failed to save intention')
      } else {
        setLastSaved(trimmed)
      }
    } catch {
      setIntention(lastSaved)
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, lastSaved)
      }
      setErrorMsg('Network error saving intention')
    } finally {
      inFlightRef.current = false
      if (pendingValueRef.current !== null) {
        const nextVal = pendingValueRef.current
        pendingValueRef.current = null
        handleSave(nextVal)
      }
    }
  }

  return (
    <div className="flex flex-col mb-4">
      <div className="flex items-center gap-2 font-mono text-xs text-[var(--text-muted)] py-1.5 border-b border-[var(--border)]">
        <span className="shrink-0 tracking-wider text-[0.68rem] uppercase font-medium text-[var(--text-muted)]">
          THIS WEEK&apos;S INTENTION:
        </span>

        <input
          type="text"
          aria-label="This week's intention focus"
          value={intention}
          onChange={e => setIntention(e.target.value)}
          onFocus={() => {
            setIsEditing(true)
            setErrorMsg(null)
          }}
          onBlur={e => handleSave(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
          placeholder="Set your focus or commitment for this week..."
          className="flex-1 bg-transparent border-0 border-b border-transparent focus:border-[var(--accent)] focus:outline-none focus:ring-0 px-1 py-0.5 font-mono text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:opacity-40 transition-colors"
        />
      </div>
      {errorMsg && (
        <span role="alert" className="text-[11px] font-mono text-red-500 mt-1">
          {errorMsg}
        </span>
      )}
    </div>
  )
}

