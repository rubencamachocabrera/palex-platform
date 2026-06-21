import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { parseBody, EntradaCreate } from "@/lib/schemas"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = checkRateLimit(req as NextRequest, "/api/proyectos/entradas")
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
    const entradas = await db.entradaTimeline.findMany({
      where: { proyectoId: id },
      orderBy: { fechaEntrada: "asc" },
    })
    return NextResponse.json(entradas)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = checkRateLimit(req as NextRequest, "/api/proyectos/entradas", { limit: 30 })
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
    const parsed = parseBody(EntradaCreate, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const d = parsed.data
    if (!d.titulo && d.tipo !== "COMENTARIO") {
      return NextResponse.json({ error: "Falta el título" }, { status: 400 })
    }
    const autor = (session.user as { name?: string; email?: string }).name || session.user.email || "Usuario"
    const entrada = await db.entradaTimeline.create({
      data: {
        proyectoId: id,
        tipo: d.tipo,
        titulo: d.titulo || "Nota",
        contenido: d.contenido || null,
        fechaCita: d.fechaCita ? new Date(d.fechaCita) : null,
        personaCita: d.personaCita || null,
        lugarCita: d.lugarCita || null,
        motivoCita: d.motivoCita || null,
        importanciaCita: d.importanciaCita ?? null,
        fechaEntrada: d.fechaEntrada ? new Date(d.fechaEntrada) : undefined,
        autor,
      },
    })
    return NextResponse.json(entrada, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
