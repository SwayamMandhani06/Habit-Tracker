// app/(app)/habits/[id]/page.tsx — Habit Detail Page
export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { todayDate } from '@/lib/db/entries'
import { getHabitDetailData } from '@/lib/db/habit-detail'
import { HabitDetailClient } from '@/components/habit-detail/HabitDetailClient'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const today = await todayDate()
  const data = await getHabitDetailData(id, today)
  if (!data) return { title: 'Habit Not Found — 1% Better' }
  return {
    title: `${data.habit.name} — 1% Better`,
    description: `Discipline and consistency history for ${data.habit.name}`,
  }
}

export default async function HabitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const today = await todayDate()
  const data = await getHabitDetailData(id, today)

  if (!data) {
    notFound()
  }

  return (
    <HabitDetailClient
      habit={data.habit}
      initialRecords={data.records}
      initialNotes={data.notes}
      today={data.today}
    />
  )
}

