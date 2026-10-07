/**
 * Formato B: exportación COMPLETA de la base de datos InLab (SQL Server, un CSV
 * por tabla: dbo.LabOrders.csv, dbo.LabOrder_Specimens.csv, dbo.Cfg_*.csv…).
 *
 * Se cruza en el navegador y se convierte, tubo a tubo, en filas del formato plano
 * (CABECERAS_PLANAS) que se pasan al mismo agregador que el CSV de la consulta SQL.
 *
 * Privacidad: NO se leen LabPatients, usuarios, logins ni logs. De LabOrders solo se
 * conservan en memoria las columnas de flujo; la columna HL7Received (mensajes HL7
 * con datos del paciente, ~99 % del tamaño) se descarta campo a campo al parsear.
 *
 * Relaciones verificadas con la BD de Gómez Ulla:
 *   LabOrder_Specimens.LabOrderNumber → LabOrders.Id   (¡no LabOrders.LabOrderNumber!)
 *   LabOrders.CenterWorkAreaId        → Cfg_Center_WorkArea.Id (Code)
 *   Specimens.WorkStationId*          → Cfg_Center_WorkArea_WorkStations.Id (AliasNamePC, PrinterDefaultId)
 *   WorkStations.PrinterDefaultId     → Cfg_Center_WorkArea_Printers.Id (Code)
 *   Specimens.CfgLabTubesId           → Cfg_Lab_Tubes.Id (SpecimenCode)
 *   *.CfgLabIncidenceId               → Cfg_Lab_Incidences.Id (CodeIncidence)
 */
import { InlabAggregator } from "./aggregate"
import { CsvStreamParser, detectarCodificacion, detectarDelimitador } from "./csv"
import type { OrdenFecha } from "./dates"
import { CABECERAS_PLANAS, MAPEO_PLANO } from "./mapping"
import type { ProcessProgress, ProcessResult } from "./process"
import { ProcesoCancelado } from "./process"
import { Sha256 } from "./sha256"

/** Tablas que se usan (nombre normalizado: sin "dbo." ni extensión, minúsculas). */
const TABLAS = {
  pedidos: "laborders",
  tubos: "laborder_specimens",
  areas: "cfg_center_workarea",
  puestos: "cfg_center_workarea_workstations",
  impresoras: "cfg_center_workarea_printers",
  consumibles: "cfg_lab_tubes",
  incidencias: "cfg_lab_incidences",
} as const
type TablaKey = keyof typeof TABLAS
const OBLIGATORIAS: TablaKey[] = ["pedidos", "tubos"]

/** Tablas con datos personales que nunca se abren aunque estén en la carpeta. */
export const TABLAS_IGNORADAS = ["labpatients", "cfg_center_workarea_users", "userloginattempts", "auditlog", "auditdblog", "visitindex"]

function nombreTabla(f: File): string {
  return f.name.replace(/\.(csv|txt|tsv)$/i, "").replace(/^dbo\./i, "").toLowerCase()
}

export interface ExportacionDetectada {
  ficheros: Partial<Record<TablaKey, File>>
  faltan: string[]
  /** tamaño total de lo que se va a leer */
  bytes: number
  ignoradas: string[]
}

/** ¿Es un conjunto de CSV de la BD InLab? Devuelve null si no lo parece. */
export function detectarExportacionSqlServer(files: File[]): ExportacionDetectada | null {
  const porNombre = new Map(files.map(f => [nombreTabla(f), f]))
  if (!porNombre.has(TABLAS.pedidos) && !porNombre.has(TABLAS.tubos)) return null
  const ficheros: Partial<Record<TablaKey, File>> = {}
  for (const [k, n] of Object.entries(TABLAS) as [TablaKey, string][]) {
    const f = porNombre.get(n)
    if (f) ficheros[k] = f
  }
  const faltan = OBLIGATORIAS.filter(k => !ficheros[k]).map(k => `dbo.${TABLAS[k]}.csv`)
  const bytes = Object.values(ficheros).reduce((n, f) => n + (f?.size ?? 0), 0)
  const ignoradas = [...porNombre.keys()].filter(n => TABLAS_IGNORADAS.includes(n))
  return { ficheros, faltan, bytes, ignoradas }
}

/** Nombre del lote para el histórico de cargas. */
export function nombreLote(det: ExportacionDetectada): string {
  const f = det.ficheros.tubos ?? det.ficheros.pedidos
  const carpeta = (f as File & { webkitRelativePath?: string })?.webkitRelativePath?.split("/")[0]
  return `${carpeta || "Exportación InLab"} (BD completa)`
}

interface Lector {
  hash: Sha256
  bytesLeidos: number
  total: number
  onProgress: (p: ProcessProgress) => void
  isCancelled: () => boolean
  filas: () => number
}

/**
 * Lee un CSV en streaming. onHeader recibe la cabecera y devuelve el procesador de
 * filas. Se hashea el contenido para detectar recargas del mismo lote.
 */
async function leerTabla(file: File, lector: Lector, onHeader: (cab: string[]) => (row: string[]) => void) {
  const primeros = new Uint8Array(await file.slice(0, 65536).arrayBuffer())
  const codificacion = detectarCodificacion(primeros)
  const decoder = new TextDecoder(codificacion)
  const primeraLinea = decoder.decode(primeros, { stream: false }).replace(/^﻿/, "").split(/\r?\n/)[0] ?? ""
  const delimitador = detectarDelimitador(primeraLinea)
  let onRow: ((row: string[]) => void) | null = null
  const parser = new CsvStreamParser(delimitador, row => {
    if (!onRow) { onRow = onHeader(row.map(h => h.replace(/^﻿/, "").trim())); return }
    onRow(row)
  })
  const dec = new TextDecoder(codificacion)
  const reader = file.stream().getReader()
  let primero = true
  let ultimo = 0
  for (;;) {
    if (lector.isCancelled()) { await reader.cancel().catch(() => {}); throw new ProcesoCancelado() }
    const { done, value } = await reader.read()
    if (done) break
    lector.hash.update(value)
    lector.bytesLeidos += value.length
    let texto = dec.decode(value, { stream: true })
    if (primero) { primero = false; if (texto.charCodeAt(0) === 0xfeff) texto = texto.slice(1) }
    parser.push(texto)
    const now = Date.now()
    if (now - ultimo > 150) {
      ultimo = now
      lector.onProgress({ bytes: lector.bytesLeidos, total: lector.total, filas: lector.filas() })
      await new Promise(r => setTimeout(r, 0))
    }
  }
  const resto = dec.decode()
  if (resto) parser.push(resto)
  parser.end()
}

/** Índices de columnas por nombre (insensible a mayúsculas). -1 si no existe. */
function indices<K extends string>(cab: string[], cols: readonly K[]): Record<K, number> {
  const low = cab.map(c => c.toLowerCase())
  const out = {} as Record<K, number>
  for (const c of cols) out[c] = low.indexOf(c.toLowerCase())
  return out
}

const v = (row: string[], i: number) => (i >= 0 ? (row[i] ?? "").trim() : "")
const limpio = (s: string) => (s === "" || s.toUpperCase() === "NULL" ? "" : s)

export async function procesarExportacionSqlServer(
  files: File[],
  ordenFecha: OrdenFecha,
  onProgress: (p: ProcessProgress) => void,
  isCancelled: () => boolean,
): Promise<ProcessResult> {
  const det = detectarExportacionSqlServer(files)
  if (!det) throw new Error("No se reconoce la exportación de la base de datos InLab (faltan dbo.LabOrders.csv y dbo.LabOrder_Specimens.csv).")
  if (det.faltan.length) throw new Error(`Faltan tablas obligatorias: ${det.faltan.join(", ")}`)
  const F = det.ficheros

  const cabeceras = [...CABECERAS_PLANAS]
  const agg = new InlabAggregator(cabeceras, MAPEO_PLANO, ordenFecha)
  const lector: Lector = { hash: new Sha256(), bytesLeidos: 0, total: det.bytes, onProgress, isCancelled, filas: () => agg.filas }
  const avisos: string[] = []

  // ── Catálogos ──────────────────────────────────────────────────────────────
  const areas = new Map<string, string>()
  const impresoras = new Map<string, string>()
  const puestos = new Map<string, { alias: string; impresora: string }>()
  const consumibles = new Map<string, string>()
  const incidencias = new Map<string, string>()

  if (F.areas) await leerTabla(F.areas, lector, cab => {
    const ix = indices(cab, ["Id", "Code", "NameWorkArea"] as const)
    return row => areas.set(v(row, ix.Id), v(row, ix.Code) || v(row, ix.NameWorkArea))
  })
  if (F.impresoras) await leerTabla(F.impresoras, lector, cab => {
    const ix = indices(cab, ["Id", "Code", "NamePrinter"] as const)
    return row => impresoras.set(v(row, ix.Id), v(row, ix.Code) || v(row, ix.NamePrinter))
  })
  const puestosCrudos: { id: string; alias: string; impId: string }[] = []
  if (F.puestos) await leerTabla(F.puestos, lector, cab => {
    const ix = indices(cab, ["Id", "AliasNamePC", "NamePC", "PrinterDefaultId"] as const)
    return row => puestosCrudos.push({ id: v(row, ix.Id), alias: v(row, ix.AliasNamePC) || v(row, ix.NamePC), impId: v(row, ix.PrinterDefaultId) })
  })
  for (const p of puestosCrudos) puestos.set(p.id, { alias: p.alias, impresora: impresoras.get(p.impId) ?? "" })
  if (F.consumibles) await leerTabla(F.consumibles, lector, cab => {
    const ix = indices(cab, ["Id", "SpecimenCode", "TubeCode", "PrintInfo"] as const)
    const usados = new Map<string, number>()
    const filas: [string, string, string][] = []
    return row => {
      const nombre = v(row, ix.SpecimenCode) || v(row, ix.PrintInfo) || v(row, ix.TubeCode)
      filas.push([v(row, ix.Id), nombre, v(row, ix.TubeCode)])
      usados.set(nombre, (usados.get(nombre) ?? 0) + 1)
      // Nombres repetidos (p. ej. dos "ETIQUETAS") se distinguen por código de tubo
      for (const [id, n, codigo] of filas) consumibles.set(id, (usados.get(n) ?? 0) > 1 && codigo ? `${n} ${codigo.replace(/^\^/, "")}` : n)
    }
  })
  if (F.incidencias) await leerTabla(F.incidencias, lector, cab => {
    const ix = indices(cab, ["Id", "CodeIncidence"] as const)
    return row => incidencias.set(v(row, ix.Id), v(row, ix.CodeIncidence))
  })

  // ── Pedidos: solo columnas de flujo (HL7Received y datos de paciente se descartan) ──
  type Pedido = [area: string, prioridad: string, estado: string, unidad: string, incidencia: string, fPet: string, fLle: string, fNum: string, fVal: string]
  const pedidos = new Map<string, Pedido>()
  await leerTabla(F.pedidos!, lector, cab => {
    const ix = indices(cab, ["Id", "CenterWorkAreaId", "Priority", "State", "ReceivingUnit", "CfgLabIncidenceId", "OrderDate", "DateTimePatientArrived", "DateLabOrderNumber", "DateTimeValidated"] as const)
    if (ix.Id < 0) throw new Error("dbo.LabOrders.csv no tiene columna Id.")
    return row => {
      const incId = limpio(v(row, ix.CfgLabIncidenceId))
      pedidos.set(v(row, ix.Id), [
        areas.get(v(row, ix.CenterWorkAreaId)) ?? limpio(v(row, ix.CenterWorkAreaId)),
        limpio(v(row, ix.Priority)), limpio(v(row, ix.State)), limpio(v(row, ix.ReceivingUnit)),
        incId ? incidencias.get(incId) ?? incId : "",
        limpio(v(row, ix.OrderDate)), limpio(v(row, ix.DateTimePatientArrived)),
        limpio(v(row, ix.DateLabOrderNumber)), limpio(v(row, ix.DateTimeValidated)),
      ])
    }
  })

  // ── Tubos → filas planas → agregador ───────────────────────────────────────
  let sinPedido = 0
  await leerTabla(F.tubos!, lector, cab => {
    const ix = indices(cab, ["Id", "LabOrderNumber", "CfgLabTubesId", "DatetimeCreated", "DatetimeValidated", "NumPrinted", "State", "CfgLabIncidenceId", "WorkStationIdValidated", "WorkStationIdLastModify", "WorkStationId", "InfoExtraPrint"] as const)
    if (ix.LabOrderNumber < 0 || ix.CfgLabTubesId < 0) throw new Error("dbo.LabOrder_Specimens.csv no tiene las columnas esperadas (LabOrderNumber, CfgLabTubesId).")
    const fila: string[] = new Array(cabeceras.length).fill("")
    return row => {
      const pedidoId = v(row, ix.LabOrderNumber)
      const p = pedidos.get(pedidoId)
      if (!p) sinPedido++
      const wsId = limpio(v(row, ix.WorkStationIdValidated)) || limpio(v(row, ix.WorkStationIdLastModify)) || limpio(v(row, ix.WorkStationId))
      const ws = wsId ? puestos.get(wsId) : undefined
      const tuboId = v(row, ix.CfgLabTubesId)
      const incT = limpio(v(row, ix.CfgLabIncidenceId))
      fila[0] = v(row, ix.Id)
      fila[1] = pedidoId
      fila[2] = p?.[0] ?? ""
      fila[3] = ws?.alias ?? ""
      fila[4] = ws?.impresora ?? ""
      fila[5] = consumibles.get(tuboId) ?? tuboId
      fila[6] = limpio(v(row, ix.InfoExtraPrint))
      fila[7] = p?.[1] ?? ""
      fila[8] = p?.[3] ?? ""
      fila[9] = p?.[2] ?? ""
      fila[10] = limpio(v(row, ix.State))
      fila[11] = limpio(v(row, ix.NumPrinted))
      fila[12] = p?.[4] ?? ""
      fila[13] = incT ? incidencias.get(incT) ?? incT : ""
      fila[14] = p?.[5] ?? ""
      fila[15] = p?.[6] ?? ""
      fila[16] = p?.[7] ?? ""
      fila[17] = limpio(v(row, ix.DatetimeCreated))
      fila[18] = limpio(v(row, ix.DatetimeValidated))
      fila[19] = p?.[8] ?? ""
      agg.add(fila)
    }
  })
  pedidos.clear()

  const { payload, stats } = agg.build()
  if (sinPedido > 0) avisos.push(`${sinPedido.toLocaleString("es-ES")} tubos sin pedido asociado en dbo.LabOrders: cuentan como consumo pero sin área ni tiempos.`)
  if (!F.areas || !F.puestos || !F.consumibles) avisos.push("Faltan catálogos Cfg_* (áreas, puestos o tubos): se mostrarán identificadores numéricos en lugar de nombres.")
  if (det.ignoradas.length) avisos.push(`Tablas con datos personales ignoradas: ${det.ignoradas.map(n => `dbo.${n}`).join(", ")}.`)
  stats.avisos.unshift(...avisos)
  onProgress({ bytes: det.bytes, total: det.bytes, filas: stats.filas })
  return { payload, stats, hash: lector.hash.digestHex(), cabeceras }
}
