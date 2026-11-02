// app/(app)/today/page.tsx — Daily check-in (Server Component)
export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { getHabitsWithSubitems } from '@/lib/db/habits'
import { getOrCreateDayEntry, todayDate, toAppDateString, getDayEntry, getServerTimezone } from '@/lib/db/entries'
import { getDayCompletions, getMultiDayHabitCompletions } from '@/lib/db/completions'
import { TodayClient } from '@/components/today/TodayClient'
import { getIsoWeek } from '@/lib/date'
import { getWeeklyIntentionAction } from '@/actions/intention.actions'
import { getWeekdayMon1, addDays } from '@/lib/stats/habit-math'

export const metadata: Metadata = { title: '1% Better — Today' }

export default async function TodayPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  const today = await todayDate()

  // Strict server validation: real date string, not in the future
  let date = today
  if (params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
    if (params.date <= today) {
      const [y, m, d] = params.date.split('-').map(Number)
      const checkDate = new Date(y, m - 1, d)
      if (
        checkDate.getFullYear() === y &&
        checkDate.getMonth() === m - 1 &&
        checkDate.getDate() === d
      ) {
        date = params.date
      }
    }
  }

  const tz = await getServerTimezone()

  // Calculate yesterday date via pure addDays
  const yesterdayDate = addDays(today, -1)

  // Current ISO week for intention in user's timezone
  const { year: curYear, week: curWeek } = getIsoWeek(new Date(), tz)

  // Compute 7 days of the ISO week containing the viewing date (Mon-Sun)
  const weekday = getWeekdayMon1(date) // 1=Mon ... 7=Sun
  const mondayStr = addDays(date, -(weekday - 1))
  const weekDates: string[] = []
  const weekDaysRaw: Array<{
    date: string
    dayLabel: string
    dayNum: string
    isViewing: boolean
    isToday: boolean
    isFuture: boolean
  }> = []
  const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  for (let i = 0; i < 7; i++) {
    const dStr = addDays(mondayStr, i)
    weekDates.push(dStr)
    weekDaysRaw.push({
      date: dStr,
      dayLabel: WEEK_LABELS[i],
      dayNum: dStr.slice(8, 10),
      isViewing: dStr === date,
      isToday: dStr === today,
      isFuture: dStr > today,
    })
  }

  const [habits, entry, yesterdayEntry, initialIntention, weekCompletions] = await Promise.all([
    getHabitsWithSubitems(),
    getOrCreateDayEntry(date),
    getDayEntry(yesterdayDate),
    getWeeklyIntentionAction(curYear, curWeek),
    getMultiDayHabitCompletions(weekDates),
  ])

  // Compute completion % for each day in the 7-day week strip
  const activeHabits = habits.filter((h) => !h.is_archived)
  const totalActive = activeHabits.length

  const weekStrip = weekDaysRaw.map((wd) => {
    const dayComps = weekCompletions[wd.date] ?? {}
    const doneCount = Object.values(dayComps).filter(Boolean).length
    const pct = totalActive > 0 ? Math.round((doneCount / totalActive) * 100) : 0
    return {
      ...wd,
      completionPct: wd.isFuture ? 0 : pct,
    }
  })

  // Concurrently fetch completions for current viewing entry and yesterday entry
  const [completions, yComps] = await Promise.all([
    getDayCompletions(entry.id),
    yesterdayEntry ? getDayCompletions(yesterdayEntry.id) : Promise.resolve(null),
  ])

  let yesterdayEmpty = true
  if (yComps) {
    const anyDone = Object.values(yComps.habitCompletions).some(Boolean)
    yesterdayEmpty = !anyDone
  }

  return (
    <TodayClient
      key={date}
      date={date}
      today={today}
      entry={entry}
      habits={habits}
      completions={completions}
      weekStrip={weekStrip}
      yesterdayEmpty={yesterdayEmpty}
      yesterdayDate={yesterdayDate}
      initialIntention={initialIntention}
    />
  )
}
