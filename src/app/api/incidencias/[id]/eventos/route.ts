import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { parseBody, EventoIncidenciaCreate } from "@/lib/schemas"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = checkRateLimit(req, "incidencias-eventos", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const parsed = parseBody(EventoIncidenciaCreate, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const where: Record<string, unknown> = { id }
    if (session.user.role !== "ADMIN") {
      where.hospital = { zona: { usuarios: { some: { usuarioId: session.user.id } } } }
    }

    const incidencia = await db.incidencia.findFirst({ where, select: { id: true } })
    if (!incidencia) return NextResponse.json({ error: "Incidencia no encontrada" }, { status: 404 })

    const evento = await db.eventoIncidencia.create({
      data: {
        ...parsed.data,
        incidenciaId: id,
        autorId: session.user.id,
      },
      include: {
        autor: { select: { id: true, nombre: true } },
      },
    })

    return NextResponse.json(evento, { status: 201 })
  } catch (err) {
    console.error("[POST /api/incidencias/[id]/eventos]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
