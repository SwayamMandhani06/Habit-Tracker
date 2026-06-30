'use client'
// components/today/CelebrationOverlay.tsx
// Tasteful pulse on the progress track — no full-screen overlay
import { motion } from 'framer-motion'

export function CelebrationOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0.8 }}
      animate={{ opacity: [0, 1, 1, 0], scaleX: [0.8, 1.02, 1, 1] }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      aria-hidden
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: 'var(--accent)',
        zIndex: 9999,
        pointerEvents: 'none',
        transformOrigin: 'left',
      }}
    />
  )
}
