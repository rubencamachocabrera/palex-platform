import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; tareaId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { tareaId } = await params
  try {
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
  const { tareaId } = await params
  try {
    await db.tarea.delete({ where: { id: tareaId } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
