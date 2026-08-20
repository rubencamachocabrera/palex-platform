import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await checkRateLimit(_, "/api/hospitales/id")
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const rol = session.user.role
    const userId = session.user.id

    // Verificar acceso por zona para roles no-ADMIN
    if (rol !== "ADMIN") {
      const access = await db.hospital.findFirst({
        where: { id, zona: { usuarios: { some: { usuarioId: userId } } } },
        select: { id: true },
      })
      if (!access) return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const hospital = await db.hospital.findUnique({
      where: { id },
      include: {
        zona: true,
        grupo: { select: { id: true, nombre: true } },
        centros: {
          select: {
            id: true, nombre: true, ciudad: true, tipo: true,
            _count: { select: { visitas: true, proyectos: true } },
          },
          where: { activo: true },
          orderBy: { nombre: "asc" },
        },
        contactos: { orderBy: [{ principal: "desc" }, { nombre: "asc" }] },
        visitas: {
          include: { usuario: { select: { id: true, nombre: true, rol: true } } },
          orderBy: { fecha: "desc" },
          take: 50,
        },
      },
    })
    if (!hospital) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    return NextResponse.json(hospital)
  } catch (err) {
    console.error("[GET]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await checkRateLimit(req, "/api/hospitales/id", { limit: 30 })
    if (rl) return rl

    const session = await auth()
    if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const { id } = await params
    const body = await req.json()
    const { nombre, ciudad, provincia, pais, tipo, camas, direccion, activo, zonaId, latitud, longitud } = body
    // grupoId: allow setting to null explicitly (to remove from group)
    const grupoId = body.grupoId !== undefined ? (body.grupoId || null) : undefined
    const data = Object.fromEntries(
      Object.entries({ nombre, ciudad, provincia, pais, tipo, camas, direccion, activo, zonaId, latitud, longitud, grupoId })
        .filter(([, v]) => v !== undefined)
    )
    const hospital = await db.hospital.update({ where: { id }, data })
    return NextResponse.json(hospital)
  } catch (err) {
    console.error("[PATCH]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await checkRateLimit(_, "/api/hospitales/id", { limit: 30 })
    if (rl) return rl

    const session = await auth()
    if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const { id } = await params

    const [visitas, oportunidades, proyectos, llamadas, incidencias] = await Promise.all([
      db.visita.count({ where: { hospitalId: id } }),
      db.oportunidad.count({ where: { hospitalId: id } }),
      db.proyecto.count({ where: { hospitalId: id } }),
      db.registroLlamada.count({ where: { hospitalId: id } }),
      db.incidencia.count({ where: { hospitalId: id } }),
    ])

    const total = visitas + oportunidades + proyectos + llamadas + incidencias
    if (total > 0) {
      const partes: string[] = []
      if (visitas > 0) partes.push(`${visitas} visita${visitas !== 1 ? "s" : ""}`)
      if (oportunidades > 0) partes.push(`${oportunidades} oportunidad${oportunidades !== 1 ? "es" : ""}`)
      if (proyectos > 0) partes.push(`${proyectos} proyecto${proyectos !== 1 ? "s" : ""}`)
      if (llamadas > 0) partes.push(`${llamadas} llamada${llamadas !== 1 ? "s" : ""}`)
      if (incidencias > 0) partes.push(`${incidencias} incidencia${incidencias !== 1 ? "s" : ""}`)
      return NextResponse.json(
        { error: `No se puede eliminar: tiene ${partes.join(", ")} vinculados` },
        { status: 409 }
      )
    }

    await db.hospital.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    // Salvaguarda: cualquier relacion no contemplada arriba que tenga
    // onDelete Restrict (explicito o implicito) devuelve 409 en vez de 500.
    const cause = (err as { cause?: { code?: string } })?.cause
    const pgCode = cause?.code
    const isFkViolation = (err as { code?: string })?.code === "P2003" || pgCode === "23503" || pgCode === "23001"
    if (isFkViolation) {
      return NextResponse.json(
        { error: "No se puede eliminar: tiene datos vinculados (llamadas, incidencias u otros registros)." },
        { status: 409 }
      )
    }
    console.error("[DELETE]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
