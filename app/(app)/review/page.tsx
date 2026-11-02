// app/(app)/review/page.tsx
export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { todayDate } from '@/lib/db/entries'
import { getMonthlyReviewData } from '@/lib/db/insights'
import { MonthlyReviewClient } from '@/components/review/MonthlyReviewClient'

export const metadata: Metadata = { title: '1% Better — Monthly Review' }

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const params = await searchParams
  const today = await todayDate()
  const year = parseInt(params.year ?? today.slice(0, 4), 10)
  const month = parseInt(params.month ?? today.slice(5, 7), 10)

  const data = await getMonthlyReviewData(year, month)

  return <MonthlyReviewClient key={`${year}-${month}`} data={data} />
}
