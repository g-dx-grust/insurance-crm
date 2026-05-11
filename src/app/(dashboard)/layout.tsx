import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { getSessionUserOrRedirect } from '@/lib/auth/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await getSessionUserOrRedirect()

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userProfile={profile} />
        <main className="flex-1 overflow-y-auto bg-[color:var(--color-bg-secondary)] p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
