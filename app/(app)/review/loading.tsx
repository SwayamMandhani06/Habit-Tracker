// app/(app)/review/loading.tsx — Paper-styled loading skeleton for /review
export default function ReviewLoading() {
  return (
    <div
      className="w-full max-w-3xl mx-auto px-4 py-8 space-y-6 animate-pulse select-none"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-4 w-28 rounded bg-[var(--border)] opacity-60" />
          <div className="h-7 w-52 rounded-lg bg-[var(--border)]" />
        </div>
        <div className="w-24 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)]" />
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-3.5 flex flex-col justify-between"
          >
            <div className="h-2.5 w-16 rounded bg-[var(--border)] opacity-60" />
            <div className="h-6 w-14 rounded bg-[var(--border)]" />
          </div>
        ))}
      </div>

      {/* Reflection Text Area Skeletons */}
      <div className="space-y-4 pt-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3"
          >
            <div className="h-4 w-44 rounded bg-[var(--border)]" />
            <div className="h-24 w-full rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]" />
          </div>
        ))}
      </div>
    </div>
  )
}

