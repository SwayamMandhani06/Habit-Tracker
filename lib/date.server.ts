// lib/date.server.ts — Server-only timezone & date detection
import { cookies, headers } from 'next/headers'
import { isValidTimezone, formatDateInTz, getTodayDate } from './date'

/**
 * Resolves the authenticated or visiting user's timezone on the server:
 * 1. Checks 'x-user-timezone' cookie set by the client.
 * 2. Checks Vercel geo header 'x-vercel-ip-timezone'.
 * 3. Checks environment variable 'APP_TIMEZONE'.
 * 4. Fallback to 'UTC'.
 */
export async function getServerTimezone(): Promise<string> {
  try {
    const cookieStore = await cookies()
    const cookieTz = cookieStore.get('x-user-timezone')?.value
    if (cookieTz) {
      const decoded = decodeURIComponent(cookieTz)
      if (isValidTimezone(decoded)) return decoded
    }

    const headerStore = await headers()
    const vercelTz = headerStore.get('x-vercel-ip-timezone')
    if (vercelTz && isValidTimezone(vercelTz)) {
      return vercelTz
    }
  } catch {
    // Outside request context (e.g. build step or background job)
  }

  if (process.env.APP_TIMEZONE && isValidTimezone(process.env.APP_TIMEZONE)) {
    return process.env.APP_TIMEZONE
  }

  return 'UTC'
}

export async function getTodayInServerTimezone(): Promise<string> {
  const tz = await getServerTimezone()
  return getTodayDate(tz)
}

export async function toAppDateStringServer(date: Date): Promise<string> {
  const tz = await getServerTimezone()
  return formatDateInTz(date, tz)
}

