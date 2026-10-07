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

/** Días con datos cargados (cualquier área) dentro del rango. */
export function diasConDatos(ds: Dataset, r: Rango): number {
  let n = 0
  for (const d of ds.dias) if (enRango(d, r)) n++
  return n
}

/**
 * Cobertura mínima (días con datos / días naturales) de CADA periodo para mostrar
 * tendencias. Por debajo la comparación desvirtúa (p. ej. febrero 2026 frente a un
 * enero con 8 días cargados daba +192 % de registros cuando por día era +17 %).
 */
export const COBERTURA_MIN_TENDENCIA = 0.8

export interface Comparacion {
  actual: Rango
  /** periodo inmediatamente anterior de la misma duración */
  anterior: Rango
  diasNaturales: number
  diasActual: number
  diasAnterior: number
  /** true si ambos periodos tienen cobertura ≥ COBERTURA_MIN_TENDENCIA */
  comparable: boolean
  /** explicación cuando no es comparable */
  motivo: string | null
}

export function comparacion(ds: Dataset, r: Rango): Comparacion {
  const anterior = periodoAnterior(r)
  const diasNaturales = diffDias(r.desde, r.hasta) + 1
  const diasActual = diasConDatos(ds, r), diasAnterior = diasConDatos(ds, anterior)
  const minimo = diasNaturales * COBERTURA_MIN_TENDENCIA
  let motivo: string | null = null
  if (diasAnterior === 0) motivo = "No hay datos cargados del periodo anterior."
  else if (diasAnterior < minimo || diasActual < minimo)
    motivo = `Cobertura no comparable: ${diasActual} de ${diasNaturales} días con datos en el periodo y ${diasAnterior} de ${diasNaturales} en el anterior (mínimo ${Math.round(COBERTURA_MIN_TENDENCIA * 100)} %).`
  return { actual: r, anterior, diasNaturales, diasActual, diasAnterior, comparable: motivo === null, motivo }
}

export interface Tendencias {
  cmp: Comparacion
  /** Variaciones en % (null = no mostrar). Los volúmenes se comparan por día con datos. */
  registros: number | null
  unidades: number | null
  eventos: number | null
  tasaEventos: number | null
  p50Total: number | null
}

/**
 * Tendencias frente al periodo anterior, solo si la cobertura es comparable. Los
 * volúmenes se normalizan por días con datos cargados (con huecos distintos en cada
 * periodo, comparar totales mide huecos, no actividad); tasas y medianas no dependen
 * del nº de días.
 */
export function tendencias(ds: Dataset, r: Rango, f: Filtros): Tendencias {
  const { cmp, k, kp } = kpisComparables(ds, r, f)
  if (!kp) return { cmp, registros: null, unidades: null, eventos: null, tasaEventos: null, p50Total: null }
  // kp ya está escalado a los días con datos del periodo actual: delta de totales = delta por día
  return {
    cmp,
    registros: delta(k.registros, kp.registros),
    unidades: delta(k.unidades, kp.unidades),
    eventos: delta(k.eventos, kp.eventos),
    tasaEventos: delta(k.tasaEventos, kp.tasaEventos),
    p50Total: delta(k.p50Total, kp.p50Total),
  }
}

/**
 * KPIs del periodo y del anterior listos para comparar. `kp` es null si la cobertura no
 * es comparable; si lo es, sus volúmenes (registros, unidades, urgentes, órdenes, eventos)
 * se escalan a los días con datos del periodo actual, de modo que `delta(k.x, kp.x)` es la
 * variación por día con datos. Tasas y percentiles no se escalan.
 */
export function kpisComparables(ds: Dataset, r: Rango, f: Filtros): { cmp: Comparacion; k: Kpis; kp: Kpis | null } {
  const cmp = comparacion(ds, r)
  const k = kpis(ds, r, f)
  if (!cmp.comparable) return { cmp, k, kp: null }
  const p = kpis(ds, cmp.anterior, f)
  const esc = p.dias ? k.dias / p.dias : 0
  return {
    cmp, k,
    kp: {
      ...p,
      registros: p.registros * esc, unidades: p.unidades * esc, urgentes: p.urgentes * esc, eventos: p.eventos * esc,
      registrosBaseEventos: p.registrosBaseEventos * esc, ordenes: p.ordenes === null ? null : p.ordenes * esc,
    },
  }
}

// ─── KPIs ────────────────────────────────────────────────────────────────────

export interface Kpis {
  /** Días con datos cargados en el rango (de cualquier área: un día sin actividad en el área filtrada es un 0 real). */
  dias: number
  registros: number
  unidades: number
  urgentes: number
  ordenes: number | null
  eventos: number
  /**
   * Registros con los que se normalizan los eventos. Los eventos no tienen dimensión de
   * urgencia ni de consumible, así que la tasa usa todos los registros de las áreas (y del
   * puesto) seleccionados. Antes se dividía por los registros filtrados por urgencia y,
   * con «urgente», la tasa salía inflada (todos los eventos / solo tubos urgentes).
   */
  registrosBaseEventos: number
  /** Eventos por 1.000 registrosBaseEventos (null si no hay registros). */
  tasaEventos: number | null
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
  for (const c of ds.consumo) {
    if (!enRango(c.d, r) || !okArea(c.area, f) || (f.consumible && c.consumible !== f.consumible) || !okUrg(c.urg, f)) continue
    registros += c.registros; unidades += c.unidades
    if (c.urg) urgentes += c.registros
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
  const registrosBaseEventos = registrosBase(ds, r, f)
  const h = emptyHist()
  let n = 0, max = 0
  for (const t of ds.tiempos) {
    if (t.tramo !== "TOTAL" || !enRango(t.d, r) || !okArea(t.area, f) || !okUrg(t.urg, f)) continue
    addHist(h, t.hist); n += t.n; if (t.max > max) max = t.max
  }
  return {
    dias: diasConDatos(ds, r), registros, unidades, urgentes, eventos,
    registrosBaseEventos,
    tasaEventos: registrosBaseEventos ? (eventos / registrosBaseEventos) * 1000 : null,
    ordenes: hayOrdenes ? ordenes : null,
    p50Total: n ? percentile(h, 0.5, max) : null,
    p90Total: n ? percentile(h, 0.9, max) : null,
    tiemposN: n,
  }
}

/**
 * Registros de las áreas (y del puesto, si hay filtro) del rango, sin filtro de urgencia
 * ni de consumible: denominador de las tasas de eventos. Si se pasa `acc`, acumula por clave(día).
 */
function registrosBase(ds: Dataset, r: Rango, f: Filtros, acc?: { clave: (d: string) => string; m: Map<string, number> }): number {
  let total = 0
  const sumar = (d: string, v: number) => {
    total += v
    if (acc) { const k = acc.clave(d); acc.m.set(k, (acc.m.get(k) ?? 0) + v) }
  }
  if (f.puesto) {
    for (const p of ds.puestos) if (enRango(p.d, r) && okArea(p.area, f) && p.puesto === f.puesto) sumar(p.d, p.registros)
  } else {
    for (const a of ds.actividad) if (enRango(a.d, r) && okArea(a.area, f)) sumar(a.d, a.registros)
  }
  return total
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
 * Previsión simple de las próximas 4 semanas: regresión lineal sobre los totales de
 * semanas COMPLETAS (7 días cargados, máx. 12) del periodo. Solo orientativa.
 * Antes se admitían semanas con ≥5 días escaladas ×7/días; como los días que faltan
 * suelen ser fines de semana (poco volumen), eso inflaba las semanas incompletas.
 */
export function prevision(ds: Dataset, r: Rango, f: Filtros): { semanas: Punto[]; pendiente: number } | null {
  const sem = new Map<string, { v: number; dias: number }>()
  const diasCon = new Set(ds.dias.filter(d => enRango(d, r)))
  for (const d of diasCon) { const k = inicioSemana(d); const s = sem.get(k) ?? { v: 0, dias: 0 }; s.dias++; sem.set(k, s) }
  for (const c of ds.consumo) {
    if (!enRango(c.d, r) || !okArea(c.area, f) || (f.consumible && c.consumible !== f.consumible) || !okUrg(c.urg, f)) continue
    const s = sem.get(inicioSemana(c.d)); if (s) s.v += c.registros
  }
  const completas = [...sem.entries()].filter(([, s]) => s.dias === 7).sort(([a], [b]) => a.localeCompare(b)).slice(-12)
  if (completas.length < 4) return null
  const ys = completas.map(([, s]) => s.v)
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

/** Nº de días con datos cargados de cada día de la semana (0 = lunes) dentro del rango. */
function diasCargadosPorDow(ds: Dataset, r: Rango): number[] {
  const n = new Array(7).fill(0)
  for (const d of ds.dias) if (enRango(d, r)) n[diaSemana(d)]++
  return n
}

/**
 * Matriz 7 (lunes..domingo) × 24 horas de registros (media por día CARGADO de ese tipo).
 * Antes se dividía por los días en que el área filtrada tuvo actividad: un festivo sin
 * extracciones no contaba y la media salía inflada. La actividad horaria no está
 * desglosada por urgencia ni consumible: `ignoraFiltros` avisa de que no se aplican.
 */
export function heatmapSemanaHora(ds: Dataset, r: Rango, f: Filtros): { m: number[][]; max: number; ignoraFiltros: boolean } {
  const suma = Array.from({ length: 7 }, () => new Array(24).fill(0))
  const diasPorDow = diasCargadosPorDow(ds, r)
  for (const a of ds.actividad) {
    if (!enRango(a.d, r) || !okArea(a.area, f)) continue
    const dow = diaSemana(a.d)
    for (let h = 0; h < 24; h++) suma[dow][h] += a.porHora[h] ?? 0
  }
  let max = 0
  const m = suma.map((fila, dow) => fila.map(v => { const x = diasPorDow[dow] ? v / diasPorDow[dow] : 0; if (x > max) max = x; return x }))
  return { m, max, ignoraFiltros: f.urgencia !== "todas" || !!f.consumible }
}

/**
 * Media de registros por día de la semana (por día cargado). Sale de "consumo", así que
 * respeta urgencia y consumible (antes salía del mapa de calor y los ignoraba).
 */
export function porDiaSemana(ds: Dataset, r: Rango, f: Filtros): number[] {
  const suma = new Array(7).fill(0)
  const diasPorDow = diasCargadosPorDow(ds, r)
  for (const c of ds.consumo) {
    if (!enRango(c.d, r) || !okArea(c.area, f) || (f.consumible && c.consumible !== f.consumible) || !okUrg(c.urg, f)) continue
    suma[diaSemana(c.d)] += c.registros
  }
  return suma.map((v, i) => (diasPorDow[i] ? v / diasPorDow[i] : 0))
}

// ─── Tiempos ─────────────────────────────────────────────────────────────────

export interface StatTiempo { clave: string; n: number; p50: number | null; p90: number | null; media: number | null; hist: number[] }

function stat(clave: string, n: number, suma: number, hist: number[], max: number): StatTiempo {
  return { clave, n, p50: n ? percentile(hist, 0.5, max) : null, p90: n ? percentile(hist, 0.9, max) : null, media: n ? suma / n : null, hist }
}

export function tiemposPorTramo(ds: Dataset, r: Rango, f: Filtros): StatTiempo[] {
  return TRAMOS.map(t => {
    const h = emptyHist(); let n = 0, s = 0, max = 0
    for (const x of ds.tiempos) {
      if (x.tramo !== t || !enRango(x.d, r) || !okArea(x.area, f) || !okUrg(x.urg, f)) continue
      addHist(h, x.hist); n += x.n; s += x.suma; if (x.max > max) max = x.max
    }
    return stat(t, n, s, h, max)
  })
}

/** Por área (o por urgencia) para un tramo. */
export function tiemposPor(ds: Dataset, r: Rango, f: Filtros, tramo: Tramo, dim: "area" | "urgencia"): StatTiempo[] {
  const m = new Map<string, { h: number[]; n: number; s: number; max: number }>()
  for (const x of ds.tiempos) {
    if (x.tramo !== tramo || !enRango(x.d, r) || !okArea(x.area, f) || !okUrg(x.urg, f)) continue
    const k = dim === "area" ? x.area : x.urg ? "Urgente" : "Normal"
    const acc = m.get(k) ?? { h: emptyHist(), n: 0, s: 0, max: 0 }
    addHist(acc.h, x.hist); acc.n += x.n; acc.s += x.suma; if (x.max > acc.max) acc.max = x.max
    m.set(k, acc)
  }
  return [...m.entries()].map(([k, a]) => stat(k, a.n, a.s, a.h, a.max)).sort((a, b) => (b.p90 ?? 0) - (a.p90 ?? 0))
}

/** Evolución de la mediana de un tramo (diaria o semanal). */
export function serieMediana(ds: Dataset, r: Rango, f: Filtros, tramo: Tramo): { p50: Punto[]; p90: Punto[] } {
  const g = granularidad(r)
  const eje = ejeTemporal(r, g)
  const m = new Map<string, { h: number[]; max: number }>()
  for (const x of ds.tiempos) {
    if (x.tramo !== tramo || !enRango(x.d, r) || !okArea(x.area, f) || !okUrg(x.urg, f)) continue
    const k = g === "semana" ? inicioSemana(x.d) : x.d
    let acc = m.get(k); if (!acc) { acc = { h: emptyHist(), max: 0 }; m.set(k, acc) }
    addHist(acc.h, x.hist); if (x.max > acc.max) acc.max = x.max
  }
  const v = (x: string, p: number) => { const a = m.get(x); return a ? percentile(a.h, p, a.max) : null }
  return {
    p50: eje.map(x => ({ x, v: v(x, 0.5) })),
    p90: eje.map(x => ({ x, v: v(x, 0.9) })),
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

/** Tasa de eventos por 1.000 registros, por periodo (día/semana). Mismo denominador que `kpis().tasaEventos`. */
export function serieTasaEventos(ds: Dataset, r: Rango, f: Filtros): Punto[] {
  const g = granularidad(r)
  const eje = ejeTemporal(r, g)
  const ev = new Map<string, number>(), vol = new Map<string, number>()
  const key = (d: string) => (g === "semana" ? inicioSemana(d) : d)
  for (const e of ds.eventos) {
    if (!enRango(e.d, r) || !okArea(e.area, f) || (f.puesto && e.puesto !== f.puesto)) continue
    ev.set(key(e.d), (ev.get(key(e.d)) ?? 0) + e.cantidad)
  }
  registrosBase(ds, r, f, { clave: key, m: vol })
  return eje.map(x => { const v = vol.get(x); return { x, v: v ? ((ev.get(x) ?? 0) / v) * 1000 : null } })
}

// ─── Facturación ─────────────────────────────────────────────────────────────

export interface Tarifa { consumible: string; precio: number; moneda: string; unidad?: string | null; vigenteDesde?: string | null; vigenteHasta?: string | null }

export interface LineaFactura { mes: string; consumible: string; unidades: number; precio: number | null; importe: number | null }

function tarifaPara(tarifas: Tarifa[], consumible: string, dia: string): Tarifa | null {
  const vigente = (t: Tarifa) => (!t.vigenteDesde || dia >= t.vigenteDesde) && (!t.vigenteHasta || dia <= t.vigenteHasta)
  return tarifas.find(t => t.consumible === consumible && vigente(t)) ?? tarifas.find(t => t.consumible === "*" && vigente(t)) ?? null
}

/**
 * Consumo × tarifa vigente el día de consumo, agrupado por mes, consumible y precio.
 * Si la tarifa cambia a mitad de mes salen dos líneas (antes se mezclaban en una con el
 * último precio y unidades × precio no cuadraba con el importe). El importe de cada
 * línea se redondea a céntimos y el total es la suma de líneas, como en una factura.
 */
export function facturacion(ds: Dataset, r: Rango, f: Filtros, tarifas: Tarifa[]): LineaFactura[] {
  const m = new Map<string, LineaFactura>()
  for (const c of ds.consumo) {
    if (!enRango(c.d, r) || !okArea(c.area, f) || (f.consumible && c.consumible !== f.consumible) || !okUrg(c.urg, f)) continue
    const mes = c.d.slice(0, 7)
    const t = tarifaPara(tarifas, c.consumible, c.d)
    // Prisma Decimal llega como string en JSON: se fuerza a número
    const precio = t ? Number(t.precio) : null
    const k = `${mes}|${c.consumible}|${precio ?? ""}`
    const l = m.get(k) ?? { mes, consumible: c.consumible, unidades: 0, precio, importe: null }
    l.unidades += c.unidades
    m.set(k, l)
  }
  for (const l of m.values()) l.importe = l.precio === null ? null : Math.round(l.unidades * l.precio * 100) / 100
  return [...m.values()].sort((a, b) => a.mes.localeCompare(b.mes) || b.unidades - a.unidades || (a.precio ?? 0) - (b.precio ?? 0))
}

/** Total de una factura: suma de líneas en céntimos enteros (sin error de coma flotante). */
export function totalImporte(lineas: LineaFactura[]): number {
  return lineas.reduce((s, l) => s + Math.round((l.importe ?? 0) * 100), 0) / 100
}

// ─── Cobertura ───────────────────────────────────────────────────────────────

/** Días sin datos dentro de [desde, hasta]. */
export function huecos(dias: string[], r: Rango): string[] {
  const set = new Set(dias)
  const out: string[] = []
  for (let d = r.desde; d <= r.hasta; d = addDias(d, 1)) if (!set.has(d)) out.push(d)
  return out
}
