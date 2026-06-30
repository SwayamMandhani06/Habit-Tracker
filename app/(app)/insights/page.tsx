// app/(app)/insights/page.tsx
export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { getDailyScores } from '@/lib/db/stats'
import { InsightsClient } from '@/components/insights/InsightsClient'

export const metadata: Metadata = { title: '1% Better — Insights' }

export default async function InsightsPage() {
  const scores = await getDailyScores()
  return <InsightsClient scores={scores} />
}

