// lib/habit-theme.ts — Habit color palette and icon registry
import React from 'react'
import {
  Check,
  Droplet,
  Dumbbell,
  Zap,
  Footprints,
  BookOpen,
  Flame,
  Heart,
  Moon,
  Sun,
  Coffee,
  Crosshair,
  Smile,
  PenTool,
  Clock,
  Award,
  Shield,
  Sparkles,
  Activity,
  Feather,
  Compass,
  Anchor,
  Star,
  Target,
  Sunrise,
} from 'lucide-react'

export const HABIT_COLORS = [
  { id: 'sage', label: 'Sage', lightHex: '#5C6B5A', darkHex: '#7AA080' },
  { id: 'clay', label: 'Clay', lightHex: '#A36B54', darkHex: '#D98B6C' },
  { id: 'sky', label: 'Sky', lightHex: '#4A7A96', darkHex: '#68A8D0' },
  { id: 'amber', label: 'Amber', lightHex: '#B87D3B', darkHex: '#E29B4A' },
  { id: 'plum', label: 'Plum', lightHex: '#7D5A88', darkHex: '#B386C2' },
  { id: 'rose', label: 'Rose', lightHex: '#A85868', darkHex: '#D97387' },
  { id: 'slate', label: 'Slate', lightHex: '#5A6672', darkHex: '#8899AA' },
  { id: 'teal', label: 'Teal', lightHex: '#487A72', darkHex: '#63ABA0' },
] as const

export type HabitColorId = typeof HABIT_COLORS[number]['id']

export const HABIT_ICONS = [
  { id: 'check', label: 'Check', Component: Check },
  { id: 'droplet', label: 'Water', Component: Droplet },
  { id: 'dumbbell', label: 'Workout', Component: Dumbbell },
  { id: 'zap', label: 'Focus', Component: Zap },
  { id: 'footprints', label: 'Steps', Component: Footprints },
  { id: 'book', label: 'Reading', Component: BookOpen },
  { id: 'flame', label: 'Streak', Component: Flame },
  { id: 'heart', label: 'Health', Component: Heart },
  { id: 'sunrise', label: 'Morning', Component: Sunrise },
  { id: 'moon', label: 'Night', Component: Moon },
  { id: 'sun', label: 'Day', Component: Sun },
  { id: 'coffee', label: 'Ritual', Component: Coffee },
  { id: 'crosshair', label: 'Target', Component: Crosshair },
  { id: 'smile', label: 'Mood', Component: Smile },
  { id: 'pen-tool', label: 'Journal', Component: PenTool },
  { id: 'clock', label: 'Timer', Component: Clock },
  { id: 'award', label: 'Milestone', Component: Award },
  { id: 'shield', label: 'Discipline', Component: Shield },
  { id: 'sparkles', label: 'Clarity', Component: Sparkles },
  { id: 'activity', label: 'Energy', Component: Activity },
  { id: 'feather', label: 'Calm', Component: Feather },
  { id: 'compass', label: 'Direction', Component: Compass },
  { id: 'anchor', label: 'Grounding', Component: Anchor },
  { id: 'star', label: 'Excellence', Component: Star },
  { id: 'target', label: 'Aim', Component: Target },
] as const

export type HabitIconId = typeof HABIT_ICONS[number]['id']

export const UNIT_PRESETS = [
  'glasses',
  'L',
  'ml',
  'steps',
  'pages',
  'min',
  'hours',
  'reps',
] as const

export function getHabitColorVar(color?: string | null): string {
  if (!color) return 'var(--habit-color-sage, var(--accent))'
  const found = HABIT_COLORS.find(c => c.id === color)
  if (found) return `var(--habit-color-${found.id})`
  return color.startsWith('#') || color.startsWith('rgb') ? color : 'var(--accent)'
}

export function renderHabitIcon(iconName?: string | null, size = 18, strokeWidth = 2.4): React.ReactNode {
  if (!iconName) return React.createElement(Check, { size, strokeWidth })
  const found = HABIT_ICONS.find(i => i.id === iconName)
  if (found) {
    return React.createElement(found.Component, { size, strokeWidth })
  }
  return React.createElement(Check, { size, strokeWidth })
}

