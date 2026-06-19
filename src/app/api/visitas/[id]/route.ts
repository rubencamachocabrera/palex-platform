import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { calcularScore } from "@/lib/visita-analysis"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const visita = await db.visita.findUnique({
      where: { id },
      include: {
        hospital: { select: { id: true, nombre: true, ciudad: true } },
        usuario: { select: { id: true, nombre: true } },
        oportunidad: { select: { id: true, titulo: true, etapa: true } },
        preProyecto: { select: { id: true, titulo: true } },
        contactoPrincipal: { select: { id: true, nombre: true, cargo: true } },
      },
    })
    if (!visita) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    // Solo el propietario o ADMIN pueden ver la visita
    const rol = session.user.role
    if (rol !== "ADMIN" && visita.usuarioId !== session.user.id)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    return NextResponse.json(visita)
  } catch (err) {
    console.error("[GET]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    const visita = await db.visita.findUnique({ where: { id } })
    if (!visita) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    const rol = session.user.role
    if (rol !== "ADMIN" && visita.usuarioId !== session.user.id)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const datosParaScore = body.datos !== undefined
      ? (body.datos as Record<string, unknown>)
      : (visita.datos as Record<string, unknown> ?? {})
    const { score } = calcularScore(datosParaScore)

    const updated = await db.visita.update({
      where: { id },
      data: {
        ...(body.datos !== undefined && { datos: body.datos }),
        ...(body.estado !== undefined && { estado: body.estado }),
        ...(typeof body.titulo === "string" && { titulo: body.titulo.trim() || null }),
        ...(body.fecha !== undefined && body.fecha && !isNaN(Date.parse(body.fecha)) && { fecha: new Date(body.fecha) }),
        ...("oportunidadId" in body && { oportunidadId: body.oportunidadId ?? null }),
        ...("preProyectoId" in body && { preProyectoId: body.preProyectoId ?? null }),
        ...("contactoPrincipalId" in body && { contactoPrincipalId: body.contactoPrincipalId ?? null }),
        score,
      },
      include: {
        oportunidad: { select: { id: true, titulo: true, etapa: true } },
        preProyecto: { select: { id: true, titulo: true } },
        contactoPrincipal: { select: { id: true, nombre: true, cargo: true } },
      },
    })

    // Auto-vincular contacto al pre-proyecto si ambos están presentes
    if ("contactoPrincipalId" in body && body.contactoPrincipalId && updated.preProyectoId) {
      try {
        await db.preProyectoContacto.upsert({
          where: { preProyectoId_contactoId: { preProyectoId: updated.preProyectoId, contactoId: body.contactoPrincipalId } },
          create: { preProyectoId: updated.preProyectoId, contactoId: body.contactoPrincipalId },
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
