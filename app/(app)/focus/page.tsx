// app/(app)/focus/page.tsx — Dedicated Focus Timer page
export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { getFocusPageData } from '@/lib/db/focus'
import { FocusTimerClient } from '@/components/focus/FocusTimerClient'

export const metadata: Metadata = {
  title: 'Focus Timer — 1% Better',
  description: 'Distraction-free Pomodoro and countdown discipline timer logging into habits.',
}

export default async function FocusPage({
  searchParams,
}: {
  searchParams: Promise<{ habitId?: string }>
}) {
  const params = await searchParams
  const payload = await getFocusPageData()

  return (
    <FocusTimerClient
      payload={payload}
      initialHabitId={params.habitId ?? null}
    />
  )
}

