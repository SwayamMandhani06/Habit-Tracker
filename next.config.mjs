// next.config.mjs
import fs from 'fs'
import path from 'path'

// Stamp BUILD_ID into public/sw.js during config evaluation
try {
  const swPath = path.resolve(process.cwd(), 'public/sw.js')
  if (fs.existsSync(swPath)) {
    const buildId = process.env.BUILD_ID || `build_${Date.now()}`
    let swContent = fs.readFileSync(swPath, 'utf8')
    if (swContent.includes('const BUILD_ID =')) {
      swContent = swContent.replace(/const BUILD_ID = '[^']*'/, `const BUILD_ID = '${buildId}'`)
      fs.writeFileSync(swPath, swContent, 'utf8')
    }
  }
} catch (err) {
  console.warn('[next.config.mjs] Note: Could not stamp sw.js:', err)
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Headers for PWA static assets and Service Worker
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/icons/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
    ]
  },
}

export default nextConfig
