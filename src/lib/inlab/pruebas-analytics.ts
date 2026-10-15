/**
 * Cálculos de la pestaña «Pruebas» (cliente, puro). Mismo patrón que analytics.ts: se pide
 * una vez toda la cobertura (/api/inlab/pruebas) y cada periodo se deriva con recortarPruebas.
 *
 * Medida: «peticiones que incluyen la prueba» (cada prueba una vez por petición; los perfiles
 * —Hemograma, Coagulación…— cuentan como una prueba). Ver lib/inlab/pruebas.ts.
 * Filtros que aplican: work areas y prioridad. Tubo y puesto no: una prueba no tiene tubo
 * ni puesto propios en InLab.
 */
import { addDias, inicioSemana } from "./dates"
import { comparacion, delta, ejeTemporal, granularidad, type Comparacion, type Filtros, type Punto, type Rango } from "./analytics"
import type { InlabPruebasPayload } from "./types"

export interface FilaPrueba { d: string; area: string; urg: boolean; prueba: string; n: number }
export interface FilaPeticionesPrueba { d: string; area: string; urg: boolean; n: number }
export interface InfoPrueba { seccion: string; parametros: number }

export interface DatasetPruebas {
  /** días con pruebas cargadas */
  dias: string[]
  filas: FilaPrueba[]
  /** peticiones con al menos una prueba (denominador) */
  peticiones: FilaPeticionesPrueba[]
  info: Map<string, InfoPrueba>
}

export function decodificarPruebas(p: InlabPruebasPayload): DatasetPruebas {
  const { nombres, secciones, info, filas, peticiones } = p.pruebas
  const D = p.dias, A = p.areas
  const mapa = new Map<string, InfoPrueba>()
  nombres.forEach((n, i) => mapa.set(n, { seccion: secciones[info[i]?.[0]] ?? "Otras", parametros: info[i]?.[1] ?? 1 }))
  return {
    dias: D,
    filas: filas.map(r => ({ d: D[r[0]], area: A[r[1]], urg: r[2] === 1, prueba: nombres[r[3]], n: r[4] })),
    peticiones: peticiones.map(r => ({ d: D[r[0]], area: A[r[1]], urg: r[2] === 1, n: r[3] })),
    info: mapa,
  }
}

export function recortarPruebas(dp: DatasetPruebas, v: Rango): DatasetPruebas {
  const n = dp.dias.length
  if (n === 0 || (dp.dias[0] >= v.desde && dp.dias[n - 1] <= v.hasta)) return dp
  const en = (x: { d: string }) => x.d >= v.desde && x.d <= v.hasta
  return { dias: dp.dias.filter(d => d >= v.desde && d <= v.hasta), filas: dp.filas.filter(en), peticiones: dp.peticiones.filter(en), info: dp.info }
}

const enRango = (d: string, r: Rango) => d >= r.desde && d <= r.hasta
/** Work areas y prioridad (tubo y puesto no aplican a las pruebas). */
const pasa = (x: { d: string; area: string; urg: boolean }, r: Rango, f: Filtros, ignorarAreas = false) =>
  enRango(x.d, r) && (ignorarAreas || f.areas.length === 0 || f.areas.includes(x.area)) && (f.urgencia === "todas" || (f.urgencia === "urgente") === x.urg)

// ─── KPIs ────────────────────────────────────────────────────────────────────

export interface KpisPruebas {
  dias: number
  /** pruebas solicitadas (suma de peticiones × prueba; un perfil = 1) */
  solicitadas: number
  /** peticiones con al menos una prueba */
  peticiones: number
  porPeticion: number | null
  /** pruebas o perfiles distintos pedidos */
  distintas: number
  /** % de pruebas solicitadas en peticiones urgentes */
  pctUrgentes: number | null
}

export function kpisPruebas(dp: DatasetPruebas, r: Rango, f: Filtros): KpisPruebas {
  let solicitadas = 0, urgentes = 0, peticiones = 0
  const distintas = new Set<string>()
  for (const x of dp.filas) {
    if (!pasa(x, r, f)) continue
    solicitadas += x.n
    if (x.urg) urgentes += x.n
    distintas.add(x.prueba)
  }
  for (const x of dp.peticiones) if (pasa(x, r, f)) peticiones += x.n
  let dias = 0
  for (const d of dp.dias) if (enRango(d, r)) dias++
  return {
    dias, solicitadas, peticiones, distintas: distintas.size,
    porPeticion: peticiones ? solicitadas / peticiones : null,
    pctUrgentes: solicitadas ? (urgentes / solicitadas) * 100 : null,
  }
}

export interface TendenciasPruebas {
  cmp: Comparacion
  /** variaciones en %, por día con datos (null = no comparable) */
  solicitadas: number | null
  peticiones: number | null
  porPeticion: number | null
  /** factor para llevar volúmenes del periodo anterior a los días con datos del actual (0 = no comparable) */
  escala: number
}

/** Igual que tendencias() del resto del dashboard: solo con cobertura comparable y por día con datos. */
export function tendenciasPruebas(dp: DatasetPruebas, r: Rango, f: Filtros): TendenciasPruebas {
  const cmp = comparacion(dp, r)
  if (!cmp.comparable) return { cmp, solicitadas: null, peticiones: null, porPeticion: null, escala: 0 }
  const k = kpisPruebas(dp, r, f), p = kpisPruebas(dp, cmp.anterior, f)
  const escala = p.dias ? k.dias / p.dias : 0
  return {
    cmp, escala,
    solicitadas: delta(k.solicitadas, p.solicitadas * escala),
    peticiones: delta(k.peticiones, p.peticiones * escala),
    porPeticion: delta(k.porPeticion, p.porPeticion),
  }
}

// ─── Ranking y desgloses ─────────────────────────────────────────────────────

export interface ItemPrueba {
  prueba: string
  seccion: string
  /** >1 = perfil que agrupa ese nº de parámetros */
  parametros: number
  /** peticiones que la incluyen */
  n: number
  /** % de las peticiones con pruebas que la incluyen */
  pct: number | null
  urgentes: number
  /** variación por día con datos frente al periodo anterior (null si no comparable o poco volumen) */
  delta: number | null
}

/** Volumen mínimo (en el periodo anterior, ya escalado) para calcular la variación de una prueba. */
export const MIN_PREVIO_TENDENCIA = 20

export function rankingPruebas(dp: DatasetPruebas, r: Rango, f: Filtros): ItemPrueba[] {
  const actual = new Map<string, { n: number; urg: number }>()
  for (const x of dp.filas) {
    if (!pasa(x, r, f)) continue
    const a = actual.get(x.prueba) ?? { n: 0, urg: 0 }
    a.n += x.n
    if (x.urg) a.urg += x.n
    actual.set(x.prueba, a)
  }
  let peticiones = 0
  for (const x of dp.peticiones) if (pasa(x, r, f)) peticiones += x.n
  const t = tendenciasPruebas(dp, r, f)
  const previo = new Map<string, number>()
  if (t.escala) for (const x of dp.filas) if (pasa(x, t.cmp.anterior, f)) previo.set(x.prueba, (previo.get(x.prueba) ?? 0) + x.n)
  return [...actual.entries()]
    .map(([prueba, a]) => {
      const info = dp.info.get(prueba)
      const p = (previo.get(prueba) ?? 0) * t.escala
      return {
        prueba, seccion: info?.seccion ?? "Otras", parametros: info?.parametros ?? 1, n: a.n, urgentes: a.urg,
        pct: peticiones ? (a.n / peticiones) * 100 : null,
        delta: t.escala && p >= MIN_PREVIO_TENDENCIA ? delta(a.n, p) : null,
      }
    })
    .sort((a, b) => b.n - a.n || a.prueba.localeCompare(b.prueba, "es"))
}

export function porSeccion(ranking: ItemPrueba[]): { seccion: string; n: number; pruebas: number }[] {
  const m = new Map<string, { n: number; pruebas: number }>()
  for (const it of ranking) {
    const s = m.get(it.seccion) ?? { n: 0, pruebas: 0 }
    s.n += it.n; s.pruebas++
    m.set(it.seccion, s)
  }
  return [...m.entries()].map(([seccion, v]) => ({ seccion, ...v })).sort((a, b) => b.n - a.n)
}

/** Pruebas que más suben y más bajan (con volumen suficiente para que el % signifique algo). */
export function cambiosPruebas(ranking: ItemPrueba[], limite = 5): { suben: ItemPrueba[]; bajan: ItemPrueba[] } {
  const con = ranking.filter(it => it.delta !== null)
  return {
    suben: con.filter(it => it.delta! > 0).sort((a, b) => b.delta! - a.delta!).slice(0, limite),
    bajan: con.filter(it => it.delta! < 0).sort((a, b) => a.delta! - b.delta!).slice(0, limite),
  }
}

/**
 * Serie de una prueba (o del total de pruebas solicitadas si `prueba` es null), diaria o
 * semanal según el rango. Días/semanas sin datos cargados = null (hueco, no cero).
 */
export function seriePrueba(dp: DatasetPruebas, r: Rango, f: Filtros, prueba: string | null): Punto[] {
  const g = granularidad(r)
  const clave = (d: string) => (g === "semana" ? inicioSemana(d) : d)
  const acc = new Map<string, number>()
  for (const x of dp.filas) {
    if ((prueba && x.prueba !== prueba) || !pasa(x, r, f)) continue
    const k = clave(x.d)
    acc.set(k, (acc.get(k) ?? 0) + x.n)
  }
  const conDatos = new Set(dp.dias)
  return ejeTemporal(r, g).map(x => {
    const v = acc.get(x)
    if (v !== undefined) return { x, v }
    if (g === "dia") return { x, v: conDatos.has(x) ? 0 : null }
    for (let i = 0; i < 7; i++) if (conDatos.has(addDias(x, i))) return { x, v: 0 }
    return { x, v: null }
  })
}

/**
 * Una prueba por work area: peticiones que la incluyen y qué % de las peticiones con pruebas
 * de esa área la piden. Ignora el filtro de áreas (para comparar áreas entre sí).
 */
export function pruebaPorArea(dp: DatasetPruebas, r: Rango, f: Filtros, prueba: string): { area: string; n: number; pct: number | null }[] {
  const n = new Map<string, number>(), tot = new Map<string, number>()
  for (const x of dp.filas) if (x.prueba === prueba && pasa(x, r, f, true)) n.set(x.area, (n.get(x.area) ?? 0) + x.n)
  for (const x of dp.peticiones) if (pasa(x, r, f, true)) tot.set(x.area, (tot.get(x.area) ?? 0) + x.n)
  return [...n.entries()]
    .map(([area, v]) => ({ area, n: v, pct: tot.get(area) ? (v / tot.get(area)!) * 100 : null }))
    .sort((a, b) => b.n - a.n)
}
