import { describe, it, expect } from 'vitest'
import {
  todayInTz,
  isFutureDate,
  addDays,
  weekDates,
  monthRange,
  isValidTimezone,
} from '../lib/date'

describe('Pure Date Module (lib/date.ts)', () => {
  describe('Timezone Validations & Format in Fixed Instants', () => {
    it('validates IANA timezones properly', () => {
      expect(isValidTimezone('Asia/Kolkata')).toBe(true)
      expect(isValidTimezone('Pacific/Auckland')).toBe(true)
      expect(isValidTimezone('America/Los_Angeles')).toBe(true)
      expect(isValidTimezone('UTC')).toBe(true)
      expect(isValidTimezone('Fake/Zone')).toBe(false)
      expect(isValidTimezone('')).toBe(false)
      expect(isValidTimezone(null as any)).toBe(false)
    })

    // Asia/Kolkata (UTC+5:30)
    it('Asia/Kolkata: 2026-11-02T19:00:00Z is 00:30 on Nov 3 -> Nov 3 is NOT future', () => {
      const instant = new Date('2026-11-02T19:00:00Z')
      const localDate = todayInTz(instant, 'Asia/Kolkata')
      expect(localDate).toBe('2026-11-03')
      expect(isFutureDate('2026-11-03', instant, 'Asia/Kolkata')).toBe(false)
      expect(isFutureDate('2026-11-04', instant, 'Asia/Kolkata')).toBe(true)
    })

    it('Asia/Kolkata: 2026-11-02T18:29:00Z is 23:59 on Nov 2 -> Nov 3 IS future', () => {
      const instant = new Date('2026-11-02T18:29:00Z')
      const localDate = todayInTz(instant, 'Asia/Kolkata')
      expect(localDate).toBe('2026-11-02')
      expect(isFutureDate('2026-11-03', instant, 'Asia/Kolkata')).toBe(true)
      expect(isFutureDate('2026-11-02', instant, 'Asia/Kolkata')).toBe(false)
    })

    // Pacific/Auckland (UTC+13 in DST)
    it('Pacific/Auckland: 2026-11-02T10:59:00Z is 23:59 on Nov 2; 2026-11-02T11:01:00Z is 00:01 on Nov 3', () => {
      const beforeMidnight = new Date('2026-11-02T10:59:00Z')
      const afterMidnight = new Date('2026-11-02T11:01:00Z')

      expect(todayInTz(beforeMidnight, 'Pacific/Auckland')).toBe('2026-11-02')
      expect(isFutureDate('2026-11-03', beforeMidnight, 'Pacific/Auckland')).toBe(true)

      expect(todayInTz(afterMidnight, 'Pacific/Auckland')).toBe('2026-11-03')
      expect(isFutureDate('2026-11-03', afterMidnight, 'Pacific/Auckland')).toBe(false)
    })

    // America/Los_Angeles (UTC-8 PST after Nov 1 DST fallback: midnight is 08:00:00Z)
    it('America/Los_Angeles: 2026-11-02T07:59:00Z is 23:59 on Nov 1; 2026-11-02T08:01:00Z is 00:01 on Nov 2', () => {
      const beforeMidnight = new Date('2026-11-02T07:59:00Z')
      const afterMidnight = new Date('2026-11-02T08:01:00Z')

      expect(todayInTz(beforeMidnight, 'America/Los_Angeles')).toBe('2026-11-01')
      expect(isFutureDate('2026-11-02', beforeMidnight, 'America/Los_Angeles')).toBe(true)

      expect(todayInTz(afterMidnight, 'America/Los_Angeles')).toBe('2026-11-02')
      expect(isFutureDate('2026-11-02', afterMidnight, 'America/Los_Angeles')).toBe(false)
    })
  })

  describe('Pure Date String Math (addDays & weekDates)', () => {
    it('addDays handles positive, negative, and leap year days without local timezone shift', () => {
      expect(addDays('2026-11-02', 1)).toBe('2026-11-03')
      expect(addDays('2026-11-02', -1)).toBe('2026-11-01')
      expect(addDays('2026-11-01', -1)).toBe('2026-10-31')
      expect(addDays('2024-02-28', 1)).toBe('2024-02-29') // Leap year
      expect(addDays('2024-02-29', 1)).toBe('2024-03-01')
      expect(addDays('2025-02-28', 1)).toBe('2025-03-01') // Non-leap year
    })

    it('week containing 2026-11-01 (DST transition in America/Los_Angeles) returns 7 distinct consecutive dates', () => {
      // 2026-11-01 is a Sunday (US DST falls back on this day)
      // Monday-start week:
      const monWeek = weekDates('2026-11-01', 1)
      expect(monWeek).toEqual([
        '2026-10-26',
        '2026-10-27',
        '2026-10-28',
        '2026-10-29',
        '2026-10-30',
        '2026-10-31',
        '2026-11-01',
      ])
      expect(new Set(monWeek).size).toBe(7)

      // Sunday-start week:
      const sunWeek = weekDates('2026-11-01', 0)
      expect(sunWeek).toEqual([
        '2026-11-01',
        '2026-11-02',
        '2026-11-03',
        '2026-11-04',
        '2026-11-05',
        '2026-11-06',
        '2026-11-07',
      ])
      expect(new Set(sunWeek).size).toBe(7)
    })

    it('monthRange calculates exact month boundaries', () => {
      expect(monthRange(2026, 2)).toEqual({ start: '2026-02-01', end: '2026-02-28' })
      expect(monthRange(2024, 2)).toEqual({ start: '2024-02-01', end: '2024-02-29' })
      expect(monthRange(2026, 11)).toEqual({ start: '2026-11-01', end: '2026-11-30' })
      expect(monthRange(2026, 12)).toEqual({ start: '2026-12-01', end: '2026-12-31' })
    })
  })
})
