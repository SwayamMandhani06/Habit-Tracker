// app/api/seed/route.ts — Idempotent user-scoped seed endpoint for newly authenticated users
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { seedDefaultHabitsForUser } from '@/lib/db/seed'

export async function POST() {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const seeded = await seedDefaultHabitsForUser(user.id)
    return NextResponse.json({ success: true, seeded })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Seed operation failed' },
      { status: 500 }
    )
  }
}
