import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "visitas", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const rol = session.user.role
    const userId = session.user.id

    const desde = req.nextUrl.searchParams.get("desde")
    const hasta = req.nextUrl.searchParams.get("hasta")
    const fechaFilter = desde && hasta ? {
      fecha: { gte: new Date(desde + "T00:00:00"), lte: new Date(hasta + "T23:59:59") }
    } : {}

    const usePagination = !desde && !hasta
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50"), 200)
    const page = Math.max(parseInt(req.nextUrl.searchParams.get("page") ?? "1"), 1)
    const skip = usePagination ? (page - 1) * limit : undefined
    const take = usePagination ? limit : undefined

    const where = {
      ...(rol === "ADMIN" ? {} : { usuarioId: userId }),
      ...fechaFilter,
    }

    const [visitas, total] = usePagination
      ? await Promise.all([
          db.visita.findMany({
            where, take, skip,
            select: {
              id: true, estado: true, tipo: true, fecha: true, creadoEn: true, editadoEn: true,
              hospital: { select: { id: true, nombre: true, ciudad: true, zona: { select: { nombre: true } } } },
              usuario: { select: { id: true, nombre: true, rol: true } },
            },
            orderBy: { fecha: "desc" },
          }),
          db.visita.count({ where }),
        ])
      : [
          await db.visita.findMany({
            where,
            select: {
              id: true, estado: true, tipo: true, fecha: true, creadoEn: true, editadoEn: true,
              hospital: { select: { id: true, nombre: true, ciudad: true, zona: { select: { nombre: true } } } },
              usuario: { select: { id: true, nombre: true, rol: true } },
            },
            orderBy: { fecha: "desc" },
          }),
          0,
        ]

    const res = NextResponse.json(visitas)
    res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=30")
    if (usePagination) res.headers.set("X-Total-Count", String(total))
    return res
  } catch (err) {
    console.error("[GET]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "visitas", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { hospitalId, tipo, fecha, datos, preProyectoId } = await req.json()
    if (!hospitalId || !tipo) return NextResponse.json({ error: "Faltan campos" }, { status: 400 })

    const visita = await db.visita.create({
      data: {
        hospitalId,
        usuarioId: session.user.id,
        tipo,
        estado: "BORRADOR",
        datos: datos && typeof datos === "object" ? datos : {},
        ...(fecha ? { fecha: new Date(fecha) } : {}),
        ...(preProyectoId ? { preProyectoId } : {}),
      },
    })
    return NextResponse.json(visita, { status: 201 })
  } catch (err) {
    console.error("[POST]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
