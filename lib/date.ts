// lib/date.ts — Pure date & timezone utilities
// All calendar date math is pure, deterministic, and free of hidden new Date() calls.
// Calendar dates are strictly 'YYYY-MM-DD' strings.

/**
 * Validates whether a given string is a valid IANA timezone identifier.
 */
export function isValidTimezone(tz: string | null | undefined): boolean {
  if (!tz || typeof tz !== 'string') return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/**
 * Reads the client browser's resolved IANA timezone.
 * Returns 'UTC' if executed on the server or if unresolvable.
 */
export function getClientTimezone(): string {
  if (typeof window !== 'undefined') {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (isValidTimezone(tz)) return tz
    } catch {}
  }
  return 'UTC'
}

/**
 * Formats a fixed Date instant into 'YYYY-MM-DD' in the specified timezone.
 * Uses formatToParts for rock-solid, locale-independent 2-digit extraction.
 */
export function todayInTz(now: Date, tz: string): string {
  const safeTz = isValidTimezone(tz) ? tz : 'UTC'
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(now)
  let year = ''
  let month = ''
  let day = ''
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    if (p.type === 'year') year = p.value
    else if (p.type === 'month') month = p.value
    else if (p.type === 'day') day = p.value
  }
  return `${year}-${month}-${day}`
}

/**
 * Returns true if the calendar date string ('YYYY-MM-DD') is strictly after
 * the current date in the specified timezone.
 */
export function isFutureDate(date: string, now: Date, tz: string): boolean {
  const today = todayInTz(now, tz)
  return date > today
}

/**
 * Adds or subtracts `n` days from a 'YYYY-MM-DD' calendar date string.
 * Uses pure UTC arithmetic (Date.UTC + getUTC*) so local timezone or DST
 * transitions never shift or distort the calendar day.
 */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number)
  const utcMs = Date.UTC(y, m - 1, d + n)
  const res = new Date(utcMs)
  const year = res.getUTCFullYear()
  const month = String(res.getUTCMonth() + 1).padStart(2, '0')
  const day = String(res.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Returns the 7 distinct consecutive 'YYYY-MM-DD' dates for the week containing `anyDateInWeek`.
 * @param anyDateInWeek A 'YYYY-MM-DD' date string.
 * @param weekStartsOn 0 for Sunday, 1 for Monday (default 1).
 */
export function weekDates(anyDateInWeek: string, weekStartsOn: 0 | 1 = 1): string[] {
  const [y, m, d] = anyDateInWeek.slice(0, 10).split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d))
  const dayOfWeek = utc.getUTCDay() // 0 = Sunday, 1 = Monday ... 6 = Saturday

  let offset = 0
  if (weekStartsOn === 1) {
    // Monday start: if day is Sunday (0), Monday was 6 days ago (-6), otherwise -(dayOfWeek - 1)
    offset = dayOfWeek === 0 ? -6 : -(dayOfWeek - 1)
  } else {
    // Sunday start: offset is -dayOfWeek
    offset = -dayOfWeek
  }

  const startOfWeek = addDays(anyDateInWeek, offset)
  const result: string[] = []
  for (let i = 0; i < 7; i++) {
    result.push(addDays(startOfWeek, i))
  }
  return result
}

/**
 * Returns the start date and end date ('YYYY-MM-DD') for a given month and year.
 */
export function monthRange(year: number, month: number): { start: string; end: string } {
  const mm = String(month).padStart(2, '0')
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`,
  }
}

// ── Compatibility Aliases ───────────────────────────────────────────────────

export function formatDateInTz(date: Date, timezone: string = 'UTC'): string {
  return todayInTz(date, timezone)
}

export function getTodayDate(timezone: string = 'UTC'): string {
  return todayInTz(new Date(), timezone)
}

export function getMonthDateRange(
  year: number,
  month: number
): { startDate: string; endDate: string; daysInMonth: number } {
  const range = monthRange(year, month)
  const daysInMonth = Number(range.end.slice(8, 10))
  return {
    startDate: range.start,
    endDate: range.end,
    daysInMonth,
  }
}

/**
 * Computes ISO 8601 week number (Monday-starting week).
 */
export function getIsoWeek(date: Date = new Date(), timezone: string = 'UTC'): { year: number; week: number } {
  const dateStr = todayInTz(date, timezone)
  const [y, m, d] = dateStr.split('-').map(Number)
  const target = new Date(Date.UTC(y, m - 1, d))
  target.setUTCDate(target.getUTCDate() + 3 - ((target.getUTCDay() + 6) % 7))
  const week1 = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round(
    ((target.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getUTCDay() + 6) % 7)) / 7
  )
  return {
    year: target.getUTCFullYear(),
    week,
  }
}
