// scripts/measure-benchmark.mjs
// Benchmark tool for Task 4: Measures cold and warm response times and Server-Timing headers.

import http from 'http'

const BASE_URL = 'http://localhost:3000'
const ROUTES = [
  '/',
  '/login',
  '/today',
  '/dashboard',
  '/grid',
  '/calendar',
  '/insights',
  '/review',
]

async function measureRoute(path, cookie = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const start = performance.now()
    const req = http.get(
      url,
      {
        headers: {
          ...(cookie ? { Cookie: cookie } : {}),
          'User-Agent': 'BenchmarkClient/1.0',
        },
      },
      (res) => {
        let body = ''
        res.on('data', (chunk) => {
          body += chunk
        })
        res.on('end', () => {
          const duration = performance.now() - start
          const serverTiming = res.headers['server-timing'] || '-'
          resolve({
            path,
            status: res.statusCode,
            durationMs: Math.round(duration * 10) / 10,
            serverTiming,
            location: res.headers['location'] || '',
          })
        })
      }
    )
    req.on('error', reject)
  })
}

async function runBenchmark(label = 'BASELINE') {
  console.log(`\n================================================================`)
  console.log(`TASK 4 BENCHMARK MEASUREMENT: ${label}`)
  console.log(`================================================================\n`)

  const results = []

  // 1. Cold pass
  console.log('Running Cold Pass...')
  for (const route of ROUTES) {
    try {
      const cold = await measureRoute(route)
      // Warm 1
      await new Promise((r) => setTimeout(r, 80))
      const warm1 = await measureRoute(route)
      // Warm 2
      await new Promise((r) => setTimeout(r, 80))
      const warm2 = await measureRoute(route)

      const warmAvg = Math.round(((warm1.durationMs + warm2.durationMs) / 2) * 10) / 10

      results.push({
        route,
        status: cold.status,
        coldMs: cold.durationMs,
        warmMs: warmAvg,
        serverTiming: warm1.serverTiming,
      })
    } catch (err) {
      console.error(`Error measuring ${route}:`, err.message)
      results.push({
        route,
        status: 'ERR',
        coldMs: -1,
        warmMs: -1,
        serverTiming: '-',
      })
    }
  }

  console.log('\n### Measurement Results Table:')
  console.log('| Route | Status | Cold Server Time (ms) | Warm Server Time (ms) | Server-Timing Header |')
  console.log('|---|:---:|:---:|:---:|---|')
  for (const r of results) {
    console.log(`| \`${r.route}\` | ${r.status} | ${r.coldMs} ms | ${r.warmMs} ms | \`${r.serverTiming}\` |`)
  }
  console.log('\n================================================================\n')
  return results
}

runBenchmark(process.argv[2] || 'MEASUREMENT')

