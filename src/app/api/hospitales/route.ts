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

    const [oppGroups, ppGroups, lastVisits] = await Promise.all([
      db.oportunidad.groupBy({
        by: ["hospitalId"],
        where: { etapa: { notIn: ["GANADO", "PERDIDO"] } },
        _count: { _all: true },
      }),
      db.preProyecto.groupBy({
        by: ["hospitalId"],
        where: { estado: "EN_CURSO" },
        _count: { _all: true },
      }),
      db.visita.findMany({
        distinct: ["hospitalId"],
        orderBy: { fecha: "desc" },
        select: { hospitalId: true, fecha: true },
      }),
    ])

    const oppMap: Record<string, number> = {}
    oppGroups.forEach(r => { oppMap[r.hospitalId] = r._count._all })
    const ppMap: Record<string, number> = {}
    ppGroups.forEach(r => { ppMap[r.hospitalId] = r._count._all })
    const lvMap: Record<string, Date> = {}
    lastVisits.forEach(v => { lvMap[v.hospitalId] = v.fecha })

    const now = Date.now()
    const result = hospitales.map(h => {
      const lastV = lvMap[h.id]
      const daysSince = lastV ? Math.floor((now - new Date(lastV).getTime()) / 86400000) : 999
      const vPts = Math.min(30, h._count.visitas * 2)
      const cPts = Math.min(15, h._count.contactos * 3)
      const oPts = Math.min(20, (oppMap[h.id] ?? 0) * 5)
      const pPts = Math.min(20, (ppMap[h.id] ?? 0) * 7)
      const pen = daysSince > 90 ? 15 : daysSince > 60 ? 8 : 0
      const score = Math.max(0, Math.min(100, vPts + cPts + oPts + pPts - pen))
      return { ...h, score }
    })

    const res = NextResponse.json(result)
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
    const { nombre, ciudad, provincia, pais, tipo, camas, direccion, zonaId, latitud, longitud } = body
    if (!nombre || !ciudad || !zonaId) return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })

    const hospital = await db.hospital.create({
      data: {
        nombre,
        ciudad,
        provincia,
        pais: pais ?? "España",
        tipo: tipo ?? "HOSPITAL_PUBLICO",
        camas: camas ? (Number.isFinite(Number(camas)) ? Math.max(0, Math.round(Number(camas))) : null) : null,
        direccion,
        zonaId,
        latitud: latitud != null ? Number(latitud) : null,
        longitud: longitud != null ? Number(longitud) : null,
      },
    })
    return NextResponse.json(hospital, { status: 201 })
  } catch (err) {
    console.error("[POST /api/hospitales]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
