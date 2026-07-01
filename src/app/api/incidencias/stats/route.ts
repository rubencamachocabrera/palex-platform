import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "incidencias-stats", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { searchParams } = req.nextUrl
    const desde = searchParams.get("desde")
    const hasta = searchParams.get("hasta")

    const dateFilter = {
      ...(desde ? { gte: new Date(desde) } : {}),
      ...(hasta ? { lte: new Date(hasta) } : {}),
    }
    const where = Object.keys(dateFilter).length > 0 ? { creadoEn: dateFilter } : {}

    // All incidencias in range
    const incidencias = await db.incidencia.findMany({
      where,
      select: {
        id: true,
        prioridad: true,
        estado: true,
        tipo: true,
        categoria: true,
        slaHoras: true,
        slaPausadoMs: true,
        slaPausadoEn: true,
        creadoEn: true,
        fechaResolucion: true,
        asignadoA: { select: { id: true, nombre: true } },
        eventos: { select: { duracion: true } },
      },
    })

    // SLA compliance helper
    function isSlaOk(inc: typeof incidencias[0]) {
      if (!inc.slaHoras || !inc.fechaResolucion) return null
      const slaMs = inc.slaHoras * 3_600_000
      const paused = (inc.slaPausadoMs ?? 0)
      const resolved = new Date(inc.fechaResolucion).getTime()
      const created = new Date(inc.creadoEn).getTime()
      return (resolved - created - paused) <= slaMs
    }

    // Per-technician stats
    const techMap = new Map<string, {
      id: string; nombre: string; total: number; resueltas: number;
      slaCumplidas: number; slaAplicables: number; minutosTotales: number
    }>()

    // Global KPIs
    let totalAbiertas = 0
    let totalEnProgreso = 0
    let totalResueltas = 0
    let slaCumplidas = 0
    let slaTotal = 0
    let minutosTotales = 0

    const porCategoria: Record<string, number> = {}
    const porPrioridad: Record<string, number> = {}
    const porTipo: Record<string, number> = {}

    for (const inc of incidencias) {
      // Global counts
      if (inc.estado === "ABIERTA") totalAbiertas++
      if (inc.estado === "EN_PROGRESO") totalEnProgreso++
      if (["RESUELTA", "CERRADA"].includes(inc.estado)) totalResueltas++

      // Category / priority / type
      porCategoria[inc.categoria] = (porCategoria[inc.categoria] ?? 0) + 1
      porPrioridad[inc.prioridad] = (porPrioridad[inc.prioridad] ?? 0) + 1
      porTipo[inc.tipo] = (porTipo[inc.tipo] ?? 0) + 1

      // SLA global
      const slak = isSlaOk(inc)
      if (slak !== null) { slaTotal++; if (slak) slaCumplidas++ }

      // Minutes
      const mins = inc.eventos.reduce((s, e) => s + (e.duracion ?? 0), 0)
      minutosTotales += mins

      // Per-technician
      if (inc.asignadoA) {
        const t = inc.asignadoA
        if (!techMap.has(t.id)) techMap.set(t.id, { id: t.id, nombre: t.nombre, total: 0, resueltas: 0, slaCumplidas: 0, slaAplicables: 0, minutosTotales: 0 })
        const tech = techMap.get(t.id)!
        tech.total++
        if (["RESUELTA", "CERRADA"].includes(inc.estado)) tech.resueltas++
        if (slak !== null) { tech.slaAplicables++; if (slak) tech.slaCumplidas++ }
        tech.minutosTotales += mins
      }
    }

    const tecnicos = Array.from(techMap.values())
      .map(t => ({
        ...t,
        slaRate: t.slaAplicables > 0 ? Math.round((t.slaCumplidas / t.slaAplicables) * 100) : null,
        horasTotales: Math.round(t.minutosTotales / 60),
      }))
      .sort((a, b) => b.total - a.total)

    return NextResponse.json({
      total: incidencias.length,
      totalAbiertas,
      totalEnProgreso,
      totalResueltas,
      slaCumplimiento: slaTotal > 0 ? Math.round((slaCumplidas / slaTotal) * 100) : null,
      horasTotales: Math.round(minutosTotales / 60),
      porCategoria,
      porPrioridad,
      porTipo,
      tecnicos,
    }, {
      headers: { "Cache-Control": "private, max-age=60" },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
