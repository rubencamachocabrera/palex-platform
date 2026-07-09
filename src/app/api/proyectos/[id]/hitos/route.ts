import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { parseBody, HitoCreate } from "@/lib/schemas"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await checkRateLimit(req as NextRequest, "/api/proyectos/hitos", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const pp = await db.proyecto.findUnique({ where: { id }, select: { responsableId: true } })
    if (!pp) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session?.user?.role !== "ADMIN" && pp.responsableId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const body = await req.json()
    const parsed = parseBody(HitoCreate, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const hito = await db.hito.create({
      data: {
        proyectoId: id,
        titulo: parsed.data.titulo,
        descripcion: parsed.data.descripcion ?? null,
        fecha: new Date(parsed.data.fecha),
      },
    })
    return NextResponse.json(hito, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
