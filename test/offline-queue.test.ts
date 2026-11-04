import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import {
  getOfflineQueue,
  saveOfflineQueue,
  enqueueOfflineMutation,
  flushOfflineQueue,
  clearOfflineQueue,
  type OfflineMutationItem,
} from '../lib/offline-queue'

// Setup window and localStorage mock for Node test environment
const storage = new Map<string, string>()
const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, String(value)),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
}

beforeAll(() => {
  globalThis.localStorage = localStorageMock as any
  globalThis.window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  } as any
  globalThis.CustomEvent = class {
    constructor(public type: string, public init?: any) {}
  } as any
})

describe('lib/offline-queue.ts — Hardened PWA Offline Mutation Queue', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('initializes with an empty queue and allows clearOfflineQueue', () => {
    expect(getOfflineQueue()).toEqual([])
    enqueueOfflineMutation('user-1', 'setHabitCompletion', {
      date: '2026-11-03',
      habitId: 'h1',
      isCompleted: true,
    })
    expect(getOfflineQueue().length).toBe(1)
    clearOfflineQueue()
    expect(getOfflineQueue().length).toBe(0)
  })

  it('enqueues a mutation with userId, stored target date, and absolute state', () => {
    const item = enqueueOfflineMutation('user-1', 'setHabitCompletion', {
      date: '2026-11-03',
      habitId: 'h1',
      isCompleted: true,
    })

    expect(item).toBeDefined()
    expect(item.userId).toBe('user-1')
    expect(item.date).toBe('2026-11-03')
    expect(item.action).toBe('setHabitCompletion')
    expect(item.payload.isCompleted).toBe(true)
    expect(item.retryCount).toBe(0)

    const queue = getOfflineQueue()
    expect(queue.length).toBe(1)
    expect(queue[0].userId).toBe('user-1')
    expect(queue[0].payload.isCompleted).toBe(true)
  })

  it('coalesces rapid state changes for the same user, habit & date into the latest desired state', () => {
    enqueueOfflineMutation('user-1', 'setHabitCompletion', {
      date: '2026-11-03',
      habitId: 'h1',
      isCompleted: true,
    })
    enqueueOfflineMutation('user-1', 'setHabitCompletion', {
      date: '2026-11-03',
      habitId: 'h1',
      isCompleted: false,
    })

    const queue = getOfflineQueue()
    expect(queue.length).toBe(1)
    expect(queue[0].payload.isCompleted).toBe(false)
  })

  it('flushes pending mutations strictly to their stored target date, not today', async () => {
    enqueueOfflineMutation('user-1', 'setHabitCompletion', {
      date: '2026-10-25', // past date
      habitId: 'h1',
      isCompleted: true,
    })

    const setHabitMock = vi.fn().mockResolvedValue({ success: true })

    const result = await flushOfflineQueue('user-1', {
      setHabitCompletion: setHabitMock,
    })

    expect(result.synced).toBe(1)
    expect(result.remaining).toBe(0)
    expect(setHabitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2026-10-25',
        habitId: 'h1',
        isCompleted: true,
      })
    )
    expect(getOfflineQueue().length).toBe(0)
  })

  it('discards mutations belonging to a different user on flush (account isolation)', async () => {
    // User A queues a mutation
    enqueueOfflineMutation('user-A', 'setHabitCompletion', {
      date: '2026-11-03',
      habitId: 'h-a',
      isCompleted: true,
    })

    // User B flushes the queue
    const setHabitMock = vi.fn().mockResolvedValue({ success: true })
    const result = await flushOfflineQueue('user-B', {
      setHabitCompletion: setHabitMock,
    })

    // User A's item was discarded and never called for User B
    expect(setHabitMock).not.toHaveBeenCalled()
    expect(result.synced).toBe(0)
    expect(getOfflineQueue().length).toBe(0)
  })

  it('retries failing mutations up to 3 times, then registers a visible error instead of dropping silently', async () => {
    enqueueOfflineMutation('user-1', 'setHabitCompletion', {
      date: '2026-11-03',
      habitId: 'h1',
      isCompleted: true,
    })

    const failingMock = vi.fn().mockResolvedValue({ error: 'Permission denied on database' })

    // Retry 1
    let res = await flushOfflineQueue('user-1', { setHabitCompletion: failingMock })
    expect(res.synced).toBe(0)
    expect(res.remaining).toBe(1)
    expect(res.errors.length).toBe(0)
    expect(getOfflineQueue()[0].retryCount).toBe(1)

    // Retry 2
    res = await flushOfflineQueue('user-1', { setHabitCompletion: failingMock })
    expect(res.synced).toBe(0)
    expect(res.remaining).toBe(1)
    expect(res.errors.length).toBe(0)
    expect(getOfflineQueue()[0].retryCount).toBe(2)

    // Retry 3 (final attempt)
    res = await flushOfflineQueue('user-1', { setHabitCompletion: failingMock })
    expect(res.synced).toBe(0)
    expect(res.remaining).toBe(0) // dropped from retry queue
    expect(res.errors.length).toBe(1) // recorded as visible error!
    expect(res.errors[0].message).toBe('Permission denied on database')
    expect(res.errors[0].date).toBe('2026-11-03')
  })
})
