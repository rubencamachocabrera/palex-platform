/**
 * Web Worker de procesamiento InLab. Se instancia con crearWorkerInlab() (crear-worker.ts).
 * El parseo/agregación de ficheros de cientos de MB no bloquea la interfaz.
 * Para cancelar, el hilo principal hace worker.terminate().
 */
import { procesarFichero, type ProcessOptions } from "./process"
import { procesarExportacionSqlServer } from "./sqlserver"
import type { OrdenFecha } from "./dates"

export type WorkerIn =
  | { type: "procesar"; file: File; opts: ProcessOptions }
  | { type: "procesar-bd"; files: File[]; ordenFecha: OrdenFecha }
export type WorkerOut =
  | { type: "progreso"; bytes: number; total: number; filas: number }
  | { type: "resultado"; result: Awaited<ReturnType<typeof procesarFichero>> }
  | { type: "error"; message: string }

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<WorkerIn>) => void) | null
  postMessage: (msg: WorkerOut) => void
}

ctx.onmessage = async (e: MessageEvent<WorkerIn>) => {
  const msg = e.data
  if (msg?.type !== "procesar" && msg?.type !== "procesar-bd") return
  try {
    const progreso = (p: { bytes: number; total: number; filas: number }) => ctx.postMessage({ type: "progreso", ...p })
    const result = msg.type === "procesar"
      ? await procesarFichero(msg.file, msg.opts, progreso, () => false)
      : await procesarExportacionSqlServer(msg.files, msg.ordenFecha, progreso, () => false)
    ctx.postMessage({ type: "resultado", result })
  } catch (err) {
    ctx.postMessage({ type: "error", message: err instanceof Error ? err.message : "Error procesando el fichero" })
  }
}
