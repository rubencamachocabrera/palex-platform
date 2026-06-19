import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

async function canAccessVisita(userId: string, role: string, visita: { usuarioId: string; hospitalId?: string }) {
  if (role === "ADMIN") return true
  if (visita.usuarioId === userId) return true
  if (!visita.hospitalId) return false
  const zoneAccess = await db.hospital.findFirst({
    where: { id: visita.hospitalId, zona: { usuarios: { some: { usuarioId: userId } } } },
    select: { id: true },
  })
  return !!zoneAccess
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const visita = await db.visita.findUnique({ where: { id }, select: { id: true, usuarioId: true, hospitalId: true } })
    if (!visita) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (!await canAccessVisita(session.user.id, session.user.role as string, visita))
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
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
    const visita = await db.visita.findUnique({ where: { id }, select: { id: true, usuarioId: true, hospitalId: true } })
    if (!visita) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (!await canAccessVisita(session.user.id, session.user.role as string, visita))
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    const { contenido, fotos } = await req.json()
    if (!contenido?.trim()) return NextResponse.json({ error: "Contenido requerido" }, { status: 400 })
    const fotosArr = Array.isArray(fotos) ? fotos.slice(0, 2) : []
    const usuario = await db.usuario.findUnique({ where: { id: session.user.id }, select: { nombre: true } })
    const comentario = await db.comentario.create({
      data: { visitaId: id, autorId: session.user.id, autorNombre: usuario?.nombre ?? "Usuario", contenido: contenido.trim(), fotos: fotosArr },
    })
    return NextResponse.json(comentario, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
