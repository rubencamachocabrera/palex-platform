import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await checkRateLimit(req as NextRequest, "/api/hardware/tipos/[id]", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  const { id } = await params
  try {
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if ("nombre" in body && body.nombre?.trim()) data.nombre = body.nombre.trim()
    if ("color" in body) data.color = body.color
    if ("orden" in body) data.orden = body.orden
    if ("activo" in body) data.activo = body.activo
    const updated = await db.hardwareTipo.update({
      where: { id },
      data,
      include: { _count: { select: { catalogos: true } } },
    })
    return NextResponse.json(updated)
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002")
      return NextResponse.json({ error: "Ya existe un tipo con ese nombre" }, { status: 409 })
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await checkRateLimit(_req as NextRequest, "/api/hardware/tipos/[id]", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  const { id } = await params
  try {
    const count = await db.hardwareCatalogo.count({ where: { tipoId: id } })
    if (count > 0) return NextResponse.json({ error: `No se puede eliminar: ${count} materiales usan este tipo` }, { status: 409 })
    await db.hardwareTipo.update({ where: { id }, data: { activo: false } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
