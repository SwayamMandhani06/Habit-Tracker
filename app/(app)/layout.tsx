// app/(app)/layout.tsx — Protected app shell layout
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/session'
import { Sidebar } from '@/components/nav/Sidebar'
import { BottomTabBar } from '@/components/nav/BottomTabBar'
import { TimezoneSync } from '@/components/providers/TimezoneSync'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  return (
    <div className="app-shell">
      <TimezoneSync storedTimezone={user.user_metadata?.timezone} />
      <Sidebar />
      <main className="app-main">
        {children}
      </main>
      <BottomTabBar />
    </div>
  )
}
