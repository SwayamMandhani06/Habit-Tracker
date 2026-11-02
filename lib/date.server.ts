// lib/date.server.ts — Server-only timezone & date detection
import { cookies, headers } from 'next/headers'
import { getSessionUser } from '@/lib/auth/session'
import { isValidTimezone, todayInTz } from './date'

/**
 * Resolves the authenticated or visiting user's timezone on the server in exact priority order:
 * 1. user_metadata.timezone (stored on user account)
 * 2. 'x-user-timezone' cookie (cached by client)
 * 3. 'x-vercel-ip-timezone' request header (injected by Vercel Edge)
 * 4. Fallback to 'UTC'.
 *
 * Validates every candidate as a valid IANA timezone string.
 * Completely free of hard-coded country defaults.
 */
export async function getServerTimezone(): Promise<string> {
  // 1. Check user_metadata.timezone from authenticated user
  try {
    const user = await getSessionUser()
    const userTz = user?.user_metadata?.timezone
    if (userTz && isValidTimezone(userTz)) {
      return userTz
    }
  } catch {
    // Outside request or unauthenticated
  }

  // 2. Check 'x-user-timezone' cookie set by client
  try {
    const cookieStore = await cookies()
    const cookieTz = cookieStore.get('x-user-timezone')?.value
    if (cookieTz) {
      const decoded = decodeURIComponent(cookieTz)
      if (isValidTimezone(decoded)) return decoded
    }
  } catch {}

  // 3. Check Vercel edge header 'x-vercel-ip-timezone'
  try {
    const headerStore = await headers()
    const vercelTz = headerStore.get('x-vercel-ip-timezone')
    if (vercelTz && isValidTimezone(vercelTz)) {
      return vercelTz
    }
  } catch {}

  // 4. Default to UTC
  return 'UTC'
}

/**
 * Returns today's date ('YYYY-MM-DD') resolved in the server-detected user timezone.
 */
export async function getTodayInServerTimezone(): Promise<string> {
  const tz = await getServerTimezone()
  return todayInTz(new Date(), tz)
}

/**
 * Formats a Date instant into 'YYYY-MM-DD' in the server-detected user timezone.
 */
export async function toAppDateStringServer(date: Date): Promise<string> {
  const tz = await getServerTimezone()
  return todayInTz(date, tz)
}
