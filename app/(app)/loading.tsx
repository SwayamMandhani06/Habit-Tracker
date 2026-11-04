// app/(app)/loading.tsx — Root (app) skeleton in paper style
export default function AppLoading() {
  return (
    <div
      className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6 animate-pulse"
      style={{
        fontFamily: 'var(--font-mono)',
      }}
    >
      {/* Top Header skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-32 rounded bg-[var(--border)] opacity-60" />
        <div className="h-8 w-64 rounded-lg bg-[var(--border)]" />
      </div>

      {/* Hero / KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 flex flex-col justify-between"
          >
            <div className="h-3 w-16 rounded bg-[var(--border)] opacity-60" />
            <div className="h-6 w-12 rounded bg-[var(--border)]" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="space-y-3 pt-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 flex items-center justify-between"
          >
            <div className="space-y-2 flex-1">
              <div className="h-4 w-48 rounded bg-[var(--border)]" />
              <div className="h-3 w-28 rounded bg-[var(--border)] opacity-50" />
            </div>
            <div className="w-9 h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]" />
          </div>
        ))}
      </div>
    </div>
  )
}

