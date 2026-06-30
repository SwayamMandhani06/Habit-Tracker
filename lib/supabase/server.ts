// lib/supabase/server.ts
// Service-role Supabase client — ONLY used in server-side code (Server Actions, Route Handlers)
// Never imported from client components

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

export type TypedSupabaseClient = SupabaseClient<Database>

export function createServerClient(): TypedSupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)')
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      // Disable Next.js data-cache for ALL Supabase fetches.
      // Without this, Next.js 15 may cache fetch responses and serve stale
      // stats (yesterday's completion %, last month's totals, etc.) even on
      // force-dynamic pages. cache:'no-store' ensures every request hits
      // Supabase fresh.
      fetch: (input, init) =>
        fetch(input, { ...init, cache: 'no-store' }),
    },
  })
}
