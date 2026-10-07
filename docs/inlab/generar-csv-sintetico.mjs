#!/usr/bin/env node
/**
 * Genera una exportación InLab SINTÉTICA (sin datos reales) en el FORMATO PLANO
 * de docs/inlab/exportacion-inlab.sql: una fila por tubo/etiqueta, separador ",",
 * fechas ISO de SQL Server, UTF-8. Las distribuciones imitan Gómez Ulla
 * (espera ~6 min, extracción ~4 min, ~23 % urgentes, ~6 % reimpresiones, ~6 % anulados).
 *
 *   node docs/inlab/generar-csv-sintetico.mjs [dias=14] [pedidosDia=120] [salida=docs/inlab/ejemplo-inlab-sintetico.csv] [desde=2026-06-01]
 *
 *   node docs/inlab/generar-csv-sintetico.mjs                         → ~6.000 filas (ejemplo versionado)
 *   node docs/inlab/generar-csv-sintetico.mjs 365 3000 /tmp/big.csv   → ~5 M filas (prueba de rendimiento)
 */
import { createWriteStream } from "node:fs"

const [dias = "14", pedidosDia = "120", salida = "docs/inlab/ejemplo-inlab-sintetico.csv", desde = "2026-06-01"] = process.argv.slice(2)
const N_DIAS = Number(dias), N_PED = Number(pedidosDia)

// PRNG determinista (mulberry32) para que el ejemplo sea reproducible
let seed = 20260601
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const pick = arr => arr[Math.floor(rnd() * arr.length)]
const pesos = obj => { const tot = Object.values(obj).reduce((a, b) => a + b, 0); let r = rnd() * tot; for (const [k, w] of Object.entries(obj)) { if ((r -= w) <= 0) return k } return Object.keys(obj)[0] }
const logNormal = (mediana, dispersion) => Math.exp(Math.log(mediana) + dispersion * Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd()))

const AREAS = {
  EXTRACCIONES: { peso: 70, puestos: ["A1", "A2", "B3", "B4", "C5", "C6", "A7", "A9"], impresora: "ZEBRA BOX-2", urg: 0.03, horas: [7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 11, 12, 13], llegada: true, domingo: 0, sabado: 0 },
  URGENCIAS: { peso: 19, puestos: ["URG-A", "URG-B", "URG-C", "URG-D", "URG-TRIAJE"], impresora: "ZEBRA-URGENCIAS", urg: 0.8, horas: Array.from({ length: 24 }, (_, h) => h), llegada: false, domingo: 0.9, sabado: 0.95 },
  PLANTA4: { peso: 4, puestos: ["PL-4A", "PL-4B"], impresora: "ZEBRA-PLANTA 4", urg: 0.6, horas: [6, 6, 7, 7, 12, 16, 20], llegada: false, domingo: 0.7, sabado: 0.8 },
  PLANTA12: { peso: 4, puestos: ["PL-12A", "PL-12B"], impresora: "ZEBRA-PLANTA 12", urg: 0.5, horas: [6, 6, 7, 7, 12, 16, 20], llegada: false, domingo: 0.7, sabado: 0.8 },
  PLANTA17: { peso: 3, puestos: ["PL-17A", "PL-17B"], impresora: "ZEBRA-PLANTA 17", urg: 0.33, horas: [6, 6, 7, 7, 12, 16, 20], llegada: false, domingo: 0.7, sabado: 0.8 },
}
const TUBOS = { "ROJO SUERO": 18, "MALVA EDTA": 15, COAGULACION: 6, "ETIQUETAS 999": 6, "ETIQUETAS MICRO": 3, IMMUNOLOGIA: 2.3, SEROLOGIA: 1.5, "ETIQUETA ORINA": 0.8, "VERDE HLIT": 0.5 }
const SECCION = { "ROJO SUERO": "Bioquimica", "MALVA EDTA": "Hematologia", COAGULACION: "Coagulacion", "ETIQUETAS 999": "Inmunologia", "ETIQUETAS MICRO": "Micro.", IMMUNOLOGIA: "Inmunologia", SEROLOGIA: "Serologia", "ETIQUETA ORINA": "Orina", "VERDE HLIT": "Bioquimica", "ETIQUETA EXTRAC.": "" }
const INCIDENCIAS = ["NAYUNO", "DIFICIL", "PNEXT", "MAREO", "CIRCA"]

const pad = (n, l = 2) => String(n).padStart(l, "0")
const fmt = ms => { if (ms == null) return ""; const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(), 3)}` }

const out = createWriteStream(salida, { encoding: "utf8" })
out.write("TuboId,PedidoId,Area,Puesto,Impresora,Consumible,Seccion,Prioridad,UnidadReceptora,EstadoPedido,EstadoTubo,Impresiones,IncidenciaPedido,IncidenciaTubo,FechaPeticion,FechaLlegada,FechaNumeracion,FechaImpresion,FechaValidacionTubo,FechaValidacionPedido,NumPruebasPedido\n")

let filas = 0, pedidoId = 100000, tuboId = 500000
const inicio = Date.parse(`${desde}T00:00:00Z`)
for (let d = 0; d < N_DIAS; d++) {
  const dia0 = inicio + d * 86400000
  const dow = new Date(dia0).getUTCDay()
  const factorDia = (1 + d / N_DIAS * 0.08) * (0.9 + rnd() * 0.2)
  for (let o = 0; o < N_PED * factorDia; o++) {
    const area = pesos(Object.fromEntries(Object.entries(AREAS).map(([k, v]) => [k, v.peso])))
    const A = AREAS[area]
    if (dow === 0 && rnd() > A.domingo) continue
    if (dow === 6 && rnd() > A.sabado) continue
    pedidoId++
    const urgente = rnd() < A.urg
    const num = dia0 + pick(A.horas) * 3600000 + Math.floor(rnd() * 3600) * 1000
    const lle = A.llegada && rnd() < 0.85 ? num - Math.round(logNormal(6, 0.8) * 60000) : null
    const val = rnd() < 0.95 ? num + Math.round(logNormal(urgente ? 2.5 : 3.8, 0.9) * 60000) : null
    const puesto = pick(A.puestos)
    const incPed = rnd() < 0.002 ? pick(INCIDENCIAS) : ""
    const unidad = urgente ? "LABUHCD" : rnd() < 0.15 ? "LABMHCD" : "LABGHCD"
    const pruebas = 2 + Math.floor(rnd() * 40)
    const tubos = ["ETIQUETA EXTRAC.", "ETIQUETA EXTRAC."]
    const nTubos = 1 + Math.floor(rnd() * 3.5)
    for (let t = 0; t < nTubos; t++) tubos.push(pesos(TUBOS))
    for (const tubo of tubos) {
      tuboId++
      const anulado = rnd() < 0.058
      const imp = rnd() < 0.06 ? 2 + Math.floor(rnd() * rnd() * 4) : 1
      const impMs = num + Math.floor(rnd() * 20) * 1000
      const vt = anulado || val == null ? null : val + Math.floor(rnd() * 5) * 1000
      out.write([tuboId, pedidoId, area, puesto, A.impresora, tubo, SECCION[tubo] ?? "", urgente ? 2 : 1, unidad, 5, anulado ? -1 : 5, imp, incPed, "", fmt(num), fmt(lle), fmt(num), fmt(impMs), fmt(vt), fmt(val), pruebas].join(",") + "\n")
      filas++
    }
  }
}
out.end(() => console.log(`Generadas ${filas.toLocaleString("es-ES")} filas en ${salida}`))
