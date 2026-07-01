import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { parseBody, RecordatorioPatch } from "@/lib/schemas"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = checkRateLimit(req, "/api/recordatorios/id", { limit: 30 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const uid = session.user.id

    const existing = await db.recordatorio.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    const isOwner = existing.usuarioId === uid
    const isAssignee = existing.asignadoAId === uid

    if (!isOwner && !isAssignee) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const body = await req.json()
    const parsed = parseBody(RecordatorioPatch, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const data: Record<string, unknown> = {}

    // Only owner can edit titulo, descripcion, fecha, asignadoAId
    if (isOwner) {
      if ("titulo" in parsed.data && parsed.data.titulo) data.titulo = parsed.data.titulo.trim()
      if ("descripcion" in parsed.data) data.descripcion = parsed.data.descripcion?.trim() || null
      if ("fecha" in parsed.data && parsed.data.fecha) {
        const f = new Date(parsed.data.fecha)
        if (!isNaN(f.getTime())) data.fecha = f
      }
      if ("asignadoAId" in parsed.data) {
        const aid = parsed.data.asignadoAId
        if (aid === null || aid === "") {
          data.asignadoAId = null
        } else if (typeof aid === "string") {
          const user = await db.usuario.findUnique({ where: { id: aid }, select: { id: true } })
          if (!user) return NextResponse.json({ error: "Usuario asignado no encontrado" }, { status: 400 })
          data.asignadoAId = aid
        }
      }
    }

    // Both owner and assignee can toggle completado
    if ("completado" in parsed.data && typeof parsed.data.completado === "boolean") {
      data.completado = parsed.data.completado
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Sin campos validos para actualizar" }, { status: 400 })
    }

    const updated = await db.recordatorio.update({
      where: { id },
      data,
      select: {
        id: true, titulo: true, descripcion: true, fecha: true, completado: true, creadoEn: true,
        usuarioId: true, asignadoAId: true,
        usuario:   { select: { id: true, nombre: true } },
        asignadoA: { select: { id: true, nombre: true } },
      },
    })
    return NextResponse.json(updated)
  } catch (err) {
    console.error("[PATCH /api/recordatorios/[id]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = checkRateLimit(req, "/api/recordatorios/id", { limit: 30 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const existing = await db.recordatorio.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    // Only owner can delete
    if (existing.usuarioId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    await db.recordatorio.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/recordatorios/[id]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
