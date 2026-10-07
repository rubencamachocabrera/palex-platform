/**
 * Histograma de tiempos con buckets FIJOS (minutos).
 *
 * Los percentiles no se pueden promediar entre días; en cambio los histogramas
 * se pueden sumar. Cada fila diaria guarda su histograma y la mediana/P90 de
 * cualquier rango se calcula sumando histogramas e interpolando dentro del bucket.
 *
 * ¡No cambiar los límites sin migrar los datos existentes! (los índices se guardan en BD).
 */

function buildEdges(): number[] {
  const e: number[] = []
  for (let m = 2; m <= 30; m += 2) e.push(m)          // 0–30 min cada 2
  for (let m = 35; m <= 60; m += 5) e.push(m)         // 30–60 cada 5
  for (let m = 70; m <= 120; m += 10) e.push(m)       // 1–2 h cada 10
  for (let m = 140; m <= 240; m += 20) e.push(m)      // 2–4 h cada 20
  for (let m = 280; m <= 480; m += 40) e.push(m)      // 4–8 h cada 40
  for (let m = 600; m <= 1440; m += 120) e.push(m)    // 8–24 h cada 2 h
  e.push(2880, 4320, 10080)                           // 2 d, 3 d, 7 d
  return e
}

/** Límite superior (exclusivo) de cada bucket; el último bucket es "> último límite". */
export const BUCKET_EDGES: readonly number[] = buildEdges()
export const N_BUCKETS = BUCKET_EDGES.length + 1

/** Duración máxima admitida (minutos). Por encima se descarta como dato erróneo. */
export const MAX_DURACION_MIN = 10080

export function bucketIndex(min: number): number {
  // búsqueda binaria del primer límite > min
  let lo = 0, hi = BUCKET_EDGES.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (BUCKET_EDGES[mid] > min) hi = mid
    else lo = mid + 1
  }
  return lo
}

export function emptyHist(): number[] {
  return new Array(N_BUCKETS).fill(0)
}

export function addHist(target: number[], src: ArrayLike<number>) {
  const n = Math.min(target.length, src.length)
  for (let i = 0; i < n; i++) target[i] += src[i] || 0
}

/** Percentil aproximado (p en 0–1) con interpolación lineal dentro del bucket. */
export function percentile(hist: ArrayLike<number>, p: number): number | null {
  let total = 0
  for (let i = 0; i < hist.length; i++) total += hist[i] || 0
  if (total === 0) return null
  const target = p * total
  let acc = 0
  for (let i = 0; i < hist.length; i++) {
    const c = hist[i] || 0
    if (c === 0) continue
    if (acc + c >= target) {
      const lo = i === 0 ? 0 : BUCKET_EDGES[i - 1]
      const hi = i < BUCKET_EDGES.length ? BUCKET_EDGES[i] : lo * 1.5
      const frac = c === 0 ? 0 : (target - acc) / c
      return lo + (hi - lo) * Math.min(1, Math.max(0, frac))
    }
    acc += c
  }
  return BUCKET_EDGES[BUCKET_EDGES.length - 1]
}

/** Codificación dispersa [idx, count, idx, count…] para reducir el payload. */
export function toSparse(hist: ArrayLike<number>): number[] {
  const out: number[] = []
  for (let i = 0; i < hist.length; i++) if (hist[i]) out.push(i, hist[i])
  return out
}

export function fromSparse(pairs: ArrayLike<number>, offset = 0): number[] {
  const h = emptyHist()
  for (let i = offset; i + 1 < pairs.length; i += 2) {
    const idx = pairs[i]
    if (idx >= 0 && idx < N_BUCKETS) h[idx] += pairs[i + 1]
  }
  return h
}
