'use client'

// components/providers/AuthListener.tsx
// Dedicated Supabase Auth state listener.
// Handles session drops, sign outs, and token refreshes cleanly across client & PWA offline caches.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { saveOfflineQueue } from '@/lib/offline-queue'

export function AuthListener() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let refreshTimer: ReturnType<typeof setTimeout> | null = null

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        // Involuntary sign-out (session expired, revoked):
        // Do NOT wipe the offline queue or runtime caches. Keep the queue,
        // show "Sign in to sync N changes", and let the userId check discard it
        // if a different user logs in.
        router.push('/login')
        router.refresh()
      } else if (event === 'TOKEN_REFRESHED') {
        // Debounce router.refresh() once to avoid redundant re-renders
        if (refreshTimer) clearTimeout(refreshTimer)
        refreshTimer = setTimeout(() => {
          router.refresh()
        }, 300)
      }
    })

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      subscription.unsubscribe()
    }
  }, [router])

  return null
}

