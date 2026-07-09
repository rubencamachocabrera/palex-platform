import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { calcularScore } from "@/lib/visita-analysis"
import { logActividad } from "@/lib/log-actividad"
import { checkRateLimit } from "@/lib/rate-limit"

async function canAccessVisita(userId: string, role: string, visita: { usuarioId: string; hospitalId: string }) {
  if (role === "ADMIN") return true
  if (visita.usuarioId === userId) return true
  const zoneAccess = await db.hospital.findFirst({
    where: { id: visita.hospitalId, zona: { usuarios: { some: { usuarioId: userId } } } },
    select: { id: true },
  })
  return !!zoneAccess
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await checkRateLimit(_, "/api/visitas/id")
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const visita = await db.visita.findUnique({
      where: { id },
      include: {
        hospital: { select: { id: true, nombre: true, ciudad: true } },
        usuario: { select: { id: true, nombre: true } },
        oportunidad: { select: { id: true, titulo: true, etapa: true } },
        proyecto: { select: { id: true, titulo: true } },
        contactoPrincipal: { select: { id: true, nombre: true, cargo: true } },
        tags: { include: { tag: true } },
      },
    })
    if (!visita) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    if (!await canAccessVisita(session.user.id, session.user.role as string, visita))
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    return NextResponse.json(visita)
  } catch (err) {
    console.error("[GET]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await checkRateLimit(req, "/api/visitas/id", { limit: 30 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    const visita = await db.visita.findUnique({ where: { id } })
    if (!visita) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    if (!await canAccessVisita(session.user.id, session.user.role as string, visita))
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const datosParaScore = body.datos !== undefined
      ? (body.datos as Record<string, unknown>)
      : (visita.datos as Record<string, unknown> ?? {})
    const { score } = calcularScore(datosParaScore)

    // Sync tags if tagIds provided
    if (Array.isArray(body.tagIds)) {
      await db.visitaTag.deleteMany({ where: { visitaId: id } })
      if (body.tagIds.length > 0) {
        await db.visitaTag.createMany({
          data: body.tagIds.map((tagId: string) => ({ visitaId: id, tagId })),
          skipDuplicates: true,
        })
      }
    }

    const updated = await db.visita.update({
      where: { id },
      data: {
        ...(body.datos !== undefined && { datos: body.datos }),
        ...(body.estado !== undefined && { estado: body.estado }),
        ...(typeof body.titulo === "string" && { titulo: body.titulo.trim() || null }),
        ...(body.fecha !== undefined && body.fecha && !isNaN(Date.parse(body.fecha)) && { fecha: new Date(body.fecha) }),
        ...("oportunidadId" in body && { oportunidadId: body.oportunidadId ?? null }),
        ...("proyectoId" in body && { proyectoId: body.proyectoId ?? null }),
        ...("contactoPrincipalId" in body && { contactoPrincipalId: body.contactoPrincipalId ?? null }),
        score,
      },
      include: {
        oportunidad: { select: { id: true, titulo: true, etapa: true } },
        proyecto: { select: { id: true, titulo: true } },
        contactoPrincipal: { select: { id: true, nombre: true, cargo: true } },
        tags: { include: { tag: true } },
      },
    })

    // Auto-vincular contacto al pre-proyecto si ambos están presentes
    if ("contactoPrincipalId" in body && body.contactoPrincipalId && updated.proyectoId) {
      try {
        await db.proyectoContacto.upsert({
          where: { proyectoId_contactoId: { proyectoId: updated.proyectoId, contactoId: body.contactoPrincipalId } },
          create: { proyectoId: updated.proyectoId, contactoId: body.contactoPrincipalId },
          update: {},
        })
      } catch (e) { console.warn("[PATCH visitas/[id]] upsert contacto pre-proyecto:", e) }
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error("[PATCH]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await checkRateLimit(_, "/api/visitas/id", { limit: 30 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const visita = await db.visita.findUnique({ where: { id }, select: { id: true, usuarioId: true } })
    if (!visita) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    const rol = session.user.role
    if (rol !== "ADMIN" && visita.usuarioId !== session.user.id)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    await db.visita.delete({ where: { id } })
    logActividad(session.user.id, "ELIMINAR", "visita", id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE visitas/[id]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
