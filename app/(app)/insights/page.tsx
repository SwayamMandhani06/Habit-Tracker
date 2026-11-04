// app/(app)/insights/page.tsx
export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { todayDate } from '@/lib/db/entries'
import { getInsightsData } from '@/lib/db/insights'
import { InsightsClient } from '@/components/insights/InsightsClient'
import InsightsLoading from './loading'

export const metadata: Metadata = { title: '1% Better — Insights' }

async function InsightsContent({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const params = await searchParams
  const today = await todayDate()
  const year = parseInt(params.year ?? today.slice(0, 4), 10)
  const month = parseInt(params.month ?? today.slice(5, 7), 10)

  const data = await getInsightsData(year, month)
  return <InsightsClient data={data} />
}

export default function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  return (
    <Suspense fallback={<InsightsLoading />}>
      <InsightsContent searchParams={searchParams} />
    </Suspense>
  )
}
