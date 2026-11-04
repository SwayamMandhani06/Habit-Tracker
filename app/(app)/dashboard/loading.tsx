// app/(app)/dashboard/loading.tsx — Paper-styled loading skeleton for /dashboard
export default function DashboardLoading() {
  return (
    <div
      className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6 animate-pulse select-none"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {/* Top Header */}
      <div className="space-y-2">
        <div className="h-4 w-32 rounded bg-[var(--border)] opacity-60" />
        <div className="h-8 w-60 rounded-lg bg-[var(--border)]" />
      </div>

      {/* KPI Cards Row (Today %, Streak, Perfect Days) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-[var(--border)] opacity-60" />
              <div className="w-5 h-5 rounded-md bg-[var(--border)] opacity-40" />
            </div>
            <div className="h-8 w-20 rounded-lg bg-[var(--border)]" />
          </div>
        ))}
      </div>

      {/* Weekly Sparkline Chart Skeleton */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-4 w-36 rounded bg-[var(--border)]" />
            <div className="h-3 w-48 rounded bg-[var(--border)] opacity-60" />
          </div>
          <div className="h-6 w-16 rounded bg-[var(--border)] opacity-40" />
        </div>
        <div className="h-48 w-full rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]" />
      </div>

      {/* Curated Discipline Quote Card Skeleton */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-3">
        <div className="h-3 w-24 rounded bg-[var(--border)] opacity-60" />
        <div className="h-5 w-5/6 rounded bg-[var(--border)]" />
        <div className="h-4 w-1/3 rounded bg-[var(--border)] opacity-50" />
      </div>
    </div>
  )
}

