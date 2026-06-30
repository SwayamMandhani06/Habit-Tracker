'use client'
// components/nav/Sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from '@/lib/nav'
import { useTheme } from '@/components/providers/ThemeProvider'
import { Sun, Moon, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function Sidebar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/pin')
    router.refresh()
  }

  return (
    <aside className="app-sidebar">
      {/* Brand */}
      <div style={{ padding: '22px 16px 18px', borderBottom: '1px solid var(--border-default)' }}>
        <p style={{
          fontSize: '0.6875rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--ink-tertiary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          personal
        </p>
        <h1 style={{
          fontSize: '1rem',
          fontWeight: 500,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '-0.01em',
          color: 'var(--ink-primary)',
        }}>
          1% better
        </h1>
      </div>

      {/* Nav items */}
      <nav style={{ padding: '10px 8px', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${active ? 'active' : ''}`}
              >
                <Icon size={14} strokeWidth={active ? 2 : 1.5} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div style={{
        padding: '18px 8px 12px',
        borderTop: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <button
          onClick={toggleTheme}
          className="btn-icon"
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <button
          onClick={handleLogout}
          className="btn-icon"
          aria-label="Log out"
          title="Lock screen"
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  )
}
