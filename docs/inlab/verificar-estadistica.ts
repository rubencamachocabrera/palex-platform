/**
 * Verificación estadística reproducible de InLab Analytics (sin datos reales).
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
 * 4. Pruebas pedidas: una vez por petición, en el día/área/prioridad de su primer tubo, perfiles
 *    agrupados, filas de error excluidas, KPIs/ranking/áreas y recorte de informes públicos.
 *    (Verificado además contra la BD real de Gómez Ulla con una referencia Python independiente:
 *    770 pruebas, 11 áreas, 211 días, prioridad y peticiones idénticos.)
 * 5. Sprint 28 (Pulso + pruebas que se piden juntas): parejas por mes × área (una vez por
 *    petición, mínimo PARES_MINIMO, mes del primer tubo), calcularJuntas (% y lift), reloj de
 *    24 h (= suma de la actividad por hora), río (cubo = pruebas solicitadas), calendario y
 *    hallazgos. (Parejas verificadas además contra la BD real de Gómez Ulla con Python:
 *    176.559 celdas mes × área idénticas.)
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
import { decodificarPruebas, kpisPruebas, pruebaPorArea, rankingPruebas } from "../../src/lib/inlab/pruebas-analytics"
import { filtrarPruebasParaShare, MIN_PETICIONES_PRUEBA_SHARE } from "../../src/lib/inlab/share"
import { PARES_MINIMO, type InlabPruebasPayload } from "../../src/lib/inlab/types"
import { calcularJuntas } from "../../src/lib/inlab/juntas-calculo"
import { actividadPorDia, flujoPruebas, nivelDe, nivelesCalendario, rankingAreas, relojDia, resumenDia } from "../../src/lib/inlab/pulso"
import { hallazgos } from "../../src/lib/inlab/hallazgos"
import { diaSemana } from "../../src/lib/inlab/dates"

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

// ─── 4. Pruebas pedidas ──────────────────────────────────────────────────────
console.log("Pruebas")
{
  const a = new InlabAggregator([...CABECERAS_PLANAS], MAPEO_PLANO, "DMY")
  // P1: extracciones, normal, 1-mar; repite Colesterol y trae 3 parámetros del hemograma + un error
  a.add(fila({ TuboId: "1", PedidoId: "P1", Area: "EXTRACCIONES", Prioridad: "1", FechaImpresion: "2026-03-01 08:00:00",
    Pruebas: "Bioquimica~Colesterol|Bioquimica~Colesterol|Hematologia~Leucocitos|Hematologia~Hemoglobina|Hematologia~Hematíes|Error~error indeterminado" }))
  a.add(fila({ TuboId: "2", PedidoId: "P1", Area: "EXTRACCIONES", Prioridad: "1", FechaImpresion: "2026-03-02 08:00:00", Pruebas: "Bioquimica~Glucosa" }))
  // P2: urgencias, urgente, 1-mar
  a.add(fila({ TuboId: "3", PedidoId: "P2", Area: "URGENCIAS", Prioridad: "2", FechaImpresion: "2026-03-01 09:00:00", Pruebas: "Hematologia~Plaquetas .|Bioquimica 60~Colesterol" }))
  // Formato B: pruebas sueltas por pedido (P2 repetida, P9 sin tubos)
  a.addPrueba("P2", "Colesterol", "Bioquimica")
  a.addPrueba("P9", "TSH", "Bioquimica")
  const { payload, stats } = a.build()
  const pp: InlabPruebasPayload = { dias: payload.dias, areas: payload.dic.areas, pruebas: payload.pruebas! }
  const dp = decodificarPruebas(pp)
  const r: Rango = { desde: "2026-03-01", hasta: "2026-03-02" }
  const k = kpisPruebas(dp, r, FILTROS_VACIOS)
  const rk = rankingPruebas(dp, r, FILTROS_VACIOS)
  const n = (p: string) => rk.find(x => x.prueba === p)?.n ?? 0
  ok(n("Colesterol") === 2, `Colesterol: una vez por petición (${n("Colesterol")} de 2 peticiones)`)
  ok(n("Hemograma") === 2 && rk.find(x => x.prueba === "Hemograma")!.parametros === 4, "Hemograma agrupa sus parámetros («Plaquetas .» incluido) y cuenta 1 por petición")
  ok(!rk.some(x => /error/i.test(x.prueba)) && stats.avisos.some(t => t.includes("no son pruebas")), "las filas de error no cuentan y se avisa")
  ok(n("TSH") === 0 && stats.avisos.some(t => t.includes("sin tubos")), "prueba de una petición sin tubos no cuenta y se avisa")
  ok(dp.filas.filter(x => x.prueba === "Glucosa").every(x => x.d === "2026-03-01"), "pruebas en el día del PRIMER tubo de la petición")
  ok(k.peticiones === 2 && k.solicitadas === 5 && k.porPeticion === 2.5, `KPIs: 2 peticiones, 5 pruebas, 2,5 por petición (${k.peticiones}, ${k.solicitadas}, ${k.porPeticion})`)
  const ku = kpisPruebas(dp, r, { ...FILTROS_VACIOS, urgencia: "urgente" })
  ok(ku.peticiones === 1 && ku.solicitadas === 2, "filtro de prioridad: prioridad de la petición")
  ok(rankingPruebas(dp, r, { ...FILTROS_VACIOS, areas: ["URGENCIAS"] }).length === 2, "filtro de área")
  const pa = pruebaPorArea(dp, r, FILTROS_VACIOS, "Glucosa")
  ok(pa.length === 1 && pa[0].area === "EXTRACCIONES" && pa[0].pct === 100, "prueba por área con % de peticiones del área")
  const sh = filtrarPruebasParaShare(pp, ["URGENCIAS"])
  ok(sh.pruebas.filas.length === 0 && sh.pruebas.nombres.length === 0 && sh.areas.length === 1,
    `informe público: fuera las áreas no incluidas y las pruebas con < ${MIN_PETICIONES_PRUEBA_SHARE} peticiones (sin nombres)`)
}

// ─── 5. Pulso y pruebas que se piden juntas ──────────────────────────────────
console.log("Pruebas que se piden juntas")
{
  const a = new InlabAggregator([...CABECERAS_PLANAS], MAPEO_PLANO, "DMY")
  const t = (id: string, ped: string, area: string, fecha: string, pruebas: string) =>
    a.add(fila({ TuboId: id, PedidoId: ped, Area: area, Prioridad: "1", FechaImpresion: fecha, Pruebas: pruebas }))
  // P1–P4: A+B+C en extracciones (marzo); P5: A+B (+ A repetida); P6: A+B en urgencias (1 sola → bajo el mínimo)
  for (const p of ["P1", "P2", "P3", "P4"]) t(`t${p}`, p, "EXTRACCIONES", "2026-03-10 08:00:00", "Bioquimica~A|Bioquimica~B|Bioquimica~C")
  t("t5", "P5", "EXTRACCIONES", "2026-03-11 08:00:00", "Bioquimica~A|Bioquimica~B|Bioquimica~A")
  t("t6", "P6", "URGENCIAS", "2026-03-11 09:00:00", "Bioquimica~A|Bioquimica~B")
  // P7: primer tubo el 31-mar y otro el 1-abr → sus parejas van a marzo
  t("t7a", "P7", "EXTRACCIONES", "2026-03-31 23:50:00", "Bioquimica~B|Bioquimica~C")
  t("t7b", "P7", "EXTRACCIONES", "2026-04-01 00:10:00", "")
  const { payload } = a.build()
  const P = payload.pruebas!, Q = P.pares!
  const celda = (mes: string, area: string, x: string, y: string) => {
    const ix = P.nombres.indexOf(x), iy = P.nombres.indexOf(y)
    return Q.filas.find(r => Q.meses[r[0]] === mes && payload.dic.areas[r[1]] === area && ((r[2] === ix && r[3] === iy) || (r[2] === iy && r[3] === ix)))?.[4] ?? 0
  }
  ok(Q.minimo === PARES_MINIMO && Q.filas.every(r => r[2] < r[3] && r[4] >= PARES_MINIMO), `celdas con a < b y al menos ${PARES_MINIMO} peticiones`)
  ok(celda("2026-03", "EXTRACCIONES", "A", "B") === 5, `A+B = 5 peticiones (la A repetida en P5 no cuenta doble) (${celda("2026-03", "EXTRACCIONES", "A", "B")})`)
  ok(celda("2026-03", "EXTRACCIONES", "B", "C") === 5 && celda("2026-03", "EXTRACCIONES", "A", "C") === 4, "B+C incluye la petición que cruza de mes (en el mes de su primer tubo)")
  ok(celda("2026-03", "URGENCIAS", "A", "B") === 0 && !Q.meses.includes("2026-04"), "celdas por debajo del mínimo fuera; abril sin parejas")

  const totales = new Map([["A", { n: 50, seccion: "Bioquímica" }], ["B", { n: 40, seccion: "Bioquímica" }], ["C", { n: 10, seccion: "Hormonas" }]])
  const j = calcularJuntas({ meses: ["2026-03"], peticiones: 100, totales, parejas: [{ a: "A", b: "B", n: 30 }, { a: "B", b: "C", n: 9 }], deLaPrueba: { nombre: "A", filas: [{ otra: "A", n: 50 }, { otra: "B", n: 30 }] } })
  const cB = j.prueba!.companeras[0]
  ok(j.prueba!.n === 50 && cB.prueba === "B" && cB.pct === 60 && cB.pctInversa === 75 && cB.lift === 1.5, `compañera: 60 % de A lleva B, 75 % de B lleva A, ×1,5 (${cB.pct}, ${cB.pctInversa}, ${cB.lift})`)
  const bc = j.frecuentes.find(p => p.a === "C")!
  ok(!!bc && bc.b === "B" && bc.pctAB === 90 && bc.lift === 2.25, "pareja leída desde la prueba menos frecuente (C → B: 90 %, ×2,25)")
  ok(j.afines.length === 0, "afines: exige al menos 20 peticiones y ×2 (B+C tiene 9)")
}

console.log("Pulso")
{
  const r = rango, f = FILTROS_VACIOS
  const rk = rankingAreas(ds, r, f).map(x => x.area)
  const rel = relojDia(ds, r, f, { tipo: "laborable" }, rk)
  let suma = 0, dias = 0
  for (const d of ds.dias) if (diaSemana(d) < 5) dias++
  for (const x of ds.actividad) if (diaSemana(x.d) < 5) suma += x.porHora.reduce((s, v) => s + v, 0)
  ok(rel.dias === dias && Math.abs(rel.total - suma / dias) < 1e-6, `reloj: día laborable medio = actividad por hora / días laborables cargados (${rel.total.toFixed(1)})`)
  ok(Math.abs(rel.horas.reduce((s, h) => s + h.v.reduce((x, y) => x + y, 0), 0) - rel.total) < 1e-6, "reloj: las áreas suman el total de cada hora")
  ok(rel.mitadA !== null && rel.inicio! <= rel.mitadA && rel.mitadA <= rel.fin!, "reloj: inicio ≤ mitad del día ≤ fin")
  const d0 = ds.dias[3]
  const relD = relojDia(ds, r, f, { tipo: "dia", d: d0 }, rk)
  const tubosD = ds.actividad.filter(x => x.d === d0).reduce((s, x) => s + x.porHora.reduce((a, b) => a + b, 0), 0)
  ok(relD.dias === 1 && Math.abs(relD.total - tubosD) < 1e-6, "reloj de un día concreto = sus tubos por hora")
  const cal = actividadPorDia(ds, f)
  const um = nivelesCalendario([...cal.values()].map(x => x.peticiones ?? x.tubos))
  ok(cal.size === ds.dias.length && um.every((u, i) => i === 0 || u >= um[i - 1]) && nivelDe(0, um) === 0 && nivelDe(Infinity, um) === 5, "calendario: un día por día cargado, niveles crecientes")
  const rd = resumenDia(ds, null, d0, f)
  ok(rd.peticiones === kpis(ds, { desde: d0, hasta: d0 }, f).ordenes, "resumen del día = peticiones del día")
  const hs = hallazgos({ ds, dp: null, rango: r, filtros: f })
  ok(hs.length > 0 && hs.every((h, i) => i === 0 || h.peso <= hs[i - 1].peso), `hallazgos ordenados por peso (${hs.map(h => h.id).join(", ")})`)
  const hp = hs.find(h => h.id === "hora-punta")
  ok(!hp || hp.titulo.includes(`${rel.ventanaPico!.desde}:00`), "hallazgo de hora punta = ventana de 2 h del reloj")
}
{
  // Río: el cubo área × sección × prueba suma las pruebas solicitadas
  const a = new InlabAggregator([...CABECERAS_PLANAS], MAPEO_PLANO, "DMY")
  const areas = ["EXTRACCIONES", "URGENCIAS", "PLANTA1", "PLANTA2", "PLANTA3", "PLANTA4", "PLANTA5", "PLANTA6", "PLANTA7"]
  let id = 0
  for (const [i, ar] of areas.entries()) for (let k = 0; k <= i; k++)
    a.add(fila({ TuboId: String(++id), PedidoId: `R${id}`, Area: ar, FechaImpresion: "2026-03-02 08:00:00", Pruebas: `Bioquimica~P${k}|Hormonas~H${i}|Orina~O${k % 2}` }))
  const { payload } = a.build()
  const dp = decodificarPruebas({ dias: payload.dias, areas: payload.dic.areas, pruebas: payload.pruebas! })
  const rr: Rango = { desde: "2026-03-02", hasta: "2026-03-02" }
  const fl = flujoPruebas(dp, rr, FILTROS_VACIOS, { maxAreas: 4, maxSecciones: 2, maxPruebas: 5 })
  const tot = kpisPruebas(dp, rr, FILTROS_VACIOS).solicitadas
  const cubo = fl.cubo.flat(2).reduce((s, v) => s + v, 0)
  ok(cubo === tot && fl.total === tot && fl.areas.reduce((s, n) => s + n.v, 0) === tot && fl.pruebas.reduce((s, n) => s + n.v, 0) === tot, `río: cubo = nodos = pruebas solicitadas (${cubo})`)
  ok(fl.areas.length === 5 && fl.areas[4].agrupa === 5 && (fl.pruebas[fl.pruebas.length - 1].agrupa ?? 0) > 0, "río: «otras» agrupa el resto en cada columna")
}

console.log(fallos ? `\n${fallos} comprobaciones fallidas` : "\nTodas las comprobaciones correctas")
process.exit(fallos ? 1 : 0)
