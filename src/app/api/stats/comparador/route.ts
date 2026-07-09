import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

function rangoAnterior(desde: Date, hasta: Date) {
  const ms = hasta.getTime() - desde.getTime()
  return { desde: new Date(desde.getTime() - ms), hasta: new Date(desde.getTime()) }
}

// GET /api/stats/comparador?periodo=30|90|365
export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "stats-comparador")
    if (rl) return rl
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const diasParam = parseInt(req.nextUrl.searchParams.get("periodo") ?? "30")
    const dias = [30, 90, 365].includes(diasParam) ? diasParam : 30

    const hasta = new Date()
    const desde = new Date(hasta.getTime() - dias * 86_400_000)
    const { desde: desdeAnt, hasta: hastaAnt } = rangoAnterior(desde, hasta)

    const [
      visitasAct, visitasAnt,
      proyectosAct, proyectosAnt,
      incidenciasAct, incidenciasAnt,
      llamadasAct, llamadasAnt,
      checkinsAct, checkinsAnt,
    ] = await Promise.all([
      db.visita.count({ where: { fecha: { gte: desde } } }),
      db.visita.count({ where: { fecha: { gte: desdeAnt, lt: hastaAnt } } }),
      db.proyecto.count({ where: { creadoEn: { gte: desde } } }),
      db.proyecto.count({ where: { creadoEn: { gte: desdeAnt, lt: hastaAnt } } }),
      db.incidencia.count({ where: { creadoEn: { gte: desde } } }),
      db.incidencia.count({ where: { creadoEn: { gte: desdeAnt, lt: hastaAnt } } }),
      db.registroLlamada.count({ where: { creadoEn: { gte: desde } } }),
      db.registroLlamada.count({ where: { creadoEn: { gte: desdeAnt, lt: hastaAnt } } }),
      db.checkinHospital.count({ where: { entradaEn: { gte: desde } } }),
      db.checkinHospital.count({ where: { entradaEn: { gte: desdeAnt, lt: hastaAnt } } }),
    ])

    // Tiempo total en campo (minutos → horas)
    const [tiempoAct, tiempoAnt] = await Promise.all([
      db.checkinHospital.aggregate({ where: { entradaEn: { gte: desde }, salidaEn: { not: null } }, _sum: { duracion: true } }),
      db.checkinHospital.aggregate({ where: { entradaEn: { gte: desdeAnt, lt: hastaAnt }, salidaEn: { not: null } }, _sum: { duracion: true } }),
    ])

    // Sparklines: siempre 30 puntos (últimos 30 días), independiente del periodo elegido
    const SPARK_DAYS = 30
    const sparkDesde = new Date(Date.now() - SPARK_DAYS * 86_400_000)

    const [visitasSparkRaw, incidenciasSparkRaw] = await Promise.all([
      db.visita.findMany({ where: { fecha: { gte: sparkDesde } }, select: { fecha: true } }),
      db.incidencia.findMany({ where: { creadoEn: { gte: sparkDesde } }, select: { creadoEn: true } }),
    ])

    function buildSparkline(items: { fecha?: Date | null; creadoEn?: Date | null }[]) {
      const buckets: number[] = Array(SPARK_DAYS).fill(0)
      const now = Date.now()
      for (const item of items) {
        const d = item.fecha ?? item.creadoEn
        if (!d) continue
        const daysAgo = Math.floor((now - new Date(d).getTime()) / 86_400_000)
        const idx = SPARK_DAYS - 1 - daysAgo
        if (idx >= 0 && idx < SPARK_DAYS) buckets[idx]++
      }
      return buckets
    }

    const horasAct = Math.round((tiempoAct._sum.duracion ?? 0) / 60)
    const horasAnt = Math.round((tiempoAnt._sum.duracion ?? 0) / 60)

    return NextResponse.json({
      periodo: dias,
      actual:   { visitas: visitasAct, proyectos: proyectosAct, incidencias: incidenciasAct, llamadas: llamadasAct, checkins: checkinsAct, horas: horasAct },
      anterior: { visitas: visitasAnt, proyectos: proyectosAnt, incidencias: incidenciasAnt, llamadas: llamadasAnt, checkins: checkinsAnt, horas: horasAnt },
      sparklines: {
        visitas:     buildSparkline(visitasSparkRaw),
        incidencias: buildSparkline(incidenciasSparkRaw),
      },
    }, { headers: { "Cache-Control": "private, max-age=300" } })
  } catch (err) {
    console.error("[GET stats/comparador]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
