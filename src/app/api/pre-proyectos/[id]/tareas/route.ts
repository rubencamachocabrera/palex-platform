import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const tareas = await db.tarea.findMany({
      where: { preProyectoId: id },
      orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
    })
    return NextResponse.json(tareas)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const body = await req.json()
    if (!body.titulo?.trim()) return NextResponse.json({ error: "Título requerido" }, { status: 400 })
    const tarea = await db.tarea.create({
      data: {
        preProyectoId: id,
        titulo: body.titulo.trim(),
        descripcion: body.descripcion ?? null,
        estado: body.estado ?? "PENDIENTE",
        prioridad: body.prioridad ?? "MEDIA",
        asignadoA: body.asignadoA ?? null,
        parentId: body.parentId ?? null,
        fechaVencimiento: body.fechaVencimiento ? new Date(body.fechaVencimiento) : null,
        orden: body.orden ?? 0,
      },
    })
    return NextResponse.json(tarea, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
