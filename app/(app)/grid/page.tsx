// app/(app)/grid/page.tsx
export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getActiveHabits, getAllHabits } from '@/lib/db/habits'
import { getDayEntriesForMonth } from '@/lib/db/entries'
import { getCompletionsForMonth } from '@/lib/db/completions'
import { getDailyScoresForMonth } from '@/lib/db/stats'
import { MonthlyGrid } from '@/components/grid/MonthlyGrid'
import { todayDate } from '@/lib/db/entries'
import { timeStep } from '@/lib/timing'
import GridLoading from './loading'

export const metadata: Metadata = { title: '1% Better — Monthly Grid' }

async function GridContent({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const params = await searchParams
  const today = await timeStep('/grid', 'query_today_date', () => todayDate())
  const currentYear = Number(today.slice(0, 4))
  const currentMonth = Number(today.slice(5, 7))
  const year = parseInt(params.year ?? String(currentYear))
  const month = parseInt(params.month ?? String(currentMonth))

  // Use getAllHabits (including archived) for past months so habits that were
  // later archived still appear in the grid for the month they were tracked.
  // For the current month, filter to active only.
  const isPastMonth = year < currentYear || (year === currentYear && month < currentMonth)

  const [habits, entries, completionData, scores] = await Promise.all([
    timeStep('/grid', 'query_habits', () =>
      isPastMonth ? getAllHabits() : getActiveHabits()
    ),
    timeStep('/grid', 'query_day_entries', () =>
      getDayEntriesForMonth(year, month)
    ),
    timeStep('/grid', 'query_completions', () =>
      getCompletionsForMonth(year, month)
    ),
    timeStep('/grid', 'query_daily_scores', () =>
      getDailyScoresForMonth(year, month)
    ),
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

export default function GridPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  return (
    <Suspense fallback={<GridLoading />}>
      <GridContent searchParams={searchParams} />
    </Suspense>
  )
}

