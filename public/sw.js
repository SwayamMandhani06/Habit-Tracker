// public/sw.js — 1% Better Habit Tracker Service Worker
const BUILD_ID = 'build_1793789844709'
const CACHE_NAME = `habit-static-${BUILD_ID}`

const STATIC_ASSETS = [
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/favicon.ico',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching partial failure:', err)
      })
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 1. Skip all non-GET requests (Server Actions, mutations, API writes)
  if (request.method !== 'GET') {
    return
  }

  // 2. Never cache or intercept Supabase, auth, or API endpoints
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.hostname.includes('supabase.co')
  ) {
    return
  }

  // 3. Never cache RSC payloads (RSC header or _rsc query parameter)
  const isRSC = request.headers.has('RSC') || url.searchParams.has('_rsc')
  if (isRSC) {
    return
  }

  // 4. Hashed /_next/static/ assets: Cache First
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return networkResponse
        })
      })
    )
    return
  }

  // 5. Static Icons and Favicon: Cache First
  if (url.pathname.startsWith('/icons/') || url.pathname === '/favicon.ico') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return networkResponse
        })
      })
    )
    return
  }

  // 6. Navigation (HTML pages): Network-only.
  // NEVER cache HTML pages or user data in runtime cache.
  // When network fails while offline, serve the pre-cached generic offline.html page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/offline.html')
      })
    )
    return
  }

  // Default: pass through directly to network without caching
})
