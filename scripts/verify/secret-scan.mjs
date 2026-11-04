import { execSync } from 'child_process'
import fs from 'fs'

const files = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean)

const patterns = [
  { name: 'JWT-like (eyJ...)', regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: 'service_role keyword', regex: /service_role/i },
  { name: 'sb_secret keyword', regex: /sb_secret/i },
  { name: 'SUPABASE_SERVICE_ROLE_KEY with value', regex: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]+['"]/ },
  { name: 'Hardcoded password assignment', regex: /(?:password|passwd|secret)\s*[:=]\s*['"][a-zA-Z0-9!@#$%^&*()_+]{8,}['"]/i },
  { name: 'Hardcoded email assignment', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/ },
]

console.log(`Scanning ${files.length} tracked files...`)
let totalHits = 0

for (const f of files) {
  if (!fs.existsSync(f)) continue
  // skip binary files
  if (f.endsWith('.png') || f.endsWith('.ico') || f.endsWith('.svg')) continue

  const content = fs.readFileSync(f, 'utf8')
  const lines = content.split('\n')
  lines.forEach((line, lineNum) => {
    for (const p of patterns) {
      if (p.regex.test(line)) {
        // filter out example emails or documentation placeholders
        if (p.name.includes('email') && (line.includes('example.com') || line.includes('placeholder') || line.includes('your-email'))) {
          continue
        }
        console.log(`HIT in ${f}:${lineNum + 1} [${p.name}]: ${line.trim().slice(0, 80)}`)
        totalHits++
      }
    }
  })
}

// Staged diff scan
console.log('\nScanning git staged diff...')
try {
  const staged = execSync('git diff --cached', { encoding: 'utf8' })
  if (staged) {
    const lines = staged.split('\n')
    lines.forEach((line, lineNum) => {
      for (const p of patterns) {
        if (p.regex.test(line)) {
          console.log(`HIT in staged diff line ${lineNum + 1} [${p.name}]: ${line.trim().slice(0, 80)}`)
          totalHits++
        }
      }
    })
  } else {
    console.log('No staged changes in git index.')
  }
} catch (e) {
  console.log('Error reading staged diff:', e.message)
}

console.log(`\nScan complete. Total hits: ${totalHits}`)

