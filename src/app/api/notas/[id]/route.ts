import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { z } from "zod"
import { parseBody } from "@/lib/schemas"

const NotaPatch = z.object({
  texto: z.string().min(1).max(5000).optional(),
  fijada: z.boolean().optional(),
  mencionIds: z.array(z.string().min(1).max(100)).max(20).optional(),
}).refine(o => Object.keys(o).length > 0, { message: "Sin campos" })

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await checkRateLimit(req, "notas-patch", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const nota = await db.notaEquipo.findUnique({ where: { id }, select: { autorId: true } })
    if (!nota) return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 })
    if (nota.autorId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
    }

    const body = await req.json()
    const parsed = parseBody(NotaPatch, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const updated = await db.notaEquipo.update({
      where: { id },
      data: parsed.data,
      include: { autor: { select: { id: true, nombre: true, rol: true } } },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error("[PATCH /api/notas/[id]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await checkRateLimit(req, "notas-delete", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const nota = await db.notaEquipo.findUnique({ where: { id }, select: { autorId: true } })
    if (!nota) return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 })
    if (nota.autorId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
    }

    await db.notaEquipo.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/notas/[id]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
