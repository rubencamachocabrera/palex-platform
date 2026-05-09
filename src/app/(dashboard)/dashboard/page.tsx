// Página home del dashboard
import { auth } from "@/lib/auth"

const ROL_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  VENTAS: "Equipo de Ventas",
  PROYECTOS: "Equipo de Proyectos",
}

export default async function DashboardPage() {
  const session = await auth()
  const rol = session?.user?.role ?? ""

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 mb-1">
        Bienvenido, {session?.user?.name} 👋
      </h1>
      <p className="text-gray-500 text-sm">{ROL_LABEL[rol] ?? rol}</p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Módulo</p>
          <p className="text-gray-600 text-sm">Próximamente: Proyectos, Ventas y más.</p>
        </div>
      </div>
    </div>
  )
}
