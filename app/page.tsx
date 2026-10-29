import type { Metadata } from 'next'
import { HomePageClient } from '@/components/homepage/HomePageClient'

export const metadata: Metadata = {
  title: '1% Better — A Calm, Focused Habit Tracker',
  description: 'A calm, focused habit tracker for people who take their systems seriously. Getting 1% better every day.',
}

export default function HomePage() {
  return <HomePageClient />
}
