// lib/offline-queue.ts — PWA Offline Mutation Queue
// Hardened offline queue for authenticated mutations when connection is temporarily lost while app is open.

export type OfflineActionType =
  | 'setHabitCompletion'
  | 'setHabitAmount'
  | 'setSubitemCompletion'
  | 'setHabitSkip'

export interface OfflineMutationItem {
  id: string              // client-generated id
  userId: string          // owner user ID (enforces account isolation)
  date: string            // target date (YYYY-MM-DD), never "today"
  action: OfflineActionType
  payload: {
    habitId: string
    date: string          // YYYY-MM-DD (stored target date)
    isCompleted?: boolean // absolute desired state
    amount?: number       // absolute desired state
    isSkipped?: boolean   // absolute desired state
    subitemId?: string
    allSubitemIds?: string[]
    currentSubitemCompletions?: Record<string, boolean>
  }
  createdAt: number
  retryCount: number
}

export interface SyncErrorItem {
  id: string
  userId: string
  habitId: string
  date: string
  message: string
}

const STORAGE_KEY = 'habit_offline_mutation_queue_v1'

export function getOfflineQueue(): OfflineMutationItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as OfflineMutationItem[]
  } catch {
    return []
  }
}

export function saveOfflineQueue(items: OfflineMutationItem[]): void {
  if (typeof window === 'undefined') return
  try {
    if (items.length === 0) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    }
    window.dispatchEvent(
      new CustomEvent('habit-offline-queue-change', { detail: { count: items.length } })
    )
  } catch (err) {
    console.warn('[OfflineQueue] Failed to save queue to localStorage:', err)
  }
}

export function clearOfflineQueue(): void {
  saveOfflineQueue([])
}

/**
 * Enqueues an offline mutation with an absolute desired state.
 * Coalesces rapid successive changes for the same user, date, habit, and action.
 */
export function enqueueOfflineMutation(
  userId: string,
  action: OfflineActionType,
  payload: {
    habitId: string
    date: string
    isCompleted?: boolean
    amount?: number
    isSkipped?: boolean
    subitemId?: string
    allSubitemIds?: string[]
    currentSubitemCompletions?: Record<string, boolean>
  }
): OfflineMutationItem {
  if (!userId) {
    throw new Error('[OfflineQueue] Cannot enqueue mutation without authenticated userId')
  }
  if (!payload.date || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
    throw new Error(`[OfflineQueue] Invalid target date: "${payload.date}". Expected YYYY-MM-DD`)
  }

  const current = getOfflineQueue()

  // Coalesce / deduplicate rapid successive changes for the same habit & date
  let filtered = current
  if (action === 'setHabitCompletion' || action === 'setHabitAmount' || action === 'setHabitSkip') {
    filtered = current.filter(
      (item) =>
        !(
          item.userId === userId &&
          item.action === action &&
          item.date === payload.date &&
          item.payload.habitId === payload.habitId
        )
    )
  } else if (action === 'setSubitemCompletion') {
    filtered = current.filter(
      (item) =>
        !(
          item.userId === userId &&
          item.action === action &&
          item.date === payload.date &&
          item.payload.subitemId === payload.subitemId
        )
    )
  }

  const clientId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  const newItem: OfflineMutationItem = {
    id: clientId,
    userId,
    date: payload.date,
    action,
    payload: {
      ...payload,
      date: payload.date, // explicit guarantee that stored date is preserved
    },
    createdAt: Date.now(),
    retryCount: 0,
  }

  filtered.push(newItem)
  saveOfflineQueue(filtered)
  return newItem
}

let isFlushing = false

/**
 * Flushes pending mutations for the current session user.
 * Discards items belonging to other users.
 * Applies mutations strictly to their stored target dates.
 * Retries up to 3 times on transient failure; after 3 failures, dispatches a visible error.
 */
export async function flushOfflineQueue(
  currentUserId: string,
  actionExecutors: {
    setHabitCompletion?: (payload: any) => Promise<any>
    setHabitAmount?: (payload: any) => Promise<any>
    setSubitemCompletion?: (payload: any) => Promise<any>
    setHabitSkip?: (payload: any) => Promise<any>
  }
): Promise<{
  synced: number
  remaining: number
  errors: SyncErrorItem[]
}> {
  if (typeof window === 'undefined' || isFlushing) {
    return { synced: 0, remaining: getOfflineQueue().length, errors: [] }
  }

  if (!currentUserId) {
    console.warn('[OfflineQueue] Cannot flush queue without currentUserId')
    return { synced: 0, remaining: getOfflineQueue().length, errors: [] }
  }

  const queue = getOfflineQueue()
  if (queue.length === 0) return { synced: 0, remaining: 0, errors: [] }

  isFlushing = true
  window.dispatchEvent(new CustomEvent('habit-offline-sync-status', { detail: { syncing: true } }))

  // 1. Account Isolation: Discard items whose userId differs from current session user
  const userItems: OfflineMutationItem[] = []
  const discardedItems: OfflineMutationItem[] = []

  for (const item of queue) {
    if (item.userId === currentUserId) {
      userItems.push(item)
    } else {
      discardedItems.push(item)
      console.warn(
        `[OfflineQueue] Discarding orphaned queue item ${item.id} belonging to user ${item.userId} (current user: ${currentUserId})`
      )
    }
  }

  let synced = 0
  const remainingItems: OfflineMutationItem[] = []
  const failedErrors: SyncErrorItem[] = []

  for (const item of userItems) {
    // Strictly apply to stored target date, never "today"
    const targetPayload = {
      ...item.payload,
      date: item.date,
    }

    try {
      let executor: ((payload: any) => Promise<any>) | undefined

      if (item.action === 'setHabitCompletion') executor = actionExecutors.setHabitCompletion
      else if (item.action === 'setHabitAmount') executor = actionExecutors.setHabitAmount
      else if (item.action === 'setSubitemCompletion') executor = actionExecutors.setSubitemCompletion
      else if (item.action === 'setHabitSkip') executor = actionExecutors.setHabitSkip

      if (executor) {
        const res = await executor(targetPayload)
        if (res && res.error) {
          const nextRetry = item.retryCount + 1
          if (nextRetry >= 3) {
            // After 3 failures: do NOT drop silently; record visible error
            failedErrors.push({
              id: item.id,
              userId: item.userId,
              habitId: item.payload.habitId,
              date: item.date,
              message: res.error,
            })
          } else {
            remainingItems.push({ ...item, retryCount: nextRetry })
          }
        } else {
          synced++
        }
      } else {
        remainingItems.push(item)
      }
    } catch (e: any) {
      const nextRetry = item.retryCount + 1
      if (nextRetry >= 3) {
        failedErrors.push({
          id: item.id,
          userId: item.userId,
          habitId: item.payload.habitId,
          date: item.date,
          message: e?.message || 'Network exception after 3 sync attempts',
        })
      } else {
        remainingItems.push({ ...item, retryCount: nextRetry })
      }
    }
  }

  saveOfflineQueue(remainingItems)
  isFlushing = false

  if (failedErrors.length > 0) {
    window.dispatchEvent(
      new CustomEvent('habit-offline-sync-error', {
        detail: { errors: failedErrors },
      })
    )
  }

  window.dispatchEvent(
    new CustomEvent('habit-offline-sync-status', {
      detail: { syncing: false, synced, remaining: remainingItems.length, errors: failedErrors },
    })
  )

  return { synced, remaining: remainingItems.length, errors: failedErrors }
}
