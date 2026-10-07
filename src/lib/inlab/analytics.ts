/**
 * Cálculos del dashboard InLab sobre el formato compacto (cliente).
 * Todas las funciones son puras: dataset decodificado + rango + filtros → vista.
 */
import { addDias, diaSemana, diffDias, inicioSemana } from "./dates"
import { addHist, emptyHist, fromSparse, percentile } from "./histogram"
import { EVENTO_CATEGORIAS, type EventoCategoria } from "./mapping"
import { TRAMOS, type InlabPayload, type Tramo } from "./types"

// ─── Decodificación ──────────────────────────────────────────────────────────

export interface FilaConsumo { d: string; area: string; consumible: string; urg: boolean; unidades: number; registros: number }
export interface FilaPuesto { d: string; area: string; puesto: string; registros: number; unidades: number; urgentes: number; eventos: number }
export interface FilaActividad { d: string; area: string; registros: number; unidades: number; urgentes: number; ordenes: number | null; porHora: number[] }
export interface FilaTiempo { d: string; area: string; urg: boolean; tramo: Tramo; n: number; suma: number; max: number; hist: number[] }
export interface FilaEvento { d: string; area: string; puesto: string; impresora: string; tipo: EventoCategoria; detalle: string; cantidad: number }

export interface Dataset {
  dias: string[]
  consumo: FilaConsumo[]
  puestos: FilaPuesto[]
  actividad: FilaActividad[]
  tiempos: FilaTiempo[]
  eventos: FilaEvento[]
  areas: string[]
  consumibles: string[]
}

export function decodificar(p: InlabPayload): Dataset {
  const dia = (i: number) => p.dias[i]
  const A = p.dic.areas, P = p.dic.puestos, C = p.dic.consumibles, I = p.dic.impresoras, E = p.dic.eventos
  const ds: Dataset = {
    dias: p.dias,
    consumo: p.consumo.map(r => ({ d: dia(r[0]), area: A[r[1]], consumible: C[r[2]], urg: r[3] === 1, unidades: r[4], registros: r[5] })),
    puestos: p.puestos.map(r => ({ d: dia(r[0]), area: A[r[1]], puesto: P[r[2]], registros: r[3], unidades: r[4], urgentes: r[5], eventos: r[6] })),
    actividad: p.actividad.map(r => ({ d: dia(r[0]), area: A[r[1]], registros: r[2], unidades: r[3], urgentes: r[4], ordenes: r[5] >= 0 ? r[5] : null, porHora: r.slice(6, 30) })),
    tiempos: p.tiempos.map(r => ({ d: dia(r[0]), area: A[r[1]], urg: r[2] === 1, tramo: TRAMOS[r[3]], n: r[4], suma: r[5], max: r[6], hist: fromSparse(r, 7) })),
    eventos: p.eventos.map(r => ({ d: dia(r[0]), area: A[r[1]], puesto: r[2] >= 0 ? P[r[2]] : "", impresora: r[3] >= 0 ? I[r[3]] : "", tipo: EVENTO_CATEGORIAS[r[4]] ?? "OTRO", detalle: r[5] >= 0 ? E[r[5]] : "", cantidad: r[6] })),
    areas: [],
    consumibles: [],
  }
  ds.areas = [...new Set(ds.actividad.map(a => a.area))].sort((a, b) => a.localeCompare(b, "es"))
  ds.consumibles = [...new Set(ds.consumo.map(a => a.consumible))].sort((a, b) => a.localeCompare(b, "es"))
  return ds
}

// ─── Filtros ─────────────────────────────────────────────────────────────────

export type Urgencia = "todas" | "urgente" | "normal"

export interface Filtros {
  /** Work areas seleccionadas; vacío = todas */
  areas: string[]
  consumible: string | null
  puesto: string | null
  urgencia: Urgencia
}

export const FILTROS_VACIOS: Filtros = { areas: [], consumible: null, puesto: null, urgencia: "todas" }

export interface Rango { desde: string; hasta: string }

const enRango = (d: string, r: Rango) => d >= r.desde && d <= r.hasta
const okUrg = (urg: boolean, f: Filtros) => f.urgencia === "todas" || (f.urgencia === "urgente") === urg
const okArea = (area: string, f: Filtros) => f.areas.length === 0 || f.areas.includes(area)

// ─── Work areas ──────────────────────────────────────────────────────────────

/** Añade o quita un área de la selección. Si quedan todas seleccionadas se normaliza a [] (= todas). */
export function alternarArea(sel: string[], area: string, todas: string[]): string[] {
  const next = sel.length === 0 ? [area] : sel.includes(area) ? sel.filter(a => a !== area) : [...sel, area]
  return next.length >= todas.length && todas.every(a => next.includes(a)) ? [] : next
}

/** Nombre legible de un código de área de InLab (PLANTA8 → Planta 8, EXTRACCIONES → Extracciones). */
export function etiquetaArea(area: string): string {
  const m = /^PLANTA\s*(\d+)$/i.exec(area.trim())
  if (m) return `Planta ${m[1]}`
  if (area === area.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(area)) return area.charAt(0) + area.slice(1).toLowerCase()
  return area
}

export type GrupoArea = "Extracciones" | "Urgencias" | "Plantas" | "Laboratorio" | "Otras"
/** Agrupa las áreas para los atajos del selector. */
export function grupoArea(area: string): GrupoArea {
  const n = area.toUpperCase()
  if (n.includes("EXTRAC")) return "Extracciones"
  if (n.includes("URGEN")) return "Urgencias"
  if (n.startsWith("PLANTA") || n.startsWith("PL-")) return "Plantas"
  if (n.includes("LAB")) return "Laboratorio"
  return "Otras"
}

/** Volumen por área en el rango (ignora el filtro de áreas: sirve para el selector). */
export function volumenPorArea(ds: Dataset, r: Rango, f: Filtros): Map<string, { registros: number; ordenes: number }> {
  const m = new Map<string, { registros: number; ordenes: number }>()
  for (const a of ds.actividad) {
    if (!enRango(a.d, r)) continue
    const x = m.get(a.area) ?? { registros: 0, ordenes: 0 }
    x.registros += f.urgencia === "todas" ? a.registros : f.urgencia === "urgente" ? a.urgentes : a.registros - a.urgentes
    x.ordenes += a.ordenes ?? 0
    m.set(a.area, x)
  }
  return m
}

/** Periodo inmediatamente anterior de la misma duración. */
export function periodoAnterior(r: Rango): Rango {
  const n = diffDias(r.desde, r.hasta) + 1
  return { desde: addDias(r.desde, -n), hasta: addDias(r.desde, -1) }
}

// ─── KPIs ────────────────────────────────────────────────────────────────────

export interface Kpis {
  dias: number
  registros: number
  unidades: number
  urgentes: number
  ordenes: number | null
  eventos: number
  p50Total: number | null
  p90Total: number | null
  tiemposN: number
}

/**
 * Registros/unidades salen de "consumo" (respeta filtro de consumible y urgencia);
 * órdenes y urgentes de "actividad"; eventos de "eventos".
 */
export function kpis(ds: Dataset, r: Rango, f: Filtros): Kpis {
  let registros = 0, unidades = 0, urgentes = 0, eventos = 0, ordenes = 0, hayOrdenes = false
  const dias = new Set<string>()
  for (const c of ds.consumo) {
    if (!enRango(c.d, r) || !okArea(c.area, f) || (f.consumible && c.consumible !== f.consumible) || !okUrg(c.urg, f)) continue
    registros += c.registros; unidades += c.unidades
    if (c.urg) urgentes += c.registros
    dias.add(c.d)
  }
  if (!f.consumible && f.urgencia === "todas") {
    for (const a of ds.actividad) {
      if (!enRango(a.d, r) || !okArea(a.area, f)) continue
      if (a.ordenes !== null) { ordenes += a.ordenes; hayOrdenes = true }
    }
  }
  for (const e of ds.eventos) {
    if (!enRango(e.d, r) || !okArea(e.area, f) || (f.puesto && e.puesto !== f.puesto)) continue
    eventos += e.cantidad
  }
  const h = emptyHist()
  let n = 0
  for (const t of ds.tiempos) {
    if (t.tramo !== "TOTAL" || !enRango(t.d, r) || !okArea(t.area, f) || !okUrg(t.urg, f)) continue
    addHist(h, t.hist); n += t.n
  }
  return {
    dias: dias.size, registros, unidades, urgentes, eventos,
    ordenes: hayOrdenes ? ordenes : null,
    p50Total: n ? percentile(h, 0.5) : null,
    p90Total: n ? percentile(h, 0.9) : null,
    tiemposN: n,
  }
}

export function delta(actual: number | null, previo: number | null): number | null {
  if (actual === null || previo === null || previo === 0) return null
  return ((actual - previo) / previo) * 100
}

// ─── Series temporales ───────────────────────────────────────────────────────

export interface Punto { x: string; v: number | null }

/** Granularidad automática: diaria hasta 120 días, semanal después. */
export function granularidad(r: Rango): "dia" | "semana" {
  return diffDias(r.desde, r.hasta) > 120 ? "semana" : "dia"
}

function ejeTemporal(r: Rango, g: "dia" | "semana"): string[] {
  const out: string[] = []
  let d = g === "semana" ? inicioSemana(r.desde) : r.desde
  while (d <= r.hasta) { out.push(d); d = addDias(d, g === "semana" ? 7 : 1) }
  return out
}

/** Serie de registros (consumo filtrado). Los días sin datos quedan como null (huecos, no ceros). */
export function serieVolumen(ds: Dataset, r: Rango, f: Filtros, campo: "registros" | "unidades" = "registros"): Punto[] {
  const g = granularidad(r)
  const eje = ejeTemporal(r, g)
  const acc = new Map<string, number>()
  const conDatos = new Set(ds.dias)
  for (const c of ds.consumo) {
    if (!enRango(c.d, r) || !okArea(c.area, f) || (f.consumible && c.consumible !== f.consumible) || !okUrg(c.urg, f)) continue
    const k = g === "semana" ? inicioSemana(c.d) : c.d
    acc.set(k, (acc.get(k) ?? 0) + c[campo])
  }
  return eje.map(x => {
    const v = acc.get(x)
    if (v !== undefined) return { x, v }
    if (g === "dia") return { x, v: conDatos.has(x) ? 0 : null }
    // semana sin ningún día cargado → hueco
    for (let i = 0; i < 7; i++) if (conDatos.has(addDias(x, i))) return { x, v: 0 }
    return { x, v: null }
  })
}

/**
 * Previsión simple de las próximas 4 semanas: regresión lineal sobre los
 * totales semanales completos (máx. 12) del periodo. Solo orientativa.
 */
export function prevision(ds: Dataset, r: Rango, f: Filtros): { semanas: Punto[]; pendiente: number } | null {
  const sem = new Map<string, { v: number; dias: number }>()
  const diasCon = new Set(ds.dias.filter(d => enRango(d, r)))
  for (const d of diasCon) { const k = inicioSemana(d); const s = sem.get(k) ?? { v: 0, dias: 0 }; s.dias++; sem.set(k, s) }
  for (const c of ds.consumo) {
    if (!enRango(c.d, r) || !okArea(c.area, f) || (f.consumible && c.consumible !== f.consumible) || !okUrg(c.urg, f)) continue
    const s = sem.get(inicioSemana(c.d)); if (s) s.v += c.registros
  }
  const completas = [...sem.entries()].filter(([, s]) => s.dias >= 5).sort(([a], [b]) => a.localeCompare(b)).slice(-12)
  if (completas.length < 4) return null
  const ys = completas.map(([, s]) => (s.v / s.dias) * 7)
  const n = ys.length
  const xm = (n - 1) / 2, ym = ys.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  ys.forEach((y, i) => { num += (i - xm) * (y - ym); den += (i - xm) ** 2 })
  const m = den ? num / den : 0
  const b = ym - m * xm
  const ultima = completas[n - 1][0]
  const semanas: Punto[] = []
  for (let k = 1; k <= 4; k++) semanas.push({ x: addDias(ultima, 7 * k), v: Math.max(0, Math.round(b + m * (n - 1 + k))) })
  return { semanas, pendiente: ym ? (m / ym) * 100 : 0 }
}

// ─── Desgloses ───────────────────────────────────────────────────────────────

export interface Desglose { clave: string; registros: number; unidades: number; urgentes: number; eventos?: number }

export function porConsumible(ds: Dataset, r: Rango, f: Filtros): Desglose[] {
  const m = new Map<string, Desglose>()
  for (const c of ds.consumo) {
    if (!enRango(c.d, r) || !okArea(c.area, f) || !okUrg(c.urg, f)) continue
    const x = m.get(c.consumible) ?? { clave: c.consumible, registros: 0, unidades: 0, urgentes: 0 }
    x.registros += c.registros; x.unidades += c.unidades; if (c.urg) x.urgentes += c.registros
    m.set(c.consumible, x)
  }
  return [...m.values()].sort((a, b) => b.unidades - a.unidades)
}

export function porArea(ds: Dataset, r: Rango, f: Filtros): Desglose[] {
  const m = new Map<string, Desglose>()
  for (const c of ds.consumo) {
    if (!enRango(c.d, r) || (f.consumible && c.consumible !== f.consumible) || !okUrg(c.urg, f)) continue
    const x = m.get(c.area) ?? { clave: c.area, registros: 0, unidades: 0, urgentes: 0, eventos: 0 }
    x.registros += c.registros; x.unidades += c.unidades; if (c.urg) x.urgentes += c.registros
    m.set(c.area, x)
  }
  for (const e of ds.eventos) {
    if (!enRango(e.d, r)) continue
    const x = m.get(e.area); if (x) x.eventos = (x.eventos ?? 0) + e.cantidad
  }
  return [...m.values()].sort((a, b) => b.registros - a.registros)
}

export function porPuesto(ds: Dataset, r: Rango, f: Filtros): Desglose[] {
  const m = new Map<string, Desglose>()
  for (const p of ds.puestos) {
    if (!enRango(p.d, r) || !okArea(p.area, f)) continue
    const k = p.puesto
    const x = m.get(k) ?? { clave: k, registros: 0, unidades: 0, urgentes: 0, eventos: 0 }
    x.registros += p.registros; x.unidades += p.unidades; x.urgentes += p.urgentes; x.eventos = (x.eventos ?? 0) + p.eventos
    m.set(k, x)
  }
  return [...m.values()].sort((a, b) => b.registros - a.registros)
}

/** Matriz 7 (lunes..domingo) × 24 horas de registros (media por día de ese tipo). */
export function heatmapSemanaHora(ds: Dataset, r: Rango, f: Filtros): { m: number[][]; max: number } {
  const suma = Array.from({ length: 7 }, () => new Array(24).fill(0))
  const diasPorDow = new Array(7).fill(0)
  const vistos = new Set<string>()
  for (const a of ds.actividad) {
    if (!enRango(a.d, r) || !okArea(a.area, f)) continue
    const dow = diaSemana(a.d)
    if (!vistos.has(a.d)) { vistos.add(a.d); diasPorDow[dow]++ }
    for (let h = 0; h < 24; h++) suma[dow][h] += a.porHora[h] ?? 0
  }
  let max = 0
  const m = suma.map((fila, dow) => fila.map(v => { const x = diasPorDow[dow] ? v / diasPorDow[dow] : 0; if (x > max) max = x; return x }))
  return { m, max }
}

/** Media de registros por día de la semana. */
export function porDiaSemana(ds: Dataset, r: Rango, f: Filtros): number[] {
  const { m } = heatmapSemanaHora(ds, r, f)
  return m.map(fila => fila.reduce((a, b) => a + b, 0))
}

// ─── Tiempos ─────────────────────────────────────────────────────────────────

export interface StatTiempo { clave: string; n: number; p50: number | null; p90: number | null; media: number | null; hist: number[] }

function stat(clave: string, n: number, suma: number, hist: number[]): StatTiempo {
  return { clave, n, p50: n ? percentile(hist, 0.5) : null, p90: n ? percentile(hist, 0.9) : null, media: n ? suma / n : null, hist }
}

export function tiemposPorTramo(ds: Dataset, r: Rango, f: Filtros): StatTiempo[] {
  return TRAMOS.map(t => {
    const h = emptyHist(); let n = 0, s = 0
    for (const x of ds.tiempos) {
      if (x.tramo !== t || !enRango(x.d, r) || !okArea(x.area, f) || !okUrg(x.urg, f)) continue
      addHist(h, x.hist); n += x.n; s += x.suma
    }
    return stat(t, n, s, h)
  })
}

/** Por área (o por urgencia) para un tramo. */
export function tiemposPor(ds: Dataset, r: Rango, f: Filtros, tramo: Tramo, dim: "area" | "urgencia"): StatTiempo[] {
  const m = new Map<string, { h: number[]; n: number; s: number }>()
  for (const x of ds.tiempos) {
    if (x.tramo !== tramo || !enRango(x.d, r) || !okArea(x.area, f) || !okUrg(x.urg, f)) continue
    const k = dim === "area" ? x.area : x.urg ? "Urgente" : "Normal"
    const acc = m.get(k) ?? { h: emptyHist(), n: 0, s: 0 }
    addHist(acc.h, x.hist); acc.n += x.n; acc.s += x.suma
    m.set(k, acc)
  }
  return [...m.entries()].map(([k, a]) => stat(k, a.n, a.s, a.h)).sort((a, b) => (b.p90 ?? 0) - (a.p90 ?? 0))
}

/** Evolución de la mediana de un tramo (diaria o semanal). */
export function serieMediana(ds: Dataset, r: Rango, f: Filtros, tramo: Tramo): { p50: Punto[]; p90: Punto[] } {
  const g = granularidad(r)
  const eje = ejeTemporal(r, g)
  const m = new Map<string, number[]>()
  for (const x of ds.tiempos) {
    if (x.tramo !== tramo || !enRango(x.d, r) || !okArea(x.area, f) || !okUrg(x.urg, f)) continue
    const k = g === "semana" ? inicioSemana(x.d) : x.d
    let h = m.get(k); if (!h) { h = emptyHist(); m.set(k, h) }
    addHist(h, x.hist)
  }
  return {
    p50: eje.map(x => ({ x, v: m.has(x) ? percentile(m.get(x)!, 0.5) : null })),
    p90: eje.map(x => ({ x, v: m.has(x) ? percentile(m.get(x)!, 0.9) : null })),
  }
}

// ─── Eventos ─────────────────────────────────────────────────────────────────

export function eventosPor(ds: Dataset, r: Rango, f: Filtros, dim: "tipo" | "impresora" | "puesto" | "area" | "detalle"): { clave: string; cantidad: number }[] {
  const m = new Map<string, number>()
  for (const e of ds.eventos) {
    if (!enRango(e.d, r) || !okArea(e.area, f) || (f.puesto && e.puesto !== f.puesto)) continue
    const k = dim === "tipo" ? e.tipo : (e[dim] || "—")
    m.set(k, (m.get(k) ?? 0) + e.cantidad)
  }
  return [...m.entries()].map(([clave, cantidad]) => ({ clave, cantidad })).sort((a, b) => b.cantidad - a.cantidad)
}

/** Tasa de eventos por 1.000 registros, por periodo (día/semana). */
export function serieTasaEventos(ds: Dataset, r: Rango, f: Filtros): Punto[] {
  const g = granularidad(r)
  const eje = ejeTemporal(r, g)
  const ev = new Map<string, number>(), vol = new Map<string, number>()
  const key = (d: string) => (g === "semana" ? inicioSemana(d) : d)
  for (const e of ds.eventos) {
    if (!enRango(e.d, r) || !okArea(e.area, f) || (f.puesto && e.puesto !== f.puesto)) continue
    ev.set(key(e.d), (ev.get(key(e.d)) ?? 0) + e.cantidad)
  }
  for (const a of ds.actividad) {
    if (!enRango(a.d, r) || !okArea(a.area, f)) continue
    vol.set(key(a.d), (vol.get(key(a.d)) ?? 0) + a.registros)
  }
  return eje.map(x => { const v = vol.get(x); return { x, v: v ? ((ev.get(x) ?? 0) / v) * 1000 : null } })
}

// ─── Facturación ─────────────────────────────────────────────────────────────

export interface Tarifa { consumible: string; precio: number; moneda: string; unidad?: string | null; vigenteDesde?: string | null; vigenteHasta?: string | null }

export interface LineaFactura { mes: string; consumible: string; unidades: number; precio: number | null; importe: number | null }

function tarifaPara(tarifas: Tarifa[], consumible: string, dia: string): Tarifa | null {
  const vigente = (t: Tarifa) => (!t.vigenteDesde || dia >= t.vigenteDesde) && (!t.vigenteHasta || dia <= t.vigenteHasta)
  return tarifas.find(t => t.consumible === consumible && vigente(t)) ?? tarifas.find(t => t.consumible === "*" && vigente(t)) ?? null
}

/** Consumo × tarifa vigente el día de consumo, agrupado por mes y consumible. */
export function facturacion(ds: Dataset, r: Rango, f: Filtros, tarifas: Tarifa[]): LineaFactura[] {
  const m = new Map<string, LineaFactura>()
  for (const c of ds.consumo) {
    if (!enRango(c.d, r) || !okArea(c.area, f) || (f.consumible && c.consumible !== f.consumible) || !okUrg(c.urg, f)) continue
    const mes = c.d.slice(0, 7)
    const t = tarifaPara(tarifas, c.consumible, c.d)
    const k = `${mes}|${c.consumible}`
    const l = m.get(k) ?? { mes, consumible: c.consumible, unidades: 0, precio: t?.precio ?? null, importe: t ? 0 : null }
    l.unidades += c.unidades
    if (t) { l.importe = (l.importe ?? 0) + c.unidades * t.precio; l.precio = t.precio }
    m.set(k, l)
  }
  return [...m.values()].sort((a, b) => a.mes.localeCompare(b.mes) || b.unidades - a.unidades)
}

// ─── Cobertura ───────────────────────────────────────────────────────────────

/** Días sin datos dentro de [desde, hasta]. */
export function huecos(dias: string[], r: Rango): string[] {
  const set = new Set(dias)
  const out: string[] = []
  for (let d = r.desde; d <= r.hasta; d = addDias(d, 1)) if (!set.has(d)) out.push(d)
  return out
}
