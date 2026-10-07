/**
 * Procesa un fichero InLab completo en streaming: lee por trozos, calcula el
 * SHA-256 del contenido, parsea el CSV y agrega. Pensado para ejecutarse en un
 * Web Worker (inlab.worker.ts), pero funciona también en el hilo principal.
 */
import { InlabAggregator, type AggregatorStats } from "./aggregate"
import { CsvStreamParser, deduplicarCabeceras, type Codificacion, type Delimitador } from "./csv"
import type { OrdenFecha } from "./dates"
import type { Mapeo } from "./mapping"
import { Sha256 } from "./sha256"
import type { InlabPayload } from "./types"

export interface ProcessOptions {
  mapeo: Mapeo
  delimitador: Delimitador
  codificacion: Codificacion
  ordenFecha: OrdenFecha
}

export interface ProcessProgress {
  bytes: number
  total: number
  filas: number
}

export interface ProcessResult {
  payload: InlabPayload
  stats: AggregatorStats
  hash: string
  cabeceras: string[]
}

export class ProcesoCancelado extends Error {
  constructor() { super("Procesamiento cancelado") }
}

export async function procesarFichero(
  file: Blob,
  opts: ProcessOptions,
  onProgress: (p: ProcessProgress) => void,
  isCancelled: () => boolean,
): Promise<ProcessResult> {
  const hash = new Sha256()
  const decoder = new TextDecoder(opts.codificacion)
  let cabeceras = null as string[] | null
  let agg = null as InlabAggregator | null
  let primerTrozo = true

  const parser = new CsvStreamParser(opts.delimitador, row => {
    if (!cabeceras) {
      cabeceras = deduplicarCabeceras(row.map((h, i) => h.trim() || `Columna ${i + 1}`))
      agg = new InlabAggregator(cabeceras, opts.mapeo, opts.ordenFecha)
      return
    }
    agg?.add(row)
  })

  const reader = file.stream().getReader()
  let bytes = 0
  let lastReport = 0
  for (;;) {
    if (isCancelled()) { await reader.cancel().catch(() => {}); throw new ProcesoCancelado() }
    const { done, value } = await reader.read()
    if (done) break
    hash.update(value)
    bytes += value.length
    let texto = decoder.decode(value, { stream: true })
    if (primerTrozo) {
      primerTrozo = false
      if (texto.charCodeAt(0) === 0xfeff) texto = texto.slice(1)
    }
    parser.push(texto)
    const now = Date.now()
    if (now - lastReport > 120) {
      lastReport = now
      onProgress({ bytes, total: file.size, filas: agg?.filas ?? 0 })
      // cede el hilo (útil si no hay Worker)
      await new Promise(r => setTimeout(r, 0))
    }
  }
  const resto = decoder.decode()
  if (resto) parser.push(resto)
  parser.end()

  if (!agg || !cabeceras) throw new Error("El fichero está vacío o no tiene cabecera.")
  const { payload, stats } = agg.build()
  onProgress({ bytes: file.size, total: file.size, filas: stats.filas })
  return { payload, stats, hash: hash.digestHex(), cabeceras }
}
