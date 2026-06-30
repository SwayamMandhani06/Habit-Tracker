// app/(app)/today/page.tsx — Daily check-in (Server Component)
export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { getHabitsWithSubitems } from '@/lib/db/habits'
import { getOrCreateDayEntry } from '@/lib/db/entries'
import { getDayCompletions } from '@/lib/db/completions'
import { todayDate } from '@/lib/db/entries'
import { TodayClient } from '@/components/today/TodayClient'

export const metadata: Metadata = { title: '1% Better — Today' }

export default async function TodayPage() {
  const date = todayDate()
  const [habits, entry, completions] = await Promise.all([
    getHabitsWithSubitems(),
    getOrCreateDayEntry(date),
    (async () => {
      const e = await getOrCreateDayEntry(date)
      return getDayCompletions(e.id)
    })(),
  ])

  // Re-fetch completions with the created entry id
  const freshCompletions = await getDayCompletions(entry.id)

  return (
    <TodayClient
      date={date}
      entry={entry}
      habits={habits}
      completions={freshCompletions}
    />
  )
}
