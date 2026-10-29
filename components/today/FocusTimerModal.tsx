'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Clock,
  Sparkles,
  Check,
  ChevronDown,
  Volume2,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import type { HabitWithSubitems } from '@/lib/supabase/types'
import { playCompletionChime } from '@/lib/audio'

interface Props {
  isOpen: boolean
  onClose: () => void
  habit?: HabitWithSubitems | null
  habits?: HabitWithSubitems[]
  onCompleteHabit?: (habitId: string) => void
}

const PRESETS = [
  { label: '15m', seconds: 15 * 60 },
  { label: '25m', seconds: 25 * 60 },
  { label: '45m', seconds: 45 * 60 },
  { label: '60m', seconds: 60 * 60 },
  { label: '90m', seconds: 90 * 60 },
]

export function FocusTimerModal({
  isOpen,
  onClose,
  habit,
  habits = [],
  onCompleteHabit,
}: Props) {
  const [clockMode, setClockMode] = useState<'flip' | 'ring'>('flip')
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(habit?.id ?? null)
  const [totalSeconds, setTotalSeconds] = useState(25 * 60)
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [autoComplete, setAutoComplete] = useState(true)
  const [sessionCompleted, setSessionCompleted] = useState(false)

  // Keep selected habit synced when prop changes
  useEffect(() => {
    if (habit) {
      setSelectedHabitId(habit.id)
    }
  }, [habit])

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning && remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            // Timer finished
            setIsRunning(false)
            playCompletionChime()
            setSessionCompleted(true)
            if (autoComplete && selectedHabitId && onCompleteHabit) {
              onCompleteHabit(selectedHabitId)
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning, remainingSeconds, autoComplete, selectedHabitId, onCompleteHabit])

  // Keyboard shortcut listener (Escape to close, Space to toggle)
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault()
        setIsRunning((r) => !r)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const progressPct = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 0
  const elapsedPct = 100 - progressPct

  const selectedHabit = habits.find((h) => h.id === selectedHabitId) ?? habit

  const selectPreset = (secs: number) => {
    setIsRunning(false)
    setTotalSeconds(secs)
    setRemainingSeconds(secs)
    setSessionCompleted(false)
  }

  const addOneMinute = () => {
    setTotalSeconds((t) => t + 60)
    setRemainingSeconds((r) => r + 60)
  }

  const resetTimer = () => {
    setIsRunning(false)
    setRemainingSeconds(totalSeconds)
    setSessionCompleted(false)
  }

  const radius = 70
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (circumference * progressPct) / 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Blurred Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
      />

      {/* Main Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden z-10 flex flex-col justify-between"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-raised)]/40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
              FOCUS SESSION
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher: Flip vs Ring */}
            <div className="flex items-center p-0.5 rounded-full bg-[var(--surface-raised)] border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setClockMode('flip')}
                className={`font-mono text-[10px] font-bold px-3 py-1 rounded-full transition-all ${
                  clockMode === 'flip'
                    ? 'bg-[var(--accent)] text-white shadow-2xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Flip Clock
              </button>
              <button
                type="button"
                onClick={() => setClockMode('ring')}
                className={`font-mono text-[10px] font-bold px-3 py-1 rounded-full transition-all ${
                  clockMode === 'ring'
                    ? 'bg-[var(--accent)] text-white shadow-2xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Ring Clock
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-all"
              aria-label="Close Focus Timer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 flex flex-col items-center">
          {/* Linked Habit Selector / Pill */}
          <div className="w-full mb-6">
            <div className="p-3 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Clock size={16} className="text-[var(--accent)] flex-shrink-0" />
                <div className="min-w-0">
                  <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">
                    LINKED HABIT
                  </span>
                  <span className="font-mono text-xs font-bold text-[var(--text-primary)] truncate block">
                    {selectedHabit ? selectedHabit.name : 'Unlinked Focus Session'}
                  </span>
                </div>
              </div>

              {habits.length > 0 && (
                <select
                  value={selectedHabitId ?? ''}
                  onChange={(e) => setSelectedHabitId(e.target.value || null)}
                  className="font-mono text-xs px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="">(None / General Focus)</option>
                  {habits.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {PRESETS.map((p) => {
              const active = totalSeconds === p.seconds
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => selectPreset(p.seconds)}
                  className={`font-mono text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                    active
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs'
                      : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          {/* Clock Display */}
          {clockMode === 'flip' ? (
            <div className="flex items-center justify-center gap-4 my-2 select-none">
              {/* Minutes Card */}
              <div className="flex flex-col items-center">
                <div
                  className="relative w-28 sm:w-36 h-28 sm:h-32 rounded-2xl bg-[#1C1A17] text-[#F7F5F2] border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden"
                  style={{
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.1)',
                  }}
                >
                  <span className="font-mono text-5xl sm:text-6xl font-black tracking-tight">
                    {String(minutes).padStart(2, '0')}
                  </span>
                  {/* Mechanical center slit line */}
                  <div className="absolute inset-x-0 top-1/2 h-[1.5px] bg-black shadow-xs pointer-events-none" />
                </div>
                <span className="font-mono text-[10px] text-[var(--text-muted)] mt-2 font-bold uppercase tracking-wider">
                  MINUTES
                </span>
              </div>

              {/* Colon Separator */}
              <div className="flex flex-col gap-2 font-mono text-3xl font-black text-[var(--accent)] opacity-80 mb-5">
                <span>:</span>
              </div>

              {/* Seconds Card */}
              <div className="flex flex-col items-center">
                <div
                  className="relative w-28 sm:w-36 h-28 sm:h-32 rounded-2xl bg-[#1C1A17] text-[#F7F5F2] border border-white/10 shadow-2xl flex items-center justify-center overflow-hidden"
                  style={{
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.1)',
                  }}
                >
                  <span className="font-mono text-5xl sm:text-6xl font-black tracking-tight">
                    {String(seconds).padStart(2, '0')}
                  </span>
                  {/* Mechanical center slit line */}
                  <div className="absolute inset-x-0 top-1/2 h-[1.5px] bg-black shadow-xs pointer-events-none" />
                </div>
                <span className="font-mono text-[10px] text-[var(--text-muted)] mt-2 font-bold uppercase tracking-wider">
                  SECONDS
                </span>
              </div>
            </div>
          ) : (
            /* Ring Clock View */
            <div className="relative w-56 h-56 my-2 flex items-center justify-center select-none">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                {/* Track */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="6"
                />
                {/* Animated Ring */}
                <motion.circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 0.5, ease: 'linear' }}
                  strokeLinecap="round"
                />
              </svg>

              <div className="absolute flex flex-col items-center text-center">
                <span className="font-mono text-4xl sm:text-5xl font-black tracking-tight">
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </span>
                <span className="font-mono text-[10px] text-[var(--text-muted)] font-semibold mt-1">
                  {Math.round(elapsedPct)}% COMPLETE
                </span>
              </div>
            </div>
          )}

          {/* Session Finished Notification */}
          <AnimatePresence>
            {sessionCompleted && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-4 p-3.5 rounded-2xl bg-[var(--surface-raised)] border border-[var(--accent)] shadow-lg flex items-center gap-3 text-center"
              >
                <Sparkles size={18} className="text-amber-500 animate-spin flex-shrink-0" />
                <span className="font-mono text-xs font-bold text-[var(--accent)]">
                  Session Completed! {autoComplete && selectedHabitId ? 'Habit marked as done.' : ''}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Primary Controls */}
          <div className="flex items-center justify-center gap-4 mt-8">
            {/* Reset */}
            <button
              type="button"
              onClick={resetTimer}
              className="w-12 h-12 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)] flex items-center justify-center hover:border-[var(--accent)] active:scale-95 transition-all shadow-xs"
              title="Reset timer"
            >
              <RotateCcw size={16} />
            </button>

            {/* Play / Pause Primary Pill */}
            <button
              type="button"
              onClick={() => setIsRunning(!isRunning)}
              className="px-9 py-3.5 rounded-full bg-[var(--accent)] text-white font-mono text-sm font-bold shadow-lg flex items-center gap-2.5 active:scale-95 hover:opacity-90 transition-all"
            >
              {isRunning ? <Pause size={17} /> : <Play size={17} />}
              <span>{isRunning ? 'Pause' : 'Start Focus'}</span>
            </button>

            {/* +1 Min */}
            <button
              type="button"
              onClick={addOneMinute}
              className="w-12 h-12 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)] flex items-center justify-center font-mono text-xs font-bold hover:border-[var(--accent)] active:scale-95 transition-all shadow-xs"
              title="Add 1 minute"
            >
              +1m
            </button>
          </div>

          {/* Auto-complete Toggle Option */}
          <div className="mt-8 flex items-center gap-2 select-none">
            <input
              type="checkbox"
              id="autoCompleteToggle"
              checked={autoComplete}
              onChange={(e) => setAutoComplete(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
            />
            <label
              htmlFor="autoCompleteToggle"
              className="font-mono text-xs text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)]"
            >
              Auto-mark habit completed when session finishes
            </label>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

