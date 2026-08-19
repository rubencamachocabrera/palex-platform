import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await checkRateLimit(req as NextRequest, "/api/hardware/unidades/[id]", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const body = await req.json()
    const ESTADOS_VALIDOS = ["DISPONIBLE", "ASIGNADO", "EN_MANTENIMIENTO", "RETIRADO", "BAJA"]
    if ("estado" in body && !ESTADOS_VALIDOS.includes(body.estado)) {
      return NextResponse.json({ error: `estado invalido: ${body.estado}` }, { status: 400 })
    }
    const data: Record<string, unknown> = {}
    if ("numSerie" in body) data.numSerie = body.numSerie || null
    if ("estado" in body) data.estado = body.estado
    if ("hospitalId" in body) data.hospitalId = body.hospitalId || null
    if ("proyectoId" in body) data.proyectoId = body.proyectoId || null
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
  const rl = await checkRateLimit(_req as NextRequest, "/api/hardware/unidades/[id]", { limit: 30 })
  if (rl) return rl
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
