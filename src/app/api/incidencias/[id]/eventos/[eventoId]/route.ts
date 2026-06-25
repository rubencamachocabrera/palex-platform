import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { parseBody, EventoIncidenciaPatch } from "@/lib/schemas"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; eventoId: string }> },
) {
  try {
    const rl = checkRateLimit(req, "incidencias-eventos-patch", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id, eventoId } = await params
    const body = await req.json()
    const parsed = parseBody(EventoIncidenciaPatch, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const evento = await db.eventoIncidencia.findFirst({
      where: { id: eventoId, incidenciaId: id },
      select: { id: true, autorId: true },
    })
    if (!evento) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 })

    if (evento.autorId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Solo puedes editar tus propios eventos" }, { status: 403 })
    }

    const updated = await db.eventoIncidencia.update({
      where: { id: eventoId },
      data: {
        ...parsed.data,
        editadoPor: session.user.name ?? session.user.id,
        editadoEn: new Date(),
      },
      include: { autor: { select: { id: true, nombre: true } } },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error("[PATCH /api/incidencias/[id]/eventos/[eventoId]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
