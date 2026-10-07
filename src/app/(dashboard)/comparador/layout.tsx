import { connection } from "next/server"
import { seccionActiva } from "@/lib/config-app"
import { SeccionDesactivada } from "@/components/ui/SeccionDesactivada"

// Toggle ConfigApp.analiticaActivo (Admin → Configuracion).
export default async function ComparadorLayout({ children }: { children: React.ReactNode }) {
  await connection()
  if (!(await seccionActiva("analitica"))) return <SeccionDesactivada titulo="Comparador de periodos" />
  return <>{children}</>
}
