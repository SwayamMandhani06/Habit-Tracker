// middleware.ts
// Supabase Auth session refresh + route protection.
// Uses @supabase/ssr to keep sessions alive and protect app routes.

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Copies all cookies and security/cache-busting headers onto redirect and error responses.
 * Guarantees that freshly refreshed session tokens and auth cookies are never lost
 * and browsers never cache auth redirects.
 */
function copyCookiesAndCacheHeaders(target: NextResponse, source: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value, cookie)
  })
  const serverTiming = source.headers.get('Server-Timing')
  if (serverTiming) {
    target.headers.set('Server-Timing', serverTiming)
  }
  target.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  target.headers.set('Pragma', 'no-cache')
  target.headers.set('Expires', '0')
  return target
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const t0 = performance.now()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Keep getUser() in middleware until asymmetric JWT signing key is confirmed active.
  // No code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const mwAuthDur = Math.round((performance.now() - t0) * 100) / 100

  // Server-Timing header + JSON timing log
  supabaseResponse.headers.set('Server-Timing', `mw_auth;dur=${mwAuthDur};desc="Middleware Auth"`)
  console.log(
    JSON.stringify({
      type: 'timing',
      page: request.nextUrl.pathname,
      step: 'middleware_auth',
      durationMs: mwAuthDur,
      timestamp: Date.now(),
    })
  )

  // Synchronize Vercel edge geo timezone if client cookie not yet established
  const vercelTz = request.headers.get('x-vercel-ip-timezone')
  if (vercelTz && !request.cookies.get('x-user-timezone')) {
    supabaseResponse.cookies.set('x-user-timezone', vercelTz, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
    })
  }

  const { pathname, search, searchParams } = request.nextUrl

  // 1. Signed-in routing
  if (user) {
    // Redirect signed-in user away from landing, login, and signup to /today
    // (allow ?preview=true on homepage for reviewing marketing page)
    if (
      pathname === '/login' ||
      pathname === '/signup' ||
      (pathname === '/' && searchParams.get('preview') !== 'true')
    ) {
      const todayUrl = new URL('/today', request.url)
      const redirectResponse = NextResponse.redirect(todayUrl)
      return copyCookiesAndCacheHeaders(redirectResponse, supabaseResponse)
    }
    return supabaseResponse
  }

  // 2. Signed-out routing
  // Public routes: landing page (/), /offline.html, /login, /signup, /auth*, /api/auth*
  const isPublicRoute =
    pathname === '/' ||
    pathname === '/offline.html' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/auth')

  if (isPublicRoute) {
    return supabaseResponse
  }

  // API endpoints must return 401 JSON for unauthenticated calls (never redirect 307 to HTML)
  if (pathname.startsWith('/api/')) {
    const unauthResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return copyCookiesAndCacheHeaders(unauthResponse, supabaseResponse)
  }

  // Protected page routes: redirect to /login?from=...
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('from', `${pathname}${search}`)
  const redirectResponse = NextResponse.redirect(loginUrl)
  return copyCookiesAndCacheHeaders(redirectResponse, supabaseResponse)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - icon-*, apple-*
     * - /icons, /screenshots
     * - /manifest.webmanifest, /manifest.json
     * - /sw.js
     * - /offline.html
     */
    '/((?!_next/static|_next/image|favicon\\.ico|icon-.*|apple-.*|icons|screenshots|manifest\\.webmanifest|manifest\\.json|sw\\.js|offline\\.html).*)',
  ],
}
