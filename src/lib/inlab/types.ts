/**
 * Formato compacto de agregados InLab (v2).
 *
 * Se usa en los dos sentidos:
 *   navegador → POST /api/inlab/cargas      (resultado del parseo del CSV)
 *   servidor  → GET  /api/inlab/datos       (agregados de un rango para el dashboard)
 *
 * v2: buckets de histograma más finos (histogram.ts). Un navegador con el código v1
 * en caché enviaría índices de bucket antiguos: el servidor lo rechaza por la versión.
 *
 * Las cadenas van en diccionarios y las filas son tuplas de números para que
 * el payload sea pequeño. NO contiene filas crudas ni identificadores de órdenes.
 */

/**
 * Tramos del flujo InLab (el índice viaja en el payload; el código se guarda en BD):
 *   ESPERA     llegada del paciente → numeración del pedido   (por pedido)
 *   EXTRACCION numeración → validación de la extracción       (por pedido)
 *   TUBO       impresión del tubo → validación del tubo       (por tubo)
 *   TOTAL      llegada (o numeración, o petición) → validación (por pedido)
 */
export const TRAMOS = ["ESPERA", "EXTRACCION", "TUBO", "TOTAL"] as const
export type Tramo = typeof TRAMOS[number]

/** Nombre corto del tramo, en lenguaje llano (pestañas, tarjetas). */
export const TRAMO_CORTO: Record<Tramo, string> = {
  ESPERA: "Espera en sala",
  EXTRACCION: "Extracción",
  TUBO: "Cada tubo",
  TOTAL: "Circuito completo",
}

/** Desde qué hito hasta cuál se mide cada tramo. */
export const TRAMO_HITOS: Record<Tramo, string> = {
  ESPERA: "llegada del paciente → numeración",
  EXTRACCION: "numeración → validación",
  TUBO: "impresión del tubo → validación del tubo",
  // Aplica a todas las áreas: en urgencias/plantas no suele haber llegada y el circuito = numeración → validación
  TOTAL: "llegada (o numeración) → validación",
}

/** Qué significa cada tramo para alguien que no conoce InLab. */
export const TRAMO_AYUDA: Record<Tramo, string> = {
  ESPERA: "Lo que espera el paciente desde que saca el ticket hasta que le numeran la petición e imprimen las etiquetas.",
  EXTRACCION: "Desde que se imprimen las etiquetas hasta que se valida la extracción: llamar al paciente, pinchar y llenar los tubos.",
  TUBO: "Desde que se imprime cada tubo hasta que se valida ese tubo.",
  TOTAL: "Todo el recorrido de la petición, de la llegada del paciente (o la numeración, si no hay llegada) a la validación.",
}

export const TRAMO_LABEL: Record<Tramo, string> = {
  ESPERA: `${TRAMO_CORTO.ESPERA} (${TRAMO_HITOS.ESPERA})`,
  EXTRACCION: `${TRAMO_CORTO.EXTRACCION} (${TRAMO_HITOS.EXTRACCION})`,
  TUBO: `${TRAMO_CORTO.TUBO} (${TRAMO_HITOS.TUBO})`,
  TOTAL: `${TRAMO_CORTO.TOTAL} (${TRAMO_HITOS.TOTAL})`,
}

/** Qué se cuenta en cada tramo: los de pedido una vez por petición, TUBO por tubo. */
export const TRAMO_UNIDAD: Record<Tramo, "peticiones" | "tubos"> = { ESPERA: "peticiones", EXTRACCION: "peticiones", TUBO: "tubos", TOTAL: "peticiones" }

export interface InlabDiccionario {
  areas: string[]
  puestos: string[]
  consumibles: string[]
  impresoras: string[]
  /** texto original del evento (detalle), la categoría va aparte */
  eventos: string[]
}

export interface InlabPayload {
  v: 2
  dic: InlabDiccionario
  /** días presentes (YYYY-MM-DD), ordenados */
  dias: string[]
  /** [dia, area, consumible, urgente(0|1), unidades, registros] */
  consumo: number[][]
  /** [dia, area, puesto, registros, unidades, urgentes, eventos] */
  puestos: number[][]
  /**
   * [dia, area, registros, unidades, urgentes, ordenes(-1 = sin dato), h0..h23]
   * `ordenes` = pedidos cuyo primer tubo cae ese día (cada pedido se cuenta una sola vez,
   * así la suma sobre cualquier rango = pedidos distintos).
   */
  actividad: number[][]
  /** [dia, area, urgente(0|1), tramo(idx TRAMOS), n, sumaMin, maxMin, ...pares (bucket, cuenta)] */
  tiempos: number[][]
  /** [dia, area, puesto(-1), impresora(-1), categoria(idx EVENTO_CATEGORIAS), detalle(-1), cantidad] */
  eventos: number[][]
  /** Pruebas de laboratorio pedidas (opcional: solo si la exportación las trae). Ver lib/inlab/pruebas.ts */
  pruebas?: InlabPruebas
}

/**
 * Pruebas pedidas, agregadas por día × área × prioridad. Los índices de día y área son los
 * del objeto que lo contiene (InlabPayload al subir, InlabPruebasPayload al leer).
 */
export interface InlabPruebas {
  /** nombre de cada prueba o perfil (Hemograma, Colesterol…) */
  nombres: string[]
  secciones: string[]
  /** por prueba: [seccion (idx secciones), parametros (1 = prueba suelta; n = perfil con n parámetros distintos)] */
  info: number[][]
  /** [dia, area, urgente(0|1), prueba, peticiones que la incluyen] */
  filas: number[][]
  /** [dia, area, urgente(0|1), peticiones con al menos una prueba] */
  peticiones: number[][]
  /** Pruebas que se piden juntas (opcional; solo al subir, se leen aparte). Ver PARES_* */
  pares?: InlabPares
}

/**
 * Pruebas que se piden juntas en la misma petición, por mes × área (sin prioridad). Cada
 * pareja (a < b, índices de `nombres`) cuenta las peticiones que incluyen las dos. Solo se
 * guardan las celdas con al menos `minimo` peticiones (PARES_MINIMO, o más si hace falta para
 * no pasar de PARES_MAX_FILAS): así se descartan combinaciones raras, que además podrían
 * acercarse a casos concretos. En Gómez Ulla se conserva ~98 % de las parejas con mínimo 3.
 */
export interface InlabPares {
  /** meses "YYYY-MM" */
  meses: string[]
  minimo: number
  /** [mes, area, pruebaA, pruebaB, peticiones con ambas] */
  filas: number[][]
}

export const PARES_MINIMO = 3
export const PARES_MAX_FILAS = 200_000

/** Respuesta de GET /api/inlab/pruebas: pruebas de toda la cobertura de los hospitales. */
export interface InlabPruebasPayload {
  /** días con pruebas cargadas, ordenados */
  dias: string[]
  areas: string[]
  pruebas: InlabPruebas
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
  return { v: 2, dic: { areas: [], puestos: [], consumibles: [], impresoras: [], eventos: [] }, dias: [], consumo: [], puestos: [], actividad: [], tiempos: [], eventos: [] }
}

/** Número de filas agregadas (para mostrar y para límites). */
export function tamanoPayload(p: InlabPayload): number {
  return p.consumo.length + p.puestos.length + p.actividad.length + p.tiempos.length + p.eventos.length + (p.pruebas?.filas.length ?? 0) + (p.pruebas?.pares?.filas.length ?? 0)
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
