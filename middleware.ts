// proxy.ts (Next.js 16: renamed from middleware.ts)
// Protects all /(app)/* routes — redirects to /pin if no valid session

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { SessionData } from '@/lib/auth/session'
import { unsealData } from 'iron-session'

const SESSION_COOKIE_NAME = 'hbt_session'

async function isAuthenticated(request: NextRequest, secret: string): Promise<boolean> {
  try {
    const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value
    if (!cookieValue) return false

    const session = await unsealData<SessionData>(cookieValue, { password: secret })
    return session.authenticated === true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes — always allowed
  if (
    pathname.startsWith('/pin') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icons') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js'
  ) {
    return NextResponse.next()
  }

  const secret = process.env.SESSION_SECRET
  if (!secret) {
    return NextResponse.redirect(new URL('/pin', request.url))
  }

  const authenticated = await isAuthenticated(request, secret)
  if (!authenticated) {
    const loginUrl = new URL('/pin', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - /pin (login page)
     * - /api/auth/* (auth routes)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw.js|pin|api/auth).*)',
  ],
}
