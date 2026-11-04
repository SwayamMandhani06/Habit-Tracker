// app/(app)/today/page.tsx — Daily check-in (Server Component)
export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getHabitsWithSubitems } from '@/lib/db/habits'
import { todayDate, getServerTimezone } from '@/lib/db/entries'
import { computeDailyScore } from '@/lib/scoring'
import { TodayClient } from '@/components/today/TodayClient'
import { getIsoWeek } from '@/lib/date'
import { getWeekdayMon1, addDays } from '@/lib/stats/habit-math'
import { getSessionUser } from '@/lib/auth/session'
import { createServerClient } from '@/lib/supabase/server'
import { timeStep } from '@/lib/timing'
import TodayLoading from './loading'
import type { DayEntry, WeeklyIntention, DayCompletionState } from '@/lib/supabase/types'

export const metadata: Metadata = { title: '1% Better — Today' }

async function TodayContent({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  const today = await timeStep('/today', 'query_today_date', () => todayDate())

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

  const tz = await timeStep('/today', 'query_timezone', () => getServerTimezone())
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

  // All distinct dates needed: 7 days of the week strip + viewing date + yesterday
  const allNeededDates = Array.from(new Set([...weekDates, date, yesterdayDate]))

  const supabase = await createServerClient()
  const user = await timeStep('/today', 'query_session_user', () => getSessionUser())
  const userId = user?.id || ''

  // Bounded Round Trip 1 (Promise.all):
  // - Embed sub-items with habits in one single select query
  // - Fetch the week strip day_entries with one range query
  // - Fetch current weekly intention
  const [habits, entriesRes, intentionRes] = await Promise.all([
    timeStep('/today', 'query_habits_with_subitems', () =>
      getHabitsWithSubitems(supabase, userId)
    ),
    timeStep('/today', 'query_week_entries_range', () =>
      supabase
        .from('day_entries')
        .select('*')
        .eq('user_id', userId)
        .in('date', allNeededDates)
    ),
    timeStep('/today', 'query_weekly_intention', () =>
      supabase
        .from('weekly_intentions')
        .select('*')
        .eq('user_id', userId)
        .eq('year', curYear)
        .eq('week_number', curWeek)
        .maybeSingle()
    ),
  ])

  const entries = (entriesRes.data ?? []) as DayEntry[]
  const initialIntention = (intentionRes.data ?? null) as WeeklyIntention | null

  // Map entries by date and id
  const entryByDate = new Map<string, DayEntry>()
  const entryIdToDate = new Map<string, string>()
  const entryIds: string[] = []

  for (const e of entries) {
    entryByDate.set(e.date, e)
    entryIdToDate.set(e.id, e.date)
    entryIds.push(e.id)
  }

  const viewingEntry = entryByDate.get(date) ?? null
  const yesterdayEntry = entryByDate.get(yesterdayDate) ?? null

  // Bounded Round Trip 2 (Promise.all):
  // Fetch habit and subitem completions across all entries in one batch
  let habitCompletionsList: Array<{
    day_entry_id: string
    habit_id: string
    is_completed: boolean
    is_skipped?: boolean
    amount?: number | null
    target_snapshot?: number | null
  }> = []
  let subitemCompletionsList: Array<{
    day_entry_id: string
    subitem_id: string
    is_completed: boolean
  }> = []

  if (entryIds.length > 0) {
    const [hRes, sRes] = await Promise.all([
      timeStep('/today', 'query_completions_range', () =>
        supabase
          .from('day_habit_completions')
          .select('day_entry_id, habit_id, is_completed, is_skipped, amount, target_snapshot')
          .eq('user_id', userId)
          .in('day_entry_id', entryIds)
      ),
      timeStep('/today', 'query_subitem_completions_range', () =>
        supabase
          .from('day_subitem_completions')
          .select('day_entry_id, subitem_id, is_completed')
          .eq('user_id', userId)
          .in('day_entry_id', entryIds)
      ),
    ])
    habitCompletionsList = (hRes.data ?? []) as any[]
    subitemCompletionsList = (sRes.data ?? []) as any[]
  }

  // Group completions by date for week strip and day completion state
  const compsByDate: Record<string, Record<string, { habit_id: string; is_completed: boolean }>> = {}
  for (const d of weekDates) compsByDate[d] = {}

  // Completions for viewing date
  const viewingHabitCompletions: Record<string, boolean> = {}
  const viewingHabitSkips: Record<string, boolean> = {}
  const viewingHabitAmounts: Record<string, number> = {}
  const viewingHabitTargets: Record<string, number | null> = {}
  const viewingSubitemCompletions: Record<string, boolean> = {}

  // Completions for yesterday
  let yesterdayAnyDone = false

  for (const c of habitCompletionsList) {
    const d = entryIdToDate.get(c.day_entry_id)
    if (d && compsByDate[d]) {
      compsByDate[d][c.habit_id] = { habit_id: c.habit_id, is_completed: c.is_completed }
    }
    if (viewingEntry && c.day_entry_id === viewingEntry.id) {
      viewingHabitCompletions[c.habit_id] = c.is_completed
      if (c.is_skipped) viewingHabitSkips[c.habit_id] = true
      if (c.amount !== undefined && c.amount !== null) viewingHabitAmounts[c.habit_id] = Number(c.amount)
      if (c.target_snapshot !== undefined) {
        viewingHabitTargets[c.habit_id] = c.target_snapshot !== null ? Number(c.target_snapshot) : null
      }
    }
    if (yesterdayEntry && c.day_entry_id === yesterdayEntry.id && c.is_completed) {
      yesterdayAnyDone = true
    }
  }

  for (const sc of subitemCompletionsList) {
    if (viewingEntry && sc.day_entry_id === viewingEntry.id) {
      viewingSubitemCompletions[sc.subitem_id] = sc.is_completed
    }
  }

  const viewingCompletionState: DayCompletionState = {
    habitCompletions: viewingHabitCompletions,
    subitemCompletions: viewingSubitemCompletions,
    habitSkips: viewingHabitSkips,
    habitAmounts: viewingHabitAmounts,
    habitTargets: viewingHabitTargets,
  }

  // Compute completion % for each day in the 7-day week strip using canonical scoring
  const allSubitems = habits.flatMap((h) => h.subitems ?? [])
  const weekStrip = weekDaysRaw.map((wd) => {
    const compsMap = compsByDate[wd.date] ?? {}
    const dayScore = computeDailyScore({
      date: wd.date,
      habits,
      completionsMap: compsMap,
      subitems: allSubitems,
      timezone: tz,
    })
    return {
      ...wd,
      completionPct: wd.isFuture ? 0 : dayScore.completionPct,
    }
  })

  return (
    <TodayClient
      key={date}
      userId={userId}
      date={date}
      today={today}
      entry={viewingEntry}
      habits={habits}
      completions={viewingCompletionState}
      weekStrip={weekStrip}
      yesterdayEmpty={!yesterdayAnyDone}
      yesterdayDate={yesterdayDate}
      initialIntention={initialIntention?.intention ?? undefined}
    />
  )
}

export default function TodayPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }>
}) {
  return (
    <Suspense fallback={<TodayLoading />}>
      <TodayContent searchParams={searchParams} />
    </Suspense>
  )
}
