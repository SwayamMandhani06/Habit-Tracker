'use client'
// components/cat/CatCompanion.tsx — v2
// Single-path line-art cat. Real cursor-follow lerp on desktop.
// Small, subtle, charming.

import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  completionPct?: number
}

export function CatCompanion({ completionPct = 0 }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const targetDxRef = useRef(0)
  const targetDyRef = useRef(0)
  const currentDxRef = useRef(0)
  const currentDyRef = useRef(0)

  const [faceDx, setFaceDx] = useState(0)
  const [faceDy, setFaceDy] = useState(0)
  const [eyeSquint, setEyeSquint] = useState(false)
  const [tapped, setTapped] = useState(false)
  const isTouchDevice = useRef(false)

  // Detect touch device once on mount
  useEffect(() => {
    isTouchDevice.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }, [])

  // Desktop: track cursor, map to small face offset
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isTouchDevice.current) return
      const el = wrapperRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const dist = Math.hypot(dx, dy)

      if (dist < 300) {
        // max ±5px x, ±4px y shift on the face
        const t = 1 - Math.min(dist / 300, 1)
        targetDxRef.current = (dx / Math.max(dist, 1)) * t * 5
        targetDyRef.current = (dy / Math.max(dist, 1)) * t * 4
      } else {
        targetDxRef.current = 0
        targetDyRef.current = 0
      }
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [])

  // RAF lerp loop — runs continuously, updates state only when delta is visible
  useEffect(() => {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    const tick = () => {
      currentDxRef.current = lerp(currentDxRef.current, targetDxRef.current, 0.08)
      currentDyRef.current = lerp(currentDyRef.current, targetDyRef.current, 0.08)
      setFaceDx(Math.round(currentDxRef.current * 100) / 100)
      setFaceDy(Math.round(currentDyRef.current * 100) / 100)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Random blink every 3–6 seconds
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const blink = () => {
      t = setTimeout(() => {
        setEyeSquint(true)
        setTimeout(() => setEyeSquint(false), 130)
        blink()
      }, 3000 + Math.random() * 3000)
    }
    blink()
    return () => clearTimeout(t)
  }, [])

  // Mobile: brief twitch on tap
  const handleTouch = useCallback(() => {
    setTapped(true)
    setTimeout(() => setTapped(false), 380)
  }, [])

  useEffect(() => {
    window.addEventListener('touchstart', handleTouch, { passive: true })
    return () => window.removeEventListener('touchstart', handleTouch)
  }, [handleTouch])

  const idleClass = completionPct >= 70 ? 'cat--playful' : completionPct >= 30 ? 'cat--neutral' : 'cat--sleepy'

  return (
    <div
      ref={wrapperRef}
      className={tapped ? 'cat--tapped' : idleClass}
      style={{
        color: 'var(--accent)',
        opacity: 0.68,
        display: 'inline-block',
        userSelect: 'none',
        pointerEvents: 'none',
        flexShrink: 0,
        lineHeight: 0,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 48 54"
        width="38"
        height="42"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/*
          Single-stroke cat body:
          Clockwise from left ear tip → left outer ear edge → left body side →
          body bottom → right body side → right outer ear edge → right ear tip →
          right inner ear → forehead curve → left inner ear → Z (closes = left ear)
          Result: two triangle ears + full body outline as one continuous path.
        */}
        <path d="M14 3 L9 14 C5 22 4 32 7 40 C10 47 16 53 24 53 C32 53 38 47 41 40 C44 32 43 22 39 14 L34 3 L29 12 C27 10 21 10 19 12 Z" />

        {/* Face — shifts with cursor (desktop) */}
        <g transform={`translate(${faceDx},${faceDy})`}>
          {eyeSquint ? (
            <>
              {/* Squint / blink */}
              <path d="M16 25 Q18 23.5 20 25" strokeWidth="1.2" />
              <path d="M28 25 Q30 23.5 32 25" strokeWidth="1.2" />
            </>
          ) : (
            <>
              {/* Eyes */}
              <circle cx="18" cy="25" r="2" fill="currentColor" stroke="none" />
              <circle cx="30" cy="25" r="2" fill="currentColor" stroke="none" />
              {/* Eye gleam */}
              <circle cx="18.8" cy="24.2" r="0.65" fill="var(--bg-base)" stroke="none" />
              <circle cx="30.8" cy="24.2" r="0.65" fill="var(--bg-base)" stroke="none" />
            </>
          )}

          {/* Nose */}
          <path d="M22 30 L24 32 L26 30" strokeWidth="1.1" />

          {/* Whiskers — thin */}
          <line x1="5"  y1="29" x2="17" y2="30.5" strokeWidth="0.75" />
          <line x1="4"  y1="32" x2="16" y2="33"   strokeWidth="0.75" />
          <line x1="43" y1="29" x2="31" y2="30.5" strokeWidth="0.75" />
          <line x1="44" y1="32" x2="32" y2="33"   strokeWidth="0.75" />
        </g>

        {/* Tail — curls out from lower right of body */}
        <path d="M41 43 C48 38 50 30 44 26" strokeWidth="1.4" />
      </svg>
    </div>
  )
}
