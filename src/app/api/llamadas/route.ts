import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { logActividad } from "@/lib/log-actividad"

export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "llamadas", { limit: 60, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const rol = session.user.role
    const userId = session.user.id

    const desde = req.nextUrl.searchParams.get("desde")
    const hasta = req.nextUrl.searchParams.get("hasta")
    const hospitalId = req.nextUrl.searchParams.get("hospitalId")

    const fechaFilter: Record<string, unknown> = {}
    if (desde) fechaFilter.gte = new Date(desde + "T00:00:00")
    if (hasta) fechaFilter.lte = new Date(hasta + "T23:59:59")

    // Build where clause with IDOR zone check
    const where: Record<string, unknown> = {}

    if (Object.keys(fechaFilter).length > 0) {
      where.fecha = fechaFilter
    }

    if (hospitalId) {
      where.hospitalId = hospitalId
    }

    // Non-ADMIN users only see calls for hospitals in their zone
    if (rol !== "ADMIN") {
      where.hospital = { zona: { usuarios: { some: { usuarioId: userId } } } }
    }

    const llamadas = await db.registroLlamada.findMany({
      where,
      select: {
        id: true,
        fecha: true,
        duracion: true,
        asunto: true,
        notas: true,
        resultado: true,
        seguimiento: true,
        fechaSeguimiento: true,
        creadoEn: true,
        hospital: { select: { id: true, nombre: true, ciudad: true } },
        contacto: { select: { id: true, nombre: true, cargo: true, telefono: true } },
        usuario: { select: { id: true, nombre: true } },
      },
      orderBy: { fecha: "desc" },
      take: 200,
    })

    const res = NextResponse.json(llamadas)
    res.headers.set("Cache-Control", "private, max-age=15")
    return res
  } catch (err) {
    console.error("[GET /api/llamadas]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "llamadas", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const body = await req.json()
    const { hospitalId, asunto, contactoId, duracion, notas, resultado, seguimiento, fechaSeguimiento, fecha } = body

    if (!hospitalId || typeof hospitalId !== "string") {
      return NextResponse.json({ error: "Hospital es obligatorio" }, { status: 400 })
    }
    if (!asunto || typeof asunto !== "string" || !asunto.trim()) {
      return NextResponse.json({ error: "El asunto es obligatorio" }, { status: 400 })
    }

    // Validate hospital exists and user has access (zone check for non-ADMIN)
    const hospitalWhere: Record<string, unknown> = { id: hospitalId }
    if (session.user.role !== "ADMIN") {
      hospitalWhere.zona = { usuarios: { some: { usuarioId: session.user.id } } }
    }
    const hospital = await db.hospital.findFirst({ where: hospitalWhere, select: { id: true, nombre: true } })
    if (!hospital) {
      return NextResponse.json({ error: "Hospital no encontrado o sin acceso" }, { status: 404 })
    }

    // Validate contacto if provided
    if (contactoId) {
      const contacto = await db.contacto.findFirst({
        where: { id: contactoId, hospitalId },
        select: { id: true },
      })
      if (!contacto) {
        return NextResponse.json({ error: "Contacto no encontrado en este hospital" }, { status: 404 })
      }
    }

    const data: Record<string, unknown> = {
      asunto: asunto.trim(),
      hospitalId,
      usuarioId: session.user.id,
    }

    if (contactoId && typeof contactoId === "string") data.contactoId = contactoId
    if (duracion != null && typeof duracion === "number" && duracion > 0) data.duracion = duracion
    if (notas && typeof notas === "string" && notas.trim()) data.notas = notas.trim()
    if (resultado && typeof resultado === "string" && resultado.trim()) data.resultado = resultado.trim()
    if (typeof seguimiento === "boolean") data.seguimiento = seguimiento
    if (fechaSeguimiento) {
      const fs = new Date(fechaSeguimiento)
      if (!isNaN(fs.getTime())) data.fechaSeguimiento = fs
    }
    if (fecha) {
      const f = new Date(fecha)
      if (!isNaN(f.getTime())) data.fecha = f
    }

    const llamada = await db.registroLlamada.create({
      data: data as Parameters<typeof db.registroLlamada.create>[0]["data"],
      include: {
        hospital: { select: { id: true, nombre: true, ciudad: true } },
        contacto: { select: { id: true, nombre: true, cargo: true, telefono: true } },
        usuario: { select: { id: true, nombre: true } },
      },
    })

    await logActividad(
      session.user.id,
      "CREAR",
      "LLAMADA",
      llamada.id,
      `Llamada registrada: ${asunto.trim()} — ${hospital.nombre}`,
    ).catch(() => {})

    return NextResponse.json(llamada, { status: 201 })
  } catch (err) {
    console.error("[POST /api/llamadas]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
