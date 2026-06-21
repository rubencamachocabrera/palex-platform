import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { parseBody, TareaCreate } from "@/lib/schemas"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = checkRateLimit(req as NextRequest, "/api/proyectos/tareas")
  if (rl) return rl
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
      include: { asignado: { select: { id: true, nombre: true } } },
      orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
    })
    return NextResponse.json(tareas)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = checkRateLimit(req as NextRequest, "/api/proyectos/tareas", { limit: 30 })
  if (rl) return rl
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
    const parsed = parseBody(TareaCreate, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const tarea = await db.tarea.create({
      data: {
        proyectoId: id,
        titulo: parsed.data.titulo.trim(),
        descripcion: parsed.data.descripcion ?? null,
        estado: parsed.data.estado,
        prioridad: parsed.data.prioridad,
        asignadoA: parsed.data.asignadoA ?? null,
        asignadoAId: parsed.data.asignadoAId ?? null,
        parentId: parsed.data.parentId ?? null,
        fechaVencimiento: parsed.data.fechaVencimiento ? new Date(parsed.data.fechaVencimiento) : null,
        orden: parsed.data.orden,
      },
    })
    return NextResponse.json(tarea, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
