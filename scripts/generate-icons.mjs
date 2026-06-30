// scripts/generate-icons.mjs
// Run: node scripts/generate-icons.mjs
// Creates placeholder PWA icons — replace with your real icons before deploying

import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

// If 'canvas' is not installed, use this simpler approach:
// Just create SVG-based icons and convert them

const sizes = [192, 512]
const publicDir = join(process.cwd(), 'public', 'icons')

try {
  mkdirSync(publicDir, { recursive: true })
  console.log('Icons directory created at public/icons/')
  console.log('Please add your PWA icons manually:')
  console.log('  - public/icons/icon-192.png (192x192)')
  console.log('  - public/icons/icon-512.png (512x512)')
  console.log('  - public/icons/icon-maskable.png (512x512 with safe zone)')
  console.log('  - public/icons/apple-touch-icon.png (180x180)')
  console.log('\nYou can generate them at: https://maskable.app/ or https://realfavicongenerator.net/')
} catch (e) {
  console.error(e)
}
