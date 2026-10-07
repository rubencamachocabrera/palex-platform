/**
 * Agregador de filas InLab → InlabPayload. Se ejecuta en el navegador (Web Worker).
 * Las filas crudas se descartan en cuanto se suman; los nº de orden solo viven en
 * memoria (Set de pedidos ya vistos) para contar cada pedido una sola vez.
 */
import { parseFecha, type FechaParseada, type OrdenFecha } from "./dates"
import { bucketIndex, emptyHist, MAX_DURACION_MIN, toSparse } from "./histogram"
import {
  CAMPOS, PRIORIDAD_FECHA_REFERENCIA, EVENTO_CATEGORIAS, SIN_AREA, SIN_CONSUMIBLE, SIN_PUESTO,
  clasificarEvento, esAnulado, esIncidencia, esUrgente, limpiarDimension, type CampoKey, type EventoCategoria, type Mapeo,
} from "./mapping"
import { LIMITES, type InlabPayload } from "./types"

const MAX_DIAS = LIMITES.maxDias

/** Máximo de valores distintos por dimensión: más suele indicar una columna mal emparejada (p. ej. un nombre). */
export const MAX_DISTINTOS = { areas: 200, puestos: 1500, consumibles: 500, impresoras: 500, eventos: 150 }
const OTROS = "Otros (exceso de valores)"

type DicKey = keyof typeof MAX_DISTINTOS

export interface AggregatorStats {
  filas: number
  filasValidas: number
  filasDescartadas: number
  sinFecha: number
  fechasInvalidas: Partial<Record<CampoKey, number>>
  tiemposDescartados: number
  fueraDeLimite: number
  desde: string | null
  hasta: string | null
  dimensionesExcedidas: DicKey[]
  avisos: string[]
}

interface TiempoAcc { d: number; a: number; u: number; t: number; n: number; sum: number; max: number; hist: number[] }

export class InlabAggregator {
  private idx: Record<CampoKey, number>
  private dics: Record<DicKey, Map<string, number>> = {
    areas: new Map(), puestos: new Map(), consumibles: new Map(), impresoras: new Map(), eventos: new Map(),
  }
  private excedidas = new Set<DicKey>()
  private dias = new Map<string, number>()
  // Claves numéricas compuestas (más rápidas que strings). Límites: días < 4096,
  // áreas < 256, puestos < 2048, impresoras < 512, consumibles < 1024, detalles < 256.
  private consumo = new Map<number, number[]>()
  private puestos = new Map<number, number[]>()
  private actividad = new Map<number, number[]>()
  /** Pedidos ya vistos: los datos de nivel pedido (tiempos, incidencia del pedido) cuentan una vez. */
  private pedidosVistos = new Set<string>()
  private tiempos = new Map<number, TiempoAcc>()
  private eventos = new Map<number, number[]>()
  // Cachés por valor crudo: las filas de una misma orden repiten valores consecutivos
  private cacheFecha: Record<string, { raw: string; f: FechaParseada | null }> = {}
  private cacheDim: Record<string, Map<string, number>> = {}
  private cacheUrg = new Map<string, number>()
  private cacheEv = new Map<string, ReturnType<typeof clasificarEvento>>()
  private stats: AggregatorStats = {
    filas: 0, filasValidas: 0, filasDescartadas: 0, sinFecha: 0, fechasInvalidas: {},
    tiemposDescartados: 0, fueraDeLimite: 0, desde: null, hasta: null, dimensionesExcedidas: [], avisos: [],
  }

  constructor(cabeceras: string[], mapeo: Mapeo, private ordenFecha: OrdenFecha = "DMY") {
    const idx = {} as Record<CampoKey, number>
    for (const c of CAMPOS) {
      const col = mapeo[c.key]
      idx[c.key] = col ? cabeceras.indexOf(col) : -1
    }
    this.idx = idx
  }

  get filas(): number { return this.stats.filas }

  private dic(key: DicKey, valor: string): number {
    const m = this.dics[key]
    let i = m.get(valor)
    if (i !== undefined) return i
    if (m.size >= MAX_DISTINTOS[key]) {
      this.excedidas.add(key)
      i = m.get(OTROS)
      if (i !== undefined) return i
      valor = OTROS
    }
    i = m.size
    m.set(valor, i)
    return i
  }

  private dia(d: string): number {
    let i = this.dias.get(d)
    if (i === undefined) {
      if (this.dias.size >= MAX_DIAS) return -1
      i = this.dias.size; this.dias.set(d, i)
    }
    return i
  }

  private val(row: string[], key: CampoKey): string | undefined {
    const i = this.idx[key]
    return i >= 0 ? row[i] : undefined
  }

  private fecha(row: string[], key: CampoKey): FechaParseada | null {
    const raw = this.val(row, key)
    if (raw === undefined || raw === "") return null
    const c = this.cacheFecha[key]
    let f: FechaParseada | null
    if (c && c.raw === raw) f = c.f
    else {
      f = raw.trim() === "" ? null : parseFecha(raw, this.ordenFecha)
      this.cacheFecha[key] = { raw, f }
    }
    if (!f && raw.trim() !== "") this.stats.fechasInvalidas[key] = (this.stats.fechasInvalidas[key] ?? 0) + 1
    return f
  }

  /** Índice de diccionario para el valor crudo de una columna (con caché). */
  private dim(key: DicKey, campo: CampoKey, row: string[], vacio: string): number {
    const raw = this.val(row, campo) ?? ""
    let cache = this.cacheDim[key]
    if (!cache) { cache = new Map(); this.cacheDim[key] = cache }
    let i = cache.get(raw)
    if (i === undefined) {
      i = this.dic(key, limpiarDimension(raw, vacio))
      if (cache.size < 20000) cache.set(raw, i)
    }
    return i
  }

  add(row: string[]) {
    const s = this.stats
    s.filas++
    const porCampo: Partial<Record<CampoKey, FechaParseada | null>> = {
      fechaPeticion: this.fecha(row, "fechaPeticion"),
      fechaLlegada: this.fecha(row, "fechaLlegada"),
      fechaNumeracion: this.fecha(row, "fechaNumeracion"),
      fechaValidacion: this.fecha(row, "fechaValidacion"),
      fechaImpresion: this.fecha(row, "fechaImpresion"),
      fechaValidacionTubo: this.fecha(row, "fechaValidacionTubo"),
    }
    let ref: FechaParseada | null = null
    for (const k of PRIORIDAD_FECHA_REFERENCIA) { const f = porCampo[k]; if (f) { ref = f; break } }
    if (!ref) { s.sinFecha++; s.filasDescartadas++; return }
    const d = this.dia(ref.dia)
    if (d < 0) { s.fueraDeLimite++; s.filasDescartadas++; return }
    s.filasValidas++
    if (!s.desde || ref.dia < s.desde) s.desde = ref.dia
    if (!s.hasta || ref.dia > s.hasta) s.hasta = ref.dia

    const a = this.dim("areas", "area", row, SIN_AREA)
    const cons = this.dim("consumibles", "consumible", row, SIN_CONSUMIBLE)
    let cant = 1
    const rawCant = this.val(row, "cantidad")
    if (rawCant !== undefined && rawCant.trim() !== "") {
      const n = Number(rawCant.trim().replace(",", "."))
      cant = Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n), 10000) : 1
    }
    const rawPrio = this.val(row, "prioridad")
    let urg = 0
    if (rawPrio !== undefined && rawPrio !== "") {
      let u = this.cacheUrg.get(rawPrio)
      if (u === undefined) { u = esUrgente(rawPrio) ? 1 : 0; if (this.cacheUrg.size < 5000) this.cacheUrg.set(rawPrio, u) }
      urg = u
    }

    // ¿Primera fila de este pedido? (sin columna de pedido, cada fila cuenta como pedido)
    const ord = this.val(row, "idOrden")?.trim() ?? ""
    let primeraDelPedido = true
    if (ord) {
      if (this.pedidosVistos.has(ord)) primeraDelPedido = false
      else this.pedidosVistos.add(ord)
    }

    // Consumo
    const kc = ((d * 256 + a) * 1024 + cons) * 2 + urg
    let rc = this.consumo.get(kc)
    if (!rc) { rc = [d, a, cons, urg, 0, 0]; this.consumo.set(kc, rc) }
    rc[4] += cant; rc[5]++

    // Actividad por día × área
    const ka = d * 256 + a
    let ra = this.actividad.get(ka)
    if (!ra) { ra = [d, a, 0, 0, 0, this.idx.idOrden >= 0 ? 0 : -1, ...new Array(24).fill(0)]; this.actividad.set(ka, ra) }
    ra[2]++; ra[3] += cant; ra[4] += urg; ra[6 + ref.hora]++
    // Cada pedido cuenta una vez, en el día/área de su primer tubo: antes se contaban
    // pedidos distintos por día × área y un pedido con tubos en dos días sumaba dos veces.
    if (ord && primeraDelPedido) ra[5]++

    // Eventos de calidad de la fila
    const evs: [EventoCategoria, string, number][] = []
    const rawImp = this.val(row, "impresiones")
    if (rawImp !== undefined && rawImp.trim() !== "") {
      const n = Number(rawImp.trim())
      if (Number.isFinite(n) && n > 1) evs.push(["REIMPRESION", "", Math.min(Math.round(n) - 1, 1000)])
    }
    const rawEst = this.val(row, "estadoTubo")
    if (rawEst !== undefined && rawEst !== "" && esAnulado(rawEst)) evs.push(["ANULACION", "", 1])
    const rawIncT = this.val(row, "incidenciaTubo")
    if (rawIncT !== undefined && esIncidencia(rawIncT)) evs.push(["INCIDENCIA", rawIncT, 1])
    const rawIncP = this.val(row, "incidenciaPedido")
    if (primeraDelPedido && rawIncP !== undefined && esIncidencia(rawIncP)) evs.push(["INCIDENCIA", rawIncP, 1])
    const rawEv = this.val(row, "evento")
    if (rawEv !== undefined && rawEv !== "") {
      let cat = this.cacheEv.get(rawEv)
      if (cat === undefined) { cat = clasificarEvento(rawEv); if (this.cacheEv.size < 5000) this.cacheEv.set(rawEv, cat) }
      if (cat) evs.push([cat, rawEv, 1])
    }
    const totalEventos = evs.reduce((n, e) => n + e[2], 0)

    // Puesto (solo si la columna está emparejada)
    let p = -1
    if (this.idx.puesto >= 0) {
      p = this.dim("puestos", "puesto", row, SIN_PUESTO)
      const kp = (d * 256 + a) * 2048 + p
      let rp = this.puestos.get(kp)
      if (!rp) { rp = [d, a, p, 0, 0, 0, 0]; this.puestos.set(kp, rp) }
      rp[3]++; rp[4] += cant; rp[5] += urg; rp[6] += totalEventos
    }

    if (evs.length) {
      const imp = this.idx.impresora >= 0 ? this.dim("impresoras", "impresora", row, "Sin impresora") : -1
      for (const [cat, detalle, qty] of evs) {
        const det = detalle ? this.detalleEvento(detalle) : -1
        const ci = EVENTO_CATEGORIAS.indexOf(cat)
        const ke = ((((d * 256 + a) * 2048 + (p + 1)) * 512 + (imp + 1)) * 8 + ci) * 256 + (det + 1)
        let re = this.eventos.get(ke)
        if (!re) { re = [d, a, p, imp, ci, det, 0]; this.eventos.set(ke, re) }
        re[6] += qty
      }
    }

    // Tiempos entre hitos: los de pedido una vez por pedido, el del tubo por fila
    const fLle = porCampo.fechaLlegada ?? null, fNum = porCampo.fechaNumeracion ?? null, fVal = porCampo.fechaValidacion ?? null
    if (primeraDelPedido) {
      this.tiempo(d, a, urg, 0, fLle, fNum)
      this.tiempo(d, a, urg, 1, fNum, fVal)
      const inicio = fLle ?? fNum ?? porCampo.fechaPeticion ?? null
      if (inicio && fVal && inicio !== fVal) this.tiempo(d, a, urg, 3, inicio, fVal)
    }
    this.tiempo(d, a, urg, 2, porCampo.fechaImpresion ?? null, porCampo.fechaValidacionTubo ?? null)
  }

  /** Solo códigos cortos sin secuencias numéricas largas (evita filtrar texto libre o identificadores). */
  private detalleEvento(raw: string): number {
    const v = raw.trim().replace(/\s+/g, " ")
    if (!v || v.length > 40 || /\d{4,}/.test(v) || /@/.test(v)) return -1
    if (this.dics.eventos.size >= MAX_DISTINTOS.eventos && !this.dics.eventos.has(v)) return -1
    return this.dic("eventos", v)
  }

  private tiempo(d: number, a: number, urg: number, t: number, ini: FechaParseada | null, fin: FechaParseada | null) {
    if (!ini || !fin) return
    const min = fin.min - ini.min
    if (min < 0 || min > MAX_DURACION_MIN) { this.stats.tiemposDescartados++; return }
    const k = ((d * 256 + a) * 2 + urg) * 4 + t
    let acc = this.tiempos.get(k)
    if (!acc) { acc = { d, a, u: urg, t, n: 0, sum: 0, max: 0, hist: emptyHist() }; this.tiempos.set(k, acc) }
    acc.n++; acc.sum += min
    if (min > acc.max) acc.max = min
    acc.hist[bucketIndex(min)]++
  }

  build(): { payload: InlabPayload; stats: AggregatorStats } {
    // Reordenar días cronológicamente y remapear índices
    const diasOrden = [...this.dias.keys()].sort()
    const remap = new Map<number, number>()
    diasOrden.forEach((dia, i) => remap.set(this.dias.get(dia)!, i))
    const rd = (r: number[]) => { r[0] = remap.get(r[0])!; return r }
    const keys = (m: Map<string, number>) => { const arr: string[] = []; for (const [k, i] of m) arr[i] = k; return arr }

    this.pedidosVistos.clear()

    const tiempos: number[][] = []
    for (const acc of this.tiempos.values()) {
      tiempos.push(rd([acc.d, acc.a, acc.u, acc.t, acc.n, Math.round(acc.sum * 10) / 10, Math.round(acc.max * 10) / 10, ...toSparse(acc.hist)]))
    }

    const s = this.stats
    s.dimensionesExcedidas = [...this.excedidas]
    if (s.sinFecha > 0) s.avisos.push(`${s.sinFecha.toLocaleString("es-ES")} filas sin ninguna fecha válida se han descartado.`)
    for (const [k, n] of Object.entries(s.fechasInvalidas)) {
      const label = CAMPOS.find(c => c.key === k)?.label ?? k
      s.avisos.push(`${n.toLocaleString("es-ES")} valores de "${label}" no se pudieron interpretar como fecha.`)
    }
    if (s.fueraDeLimite > 0) s.avisos.push(`${s.fueraDeLimite.toLocaleString("es-ES")} filas descartadas: el fichero supera ${MAX_DIAS} días distintos. Divide la exportación.`)
    if (s.tiemposDescartados > 0) s.avisos.push(`${s.tiemposDescartados.toLocaleString("es-ES")} tiempos negativos o superiores a 7 días se han excluido del análisis de flujo.`)
    for (const k of s.dimensionesExcedidas) s.avisos.push(`La columna de ${k} tiene más de ${MAX_DISTINTOS[k]} valores distintos: revisa el emparejamiento (podría contener texto libre o datos personales).`)
    if (diasOrden.length > 1) {
      s.avisos.push(`El primer y el último día (${diasOrden[0]} y ${diasOrden[diasOrden.length - 1]}) pueden estar incompletos si la exportación no empieza y termina a medianoche.`)
    }

    return {
      payload: {
        v: 2,
        dic: {
          areas: keys(this.dics.areas),
          puestos: keys(this.dics.puestos),
          consumibles: keys(this.dics.consumibles),
          impresoras: keys(this.dics.impresoras),
          eventos: keys(this.dics.eventos),
        },
        dias: diasOrden,
        consumo: [...this.consumo.values()].map(rd),
        puestos: [...this.puestos.values()].map(rd),
        actividad: [...this.actividad.values()].map(rd),
        tiempos,
        eventos: [...this.eventos.values()].map(rd),
      },
      stats: s,
    }
  }
}

