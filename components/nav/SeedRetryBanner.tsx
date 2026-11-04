'use client'
// components/nav/SeedRetryBanner.tsx — Banner displaying seed failure and retry action
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { seedDefaultDataAction } from '@/actions/habit.actions'

interface SeedRetryBannerProps {
  error: string
}

export function SeedRetryBanner({ error }: SeedRetryBannerProps) {
  const [retrying, setRetrying] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)
  const router = useRouter()

  if (dismissed) return null

  const handleRetry = async () => {
    setRetrying(true)
    setRetryError(null)
    try {
      const res = await seedDefaultDataAction()
      if (res.success) {
        setDismissed(true)
        router.refresh()
      } else {
        setRetryError(res.error || 'Retry failed. Check database permissions.')
      }
    } catch (err: any) {
      setRetryError(err?.message || 'Network error while attempting setup.')
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div
      role="alert"
      style={{
        padding: '10px 16px',
        backgroundColor: 'rgba(217, 95, 79, 0.08)',
        borderBottom: '1px solid rgba(217, 95, 79, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        fontFamily: 'var(--font-mono)',
        fontSize: '0.8125rem',
        color: 'var(--text-main)',
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
        <span style={{ color: 'var(--accent-rose, #d95f4f)', fontWeight: 600 }}>[Notice]</span>
        <span className="truncate">
          {retryError ? `Retry failed: ${retryError}` : `Initial habits setup encountered an issue: ${error}`}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="btn"
          style={{
            fontSize: '0.75rem',
            padding: '4px 12px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            cursor: retrying ? 'not-allowed' : 'pointer',
          }}
        >
          {retrying ? 'Retrying...' : 'Retry Setup'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
          title="Dismiss notice"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

