// app/api/day-entry/route.ts — Fetch day entry + completions for modal
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getDayEntry } from '@/lib/db/entries'
import { getDayCompletions } from '@/lib/db/completions'

export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const date = request.nextUrl.searchParams.get('date')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format (expected YYYY-MM-DD)' }, { status: 400 })
  }

  try {
    const entry = await getDayEntry(date, user.id)
    const completions = entry
      ? await getDayCompletions(entry.id)
      : { habitCompletions: {}, subitemCompletions: {}, habitSkips: {} }
    return NextResponse.json({ entry, completions })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    )
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. Use the updateDayEntryAction server action for day entry mutations.' },
    { status: 405, headers: { Allow: 'GET' } }
  )
}
