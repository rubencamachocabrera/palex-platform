// Layout del dashboard — protegido, con sidebar y topbar
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Sidebar } from "@/components/Sidebar"
import { TopBar } from "@/components/TopBar"
import { ToastProvider } from "@/components/Toast"
import { KeyboardShortcutsProvider } from "@/components/KeyboardShortcutsProvider"
import { PageTransition } from "@/components/PageTransition"
import { BottomNav } from "@/components/BottomNav"
import { OnboardingWizard } from "@/components/OnboardingWizard"
import { NotificationManager } from "@/components/NotificationManager"
import { QuickActionsFAB } from "@/components/QuickActionsFAB"
import { InteractionLayer } from "@/components/InteractionLayer"
import { ActivityIndicator } from "@/components/ActivityIndicator"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  // Módulos activos leídos en servidor: el sidebar se hidrata con el mismo HTML
  // (antes leía localStorage en el primer render → desajuste de hidratación).
  // El layout no se re-ejecuta en navegaciones de cliente, solo en cargas completas.
  const config = await db.configApp
    .findUnique({ where: { id: 1 }, select: { crmActivo: true, incidenciasActivo: true, analiticaActivo: true } })
    .catch(() => null)

  return (
    <KeyboardShortcutsProvider>
      <ToastProvider>
        <OnboardingWizard />
        <div className="app-shell flex h-screen bg-page overflow-hidden">
          <Sidebar
            nombre={session.user.name ?? "Usuario"}
            rol={session.user.role}
            crmActivo={config?.crmActivo ?? false}
            incidenciasActivo={config?.incidenciasActivo ?? true}
            analiticaActivo={config?.analiticaActivo ?? true}
          />
          <div className="app-workspace flex-1 flex flex-col min-w-0 overflow-hidden">
            <TopBar />
            <main id="main-content" className="app-main flex-1 overflow-auto p-4 sm:p-6 lg:p-8 pb-28 md:pb-6 lg:pb-8">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </div>
        <BottomNav />
        <QuickActionsFAB />
        <NotificationManager />
        <InteractionLayer />
        <ActivityIndicator />
      </ToastProvider>
    </KeyboardShortcutsProvider>
  )
}
