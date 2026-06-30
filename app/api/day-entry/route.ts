// app/api/day-entry/route.ts — Fetch day entry + completions for modal
import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth/session'
import { getDayEntry } from '@/lib/db/entries'
import { getDayCompletions } from '@/lib/db/completions'

export async function GET(request: NextRequest) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const date = request.nextUrl.searchParams.get('date')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  try {
    const entry = await getDayEntry(date)
    const completions = entry ? await getDayCompletions(entry.id) : { habitCompletions: {}, subitemCompletions: {} }
    return NextResponse.json({ entry, completions })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
