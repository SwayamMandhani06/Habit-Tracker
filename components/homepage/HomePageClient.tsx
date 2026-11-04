'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { motion, useScroll, useSpring } from 'framer-motion'
import {
  ArrowRight,
  ArrowDown,
} from 'lucide-react'
import { ThemeToggle } from '@/components/nav/ThemeToggle'
import { InteractiveConsole } from '@/components/homepage/InteractiveConsole'
import { createClient } from '@/lib/supabase/client'

// Lazy-load below-the-fold sections so Hero is interactive first
const BelowTheFoldSections = dynamic(
  () => import('@/components/homepage/BelowTheFoldSections').then((m) => m.BelowTheFoldSections),
  {
    ssr: true,
  }
)

// ── Wrapper that enforces page max-width + horizontal padding ────────────────
function Container({
  children,
  className = '',
  style = {},
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={`w-full max-w-[1180px] mx-auto ${className}`}
      style={{
        paddingLeft: 'clamp(20px, 5vw, 80px)',
        paddingRight: 'clamp(20px, 5vw, 80px)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function HomePageClient() {
  const { scrollYProgress } = useScroll()
  const [scrolledPast, setScrolledPast] = useState(false)
  const [cursorPos, setCursorPos] = useState({ x: -200, y: -200 })
  const [showCursor, setShowCursor] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 })
  const cursorX = useSpring(cursorPos.x, { stiffness: 160, damping: 22 })
  const cursorY = useSpring(cursorPos.y, { stiffness: 160, damping: 22 })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsLoggedIn(true)
      }
    })
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolledPast(window.scrollY > 36)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) {
      setShowCursor(true)
      const onMove = (e: MouseEvent) => setCursorPos({ x: e.clientX, y: e.clientY })
      window.addEventListener('mousemove', onMove)
      return () => window.removeEventListener('mousemove', onMove)
    }
  }, [])

  return (
    <main id="main-content" className="relative min-h-screen w-full overflow-x-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Fixed top scroll progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] z-50 origin-left pointer-events-none"
        style={{ scaleX, backgroundColor: 'var(--accent)' }}
      />

      {/* Lagged cursor dot — desktop only */}
      {showCursor && (
        <motion.div
          className="fixed pointer-events-none z-50 w-[6px] h-[6px] rounded-full hidden md:block"
          style={{
            x: cursorX,
            y: cursorY,
            translateX: '-50%',
            translateY: '-50%',
            backgroundColor: 'var(--accent)',
            opacity: 0.45,
          }}
        />
      )}

      {/* ── FIXED NAV ─────────────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolledPast ? 'backdrop-blur-xl border-b' : 'bg-transparent'
        }`}
        style={{
          paddingTop: 'calc(var(--safe-top) + 12px)',
          paddingBottom: 12,
          borderColor: scrolledPast ? 'var(--border)' : 'transparent',
          backgroundColor: scrolledPast ? 'rgba(var(--bg-rgb), 0.9)' : 'transparent',
        }}
      >
        <Container className="flex items-center justify-between gap-1.5 sm:gap-3 px-3 sm:px-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-mono text-xs sm:text-sm font-bold tracking-tight hover:opacity-80 transition-opacity min-h-[44px] whitespace-nowrap flex-shrink-0"
            style={{ color: 'var(--text-primary)' }}
          >
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
            <span className="whitespace-nowrap">~/ 1% Better</span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-4 flex-shrink-0">
            <ThemeToggle />
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="font-mono text-xs font-bold px-3 py-2 sm:px-4 sm:py-2.5 rounded-full text-[var(--accent-fg)] transition-all active:scale-95 hover:opacity-90 min-h-[44px] inline-flex items-center whitespace-nowrap"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline-flex font-mono text-xs font-semibold hover:opacity-75 transition-opacity min-h-[44px] min-w-[44px] items-center justify-center px-2 whitespace-nowrap"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Log In
                </Link>
                <Link
                  href="/login"
                  className="font-mono text-xs font-bold px-2.5 py-1.5 sm:px-5 sm:py-2.5 rounded-full text-[var(--accent-fg)] transition-all active:scale-95 hover:opacity-90 min-h-[44px] inline-flex items-center justify-center whitespace-nowrap flex-shrink-0"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  Start Free <span className="hidden sm:inline ml-1">→</span>
                </Link>
              </>
            )}
          </div>
        </Container>
      </nav>

      {/* ════════════════════════════════════════════════════════════════════════
          SECTION 1 — HERO
          Two-column: editorial headline left / layered 3D pop-out scene right.
      ═══════════════════════════════════════════════════════════════════════════ */}
      <section
        className="hero relative flex items-center border-b"
        style={{
          overflowX: 'clip',
          paddingTop: 'calc(clamp(110px, 14vw, 160px) + var(--safe-top))',
          paddingBottom: 'clamp(80px, 10vw, 120px)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Subtle luminous ambient gradient in dark theme */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] max-w-full h-[450px] pointer-events-none rounded-full blur-[110px] opacity-15 dark:opacity-30"
          style={{
            background: 'radial-gradient(circle, var(--accent) 0%, rgba(122,160,128,0.2) 45%, transparent 75%)',
          }}
        />

        {/* Crisp dotted notebook paper texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--dot-color) 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
          }}
        />

        <Container className="relative z-10" style={{ transformStyle: 'preserve-3d' }}>
          {/* Eyebrow Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3 mb-6"
          >
            <span
              className="font-mono text-[11px] font-bold tracking-[0.28em] uppercase px-3.5 py-1.5 rounded-full border flex items-center gap-2"
              style={{
                backgroundColor: 'var(--surface-raised)',
                borderColor: 'var(--border)',
                color: 'var(--accent)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              [ PERSONAL DISCIPLINE SYSTEM ]
            </span>
          </motion.div>

          {/* Hero grid: Left Editorial / Right Layered 3D Pop-out Scene */}
          <div
            className="grid grid-cols-1 lg:grid-cols-[1.1fr_390px] xl:grid-cols-[1.2fr_420px] gap-10 lg:gap-14 xl:gap-16 items-center"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* ── Left: Editorial Headline ── */}
            <div className="flex flex-col justify-center">
              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="font-mono font-extrabold leading-[1.08] mb-6 text-[var(--text-primary)]"
                style={{ fontSize: 'clamp(2.4rem, 4.2vw, 4.2rem)', letterSpacing: '-0.035em' }}
              >
                Get{' '}
                <em
                  className="font-serif italic font-normal text-[1.08em]"
                  style={{ color: 'var(--accent)' }}
                >
                  1% better
                </em>{' '}
                every single day.
              </motion.h1>

              {/* Sub-headline */}
              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.28 }}
                className="font-serif italic leading-relaxed mb-9 text-[var(--text-muted)]"
                style={{ fontSize: 'clamp(1.05rem, 1.8vw, 1.25rem)', maxWidth: '42ch' }}
              >
                A calm, focused habit system for people who take their discipline seriously.
              </motion.p>

              {/* CTA row */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.42 }}
                className="flex flex-wrap items-center gap-4 mb-5"
              >
                <Link
                  href={isLoggedIn ? "/dashboard" : "/login"}
                  className="inline-flex items-center gap-2.5 font-mono font-bold text-sm text-[var(--accent-fg)] rounded-full transition-all duration-200 active:scale-95 hover:-translate-y-0.5"
                  style={{
                    padding: '14px 30px',
                    backgroundColor: 'var(--accent)',
                    boxShadow: '0 8px 30px rgba(92,107,90,0.35)',
                  }}
                >
                  <span>{isLoggedIn ? 'Go to Dashboard' : 'Get Started Free'}</span>
                  <ArrowRight size={15} />
                </Link>

                <a
                  href="#feature-showcase"
                  className="group inline-flex items-center gap-2 font-mono font-semibold text-sm rounded-full border transition-all duration-200 hover:border-[var(--accent)] hover:-translate-y-0.5"
                  style={{
                    padding: '14px 28px',
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span>Explore Features</span>
                  <ArrowDown size={13} className="group-hover:translate-y-0.5 transition-transform" />
                </a>
              </motion.div>

              {/* Mobile-only Log In link under CTA row */}
              {!isLoggedIn && (
                <p className="sm:hidden font-mono text-xs text-[var(--text-muted)] mb-8">
                  Already have an account?{' '}
                  <Link href="/login" className="text-[var(--text-primary)] font-bold underline hover:text-[var(--accent)] transition-colors">
                    Log In →
                  </Link>
                </p>
              )}

              {/* Verified Facts Trust Row */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.55, delay: 0.55 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-7 border-t border-[var(--border)] font-mono text-xs text-[var(--text-muted)]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent)] flex-shrink-0" />
                  <div>
                    <span className="block font-bold text-[var(--text-primary)] text-[11px]">Free To Start:</span>
                    <span className="text-[10px]">No credit card, no paywall.</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <div>
                    <span className="block font-bold text-[var(--text-primary)] text-[11px]">Private To Your Account:</span>
                    <span className="text-[10px]">Only you can see your habits and notes.</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                  <div>
                    <span className="block font-bold text-[var(--text-primary)] text-[11px]">Works On Phone And Laptop:</span>
                    <span className="text-[10px]">Installable, and your data follows your account across devices.</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ── Right: Layered 3D Pop-out Scene (Zero flattening wrappers on desktop) ── */}
            <div
              className="w-full flex items-center justify-center lg:justify-end lg:-mr-10 select-none overflow-hidden sm:overflow-visible max-w-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <InteractiveConsole />
            </div>
          </div>
        </Container>
      </section>

      {/* Code-split below-the-fold sections */}
      <BelowTheFoldSections isLoggedIn={isLoggedIn} />
    </main>
  )
}
