'use client'
// components/settings/SettingsClient.tsx — Refined preferences with switch toggle & subtle signout
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '@/components/providers/ThemeProvider'
import { ThemeToggle } from '@/components/nav/ThemeToggle'
import { isCompletionSoundEnabled, setCompletionSoundEnabled, playCompletionChime } from '@/lib/audio'
import { HabitManager } from './HabitManager'
import { QuotesManager } from './QuotesManager'
import { Volume2, VolumeX } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { HabitWithSubitems, Quote } from '@/lib/supabase/types'

interface Props {
  habits: HabitWithSubitems[]
  quotes: Quote[]
  userEmail?: string | null
}

type Tab = 'habits' | 'quotes' | 'appearance' | 'account'
const TABS: { id: Tab; label: string }[] = [
  { id: 'habits',     label: 'Habits'     },
  { id: 'quotes',     label: 'Quotes'     },
  { id: 'appearance', label: 'Appearance' },
  { id: 'account',    label: 'Account'    },
]

export function SettingsClient({ habits, quotes, userEmail }: Props) {
  const [tab, setTab] = useState<Tab>('habits')
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const [soundEnabled, setSoundEnabled] = useState(() => isCompletionSoundEnabled())

  const handleToggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    setCompletionSoundEnabled(next)
    if (next) playCompletionChime()
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isDark = theme === 'dark'

  return (
    <div className="page-container" style={{ maxWidth: 780, margin: '0 auto', paddingBottom: 64 }}>
      {/* Path Breadcrumb */}
      <motion.p
        className="text-path"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          marginBottom: 10,
        }}
      >
        ~/ settings
      </motion.p>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 28 }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.025em',
            margin: 0,
          }}
        >
          Preferences
        </h1>
      </motion.div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 28,
          borderBottom: '1px solid var(--border)',
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
              background: 'transparent',
              color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '0.8125rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: tab === t.id ? 600 : 500,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ minHeight: 340 }}>
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
            <div
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 4,
                  }}
                >
                  Theme
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  Currently: {isDark ? 'Dark' : 'Light'} Mode
                </p>
              </div>

              {/* Theme Toggle Switch */}
              <ThemeToggle />
            </div>

            {/* Completion Sound Toggle */}
            <div
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px 22px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 4,
                  }}
                >
                  Completion Sound
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  Play ambient chime when all habits completed for the day
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {soundEnabled ? (
                  <Volume2 size={16} color="var(--accent)" />
                ) : (
                  <VolumeX size={16} color="var(--text-muted)" />
                )}

                <button
                  type="button"
                  role="switch"
                  aria-checked={soundEnabled}
                  onClick={handleToggleSound}
                  style={{
                    width: 40,
                    height: 22,
                    borderRadius: 9999,
                    backgroundColor: soundEnabled ? 'var(--accent)' : 'var(--surface-raised)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                    position: 'relative',
                    transition: 'background-color 0.25s ease',
                  }}
                >
                  <motion.div
                    animate={{ x: soundEnabled ? 18 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'account' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {userEmail && (
              <div
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px 22px',
                }}
              >
                <span className="section-label" style={{ display: 'block', marginBottom: 8 }}>
                  SIGNED IN AS
                </span>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.9375rem',
                    color: 'var(--text-primary)',
                    fontWeight: 500,
                  }}
                >
                  {userEmail}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* ── Sign Out: Subtle Red Text Link at bottom of page ──────────── */}
      <div
        style={{
          marginTop: 48,
          paddingTop: 24,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-start',
        }}
      >
        <button
          onClick={handleSignOut}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            color: '#B91C1C',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            transition: 'opacity 0.15s ease',
            opacity: 0.85,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1'
            e.currentTarget.style.textDecoration = 'underline'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.85'
            e.currentTarget.style.textDecoration = 'none'
          }}
        >
          Sign Out &rarr;
        </button>
      </div>
    </div>
  )
}
