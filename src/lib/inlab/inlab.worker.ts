/**
 * Web Worker de procesamiento InLab. Se instancia con crearWorkerInlab() (crear-worker.ts).
 * El parseo/agregación de ficheros de cientos de MB no bloquea la interfaz.
 * Para cancelar, el hilo principal hace worker.terminate().
 */
import { procesarFichero, type ProcessOptions } from "./process"

export type WorkerIn = { type: "procesar"; file: File; opts: ProcessOptions }
export type WorkerOut =
  | { type: "progreso"; bytes: number; total: number; filas: number }
  | { type: "resultado"; result: Awaited<ReturnType<typeof procesarFichero>> }
  | { type: "error"; message: string }

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<WorkerIn>) => void) | null
  postMessage: (msg: WorkerOut) => void
}

ctx.onmessage = async (e: MessageEvent<WorkerIn>) => {
  if (e.data?.type !== "procesar") return
  try {
    const result = await procesarFichero(
      e.data.file,
      e.data.opts,
      p => ctx.postMessage({ type: "progreso", ...p }),
      () => false,
    )
    ctx.postMessage({ type: "resultado", result })
  } catch (err) {
    ctx.postMessage({ type: "error", message: err instanceof Error ? err.message : "Error procesando el fichero" })
  }
}
