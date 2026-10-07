/**
 * Verificación estadística reproducible de Inteligencia InLab (sin datos reales).
 *
 *   npx tsx docs/inlab/verificar-estadistica.ts [docs/inlab/ejemplo-inlab-sintetico.csv]
 *
 * 1. Lee el CSV sintético (formato plano A), lo pasa por el agregador y analytics.ts y
 *    compara cifra a cifra con una referencia calculada aquí directamente de las filas:
 *    tubos, urgentes, pedidos distintos, eventos y mediana/P90 EXACTAS por tramo y área.
 * 2. Casos sintéticos: pedido que cruza medianoche (se cuenta una vez), tendencias con
 *    cobertura distinta, media por día de la semana, tasa con filtro de urgencia,
 *    formato de minutos, facturación con cambio de tarifa y error de percentiles en
 *    distribuciones de duraciones muy cortas.
 * 3. Sprint 26 (contenido): «Peticiones» = pedidos distintos en series, áreas y días de la
 *    semana; validaciones sospechosamente rápidas (extracción < VALIDACION_RAPIDA.umbralMin)
 *    contadas EXACTAS frente a las filas, mediana sin ellas y tendencia neutra.
 * Sale con código 1 si algo no cuadra. Auditoría Sprint 25b / 26 (AGENTS.md §7).
 */
import { readFileSync } from "node:fs"
import { InlabAggregator } from "../../src/lib/inlab/aggregate"
import { CsvStreamParser } from "../../src/lib/inlab/csv"
import { CABECERAS_PLANAS, MAPEO_PLANO } from "../../src/lib/inlab/mapping"
import {
  decodificar, facturacion, FILTROS_VACIOS, kpis, porArea, porDiaSemana, serieVolumen, tendencias, tendenciaTiempo, tiemposPor,
  tiemposPorTramo, totalImporte, validacionesRapidas, VALIDACION_RAPIDA, type Filtros, type Rango,
} from "../../src/lib/inlab/analytics"
import { bucketIndex, cuentaBajo, emptyHist, esLimiteBucket, percentile } from "../../src/lib/inlab/histogram"
import { fmtMin } from "../../src/components/inlab/charts"

let fallos = 0
function ok(cond: boolean, msg: string) {
  if (!cond) { fallos++; console.log("  FALLO", msg) } else console.log("  ok   ", msg)
}
const cerca = (a: number | null, b: number | null, tol: number) => a !== null && b !== null && Math.abs(a - b) <= tol

/** Percentil exacto con interpolación lineal entre estadísticos de orden. */
function exacto(v: number[], p: number): number | null {
  if (!v.length) return null
  const s = [...v].sort((a, b) => a - b), k = (s.length - 1) * p, f = Math.floor(k), c = Math.min(f + 1, s.length - 1)
  return s[f] + (s[c] - s[f]) * (k - f)
}
const minutos = (s: string) => (s ? Date.parse(s.replace(" ", "T") + "Z") / 60000 : null)

// ─── 1. CSV sintético ────────────────────────────────────────────────────────
const ruta = process.argv[2] ?? "docs/inlab/ejemplo-inlab-sintetico.csv"
const filas: string[][] = []
const parser = new CsvStreamParser(",", r => { filas.push(r) })
parser.push(readFileSync(ruta, "utf8").replace(/^﻿/, ""))
parser.end()
const cab = filas.shift()!
const agg = new InlabAggregator(cab, MAPEO_PLANO, "DMY")
for (const f of filas) agg.add(f)
const ds = decodificar(agg.build().payload)
const rango: Rango = { desde: ds.dias[0], hasta: ds.dias[ds.dias.length - 1] }
console.log(`CSV sintético: ${filas.length} filas, ${ds.dias.length} días`)

const I = Object.fromEntries(cab.map((c, i) => [c, i])) as Record<string, number>
for (const area of [null, ...ds.areas]) for (const urg of ["todas", "urgente", "normal"] as const) {
  const f: Filtros = { ...FILTROS_VACIOS, areas: area ? [area] : [], urgencia: urg }
  const sel = filas.filter(r => (!area || r[I.Area] === area) && (urg === "todas" || (urg === "urgente") === (r[I.Prioridad] === "2")))
  const k = kpis(ds, rango, f)
  const tag = `${area ?? "todas"}/${urg}`
  ok(k.registros === sel.length, `${tag} tubos ${k.registros} = ${sel.length}`)
  ok(k.urgentes === sel.filter(r => r[I.Prioridad] === "2").length, `${tag} urgentes (tubos)`)
  if (urg === "todas") ok(k.ordenes === new Set(sel.map(r => r[I.PedidoId])).size, `${tag} pedidos distintos ${k.ordenes}`)
  // Tramos de pedido: una vez por pedido (primera fila)
  const vistos = new Set<string>(), ext: number[] = [], tubo: number[] = []
  for (const r of sel) {
    const a = minutos(r[I.FechaImpresion]), b = minutos(r[I.FechaValidacionTubo])
    if (a !== null && b !== null && b - a >= 0 && b - a <= 10080) tubo.push(b - a)
    if (vistos.has(r[I.PedidoId])) continue
    vistos.add(r[I.PedidoId])
    const n = minutos(r[I.FechaNumeracion]), v = minutos(r[I.FechaValidacionPedido])
    if (n !== null && v !== null && v - n >= 0 && v - n <= 10080) ext.push(v - n)
  }
  const tr = tiemposPorTramo(ds, rango, f)
  const e = tr.find(t => t.clave === "EXTRACCION")!, t = tr.find(t => t.clave === "TUBO")!
  // Admitido: ≤ 0,15 min (< 10 min) / 0,6 (< 1 h) / 3 (más), o caer entre los estadísticos
  // de orden vecinos (con pocas mediciones el percentil exacto depende de la definición)
  const valido = (h: number | null, v: number[]) => {
    const x = exacto(v, 0.5)
    if (h === null || x === null) return h === x
    if (Math.abs(h - x) <= (x < 10 ? 0.15 : x < 60 ? 0.6 : 3)) return true
    const s = [...v].sort((a, b) => a - b), k = (s.length - 1) * 0.5
    return h >= s[Math.max(0, Math.floor(k) - 1)] && h <= s[Math.min(s.length - 1, Math.ceil(k) + 1)]
  }
  // Validaciones sospechosamente rápidas: recuento exacto (el umbral es un límite de bucket)
  const vr = validacionesRapidas(ds, rango, f).total
  const rapidasRef = ext.filter(x => x < VALIDACION_RAPIDA.umbralMin).length
  ok(Math.abs(vr.rapidas - rapidasRef) < 1e-9 && vr.n === ext.length, `${tag} validaciones < ${VALIDACION_RAPIDA.umbralMin} min ${vr.rapidas} = ${rapidasRef} de ${ext.length}`)
  const sinRapidas = ext.filter(x => x >= VALIDACION_RAPIDA.umbralMin)
  if (sinRapidas.length >= 30) ok(cerca(vr.p50SinRapidas, exacto(sinRapidas, 0.5), 0.15), `${tag} mediana sin validaciones rápidas ${vr.p50SinRapidas?.toFixed(2)} ≈ ${exacto(sinRapidas, 0.5)?.toFixed(2)}`)
  ok(valido(e.p50, ext), `${tag} EXTRACCION mediana ${e.p50?.toFixed(2)} ≈ ${exacto(ext, 0.5)?.toFixed(2)} (n=${ext.length})`)
  ok(valido(t.p50, tubo), `${tag} TUBO mediana ${t.p50?.toFixed(2)} ≈ ${exacto(tubo, 0.5)?.toFixed(2)} (n=${tubo.length})`)
  if (!area && urg === "todas") {
    const porAreaT = tiemposPor(ds, rango, f, "TUBO", "area")
    ok(porAreaT.reduce((s, x) => s + x.n, 0) === t.n, "TUBO: la suma por área = total")
    // Peticiones: la serie, el desglose por área y los días de la semana suman los pedidos distintos
    const pedidos = new Set(sel.map(r => r[I.PedidoId])).size
    ok(serieVolumen(ds, rango, f, "peticiones").reduce((s, p) => s + (p.v ?? 0), 0) === pedidos, `serie de peticiones suma ${pedidos} pedidos distintos`)
    ok(porArea(ds, rango, f).reduce((s, a) => s + (a.peticiones ?? 0), 0) === pedidos, "peticiones por área suman los pedidos distintos")
    ok(serieVolumen(ds, rango, f, "unidades").reduce((s, p) => s + (p.v ?? 0), 0) === sel.length, "serie de tubos y etiquetas suma los tubos")
    const vrA = validacionesRapidas(ds, rango, f, true)
    ok(Math.abs(vrA.areas.reduce((s, a) => s + a.rapidas, 0) - vrA.total.rapidas) < 1e-9, "validaciones rápidas: la suma por área = total")
  }
  if (urg !== "todas") ok(kpis(ds, rango, f).ordenes === null, `${tag} sin peticiones con filtro de prioridad (no hay desglose)`)
}

// ─── 2. Casos sintéticos ─────────────────────────────────────────────────────
console.log("Casos sintéticos")
const fila = (o: Partial<Record<typeof CABECERAS_PLANAS[number], string>>) => CABECERAS_PLANAS.map(c => o[c] ?? "")
function dataset(rows: string[][]) {
  const a = new InlabAggregator([...CABECERAS_PLANAS], MAPEO_PLANO, "DMY")
  for (const r of rows) a.add(r)
  return decodificar(a.build().payload)
}

// Pedido con un tubo a las 23:59 y otro a las 00:01 → un pedido, no dos
{
  const d = dataset([
    fila({ TuboId: "1", PedidoId: "P1", Area: "EXTRACCIONES", FechaImpresion: "2026-03-01 23:59:00" }),
    fila({ TuboId: "2", PedidoId: "P1", Area: "EXTRACCIONES", FechaImpresion: "2026-03-02 00:01:00" }),
  ])
  ok(kpis(d, { desde: "2026-03-01", hasta: "2026-03-02" }, FILTROS_VACIOS).ordenes === 1, "pedido que cruza medianoche cuenta 1 vez")
}

// Tendencias: periodo anterior con 3 de 10 días cargados → sin tendencia; completo → por día
{
  const rows: string[][] = []
  const dia = (n: number) => `2026-04-${String(n).padStart(2, "0")}`
  let id = 0
  for (let n = 1; n <= 20; n++) {
    if (n <= 10 && n > 3) continue // anterior: solo días 1-3
    for (let i = 0; i < 100; i++) rows.push(fila({ TuboId: String(++id), PedidoId: `P${id}`, Area: "A", FechaImpresion: `${dia(n)} 09:00:00` }))
  }
  const d = dataset(rows)
  const t = tendencias(d, { desde: dia(11), hasta: dia(20) }, FILTROS_VACIOS)
  ok(!t.cmp.comparable && t.registros === null, `cobertura 3/10 → sin tendencia (${t.cmp.motivo})`)
  // Con el anterior completo y el mismo volumen diario la variación por día es 0 %
  const rows2 = [...rows]
  for (let n = 4; n <= 10; n++) for (let i = 0; i < 100; i++) rows2.push(fila({ TuboId: String(++id), PedidoId: `P${id}`, Area: "A", FechaImpresion: `${dia(n)} 09:00:00` }))
  const t2 = tendencias(dataset(rows2), { desde: dia(11), hasta: dia(20) }, FILTROS_VACIOS)
  ok(t2.cmp.comparable && cerca(t2.registros, 0, 1e-9), "cobertura completa y mismo volumen diario → 0 %")
}

// Media por día de la semana: un festivo sin actividad en el área cuenta como 0
{
  const rows = [
    fila({ TuboId: "1", PedidoId: "a", Area: "EXTRACCIONES", FechaImpresion: "2026-05-04 09:00:00" }), // lunes
    fila({ TuboId: "2", PedidoId: "b", Area: "URGENCIAS", FechaImpresion: "2026-05-11 09:00:00" }),    // lunes sin extracciones
  ]
  const d = dataset(rows)
  const m = porDiaSemana(d, { desde: "2026-05-04", hasta: "2026-05-11" }, { ...FILTROS_VACIOS, areas: ["EXTRACCIONES"] })
  ok(m[0] === 0.5, `lunes EXTRACCIONES: 1 tubo / 2 lunes cargados = ${m[0]}`)
}

// Tasa de eventos con filtro de urgencia: denominador sin filtro de urgencia
{
  const rows = [
    fila({ TuboId: "1", PedidoId: "a", Area: "A", Prioridad: "2", Impresiones: "2", FechaImpresion: "2026-05-04 09:00:00" }),
    ...Array.from({ length: 9 }, (_, i) => fila({ TuboId: `n${i}`, PedidoId: `n${i}`, Area: "A", Prioridad: "1", FechaImpresion: "2026-05-04 10:00:00" })),
  ]
  const k = kpis(dataset(rows), { desde: "2026-05-04", hasta: "2026-05-04" }, { ...FILTROS_VACIOS, urgencia: "urgente" })
  ok(k.tasaEventos === 100, `tasa con filtro urgente = 1 evento / 10 registros = ${k.tasaEventos} ‰`)
}

// Sprint 26: validaciones sospechosamente rápidas
ok(esLimiteBucket(VALIDACION_RAPIDA.umbralMin), `el umbral (${VALIDACION_RAPIDA.umbralMin} min) es un límite de bucket: recuento exacto`)
{
  const h = emptyHist()
  for (const x of [0.2, 0.5, 0.95, 1, 1.5, 3, 6]) h[bucketIndex(x)]++
  ok(cuentaBajo(h, 1) === 3, `cuentaBajo(<1 min) = 3 (${cuentaBajo(h, 1)})`)
  // Petición por petición: 3 pedidos validados a los 20 s y 7 a los 5 min → 30 % rápidas, aviso
  const rows = [
    ...Array.from({ length: 3 }, (_, i) => fila({ TuboId: `r${i}`, PedidoId: `r${i}`, Area: "URGENCIAS", FechaNumeracion: "2026-05-04 09:00:00", FechaImpresion: "2026-05-04 09:00:00", FechaValidacionPedido: "2026-05-04 09:00:20" })),
    ...Array.from({ length: 7 }, (_, i) => fila({ TuboId: `n${i}`, PedidoId: `n${i}`, Area: "EXTRACCIONES", FechaNumeracion: "2026-05-04 09:00:00", FechaImpresion: "2026-05-04 09:00:00", FechaValidacionPedido: "2026-05-04 09:05:00" })),
  ]
  const v = validacionesRapidas(dataset(rows), { desde: "2026-05-04", hasta: "2026-05-04" }, FILTROS_VACIOS)
  ok(v.total.rapidas === 3 && v.total.pct === 30 && v.total.nivel === "pocosDatos", `3 de 10 peticiones en < 1 min = ${v.total.pct} % (n < ${VALIDACION_RAPIDA.nMin}: pocos datos)`)
  const urg = v.areas.find(a => a.clave === "URGENCIAS")!
  ok(urg.pct === 100 && urg.p50SinRapidas === null, "URGENCIAS: 100 % rápidas, sin mediana restante")
  ok(tendenciaTiempo(0.3, v.total, null).neutra, "una mediana < 1 min nunca se pinta como mejora")
  ok(tendenciaTiempo(5, { ...v.total, nivel: "aviso", pct: 12 }, { ...v.total, nivel: "aviso", pct: 8 }).neutra, "si suben las validaciones rápidas, la bajada del tiempo es neutra")
  ok(!tendenciaTiempo(5, { ...v.total, nivel: "ok", pct: 2 }, { ...v.total, nivel: "ok", pct: 2 }).neutra, "sin validaciones rápidas, la tendencia sí se valora")
}

// Formato de minutos
ok(fmtMin(2.4) === "2,4 min" && fmtMin(0.55) === "0,6 min" && fmtMin(59.7) === "1 h" && fmtMin(119.6) === "2 h" && fmtMin(12.4) === "12 min", "fmtMin: 2,4 min · 0,6 min · 1 h · 2 h · 12 min")

// Facturación: cambio de tarifa a mitad de mes → dos líneas cuadradas, total en céntimos
{
  const rows = [
    ...Array.from({ length: 3 }, (_, i) => fila({ TuboId: `x${i}`, PedidoId: `x${i}`, Area: "A", Consumible: "EDTA", FechaImpresion: "2026-06-05 09:00:00" })),
    ...Array.from({ length: 7 }, (_, i) => fila({ TuboId: `y${i}`, PedidoId: `y${i}`, Area: "A", Consumible: "EDTA", FechaImpresion: "2026-06-20 09:00:00" })),
  ]
  const l = facturacion(dataset(rows), { desde: "2026-06-01", hasta: "2026-06-30" }, FILTROS_VACIOS, [
    { consumible: "EDTA", precio: 0.105, moneda: "EUR", vigenteHasta: "2026-06-15" },
    { consumible: "EDTA", precio: 0.1133, moneda: "EUR", vigenteDesde: "2026-06-16" },
  ])
  ok(l.length === 2 && l.every(x => x.importe === Math.round(x.unidades * (x.precio ?? 0) * 100) / 100), "dos líneas y unidades × precio = importe")
  ok(totalImporte(l) === 0.32 + 0.79, `total = suma de líneas redondeadas (${totalImporte(l)})`)
}

// Error de percentiles en duraciones muy cortas (mitad < 1 min, cola larga)
{
  let semilla = 7
  const rnd = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647)
  const v = Array.from({ length: 20000 }, () => (rnd() < 0.6 ? rnd() * 1.2 : -Math.log(rnd()) * 15))
  const h = emptyHist()
  for (const x of v) h[bucketIndex(x)]++
  const max = Math.max(...v)
  const e50 = Math.abs(percentile(h, 0.5, max)! - exacto(v, 0.5)!), e90 = Math.abs(percentile(h, 0.9, max)! - exacto(v, 0.9)!)
  ok(e50 < 0.05, `mediana de duraciones cortas: error ${e50.toFixed(3)} min`)
  ok(e90 < 0.3, `P90: error ${e90.toFixed(3)} min`)
}

console.log(fallos ? `\n${fallos} comprobaciones fallidas` : "\nTodas las comprobaciones correctas")
process.exit(fallos ? 1 : 0)
