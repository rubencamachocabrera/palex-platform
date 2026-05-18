import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "proyectos", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const proyectos = await db.proyecto.findMany({
      include: {
        hospital: { select: { id: true, nombre: true, ciudad: true } },
        modulos: { include: { modulo: { select: { id: true, nombre: true } } } },
      },
      orderBy: { creadoEn: "desc" },
    })
    const res = NextResponse.json(proyectos)
    res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60")
    return res
  } catch (err) {
    console.error("[GET /api/proyectos]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "proyectos", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const rol = session.user.role
    if (rol !== "ADMIN" && rol !== "PROYECTOS") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const body = await req.json()
    const { nombre, hospitalId, fechaInicio, fechaFin, refConcurso, moduloIds } = body
    if (!nombre || !hospitalId || !fechaInicio) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })
    }

    const proyecto = await db.proyecto.create({
      data: {
        nombre,
        hospitalId,
        fechaInicio: new Date(fechaInicio),
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        refConcurso: refConcurso || null,
        modulos: moduloIds?.length
          ? { create: (moduloIds as string[]).map((id: string) => ({ moduloId: id })) }
          : undefined,
      },
      include: {
        hospital: { select: { id: true, nombre: true, ciudad: true } },
        modulos: { include: { modulo: { select: { id: true, nombre: true } } } },
      },
    })
    return NextResponse.json(proyecto, { status: 201 })
  } catch (err) {
    console.error("[POST /api/proyectos]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
