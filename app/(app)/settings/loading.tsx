// app/(app)/settings/loading.tsx — Paper-styled loading skeleton for /settings
export default function SettingsLoading() {
  return (
    <div
      className="w-full max-w-3xl mx-auto px-4 py-8 space-y-6 animate-pulse select-none"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {/* Top Header */}
      <div className="space-y-1.5">
        <div className="h-4 w-28 rounded bg-[var(--border)] opacity-60" />
        <div className="h-7 w-40 rounded-lg bg-[var(--border)]" />
      </div>

      {/* Habit Manager List Skeleton */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="h-4 w-32 rounded bg-[var(--border)]" />
          <div className="h-8 w-24 rounded-lg bg-[var(--border)] opacity-60" />
        </div>

        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-14 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded bg-[var(--border)] opacity-40" />
                <div className="h-4 w-36 rounded bg-[var(--border)]" />
              </div>
              <div className="w-6 h-6 rounded bg-[var(--border)] opacity-40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

