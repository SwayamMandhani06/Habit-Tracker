'use client'

// components/providers/ServiceWorkerRegister.tsx
// Registers public/sw.js and provides NEXT_PUBLIC_DISABLE_SW=1 kill switch support.

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    // Kill switch: NEXT_PUBLIC_DISABLE_SW=1 makes registration code unregister all workers and delete all caches
    if (process.env.NEXT_PUBLIC_DISABLE_SW === '1') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister()
        }
      })
      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key))
        })
      }
      return
    }

    if (
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    ) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.debug('[SW] Registered successfully with scope:', registration.scope)
          })
          .catch((err) => {
            console.debug('[SW] Registration failed:', err)
          })
      })
    }
  }, [])

  return null
}
