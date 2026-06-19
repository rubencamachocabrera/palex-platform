import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const pp = await db.proyecto.findUnique({ where: { id }, select: { responsableId: true } })
    if (!pp) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session?.user?.role !== "ADMIN" && pp.responsableId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const tareas = await db.tarea.findMany({
      where: { proyectoId: id },
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
    const pp = await db.proyecto.findUnique({ where: { id }, select: { responsableId: true } })
    if (!pp) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session?.user?.role !== "ADMIN" && pp.responsableId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const body = await req.json()
    if (!body.titulo?.trim()) return NextResponse.json({ error: "Título requerido" }, { status: 400 })
    const tarea = await db.tarea.create({
      data: {
        proyectoId: id,
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
