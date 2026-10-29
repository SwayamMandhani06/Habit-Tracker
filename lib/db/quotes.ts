// lib/db/quotes.ts — Quotes CRUD & Curated Discipline Quotes (server-only)
import { createServerClient } from '@/lib/supabase/server'
import type { Quote } from '@/lib/supabase/types'

export const CURATED_DISCIPLINE_QUOTES = [
  'Motivation is what gets you started. Discipline is what keeps you going.',
  'The cost of discipline is always less than the cost of regret.',
  "You don't rise to the level of your goals. You fall to the level of your systems.",
  'Stop waiting to feel like it.',
  'One day or day one. You decide.',
  'We are what we repeatedly do. Excellence is not an act but a habit.',
  'Your future self is watching you right now through your memories.',
  'Hard choices, easy life. Easy choices, hard life.',
  'The man who moves a mountain begins by carrying away small stones.',
  'Discipline is choosing between what you want now and what you want most.',
  'You will never always be motivated. You have to learn to be disciplined.',
  "Don't wish it were easier. Wish you were better.",
  'Small disciplines repeated with consistency lead to great achievements gained slowly over time.',
  'The only way out is through.',
  "Do it even when you don't want to. Especially when you don't want to.",
]

export async function getActiveQuotes(): Promise<Quote[]> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('is_active', true)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (!error && data && data.length > 0) return data as Quote[]

      // If user has 0 rows in quotes table, auto-seed and return real rows with database UUIDs
      const all = await getAllQuotes()
      const active = all.filter(q => q.is_active)
      if (active.length > 0) return active
    }
  } catch {
    // If DB error, fallback to curated list
  }

  return CURATED_DISCIPLINE_QUOTES.map((text, idx) => ({
    id: `curated-${idx}`,
    text,
    is_active: true,
    user_id: null,
    created_at: new Date().toISOString(),
  }))
}

export async function getAllQuotes(): Promise<Quote[]> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('user_id', user.id)
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: true })

      if (!error && data && data.length > 0) return data as Quote[]

      // If logged-in user has 0 rows in quotes, seed the CURATED_DISCIPLINE_QUOTES into DB
      // and return the real database rows with real UUIDs (preventing Zod UUID validation failures)
      if (!error && (!data || data.length === 0)) {
        const toInsert = CURATED_DISCIPLINE_QUOTES.map(text => ({
          text,
          is_active: true,
          user_id: user.id,
        }))
        const { data: seeded, error: seedError } = await supabase
          .from('quotes')
          .insert(toInsert)
          .select()
          .order('is_active', { ascending: false })
          .order('created_at', { ascending: true })

        if (!seedError && seeded && seeded.length > 0) {
          return seeded as Quote[]
        }
      }
    }
  } catch {
    // Fallback if DB unavailable
  }

  return CURATED_DISCIPLINE_QUOTES.map((text, idx) => ({
    id: `curated-${idx}`,
    text,
    is_active: true,
    user_id: null,
    created_at: new Date().toISOString(),
  }))
}

export async function addQuote(text: string): Promise<Quote> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('quotes')
    .insert({
      text: text.trim(),
      is_active: true,
      user_id: user.id, // Explicit user_id
    })
    .select()
    .single()

  if (error) throw new Error(`addQuote: ${error.message}`)
  return data as Quote
}

export async function removeQuote(id: string): Promise<void> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('quotes')
    .update({ is_active: false })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(`removeQuote: ${error.message}`)
}

export async function getTodayQuote(): Promise<string> {
  const quotes = await getActiveQuotes()
  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24))
  if (quotes.length > 0) {
    return quotes[daysSinceEpoch % quotes.length].text
  }
  return CURATED_DISCIPLINE_QUOTES[daysSinceEpoch % CURATED_DISCIPLINE_QUOTES.length]
}

export async function reseedCuratedQuotesAction(): Promise<{ success: boolean; count: number }> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) throw new Error('Not authenticated')

  // Delete all existing user quotes
  await supabase.from('quotes').delete().eq('user_id', user.id)
  const { error } = await supabase.from('quotes').insert(
    CURATED_DISCIPLINE_QUOTES.map(text => ({
      text,
      is_active: true,
      user_id: user.id,
    }))
  )

  if (error) throw new Error(`reseedCuratedQuotes: ${error.message}`)
  return { success: true, count: CURATED_DISCIPLINE_QUOTES.length }
}
