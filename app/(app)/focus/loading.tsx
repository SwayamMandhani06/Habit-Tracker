// app/(app)/focus/loading.tsx — Paper-styled loading skeleton for /focus
export default function FocusLoading() {
  return (
    <div
      className="w-full max-w-xl mx-auto px-4 py-12 flex flex-col items-center space-y-8 animate-pulse select-none"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="h-4 w-28 mx-auto rounded bg-[var(--border)] opacity-60" />
        <div className="h-7 w-48 mx-auto rounded-lg bg-[var(--border)]" />
      </div>

      {/* Timer Circle Skeleton */}
      <div className="w-64 h-64 rounded-full border-4 border-[var(--border)] bg-[var(--surface)] flex items-center justify-center p-4">
        <div className="h-12 w-32 rounded-lg bg-[var(--border)]" />
      </div>

      {/* Task Selector & Controls */}
      <div className="w-full space-y-4">
        <div className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
        <div className="flex gap-3 justify-center">
          <div className="w-28 h-11 rounded-full border border-[var(--border)] bg-[var(--surface-raised)]" />
          <div className="w-28 h-11 rounded-full border border-[var(--border)] bg-[var(--surface-raised)]" />
        </div>
      </div>
    </div>
  )
}

