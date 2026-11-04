'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isValidTimezone } from '@/lib/date'

interface TimezoneSyncProps {
  storedTimezone?: string | null
}

const SESSION_KEY = 'habit_tz_synced'

/**
 * TimezoneSync — Synchronizes the user's client browser timezone with:
 * 1. 'x-user-timezone' cookie (for zero-latency server SSR date rendering)
 * 2. Supabase auth user_metadata.timezone (persistent across devices)
 * Calls updateUser and router.refresh() at most once per browser session via sessionStorage.
 */
export function TimezoneSync({ storedTimezone }: TimezoneSyncProps) {
  const router = useRouter()
  const syncAttemptedRef = useRef(false)

  useEffect(() => {
    if (syncAttemptedRef.current) return
    syncAttemptedRef.current = true

    try {
      const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (!clientTz || !isValidTimezone(clientTz)) return

      // Deduplicate per browser session via sessionStorage
      const sessionSynced =
        typeof window !== 'undefined' && window.sessionStorage
          ? window.sessionStorage.getItem(SESSION_KEY)
          : null
      if (sessionSynced === clientTz) {
        return
      }

      // Read current cookie
      const cookies = document.cookie.split('; ')
      const tzCookie = cookies.find((c) => c.startsWith('x-user-timezone='))
      const currentCookieVal = tzCookie ? decodeURIComponent(tzCookie.split('=')[1]) : null

      let cookieUpdated = false
      if (currentCookieVal !== clientTz) {
        document.cookie = `x-user-timezone=${encodeURIComponent(clientTz)}; path=/; max-age=31536000; SameSite=Lax`
        cookieUpdated = true
      }

      // Mark session storage immediately
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(SESSION_KEY, clientTz)
      }

      // Call updateUser at most once per session when metadata differs
      if (storedTimezone !== clientTz) {
        const supabase = createClient()
        supabase.auth
          .updateUser({ data: { timezone: clientTz } })
          .then(() => {
            console.log('[TimezoneSync] Synced timezone for session:', clientTz)
            if (cookieUpdated || storedTimezone) {
              router.refresh()
            }
          })
          .catch((err) => {
            console.warn('[TimezoneSync] Failed to update user timezone metadata:', err)
          })
      } else {
        console.log('[TimezoneSync] Synced timezone for session:', clientTz)
        if (cookieUpdated) {
          router.refresh()
        }
      }
    } catch (e) {
      console.warn('[TimezoneSync] Error:', e)
    }
  }, [storedTimezone, router])

  return null
}
