// app/layout.tsx — Root layout
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'

export const metadata: Metadata = {
  title: '1% Better',
  description: 'Personal habit and discipline tracker. Getting 1% better every day.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '1% Better',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#1A1815' },
    { media: '(prefers-color-scheme: light)', color: '#F7F5F2' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
          rel="stylesheet"
        />
        {/* Client Timezone Sync: prevents midnight drift for non-UTC users */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                  if (tz) {
                    var match = document.cookie.match(new RegExp('(?:^|; )x-user-timezone=([^;]*)'));
                    var currentTz = match ? decodeURIComponent(match[1]) : null;
                    if (currentTz !== tz) {
                      document.cookie = 'x-user-timezone=' + encodeURIComponent(tz) + '; path=/; max-age=31536000; SameSite=Lax';
                    }
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
