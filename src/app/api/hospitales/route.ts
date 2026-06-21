import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { logActividad } from "@/lib/log-actividad"

export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "hospitales", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const rol = session.user.role
    const userId = session.user.id

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "200"), 500)
    const page = Math.max(parseInt(req.nextUrl.searchParams.get("page") ?? "1"), 1)
    const skip = (page - 1) * limit

    const where = rol === "ADMIN" ? {} : {
      activo: true,
      zona: { usuarios: { some: { usuarioId: userId } } },
    }

    const [hospitales, total] = await Promise.all([
      db.hospital.findMany({
        where,
        include: {
          zona: { select: { id: true, nombre: true } },
          grupo: { select: { id: true, nombre: true } },
          centros: { select: { id: true, nombre: true, ciudad: true, tipo: true }, where: { activo: true } },
          _count: { select: { visitas: true, contactos: true } },
        },
        orderBy: { nombre: "asc" },
        take: limit,
        skip,
      }),
      db.hospital.count({ where }),
    ])

    const [oppGroups, ppGroups, lastVisits] = await Promise.all([
      db.oportunidad.groupBy({
        by: ["hospitalId"],
        where: { etapa: { notIn: ["GANADO", "PERDIDO"] } },
        _count: { _all: true },
      }),
      db.proyecto.groupBy({
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
    res.headers.set("X-Total-Count", String(total))
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
    const { nombre, ciudad, provincia, pais, tipo, camas, direccion, zonaId, latitud, longitud, grupoId } = body
    if (!nombre?.trim() || !ciudad?.trim() || !zonaId)
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })

    const latNum = latitud != null ? Number(latitud) : null
    const lonNum = longitud != null ? Number(longitud) : null

    const hospital = await db.hospital.create({
      data: {
        nombre:    nombre.trim(),
        ciudad:    ciudad.trim(),
        provincia: provincia?.trim() || null,
        pais:      pais ?? "España",
        tipo:      tipo ?? "HOSPITAL_PUBLICO",
        camas:     camas ? (Number.isFinite(Number(camas)) ? Math.max(0, Math.round(Number(camas))) : null) : null,
        direccion: direccion?.trim() || null,
        zonaId,
        latitud:   latNum != null && Number.isFinite(latNum) && Math.abs(latNum)  <= 90  ? latNum  : null,
        longitud:  lonNum != null && Number.isFinite(lonNum) && Math.abs(lonNum)  <= 180 ? lonNum  : null,
        grupoId:   grupoId || null,
      },
    })
    logActividad(session.user.id, "CREAR", "hospital", hospital.id, nombre.trim())
    return NextResponse.json(hospital, { status: 201 })
  } catch (err) {
    console.error("[POST /api/hospitales]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
