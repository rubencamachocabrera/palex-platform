/**
 * Enlaces públicos del informe InLab (/share/inlab/[token]).
 *
 * El token es la única credencial: la API pública solo entrega agregados del
 * periodo y de las work areas del enlace. El recorte por áreas se hace en el
 * servidor (filtrarPayloadPorAreas) — el navegador del cliente nunca recibe
 * filas ni nombres de puestos/consumibles/impresoras de áreas no incluidas.
 */
import type { InlabPayload, InlabPruebasPayload } from "./types"
import { etiquetaArea } from "./analytics"

/** Caducidades ofrecidas al crear un enlace (días; null = sin caducidad). */
export const CADUCIDADES_SHARE: { dias: number | null; label: string }[] = [
  { dias: 7, label: "7 días" },
  { dias: 30, label: "30 días" },
  { dias: 90, label: "90 días" },
  { dias: null, label: "Sin caducidad" },
]

export type EstadoShare = "activo" | "caducado" | "revocado"

export function estadoShare(s: { revocado: boolean; expiraEn: string | Date | null }, ahora = Date.now()): EstadoShare {
  if (s.revocado) return "revocado"
  if (s.expiraEn && new Date(s.expiraEn).getTime() <= ahora) return "caducado"
  return "activo"
}

/** Diccionario reindexado: solo las entradas que se usan, en orden de primera aparición. */
class Reindexador {
  readonly salida: string[] = []
  private mapa = new Map<number, number>()
  constructor(private origen: string[]) {}
  /** -1 se conserva (dimensión opcional sin dato). */
  idx(viejo: number): number {
    if (viejo < 0) return -1
    let n = this.mapa.get(viejo)
    if (n === undefined) {
      n = this.salida.length
      this.salida.push(this.origen[viejo] ?? "")
      this.mapa.set(viejo, n)
    }
    return n
  }
}

/**
 * Deja en el payload solo las filas de las work areas indicadas y reconstruye los
 * diccionarios con las entradas que siguen en uso. `dias` no se toca: los "días con
 * datos" del dashboard cuentan días cargados de cualquier área (un día sin actividad
 * en el área filtrada es un 0 real), así el informe compartido da exactamente las
 * mismas cifras que el dashboard con ese filtro de áreas.
 *
 * `areas` vacío = todas (payload sin cambios).
 */
export function filtrarPayloadPorAreas(p: InlabPayload, areas: string[]): InlabPayload {
  if (!areas.length) return p
  const permitidas = new Set(areas)
  const ok = p.dic.areas.map(a => permitidas.has(a))
  const A = new Reindexador(p.dic.areas), P = new Reindexador(p.dic.puestos), C = new Reindexador(p.dic.consumibles)
  const I = new Reindexador(p.dic.impresoras), E = new Reindexador(p.dic.eventos)
  const conArea = (r: number[]) => r[1] >= 0 && ok[r[1]]

  const consumo = p.consumo.filter(conArea).map(r => { const x = r.slice(); x[1] = A.idx(r[1]); x[2] = C.idx(r[2]); return x })
  const puestos = p.puestos.filter(conArea).map(r => { const x = r.slice(); x[1] = A.idx(r[1]); x[2] = P.idx(r[2]); return x })
  const actividad = p.actividad.filter(conArea).map(r => { const x = r.slice(); x[1] = A.idx(r[1]); return x })
  const tiempos = p.tiempos.filter(conArea).map(r => { const x = r.slice(); x[1] = A.idx(r[1]); return x })
  const eventos = p.eventos.filter(conArea).map(r => {
    const x = r.slice()
    x[1] = A.idx(r[1]); x[2] = P.idx(r[2]); x[3] = I.idx(r[3]); x[5] = E.idx(r[5])
    return x
  })

  return {
    v: p.v,
    dic: { areas: A.salida, puestos: P.salida, consumibles: C.salida, impresoras: I.salida, eventos: E.salida },
    dias: p.dias,
    consumo, puestos, actividad, tiempos, eventos,
  }
}

/**
 * Mínimo de peticiones de una prueba en todo el periodo compartido para que salga en un
 * informe público: una prueba poco frecuente (VIH, tóxicos…) con 1–4 peticiones, cruzada con
 * día y área, podría señalar a un paciente concreto.
 */
export const MIN_PETICIONES_PRUEBA_SHARE = 5

/**
 * Pruebas de un informe público: solo las work areas del enlace (vacío = todas) y sin las
 * pruebas con menos de MIN_PETICIONES_PRUEBA_SHARE peticiones en el periodo (de esas áreas).
 * Diccionarios reindexados: no salen nombres de pruebas excluidas.
 */
export function filtrarPruebasParaShare(p: InlabPruebasPayload, areas: string[]): InlabPruebasPayload {
  const permitidas = new Set(areas)
  const okArea = p.areas.map(a => !areas.length || permitidas.has(a))
  const totales = new Map<number, number>()
  for (const r of p.pruebas.filas) if (okArea[r[1]]) totales.set(r[3], (totales.get(r[3]) ?? 0) + r[4])
  const A = new Reindexador(p.areas), N = new Reindexador(p.pruebas.nombres), S = new Reindexador(p.pruebas.secciones)
  const info: number[][] = []
  const filas = p.pruebas.filas
    .filter(r => okArea[r[1]] && (totales.get(r[3]) ?? 0) >= MIN_PETICIONES_PRUEBA_SHARE)
    .map(r => {
      const n = N.idx(r[3])
      if (!info[n]) { const [s, par] = p.pruebas.info[r[3]]; info[n] = [S.idx(s), par] }
      return [r[0], A.idx(r[1]), r[2], n, r[4]]
    })
  const peticiones = p.pruebas.peticiones.filter(r => okArea[r[1]]).map(r => [r[0], A.idx(r[1]), r[2], r[3]])
  return { dias: p.dias, areas: A.salida, pruebas: { nombres: N.salida, secciones: S.salida, info, filas, peticiones } }
}

/** Texto corto del alcance de áreas de un enlace. */
export function etiquetaAreasShare(areas: string[]): string {
  if (!areas.length) return "Todas las work areas"
  if (areas.length <= 2) return areas.map(etiquetaArea).join(" · ")
  return `${areas.length} work areas`
}
