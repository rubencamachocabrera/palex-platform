/**
 * Histograma de tiempos con buckets FIJOS (minutos).
 *
 * Los percentiles no se pueden promediar entre días; en cambio los histogramas
 * se pueden sumar. Cada fila diaria guarda su histograma y la mediana/P90 de
 * cualquier rango se calcula sumando histogramas e interpolando dentro del bucket.
 *
 * Resolución (v2, auditoría estadística Sprint 25b): en Gómez Ulla la mitad de los
 * pedidos se valida en menos de 1 min, y con los buckets v1 (2 min hasta 30 min) la
 * mediana salía ~1,1 min por encima de la real (1,7 frente a 0,6). Ahora:
 *   0–2 min cada 5 s · 2–10 cada 15 s · 10–30 cada 30 s · 30–60 cada 1 min ·
 *   1–2 h cada 2,5 min · 2–4 h cada 5 · 4–8 h cada 10 · 8–24 h cada 30 · 1–7 d cada 2 h
 * Los límites v1 son un subconjunto de los v2, así que las filas antiguas (51 buckets)
 * se pueden re-repartir sin cambiar su resultado (ver `normalizarHist`).
 *
 * ¡No cambiar los límites sin migrar los datos existentes! (los índices se guardan en BD).
 */

function buildEdges(): number[] {
  const e: number[] = []
  // Pasos en fracciones exactas para que los límites v1 (2, 4, 30, 35…) coincidan bit a bit
  for (let i = 1; i <= 24; i++) e.push(i / 12)               // 0–2 min cada 5 s
  for (let m = 2.25; m <= 10; m += 0.25) e.push(m)          // 2–10 cada 15 s
  for (let m = 10.5; m <= 30; m += 0.5) e.push(m)           // 10–30 cada 30 s
  for (let m = 31; m <= 60; m += 1) e.push(m)               // 30–60 cada 1 min
  for (let m = 62.5; m <= 120; m += 2.5) e.push(m)          // 1–2 h cada 2,5 min
  for (let m = 125; m <= 240; m += 5) e.push(m)             // 2–4 h cada 5
  for (let m = 250; m <= 480; m += 10) e.push(m)            // 4–8 h cada 10
  for (let m = 510; m <= 1440; m += 30) e.push(m)           // 8–24 h cada 30
  for (let m = 1560; m <= 10080; m += 120) e.push(m)        // 1–7 d cada 2 h
  return e
}

/** Límite superior (exclusivo) de cada bucket; el último bucket es "> último límite". */
export const BUCKET_EDGES: readonly number[] = buildEdges()
export const N_BUCKETS = BUCKET_EDGES.length + 1

/** Límites v1 (51 buckets), solo para reinterpretar filas guardadas antes de v2. */
function buildEdgesV1(): number[] {
  const e: number[] = []
  for (let m = 2; m <= 30; m += 2) e.push(m)
  for (let m = 35; m <= 60; m += 5) e.push(m)
  for (let m = 70; m <= 120; m += 10) e.push(m)
  for (let m = 140; m <= 240; m += 20) e.push(m)
  for (let m = 280; m <= 480; m += 40) e.push(m)
  for (let m = 600; m <= 1440; m += 120) e.push(m)
  e.push(2880, 4320, 10080)
  return e
}
const EDGES_V1 = buildEdgesV1()
export const N_BUCKETS_V1 = EDGES_V1.length + 1

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

/**
 * Convierte un histograma guardado al formato actual. Las filas v1 (51 buckets) se
 * reparten uniformemente entre los buckets v2 que cubren cada intervalo v1: con la
 * interpolación lineal da exactamente los mismos percentiles que antes (hasta recargar).
 */
export function normalizarHist(h: ArrayLike<number>): number[] {
  if (h.length !== N_BUCKETS_V1 || N_BUCKETS_V1 === N_BUCKETS) {
    const out = emptyHist()
    for (let i = 0; i < Math.min(h.length, N_BUCKETS); i++) out[i] = h[i] || 0
    return out
  }
  const out = emptyHist()
  for (let i = 0; i < h.length; i++) {
    const c = h[i] || 0
    if (!c) continue
    if (i >= EDGES_V1.length) { out[N_BUCKETS - 1] += c; continue }
    const lo = i === 0 ? 0 : EDGES_V1[i - 1], hi = EDGES_V1[i]
    const desde = bucketIndex(lo), hasta = bucketIndex(hi) // [desde, hasta)
    for (let j = desde; j < hasta; j++) {
      const bl = j === 0 ? 0 : BUCKET_EDGES[j - 1], bh = BUCKET_EDGES[j]
      out[j] += (c * (bh - bl)) / (hi - lo)
    }
  }
  return out
}

export function addHist(target: number[], src: ArrayLike<number>) {
  const n = Math.min(target.length, src.length)
  for (let i = 0; i < n; i++) target[i] += src[i] || 0
}

/**
 * Percentil aproximado (p en 0–1) con interpolación lineal dentro del bucket.
 * `max` (máximo observado, opcional) acota el resultado: evita que la interpolación
 * dentro de un bucket ancho dé un valor que nunca se observó.
 */
export function percentile(hist: ArrayLike<number>, p: number, max?: number | null): number | null {
  let total = 0
  for (let i = 0; i < hist.length; i++) total += hist[i] || 0
  if (total === 0) return null
  const target = p * total
  // tolerancia: las filas v1 re-repartidas tienen cuentas fraccionarias
  const eps = total * 1e-9
  const acota = (v: number) => (max !== undefined && max !== null && max >= 0 && v > max ? max : v)
  let acc = 0
  for (let i = 0; i < hist.length; i++) {
    const c = hist[i] || 0
    if (c === 0) continue
    if (acc + c >= target - eps) {
      const lo = i === 0 ? 0 : BUCKET_EDGES[i - 1]
      const hi = i < BUCKET_EDGES.length ? BUCKET_EDGES[i] : lo * 1.5
      const frac = (target - acc) / c
      return acota(lo + (hi - lo) * Math.min(1, Math.max(0, frac)))
    }
    acc += c
  }
  return acota(BUCKET_EDGES[BUCKET_EDGES.length - 1])
}

/**
 * Nº de observaciones por debajo de `umbral` minutos. Exacto si `umbral` es un límite de
 * bucket (los buckets son [límite anterior, límite)); si no, interpola linealmente dentro
 * del bucket que lo contiene. `max` (máximo observado) acota el bucket abierto/ancho.
 */
export function cuentaBajo(hist: ArrayLike<number>, umbral: number, max?: number | null): number {
  let acc = 0
  for (let i = 0; i < hist.length; i++) {
    const c = hist[i] || 0
    if (!c) continue
    const lo = i === 0 ? 0 : BUCKET_EDGES[i - 1]
    if (lo >= umbral) break
    let hi = i < BUCKET_EDGES.length ? BUCKET_EDGES[i] : Infinity
    if (max !== undefined && max !== null && max >= lo && max < hi) hi = Math.max(max, lo)
    if (hi <= umbral) acc += c
    else if (isFinite(hi) && hi > lo) acc += (c * (umbral - lo)) / (hi - lo)
  }
  return acc
}

/** Copia del histograma sin las observaciones por debajo de `umbral` (exacto si es un límite de bucket). */
export function recortarBajo(hist: ArrayLike<number>, umbral: number): number[] {
  const out = emptyHist()
  for (let i = 0; i < Math.min(hist.length, N_BUCKETS); i++) {
    const c = hist[i] || 0
    if (!c) continue
    const lo = i === 0 ? 0 : BUCKET_EDGES[i - 1], hi = i < BUCKET_EDGES.length ? BUCKET_EDGES[i] : Infinity
    out[i] = hi <= umbral ? 0 : lo >= umbral || !isFinite(hi) ? c : (c * (hi - umbral)) / (hi - lo)
  }
  return out
}

/** ¿`min` es exactamente un límite de bucket? (umbrales exactos) */
export const esLimiteBucket = (min: number) => BUCKET_EDGES.some(e => Math.abs(e - min) < 1e-12)

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
