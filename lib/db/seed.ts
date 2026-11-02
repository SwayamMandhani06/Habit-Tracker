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

  // Check 1: User metadata already flagged as seeded
  if (user.user_metadata?.seeded === true || user.app_metadata?.seeded === true) {
    return false
  }

  // Check 2: Check if user has EVER had habits (including active and archived)
  const { count: habitCount, error: habitCountError } = await supabase
    .from('habits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (habitCountError) {
    throw new Error(`seedDefaultHabitsForUser habit count error: ${habitCountError.message}`)
  }

  const userHasEverHadHabits = (habitCount ?? 0) > 0

  // Seed default habits if user has no habits
  if (!userHasEverHadHabits) {
    for (const habitCfg of DEFAULT_HABITS_CONFIG) {
      const payload: Record<string, any> = {
        name: habitCfg.name,
        type: habitCfg.type,
        sort_order: habitCfg.sort_order,
        color: habitCfg.color,
        icon: habitCfg.icon,
        is_archived: false,
        user_id: user.id,
      }
      if ('target_value' in habitCfg) {
        payload.target_value = habitCfg.target_value
        payload.unit = habitCfg.unit
        payload.step_value = habitCfg.step_value
      }

      let insertedHabit: any = null
      const { data, error } = await supabase
        .from('habits')
        .insert(payload as any)
        .select()
        .single()

      if (!error && data) {
        insertedHabit = data
      } else {
        // Fallback without amount/color columns
        const fallbackPayload: Record<string, any> = {
          name: habitCfg.name,
          type: habitCfg.type === 'amount' ? 'checkbox' : habitCfg.type,
          sort_order: habitCfg.sort_order,
          is_archived: false,
          user_id: user.id,
        }
        const { data: fbData } = await supabase
          .from('habits')
          .insert(fallbackPayload as any)
          .select()
          .single()
        insertedHabit = fbData
      }

      // If checklist and has subitems, insert them
      if (insertedHabit && 'subitems' in habitCfg && habitCfg.subitems?.length) {
        await supabase.from('habit_subitems').insert(
          habitCfg.subitems.map((name, idx) => ({
            habit_id: insertedHabit.id,
            name,
            sort_order: idx + 1,
            user_id: user.id,
          }))
        )
      }
    }
  }

  // Check 3: Check if user already has quotes
  const { count: quoteCount, error: countError } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (countError) {
    throw new Error(`seedDefaultHabitsForUser count error: ${countError.message}`)
  }

  // Strictly idempotent: only insert quotes if user currently has no quotes
  if ((quoteCount ?? 0) === 0) {
    const { error: insertError } = await supabase.from('quotes').insert(
      CURATED_DISCIPLINE_QUOTES.map(text => ({
        text,
        is_active: true,
        user_id: user.id,
      }))
    )

    if (insertError) {
      throw new Error(`seedDefaultHabitsForUser insert error: ${insertError.message}`)
    }
  }

  // Flag user metadata as seeded so subsequent logins never attempt re-seeding
  try {
    await supabase.auth.updateUser({
      data: { seeded: true },
    })
  } catch (metaErr) {
    console.warn('Failed to update seeded user metadata:', metaErr)
  }

  return !userHasEverHadHabits
}
