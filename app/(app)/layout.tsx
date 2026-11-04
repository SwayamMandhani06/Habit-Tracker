// app/(app)/layout.tsx — Protected app shell layout
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/session'
import { createServerClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/nav/Sidebar'
import { BottomTabBar } from '@/components/nav/BottomTabBar'
import { TimezoneSync } from '@/components/providers/TimezoneSync'
import { SeedRetryBanner } from '@/components/nav/SeedRetryBanner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const tAuthStart = performance.now()
  const user = await getSessionUser()
  const layoutAuthDur = Math.round((performance.now() - tAuthStart) * 100) / 100
  console.log(
    JSON.stringify({
      type: 'timing',
      page: 'layout',
      step: 'layout_auth',
      durationMs: layoutAuthDur,
      timestamp: Date.now(),
    })
  )

  if (!user) redirect('/login')

  const supabase = await createServerClient()
  let seedError: string | null = null

  // Ensure default seed data exists for newly authenticated accounts
  const tSeedStart = performance.now()
  try {
    const { data: seedData, error } = await supabase.rpc('seed_default_data')
    if (error) {
      console.error('[AppLayout] seed_default_data error for user:', user.id, {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      seedError = error.message
    } else if ((seedData as any)?.seeded) {
      console.log('[AppLayout] Successfully seeded default habits for user:', user.id)
    }
  } catch (err: any) {
    console.error('[AppLayout] Exception executing seed_default_data:', err)
    seedError = err?.message || 'Database error during setup'
  } finally {
    const seedDur = Math.round((performance.now() - tSeedStart) * 100) / 100
    console.log(
      JSON.stringify({
        type: 'timing',
        page: 'layout',
        step: 'layout_seed',
        durationMs: seedDur,
        timestamp: Date.now(),
      })
    )
  }

  return (
    <div className="app-shell">
      {seedError && <SeedRetryBanner error={seedError} />}
      <TimezoneSync storedTimezone={user.user_metadata?.timezone} />
      <Sidebar userEmail={user.email ?? null} />
      <main className="app-main">
        {children}
      </main>
      <BottomTabBar />
    </div>
  )
}
