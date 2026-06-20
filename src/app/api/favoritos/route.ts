import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "favoritos", { limit: 60, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const tipo = req.nextUrl.searchParams.get("tipo")
    const where: Record<string, unknown> = { usuarioId: session.user.id }
    if (tipo === "HOSPITAL" || tipo === "PROYECTO") {
      where.tipo = tipo
    }

    const favoritos = await db.favorito.findMany({
      where,
      select: { id: true, entidadId: true, tipo: true, creadoEn: true },
      orderBy: { creadoEn: "desc" },
    })

    const res = NextResponse.json(favoritos)
    res.headers.set("Cache-Control", "private, no-store")
    return res
  } catch (err) {
    console.error("[GET /api/favoritos]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { entidadId, tipo } = await req.json()

    if (!entidadId || typeof entidadId !== "string")
      return NextResponse.json({ error: "entidadId requerido" }, { status: 400 })
    if (tipo !== "HOSPITAL" && tipo !== "PROYECTO")
      return NextResponse.json({ error: "tipo debe ser HOSPITAL o PROYECTO" }, { status: 400 })

    const userId = session.user.id

    // Toggle: si existe, eliminar; si no, crear
    const existing = await db.favorito.findUnique({
      where: { usuarioId_entidadId_tipo: { usuarioId: userId, entidadId, tipo } },
    })

    if (existing) {
      await db.favorito.delete({ where: { id: existing.id } })
      return NextResponse.json({ favorito: false })
    }

    await db.favorito.create({
      data: { usuarioId: userId, entidadId, tipo },
    })
    return NextResponse.json({ favorito: true })
  } catch (err) {
    console.error("[POST /api/favoritos]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
