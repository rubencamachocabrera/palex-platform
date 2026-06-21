import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; adjuntoId: string }> }
) {
  const rl = checkRateLimit(_req as NextRequest, "/api/proyectos/adjuntos")
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, adjuntoId } = await params
  try {
    const pp = await db.proyecto.findUnique({ where: { id }, select: { responsableId: true } })
    if (!pp) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session?.user?.role !== "ADMIN" && pp.responsableId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const adj = await db.adjunto.findFirst({ where: { id: adjuntoId, proyectoId: id } })
    if (!adj) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    const buffer = Buffer.from(adj.contenido, "base64")
    return new Response(buffer, {
      headers: {
        "Content-Type": adj.tipo,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(adj.nombre)}"`,
        "Content-Length": String(buffer.length),
      },
    })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; adjuntoId: string }> }
) {
  const rl = checkRateLimit(_req as NextRequest, "/api/proyectos/adjuntos", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, adjuntoId } = await params
  try {
    const pp = await db.proyecto.findUnique({ where: { id }, select: { responsableId: true } })
    if (!pp) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session?.user?.role !== "ADMIN" && pp.responsableId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const result = await db.adjunto.deleteMany({ where: { id: adjuntoId, proyectoId: id } })
    if (result.count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
