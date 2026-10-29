// app/login/layout.tsx — Public login layout (no app shell)
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '1% Better — Login',
  description: 'Sign in to your 1% Better habit tracker account.',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
