/**
 * Control de acceso de Inteligencia InLab (solo servidor).
 * Mismo patrón IDOR que hospitales/visitas: ADMIN ve todo; el resto solo
 * hospitales activos de sus zonas.
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { INLAB_ROLES_FACTURACION, INLAB_ROLES_VER } from "./roles"

export { INLAB_ROLES_FACTURACION, INLAB_ROLES_VER }

export interface SesionUsuario { id: string; role: string }

export function puedeVerInlab(user: SesionUsuario): boolean {
  return (INLAB_ROLES_VER as readonly string[]).includes(user.role)
}

export function puedeFacturacion(user: SesionUsuario): boolean {
  return (INLAB_ROLES_FACTURACION as readonly string[]).includes(user.role)
}

/** Filtro Prisma de hospitales accesibles para el usuario. */
export function whereHospitalesAccesibles(user: SesionUsuario) {
  return user.role === "ADMIN" ? {} : { activo: true, zona: { usuarios: { some: { usuarioId: user.id } } } }
}

export async function puedeAccederHospital(user: SesionUsuario, hospitalId: string): Promise<boolean> {
  if (user.role === "ADMIN") {
    const h = await db.hospital.findUnique({ where: { id: hospitalId }, select: { id: true } })
    return !!h
  }
  const h = await db.hospital.findFirst({
    where: { id: hospitalId, ...whereHospitalesAccesibles(user) },
    select: { id: true },
  })
  return !!h
}

/**
 * Sesión + rol InLab en un paso. Devuelve el usuario o la respuesta de error lista para retornar.
 */
export async function requireInlabUser(opts: { facturacion?: boolean } = {}): Promise<SesionUsuario | NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const user: SesionUsuario = { id: session.user.id, role: session.user.role }
  if (!puedeVerInlab(user)) return NextResponse.json({ error: "Sin acceso a Inteligencia InLab" }, { status: 403 })
  if (opts.facturacion && !puedeFacturacion(user)) return NextResponse.json({ error: "Sin acceso a facturación" }, { status: 403 })
  return user
}

/** Devuelve solo los ids accesibles de la lista. */
export async function filtrarHospitalesAccesibles(user: SesionUsuario, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return []
  const hs = await db.hospital.findMany({
    where: { id: { in: ids }, ...whereHospitalesAccesibles(user) },
    select: { id: true },
  })
  return hs.map(h => h.id)
}
