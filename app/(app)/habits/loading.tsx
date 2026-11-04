// app/(app)/habits/loading.tsx — Paper-styled loading skeleton for habit details
export default function HabitDetailLoading() {
  return (
    <div
      className="w-full max-w-3xl mx-auto px-4 py-8 space-y-6 animate-pulse select-none"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)]" />
        <div className="space-y-1.5 flex-1">
          <div className="h-4 w-28 rounded bg-[var(--border)] opacity-60" />
          <div className="h-7 w-48 rounded-lg bg-[var(--border)]" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-3.5 flex flex-col justify-between"
          >
            <div className="h-2.5 w-16 rounded bg-[var(--border)] opacity-60" />
            <div className="h-6 w-12 rounded bg-[var(--border)]" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 h-56 w-full" />
    </div>
  )
}

