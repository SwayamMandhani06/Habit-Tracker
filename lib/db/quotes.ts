// lib/db/quotes.ts — Quotes CRUD (server-only)
import { createServerClient } from '@/lib/supabase/server'
import type { Quote } from '@/lib/supabase/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db() { return createServerClient() as any }

export async function getActiveQuotes(): Promise<Quote[]> {
  const { data, error } = await db()
    .from('quotes')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`getActiveQuotes: ${error.message}`)
  return (data ?? []) as Quote[]
}

export async function getAllQuotes(): Promise<Quote[]> {
  const { data, error } = await db()
    .from('quotes')
    .select('*')
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: true })
  if (error) throw new Error(`getAllQuotes: ${error.message}`)
  return (data ?? []) as Quote[]
}

export async function addQuote(text: string): Promise<Quote> {
  const { data, error } = await db()
    .from('quotes')
    .insert({ text: text.trim(), is_active: true })
    .select()
    .single()
  if (error) throw new Error(`addQuote: ${error.message}`)
  return data as Quote
}

export async function removeQuote(id: string): Promise<void> {
  const { error } = await db()
    .from('quotes')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw new Error(`removeQuote: ${error.message}`)
}

export async function getTodayQuote(): Promise<string | null> {
  const quotes = await getActiveQuotes()
  if (quotes.length === 0) return null
  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24))
  return quotes[daysSinceEpoch % quotes.length].text
}
