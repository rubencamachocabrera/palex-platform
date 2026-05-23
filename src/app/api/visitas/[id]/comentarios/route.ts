import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const visita = await db.visita.findUnique({ where: { id }, select: { id: true } })
    if (!visita) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    const comentarios = await db.comentario.findMany({ where: { visitaId: id }, orderBy: { creadoEn: "asc" } })
    return NextResponse.json(comentarios)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const visita = await db.visita.findUnique({ where: { id }, select: { id: true } })
    if (!visita) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    const { contenido } = await req.json()
    if (!contenido?.trim()) return NextResponse.json({ error: "Contenido requerido" }, { status: 400 })
    const usuario = await db.usuario.findUnique({ where: { id: session.user.id }, select: { nombre: true } })
    const comentario = await db.comentario.create({
      data: { visitaId: id, autorId: session.user.id, autorNombre: usuario?.nombre ?? "Usuario", contenido: contenido.trim() },
    })
    return NextResponse.json(comentario, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
