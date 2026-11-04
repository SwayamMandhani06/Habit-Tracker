'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { X } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  maxHeight?: string
  className?: string
}

export function ResponsiveSheet({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxHeight = '90dvh',
  className = '',
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Listen for Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent background scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 80 || info.velocity.y > 400) {
      onClose()
    }
  }

  if (!mounted) return null

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex flex-col justify-end md:justify-center md:items-center p-0 md:p-6"
          style={{ isolation: 'isolate' }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer z-0"
            aria-hidden="true"
          />

          {/* Sheet / Dialog Container */}
          <motion.div
            initial={isMobile ? { y: '100%', opacity: 0.8 } : { opacity: 0, scale: 0.96, y: 10 }}
            animate={isMobile ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%', opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            drag={isMobile ? 'y' : false}
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'sheet-title' : undefined}
            className={`relative z-10 w-full md:max-w-xl md:rounded-3xl rounded-t-[28px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-2xl flex flex-col overflow-hidden ${className}`}
            style={{
              maxHeight: 'min(90dvh, 780px)',
              paddingBottom: 'calc(12px + var(--safe-bottom))',
            }}
          >
            {/* Mobile Drag Handle */}
            <div className="md:hidden pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 rounded-full bg-[var(--border)] opacity-80" />
            </div>

            {/* Header */}
            {(title || description) && (
              <div className="px-6 pt-4 pb-3 border-b border-[var(--border)] flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {title && (
                    <h3
                      id="sheet-title"
                      className="font-mono text-base font-bold text-[var(--text-primary)] truncate"
                    >
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p className="font-mono text-xs text-[var(--text-muted)] mt-0.5">
                      {description}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex items-center justify-center cursor-pointer active:scale-95"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {/* Body Content */}
            <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}
