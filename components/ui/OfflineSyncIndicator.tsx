'use client'

// components/ui/OfflineSyncIndicator.tsx
// Persistent banner for offline network state, syncing queue, and visible error notifications.

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react'
import {
  getOfflineQueue,
  flushOfflineQueue,
  type SyncErrorItem,
} from '@/lib/offline-queue'
import {
  toggleHabitCompletionAction,
  setHabitAmountAction,
  toggleSubitemCompletionAction,
  toggleHabitSkipAction,
} from '@/actions/completion.actions'
import { createClient } from '@/lib/supabase/client'

export function OfflineSyncIndicator() {
  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [hasUser, setHasUser] = useState<boolean>(true)
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [syncedBanner, setSyncedBanner] = useState<boolean>(false)
  const [syncErrors, setSyncErrors] = useState<SyncErrorItem[]>([])

  const handleFlush = useCallback(async () => {
    if (!navigator.onLine) return

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setHasUser(false)
      return
    }
    setHasUser(true)

    setIsSyncing(true)

    const result = await flushOfflineQueue(user.id, {
      setHabitCompletion: toggleHabitCompletionAction,
      setHabitAmount: setHabitAmountAction,
      setSubitemCompletion: toggleSubitemCompletionAction,
      setHabitSkip: toggleHabitSkipAction,
    })

    setIsSyncing(false)
    setPendingCount(result.remaining)

    if (result.errors && result.errors.length > 0) {
      setSyncErrors((prev) => [...prev, ...result.errors])
    }

    if (result.synced > 0) {
      setSyncedBanner(true)
      setTimeout(() => setSyncedBanner(false), 2500)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    setIsOnline(navigator.onLine)
    setPendingCount(getOfflineQueue().length)

    const handleOnline = () => {
      setIsOnline(true)
      handleFlush()
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    const handleQueueChange = (e: Event) => {
      const custom = e as CustomEvent
      setPendingCount(custom.detail?.count ?? getOfflineQueue().length)
    }

    const handleSyncStatus = (e: Event) => {
      const custom = e as CustomEvent
      if (custom.detail?.syncing !== undefined) {
        setIsSyncing(custom.detail.syncing)
      }
    }

    const handleSyncError = (e: Event) => {
      const custom = e as CustomEvent
      if (custom.detail?.errors) {
        setSyncErrors((prev) => [...prev, ...custom.detail.errors])
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('habit-offline-queue-change', handleQueueChange)
    window.addEventListener('habit-offline-sync-status', handleSyncStatus)
    window.addEventListener('habit-offline-sync-error', handleSyncError)

    // Flush any pending items if online on initial load
    if (navigator.onLine && getOfflineQueue().length > 0) {
      handleFlush()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('habit-offline-queue-change', handleQueueChange)
      window.removeEventListener('habit-offline-sync-status', handleSyncStatus)
      window.removeEventListener('habit-offline-sync-error', handleSyncError)
    }
  }, [handleFlush])

  const showIndicator =
    !isOnline || isSyncing || syncedBanner || pendingCount > 0 || syncErrors.length > 0

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex flex-col items-center gap-1.5"
        >
          <div
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full font-mono text-xs shadow-lg border backdrop-blur-md"
            style={{
              backgroundColor: !isOnline
                ? 'rgba(28, 25, 20, 0.88)'
                : 'var(--surface-raised)',
              borderColor: !isOnline ? 'rgba(239, 68, 68, 0.4)' : 'var(--border)',
              color: !isOnline ? '#FEE2E2' : 'var(--text-primary)',
            }}
          >
            {!isOnline ? (
              <>
                <WifiOff size={13} className="text-red-400 animate-pulse flex-shrink-0" />
                <span>
                  Offline mode {pendingCount > 0 ? `(${pendingCount} queued)` : ''}
                </span>
              </>
            ) : isSyncing ? (
              <>
                <RefreshCw size={13} className="animate-spin text-[var(--accent)] flex-shrink-0" />
                <span>Syncing {pendingCount} offline changes…</span>
              </>
            ) : syncedBanner ? (
              <>
                <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                <span>All changes synced</span>
              </>
            ) : !hasUser && pendingCount > 0 ? (
              <>
                <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />
                <a
                  href="/login"
                  className="hover:underline font-bold"
                >
                  Sign in to sync {pendingCount} change{pendingCount > 1 ? 's' : ''}
                </a>
              </>
            ) : pendingCount > 0 ? (
              <>
                <RefreshCw size={13} className="text-[var(--accent)] flex-shrink-0" />
                <button
                  type="button"
                  onClick={handleFlush}
                  className="hover:underline font-bold"
                >
                  Sync {pendingCount} pending changes
                </button>
              </>
            ) : null}
          </div>

          {/* Visible error notification for failed sync items (Point 2: after 3 failures show visible error) */}
          {syncErrors.length > 0 && (
            <div
              role="alert"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full font-mono text-xs shadow-lg border border-red-500/50 bg-red-950/90 text-red-100 backdrop-blur-md"
            >
              <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
              <span>
                Sync failed for habit on {syncErrors[0].date}: {syncErrors[0].message}
              </span>
              <button
                type="button"
                onClick={() => setSyncErrors([])}
                className="ml-2 font-bold underline hover:no-underline text-red-200"
              >
                Dismiss
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
