// app/(app)/calendar/page.tsx
export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { getAllDailyScoresForCalendar } from '@/lib/db/stats'
import { getHabitsWithSubitems } from '@/lib/db/habits'
import { CalendarView } from '@/components/calendar/CalendarView'
import { todayDate } from '@/lib/db/entries'

export const metadata: Metadata = { title: '1% Better — Calendar' }

export default async function CalendarPage() {
  const [scores, habits] = await Promise.all([
    getAllDailyScoresForCalendar(),
    getHabitsWithSubitems(),
  ])

  return <CalendarView scores={scores} habits={habits} today={todayDate()} />
}

