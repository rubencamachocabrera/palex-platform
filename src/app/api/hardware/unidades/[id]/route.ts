import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if ("numSerie" in body) data.numSerie = body.numSerie || null
    if ("estado" in body) data.estado = body.estado
    if ("hospitalId" in body) data.hospitalId = body.hospitalId || null
    if ("preProyectoId" in body) data.preProyectoId = body.preProyectoId || null
    if ("fechaCompra" in body) data.fechaCompra = body.fechaCompra ? new Date(body.fechaCompra) : null
    if ("fechaGarantia" in body) data.fechaGarantia = body.fechaGarantia ? new Date(body.fechaGarantia) : null
    if ("proximoMantenimiento" in body) data.proximoMantenimiento = body.proximoMantenimiento ? new Date(body.proximoMantenimiento) : null
    if ("notas" in body) data.notas = body.notas || null
    const updated = await db.hardwareUnidad.update({
      where: { id },
      data,
      include: { catalogo: true },
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  const { id } = await params
  try {
    await db.hardwareUnidad.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
