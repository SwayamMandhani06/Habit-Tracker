// app/(app)/review/page.tsx
export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { getHabitMonthlyStats, getDailyScoresForMonth } from '@/lib/db/stats'
import { MonthlyReviewClient } from '@/components/review/MonthlyReviewClient'
import { createServerClient } from '@/lib/supabase/server'
import { todayDate } from '@/lib/db/entries'

export const metadata: Metadata = { title: '1% Better — Monthly Review' }

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const params = await searchParams
  const today = todayDate()
  const d = new Date(today + 'T00:00:00')
  const year = parseInt(params.year ?? String(d.getFullYear()))
  const month = parseInt(params.month ?? String(d.getMonth() + 1))

  const db = createServerClient()

  const [habitStats, scores, review] = await Promise.all([
    getHabitMonthlyStats(year, month),
    getDailyScoresForMonth(year, month),
    (async () => {
      const { data } = await db
        .from('month_reviews')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .single()
      return data ?? null
    })(),
  ])

  const avgCompletion = scores.length > 0
    ? scores.reduce((s, x) => s + Number(x.completion_pct), 0) / scores.length
    : 0

  const sleepEntries = scores.filter(s => s.sleep_hours != null)
  const avgSleep = sleepEntries.length > 0
    ? sleepEntries.reduce((s, x) => s + Number(x.sleep_hours), 0) / sleepEntries.length
    : null

  const bestHabit = habitStats[0] ?? null
  const worstHabit = habitStats[habitStats.length - 1] ?? null

  return (
    <MonthlyReviewClient
      year={year}
      month={month}
      avgCompletion={avgCompletion}
      avgSleep={avgSleep}
      bestHabit={bestHabit}
      worstHabit={worstHabit}
      review={review}
    />
  )
}

