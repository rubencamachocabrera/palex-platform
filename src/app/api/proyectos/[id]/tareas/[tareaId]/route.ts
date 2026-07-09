import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { parseBody, TareaPatch } from "@/lib/schemas"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; tareaId: string }> }) {
  const rl = await checkRateLimit(req as NextRequest, "/api/proyectos/tareas", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, tareaId } = await params
  try {
    const pp = await db.proyecto.findUnique({ where: { id }, select: { responsableId: true } })
    if (!pp) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session?.user?.role !== "ADMIN" && pp.responsableId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const tarea = await db.tarea.findFirst({ where: { id: tareaId, proyectoId: id }, select: { id: true } })
    if (!tarea) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    const body = await req.json()
    const parsed = parseBody(TareaPatch, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const data: Record<string, unknown> = {}
    const d = parsed.data
    if ("titulo" in d) data.titulo = d.titulo
    if ("descripcion" in d) data.descripcion = d.descripcion
    if ("estado" in d) data.estado = d.estado
    if ("prioridad" in d) data.prioridad = d.prioridad
    if ("asignadoA" in d) data.asignadoA = d.asignadoA
    if ("asignadoAId" in d) data.asignadoAId = d.asignadoAId
    if ("fechaVencimiento" in d) data.fechaVencimiento = d.fechaVencimiento ? new Date(d.fechaVencimiento) : null
    if ("orden" in d) data.orden = d.orden
    if (d.estado === "COMPLETADA") data.fechaCompletada = new Date()
    else if (d.estado !== undefined) data.fechaCompletada = null

    const updated = await db.tarea.update({ where: { id: tareaId }, data })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; tareaId: string }> }) {
  const rl = await checkRateLimit(_req as NextRequest, "/api/proyectos/tareas", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, tareaId } = await params
  try {
    const pp = await db.proyecto.findUnique({ where: { id }, select: { responsableId: true } })
    if (!pp) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session?.user?.role !== "ADMIN" && pp.responsableId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const result = await db.tarea.deleteMany({ where: { id: tareaId, proyectoId: id } })
    if (result.count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
