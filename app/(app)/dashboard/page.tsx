// app/(app)/dashboard/page.tsx — Dashboard (Server Component)
export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getDashboardStats } from '@/lib/db/stats'
import { todayDate } from '@/lib/db/entries'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import DashboardLoading from './loading'

export const metadata: Metadata = { title: '1% Better — Dashboard' }

async function DashboardContent() {
  const [stats, date] = await Promise.all([
    getDashboardStats(),
    todayDate(),
  ])
  return <DashboardClient stats={stats} date={date} />
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  )
}
