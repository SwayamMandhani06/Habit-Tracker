'use client'
// components/homepage/Screenshot.tsx
// Client component so it can handle image error events gracefully
import { useState } from 'react'
import Image from 'next/image'
import { Grid3X3 } from 'lucide-react'

export function Screenshot({ src, alt, label }: { src: string; alt: string; label: string }) {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16/10',
        background: 'var(--bg-surface-2)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        {!imgFailed && (
          <Image
            src={src}
            alt={alt}
            fill
            style={{ objectFit: 'cover', objectPosition: 'top' }}
            onError={() => setImgFailed(true)}
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        )}
        {/* Placeholder — shown when image is missing */}
        {imgFailed && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'var(--bg-surface-2)',
          }}>
            <div style={{
              width: 48, height: 48, background: 'var(--bg-surface-4)',
              borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Grid3X3 size={20} color="var(--ink-tertiary)" />
            </div>
            <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)', letterSpacing: '0.04em' }}>
              screenshot: {label}
            </p>
            <p style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-disabled)', letterSpacing: '0.02em', fontWeight: 400 }}>
              drop {src.replace('/screenshots/', '')} in /public/screenshots/
            </p>
          </div>
        )}
      </div>
      <p style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)', letterSpacing: '0.06em', textAlign: 'center', textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </p>
    </div>
  )
}
