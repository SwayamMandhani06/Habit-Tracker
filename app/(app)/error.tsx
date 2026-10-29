'use client'
// app/(app)/error.tsx — Graceful in-app error boundary
import { useEffect } from 'react'
import Link from 'next/link'
import { RotateCcw, LayoutDashboard } from 'lucide-react'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log silently without polluting UI
    console.error('App interior caught error:', error?.message)
  }, [error])

  return (
    <div className="page-container max-w-lg mx-auto py-24 px-4 text-center space-y-6">
      <p className="text-xs font-mono tracking-wider text-[var(--text-muted)]">
        ~/ error · <span className="text-[var(--text-primary)]">[ Try Again ]</span>
      </p>

      <div className="bg-[var(--surface)] border border-[var(--border)] p-8 rounded-sm space-y-5 font-mono">
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Unexpected Friction
          </h2>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-xs mx-auto">
            An issue interrupted this view. Your habits and records remain secure.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="btn btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono tracking-wider"
          >
            <RotateCcw size={13} />
            <span>[ Try Again ]</span>
          </button>

          <Link
            href="/dashboard"
            className="btn btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono tracking-wider"
          >
            <LayoutDashboard size={13} />
            <span>[ Dashboard ]</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

