import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { parseBody, FiltroGuardadoCreate } from "@/lib/schemas"

export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "filtros-guardados", { limit: 60, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const entidad = req.nextUrl.searchParams.get("entidad")

    const filtros = await db.filtroGuardado.findMany({
      where: { usuarioId: session.user.id, ...(entidad ? { entidad } : {}) },
      orderBy: { creadoEn: "desc" },
    })

    return NextResponse.json(filtros)
  } catch (err) {
    console.error("[GET /api/filtros-guardados]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "filtros-guardados-post", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const parsed = parseBody(FiltroGuardadoCreate, await req.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { entidad, nombre, filtros } = parsed.data

    const existente = await db.filtroGuardado.findUnique({
      where: { usuarioId_entidad_nombre: { usuarioId: session.user.id, entidad, nombre } },
    })
    if (existente) return NextResponse.json({ error: "Ya existe un filtro guardado con ese nombre" }, { status: 409 })

    const creado = await db.filtroGuardado.create({
      data: { usuarioId: session.user.id, entidad, nombre, filtros },
    })

    return NextResponse.json(creado, { status: 201 })
  } catch (err) {
    console.error("[POST /api/filtros-guardados]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
