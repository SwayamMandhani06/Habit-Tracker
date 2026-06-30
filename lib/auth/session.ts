// lib/auth/session.ts
// Secure httpOnly session cookie management using iron-session
// APP_PIN and SESSION_SECRET are ONLY accessed server-side

import { cookies } from 'next/headers'
import { getIronSession, SessionOptions } from 'iron-session'

export interface SessionData {
  authenticated: boolean
  authenticatedAt?: number
}

const SESSION_COOKIE_NAME = 'hbt_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days in seconds

function getSessionOptions(): SessionOptions {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set and at least 32 characters long')
  }
  return {
    cookieName: SESSION_COOKIE_NAME,
    password: secret,
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: SESSION_MAX_AGE,
      sameSite: 'lax',
      path: '/',
    },
  }
}

export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, getSessionOptions())
}

export async function verifySession(): Promise<boolean> {
  try {
    const session = await getSession()
    return session.authenticated === true
  } catch {
    return false
  }
}

export async function createSession(): Promise<void> {
  const session = await getSession()
  session.authenticated = true
  session.authenticatedAt = Date.now()
  await session.save()
}

export async function destroySession(): Promise<void> {
  const session = await getSession()
  session.destroy()
}

export function verifyPin(inputPin: string): boolean {
  const correctPin = process.env.APP_PIN
  if (!correctPin) {
    throw new Error('APP_PIN environment variable is not set')
  }
  // Constant-time comparison to prevent timing attacks
  if (inputPin.length !== correctPin.length) return false
  let diff = 0
  for (let i = 0; i < inputPin.length; i++) {
    diff |= inputPin.charCodeAt(i) ^ correctPin.charCodeAt(i)
  }
  return diff === 0
}
