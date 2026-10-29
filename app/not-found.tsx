// app/not-found.tsx — Custom 404 in notebook design language
import Link from 'next/link'
import { LayoutDashboard } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)] font-mono">
      <div className="max-w-md w-full bg-[var(--surface)] border border-[var(--border)] p-8 rounded-sm text-center space-y-6">
        <p className="text-xs tracking-wider text-[var(--text-muted)]">
          ~/ 404 · page not found
        </p>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Blank Page
          </h1>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            This page does not exist in your notebook. Return to your active disciplines.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/dashboard"
            className="btn btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs tracking-wider"
          >
            <LayoutDashboard size={13} />
            <span>[ Dashboard ]</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

