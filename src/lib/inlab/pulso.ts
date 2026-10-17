/**
 * Cálculos de la pantalla «Pulso» de InLab Analytics (cliente, puro). Reutiliza el Dataset y
 * el DatasetPruebas que ya tiene el dashboard: no hay datos nuevos, solo otras lecturas.
 *
 *   relojDia      tubos y etiquetas por hora de un día medio (laborable / fin de semana) o de
 *                 un día concreto, apilados por work area — el «reloj de 24 horas»
 *   actividadPorDia  peticiones (o tubos) de cada día cargado — el calendario del año
 *   resumenDia    lo esencial de un día elegido en el calendario
 *   flujoPruebas  work areas → secciones del laboratorio → pruebas — el «río» (Sankey)
 *
 * Igual que el mapa de calor, la actividad por hora es de tubos y etiquetas impresos (InLab no
 * guarda la hora de la petición) y no está desglosada por prioridad ni por tipo de tubo.
 */
import { diaSemana } from "./dates"
import { peticionesDisponibles, type Dataset, type Filtros, type Rango } from "./analytics"
import type { DatasetPruebas } from "./pruebas-analytics"

export const OTRAS_AREAS = "Otras áreas"
export const OTRAS_SECCIONES = "Otras secciones"
export const RESTO_PRUEBAS = "Resto de pruebas"

const enRango = (d: string, r: Rango) => d >= r.desde && d <= r.hasta
const okArea = (area: string, f: Filtros) => f.areas.length === 0 || f.areas.includes(area)
const okUrg = (urg: boolean, f: Filtros) => f.urgencia === "todas" || (f.urgencia === "urgente") === urg

// ─── Ranking de áreas (orden y colores comunes a toda la pantalla) ───────────

/**
 * Áreas seleccionadas ordenadas por volumen en el rango (peticiones si las hay, si no tubos).
 * Las primeras `max` tienen color propio en el reloj y en el río; el resto va a «Otras áreas».
 */
export function rankingAreas(ds: Dataset, r: Rango, f: Filtros): { area: string; v: number }[] {
  const conPet = ds.actividad.some(a => a.ordenes !== null)
  const m = new Map<string, number>()
  for (const a of ds.actividad) {
    if (!enRango(a.d, r) || !okArea(a.area, f)) continue
    m.set(a.area, (m.get(a.area) ?? 0) + (conPet ? a.ordenes ?? 0 : a.unidades))
  }
  return [...m.entries()].map(([area, v]) => ({ area, v })).sort((a, b) => b.v - a.v || a.area.localeCompare(b.area, "es"))
}

// ─── Reloj de 24 horas ───────────────────────────────────────────────────────

export type ModoReloj = { tipo: "laborable" } | { tipo: "finde" } | { tipo: "dia"; d: string }

export interface HoraReloj {
  h: number
  /** tubos y etiquetas de esa hora (media por día del tipo elegido) */
  total: number
  /** por grupo de área, en el orden de `Reloj.grupos` */
  v: number[]
}

export interface Reloj {
  /** áreas con color propio + «Otras áreas» si hay más */
  grupos: string[]
  horas: HoraReloj[]
  /** días promediados (1 en modo día; 0 = sin datos) */
  dias: number
  /** tubos y etiquetas de un día medio */
  total: number
  max: number
  pico: { h: number; v: number; pct: number } | null
  /** las dos horas seguidas con más actividad */
  ventanaPico: { desde: number; pct: number } | null
  /** hora (decimal) a la que se ha hecho la mitad del trabajo del día */
  mitadA: number | null
  /** hora (decimal) en la que empieza / termina el 90 % central de la actividad */
  inicio: number | null
  fin: number | null
}

/** Hora decimal en la que el acumulado alcanza la fracción `p` del total (interpolada dentro de la hora). */
function horaDeFraccion(totales: number[], total: number, p: number): number | null {
  if (total <= 0) return null
  const objetivo = total * p
  let acc = 0
  for (let h = 0; h < 24; h++) {
    const v = totales[h]
    if (v > 0 && acc + v >= objetivo) return h + (objetivo - acc) / v
    acc += v
  }
  return 24
}

/**
 * Tubos y etiquetas por hora de un día medio del rango (o de un día concreto, que puede estar
 * fuera del rango: el calendario abarca toda la cobertura). Respeta las work areas; los días
 * medios cuentan los días cargados de ese tipo, como el mapa de calor.
 */
export function relojDia(ds: Dataset, r: Rango, f: Filtros, modo: ModoReloj, ranking: string[], maxAreas = 5): Reloj {
  const propias = ranking.slice(0, maxAreas)
  const grupos = ranking.length > maxAreas ? [...propias, OTRAS_AREAS] : propias
  const idxGrupo = new Map(propias.map((a, i) => [a, i]))
  const otras = propias.length
  const quiere = (d: string) => {
    if (modo.tipo === "dia") return d === modo.d
    if (!enRango(d, r)) return false
    const dow = diaSemana(d)
    return modo.tipo === "finde" ? dow >= 5 : dow < 5
  }
  let dias = 0
  for (const d of ds.dias) if (quiere(d)) dias++
  const horas: HoraReloj[] = Array.from({ length: 24 }, (_, h) => ({ h, total: 0, v: new Array(grupos.length).fill(0) }))
  if (dias === 0) return { grupos, horas, dias: 0, total: 0, max: 0, pico: null, ventanaPico: null, mitadA: null, inicio: null, fin: null }
  for (const a of ds.actividad) {
    if (!quiere(a.d) || !okArea(a.area, f)) continue
    const g = idxGrupo.get(a.area) ?? otras
    if (g >= grupos.length) continue
    for (let h = 0; h < 24; h++) {
      const v = a.porHora[h] ?? 0
      if (v) { horas[h].v[g] += v; horas[h].total += v }
    }
  }
  let total = 0, max = 0
  for (const x of horas) {
    x.total /= dias
    for (let i = 0; i < x.v.length; i++) x.v[i] /= dias
    total += x.total
    if (x.total > max) max = x.total
  }
  const tot = horas.map(x => x.total)
  let pico: Reloj["pico"] = null
  for (const x of horas) if (x.total > 0 && (!pico || x.total > pico.v)) pico = { h: x.h, v: x.total, pct: total ? (x.total / total) * 100 : 0 }
  let ventanaPico: Reloj["ventanaPico"] = null
  for (let h = 0; h < 23; h++) {
    const v = tot[h] + tot[h + 1]
    if (v > 0 && (!ventanaPico || v > (ventanaPico.pct * total) / 100)) ventanaPico = { desde: h, pct: total ? (v / total) * 100 : 0 }
  }
  return {
    grupos, horas, dias, total, max, pico, ventanaPico,
    mitadA: horaDeFraccion(tot, total, 0.5),
    inicio: horaDeFraccion(tot, total, 0.05),
    fin: horaDeFraccion(tot, total, 0.95),
  }
}

/** 10.666 → "10:40" */
export function fmtHora(h: number | null): string {
  if (h === null || !isFinite(h)) return "—"
  const total = Math.round(h * 60)
  const hh = Math.floor(total / 60) % 24, mm = total % 60
  return `${hh}:${String(mm).padStart(2, "0")}`
}

// ─── Calendario del año ──────────────────────────────────────────────────────

export interface DiaActividad {
  d: string
  /** null si la exportación no trae nº de petición */
  peticiones: number | null
  tubos: number
}

/** Actividad de cada día cargado (con las work areas seleccionadas), para el calendario. */
export function actividadPorDia(ds: Dataset, f: Filtros): Map<string, DiaActividad> {
  const conPet = ds.actividad.some(a => a.ordenes !== null)
  const m = new Map<string, DiaActividad>()
  for (const d of ds.dias) m.set(d, { d, peticiones: conPet ? 0 : null, tubos: 0 })
  for (const a of ds.actividad) {
    if (!okArea(a.area, f)) continue
    const x = m.get(a.d)
    if (!x) continue
    x.tubos += a.unidades
    if (x.peticiones !== null) x.peticiones += a.ordenes ?? 0
  }
  return m
}

/** Valor que pinta el calendario: peticiones si las hay, si no tubos y etiquetas. */
export const valorDia = (x: DiaActividad | undefined) => (x ? x.peticiones ?? x.tubos : 0)

/**
 * Umbrales de intensidad (4 niveles) por cuantiles de los días con actividad. Con cuantiles
 * los fines de semana (casi vacíos) no aplastan la escala de los laborables.
 */
export function nivelesCalendario(valores: number[]): number[] {
  const v = valores.filter(x => x > 0).sort((a, b) => a - b)
  if (v.length === 0) return [1, 2, 3, 4]
  const q = (p: number) => v[Math.min(v.length - 1, Math.floor(p * v.length))]
  return [q(0.2), q(0.45), q(0.7), q(0.9)]
}

export function nivelDe(v: number, umbrales: number[]): number {
  if (v <= 0) return 0
  let n = 1
  for (const u of umbrales) if (v > u) n++
  return Math.min(n, 5)
}

export interface ResumenDia {
  d: string
  peticiones: number | null
  tubos: number
  /** % de tubos y etiquetas urgentes */
  pctUrgentes: number | null
  pruebas: number | null
  areaPrincipal: { area: string; pct: number } | null
  /** variación frente a la media de ese día de la semana en los días cargados (%) */
  frenteAMedia: number | null
}

export function resumenDia(ds: Dataset, dp: DatasetPruebas | null, d: string, f: Filtros): ResumenDia {
  const conPet = peticionesDisponibles(ds, { ...f, urgencia: "todas", consumible: null })
  let tubos = 0, urg = 0, peticiones = 0
  const porArea = new Map<string, number>()
  for (const a of ds.actividad) {
    if (a.d !== d || !okArea(a.area, f)) continue
    tubos += a.unidades; urg += a.urgentes; peticiones += a.ordenes ?? 0
    porArea.set(a.area, (porArea.get(a.area) ?? 0) + (conPet ? a.ordenes ?? 0 : a.unidades))
  }
  const base = conPet ? peticiones : tubos
  let top: ResumenDia["areaPrincipal"] = null
  for (const [area, v] of porArea) if (v > 0 && (!top || v > (top.pct * base) / 100)) top = { area, pct: base ? (v / base) * 100 : 0 }
  // Media del mismo día de la semana (días cargados)
  const dow = diaSemana(d)
  const porDia = actividadPorDia(ds, f)
  let suma = 0, n = 0
  for (const [dd, x] of porDia) if (dd !== d && diaSemana(dd) === dow) { suma += valorDia(x); n++ }
  const media = n ? suma / n : 0
  let pruebas: number | null = null
  if (dp && dp.dias.includes(d)) {
    pruebas = 0
    for (const x of dp.filas) if (x.d === d && okArea(x.area, f) && okUrg(x.urg, f)) pruebas += x.n
  }
  return {
    d, tubos, peticiones: conPet ? peticiones : null,
    pctUrgentes: tubos ? (urg / tubos) * 100 : null,
    pruebas, areaPrincipal: top,
    frenteAMedia: media > 0 && n >= 2 ? ((base - media) / media) * 100 : null,
  }
}

// ─── El río: áreas → secciones → pruebas ─────────────────────────────────────

export interface NodoFlujo {
  clave: string
  v: number
  /** nodo que agrupa el resto («Otras áreas», «Resto de pruebas»…) */
  agrupa?: number
  /** sección de la prueba (solo nodos de prueba) */
  seccion?: string
}

export interface FlujoPruebas {
  areas: NodoFlujo[]
  secciones: NodoFlujo[]
  pruebas: NodoFlujo[]
  /** cubo[area][seccion][prueba] = pruebas solicitadas (índices de los nodos) */
  cubo: number[][][]
  /** pruebas solicitadas en total */
  total: number
}

/**
 * Pruebas solicitadas del periodo (work areas y prioridad) agrupadas en tres columnas:
 * las `maxAreas` áreas, `maxSecciones` secciones y `maxPruebas` pruebas con más volumen, y
 * un nodo «otras» en cada columna con el resto. El cubo área × sección × prueba permite
 * resaltar recorridos completos (p. ej. qué áreas piden el Colesterol).
 */
export function flujoPruebas(dp: DatasetPruebas, r: Rango, f: Filtros, opts: { maxAreas?: number; maxSecciones?: number; maxPruebas?: number } = {}): FlujoPruebas {
  const { maxAreas = 6, maxSecciones = 6, maxPruebas = 12 } = opts
  const porArea = new Map<string, number>(), porSec = new Map<string, number>(), porPrueba = new Map<string, number>()
  const celdas = new Map<string, Map<string, number>>() // área → prueba → n
  let total = 0
  const seccion = (p: string) => dp.info.get(p)?.seccion ?? "Otras"
  for (const x of dp.filas) {
    if (!enRango(x.d, r) || !okArea(x.area, f) || !okUrg(x.urg, f)) continue
    total += x.n
    porArea.set(x.area, (porArea.get(x.area) ?? 0) + x.n)
    porPrueba.set(x.prueba, (porPrueba.get(x.prueba) ?? 0) + x.n)
    const s = seccion(x.prueba)
    porSec.set(s, (porSec.get(s) ?? 0) + x.n)
    let c = celdas.get(x.area)
    if (!c) { c = new Map(); celdas.set(x.area, c) }
    c.set(x.prueba, (c.get(x.prueba) ?? 0) + x.n)
  }
  const ordenar = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
  const top = (lista: [string, number][], max: number, otros: string): { nodos: NodoFlujo[]; idx: Map<string, number>; resto: number } => {
    // Con un solo valor de sobra no merece un nodo «otros»: se muestra tal cual
    if (lista.length <= max + 1) return { nodos: lista.map(([clave, v]) => ({ clave, v })), idx: new Map(lista.map(([k], i) => [k, i])), resto: -1 }
    const propios = lista.slice(0, max)
    const resto = lista.slice(max)
    const nodos: NodoFlujo[] = [...propios.map(([clave, v]) => ({ clave, v })), { clave: otros, v: resto.reduce((s, x) => s + x[1], 0), agrupa: resto.length }]
    return { nodos, idx: new Map(propios.map(([k], i) => [k, i])), resto: max }
  }
  const A = top(ordenar(porArea), maxAreas, OTRAS_AREAS)
  const S = top(ordenar(porSec), maxSecciones, OTRAS_SECCIONES)
  const iSec = (s: string) => S.idx.get(s) ?? S.resto
  // Pruebas: las de más volumen, agrupadas por sección (orden de la columna central) para
  // que los enlaces sección → prueba no se crucen
  const listaP = ordenar(porPrueba)
  const propiasP = listaP.length <= maxPruebas + 1 ? listaP : listaP.slice(0, maxPruebas)
  const restoP = listaP.slice(propiasP.length)
  propiasP.sort((a, b) => iSec(seccion(a[0])) - iSec(seccion(b[0])) || b[1] - a[1])
  const pruebas: NodoFlujo[] = propiasP.map(([clave, v]) => ({ clave, v, seccion: seccion(clave) }))
  const idxP = new Map(propiasP.map(([k], i) => [k, i]))
  if (restoP.length) pruebas.push({ clave: RESTO_PRUEBAS, v: restoP.reduce((s, x) => s + x[1], 0), agrupa: restoP.length })
  const iResto = restoP.length ? pruebas.length - 1 : -1
  const cubo = A.nodos.map(() => S.nodos.map(() => new Array(pruebas.length).fill(0)))
  for (const [area, c] of celdas) {
    const ia = A.idx.get(area) ?? A.resto
    for (const [p, n] of c) {
      const ip = idxP.get(p) ?? iResto
      cubo[ia][iSec(seccion(p))][ip] += n
    }
  }
  return { areas: A.nodos, secciones: S.nodos, pruebas, cubo, total }
}
