import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; comentarioId: string }> }) {
  const rl = await checkRateLimit(_req, "/api/proyectos/comentarios", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, comentarioId } = await params
  try {
    const c = await db.comentario.findFirst({ where: { id: comentarioId, proyectoId: id }, select: { autorId: true } })
    if (!c) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session.user.role !== "ADMIN" && c.autorId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    await db.comentario.delete({ where: { id: comentarioId } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
