'use client'

// components/homepage/BelowTheFoldSections.tsx — Code-split below-the-fold sections
// Enables the Hero and interactive console to load and be interactive first.

import React, { useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import {
  Grid,
  CheckSquare,
  Flame,
  Calendar,
  BookOpen,
  TrendingUp,
  Sliders,
  Smartphone,
  ArrowRight,
  Check,
  Lock,
} from 'lucide-react'
import { StreakShowcase } from '@/components/homepage/StreakShowcase'

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

function SectionLabel({ label, inverted = false }: { label: string; inverted?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <div ref={ref} className="flex items-center gap-4 select-none mb-10 md:mb-14">
      <span
        className="font-mono text-[11px] uppercase tracking-[0.28em] font-bold flex-shrink-0"
        style={{ color: inverted ? 'rgba(255,255,255,0.45)' : 'var(--text-muted)' }}
      >
        {label}
      </span>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="h-[1px] flex-1 origin-left"
        style={{ backgroundColor: inverted ? 'rgba(255,255,255,0.12)' : 'var(--border)' }}
      />
    </div>
  )
}

function StepGhost({ n }: { n: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 0.055 } : { opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="absolute -top-8 -left-4 select-none pointer-events-none font-mono font-extrabold leading-none z-0"
      style={{ fontSize: 'clamp(7rem, 14vw, 12rem)', color: 'var(--accent)' }}
    >
      {n}
    </motion.div>
  )
}

function FadeIn({
  children,
  delay = 0,
  className = '',
  fromY = 24,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
  fromY?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: fromY }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: fromY }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="p-7 sm:p-8 rounded-2xl border shadow-xs transition-colors duration-200 hover:border-[var(--accent)] min-h-[260px] flex flex-col justify-between"
      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {children}
    </div>
  )
}

function FeatureCard({
  feat,
  index,
}: {
  feat: { icon: React.ElementType; label: string; desc: string }
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const Icon = feat.icon

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 22 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group p-7 sm:p-8 rounded-2xl border shadow-xs hover:shadow-md transition-all duration-200 cursor-default"
      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-start gap-5">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-[var(--accent)] group-hover:text-white"
          style={{ backgroundColor: 'rgba(92,107,90,0.11)', color: 'var(--accent)' }}
        >
          <Icon size={19} strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2.5">
            <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{feat.label}</span>
            <ArrowRight
              size={13}
              className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2"
            />
          </div>
          <p className="font-mono text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
            {feat.desc}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

function ManifestoQuote() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <div ref={ref} className="relative pl-7 sm:pl-9 mb-14 sm:mb-16">
      <motion.div
        initial={{ scaleY: 0 }}
        animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-0 top-0 bottom-0 w-[2.5px] origin-top rounded-full"
        style={{ backgroundColor: 'var(--accent)' }}
      />
      <motion.div
        initial={{ opacity: 0, x: -14 }}
        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -14 }}
        transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <blockquote
          className="font-serif italic leading-tight mb-4 text-[var(--text-primary)]"
          style={{ fontSize: 'clamp(1.75rem, 3.8vw, 3.5rem)' }}
        >
          "You don't rise to the level of your goals. You fall to the level of your systems."
        </blockquote>
        <cite className="font-mono text-xs sm:text-sm font-semibold not-italic tracking-wide" style={{ color: 'var(--accent)' }}>
          — James Clear, Atomic Habits
        </cite>
      </motion.div>
    </div>
  )
}

function QuoteBlock({
  children,
  delay = 0,
  className = '',
  style,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}

export function BelowTheFoldSections({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <>
      {/* SECTION 2 — THE INTERACTION SYSTEM */}
      <section
        id="feature-showcase"
        className="border-t overflow-hidden"
        style={{
          borderColor: 'var(--border)',
          paddingTop: 'clamp(80px, 10vw, 120px)',
          paddingBottom: 'clamp(80px, 10vw, 120px)',
        }}
      >
        <Container>
          <SectionLabel label="The Interaction System ————" />
          <StreakShowcase />
        </Container>
      </section>

      {/* SECTION 3 — THE PHILOSOPHY */}
      <section
        id="the-philosophy"
        className="border-t"
        style={{
          borderColor: 'var(--border)',
          paddingTop: 'clamp(96px, 11vw, 140px)',
          paddingBottom: 'clamp(96px, 11vw, 140px)',
        }}
      >
        <Container>
          <SectionLabel label="The Philosophy ————" />
          <ManifestoQuote />
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 font-mono text-sm leading-[1.85]"
            style={{ color: 'var(--text-muted)' }}
          >
            <FadeIn delay={0.05}>
              <p>
                Your paper habit tracker was onto something. The act of physically marking a habit done — satisfying, concrete, real. We took that feeling and built it into software that doesn't get in the way.
              </p>
            </FadeIn>
            <FadeIn delay={0.12}>
              <p>
                Motivation fades. Systems don't. 1% Better gives you the structure to show up every day, track what matters, and see the compounding effect of small consistent actions over months and years.
              </p>
            </FadeIn>
          </div>
        </Container>
      </section>

      {/* SECTION 4 — THE SYSTEM */}
      <section
        id="the-system"
        className="border-t"
        style={{
          borderColor: 'var(--border)',
          paddingTop: 'clamp(96px, 11vw, 140px)',
          paddingBottom: 'clamp(96px, 11vw, 140px)',
        }}
      >
        <Container>
          <SectionLabel label="The System ————" />
          <div className="flex flex-col gap-20 md:gap-28">
            <FadeIn>
              <div className="relative">
                <StepGhost n="01" />
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-start">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.25em] font-bold mb-3" style={{ color: 'var(--accent)' }}>
                      01. [ Sign Up ]
                    </p>
                    <h2
                      className="font-mono font-extrabold tracking-tight leading-[1.12] mb-5 text-[var(--text-primary)]"
                      style={{ fontSize: 'clamp(1.5rem, 2.8vw, 2.25rem)' }}
                    >
                      "Your Account.<br />Your Data.<br />Nobody Else's."
                    </h2>
                    <p className="font-mono text-sm leading-[1.85] text-[var(--text-muted)] max-w-[42ch]">
                      Create an account in seconds. Every habit, every entry, and every insight is completely private to you — isolated at the database level, not just the UI.
                    </p>
                  </div>

                  <StepCard>
                    <div className="flex items-center justify-between mb-4 pb-3 border-b font-mono text-xs" style={{ borderColor: 'var(--border)' }}>
                      <span className="font-bold text-[var(--text-primary)]">~/ security</span>
                      <span className="text-[var(--accent)] font-semibold flex items-center gap-1.5">
                        <Lock size={11} />
                        Row-Level Security
                      </span>
                    </div>
                    <div className="space-y-3 font-mono text-xs text-[var(--text-muted)]">
                      {[
                        'Encrypted authentication tokens',
                        'Isolated tenant database policies',
                        'Clean slate: add habits tailored to you',
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-2.5">
                          <Check size={13} className="text-[var(--accent)] flex-shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </StepCard>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.05}>
              <div className="relative">
                <StepGhost n="02" />
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-start">
                  <div className="md:order-2">
                    <p className="font-mono text-[11px] uppercase tracking-[0.25em] font-bold mb-3" style={{ color: 'var(--accent)' }}>
                      02. [ Build Your System ]
                    </p>
                    <h2
                      className="font-mono font-extrabold tracking-tight leading-[1.12] mb-5 text-[var(--text-primary)]"
                      style={{ fontSize: 'clamp(1.5rem, 2.8vw, 2.25rem)' }}
                    >
                      "Your Habits.<br />Your Rules."
                    </h2>
                    <p className="font-mono text-sm leading-[1.85] text-[var(--text-muted)] max-w-[42ch]">
                      Start from a clean slate and build the exact discipline stack you need. Add multi-step checklists for morning rituals, single-action checkboxes, notes, and drag to reorder anytime.
                    </p>
                  </div>

                  <div className="md:order-1">
                    <StepCard>
                      <div className="flex items-center justify-between mb-3 pb-3 border-b font-mono text-xs" style={{ borderColor: 'var(--border)' }}>
                        <span className="font-bold text-[var(--text-primary)]">Custom Habit Stack</span>
                        <span className="text-[var(--text-muted)] text-[11px]">Settings → Habits</span>
                      </div>
                      <div className="space-y-2 font-mono text-xs">
                        {[
                          { name: 'Morning Routine Ritual', tag: 'Multi-Step', accent: true },
                          { name: 'Deep Work Block (2h)', tag: 'Daily Checkbox', accent: false },
                          { name: 'Workout & 10k Steps', tag: 'Daily Checkbox', accent: false },
                        ].map((row) => (
                          <div
                            key={row.name}
                            className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                            style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}
                          >
                            <span className="font-semibold text-[var(--text-primary)]">{row.name}</span>
                            <span
                              className="text-[10px] uppercase font-bold tracking-wider ml-2 flex-shrink-0"
                              style={{ color: row.accent ? 'var(--accent)' : 'var(--text-muted)' }}
                            >
                              [ {row.tag} ]
                            </span>
                          </div>
                        ))}
                      </div>
                    </StepCard>
                  </div>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.05}>
              <div className="relative">
                <StepGhost n="03" />
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-start">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.25em] font-bold mb-3" style={{ color: 'var(--accent)' }}>
                      03. [ Check In Daily ]
                    </p>
                    <h2
                      className="font-mono font-extrabold tracking-tight leading-[1.12] mb-5 text-[var(--text-primary)]"
                      style={{ fontSize: 'clamp(1.5rem, 2.8vw, 2.25rem)' }}
                    >
                      "Two Minutes.<br />Every Day.<br />No Excuses."
                    </h2>
                    <p className="font-mono text-sm leading-[1.85] text-[var(--text-muted)] max-w-[42ch]">
                      Mark habits, log mood and energy, add notes. The system calculates streaks, scores, and insights automatically while you focus on doing the work.
                    </p>
                  </div>

                  <StepCard>
                    <div className="flex items-center justify-between mb-3 font-mono text-xs">
                      <span className="font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Daily Completion</span>
                      <span className="font-bold text-[var(--text-primary)]">100% Perfect</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden mb-4" style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}>
                      <div className="h-full rounded-full w-full" style={{ backgroundColor: 'var(--accent)' }} />
                    </div>
                    <div className="flex items-center justify-between font-mono text-xs text-[var(--text-muted)]">
                      <span>Streak: 42 Consecutive Days</span>
                      <span className="font-bold" style={{ color: 'var(--accent)' }}>Auto-Saved</span>
                    </div>
                  </StepCard>
                </div>
              </div>
            </FadeIn>
          </div>
        </Container>
      </section>

      {/* SECTION 4 — WHAT'S INSIDE */}
      <section
        id="whats-inside"
        className="border-t"
        style={{
          borderColor: 'var(--border)',
          paddingTop: 'clamp(96px, 11vw, 140px)',
          paddingBottom: 'clamp(96px, 11vw, 140px)',
        }}
      >
        <Container>
          <SectionLabel label="What's Inside ————" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
            {[
              { icon: Grid, label: '[ Habit Grid ]', desc: 'Your paper tracker digitized into a scrollable month matrix — every habit, every day at a glance.' },
              { icon: CheckSquare, label: '[ Morning & Night Checklists ]', desc: 'Multi-step habits that auto-complete when every sub-item is checked off.' },
              { icon: Flame, label: '[ Streak Tracking ]', desc: 'Consecutive perfect days. The most motivating number on your dashboard.' },
              { icon: Calendar, label: '[ Calendar Heatmap ]', desc: 'Every day of every month colored by completion percentage. See your year in one view.' },
              { icon: BookOpen, label: '[ Monthly Review Journal ]', desc: 'End-of-month reflection with auto-calculated stats and carry-forward goals.' },
              { icon: TrendingUp, label: '[ Deep Habit Insights ]', desc: 'Per-habit charts, weekly sparklines, and long-term trend analysis.' },
              { icon: Sliders, label: '[ Fully Flexible ]', desc: 'Add, rename, reorder, or archive any habit. No redeploy, no friction.' },
              { icon: Smartphone, label: '[ Works Everywhere ]', desc: 'Phone, tablet, and laptop. Same data, same design, same clean experience.' },
            ].map((feat, idx) => (
              <FeatureCard key={feat.label} feat={feat} index={idx} />
            ))}
          </div>
        </Container>
      </section>

      {/* SECTION 5 — ON DISCIPLINE */}
      <section
        id="quotes-wall"
        className="relative border-y overflow-hidden"
        style={{
          backgroundColor: '#151311',
          borderColor: 'rgba(255,255,255,0.10)',
          paddingTop: 'clamp(100px, 12vw, 150px)',
          paddingBottom: 'clamp(100px, 12vw, 150px)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        <Container className="relative z-10">
          <SectionLabel label="On Discipline ————" inverted />
          <div className="flex flex-col gap-12 md:gap-16">
            <QuoteBlock delay={0.05} className="text-center">
              <h2
                className="font-serif italic leading-[1.15] mx-auto text-[#F7F4EE]"
                style={{ fontSize: 'clamp(1.9rem, 4.5vw, 3.8rem)', maxWidth: '22ch' }}
              >
                "The Cost Of Discipline Is Always Less Than The Cost Of Regret."
              </h2>
            </QuoteBlock>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <QuoteBlock delay={0.1} className="p-8 sm:p-10 rounded-2xl border bg-white/[0.03]" style={{ borderColor: 'rgba(255,255,255,0.09)' }}>
                <p className="font-mono text-sm sm:text-base leading-[1.85] text-[#B5AEA5]">
                  "Motivation is what gets you started. Discipline is what keeps you going."
                </p>
              </QuoteBlock>
              <QuoteBlock delay={0.16} className="p-8 sm:p-10 rounded-2xl border bg-white/[0.03]" style={{ borderColor: 'rgba(255,255,255,0.09)' }}>
                <h3 className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-[#F7F4EE] leading-snug">
                  "Stop Waiting To Feel Like It."
                </h3>
              </QuoteBlock>
            </div>

            <QuoteBlock delay={0.2} className="text-center py-10 border-y" style={{ borderColor: 'rgba(255,255,255,0.09)' }}>
              <p
                className="font-serif italic mx-auto text-[#D4CDC4] leading-relaxed"
                style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.75rem)', maxWidth: '46ch' }}
              >
                "We are what we repeatedly do. Excellence is not an act but a habit."
              </p>
              <span className="block font-mono text-xs uppercase tracking-[0.25em] mt-5 font-bold" style={{ color: 'var(--accent-light, #8BA888)' }}>
                — Aristotle
              </span>
            </QuoteBlock>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <QuoteBlock delay={0.25} className="p-8 sm:p-10 rounded-2xl border bg-white/[0.03]" style={{ borderColor: 'rgba(255,255,255,0.09)' }}>
                <h3 className="font-mono text-xl sm:text-2xl font-bold text-[#F7F4EE] leading-snug">
                  "Hard Choices, Easy Life. Easy Choices, Hard Life."
                </h3>
              </QuoteBlock>
              <QuoteBlock delay={0.3} className="p-8 sm:p-10 rounded-2xl border bg-white/[0.03]" style={{ borderColor: 'rgba(255,255,255,0.09)' }}>
                <p className="font-mono text-sm sm:text-base text-[#B5AEA5] leading-[1.85]">
                  "One day or day one. You decide."
                </p>
              </QuoteBlock>
            </div>
          </div>
        </Container>
      </section>

      {/* SECTION 6 — FINAL CTA */}
      <section
        className="border-t text-center relative overflow-hidden"
        style={{
          borderColor: 'var(--border)',
          paddingTop: 'clamp(110px, 13vw, 160px)',
          paddingBottom: 'clamp(110px, 13vw, 160px)',
        }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(92,107,90,0.07) 0%, transparent 70%)' }}
        />
        <Container className="relative z-10 flex flex-col items-center">
          <FadeIn className="flex flex-col items-center">
            <h2
              className="font-serif italic text-[var(--text-primary)] mb-6"
              style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)', lineHeight: 1.1 }}
            >
              Your System Is Waiting.
            </h2>
            <p
              className="font-mono leading-relaxed text-[var(--text-muted)] mb-10"
              style={{ fontSize: 'clamp(0.85rem, 1.4vw, 1rem)', maxWidth: '44ch' }}
            >
              Start tracking today. It takes two minutes to set up and two minutes a day to maintain.
            </p>
            <Link
              href={isLoggedIn ? "/dashboard" : "/login"}
              className="inline-flex items-center gap-3 px-9 py-4 font-mono font-bold text-base text-[var(--accent-fg)] rounded-full transition-all duration-200 active:scale-95 hover:-translate-y-0.5"
              style={{
                backgroundColor: 'var(--accent)',
                boxShadow: '0 8px 30px rgba(92,107,90,0.32)',
              }}
            >
              <span>{isLoggedIn ? 'Go to Dashboard' : 'Start For Free'}</span>
              <ArrowRight size={17} />
            </Link>
          </FadeIn>
        </Container>
      </section>

      {/* FOOTER */}
      <footer
        className="border-t py-12 font-mono text-xs"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
      >
        <Container className="flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <span className="font-bold text-[var(--text-primary)]">~/ 1% Better</span>
            <span>·</span>
            <span>A Personal Discipline System</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Made by Swayam · 2026</span>
            <Link
              href={isLoggedIn ? "/dashboard" : "/login"}
              className="font-bold hover:underline min-h-[44px] inline-flex items-center px-2"
              style={{ color: 'var(--accent)' }}
            >
              {isLoggedIn ? 'Dashboard →' : 'Start Free →'}
            </Link>
          </div>
        </Container>
      </footer>
    </>
  )
}
