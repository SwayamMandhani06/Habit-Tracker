'use client'
// app/login/page.tsx — Email/password + Google OAuth login/signup
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, Chrome } from 'lucide-react'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let active = true

    async function initAuth() {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const errorDesc = params.get('error_description') || hashParams.get('error_description') || params.get('error')
        if (errorDesc) {
          setError(decodeURIComponent(errorDesc).replace(/\+/g, ' '))
        }

        if (params.get('mode') === 'signup') {
          setMode('signup')
        }
        if (params.get('switch') === '1') {
          await supabase.auth.signOut()
          if (active) setCheckingSession(false)
          return
        }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/dashboard')
      } else if (active) {
        setCheckingSession(false)
      }
    }

    initAuth()
    return () => { active = false }
  }, [router, supabase])

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message.toLowerCase())
        setLoading(false)
        return
      }
      router.push('/dashboard')
      router.refresh()
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
          data: { full_name: name.trim() || undefined },
        },
      })
      if (error) {
        setError(error.message.toLowerCase())
        setLoading(false)
        return
      }

      // If user is returned without active session, sign them in directly
      if (data.user && !data.session) {
        await supabase.auth.signInWithPassword({ email, password })
      }

      // Auto-seed for new user
      if (data.user) {
        try {
          await fetch('/api/seed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        } catch {
          // Seed failure is non-fatal
        }
      }

      // Redirect directly to /dashboard without waiting for email confirmation
      router.push('/dashboard')
      router.refresh()
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message.toLowerCase())
      setGoogleLoading(false)
    }
  }

  const switchMode = (newMode: Mode) => {
    setMode(newMode)
    setError(null)
    setMessage(null)
  }

  if (checkingSession) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8125rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
          Verifying session...
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ width: '100%', maxWidth: '380px' }}
      >
        {/* Breadcrumb */}
        <p style={{
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--ink-tertiary)',
          letterSpacing: '0.03em',
          marginBottom: '32px',
        }}>
          ~/ {mode === 'login' ? 'login' : 'sign up'}
        </p>

        {/* Header */}
        <h1 style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          fontFamily: 'var(--font-mono)',
          color: 'var(--ink-primary)',
          letterSpacing: '-0.02em',
          marginBottom: '6px',
        }}>
          {mode === 'login' ? 'Welcome Back.' : 'Create Account.'}
        </h1>
        <p style={{
          fontSize: '0.8125rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--ink-tertiary)',
          marginBottom: '28px',
          fontWeight: 400,
        }}>
          {mode === 'login'
            ? 'Sign in to your 1% Better account'
            : 'Start building better habits today'}
        </p>

        {/* Error / Message */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                padding: '10px 14px',
                background: 'rgba(139,65,65,0.07)',
                border: '1px solid rgba(139,65,65,0.25)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                fontSize: '0.8125rem',
                fontFamily: 'var(--font-mono)',
                color: '#8B4141',
                fontWeight: 400,
              }}
            >
              {error}
            </motion.div>
          )}
          {message && (
            <motion.div
              key="message"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                padding: '10px 14px',
                background: 'var(--accent-subtle)',
                border: '1px solid var(--accent)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                fontSize: '0.8125rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent-muted)',
                fontWeight: 400,
              }}
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <AnimatePresence>
            {mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label style={{ display: 'block', fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '5px', fontWeight: 600 }}>
                  NAME <span style={{ color: 'var(--ink-disabled)' }}>(OPTIONAL)</span>
                </label>
                <input
                  id="signup-name"
                  className="input"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label style={{ display: 'block', fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '5px', fontWeight: 600 }}>
              EMAIL
            </label>
            <input
              id="auth-email"
              className="input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '5px', fontWeight: 600 }}>
              PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="auth-password"
                className="input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                style={{ paddingRight: '42px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--ink-tertiary)', display: 'flex', padding: 0,
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label style={{ display: 'block', fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '5px', fontWeight: 600 }}>
                  CONFIRM PASSWORD
                </label>
                <input
                  id="signup-confirm-password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            id="auth-submit"
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ marginTop: '6px', padding: '10px 18px', justifyContent: 'center', width: '100%', fontSize: '0.875rem' }}
          >
            {loading ? 'Please wait…' : (
              <>
                {mode === 'login' ? 'Continue' : 'Create Account'}
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
          <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)', letterSpacing: '0.06em' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
        </div>

        {/* Google OAuth */}
        <button
          id="google-signin"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="btn btn-ghost"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '10px 18px',
            fontSize: '0.875rem',
            gap: 10,
          }}
        >
          {/* Simple Google "G" icon */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {googleLoading ? 'Redirecting…' : 'Continue With Google'}
        </button>

        {/* Toggle mode */}
        <p style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: '0.8125rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--ink-tertiary)',
          fontWeight: 400,
        }}>
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                id="toggle-to-signup"
                onClick={() => switchMode('signup')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', padding: 0, textDecoration: 'underline' }}
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                id="toggle-to-login"
                onClick={() => switchMode('login')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', padding: 0, textDecoration: 'underline' }}
              >
                Sign In
              </button>
            </>
          )}
        </p>

        {/* Back to homepage */}
        <p style={{ textAlign: 'center', marginTop: '16px' }}>
          <a href="/" style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-disabled)', textDecoration: 'none', letterSpacing: '0.02em' }}>
            ← Back to Homepage
          </a>
        </p>
      </motion.div>
    </div>
  )
}
