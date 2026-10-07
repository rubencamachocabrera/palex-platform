/**
 * Consultas de servidor de Inteligencia InLab: reconstruye el formato compacto
 * (InlabPayload) a partir de los agregados diarios de uno o varios hospitales.
 */
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { dateToDia, diaToDate } from "./dates"
import { EVENTO_CATEGORIAS } from "./mapping"
import { addHist, emptyHist, N_BUCKETS, N_BUCKETS_V1, normalizarHist, percentile, toSparse } from "./histogram"
import { payloadVacio, TRAMOS, type InlabPayload } from "./types"

class Dic {
  private m = new Map<string, number>()
  readonly list: string[] = []
  idx(v: string): number {
    let i = this.m.get(v)
    if (i === undefined) { i = this.list.length; this.m.set(v, i); this.list.push(v) }
    return i
  }
}

// ─── Histogramas de tiempos ──────────────────────────────────────────────────
// La columna `histograma` guarda 303 enteros por fila (casi todos 0): traerla densa eran
// ~6 MB por hospital y año, y dominaba el tiempo de /api/inlab/datos. Postgres devuelve
// solo los pares (bucket, cuenta) ≠ 0 y la longitud original, con la que se re-reparten
// las filas v1 exactamente igual que `normalizarHist` (mismo resultado, bit a bit).

interface FilaTiempoSql {
  hospital_id: string; fecha: Date; area: string; urgente: boolean; tramo: string
  n: number; suma_min: number; max_min: number; len: number; bi: number[]; bv: number[]
}

function whereSql(hospitalIds: string[], desde?: string, hasta?: string, extra?: Prisma.Sql): Prisma.Sql {
  const conds: Prisma.Sql[] = [Prisma.sql`hospital_id IN (${Prisma.join(hospitalIds)})`]
  if (desde) conds.push(Prisma.sql`fecha >= ${diaToDate(desde)}`)
  if (hasta) conds.push(Prisma.sql`fecha <= ${diaToDate(hasta)}`)
  if (extra) conds.push(extra)
  return Prisma.join(conds, " AND ")
}

function tiemposDispersos(hospitalIds: string[], desde?: string, hasta?: string, extra?: Prisma.Sql): Promise<FilaTiempoSql[]> {
  return db.$queryRaw<FilaTiempoSql[]>`
    SELECT hospital_id, fecha, area, urgente, tramo, n, suma_min, max_min,
      COALESCE(cardinality(histograma), 0)::int AS len,
      ARRAY(SELECT (u.i - 1)::int FROM unnest(histograma) WITH ORDINALITY AS u(v, i) WHERE u.v <> 0 ORDER BY u.i) AS bi,
      ARRAY(SELECT u.v FROM unnest(histograma) WITH ORDINALITY AS u(v, i) WHERE u.v <> 0 ORDER BY u.i) AS bv
    FROM inlab_tiempo_diario
    WHERE ${whereSql(hospitalIds, desde, hasta, extra)}`
}

const esV1 = (r: FilaTiempoSql) => r.len === N_BUCKETS_V1 && N_BUCKETS_V1 !== N_BUCKETS

/** Histograma denso de la fila: idéntico a `normalizarHist(histograma)`. */
function densoNormalizado(r: FilaTiempoSql): number[] {
  if (esV1(r)) {
    const v1 = new Array(r.len).fill(0)
    for (let k = 0; k < r.bi.length; k++) v1[r.bi[k]] = r.bv[k]
    return normalizarHist(v1)
  }
  const out = emptyHist()
  for (let k = 0; k < r.bi.length; k++) if (r.bi[k] < N_BUCKETS) out[r.bi[k]] = r.bv[k]
  return out
}

/** Pares dispersos de la fila: idéntico a `toSparse(normalizarHist(histograma))`. */
function paresNormalizados(r: FilaTiempoSql): number[] {
  if (esV1(r)) return toSparse(densoNormalizado(r))
  const out: number[] = []
  for (let k = 0; k < r.bi.length; k++) if (r.bi[k] < N_BUCKETS) out.push(r.bi[k], r.bv[k])
  return out
}

/**
 * Agregados diarios de uno o varios hospitales en formato compacto. Sin `desde`/`hasta`
 * devuelve toda la cobertura: el dashboard la pide una vez y recorta el rango en el cliente.
 */
export async function cargarDataset(hospitalIds: string[], desde?: string, hasta?: string): Promise<InlabPayload> {
  if (hospitalIds.length === 0) return payloadVacio()
  const where = {
    hospitalId: { in: hospitalIds },
    ...(desde || hasta ? { fecha: { ...(desde ? { gte: diaToDate(desde) } : {}), ...(hasta ? { lte: diaToDate(hasta) } : {}) } } : {}),
  }
  const [consumo, puestos, actividad, tiempos, eventos] = await Promise.all([
    db.inlabConsumoDiario.findMany({ where, select: { fecha: true, area: true, consumible: true, urgente: true, unidades: true, registros: true } }),
    db.inlabPuestoDiario.findMany({ where, select: { fecha: true, area: true, puesto: true, registros: true, unidades: true, urgentes: true, eventos: true } }),
    db.inlabActividadDiaria.findMany({ where, select: { fecha: true, area: true, registros: true, unidades: true, urgentes: true, ordenes: true, porHora: true } }),
    tiemposDispersos(hospitalIds, desde, hasta),
    db.inlabEventoDiario.findMany({ where, select: { fecha: true, area: true, puesto: true, impresora: true, tipo: true, detalle: true, cantidad: true } }),
  ])

  const diasSet = new Set<string>()
  for (const r of actividad) diasSet.add(dateToDia(r.fecha))
  for (const r of consumo) diasSet.add(dateToDia(r.fecha))
  const dias = [...diasSet].sort()
  const diaIdx = new Map(dias.map((d, i) => [d, i]))
  const D = (f: Date) => diaIdx.get(dateToDia(f)) ?? -1

  const areas = new Dic(), pues = new Dic(), cons = new Dic(), imps = new Dic(), evs = new Dic()
  const out: InlabPayload = payloadVacio()

  for (const r of consumo) {
    const d = D(r.fecha); if (d < 0) continue
    out.consumo.push([d, areas.idx(r.area), cons.idx(r.consumible), r.urgente ? 1 : 0, r.unidades, r.registros])
  }
  for (const r of puestos) {
    const d = D(r.fecha); if (d < 0) continue
    out.puestos.push([d, areas.idx(r.area), pues.idx(r.puesto), r.registros, r.unidades, r.urgentes, r.eventos])
  }
  for (const r of actividad) {
    const d = D(r.fecha); if (d < 0) continue
    const h = new Array(24).fill(0)
    r.porHora.slice(0, 24).forEach((v, i) => { h[i] = v })
    out.actividad.push([d, areas.idx(r.area), r.registros, r.unidades, r.urgentes, r.ordenes ?? -1, ...h])
  }
  for (const r of tiempos) {
    const d = D(r.fecha); if (d < 0) continue
    const t = (TRAMOS as readonly string[]).indexOf(r.tramo)
    if (t < 0) continue
    out.tiempos.push([d, areas.idx(r.area), r.urgente ? 1 : 0, t, r.n, r.suma_min, r.max_min, ...paresNormalizados(r)])
  }
  for (const r of eventos) {
    const d = D(r.fecha); if (d < 0) continue
    const cat = (EVENTO_CATEGORIAS as readonly string[]).indexOf(r.tipo)
    out.eventos.push([d, areas.idx(r.area), r.puesto ? pues.idx(r.puesto) : -1, r.impresora ? imps.idx(r.impresora) : -1, cat < 0 ? EVENTO_CATEGORIAS.length - 1 : cat, r.detalle ? evs.idx(r.detalle) : -1, r.cantidad])
  }
  out.dias = dias
  out.dic = { areas: areas.list, puestos: pues.list, consumibles: cons.list, impresoras: imps.list, eventos: evs.list }
  return out
}

export interface CoberturaHospital {
  hospitalId: string
  desde: string
  hasta: string
  dias: number
  cargas: number
  ultimaCarga: string | null
}

/**
 * Rango de datos disponible por hospital (para selector y presets de fecha).
 * `null` = todos los hospitales con datos: así /api/inlab/hospitales la lanza en paralelo con
 * la lista de hospitales accesibles y filtra después (un viaje a la BD menos).
 */
export async function coberturaHospitales(hospitalIds: string[] | null): Promise<CoberturaHospital[]> {
  if (hospitalIds && hospitalIds.length === 0) return []
  const filtro = hospitalIds ? Prisma.sql`WHERE hospital_id IN (${Prisma.join(hospitalIds)})` : Prisma.empty
  const [rangos, cargas] = await Promise.all([
    db.$queryRaw<{ hospital_id: string; desde: Date | null; hasta: Date | null; dias: number }[]>`
      SELECT hospital_id, min(fecha) AS desde, max(fecha) AS hasta, count(DISTINCT fecha)::int AS dias
      FROM inlab_actividad_diaria ${filtro} GROUP BY hospital_id`,
    db.inlabCarga.groupBy({ by: ["hospitalId"], where: hospitalIds ? { hospitalId: { in: hospitalIds } } : {}, _count: { _all: true }, _max: { creadoEn: true } }),
  ])
  const cargasMap = new Map(cargas.map(c => [c.hospitalId, c]))
  return rangos
    .filter(r => r.desde && r.hasta)
    .map(r => ({
      hospitalId: r.hospital_id,
      desde: dateToDia(r.desde!),
      hasta: dateToDia(r.hasta!),
      dias: r.dias,
      cargas: cargasMap.get(r.hospital_id)?._count._all ?? 0,
      ultimaCarga: cargasMap.get(r.hospital_id)?._max.creadoEn?.toISOString() ?? null,
    }))
}

/**
 * Huella de las cargas de los hospitales (nº de cargas + última creada). Cualquier cambio en
 * los agregados pasa por crear o borrar una carga (sustituir días crea una nueva), así que
 * sirve de versión para la caché de /api/inlab/datos y su ETag.
 */
export async function huellaCargas(hospitalIds: string[]): Promise<string> {
  if (hospitalIds.length === 0) return ""
  const rows = await db.inlabCarga.groupBy({ by: ["hospitalId"], where: { hospitalId: { in: hospitalIds } }, _count: { _all: true }, _max: { creadoEn: true } })
  return rows
    .map(r => `${r.hospitalId}:${r._count._all}:${r._max.creadoEn?.getTime() ?? 0}`)
    .sort()
    .join("|")
}

export interface BenchmarkFila {
  hospitalId: string
  dias: number
  registros: number
  unidades: number
  urgentes: number
  ordenes: number | null
  eventos: number
  p50Total: number | null
  p90Total: number | null
}

export async function benchmark(hospitalIds: string[], desde: string, hasta: string): Promise<BenchmarkFila[]> {
  if (hospitalIds.length === 0) return []
  const where = { hospitalId: { in: hospitalIds }, fecha: { gte: diaToDate(desde), lte: diaToDate(hasta) } }
  const [act, diasH, ev, tiempos] = await Promise.all([
    db.inlabActividadDiaria.groupBy({ by: ["hospitalId"], where, _sum: { registros: true, unidades: true, urgentes: true, ordenes: true }, _count: { ordenes: true } }),
    db.inlabActividadDiaria.groupBy({ by: ["hospitalId", "fecha"], where }),
    db.inlabEventoDiario.groupBy({ by: ["hospitalId"], where, _sum: { cantidad: true } }),
    tiemposDispersos(hospitalIds, desde, hasta, Prisma.sql`tramo = 'TOTAL'`),
  ])
  const nDias = new Map<string, number>()
  for (const r of diasH) nDias.set(r.hospitalId, (nDias.get(r.hospitalId) ?? 0) + 1)
  const evMap = new Map(ev.map(e => [e.hospitalId, e._sum.cantidad ?? 0]))
  const hists = new Map<string, number[]>()
  const maximos = new Map<string, number>()
  for (const t of tiempos) {
    let h = hists.get(t.hospital_id)
    if (!h) { h = emptyHist(); hists.set(t.hospital_id, h) }
    addHist(h, densoNormalizado(t))
    maximos.set(t.hospital_id, Math.max(maximos.get(t.hospital_id) ?? 0, t.max_min))
  }
  return act.map(a => {
    const h = hists.get(a.hospitalId)
    return {
      hospitalId: a.hospitalId,
      dias: nDias.get(a.hospitalId) ?? 0,
      registros: a._sum.registros ?? 0,
      unidades: a._sum.unidades ?? 0,
      urgentes: a._sum.urgentes ?? 0,
      ordenes: a._count.ordenes > 0 ? (a._sum.ordenes ?? 0) : null,
      eventos: evMap.get(a.hospitalId) ?? 0,
      p50Total: h ? percentile(h, 0.5, maximos.get(a.hospitalId)) : null,
      p90Total: h ? percentile(h, 0.9, maximos.get(a.hospitalId)) : null,
    }
  })
}
