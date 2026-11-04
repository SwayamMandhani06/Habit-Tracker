// app/auth/callback/route.ts — Canonical OAuth & Magic Link callback handler
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Validates and sanitizes a redirect target to prevent open redirect vulnerabilities.
 * Only allows relative paths on the same origin (starting with a single '/').
 * Strictly blocks protocol-relative URLs ('//'), backslashes ('/\' or '\'),
 * scheme-prefixed URLs ('http:', 'javascript:', etc.), and CRLF characters.
 */
function sanitizeRedirectPath(target: string | null | undefined, fallback = '/today'): string {
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
  const safeRedirectPath = sanitizeRedirectPath(rawRedirect, '/today')

  if (code) {
    const cookieStore = await cookies()
    const capturedCookiesToSet: { name: string; value: string; options: any }[] = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
              capturedCookiesToSet.push({ name, value, options })
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Auto-seed habits and quotes for newly authenticated users through authenticated client
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: seedData, error: seedError } = await supabase.rpc('seed_default_data')
        if (seedError) {
          console.error('[OAuth Callback] seed_default_data failed:', {
            code: seedError.code,
            message: seedError.message,
            details: seedError.details,
            hint: seedError.hint,
          })
        } else if ((seedData as any)?.seeded) {
          console.log('[OAuth Callback] seed_default_data succeeded:', seedData)
        }
      }

      const redirectResponse = NextResponse.redirect(new URL(safeRedirectPath, origin))

      // Explicitly set session cookies on redirect response itself (not only cookieStore)
      capturedCookiesToSet.forEach(({ name, value, options }) => {
        redirectResponse.cookies.set(name, value, options)
      })
      cookieStore.getAll().forEach((c) => {
        redirectResponse.cookies.set(c.name, c.value, c)
      })

      redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      redirectResponse.headers.set('Pragma', 'no-cache')
      redirectResponse.headers.set('Expires', '0')

      return redirectResponse
    }
  }

  // Return the user to login with an error notification if exchange fails
  const errorResponse = NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin))
  errorResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  errorResponse.headers.set('Pragma', 'no-cache')
  errorResponse.headers.set('Expires', '0')
  return errorResponse
}
