import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; solId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { solId } = await params
  try {
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if ("titulo" in body) data.titulo = body.titulo
    if ("estado" in body) data.estado = body.estado
    if ("notas" in body) data.notas = body.notas
    if ("fechaEntregaPlan" in body) data.fechaEntregaPlan = body.fechaEntregaPlan ? new Date(body.fechaEntregaPlan) : null
    if ("fechaEntregaReal" in body) data.fechaEntregaReal = body.fechaEntregaReal ? new Date(body.fechaEntregaReal) : null
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
