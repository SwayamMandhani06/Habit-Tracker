'use client'
// components/nav/BottomTabBar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BOTTOM_BAR_ITEMS } from '@/lib/nav'

export function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav className="app-bottom-bar">
      {BOTTOM_BAR_ITEMS.map(item => {
        const Icon = item.icon
        const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`tab-bar-item ${active ? 'active' : ''}`}
          >
            <Icon size={18} strokeWidth={active ? 2 : 1.5} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
