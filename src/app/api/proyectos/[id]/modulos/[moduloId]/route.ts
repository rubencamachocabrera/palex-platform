import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { parseBody, ModuloPatch } from "@/lib/schemas"

async function checkAccess(id: string, userId: string, role: string) {
  const pp = await db.proyecto.findUnique({ where: { id }, select: { responsableId: true } })
  if (!pp) return { error: "No encontrado", status: 404 }
  if (role !== "ADMIN" && pp.responsableId !== userId)
    return { error: "No autorizado", status: 403 }
  return null
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; moduloId: string }> }
) {
  const rl = checkRateLimit(req as NextRequest, "/api/proyectos/modulos", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, moduloId } = await params
  const role = session.user.role as string
  if (!["ADMIN", "PROYECTOS", "TECNICO"].includes(role))
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  try {
    const denied = await checkAccess(id, session.user.id, role)
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status })

    const body = await req.json()
    const parsed = parseBody(ModuloPatch, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const updated = await db.proyectoModulo.update({
      where: { proyectoId_moduloId: { proyectoId: id, moduloId } },
      data: { estado: parsed.data.estado },
      include: { modulo: { select: { id: true, nombre: true } } },
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; moduloId: string }> }
) {
  const rl = checkRateLimit(_req as NextRequest, "/api/proyectos/modulos", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, moduloId } = await params
  try {
    const denied = await checkAccess(id, session.user.id, session.user.role as string)
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status })

    await db.proyectoModulo.delete({
      where: { proyectoId_moduloId: { proyectoId: id, moduloId } },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
