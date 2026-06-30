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
  })
}
