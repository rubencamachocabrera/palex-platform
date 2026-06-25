import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "respuestas-rapidas", { limit: 60, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const respuestas = await db.respuestaRapidaIncidencia.findMany({
      where: { activo: true },
      orderBy: [{ categoria: "asc" }, { orden: "asc" }],
    })

    return NextResponse.json(respuestas)
  } catch (err) {
    console.error("[GET /api/incidencias/respuestas-rapidas]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "respuestas-rapidas-post", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const body = await req.json()
    const { texto, categoria, orden } = body as { texto?: string; categoria?: string; orden?: number }

    if (!texto || texto.trim().length < 3) {
      return NextResponse.json({ error: "Texto requerido (mínimo 3 caracteres)" }, { status: 400 })
    }

    const respuesta = await db.respuestaRapidaIncidencia.create({
      data: { texto: texto.trim(), categoria: categoria?.trim() || null, orden: orden ?? 0 },
    })

    return NextResponse.json(respuesta, { status: 201 })
  } catch (err) {
    console.error("[POST /api/incidencias/respuestas-rapidas]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "respuestas-rapidas-del", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const { searchParams } = req.nextUrl
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

    await db.respuestaRapidaIncidencia.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/incidencias/respuestas-rapidas]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
