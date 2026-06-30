// app/api/auth/pin/route.ts
// POST endpoint: verifies PIN, sets httpOnly session cookie
// APP_PIN is read ONLY here — never exposed to any client bundle

import { NextRequest, NextResponse } from 'next/server'
import { verifyPin, createSession } from '@/lib/auth/session'
import { z } from 'zod'

const schema = z.object({
  pin: z.string().min(1).max(10),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 })
    }

    const { pin } = result.data

    if (!verifyPin(pin)) {
      // Small artificial delay to slow brute-force attempts
      await new Promise(r => setTimeout(r, 400))
      return NextResponse.json({ success: false, error: 'Incorrect PIN' }, { status: 401 })
    }

    await createSession()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PIN auth error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
