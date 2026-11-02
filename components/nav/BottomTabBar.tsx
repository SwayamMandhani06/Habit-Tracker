'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  CheckSquare,
  Timer,
  Calendar as CalendarIcon,
  Menu,
  BarChart2,
  Grid3X3,
  BookOpen,
  Settings,
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  X,
} from 'lucide-react'
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet'
import { useTheme } from '@/components/providers/ThemeProvider'
import { createClient } from '@/lib/supabase/client'

export function BottomTabBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [moreSheetOpen, setMoreSheetOpen] = useState(false)

  const handleSignOut = async () => {
    setMoreSheetOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isTodayActive = pathname === '/today' || pathname.startsWith('/today?')
  const isDashboardActive = pathname === '/dashboard'
  const isFocusActive = pathname === '/focus' || pathname.startsWith('/focus?')
  const isCalendarActive = pathname === '/calendar' || pathname.startsWith('/calendar?')
  const isMoreActive =
    pathname.startsWith('/insights') ||
    pathname.startsWith('/grid') ||
    pathname.startsWith('/review') ||
    pathname.startsWith('/settings')

  return (
    <>
      <nav
        aria-label="Mobile bottom navigation"
        className="app-bottom-bar lg:hidden"
      >
        {/* Slot 1: Dashboard */}
        <Link
          href="/dashboard"
          prefetch={true}
          aria-label="Dashboard"
          aria-current={isDashboardActive ? 'page' : undefined}
          className="flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 text-center transition-colors select-none"
          style={{
            color: isDashboardActive ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          <LayoutDashboard size={19} strokeWidth={isDashboardActive ? 2.4 : 1.7} />
          <span className="font-mono text-[10px] font-bold mt-1 tracking-wider">
            Dashboard
          </span>
        </Link>

        {/* Slot 2: Today */}
        <Link
          href="/today"
          prefetch={true}
          aria-label="Today"
          aria-current={isTodayActive ? 'page' : undefined}
          className="flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 text-center transition-colors select-none"
          style={{
            color: isTodayActive ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          <CheckSquare size={19} strokeWidth={isTodayActive ? 2.4 : 1.7} />
          <span className="font-mono text-[10px] font-bold mt-1 tracking-wider">
            Today
          </span>
        </Link>

        {/* Slot 3: Focus (Centre Raised Button: 56px accent circle raised 16px) */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <Link
            href="/focus"
            prefetch={true}
            aria-label="Focus Timer"
            aria-current={isFocusActive ? 'page' : undefined}
            className="flex items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg hover:scale-105 active:scale-95 transition-all select-none"
            style={{
              width: 56,
              height: 56,
              marginTop: -28,
              boxShadow: '0 8px 24px -4px rgba(92, 107, 90, 0.45)',
              border: '3px solid var(--surface)',
            }}
          >
            <Timer size={25} strokeWidth={2.4} />
          </Link>
          <span
            className="font-mono text-[10px] font-bold mt-1 tracking-wider"
            style={{
              color: isFocusActive ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            Focus
          </span>
        </div>

        {/* Slot 4: Calendar */}
        <Link
          href="/calendar"
          prefetch={true}
          aria-label="Calendar"
          aria-current={isCalendarActive ? 'page' : undefined}
          className="flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 text-center transition-colors select-none"
          style={{
            color: isCalendarActive ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          <CalendarIcon size={19} strokeWidth={isCalendarActive ? 2.4 : 1.7} />
          <span className="font-mono text-[10px] font-bold mt-1 tracking-wider">
            Calendar
          </span>
        </Link>

        {/* Slot 5: More (Opens Bottom Sheet) */}
        <button
          type="button"
          onClick={() => setMoreSheetOpen(true)}
          aria-label="More navigation options"
          aria-expanded={moreSheetOpen}
          className="flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 text-center transition-colors cursor-pointer select-none"
          style={{
            color: isMoreActive ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          <Menu size={19} strokeWidth={isMoreActive ? 2.4 : 1.7} />
          <span className="font-mono text-[10px] font-bold mt-1 tracking-wider">
            More
          </span>
        </button>
      </nav>

      {/* ── MORE BOTTOM SHEET ──────────────────────────────────────────────── */}
      <ResponsiveSheet
        isOpen={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        title="More Navigation"
        description="Access analytics, habit matrix, and system preferences"
      >
        <div className="space-y-4">
          {/* Main 4 Nav Links Grid */}
          <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
            <Link
              href="/insights"
              onClick={() => setMoreSheetOpen(false)}
              className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--accent)] flex items-center gap-3 transition-all"
            >
              <span className="w-8 h-8 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                <BarChart2 size={16} />
              </span>
              <div>
                <span className="font-bold text-[var(--text-primary)] block">Insights</span>
                <span className="text-[10px] text-[var(--text-muted)]">Analytics</span>
              </div>
            </Link>

            <Link
              href="/grid"
              onClick={() => setMoreSheetOpen(false)}
              className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--accent)] flex items-center gap-3 transition-all"
            >
              <span className="w-8 h-8 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                <Grid3X3 size={16} />
              </span>
              <div>
                <span className="font-bold text-[var(--text-primary)] block">Grid</span>
                <span className="text-[10px] text-[var(--text-muted)]">Habit Matrix</span>
              </div>
            </Link>

            <Link
              href="/review"
              onClick={() => setMoreSheetOpen(false)}
              className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--accent)] flex items-center gap-3 transition-all"
            >
              <span className="w-8 h-8 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                <BookOpen size={16} />
              </span>
              <div>
                <span className="font-bold text-[var(--text-primary)] block">Review</span>
                <span className="text-[10px] text-[var(--text-muted)]">Monthly Log</span>
              </div>
            </Link>

            <Link
              href="/settings"
              onClick={() => setMoreSheetOpen(false)}
              className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--accent)] flex items-center gap-3 transition-all"
            >
              <span className="w-8 h-8 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                <Settings size={16} />
              </span>
              <div>
                <span className="font-bold text-[var(--text-primary)] block">Settings</span>
                <span className="text-[10px] text-[var(--text-muted)]">Preferences</span>
              </div>
            </Link>
          </div>

          {/* Quick Actions Row */}
          <div className="pt-2 border-t border-[var(--border)] space-y-2">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full p-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--surface)] flex items-center justify-between font-mono text-xs cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                  {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                </span>
                <div className="text-left">
                  <span className="font-bold text-[var(--text-primary)] block">Theme</span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Current: {theme === 'dark' ? 'Warm Night' : 'Paper Light'}
                  </span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-[var(--accent)]">
                Switch
              </span>
            </button>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full p-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 flex items-center justify-between font-mono text-xs text-rose-500 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <LogOut size={16} />
                </span>
                <span className="font-bold">Sign Out</span>
              </div>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </ResponsiveSheet>
    </>
  )
}
