/**
 * Formato compacto de agregados InLab (v1).
 *
 * Se usa en los dos sentidos:
 *   navegador → POST /api/inlab/cargas      (resultado del parseo del CSV)
 *   servidor  → GET  /api/inlab/datos       (agregados de un rango para el dashboard)
 *
 * Las cadenas van en diccionarios y las filas son tuplas de números para que
 * el payload sea pequeño. NO contiene filas crudas ni identificadores de órdenes.
 */

export const TRAMOS = ["PET_EXT", "EXT_REC", "REC_VAL", "TOTAL"] as const
export type Tramo = typeof TRAMOS[number]

export const TRAMO_LABEL: Record<Tramo, string> = {
  PET_EXT: "Petición → extracción",
  EXT_REC: "Extracción → recepción",
  REC_VAL: "Recepción → validación",
  TOTAL: "Ciclo completo",
}

export interface InlabDiccionario {
  areas: string[]
  puestos: string[]
  consumibles: string[]
  impresoras: string[]
  /** texto original del evento (detalle), la categoría va aparte */
  eventos: string[]
}

export interface InlabPayload {
  v: 1
  dic: InlabDiccionario
  /** días presentes (YYYY-MM-DD), ordenados */
  dias: string[]
  /** [dia, area, consumible, urgente(0|1), unidades, registros] */
  consumo: number[][]
  /** [dia, area, puesto, registros, unidades, urgentes, eventos] */
  puestos: number[][]
  /** [dia, area, registros, unidades, urgentes, ordenes(-1 = sin dato), h0..h23] */
  actividad: number[][]
  /** [dia, area, urgente(0|1), tramo(idx TRAMOS), n, sumaMin, maxMin, ...pares (bucket, cuenta)] */
  tiempos: number[][]
  /** [dia, area, puesto(-1), impresora(-1), categoria(idx EVENTO_CATEGORIAS), detalle(-1), cantidad] */
  eventos: number[][]
}

export interface InlabResumenCarga {
  fichero: string
  tamanoBytes: number
  hash: string
  filas: number
  filasValidas: number
  filasDescartadas: number
  desde: string
  hasta: string
  avisos: string[]
}

export function payloadVacio(): InlabPayload {
  return { v: 1, dic: { areas: [], puestos: [], consumibles: [], impresoras: [], eventos: [] }, dias: [], consumo: [], puestos: [], actividad: [], tiempos: [], eventos: [] }
}

/** Número de filas agregadas (para mostrar y para límites). */
export function tamanoPayload(p: InlabPayload): number {
  return p.consumo.length + p.puestos.length + p.actividad.length + p.tiempos.length + p.eventos.length
}

// ─── Límites (compartidos cliente/servidor) ──────────────────────────────────
export const LIMITES = {
  /** bytes del cuerpo JSON aceptado en POST /api/inlab/cargas */
  maxBodyBytes: 25 * 1024 * 1024,
  maxDias: 3700,
  maxFilasPorTabla: 400_000,
  maxDiccionario: 5000,
  maxTextoDimension: 80,
}
