import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; entradaId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, entradaId } = await params
  try {
    const pp = await db.preProyecto.findUnique({ where: { id }, select: { responsableId: true } })
    if (!pp) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session?.user?.role !== "ADMIN" && pp.responsableId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const entrada = await db.entradaTimeline.findFirst({ where: { id: entradaId, preProyectoId: id }, select: { id: true } })
    if (!entrada) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    const body = await req.json()
    const data: Record<string, unknown> = {}
    if ("titulo" in body) data.titulo = body.titulo
    if ("contenido" in body) data.contenido = body.contenido || null
    if ("fechaCita" in body) data.fechaCita = body.fechaCita ? new Date(body.fechaCita) : null
    if ("personaCita" in body) data.personaCita = body.personaCita || null
    if ("fechaEntrada" in body) data.fechaEntrada = body.fechaEntrada ? new Date(body.fechaEntrada) : undefined
    if ("lugarCita" in body) data.lugarCita = body.lugarCita || null
    if ("motivoCita" in body) data.motivoCita = body.motivoCita || null
    if ("importanciaCita" in body) data.importanciaCita = body.importanciaCita ? Number(body.importanciaCita) : null
    const updated = await db.entradaTimeline.update({ where: { id: entradaId }, data })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; entradaId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, entradaId } = await params
  try {
    const pp = await db.preProyecto.findUnique({ where: { id }, select: { responsableId: true } })
    if (!pp) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session?.user?.role !== "ADMIN" && pp.responsableId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const result = await db.entradaTimeline.deleteMany({ where: { id: entradaId, preProyectoId: id } })
    if (result.count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
