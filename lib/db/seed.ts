// lib/db/seed.ts — Idempotent user-scoped seeding logic (server-only)
import { createServerClient } from '@/lib/supabase/server'
import { CURATED_DISCIPLINE_QUOTES } from '@/lib/db/quotes'

export async function seedDefaultHabitsForUser(userId: string): Promise<boolean> {
  if (!userId) {
    throw new Error('seedDefaultHabitsForUser: userId is required')
  }

  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('seedDefaultHabitsForUser: Not authenticated')
  }

  // Strictly enforce user scoping — cannot seed for another user
  if (user.id !== userId) {
    throw new Error('Forbidden: Cannot seed for another user')
  }

  // Check 1: User metadata already flagged as seeded
  if (user.user_metadata?.seeded === true || user.app_metadata?.seeded === true) {
    return false
  }

  // Check 2: Check if user has EVER had habits (including active and archived)
  const { count: habitCount, error: habitCountError } = await supabase
    .from('habits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (habitCountError) {
    throw new Error(`seedDefaultHabitsForUser habit count error: ${habitCountError.message}`)
  }

  const userHasEverHadHabits = (habitCount ?? 0) > 0

  // Check 3: Check if user already has quotes
  const { count: quoteCount, error: countError } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (countError) {
    throw new Error(`seedDefaultHabitsForUser count error: ${countError.message}`)
  }

  // Strictly idempotent: only insert quotes if user currently has no quotes
  if ((quoteCount ?? 0) === 0) {
    const { error: insertError } = await supabase.from('quotes').insert(
      CURATED_DISCIPLINE_QUOTES.map(text => ({
        text,
        is_active: true,
        user_id: user.id,
      }))
    )

    if (insertError) {
      throw new Error(`seedDefaultHabitsForUser insert error: ${insertError.message}`)
    }
  }

  // Flag user metadata as seeded so subsequent logins never attempt re-seeding
  try {
    await supabase.auth.updateUser({
      data: { seeded: true },
    })
  } catch (metaErr) {
    console.warn('Failed to update seeded user metadata:', metaErr)
  }

  return !userHasEverHadHabits
}
