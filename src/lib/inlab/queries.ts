/**
 * Consultas de servidor de Inteligencia InLab: reconstruye el formato compacto
 * (InlabPayload) a partir de los agregados diarios de uno o varios hospitales.
 */
import { db } from "@/lib/db"
import { dateToDia, diaToDate } from "./dates"
import { EVENTO_CATEGORIAS } from "./mapping"
import { addHist, emptyHist, percentile, toSparse } from "./histogram"
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

export async function cargarDataset(hospitalIds: string[], desde: string, hasta: string): Promise<InlabPayload> {
  if (hospitalIds.length === 0) return payloadVacio()
  const where = { hospitalId: { in: hospitalIds }, fecha: { gte: diaToDate(desde), lte: diaToDate(hasta) } }
  const [consumo, puestos, actividad, tiempos, eventos] = await Promise.all([
    db.inlabConsumoDiario.findMany({ where, select: { fecha: true, area: true, consumible: true, urgente: true, unidades: true, registros: true } }),
    db.inlabPuestoDiario.findMany({ where, select: { fecha: true, area: true, puesto: true, registros: true, unidades: true, urgentes: true, eventos: true } }),
    db.inlabActividadDiaria.findMany({ where, select: { fecha: true, area: true, registros: true, unidades: true, urgentes: true, ordenes: true, porHora: true } }),
    db.inlabTiempoDiario.findMany({ where, select: { fecha: true, area: true, urgente: true, tramo: true, n: true, sumaMin: true, maxMin: true, histograma: true } }),
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
    out.tiempos.push([d, areas.idx(r.area), r.urgente ? 1 : 0, t, r.n, r.sumaMin, r.maxMin, ...toSparse(r.histograma)])
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

/** Rango de datos disponible por hospital (para selector y presets de fecha). */
export async function coberturaHospitales(hospitalIds: string[]): Promise<CoberturaHospital[]> {
  if (hospitalIds.length === 0) return []
  const [rangos, diasPorHospital, cargas] = await Promise.all([
    db.inlabActividadDiaria.groupBy({ by: ["hospitalId"], where: { hospitalId: { in: hospitalIds } }, _min: { fecha: true }, _max: { fecha: true } }),
    db.inlabActividadDiaria.groupBy({ by: ["hospitalId", "fecha"], where: { hospitalId: { in: hospitalIds } } }),
    db.inlabCarga.groupBy({ by: ["hospitalId"], where: { hospitalId: { in: hospitalIds } }, _count: { _all: true }, _max: { creadoEn: true } }),
  ])
  const nDias = new Map<string, number>()
  for (const r of diasPorHospital) nDias.set(r.hospitalId, (nDias.get(r.hospitalId) ?? 0) + 1)
  const cargasMap = new Map(cargas.map(c => [c.hospitalId, c]))
  return rangos
    .filter(r => r._min.fecha && r._max.fecha)
    .map(r => ({
      hospitalId: r.hospitalId,
      desde: dateToDia(r._min.fecha!),
      hasta: dateToDia(r._max.fecha!),
      dias: nDias.get(r.hospitalId) ?? 0,
      cargas: cargasMap.get(r.hospitalId)?._count._all ?? 0,
      ultimaCarga: cargasMap.get(r.hospitalId)?._max.creadoEn?.toISOString() ?? null,
    }))
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
    db.inlabTiempoDiario.findMany({ where: { ...where, tramo: "TOTAL" }, select: { hospitalId: true, histograma: true } }),
  ])
  const nDias = new Map<string, number>()
  for (const r of diasH) nDias.set(r.hospitalId, (nDias.get(r.hospitalId) ?? 0) + 1)
  const evMap = new Map(ev.map(e => [e.hospitalId, e._sum.cantidad ?? 0]))
  const hists = new Map<string, number[]>()
  for (const t of tiempos) {
    let h = hists.get(t.hospitalId)
    if (!h) { h = emptyHist(); hists.set(t.hospitalId, h) }
    addHist(h, t.histograma)
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
      p50Total: h ? percentile(h, 0.5) : null,
      p90Total: h ? percentile(h, 0.9) : null,
    }
  })
}
