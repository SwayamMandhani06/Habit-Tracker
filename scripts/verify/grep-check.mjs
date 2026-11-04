import { execSync } from 'child_process'
import fs from 'fs'

const rules = [
  { label: 'APP_PIN', regex: /APP_PIN/ },
  { label: 'SESSION_SECRET', regex: /SESSION_SECRET/ },
  { label: 'iron-session', regex: /iron-session/ },
  { label: '/pin route', regex: /['"]\/(?:api\/)?pin['"]/ },
  { label: 'daily_scores read', regex: /\.(?:from|select)\(['"]daily_scores['"]\)/ },
  { label: 'habit_monthly_stats read', regex: /\.(?:from|select)\(['"]habit_monthly_stats['"]\)/ },
  { label: 'createAdminClient', regex: /createAdminClient/ },
  { label: 'toISOString().slice', regex: /toISOString\(\)\.slice/ },
  { label: '.split("T") date logic', regex: /\.split\(['"]T['"]\)/ },
]

const files = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean)

let violations = 0
for (const f of files) {
  if (!fs.existsSync(f)) continue
  if (f.endsWith('.png') || f.endsWith('.ico') || f.endsWith('.svg')) continue
  if (f.endsWith('.md')) continue
  // migrations are SQL defining or dropping, not app code reads
  if (f.startsWith('supabase/migrations')) continue

  const content = fs.readFileSync(f, 'utf8')
  const lines = content.split('\n')
  lines.forEach((line, i) => {
    for (const rule of rules) {
      if (rule.regex.test(line)) {
        console.log(`VIOLATION: [${rule.label}] in ${f}:${i + 1} -> ${line.trim()}`)
        violations++
      }
    }
  })
}

// Special check: new Date() inside server date logic (lib/date.server.ts)
if (fs.existsSync('lib/date.server.ts')) {
  const content = fs.readFileSync('lib/date.server.ts', 'utf8')
  const lines = content.split('\n')
  lines.forEach((line, i) => {
    if (/new Date\(\)/.test(line)) {
      console.log(`VIOLATION: [new Date() in lib/date.server.ts] line ${i + 1} -> ${line.trim()}`)
      violations++
    }
  })
}

console.log(`Total A.4 violations: ${violations}`)

