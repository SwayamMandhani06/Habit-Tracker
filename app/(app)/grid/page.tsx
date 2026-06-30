// app/(app)/grid/page.tsx
export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { getActiveHabits, getHabitsWithSubitems } from '@/lib/db/habits'
import { getDayEntriesForMonth } from '@/lib/db/entries'
import { getCompletionsForMonth } from '@/lib/db/completions'
import { getDailyScoresForMonth } from '@/lib/db/stats'
import { MonthlyGrid } from '@/components/grid/MonthlyGrid'
import { todayDate } from '@/lib/db/entries'

export const metadata: Metadata = { title: '1% Better — Monthly Grid' }

export default async function GridPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const params = await searchParams
  const today = todayDate()
  const todayDate_ = new Date(today + 'T00:00:00')
  const year = parseInt(params.year ?? String(todayDate_.getFullYear()))
  const month = parseInt(params.month ?? String(todayDate_.getMonth() + 1))

  const [habits, entries, completionData, scores] = await Promise.all([
    getActiveHabits(),
    getDayEntriesForMonth(year, month),
    getCompletionsForMonth(year, month),
    getDailyScoresForMonth(year, month),
  ])

  return (
    <MonthlyGrid
      year={year}
      month={month}
      habits={habits}
      entries={entries}
      completionData={completionData}
      scores={scores}
      today={today}
    />
  )
}

