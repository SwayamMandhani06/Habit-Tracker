// app/(app)/today/loading.tsx — Paper-styled loading skeleton for /today
export default function TodayLoading() {
  return (
    <div
      className="w-full max-w-2xl mx-auto px-4 py-8 space-y-6 animate-pulse select-none"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {/* Top Header: Date and greeting */}
      <div className="space-y-2">
        <div className="h-4 w-28 rounded bg-[var(--border)] opacity-60" />
        <div className="h-8 w-56 rounded-lg bg-[var(--border)]" />
      </div>

      {/* 7-Day Week Strip Skeleton */}
      <div className="grid grid-cols-7 gap-2 p-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="flex flex-col items-center py-2.5 rounded-xl border border-transparent bg-[var(--surface-raised)] space-y-1.5"
          >
            <div className="h-2.5 w-6 rounded bg-[var(--border)] opacity-60" />
            <div className="h-4 w-4 rounded bg-[var(--border)]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--border)] opacity-40 mt-1" />
          </div>
        ))}
      </div>

      {/* Weekly Intention card skeleton */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="h-3 w-32 rounded bg-[var(--border)] opacity-60" />
          <div className="h-3 w-16 rounded bg-[var(--border)] opacity-40" />
        </div>
        <div className="h-5 w-3/4 rounded bg-[var(--border)]" />
      </div>

      {/* Habit Cards Skeleton List */}
      <div className="space-y-3 pt-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-20 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5 flex-1">
              <div className="w-10 h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-40 rounded bg-[var(--border)]" />
                <div className="h-2.5 w-24 rounded bg-[var(--border)] opacity-50" />
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]" />
          </div>
        ))}
      </div>
    </div>
  )
}

