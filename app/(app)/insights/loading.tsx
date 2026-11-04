// app/(app)/insights/loading.tsx — Paper-styled loading skeleton for /insights
export default function InsightsLoading() {
  return (
    <div
      className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6 animate-pulse select-none"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {/* Top Header & Month Switcher */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-4 w-28 rounded bg-[var(--border)] opacity-60" />
          <div className="h-7 w-52 rounded-lg bg-[var(--border)]" />
        </div>
        <div className="w-28 h-9 rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
      </div>

      {/* 4 Summary Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-20 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-3.5 flex flex-col justify-between"
          >
            <div className="h-2.5 w-16 rounded bg-[var(--border)] opacity-60" />
            <div className="h-6 w-12 rounded bg-[var(--border)]" />
          </div>
        ))}
      </div>

      {/* Main Chart Card Skeleton */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-40 rounded bg-[var(--border)]" />
          <div className="h-4 w-20 rounded bg-[var(--border)] opacity-50" />
        </div>
        <div className="h-56 w-full rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]" />
      </div>

      {/* Habits List Skeleton */}
      <div className="space-y-3 pt-2">
        <div className="h-4 w-32 rounded bg-[var(--border)] opacity-60" />
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-16 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 flex items-center justify-between"
          >
            <div className="h-4 w-36 rounded bg-[var(--border)]" />
            <div className="h-5 w-16 rounded-full bg-[var(--border)] opacity-50" />
          </div>
        ))}
      </div>
    </div>
  )
}

