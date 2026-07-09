import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { parseBody, SolicitudPatch } from "@/lib/schemas"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; solId: string }> }
) {
  const rl = await checkRateLimit(req as NextRequest, "/api/proyectos/solicitudes", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { solId } = await params
  try {
    const body = await req.json()
    const parsed = parseBody(SolicitudPatch, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const d = parsed.data
    const data: Record<string, unknown> = {}
    if ("titulo" in d) data.titulo = d.titulo
    if ("estado" in d) data.estado = d.estado
    if ("notas" in d) data.notas = d.notas
    if ("fechaEntregaPlan" in d) data.fechaEntregaPlan = d.fechaEntregaPlan ? new Date(d.fechaEntregaPlan) : null
    if ("fechaEntregaReal" in d) data.fechaEntregaReal = d.fechaEntregaReal ? new Date(d.fechaEntregaReal) : null
    const updated = await db.solicitudMaterial.update({ where: { id: solId }, data })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; solId: string }> }
) {
  const rl = await checkRateLimit(_req as NextRequest, "/api/proyectos/solicitudes", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { solId } = await params
  try {
    await db.solicitudMaterial.delete({ where: { id: solId } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
