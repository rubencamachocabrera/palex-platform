import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; hitoId: string }> }
) {
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
    const data: Record<string, unknown> = {}
    if ("titulo" in body) data.titulo = body.titulo
    if ("descripcion" in body) data.descripcion = body.descripcion
    if ("fecha" in body) data.fecha = body.fecha ? new Date(body.fecha) : undefined
    if ("fechaReal" in body) data.fechaReal = body.fechaReal ? new Date(body.fechaReal) : null
    if ("completado" in body) data.completado = body.completado
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
