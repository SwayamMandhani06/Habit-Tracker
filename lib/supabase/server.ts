// lib/supabase/server.ts
// Server Supabase client:
//   createServerClient() — user-scoped client via @supabase/ssr (respects RLS)

import { cache } from 'react'
import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
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
