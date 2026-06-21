import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = checkRateLimit(_req as NextRequest, "/api/hardware/[id]/docs")
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const docs = await db.hardwareCatalogoDoc.findMany({
      where: { catalogoId: id },
      select: { id: true, nombre: true, tipo: true, tamano: true, creadoEn: true },
      orderBy: { creadoEn: "desc" },
    })
    return NextResponse.json(docs)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = checkRateLimit(req as NextRequest, "/api/hardware/[id]/docs", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  const { id } = await params
  try {
    const body = await req.json()
    if (!body.nombre || !body.tipo || !body.contenido) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })
    }
    const catalogo = await db.hardwareCatalogo.findUnique({ where: { id }, select: { id: true } })
    if (!catalogo) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    const doc = await db.hardwareCatalogoDoc.create({
      data: {
        catalogoId: id,
        nombre: body.nombre,
        tipo: body.tipo,
        tamano: body.tamano ?? 0,
        contenido: body.contenido,
      },
      select: { id: true, nombre: true, tipo: true, tamano: true, creadoEn: true },
    })
    return NextResponse.json(doc, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
