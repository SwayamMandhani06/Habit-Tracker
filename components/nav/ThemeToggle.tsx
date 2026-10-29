'use client'
// components/nav/ThemeToggle.tsx — Pill-shaped 40×22px animated theme toggle
import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/components/providers/ThemeProvider'
import { createClient } from '@/lib/supabase/client'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  const handleToggle = async () => {
    const next = isDark ? 'light' : 'dark'
    toggleTheme()

    // Sync to user profile in Supabase
    try {
      const supabase = createClient()
      await supabase.auth.updateUser({
        data: { theme: next },
      })
    } catch {
      // Offline / guest mode fallback
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`relative inline-flex items-center cursor-pointer select-none transition-colors focus:outline-none ${className ?? ''}`}
      style={{
        width: 40,
        height: 22,
        borderRadius: 9999,
        backgroundColor: 'var(--surface-raised)',
        border: '1px solid var(--border)',
        padding: 2,
      }}
    >
      {/* Background Icons */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4px',
          pointerEvents: 'none',
        }}
      >
        <Sun
          size={10}
          strokeWidth={2}
          style={{
            color: isDark ? 'var(--text-muted)' : 'var(--accent)',
            opacity: isDark ? 0.35 : 1,
            transition: 'opacity 0.2s ease',
          }}
        />
        <Moon
          size={10}
          strokeWidth={2}
          style={{
            color: isDark ? 'var(--accent)' : 'var(--text-muted)',
            opacity: isDark ? 1 : 0.35,
            transition: 'opacity 0.2s ease',
          }}
        />
      </div>

      {/* Sliding Thumb Knob */}
      <motion.div
        animate={{
          x: isDark ? 18 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          backgroundColor: isDark ? 'var(--accent)' : '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
          zIndex: 1,
        }}
      />
    </button>
  )
}

