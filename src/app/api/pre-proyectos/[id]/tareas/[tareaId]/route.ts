import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; tareaId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, tareaId } = await params
  try {
    const pp = await db.preProyecto.findUnique({ where: { id }, select: { responsableId: true } })
    if (!pp) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session?.user?.role !== "ADMIN" && pp.responsableId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const tarea = await db.tarea.findFirst({ where: { id: tareaId, preProyectoId: id }, select: { id: true } })
    if (!tarea) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    const body = await req.json()
    const data: Record<string, unknown> = {}
    const allowed = ["titulo", "descripcion", "estado", "prioridad", "asignadoA", "fechaVencimiento", "orden"]
    for (const k of allowed) {
      if (k in body) {
        data[k] = k === "fechaVencimiento"
          ? (body[k] ? new Date(body[k]) : null)
          : body[k]
      }
    }
    if (body.estado === "COMPLETADA") data.fechaCompletada = new Date()
    else if (body.estado && body.estado !== "COMPLETADA") data.fechaCompletada = null

    const updated = await db.tarea.update({ where: { id: tareaId }, data })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; tareaId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, tareaId } = await params
  try {
    const pp = await db.preProyecto.findUnique({ where: { id }, select: { responsableId: true } })
    if (!pp) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session?.user?.role !== "ADMIN" && pp.responsableId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const result = await db.tarea.deleteMany({ where: { id: tareaId, preProyectoId: id } })
    if (result.count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
