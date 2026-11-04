// app/(app)/grid/loading.tsx — Paper-styled loading skeleton for /grid
export default function GridLoading() {
  return (
    <div
      className="w-full max-w-5xl mx-auto px-4 py-8 space-y-6 animate-pulse select-none"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {/* Top Controls Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-4 w-28 rounded bg-[var(--border)] opacity-60" />
          <div className="h-7 w-48 rounded-lg bg-[var(--border)]" />
        </div>
        <div className="flex gap-2">
          <div className="w-9 h-9 rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
          <div className="w-9 h-9 rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
        </div>
      </div>

      {/* Grid Table Matrix Skeleton */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 overflow-hidden space-y-3">
        {/* Days Header Row */}
        <div className="flex items-center gap-1.5 border-b border-[var(--border)] pb-3">
          <div className="w-36 h-4 rounded bg-[var(--border)] opacity-60" />
          <div className="flex-1 flex gap-1 justify-between">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="w-6 h-5 rounded bg-[var(--border)] opacity-40" />
            ))}
          </div>
        </div>

        {/* Habit Rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-1.5 py-1.5">
            <div className="w-36 h-5 rounded bg-[var(--border)]" />
            <div className="flex-1 flex gap-1 justify-between">
              {Array.from({ length: 15 }).map((_, j) => (
                <div key={j} className="w-6 h-6 rounded-md bg-[var(--surface-raised)] border border-[var(--border)]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

