// lib/supabase/client.ts
// Browser-side Supabase client using @supabase/ssr
// Used in client components for auth operations (sign-in, sign-out, session)

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
