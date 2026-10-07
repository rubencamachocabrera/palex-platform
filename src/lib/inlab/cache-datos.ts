/**
 * Caché en memoria del payload de /api/inlab/datos (solo servidor).
 *
 * La entrada se guarda ya serializada (JSON) junto con la huella de las cargas
 * (`huellaCargas`): si alguien sube o borra una carga, la huella cambia y la entrada deja de
 * valer aunque la haya creado otra instancia. Además persist/borrado llaman a
 * `invalidarDatosInlab` para liberar memoria al momento. TTL y nº de entradas acotados.
 */
import { createHash } from "crypto"

/** Sube si cambia el formato del payload o su reconstrucción (invalida cachés y ETags). */
const VERSION_FORMATO = "p2-q2"
const TTL_MS = 15 * 60_000
const MAX_ENTRADAS = 16

interface Entrada { json: string; etag: string; huella: string; ids: string[]; t: number }

const g = globalThis as unknown as { __inlabDatosCache?: Map<string, Entrada> }
const cache = (g.__inlabDatosCache ??= new Map<string, Entrada>())

export function claveDatos(ids: string[], desde?: string, hasta?: string): string {
  return `${[...ids].sort().join(",")}|${desde ?? "*"}|${hasta ?? "*"}`
}

export function etagDatos(clave: string, huella: string): string {
  return `W/"${createHash("sha1").update(`${VERSION_FORMATO}|${clave}|${huella}`).digest("base64url").slice(0, 24)}"`
}

export function leerDatos(clave: string, huella: string): Entrada | null {
  const e = cache.get(clave)
  if (!e) return null
  if (e.huella !== huella || Date.now() - e.t > TTL_MS) { cache.delete(clave); return null }
  // LRU: re-insertar al final
  cache.delete(clave); cache.set(clave, e)
  return e
}

/** ¿Hay entrada para la clave (aunque pueda estar caducada)? Para lanzar la consulta en paralelo si no. */
export function hayDatos(clave: string): boolean {
  return cache.has(clave)
}

export function guardarDatos(clave: string, ids: string[], huella: string, json: string): Entrada {
  const e: Entrada = { json, etag: etagDatos(clave, huella), huella, ids, t: Date.now() }
  cache.set(clave, e)
  while (cache.size > MAX_ENTRADAS) cache.delete(cache.keys().next().value!)
  return e
}

/** Descarta las entradas que incluyen el hospital (tras guardar o borrar una carga). */
export function invalidarDatosInlab(hospitalId: string) {
  for (const [k, e] of cache) if (e.ids.includes(hospitalId)) cache.delete(k)
}
