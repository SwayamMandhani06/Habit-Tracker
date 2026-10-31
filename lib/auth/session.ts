// lib/auth/session.ts
// Supabase Auth session helpers
// All session state managed by Supabase Auth via @supabase/ssr

import { cache } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

// Returns the authenticated Supabase user, or null if not authenticated.
// Memoized with React cache() to eliminate duplicate auth roundtrips in a single request.
export const getSessionUser = cache(async (): Promise<User | null> => {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return user
  } catch {
    return null
  }
})

// Single-step helper that returns both the authenticated user and server client.
export const getSessionContext = cache(async (): Promise<{ user: User; supabase: Awaited<ReturnType<typeof createServerClient>> } | null> => {
  try {
    const supabase = await createServerClient()
    const user = await getSessionUser()
    if (!user) return null
    return { user, supabase }
  } catch {
    return null
  }
})

// Convenience: returns true if there is an authenticated session.
// Drop-in replacement for the old verifySession() used in all server actions.
export async function verifySession(): Promise<boolean> {
  const user = await getSessionUser()
  return user !== null
}
