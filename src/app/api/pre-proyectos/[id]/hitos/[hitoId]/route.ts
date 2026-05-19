import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; hitoId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { hitoId } = await params
  try {
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
  const { hitoId } = await params
  try {
    await db.hito.delete({ where: { id: hitoId } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
