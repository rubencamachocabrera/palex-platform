import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; entradaId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { entradaId } = await params
  try {
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if ("titulo" in body) data.titulo = body.titulo
    if ("contenido" in body) data.contenido = body.contenido || null
    if ("fechaCita" in body) data.fechaCita = body.fechaCita ? new Date(body.fechaCita) : null
    if ("personaCita" in body) data.personaCita = body.personaCita || null
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
  const { entradaId } = await params
  try {
    await db.entradaTimeline.delete({ where: { id: entradaId } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
