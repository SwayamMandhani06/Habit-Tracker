'use client'
// components/pin/PinScreen.tsx
// Terminal-style PIN screen — monospace, dotted texture, minimal.

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

const PIN_LENGTH = 4

const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['',  '0', 'del'],
]

export function PinScreen() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleKey = useCallback(async (key: string) => {
    if (loading) return

    if (key === 'del') {
      setPin(p => p.slice(0, -1))
      setError(false)
      return
    }

    if (pin.length >= PIN_LENGTH) return

    const newPin = pin + key

    if (newPin.length === PIN_LENGTH) {
      setLoading(true)
      try {
        const res = await fetch('/api/auth/pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: newPin }),
        })
        const data = await res.json()

        if (data.success) {
          const from = searchParams.get('from') || '/'
          router.push(from)
          router.refresh()
        } else {
          setShake(true)
          setError(true)
          setTimeout(() => { setPin(''); setShake(false) }, 600)
        }
      } catch {
        setShake(true)
        setError(true)
        setTimeout(() => { setPin(''); setShake(false) }, 600)
      } finally {
        setLoading(false)
      }
    } else {
      setPin(newPin)
      setError(false)
    }
  }, [pin, loading, router, searchParams])

  // Physical keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleKey(e.key)
      if (e.key === 'Backspace') handleKey('del')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleKey])

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      padding: '40px 24px',
      gap: 40,
      fontFamily: 'var(--font-mono)',
    }}>

      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontSize: '0.6875rem',
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: 'var(--ink-tertiary)',
          marginBottom: 8,
        }}>
          ~/ unlock
        </p>
        <h1 style={{
          fontSize: '1.375rem',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'var(--ink-primary)',
        }}>
          1% better
        </h1>
      </div>

      {/* PIN dots */}
      <motion.div
        animate={shake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
        style={{ display: 'flex', gap: 14 }}
      >
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              scale: pin.length === i ? 1.15 : 1,
              background: error
                ? '#8B4141'
                : pin.length > i
                ? 'var(--accent)'
                : 'var(--bg-surface-3)',
            }}
            transition={{ type: 'spring', stiffness: 600, damping: 28 }}
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              border: '1px solid var(--border-strong)',
            }}
          />
        ))}
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              color: '#8B4141',
              marginTop: -24,
            }}
          >
            incorrect pin
          </motion.p>
        )}
      </AnimatePresence>

      {/* Keypad */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10,
        width: '100%',
        maxWidth: 264,
      }}>
        {KEYPAD.flat().map((key, i) => {
          if (!key) return <div key={`empty-${i}`} />
          return (
            <motion.button
              key={i}
              whileTap={{ scale: 0.91 }}
              onClick={() => handleKey(key)}
              disabled={loading}
              aria-label={key === 'del' ? 'Delete' : key}
              style={{
                height: 62,
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-surface-1)',
                border: '1px solid var(--border-default)',
                color: 'var(--ink-primary)',
                fontSize: key === 'del' ? '0.75rem' : '1.25rem',
                fontWeight: key === 'del' ? 400 : 300,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '-0.02em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background var(--duration-fast), border-color var(--duration-fast)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--bg-surface-2)'
                e.currentTarget.style.borderColor = 'var(--border-strong)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg-surface-1)'
                e.currentTarget.style.borderColor = 'var(--border-default)'
              }}
            >
              {key === 'del' ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
                  <line x1="18" y1="9" x2="13" y2="14"/>
                  <line x1="13" y1="9" x2="18" y2="14"/>
                </svg>
              ) : key}
            </motion.button>
          )
        })}
      </div>

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              marginTop: -20,
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--ink-tertiary)',
              letterSpacing: '0.04em',
            }}
          >
            verifying...
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
