import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { parseBody, ContactoPivot } from "@/lib/schemas"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await checkRateLimit(req as NextRequest, "/api/proyectos/contactos", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const pp = await db.proyecto.findUnique({ where: { id }, select: { responsableId: true } })
    if (!pp) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session.user.role !== "ADMIN" && pp.responsableId !== session.user.id)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    const body = await req.json()
    const parsed = parseBody(ContactoPivot, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { contactoId } = parsed.data
    await db.proyectoContacto.upsert({
      where: { proyectoId_contactoId: { proyectoId: id, contactoId } },
      create: { proyectoId: id, contactoId },
      update: {},
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await checkRateLimit(req as NextRequest, "/api/proyectos/contactos", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const pp = await db.proyecto.findUnique({ where: { id }, select: { responsableId: true } })
    if (!pp) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session.user.role !== "ADMIN" && pp.responsableId !== session.user.id)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    const body = await req.json()
    const parsed = parseBody(ContactoPivot, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { contactoId } = parsed.data
    await db.proyectoContacto.delete({
      where: { proyectoId_contactoId: { proyectoId: id, contactoId } },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
