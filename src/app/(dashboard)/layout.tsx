// Layout del dashboard — protegido, con sidebar y topbar
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/Sidebar"
import { TopBar } from "@/components/TopBar"
import { ToastProvider } from "@/components/Toast"
import { KeyboardShortcutsProvider } from "@/components/KeyboardShortcutsProvider"
import { PageTransition } from "@/components/PageTransition"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <KeyboardShortcutsProvider>
      <ToastProvider>
        <div className="flex h-screen bg-page overflow-hidden">
          <Sidebar nombre={session.user.name ?? "Usuario"} rol={session.user.role} />
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <TopBar />
            <main id="main-content" className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </div>
      </ToastProvider>
    </KeyboardShortcutsProvider>
  )
}
