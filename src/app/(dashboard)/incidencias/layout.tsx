import { connection } from "next/server"
import { seccionActiva } from "@/lib/config-app"
import { SeccionDesactivada } from "@/components/ui/SeccionDesactivada"

// Toggle ConfigApp.incidenciasActivo (Admin → Configuracion). Cubre /incidencias,
// /incidencias/[id], /incidencias/calendario y /incidencias/stats.
export default async function IncidenciasLayout({ children }: { children: React.ReactNode }) {
  await connection()
  if (!(await seccionActiva("incidencias"))) return <SeccionDesactivada titulo="Incidencias" />
  return <>{children}</>
}
