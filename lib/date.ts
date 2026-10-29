// lib/date.ts — Pure date & timezone utilities (safe for both Server and Client components)

export function isValidTimezone(tz: string): boolean {
  if (!tz || typeof tz !== 'string') return false
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export function getClientTimezone(): string {
  if (typeof window !== 'undefined') {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (tz && isValidTimezone(tz)) return tz
    } catch {}
  }
  return 'UTC'
}

export function formatDateInTz(date: Date, timezone: string = 'UTC'): string {
  try {
    const tz = isValidTimezone(timezone) ? timezone : 'UTC'
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

export function getTodayDate(timezone: string = 'UTC'): string {
  return formatDateInTz(new Date(), timezone)
}

/**
 * Returns the YYYY-MM-01 start date, YYYY-MM-DD end date, and total days for a given month.
 * Uses Date.UTC so the calculation is pure, deterministic, and immune to server/client timezone drift.
 */
export function getMonthDateRange(year: number, month: number): { startDate: string; endDate: string; daysInMonth: number } {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const mm = String(month).padStart(2, '0')
  return {
    startDate: `${year}-${mm}-01`,
    endDate: `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`,
    daysInMonth,
  }
}

/**
 * Computes the ISO 8601 week number and year.
 * Weeks start on Monday. Week 1 is the week with the year's first Thursday.
 * Adjusts date to the given timezone so week boundary matches the user's local Monday.
 */
export function getIsoWeek(date: Date = new Date(), timezone?: string): { year: number; week: number } {
  const effectiveTz = timezone ?? (typeof window !== 'undefined' ? getClientTimezone() : 'UTC')
  const dateStr = formatDateInTz(date, effectiveTz)
  const d = new Date(dateStr + 'T00:00:00')
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return {
    year: d.getFullYear(),
    week: 1 + Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    ),
  }
}
