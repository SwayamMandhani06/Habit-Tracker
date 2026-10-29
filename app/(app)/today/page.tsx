// app/(app)/today/page.tsx — Daily check-in (Server Component)
export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { getHabitsWithSubitems } from '@/lib/db/habits'
import { getOrCreateDayEntry, todayDate, toAppDateString, getDayEntry, getServerTimezone } from '@/lib/db/entries'
import { getDayCompletions, getMultiDayHabitCompletions } from '@/lib/db/completions'
import { TodayClient } from '@/components/today/TodayClient'
import { getIsoWeek } from '@/lib/date'
import { getWeeklyIntentionAction } from '@/actions/intention.actions'

export const metadata: Metadata = { title: '1% Better — Today' }

export default async function TodayPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  const today = await todayDate()
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today

  const tz = await getServerTimezone()
  // Calculate yesterday date in user's timezone
  const yObj = new Date(today + 'T00:00:00')
  yObj.setDate(yObj.getDate() - 1)
  const yesterdayDate = toAppDateString(yObj, tz)

  // Current ISO week for intention in user's timezone
  const { year: curYear, week: curWeek } = getIsoWeek(new Date(), tz)

  // Compute 5 recent days (ending on date) for the Minimal 5-day pill strip
  const recentDays: Array<{ date: string; dayLabel: string; dayNum: string; isToday: boolean }> = []
  const recentDates: string[] = []
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const targetObj = new Date(date + 'T00:00:00')

  for (let i = 4; i >= 0; i--) {
    const d = new Date(targetObj)
    d.setDate(d.getDate() - i)
    const dStr = toAppDateString(d, tz)
    recentDates.push(dStr)
    recentDays.push({
      date: dStr,
      dayLabel: DAY_LABELS[d.getDay()],
      dayNum: String(d.getDate()).padStart(2, '0'),
      isToday: dStr === date,
    })
  }

  const [habits, entry, yesterdayEntry, initialIntention, recentCompletions] = await Promise.all([
    getHabitsWithSubitems(),
    getOrCreateDayEntry(date),
    getDayEntry(yesterdayDate),
    getWeeklyIntentionAction(curYear, curWeek),
    getMultiDayHabitCompletions(recentDates),
  ])

  // Check if yesterday is empty (no entry or 0 habits completed)
  let yesterdayEmpty = false
  if (!yesterdayEntry) {
    yesterdayEmpty = true
  } else {
    const yComps = await getDayCompletions(yesterdayEntry.id)
    const anyDone = Object.values(yComps.habitCompletions).some(Boolean)
    if (!anyDone) yesterdayEmpty = true
  }

  const completions = await getDayCompletions(entry.id)

  return (
    <TodayClient
      key={date}
      date={date}
      entry={entry}
      habits={habits}
      completions={completions}
      yesterdayEmpty={yesterdayEmpty}
      yesterdayDate={yesterdayDate}
      initialIntention={initialIntention}
      recentDays={recentDays}
      recentCompletions={recentCompletions}
    />
  )
}
