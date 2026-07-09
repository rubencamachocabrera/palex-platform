import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = await checkRateLimit(_req, "/api/proyectos/comentarios")
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const pp = await db.proyecto.findUnique({ where: { id }, select: { responsableId: true } })
    if (!pp) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session.user.role !== "ADMIN" && pp.responsableId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const comentarios = await db.comentario.findMany({ where: { proyectoId: id }, orderBy: { creadoEn: "asc" } })
    return NextResponse.json(comentarios)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = await checkRateLimit(req, "/api/proyectos/comentarios", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const pp = await db.proyecto.findUnique({ where: { id }, select: { responsableId: true } })
    if (!pp) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session.user.role !== "ADMIN" && pp.responsableId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const { contenido, fotos, mencionIds } = await req.json()
    if (!contenido?.trim()) return NextResponse.json({ error: "Contenido requerido" }, { status: 400 })
    const fotosArr = Array.isArray(fotos) ? fotos.slice(0, 2) : []
    const menciones = Array.isArray(mencionIds) ? mencionIds.filter((id: unknown) => typeof id === "string") : []
    const usuario = await db.usuario.findUnique({ where: { id: session.user.id }, select: { nombre: true } })
    const comentario = await db.comentario.create({
      data: {
        proyectoId: id,
        autorId: session.user.id,
        autorNombre: usuario?.nombre ?? "Usuario",
        contenido: contenido.trim(),
        fotos: fotosArr,
        mencionIds: menciones,
      },
    })
    return NextResponse.json(comentario, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
