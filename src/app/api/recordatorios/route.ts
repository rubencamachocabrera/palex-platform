import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { RecordatorioCreate, parseBody } from "@/lib/schemas"

const SELECT = {
  id: true, titulo: true, descripcion: true, fecha: true, completado: true, creadoEn: true,
  usuarioId: true,
  asignadoAId: true,
  usuario:    { select: { id: true, nombre: true } },
  asignadoA:  { select: { id: true, nombre: true } },
}

export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "recordatorios", { limit: 60, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const uid = session.user.id
    const pendientes = req.nextUrl.searchParams.get("pendientes")

    const completadoFilter = pendientes === "true" ? { completado: false } : {}

    const recordatorios = await db.recordatorio.findMany({
      where: {
        OR: [
          { usuarioId: uid },
          { asignadoAId: uid },
        ],
        ...completadoFilter,
      },
      select: SELECT,
      orderBy: { fecha: "asc" },
    })

    const res = NextResponse.json(recordatorios)
    res.headers.set("Cache-Control", "private, max-age=30")
    return res
  } catch (err) {
    console.error("[GET /api/recordatorios]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "recordatorios-post", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const parsed = parseBody(RecordatorioCreate, await req.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { titulo, descripcion, fecha, asignadoAId } = parsed.data

    // Verify assignee exists if provided
    if (asignadoAId) {
      const user = await db.usuario.findUnique({ where: { id: asignadoAId }, select: { id: true } })
      if (!user) return NextResponse.json({ error: "Usuario asignado no encontrado" }, { status: 400 })
    }

    const recordatorio = await db.recordatorio.create({
      data: {
        titulo: titulo.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        fecha: new Date(fecha),
        usuarioId: session.user.id,
        asignadoAId: asignadoAId ?? null,
      },
      select: SELECT,
    })

    return NextResponse.json(recordatorio, { status: 201 })
  } catch (err) {
    console.error("[POST /api/recordatorios]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
