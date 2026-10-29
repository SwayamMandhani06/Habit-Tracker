// middleware.ts
// Supabase Auth session refresh + route protection.
// Uses @supabase/ssr to keep sessions alive and protect app routes.

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Always-public routes ─────────────────────────────────────────────────
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/screenshots') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js'
  ) {
    return NextResponse.next()
  }

  // ── Supabase session refresh ──────────────────────────────────────────────
  let supabaseResponse = NextResponse.next({ request })

  // Synchronize Vercel edge geo timezone if client cookie not yet established
  const vercelTz = request.headers.get('x-vercel-ip-timezone')
  if (vercelTz && !request.cookies.get('x-user-timezone')) {
    request.cookies.set('x-user-timezone', vercelTz)
    supabaseResponse.cookies.set('x-user-timezone', vercelTz, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
    })
  }

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

  // IMPORTANT: Do not run any code between createServerClient and getUser()
  // that could cause the session to be stale.
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - /icons
     * - /screenshots
     * - /manifest.webmanifest
     * - / (public homepage)
     * - /login (auth page)
     * - /auth/* (auth callbacks)
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|screenshots|manifest.webmanifest|sw.js).*)',
  ],
}
