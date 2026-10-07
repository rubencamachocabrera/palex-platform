/**
 * Crea el Web Worker de procesamiento. El patrón literal
 * `new Worker(new URL("./x.worker.ts", import.meta.url))` es el que el bundler
 * reconoce para compilar el worker como entrada propia: no cambiarlo.
 * Devuelve null si el entorno no admite Workers (el asistente procesa entonces en el hilo principal).
 */
export function crearWorkerInlab(): Worker | null {
  if (typeof Worker === "undefined") return null
  try {
    return new Worker(new URL("./inlab.worker.ts", import.meta.url))
  } catch {
    return null
  }
}
