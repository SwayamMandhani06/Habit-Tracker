// lib/audio.ts — Ambient completion chime using Web Audio API (no external sound files)
'use client'

export function isCompletionSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('completion_sound_enabled') === 'true'
}

export function setCompletionSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('completion_sound_enabled', enabled ? 'true' : 'false')
}

let sharedAudioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return null

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioContextClass()
  }
  return sharedAudioCtx
}

export function playCompletionChime(): void {
  if (typeof window === 'undefined') return
  if (!isCompletionSoundEnabled()) return

  try {
    const ctx = getAudioContext()
    if (!ctx) return

    // Resume audio context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    // Pentatonic chord tones: E5 (659.25Hz), G#5 (830.61Hz), B5 (987.77Hz), E6 (1318.51Hz)
    const chord = [659.25, 830.61, 987.77, 1318.51]

    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime)

      const startTime = ctx.currentTime + idx * 0.07
      const duration = 1.0

      gain.gain.setValueAtTime(0.0001, startTime)
      gain.gain.exponentialRampToValueAtTime(0.04 / (idx + 1), startTime + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + duration)
    })
  } catch (err) {
    // Audio contexts can be blocked if not initiated by gesture; fail silently
    console.debug('Chime audio playback prevented:', err)
  }
}

