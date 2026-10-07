import { cache } from "react"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

/**
 * Configuracion global de la app (fila unica id=1). Se crea con los defaults
 * del schema si no existe. `cache` deduplica la consulta dentro de un mismo
 * render/request de servidor.
 */
export const getConfigApp = cache(async () => {
  let config = await db.configApp.findUnique({ where: { id: 1 } })
  if (!config) config = await db.configApp.create({ data: { id: 1 } })
  return config
})

export type SeccionToggle = "incidencias" | "analitica"

const FLAG: Record<SeccionToggle, "incidenciasActivo" | "analiticaActivo"> = {
  incidencias: "incidenciasActivo",
  analitica: "analiticaActivo",
}

/** true si la seccion esta activa. Ante error de DB se asume activa (no bloquear). */
export async function seccionActiva(seccion: SeccionToggle): Promise<boolean> {
  try {
    const config = await getConfigApp()
    return config[FLAG[seccion]] !== false
  } catch {
    return true
  }
}

/** Para APIs que solo sirven a una seccion: devuelve 403 si esta desactivada, o null. */
export async function guardSeccion(seccion: SeccionToggle): Promise<NextResponse | null> {
  if (await seccionActiva(seccion)) return null
  return NextResponse.json({ error: "Seccion desactivada por el administrador" }, { status: 403 })
}
