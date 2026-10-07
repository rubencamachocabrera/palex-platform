#!/usr/bin/env node
/**
 * Genera una exportación InLab SINTÉTICA (sin datos reales) para probar el
 * asistente de carga de Inteligencia InLab.
 *
 *   node docs/inlab/generar-csv-sintetico.mjs [dias=30] [ordenesDia=100] [salida=docs/inlab/ejemplo-inlab-sintetico.csv] [desde=2026-06-01]
 *
 * Ejemplos:
 *   node docs/inlab/generar-csv-sintetico.mjs                       → ~7.000 filas, < 1 MB (el ejemplo versionado)
 *   node docs/inlab/generar-csv-sintetico.mjs 365 3000 /tmp/big.csv → ~2,7 M filas, ~300 MB (prueba de rendimiento)
 *
 * Formato imitando una exportación MySQL: separador ";", fechas ISO, UTF-8,
 * una fila por recipiente/etiqueta impresa. Las columnas son SUPUESTAS: el
 * fichero real puede diferir (ver src/lib/inlab/README.md).
 */
import { createWriteStream } from "node:fs"

const [dias = "30", ordenesDia = "100", salida = "docs/inlab/ejemplo-inlab-sintetico.csv", desde = "2026-06-01"] = process.argv.slice(2)
const N_DIAS = Number(dias), N_ORD = Number(ordenesDia)

// PRNG determinista (mulberry32) para que el ejemplo sea reproducible
let seed = 20260601
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const pick = arr => arr[Math.floor(rnd() * arr.length)]
const pesos = obj => { const tot = Object.values(obj).reduce((a, b) => a + b, 0); let r = rnd() * tot; for (const [k, w] of Object.entries(obj)) { if ((r -= w) <= 0) return k } return Object.keys(obj)[0] }
const logNormal = (mediana, dispersion) => Math.exp(Math.log(mediana) + dispersion * Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd()))

const AREAS = {
  "Extracciones": { peso: 60, puestos: ["MO-01", "MO-02", "MO-03", "BOX-1", "BOX-2", "BOX-3", "BOX-4", "BOX-5", "BOX-6"], impresoras: ["ZEBRA MO-1", "ZEBRA MO-2", "ZEBRA BOX-2", "BC-ROBO"], urg: 0.05, horas: [7, 8, 8, 8, 9, 9, 9, 10, 10, 11, 12, 13], domingo: 0, sabado: 0.3, petExt: 25, extRec: 35 },
  "Urgencias": { peso: 22, puestos: ["URG-A", "URG-B", "URG-C", "URG-TRIAJE"], impresoras: ["ZEBRA-Urgencias", "ZEBRA-Triaje"], urg: 0.8, horas: Array.from({ length: 24 }, (_, h) => h).concat([10, 11, 12, 17, 18, 19, 20]), domingo: 0.9, sabado: 0.95, petExt: 12, extRec: 15 },
  "Planta 3ª": { peso: 10, puestos: ["PL-3A", "PL-3B"], impresoras: ["ZEBRA Planta 3"], urg: 0.15, horas: [6, 6, 7, 7, 7, 8, 12, 16, 20], domingo: 0.7, sabado: 0.8, petExt: 90, extRec: 70 },
  "Planta 4ª": { peso: 8, puestos: ["PL-4A", "PL-4B"], impresoras: ["ZEBRA Planta 4"], urg: 0.15, horas: [6, 6, 7, 7, 7, 8, 12, 16, 20], domingo: 0.7, sabado: 0.8, petExt: 110, extRec: 80 },
}
const TUBOS = { "Tubo rojo · Suero": 34, "Tubo malva · EDTA": 28, "Tubo azul · Coagulación": 14, "Tubo verde · Heparina": 6, "Tubo negro · VSG": 4, "Tubo gris · Glucosa": 3, "Contenedor orina": 8, "Tubo · Serología": 3 }

const pad = n => String(n).padStart(2, "0")
const fmt = ms => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}` }

const out = createWriteStream(salida, { encoding: "utf8" })
out.write("id_peticion;fecha_peticion;fecha_extraccion;fecha_recepcion;fecha_validacion;area_trabajo;puesto;tipo_tubo;cantidad;evento;prioridad;impresora\n")

let filas = 0, ordenId = 100000
const inicio = Date.parse(`${desde}T00:00:00Z`)
for (let d = 0; d < N_DIAS; d++) {
  const dia0 = inicio + d * 86400000
  const dow = new Date(dia0).getUTCDay()
  // tendencia suave al alza + ruido diario
  const factorDia = (1 + d / N_DIAS * 0.08) * (0.9 + rnd() * 0.2)
  for (let o = 0; o < N_ORD * factorDia; o++) {
    const areaNombre = pesos(Object.fromEntries(Object.entries(AREAS).map(([k, v]) => [k, v.peso])))
    const A = AREAS[areaNombre]
    if (dow === 0 && rnd() > A.domingo) continue
    if (dow === 6 && rnd() > A.sabado) continue
    ordenId++
    const urgente = rnd() < A.urg
    const hora = pick(A.horas)
    const pet = dia0 + hora * 3600000 + Math.floor(rnd() * 3600) * 1000
    const ext = pet + Math.round(logNormal(urgente ? A.petExt * 0.5 : A.petExt, 0.6) * 60000)
    const rec = ext + Math.round(logNormal(urgente ? A.extRec * 0.6 : A.extRec, 0.5) * 60000)
    const val = rec + Math.round(logNormal(urgente ? 45 : 160, 0.7) * 60000)
    const puesto = pick(A.puestos), impresora = pick(A.impresoras)
    const nTubos = 1 + Math.floor(rnd() * 3.2)
    const id = `PS${ordenId}`
    const filaBase = (tubo, cant, evento, conRec = true, conVal = true, extMs = ext) =>
      `${id};${fmt(pet)};${fmt(extMs)};${conRec ? fmt(rec) : ""};${conVal && rnd() > 0.04 ? fmt(val) : ""};${areaNombre};${puesto};${tubo};${cant};${evento};${urgente ? "URGENTE" : "NORMAL"};${impresora}\n`
    // Etiqueta de extracción (una por orden)
    out.write(filaBase("Etiqueta de extracción", 1, "")); filas++
    for (let t = 0; t < nTubos; t++) {
      const tubo = pesos(TUBOS)
      const r = rnd()
      let evento = ""
      if (r < 0.015) evento = "REIMPRESION"
      else if (r < 0.019) evento = pick(["RECHAZO_HEMOLIZADA", "RECHAZO_COAGULADA", "RECHAZO_INSUFICIENTE"])
      else if (r < 0.021) evento = "ANULADA"
      else if (r < 0.024) evento = pick(["ERROR_IMPRESORA_SIN_PAPEL", "ERROR_IMPRESORA_OFFLINE"])
      out.write(filaBase(tubo, 1, evento, evento !== "ANULADA", !evento.startsWith("RECHAZO") && evento !== "ANULADA")); filas++
    }
  }
}
out.end(() => console.log(`Generadas ${filas.toLocaleString("es-ES")} filas en ${salida}`))
