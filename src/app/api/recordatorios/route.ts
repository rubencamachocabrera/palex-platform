import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "recordatorios", { limit: 60, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const pendientes = req.nextUrl.searchParams.get("pendientes")

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const where: Record<string, unknown> = { usuarioId: session.user.id }
    if (pendientes === "true") {
      where.completado = false
    }

    const recordatorios = await db.recordatorio.findMany({
      where,
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
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { titulo, descripcion, fecha } = await req.json()

    if (!titulo || typeof titulo !== "string" || !titulo.trim()) {
      return NextResponse.json({ error: "El titulo es obligatorio" }, { status: 400 })
    }

    if (!fecha) {
      return NextResponse.json({ error: "La fecha es obligatoria" }, { status: 400 })
    }

    const fechaParsed = new Date(fecha)
    if (isNaN(fechaParsed.getTime())) {
      return NextResponse.json({ error: "Fecha no valida" }, { status: 400 })
    }

    const recordatorio = await db.recordatorio.create({
      data: {
        titulo: titulo.trim(),
        descripcion: descripcion && typeof descripcion === "string" ? descripcion.trim() : null,
        fecha: fechaParsed,
        usuarioId: session.user.id,
      },
    })

    return NextResponse.json(recordatorio, { status: 201 })
  } catch (err) {
    console.error("[POST /api/recordatorios]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
