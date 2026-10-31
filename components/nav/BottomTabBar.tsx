'use client'
// components/nav/BottomTabBar.tsx — Mobile bottom navigation bar
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BOTTOM_BAR_ITEMS } from '@/lib/nav'

export function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="app-bottom-bar lg:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(58px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        backgroundColor: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        zIndex: 50,
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingLeft: 8,
        paddingRight: 8,
      }}
    >
      {BOTTOM_BAR_ITEMS.map((item) => {
        const Icon = item.icon
        const active =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(item.href))

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              minHeight: 44,
              padding: '6px 8px',
              borderRadius: 'var(--radius-md)',
              color: active ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '0.65rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: active ? 700 : 500,
              letterSpacing: '0.04em',
              textDecoration: 'none',
              flex: 1,
              transition: 'color 0.15s ease',
            }}
          >
            <Icon size={17} strokeWidth={active ? 2.2 : 1.5} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
