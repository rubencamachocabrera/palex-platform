import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod/v4"

const PostSchema = z.object({
  tipo: z.enum(["DUPLICADA", "RELACIONADA", "CAUSA_RAIZ"]),
  relacionadaId: z.string().min(1),
})

class RelacionDuplicadaError extends Error {}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = checkRateLimit(req, "incidencias-relaciones", { limit: 60, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params

    if (session.user.role !== "ADMIN") {
      const access = await db.incidencia.findFirst({
        where: { id, hospital: { zona: { usuarios: { some: { usuarioId: session.user.id } } } } },
        select: { id: true },
      })
      if (!access) return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const [origen, destino] = await Promise.all([
      db.incidenciaRelacion.findMany({
        where: { incidenciaId: id },
        include: { relacionada: { select: { id: true, codigo: true, titulo: true, estado: true, prioridad: true } }, creadoPor: { select: { nombre: true } } },
        orderBy: { creadoEn: "desc" },
      }),
      db.incidenciaRelacion.findMany({
        where: { relacionadaId: id },
        include: { incidencia: { select: { id: true, codigo: true, titulo: true, estado: true, prioridad: true } }, creadoPor: { select: { nombre: true } } },
        orderBy: { creadoEn: "desc" },
      }),
    ])

    // Normalise into a single list from this incidencia's perspective
    const relaciones = [
      ...origen.map(r => ({ id: r.id, tipo: r.tipo, creadoEn: r.creadoEn, creadoPor: r.creadoPor.nombre, incidencia: r.relacionada, direccion: "origen" as const })),
      ...destino.map(r => ({ id: r.id, tipo: r.tipo, creadoEn: r.creadoEn, creadoPor: r.creadoPor.nombre, incidencia: r.incidencia, direccion: "destino" as const })),
    ].sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime())

    return NextResponse.json(relaciones)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = checkRateLimit(req, "incidencias-relaciones-post", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const parsed = PostSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })

    const { tipo, relacionadaId } = parsed.data

    if (id === relacionadaId) return NextResponse.json({ error: "No puedes relacionar una incidencia consigo misma" }, { status: 400 })

    const zonaWhere = session.user.role !== "ADMIN"
      ? { hospital: { zona: { usuarios: { some: { usuarioId: session.user.id } } } } }
      : {}

    // Verify both incidencias exist and user has access (misma zona si no es ADMIN)
    const [inc, relacionada] = await Promise.all([
      db.incidencia.findFirst({ where: { id, ...zonaWhere }, select: { id: true } }),
      db.incidencia.findFirst({ where: { id: relacionadaId, ...zonaWhere }, select: { id: true } }),
    ])
    if (!inc || !relacionada) return NextResponse.json({ error: "Incidencia no encontrada" }, { status: 404 })

    const relacion = await db.$transaction(async tx => {
      // Check for existing reverse relation too — dentro de la transaccion para evitar duplicados en concurrencia
      const existing = await tx.incidenciaRelacion.findFirst({
        where: {
          OR: [
            { incidenciaId: id, relacionadaId },
            { incidenciaId: relacionadaId, relacionadaId: id },
          ],
        },
      })
      if (existing) throw new RelacionDuplicadaError()

      return tx.incidenciaRelacion.create({
        data: { tipo, incidenciaId: id, relacionadaId, creadoPorId: session.user.id },
        include: { relacionada: { select: { id: true, codigo: true, titulo: true, estado: true, prioridad: true } }, creadoPor: { select: { nombre: true } } },
      })
    }, { isolationLevel: "Serializable" })

    return NextResponse.json({
      id: relacion.id, tipo: relacion.tipo, creadoEn: relacion.creadoEn,
      creadoPor: relacion.creadoPor.nombre, incidencia: relacion.relacionada, direccion: "origen" as const,
    }, { status: 201 })
  } catch (e) {
    if (e instanceof RelacionDuplicadaError) {
      return NextResponse.json({ error: "Ya existe una relación entre estas incidencias" }, { status: 409 })
    }
    console.error(e)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = checkRateLimit(req, "incidencias-relaciones-del", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const relacionId = searchParams.get("relacionId")
    if (!relacionId) return NextResponse.json({ error: "relacionId requerido" }, { status: 400 })

    const relacion = await db.incidenciaRelacion.findUnique({ where: { id: relacionId } })
    if (!relacion) return NextResponse.json({ error: "Relación no encontrada" }, { status: 404 })

    // Only creator or ADMIN can delete
    if (relacion.creadoPorId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
    // Must belong to this incidencia
    if (relacion.incidenciaId !== id && relacion.relacionadaId !== id) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    await db.incidenciaRelacion.delete({ where: { id: relacionId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
