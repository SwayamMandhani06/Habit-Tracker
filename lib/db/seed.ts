// lib/db/seed.ts — Idempotent user-scoped seeding logic (server-only)
import { createServerClient } from '@/lib/supabase/server'
import { CURATED_DISCIPLINE_QUOTES } from '@/lib/db/quotes'

export const DEFAULT_HABITS_CONFIG = [
  {
    name: 'Morning Routine',
    type: 'checklist' as const,
    sort_order: 1,
    color: 'amber',
    icon: 'sunrise',
    subitems: [
      'No phone after waking up',
      'Make bed',
      'Brush teeth',
      'Wash face',
      'Drink water',
      'Morning sunlight',
      'Stretch',
      'Pray',
      'Plan Top 3 Tasks',
    ],
  },
  {
    name: 'Gym / Workout',
    type: 'checkbox' as const,
    sort_order: 2,
    color: 'rose',
    icon: 'dumbbell',
  },
  {
    name: '10k Steps',
    type: 'amount' as const,
    sort_order: 3,
    target_value: 10000,
    unit: 'steps',
    step_value: 1000,
    color: 'teal',
    icon: 'footprints',
  },
  {
    name: 'Drink 4L Water',
    type: 'amount' as const,
    sort_order: 4,
    target_value: 4,
    unit: 'L',
    step_value: 0.5,
    color: 'sky',
    icon: 'droplet',
  },
  {
    name: 'Healthy Diet & Creatine',
    type: 'checkbox' as const,
    sort_order: 5,
    color: 'sage',
    icon: 'sparkles',
  },
  {
    name: 'Deep Work (2–3 Hours)',
    type: 'amount' as const,
    sort_order: 6,
    target_value: 150,
    unit: 'min',
    step_value: 15,
    color: 'slate',
    icon: 'zap',
  },
  {
    name: 'Skill Building (Coding / DSA / Projects)',
    type: 'checkbox' as const,
    sort_order: 7,
    color: 'clay',
    icon: 'crosshair',
  },
  {
    name: 'Book Reading',
    type: 'checkbox' as const,
    sort_order: 8,
    color: 'amber',
    icon: 'book',
  },
  {
    name: 'Journaling',
    type: 'checkbox' as const,
    sort_order: 9,
    color: 'plum',
    icon: 'pen-tool',
  },
  {
    name: 'Mandir / Prayer',
    type: 'checkbox' as const,
    sort_order: 10,
    color: 'sage',
    icon: 'heart',
  },
  {
    name: 'No Social Media / Reels',
    type: 'checkbox' as const,
    sort_order: 11,
    color: 'rose',
    icon: 'shield',
  },
  {
    name: 'No Fap',
    type: 'checkbox' as const,
    sort_order: 12,
    color: 'slate',
    icon: 'target',
  },
  {
    name: 'Night Routine',
    type: 'checklist' as const,
    sort_order: 13,
    color: 'plum',
    icon: 'moon',
    subitems: [
      'No phone before sleeping',
      'Brush teeth',
      'Skincare',
      'Prepare clothes',
      'Pack bag',
      'Fill water bottle',
      'Journal',
      'Read',
      'Pray',
      'Set alarm',
      'Sleep on time',
    ],
  },
]

export async function seedDefaultHabitsForUser(userId: string): Promise<boolean> {
  if (!userId) {
    throw new Error('seedDefaultHabitsForUser: userId is required')
  }

  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('seedDefaultHabitsForUser: Not authenticated')
  }

  // Strictly enforce user scoping — cannot seed for another user
  if (user.id !== userId) {
    throw new Error('Forbidden: Cannot seed for another user')
  }

  const { data, error } = await supabase.rpc('seed_default_data')
  if (error) {
    throw new Error(`seed_default_data RPC failed: ${error.message}`)
  }

  return Boolean(data?.seeded)
}
