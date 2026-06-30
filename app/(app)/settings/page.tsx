// app/(app)/settings/page.tsx
export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { getAllHabits, getHabitSubitems } from '@/lib/db/habits'
import { getAllQuotes } from '@/lib/db/quotes'
import { SettingsClient } from '@/components/settings/SettingsClient'
import type { HabitWithSubitems } from '@/lib/supabase/types'

export const metadata: Metadata = { title: '1% Better — Settings' }

export default async function SettingsPage() {
  const [habits, quotes] = await Promise.all([
    getAllHabits(),
    getAllQuotes(),
  ])

  // Fetch subitems for checklist habits
  const checklistIds = habits.filter(h => h.type === 'checklist').map(h => h.id)
  const subitemArrays = await Promise.all(checklistIds.map(id => getHabitSubitems(id)))
  const subitemMap = Object.fromEntries(checklistIds.map((id, i) => [id, subitemArrays[i]]))

  const habitsWithSubitems: HabitWithSubitems[] = habits.map(h => ({
    ...h,
    subitems: subitemMap[h.id] ?? [],
  }))

  return <SettingsClient habits={habitsWithSubitems} quotes={quotes} />
}

