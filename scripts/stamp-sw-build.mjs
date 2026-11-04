// scripts/stamp-sw-build.mjs
// Prebuild script that automatically stamps BUILD_ID into public/sw.js from git SHA + timestamp.
// Never edit BUILD_ID in public/sw.js by hand.

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

function getGitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return 'dist'
  }
}

function stampServiceWorker() {
  const swPath = path.resolve(process.cwd(), 'public/sw.js')
  if (!fs.existsSync(swPath)) {
    console.error(`[stamp-sw-build] Error: ${swPath} not found!`)
    process.exit(1)
  }

  const gitSha = getGitSha()
  const timestamp = Date.now()
  const buildId = `${gitSha}_${timestamp}`
  const cacheName = `habit-static-${buildId}`

  let content = fs.readFileSync(swPath, 'utf8')
  if (!content.includes('const BUILD_ID =')) {
    console.error('[stamp-sw-build] Error: const BUILD_ID not found in public/sw.js!')
    process.exit(1)
  }

  const updated = content.replace(/const BUILD_ID = '[^']*'/, `const BUILD_ID = '${buildId}'`)
  fs.writeFileSync(swPath, updated, 'utf8')

  console.log(`[stamp-sw-build] Stamped BUILD_ID="${buildId}" -> CACHE_NAME="${cacheName}"`)
}

stampServiceWorker()

