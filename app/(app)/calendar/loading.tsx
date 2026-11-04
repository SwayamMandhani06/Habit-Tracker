// app/(app)/calendar/loading.tsx — Paper-styled loading skeleton for /calendar
export default function CalendarLoading() {
  return (
    <div
      className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6 animate-pulse select-none"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-4 w-28 rounded bg-[var(--border)] opacity-60" />
          <div className="h-7 w-44 rounded-lg bg-[var(--border)]" />
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)]" />
          <div className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)]" />
        </div>
      </div>

      {/* Month Calendar Grid Skeleton */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
        {/* Day of Week Headers */}
        <div className="grid grid-cols-7 gap-2 border-b border-[var(--border)] pb-2.5 text-center">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="h-3 w-4 mx-auto rounded bg-[var(--border)] opacity-60" />
          ))}
        </div>

        {/* 5 Weeks of Cells */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-2 flex flex-col justify-between"
            >
              <div className="h-3 w-3 rounded bg-[var(--border)] opacity-60" />
              <div className="w-2 h-2 rounded-full bg-[var(--border)] opacity-40 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

