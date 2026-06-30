// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Headers for PWA static assets
  async headers() {
    return [
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

  // Exclude server-only modules from client bundles
  serverExternalPackages: ['iron-session'],
}

export default nextConfig
