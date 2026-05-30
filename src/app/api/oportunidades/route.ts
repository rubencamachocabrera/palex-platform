import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/oportunidades — lista (ADMIN ve todas, VENTAS las suyas)
export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "oportunidades", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const rol = session.user.role
    const userId = session.user.id

    const hospitalId = req.nextUrl.searchParams.get("hospitalId") ?? undefined

    const oportunidades = await db.oportunidad.findMany({
      where: {
        ...(rol === "ADMIN" ? {} : { usuarioId: userId }),
        ...(hospitalId ? { hospitalId, etapa: { notIn: ["GANADO", "PERDIDO"] } } : {}),
      },
      include: {
        hospital: { select: { id: true, nombre: true, ciudad: true, zona: { select: { nombre: true } } } },
        usuario:  { select: { id: true, nombre: true } },
      },
      orderBy: { editadoEn: "desc" },
    })

    return NextResponse.json(oportunidades)
  } catch (err) {
    console.error("[GET]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST /api/oportunidades — crea oportunidad (VENTAS y ADMIN)
export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "oportunidades", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    if (session.user.role === "PROYECTOS") return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

    const { hospitalId, titulo, etapa, valorEstimado, probabilidad, fechaCierre, productos, notas } = await req.json()

    if (!hospitalId || !titulo?.trim()) {
      return NextResponse.json({ error: "Hospital y titulo son obligatorios" }, { status: 400 })
    }

    const oportunidad = await db.oportunidad.create({
      data: {
        hospitalId,
        usuarioId: session.user.id,
        titulo: titulo.trim(),
        etapa: etapa ?? "IDENTIFICADO",
        valorEstimado: valorEstimado ? parseFloat(valorEstimado) : null,
        probabilidad: probabilidad ? parseInt(probabilidad) : null,
        fechaCierre: fechaCierre && !isNaN(Date.parse(fechaCierre)) ? new Date(fechaCierre) : null,
        productos: productos ?? [],
        notas: notas?.trim() || null,
      },
      include: {
        hospital: { select: { id: true, nombre: true, ciudad: true, zona: { select: { nombre: true } } } },
        usuario:  { select: { id: true, nombre: true } },
      },
    })

    return NextResponse.json(oportunidad, { status: 201 })
  } catch (err) {
    console.error("[POST]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
