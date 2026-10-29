// app/auth/callback/route.ts — Canonical OAuth & Magic Link callback handler
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { seedDefaultHabitsForUser } from '@/lib/db/seed'

/**
 * Validates and sanitizes a redirect target to prevent open redirect vulnerabilities.
 * Only allows relative paths on the same origin (starting with a single '/').
 * Strictly blocks protocol-relative URLs ('//'), backslashes ('/\' or '\'),
 * scheme-prefixed URLs ('http:', 'javascript:', etc.), and CRLF characters.
 */
function sanitizeRedirectPath(target: string | null | undefined, fallback = '/dashboard'): string {
  if (!target || typeof target !== 'string') return fallback

  const trimmed = target.trim()
  // Must start with a single '/' and not with '//' or '/\' or '\'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.startsWith('\\')) {
    return fallback
  }

  // Reject control characters or newlines that could cause header injection
  if (/[\r\n\t]/.test(trimmed)) {
    return fallback
  }

  try {
    // Parse against a dummy base origin to verify path integrity
    const parsed = new URL(trimmed, 'http://localhost')
    if (parsed.origin !== 'http://localhost') {
      return fallback
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawRedirect = searchParams.get('next') ?? searchParams.get('redirect')
  const safeRedirectPath = sanitizeRedirectPath(rawRedirect, '/dashboard')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Auto-seed discipline quotes for newly authenticated users (idempotent)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        try {
          await seedDefaultHabitsForUser(user.id)
        } catch (e) {
          console.warn('Auto-seed warning:', e)
        }
      }

      return NextResponse.redirect(new URL(safeRedirectPath, origin))
    }
  }

  // Return the user to login with an error notification if exchange fails
  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin))
}
