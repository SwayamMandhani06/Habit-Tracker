// app/api/seed/route.ts — Seed default habits and quotes (guarded by session)
import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth/session'
import { createServerClient } from '@/lib/supabase/server'

const HABITS = [
  { name: 'Morning Routine',                          type: 'checklist', sort_order: 1  },
  { name: 'Gym / Workout',                            type: 'checkbox',  sort_order: 2  },
  { name: '10k Steps',                                type: 'checkbox',  sort_order: 3  },
  { name: 'Drink 4L Water',                           type: 'checkbox',  sort_order: 4  },
  { name: 'Healthy Diet & Creatine',                  type: 'checkbox',  sort_order: 5  },
  { name: 'Deep Work (2–3 Hours)',                   type: 'checkbox',  sort_order: 6  },
  { name: 'Skill Building (Coding / DSA / Projects)', type: 'checkbox',  sort_order: 7  },
  { name: 'Book Reading',                             type: 'checkbox',  sort_order: 8  },
  { name: 'Journaling',                               type: 'checkbox',  sort_order: 9  },
  { name: 'Mandir / Prayer',                          type: 'checkbox',  sort_order: 10 },
  { name: 'No Social Media / Reels',                 type: 'checkbox',  sort_order: 11 },
  { name: 'No Fap',                                   type: 'checkbox',  sort_order: 12 },
  { name: 'Night Routine',                            type: 'checklist', sort_order: 13 },
]

const MORNING_SUBITEMS = [
  'No phone after waking up', 'Make bed', 'Brush teeth', 'Wash face',
  'Drink water', 'Morning sunlight', 'Stretch', 'Pray', 'Plan Top 3 Tasks',
]
const NIGHT_SUBITEMS = [
  'No phone before sleeping', 'Brush teeth', 'Skincare', 'Prepare clothes',
  'Pack bag', 'Fill water bottle', 'Journal', 'Read', 'Pray', 'Set alarm', 'Sleep on time',
]

const QUOTES = [
  'Getting 1% better every day.',
  'Discipline is the bridge between goals and accomplishment.',
  'Small consistent actions compound into extraordinary results.',
  'The man who moves a mountain begins by carrying small stones.',
  'Excellence is not an act but a habit.',
  'Do the work. Every day, no matter what.',
  'Your future self is watching you right now.',
  "Show up even when you don't feel like it — especially then.",
  'Progress, not perfection. But still — show up.',
  'The cost of discipline is always less than the cost of regret.',
  'Hard choices, easy life. Easy choices, hard life.',
  'One day or day one. You decide.',
  "You don't rise to the level of your goals, you fall to the level of your systems.",
  'Every master was once a beginner who simply refused to quit.',
  'Earn your rest. Make today count.',
]

export async function POST() {
  if (!(await verifySession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServerClient()

  try {
    const { count } = await db.from('habits').select('*', { count: 'exact', head: true })
    if ((count ?? 0) > 0) {
      return NextResponse.json({ message: 'Already seeded', skipped: true })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: insertedHabits, error: habitsErr } = await db
      .from('habits')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(HABITS.map(h => ({ ...h, is_archived: false })) as any)
      .select()

    if (habitsErr) throw habitsErr

    const habitRows = (insertedHabits ?? []) as Array<{ id: string; name: string }>
    const morningHabit = habitRows.find(h => h.name === 'Morning Routine')
    const nightHabit = habitRows.find(h => h.name === 'Night Routine')

    if (morningHabit) {
      await db.from('habit_subitems').insert(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        MORNING_SUBITEMS.map((name, i) => ({ habit_id: morningHabit.id, name, sort_order: i + 1 })) as any
      )
    }
    if (nightHabit) {
      await db.from('habit_subitems').insert(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        NIGHT_SUBITEMS.map((name, i) => ({ habit_id: nightHabit.id, name, sort_order: i + 1 })) as any
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.from('quotes').insert(QUOTES.map(text => ({ text, is_active: true })) as any)

    return NextResponse.json({ success: true, habitsCreated: habitRows.length })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Seed failed' }, { status: 500 })
  }
}
