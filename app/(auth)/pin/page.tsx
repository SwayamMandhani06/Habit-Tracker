// app/(auth)/pin/page.tsx — PIN lock screen
import type { Metadata } from 'next'
import { PinScreen } from '@/components/pin/PinScreen'

export const metadata: Metadata = {
  title: '1% Better — Unlock',
}

export default function PinPage() {
  return <PinScreen />
}
