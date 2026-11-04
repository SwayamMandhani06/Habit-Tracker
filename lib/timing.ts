// lib/timing.ts — High-resolution performance timing instrumentation
// Measures middleware, layout, and database query durations.
// Emits one JSON line per step and formats Server-Timing headers.

export interface TimingRecord {
  type: 'timing'
  page: string
  step: string
  durationMs: number
  timestamp: number
  error?: boolean
}

export async function timeStep<T>(
  page: string,
  step: string,
  fn: () => PromiseLike<T> | Promise<T>
): Promise<T> {
  const start = performance.now()
  let hasError = false
  try {
    return await fn()
  } catch (err) {
    hasError = true
    throw err
  } finally {
    const durationMs = Math.round((performance.now() - start) * 100) / 100
    const record: TimingRecord = {
      type: 'timing',
      page,
      step,
      durationMs,
      timestamp: Date.now(),
      ...(hasError ? { error: true } : {}),
    }
    console.log(JSON.stringify(record))
  }
}

export function formatServerTiming(timings: Array<{ name: string; dur: number; desc?: string }>): string {
  return timings
    .map((t) => {
      const parts = [`${t.name};dur=${t.dur.toFixed(1)}`]
      if (t.desc) parts.push(`desc="${t.desc}"`)
      return parts.join(';')
    })
    .join(', ')
}
