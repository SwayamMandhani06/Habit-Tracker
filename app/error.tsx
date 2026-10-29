'use client'
// app/error.tsx — Root level graceful error boundary
import { useEffect } from 'react'
import Link from 'next/link'
import { RotateCcw, Home } from 'lucide-react'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Root caught error:', error?.message)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)] font-mono">
      <div className="max-w-md w-full bg-[var(--surface)] border border-[var(--border)] p-8 rounded-sm text-center space-y-6">
        <p className="text-xs tracking-wider text-[var(--text-muted)]">
          ~/ error · <span className="text-[var(--text-primary)]">[ Try Again ]</span>
        </p>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Temporary Pause
          </h1>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            An unexpected condition occurred. Try refreshing or return to your habit space.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-3">
          <button
            onClick={() => reset()}
            className="btn btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs tracking-wider"
          >
            <RotateCcw size={13} />
            <span>[ Try Again ]</span>
          </button>

          <Link
            href="/dashboard"
            className="btn btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs tracking-wider"
          >
            <Home size={13} />
            <span>[ Home ]</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

