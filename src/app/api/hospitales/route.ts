import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "hospitales", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const rol = session.user.role
    const userId = session.user.id

    const hospitales = await db.hospital.findMany({
      where: rol === "ADMIN" ? {} : {
        activo: true,
        zona: { usuarios: { some: { usuarioId: userId } } },
      },
      include: {
        zona: { select: { id: true, nombre: true } },
        _count: { select: { visitas: true, contactos: true } },
      },
      orderBy: { nombre: "asc" },
    })
    const res = NextResponse.json(hospitales)
    res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60")
    return res
  } catch (err) {
    console.error("[GET /api/hospitales]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "hospitales", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const body = await req.json()
    const { nombre, ciudad, provincia, pais, tipo, camas, direccion, zonaId } = body
    if (!nombre || !ciudad || !zonaId) return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })

    const hospital = await db.hospital.create({
      data: {
        nombre,
        ciudad,
        provincia,
        pais: pais ?? "España",
        tipo: tipo ?? "HOSPITAL_PUBLICO",
        camas: camas ? Number(camas) : null,
        direccion,
        zonaId,
      },
    })
    return NextResponse.json(hospital, { status: 201 })
  } catch (err) {
    console.error("[POST /api/hospitales]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
