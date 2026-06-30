// app/(app)/page.tsx — Dashboard (Server Component)
export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { getDashboardStats } from '@/lib/db/stats'
import { todayDate } from '@/lib/db/entries'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

export const metadata: Metadata = { title: '1% Better — Dashboard' }

export default async function DashboardPage() {
  const [stats] = await Promise.all([
    getDashboardStats(),
  ])

  const date = todayDate()

  return <DashboardClient stats={stats} date={date} />
}

