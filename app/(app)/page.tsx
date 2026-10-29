// app/(app)/page.tsx — Redirect root app path to /dashboard
import { redirect } from 'next/navigation'

export default function AppRootPage() {
  redirect('/dashboard')
}
