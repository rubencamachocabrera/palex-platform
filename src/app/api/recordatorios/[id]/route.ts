import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params

    // Verify ownership
    const existing = await db.recordatorio.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (existing.usuarioId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const body = await req.json()

    // Whitelist
    const data: Record<string, unknown> = {}
    if ("titulo" in body && typeof body.titulo === "string" && body.titulo.trim()) {
      data.titulo = body.titulo.trim()
    }
    if ("descripcion" in body) {
      data.descripcion = body.descripcion && typeof body.descripcion === "string"
        ? body.descripcion.trim()
        : null
    }
    if ("fecha" in body) {
      const f = new Date(body.fecha)
      if (!isNaN(f.getTime())) data.fecha = f
    }
    if ("completado" in body && typeof body.completado === "boolean") {
      data.completado = body.completado
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Sin campos validos para actualizar" }, { status: 400 })
    }

    const updated = await db.recordatorio.update({ where: { id }, data })
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
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params

    // Verify ownership
    const existing = await db.recordatorio.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
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
