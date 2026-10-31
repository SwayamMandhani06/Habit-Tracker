// lib/supabase/server.ts
// Two Supabase clients:
//   createServerClient() — user-scoped client via @supabase/ssr (respects RLS)
//   createAdminClient()  — service-role client (bypasses RLS, admin use only)

import { cache } from 'react'
import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from './types'

export type TypedSupabaseClient = SupabaseClient<Database>

// ── User-scoped client (respects RLS) ─────────────────────────────────────────
// Memoized per-request to prevent duplicate client initialization overhead.
export const createServerClient = cache(async (): Promise<TypedSupabaseClient> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  }

  const cookieStore = await cookies()

  return createSSRServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // setAll is called from Server Components where cookies are read-only.
          // This is safe to ignore — the middleware handles session refresh.
        }
      },
    },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, cache: 'no-store' }),
    },
  }) as unknown as TypedSupabaseClient
})

// ── Admin client (service-role, bypasses RLS) ──────────────────────────────────
// ONLY use for explicit admin operations. Never for user-facing queries/routes.
export function createAdminClient(): TypedSupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)')
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, cache: 'no-store' }),
    },
  })
}
