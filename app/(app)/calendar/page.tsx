// app/(app)/calendar/page.tsx
export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getAllDailyScoresForCalendar } from '@/lib/db/stats'
import { getHabitsWithSubitems } from '@/lib/db/habits'
import { CalendarView } from '@/components/calendar/CalendarView'
import { todayDate } from '@/lib/db/entries'
import { timeStep } from '@/lib/timing'
import CalendarLoading from './loading'

export const metadata: Metadata = { title: '1% Better — Calendar' }

async function CalendarContent() {
  const [scores, habits, today] = await Promise.all([
    timeStep('/calendar', 'query_calendar_scores', () => getAllDailyScoresForCalendar()),
    timeStep('/calendar', 'query_habits_subitems', () => getHabitsWithSubitems()),
    timeStep('/calendar', 'query_today_date', () => todayDate()),
  ])

  return <CalendarView scores={scores} habits={habits} today={today} />
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<CalendarLoading />}>
      <CalendarContent />
    </Suspense>
  )
}

