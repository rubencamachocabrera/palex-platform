import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { parseBody, HitoPatch } from "@/lib/schemas"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; hitoId: string }> }
) {
  const rl = checkRateLimit(req as NextRequest, "/api/proyectos/hitos", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, hitoId } = await params
  try {
    const pp = await db.proyecto.findUnique({ where: { id }, select: { responsableId: true } })
    if (!pp) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session?.user?.role !== "ADMIN" && pp.responsableId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const hito = await db.hito.findFirst({ where: { id: hitoId, proyectoId: id }, select: { id: true } })
    if (!hito) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    const body = await req.json()
    const parsed = parseBody(HitoPatch, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const d = parsed.data
    const data: Record<string, unknown> = {}
    if ("titulo" in d) data.titulo = d.titulo
    if ("descripcion" in d) data.descripcion = d.descripcion
    if ("fecha" in d) data.fecha = d.fecha ? new Date(d.fecha) : undefined
    if ("fechaReal" in d) data.fechaReal = d.fechaReal ? new Date(d.fechaReal) : null
    if ("completado" in d) data.completado = d.completado
    const updated = await db.hito.update({ where: { id: hitoId }, data })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; hitoId: string }> }
) {
  const rl = checkRateLimit(_req as NextRequest, "/api/proyectos/hitos", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, hitoId } = await params
  try {
    const pp = await db.proyecto.findUnique({ where: { id }, select: { responsableId: true } })
    if (!pp) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session?.user?.role !== "ADMIN" && pp.responsableId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const result = await db.hito.deleteMany({ where: { id: hitoId, proyectoId: id } })
    if (result.count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
