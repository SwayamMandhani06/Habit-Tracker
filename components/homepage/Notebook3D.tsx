'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Flame, Star, Sparkles, BookOpen, ChevronRight, RotateCcw } from 'lucide-react'
import { playCompletionChime } from '@/lib/audio'

interface HabitCheck {
  id: string
  name: string
  done: boolean
  tag: string
}

const INITIAL_HABITS: HabitCheck[] = [
  { id: '1', name: 'Morning Routine (5/5)', done: true, tag: 'ROUTINE' },
  { id: '2', name: 'Deep Work Block (2h)', done: true, tag: 'FOCUS' },
  { id: '3', name: 'Gym / Workout & 10k Steps', done: true, tag: 'HEALTH' },
  { id: '4', name: 'Drink 4L Water', done: true, tag: 'VITALITY' },
  { id: '5', name: 'Read 20 Pages', done: false, tag: 'MIND' },
  { id: '6', name: 'Night Journal & Reflection', done: false, tag: 'CLARITY' },
]

export function Notebook3D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [habits, setHabits] = useState<HabitCheck[]>(INITIAL_HABITS)
  const [activeTab, setActiveTab] = useState<'today' | 'grid'>('today')

  // 3D Tilt rotation state
  // Default resting state: dramatic isometric angle
  const [rotX, setRotX] = useState(13)
  const [rotY, setRotY] = useState(-24)
  const [lightPos, setLightPos] = useState({ x: 30, y: 20 })

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024 || window.matchMedia('(hover: none)').matches)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Desktop mouse movement tilts the book in 3D and moves specular highlight
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile || !containerRef.current || isOpen) return
    const rect = containerRef.current.getBoundingClientRect()
    const normX = (e.clientX - rect.left) / rect.width // 0 to 1
    const normY = (e.clientY - rect.top) / rect.height // 0 to 1

    // Map X position to rotY (-34deg to -14deg)
    const targetRotY = -34 + normX * 20
    // Map Y position to rotX (6deg to 20deg)
    const targetRotX = 20 - normY * 14

    setRotX(Math.round(targetRotX * 10) / 10)
    setRotY(Math.round(targetRotY * 10) / 10)
    setLightPos({ x: Math.round(normX * 100), y: Math.round(normY * 100) })
  }

  const handleMouseLeave = () => {
    if (isMobile || isOpen) return
    setRotX(13)
    setRotY(-24)
    setLightPos({ x: 30, y: 20 })
  }

  const toggleHabit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setHabits(prev =>
      prev.map(h => {
        if (h.id === id) {
          const next = !h.done
          if (next) playCompletionChime()
          return { ...h, done: next }
        }
        return h
      })
    )
  }

  const completedCount = habits.filter(h => h.done).length
  const pct = Math.round((completedCount / habits.length) * 100)

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex flex-col items-center justify-center select-none w-full py-8 md:py-12"
      style={{
        perspective: '1600px',
      }}
    >
      {/* Ambient Floating Dust Particles / Subtle Glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center -z-10">
        <div
          className="w-[380px] h-[380px] rounded-full blur-[90px] opacity-25"
          style={{ backgroundColor: 'var(--accent)' }}
        />
      </div>

      {/* Control Pill Bar */}
      <div className="flex items-center gap-3 mb-8 z-30">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="group inline-flex items-center gap-2 px-4 py-2 text-xs font-mono font-semibold rounded-full border transition-all cursor-pointer shadow-sm active:scale-95"
          style={{
            backgroundColor: isOpen ? 'var(--accent)' : 'var(--surface-raised)',
            borderColor: isOpen ? 'var(--accent)' : 'var(--border)',
            color: isOpen ? '#FFFFFF' : 'var(--text-primary)',
          }}
        >
          <BookOpen size={13} className={isOpen ? 'text-white' : 'text-[var(--accent)]'} />
          <span>{isOpen ? 'Close Journal [ Esc ]' : 'Open 3D Journal [ Click ]'}</span>
        </button>

        {isOpen && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setActiveTab(activeTab === 'today' ? 'grid' : 'today')
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <RotateCcw size={11} />
            <span>{activeTab === 'today' ? 'View Grid Spread' : 'View Today Spread'}</span>
          </button>
        )}
      </div>

      {/* ── 3D BOOK ASSEMBLY ──────────────────────────────────────────────── */}
      <div
        onClick={() => !isOpen && setIsOpen(true)}
        className={`relative transition-transform duration-300 ease-out cursor-pointer ${
          isMobile && !isOpen ? 'animate-notebook-float' : ''
        }`}
        style={{
          width: isOpen ? (isMobile ? '320px' : '620px') : (isMobile ? '290px' : '330px'),
          height: isMobile ? '420px' : '460px',
          transformStyle: 'preserve-3d',
          transform: isOpen
            ? (isMobile ? 'rotateX(0deg) rotateY(0deg)' : 'rotateX(4deg) rotateY(0deg) scale(1.02)')
            : (isMobile ? undefined : `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(2deg)`),
          transition: 'width 0.5s cubic-bezier(0.2, 0.9, 0.3, 1), transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1)',
        }}
      >
        {/* Soft Multi-Layer Contact Shadow Underneath */}
        <div
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 pointer-events-none rounded-full"
          style={{
            width: isOpen ? '96%' : '88%',
            height: '42px',
            background: 'radial-gradient(ellipse at center, rgba(16, 12, 10, 0.45) 0%, rgba(16, 12, 10, 0.18) 50%, transparent 75%)',
            filter: 'blur(18px)',
            transform: 'translateZ(-60px)',
            transition: 'width 0.4s ease-out',
          }}
        />

        {/* ── 1. SILK BOOKMARK RIBBON (Extends above the book) ────────────────── */}
        <div
          className="absolute -top-[48px] pointer-events-none z-40 transition-all duration-500"
          style={{
            left: isOpen ? '48%' : '52%',
            width: '26px',
            height: '84px',
            backgroundColor: 'var(--accent)',
            backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.25) 100%)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 84%, 0 100%)',
            transform: isOpen ? 'translateZ(2px)' : 'translateZ(18px)',
          }}
        />

        {/* ── 2. BACK COVER (translateZ: -14px) ─────────────────────────────── */}
        <div
          className="absolute inset-0 rounded-[8px]"
          style={{
            backgroundColor: '#1C1815',
            border: '1px solid rgba(255,255,255,0.06)',
            transform: 'translateZ(-14px)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          }}
        />

        {/* ── 3. ROUNDED LEATHERETTE SPINE (Left Face) ────────────────────────── */}
        {!isOpen && (
          <div
            className="absolute top-0 bottom-0 left-0 pointer-events-none flex flex-col justify-between items-center py-6 rounded-l-[5px]"
            style={{
              width: '30px',
              height: '100%',
              backgroundColor: '#1E1B18',
              backgroundImage: `
                linear-gradient(to right, rgba(0,0,0,0.65) 0%, rgba(255,255,255,0.08) 45%, rgba(0,0,0,0.6) 100%),
                repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 4px)
              `,
              transformOrigin: 'left center',
              transform: 'rotateY(-90deg) translateX(-15px)',
              boxShadow: 'inset -2px 0 6px rgba(0,0,0,0.6)',
              borderRight: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {/* Raised Gold Spine Ribs (3 horizontal bands) */}
            <div className="w-full h-[3px] bg-gradient-to-r from-amber-700/60 via-amber-200/50 to-amber-800/60 shadow-sm" />
            <span
              className="font-mono text-[9px] tracking-[0.32em] font-bold text-stone-300 uppercase select-none opacity-90"
              style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
              }}
            >
              1% BETTER · 2026
            </span>
            <div className="w-full h-[3px] bg-gradient-to-r from-amber-700/60 via-amber-200/50 to-amber-800/60 shadow-sm" />
          </div>
        )}

        {/* ── 4. STACKED DECKLE-EDGE PAGES BLOCK (Right Face Thickness) ──────── */}
        {!isOpen && (
          <div
            className="absolute top-2 bottom-2 right-[-24px] w-[24px] pointer-events-none"
            style={{
              transformStyle: 'preserve-3d',
              transform: 'rotateY(90deg) translateZ(-12px)',
            }}
          >
            {/* Real layered ivory page edges */}
            <div
              className="w-full h-full rounded-r-[2px]"
              style={{
                background: `
                  repeating-linear-gradient(
                    to bottom,
                    #F6F2EA 0px,
                    #F6F2EA 1.5px,
                    #E8E1D2 1.5px,
                    #E8E1D2 3px,
                    #DCD4C3 3px,
                    #DCD4C3 4.5px
                  )
                `,
                boxShadow: 'inset 0 0 8px rgba(0,0,0,0.25)',
                borderRight: '1px solid rgba(0,0,0,0.3)',
              }}
            />
          </div>
        )}

        {/* ── 5. TOP PAGE EDGES ────────────────────────────────────────────── */}
        {!isOpen && (
          <div
            className="absolute -top-[10px] left-6 right-2 h-[10px] rounded-t-[2px] pointer-events-none"
            style={{
              transformOrigin: 'bottom center',
              transform: 'rotateX(90deg) translateY(-5px)',
              background: 'repeating-linear-gradient(to right, #F6F2EA 0px, #E5DECd 2px)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
            }}
          />
        )}

        {/* ── 6. NOTEBOOK INTERIOR (Open Double-Page Spread) ────────────────── */}
        <div
          className="absolute inset-0 rounded-[8px] overflow-hidden"
          style={{
            backgroundColor: '#F5F2EA',
            backgroundImage: `
              radial-gradient(circle, rgba(0,0,0,0.12) 1px, transparent 1px),
              linear-gradient(to right, rgba(0,0,0,0.08) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.08) 100%)
            `,
            backgroundSize: '16px 16px, 100% 100%',
            border: '1px solid rgba(0,0,0,0.12)',
            boxShadow: 'inset 0 0 24px rgba(0,0,0,0.12)',
            transform: 'translateZ(0px)',
          }}
        >
          {isOpen ? (
            /* OPEN DOUBLE-PAGE SPREAD */
            <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-300/80 p-5 sm:p-7 overflow-y-auto">
              {/* Left Page: Manifesto / Creed / Summary */}
              <div className="pr-0 md:pr-6 pb-6 md:pb-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-stone-300 pb-2 mb-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-stone-500">
                      SYS · 01 // MANIFESTO
                    </span>
                    <span className="font-mono text-[10px] text-stone-500 font-semibold">
                      OCTOBER 2026
                    </span>
                  </div>

                  <p className="font-serif italic text-xl sm:text-2xl leading-snug text-stone-900 mb-3">
                    “You do not rise to the level of your goals. You fall to the level of your systems.”
                  </p>
                  <p className="font-mono text-xs text-stone-600 mb-5 leading-relaxed">
                    Small habits compounded over months build unbreakable discipline. Show up every single day.
                  </p>

                  <div className="p-3 bg-white/70 rounded-md border border-stone-300/80 font-mono text-xs space-y-2">
                    <div className="flex justify-between text-stone-600">
                      <span>Monthly Consistency:</span>
                      <span className="font-bold text-[var(--accent)]">94.2%</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Perfect Days:</span>
                      <span className="font-bold text-stone-900">24 / 29</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Longest Run:</span>
                      <span className="font-bold text-amber-700">42 Days</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-300/70 flex items-center justify-between font-mono text-[10px] text-stone-500">
                  <span>DISCIPLINE OVER MOTIVATION</span>
                  <span className="font-serif italic text-stone-700 text-sm">1% Better</span>
                </div>
              </div>

              {/* Right Page: Interactive Today Check-In or Grid */}
              <div className="pl-0 md:pl-6 pt-6 md:pt-0 flex flex-col justify-between">
                {activeTab === 'today' ? (
                  <div>
                    <div className="flex items-center justify-between border-b border-stone-300 pb-2 mb-3">
                      <span className="font-mono text-[11px] font-bold text-stone-800">
                        ~/ today · daily check-in
                      </span>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                        <Flame size={11} className="fill-current" />
                        <span>{pct}% Done</span>
                      </div>
                    </div>

                    <p className="font-mono text-[10px] text-stone-500 mb-2.5">
                      Click habits to interact:
                    </p>

                    {/* Interactive Clickable Habit List */}
                    <div className="space-y-2">
                      {habits.map((h) => (
                        <div
                          key={h.id}
                          onClick={(e) => toggleHabit(h.id, e)}
                          className="flex items-center justify-between p-2 rounded border transition-all cursor-pointer hover:bg-stone-100/80 active:scale-[0.99]"
                          style={{
                            backgroundColor: h.done ? 'rgba(92, 107, 90, 0.1)' : 'rgba(255, 255, 255, 0.7)',
                            borderColor: h.done ? 'var(--accent)' : 'rgba(0, 0, 0, 0.12)',
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-4 h-4 rounded-[3px] flex items-center justify-center transition-all"
                              style={{
                                backgroundColor: h.done ? 'var(--accent)' : 'transparent',
                                border: h.done ? 'none' : '1.5px solid rgba(0, 0, 0, 0.3)',
                                color: '#FFFFFF',
                              }}
                            >
                              {h.done && <Check size={11} strokeWidth={3} />}
                            </div>
                            <span
                              className="font-mono text-xs truncate max-w-[170px]"
                              style={{
                                textDecoration: h.done ? 'line-through' : 'none',
                                color: h.done ? 'rgba(30,26,23,0.65)' : 'rgba(30,26,23,0.95)',
                                fontWeight: h.done ? 500 : 600,
                              }}
                            >
                              {h.name}
                            </span>
                          </div>

                          <span className="font-mono text-[9px] uppercase tracking-wider text-stone-400 font-medium">
                            {h.tag}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Grid View Spread Preview */
                  <div>
                    <div className="flex items-center justify-between border-b border-stone-300 pb-2 mb-3">
                      <span className="font-mono text-[11px] font-bold text-stone-800">
                        ~/ monthly grid matrix
                      </span>
                      <span className="font-mono text-[10px] text-stone-500 font-bold">
                        [ October 2026 ]
                      </span>
                    </div>

                    {/* Mini Grid representation */}
                    <div className="grid grid-cols-7 gap-1.5 p-2 bg-white/70 rounded border border-stone-300 mb-3">
                      {Array.from({ length: 28 }).map((_, i) => {
                        const filled = i < 22 || i === 25
                        return (
                          <div
                            key={i}
                            className="aspect-square rounded-[2px] flex items-center justify-center text-[8px] font-mono"
                            style={{
                              backgroundColor: filled ? 'var(--accent)' : 'rgba(0,0,0,0.06)',
                              color: filled ? '#FFFFFF' : '#888',
                              fontWeight: filled ? 700 : 400,
                            }}
                          >
                            {i + 1}
                          </div>
                        )
                      })}
                    </div>
                    <p className="font-mono text-[10px] text-stone-500 italic">
                      Every habit digitized into an authentic scrollable month matrix.
                    </p>
                  </div>
                )}

                {/* Bottom Action Footer */}
                <div className="pt-3 border-t border-stone-300/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-stone-600">
                    <Star size={12} className="text-amber-600 fill-amber-500" />
                    <span>Auto-saves immediately</span>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--accent)] font-bold">
                    Page 42 // 365
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* CLOSED PEEK INTERIOR GLIMPSE */
            <div className="p-7 pl-12 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between border-b border-stone-300 pb-2.5 mb-4">
                  <span className="font-mono text-xs font-bold text-stone-800 tracking-wider">
                    ~/ today
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-stone-500 font-bold">
                    [ TODAY ]
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  {habits.slice(0, 5).map((h, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div
                        className="w-4 h-4 rounded-[3px] flex items-center justify-center"
                        style={{
                          backgroundColor: h.done ? 'var(--accent)' : 'transparent',
                          border: h.done ? 'none' : '1.5px solid rgba(0,0,0,0.3)',
                          color: '#FFFFFF',
                        }}
                      >
                        {h.done && <Check size={11} strokeWidth={3} />}
                      </div>
                      <span className="text-[11px] text-stone-700 font-medium truncate">
                        {h.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-300 flex items-center justify-between font-mono text-xs">
                <span className="text-stone-500">Streak: 42 Days</span>
                <span className="font-bold text-[var(--accent)]">Click to Open →</span>
              </div>
            </div>
          )}
        </div>

        {/* ── 7. FRONT COVER (Realistic Linen Cloth with Debossed Foil) ──────── */}
        <motion.div
          initial={false}
          animate={{
            rotateY: isOpen ? -162 : 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 110,
            damping: 18,
            mass: 0.9,
          }}
          style={{
            transformOrigin: 'left center',
            transformStyle: 'preserve-3d',
            position: 'absolute',
            inset: 0,
            borderRadius: '8px',
            backgroundColor: '#1E1B17',
            backgroundImage: `
              radial-gradient(circle at ${lightPos.x}% ${lightPos.y}%, rgba(255,255,255,0.1) 0%, transparent 55%),
              repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 4px),
              repeating-linear-gradient(-45deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 1px, transparent 1px, transparent 4px)
            `,
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: isOpen
              ? '8px 20px 45px rgba(0,0,0,0.45)'
              : '4px 12px 28px rgba(0,0,0,0.35)',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(14px)',
          }}
          className="z-20 p-7 pl-12 flex flex-col justify-between"
        >
          {/* Brass Metallic Corner Protectors */}
          <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-amber-500/70 pointer-events-none rounded-tl-sm" />
          <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-amber-500/70 pointer-events-none rounded-tr-sm" />
          <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-amber-500/70 pointer-events-none rounded-bl-sm" />
          <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-amber-500/70 pointer-events-none rounded-br-sm" />

          {/* Blind Inset Frame Debossed into Leather */}
          <div
            className="absolute inset-4 rounded-[6px] pointer-events-none"
            style={{
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8), 0 1px 1px rgba(255,255,255,0.05)',
            }}
          />

          {/* Elastic Band Across Right Side */}
          <div
            className="absolute top-0 bottom-0 right-10 w-4 pointer-events-none shadow-md"
            style={{
              backgroundColor: '#120F0D',
              borderLeft: '1px solid rgba(255,255,255,0.06)',
              borderRight: '1px solid rgba(0,0,0,0.5)',
            }}
          />

          {/* Top Foil Header */}
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-mono tracking-[0.25em] uppercase font-bold text-stone-400">
                EST. 2026
              </span>
              <span
                className="text-[9px] font-mono tracking-[0.25em] uppercase font-bold px-2 py-0.5 rounded"
                style={{
                  color: 'var(--accent-light, #8BA888)',
                  backgroundColor: 'rgba(92,107,90,0.2)',
                  border: '1px solid rgba(92,107,90,0.3)',
                }}
              >
                [ SYS · 01 ]
              </span>
            </div>
            <div className="h-[1px] w-full bg-stone-700/60" />
          </div>

          {/* Center Embossed Title "1% BETTER" */}
          <div className="relative z-10 text-center my-auto py-4">
            <p className="text-[10px] font-mono tracking-[0.38em] uppercase mb-3 font-semibold text-stone-400">
              PERSONAL DISCIPLINE SYSTEM
            </p>

            {/* Embossed Metallic Title */}
            <div className="relative inline-block mb-3">
              <h3
                className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-transparent bg-clip-text"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #E8E2D8 50%, #B8B0A2 100%)',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
                  letterSpacing: '-0.03em',
                }}
              >
                1% BETTER
              </h3>
            </div>

            <p className="text-xs font-serif italic text-stone-400 max-w-[220px] mx-auto leading-relaxed">
              “You don’t rise to the level of your goals. You fall to the level of your systems.”
            </p>

            {/* Brass Geometric Inset Badge */}
            <div className="flex justify-center items-center gap-2.5 mt-5 opacity-60">
              <div className="w-1 h-1 rounded-full bg-amber-400" />
              <div className="w-8 h-[1px] bg-amber-400/50" />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-300" />
              <div className="w-8 h-[1px] bg-amber-400/50" />
              <div className="w-1 h-1 rounded-full bg-amber-400" />
            </div>
          </div>

          {/* Bottom Foil Stamp */}
          <div className="relative z-10 border-t border-stone-700/60 pt-3 flex items-center justify-between">
            <span className="text-[9px] font-mono uppercase tracking-[0.22em] font-semibold text-stone-400">
              HABIT LOG · VOL. I
            </span>
            <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-stone-400 font-bold">
              EDITION 2026
            </span>
          </div>
        </motion.div>
      </div>

      {/* Floating Keyframe for Mobile Subtle Float */}
      <style jsx global>{`
        @keyframes notebookFloat {
          0%, 100% {
            transform: rotateX(12deg) rotateY(-22deg) rotateZ(2deg) translateY(0px);
          }
          50% {
            transform: rotateX(10deg) rotateY(-18deg) rotateZ(1deg) translateY(-8px);
          }
        }
        .animate-notebook-float {
          animation: notebookFloat 4.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
