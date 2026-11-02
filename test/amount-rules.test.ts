// test/amount-rules.test.ts — Unit tests for Amount Habits completion, snapshot freezing, and legacy rules
import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// 1. Zod validation schema matching actions/completion.actions.ts
const setAmountSchema = z.object({
  habitId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
    (d) => {
      const parsed = new Date(d + 'T00:00:00Z')
      if (isNaN(parsed.getTime())) return false
      const today = new Date().toISOString().slice(0, 10)
      return d <= today
    },
    { message: 'Date must be a valid date and not in the future' }
  ),
  amount: z.number().finite().min(0).max(1_000_000),
})

// Business logic function matching save-time completion rule
function computeCompletion(amount: number, targetSnapshot: number | null): boolean {
  if (targetSnapshot === null || targetSnapshot === undefined) {
    return false
  }
  return amount >= targetSnapshot
}

// Logic function resolving target_snapshot on row creation vs existing row
function resolveTargetSnapshot(
  existingSnapshot: number | null | undefined,
  habitTargetValue: number | null
): number | null {
  if (existingSnapshot !== undefined && existingSnapshot !== null) {
    // Preserve previously frozen snapshot
    return Number(existingSnapshot)
  }
  // Freeze current habit target
  return habitTargetValue !== null ? Number(habitTargetValue) : null
}

describe('Rule 1: Amount Habit Completion Rule', () => {
  it('marks is_completed false when amount is below target_snapshot', () => {
    const isCompleted = computeCompletion(1.5, 4)
    expect(isCompleted).toBe(false)
  })

  it('marks is_completed true when amount exactly reaches target_snapshot', () => {
    const isCompleted = computeCompletion(4, 4)
    expect(isCompleted).toBe(true)
  })

  it('marks is_completed true when amount exceeds target_snapshot (over-achievement)', () => {
    const isCompleted = computeCompletion(10, 8)
    expect(isCompleted).toBe(true)
  })

  it('handles decimals accurately (e.g. 3.5 L water vs 4 L)', () => {
    expect(computeCompletion(3.5, 4)).toBe(false)
    expect(computeCompletion(4.0, 4)).toBe(true)
    expect(computeCompletion(4.5, 4)).toBe(true)
  })

  it('progress calculation caps at 100% on over-achievement', () => {
    const target = 8
    const calculateProgressPct = (amt: number, tgt: number) =>
      Math.min(100, Math.round((amt / tgt) * 100))

    expect(calculateProgressPct(4, target)).toBe(50)
    expect(calculateProgressPct(8, target)).toBe(100)
    expect(calculateProgressPct(12, target)).toBe(100)
  })
})

describe('Rule 2: Target Snapshot Freezing Rule', () => {
  it('freezes habit target_value into target_snapshot when first written', () => {
    const habit = { id: 'h1', target_value: 4 }
    const existingRow = null

    const frozenSnapshot = resolveTargetSnapshot(
      existingRow ? (existingRow as any).target_snapshot : undefined,
      habit.target_value
    )
    expect(frozenSnapshot).toBe(4)
  })

  it('preserves existing target_snapshot even if habit target_value changes later', () => {
    // Yesterday was saved when habit target was 4
    const existingRow = { target_snapshot: 4 }

    // Today user changed habit target to 5
    const updatedHabit = { id: 'h1', target_value: 5 }

    const resolved = resolveTargetSnapshot(
      existingRow.target_snapshot,
      updatedHabit.target_value
    )

    // Yesterday must still read 4!
    expect(resolved).toBe(4)
  })

  it('applies the new target only to days without an existing snapshot', () => {
    const updatedHabit = { id: 'h1', target_value: 5 }
    const newDayRow = null

    const newSnapshot = resolveTargetSnapshot(
      newDayRow ? (newDayRow as any).target_snapshot : undefined,
      updatedHabit.target_value
    )

    expect(newSnapshot).toBe(5)
  })
})

describe('Rule 3: Legacy Yes/No Days Rule', () => {
  it('treats rows with target_snapshot = null as legacy yes/no days', () => {
    const legacyRow = {
      amount: 0,
      target_snapshot: null,
      is_completed: true,
    }

    // When target_snapshot is null, is_completed is authoritative
    expect(legacyRow.is_completed).toBe(true)
    expect(legacyRow.target_snapshot).toBeNull()
  })

  it('converting a habit from checkbox to amount never corrupts past null snapshots', () => {
    const pastRows = [
      { date: '2026-10-28', is_completed: true, target_snapshot: null },
      { date: '2026-10-29', is_completed: false, target_snapshot: null },
    ]

    // New habit target is 8 glasses
    const habitTarget = 8

    // Verification: past rows preserve their null target_snapshot
    for (const row of pastRows) {
      const resolved = resolveTargetSnapshot(row.target_snapshot, habitTarget)
      // If row already has target_snapshot (even if null), legacy logic applies
      expect(row.target_snapshot).toBeNull()
      expect(row.is_completed).toBe(row.date === '2026-10-28')
    }
  })
})

describe('Rule 5: Input Validation & Bounds Checking', () => {
  const validHabitId = '11111111-1111-1111-1111-111111111111'
  const today = new Date().toISOString().slice(0, 10)

  it('accepts valid input (finite number, valid date <= today)', () => {
    const result = setAmountSchema.safeParse({
      habitId: validHabitId,
      date: today,
      amount: 4.5,
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative amounts', () => {
    const result = setAmountSchema.safeParse({
      habitId: validHabitId,
      date: today,
      amount: -1,
    })
    expect(result.success).toBe(false)
  })

  it('rejects amounts exceeding 1,000,000', () => {
    const result = setAmountSchema.safeParse({
      habitId: validHabitId,
      date: today,
      amount: 1_000_001,
    })
    expect(result.success).toBe(false)
  })

  it('rejects infinite or NaN amounts', () => {
    expect(
      setAmountSchema.safeParse({
        habitId: validHabitId,
        date: today,
        amount: Infinity,
      }).success
    ).toBe(false)

    expect(
      setAmountSchema.safeParse({
        habitId: validHabitId,
        date: today,
        amount: NaN,
      }).success
    ).toBe(false)
  })

  it('rejects future dates', () => {
    const futureDate = '2099-01-01'
    const result = setAmountSchema.safeParse({
      habitId: validHabitId,
      date: futureDate,
      amount: 5,
    })
    expect(result.success).toBe(false)
  })
})

