'use client'
// components/nav/Sidebar.tsx — Desktop sidebar with refined tokens & states
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { NAV_ITEMS } from '@/lib/nav'
import { useTheme } from '@/components/providers/ThemeProvider'
import { ThemeToggle } from './ThemeToggle'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function Sidebar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email)
    })
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : '1%'

  return (
    <aside
      className="app-sidebar hidden lg:flex"
      style={{
        width: 220,
        height: '100dvh',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRight: '1px solid var(--border)',
        backgroundColor: 'var(--bg)',
        backgroundImage: 'radial-gradient(circle, var(--dot-color) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        boxShadow: 'none',
      }}
    >
      <div>
        {/* Top Header */}
        <div
          style={{
            padding: '24px 18px 20px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.9375rem',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)',
              }}
            >
              ~/ 1% better
            </span>
          </div>
          {userEmail && (
            <p
              title={userEmail}
              style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                letterSpacing: '0.02em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {userEmail}
            </p>
          )}
        </div>

        {/* Nav Items */}
        <nav style={{ padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  fontWeight: active ? 600 : 500,
                  letterSpacing: '0.02em',
                  textDecoration: 'none',
                  color: active ? 'var(--accent)' : 'var(--text-primary)',
                  backgroundColor: active ? 'rgba(139, 168, 136, 0.14)' : 'transparent',
                  borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                  transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                }}
              >
                <Icon
                  size={15}
                  strokeWidth={active ? 2 : 1.5}
                  color={active ? 'var(--accent)' : 'var(--text-muted)'}
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom Profile & Sign out section */}
      <div
        style={{
          padding: '16px 14px',
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {/* Avatar Initials Circle */}
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: 'var(--accent-light)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.6875rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                Account
              </p>
            </div>
          </div>

          {/* Theme toggle */}
          <ThemeToggle />
        </div>

        {/* Sign Out Action Button */}
        <button
          onClick={handleSignOut}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '7px 10px',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'color 0.15s ease, border-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#B91C1C'
            e.currentTarget.style.borderColor = 'rgba(185, 28, 28, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)'
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >
          <LogOut size={12} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
