'use client'
// components/settings/SettingsClient.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '@/components/providers/ThemeProvider'
import { HabitManager } from './HabitManager'
import { QuotesManager } from './QuotesManager'
import { Sun, Moon, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { HabitWithSubitems, Quote } from '@/lib/supabase/types'

interface Props {
  habits: HabitWithSubitems[]
  quotes: Quote[]
}

type Tab = 'habits' | 'quotes' | 'appearance' | 'account'
const TABS: { id: Tab; label: string }[] = [
  { id: 'habits',     label: 'habits'     },
  { id: 'quotes',     label: 'quotes'     },
  { id: 'appearance', label: 'appearance' },
  { id: 'account',    label: 'account'    },
]

export function SettingsClient({ habits, quotes }: Props) {
  const [tab, setTab] = useState<Tab>('habits')
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/pin')
    router.refresh()
  }

  return (
    <div className="page-container">
      {/* Path */}
      <motion.p className="text-path" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: 6 }}>
        ~/ settings
      </motion.p>

      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', color: 'var(--ink-primary)' }}>
          preferences
        </h1>
      </motion.div>

      {/* Tabs — underline style */}
      <div style={{
        display: 'flex',
        gap: 0,
        marginBottom: 24,
        borderBottom: '1px solid var(--border-default)',
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
              background: 'transparent',
              color: tab === t.id ? 'var(--accent)' : 'var(--ink-tertiary)',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
              cursor: 'pointer',
              transition: 'all var(--duration-fast)',
              marginBottom: '-1px',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'habits' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <HabitManager initialHabits={habits} />
        </motion.div>
      )}

      {tab === 'quotes' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <QuotesManager initialQuotes={quotes} />
        </motion.div>
      )}

      {tab === 'appearance' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-primary)', marginBottom: 3 }}>
                theme
              </p>
              <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)' }}>
                currently: {theme === 'dark' ? 'dark' : 'light'} mode
              </p>
            </div>
            <button onClick={toggleTheme} className="btn btn-ghost" style={{ gap: 8 }}>
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              {theme === 'dark' ? 'switch to light' : 'switch to dark'}
            </button>
          </div>
        </motion.div>
      )}

      {tab === 'account' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-primary)', marginBottom: 3 }}>
                lock screen
              </p>
              <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)' }}>
                sign out and return to the pin screen
              </p>
            </div>
            <button onClick={handleLogout} className="btn btn-danger">
              <LogOut size={14} />
              lock
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
