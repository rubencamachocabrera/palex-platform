// Generadores de datos ficticios — misma firma que la futura API real
// Para conectar backend real: solo actualizar data-service.ts, estos generadores no se tocan

import type {
  Hospital, ConsumoParams, ConsumoMensual, ForecastPunto,
  Incidencia, Alerta, CorrelacionPunto, FranjaHoraria,
  DiaSemanaHeatmap, IndicadorAvanzado,
  TipoIncidencia,
} from "./types"

// ─── Utilidades ────────────────────────────────────────────────────────────────

export function seededRand(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF
    return (s >>> 0) / 0xFFFFFFFF
  }
}

function hospitalSeed(hospitalId: string, offset = 0) {
  return hospitalId.split("").reduce((a, c) => a + c.charCodeAt(0), offset)
}

// ─── Catálogo de tubos ─────────────────────────────────────────────────────────

export const TUBOS = [
  { key: "edta",   label: "EDTA K2",       sub: "Tapón lila · Hemograma, HbA1c, VSG",           color: "#8B5CF6", light: "#EDE9FE" },
  { key: "hepar",  label: "Heparina Li",   sub: "Tapón verde · Bioquímica urgente, ionograma",  color: "#10B981", light: "#D1FAE5" },
  { key: "coag",   label: "Coagulación",   sub: "Tapón azul · INR, TTPA, fibrinógeno",           color: "#3B82F6", light: "#DBEAFE" },
  { key: "suero",  label: "Suero / SST",   sub: "Tapón dorado · Bioquímica, hormonas, tumoral",  color: "#F59E0B", light: "#FEF3C7" },
  { key: "gluco",  label: "Glucosa / NaF", sub: "Tapón gris · Glucemia, TTOG",                  color: "#6B7280", light: "#F3F4F6" },
  { key: "orina",  label: "Orina",         sub: "Tapón amarillo · Análisis, sedimento",          color: "#EAB308", light: "#FEF9C3" },
  { key: "inmuno", label: "Inmunología",   sub: "Tapón rosa · Alergias IgE, serologías",         color: "#EC4899", light: "#FCE7F3" },
  { key: "hemoc",  label: "Hemocultivo",   sub: "Botella roja · Infecciones, urocultivo",        color: "#EF4444", light: "#FEE2E2" },
] as const
export type TuboKey = typeof TUBOS[number]["key"]

// ─── Multiplicadores estacionales ─────────────────────────────────────────────

const SEASONAL_MULT: Record<TuboKey, number[]> = {
  edta:  [1.10,1.05,1.00,0.88,1.02,0.95,0.72,0.68,1.05,1.20,1.25,0.90],
  hepar: [1.12,1.08,1.00,0.85,1.00,0.93,0.70,0.65,1.08,1.22,1.28,0.88],
  coag:  [1.05,1.00,0.98,0.90,1.00,0.95,0.75,0.72,1.02,1.15,1.18,0.92],
  suero: [1.15,1.12,1.05,0.90,1.05,0.98,0.74,0.70,1.10,1.25,1.30,0.92],
  gluco: [1.08,1.10,1.02,0.88,1.00,0.95,0.72,0.68,1.05,1.18,1.22,0.90],
  orina: [1.05,1.02,0.98,0.88,1.00,0.92,0.70,0.68,1.05,1.18,1.20,0.88],
  inmuno:[0.90,0.85,1.30,1.20,1.45,0.95,0.65,0.62,0.88,0.85,0.82,0.75],
  hemoc: [1.05,1.02,0.95,0.90,0.95,0.92,0.85,0.88,0.95,1.05,1.10,0.98],
}

// ─── Eventos estacionales ──────────────────────────────────────────────────────

export const EVENTOS = [
  { mes: 0,  label: "Reconoc. empresa",   color: "#6366f120", border: "#6366f1" },
  { mes: 1,  label: "Resaca navideña",    color: "#f59e0b15", border: "#f59e0b" },
  { mes: 2,  label: "Campaña alergias",   color: "#ec489920", border: "#ec4899" },
  { mes: 3,  label: "Semana Santa ↓",     color: "#6b728015", border: "#6b7280" },
  { mes: 4,  label: "Campaña alergias",   color: "#ec489920", border: "#ec4899" },
  { mes: 5,  label: "Revisiones verano",  color: "#10b98115", border: "#10b981" },
  { mes: 6,  label: "Vacaciones ↓↓",      color: "#3b82f610", border: "#3b82f6" },
  { mes: 7,  label: "Vacaciones / calor", color: "#3b82f610", border: "#3b82f6" },
  { mes: 8,  label: "Reincorporación",    color: "#10b98115", border: "#10b981" },
  { mes: 9,  label: "Reconoc. laborales", color: "#8b5cf620", border: "#8b5cf6" },
  { mes: 10, label: "Pico máximo año",    color: "#ef444420", border: "#ef4444" },
  { mes: 11, label: "Cierre año ↓",       color: "#6b728015", border: "#6b7280" },
]

// ─── Consumo mensual ───────────────────────────────────────────────────────────

export function generarConsumoMensual(params: ConsumoParams): ConsumoMensual[] {
  const { hospitalId, meses } = params
  const rand = seededRand(hospitalSeed(hospitalId))
  const base = {
    edta:  180 + rand() * 120, hepar: 120 + rand() * 80,
    coag:   70 + rand() *  60, suero: 140 + rand() * 100,
    gluco:  50 + rand() *  40, orina:  55 + rand() *  50,
    inmuno: 30 + rand() *  30, hemoc:  15 + rand() *  20,
  }
  const ahora = new Date()
  return Array.from({ length: meses }, (_, i) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - (meses - 1 - i), 1)
    const mi = d.getMonth()
    const trend = 1 + 0.003 * i
    const noise = () => 0.90 + rand() * 0.20
    return {
      mes: d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }),
      year: d.getFullYear(), monthIndex: mi,
      edta:   Math.round(base.edta   * SEASONAL_MULT.edta[mi]   * trend * noise()),
      hepar:  Math.round(base.hepar  * SEASONAL_MULT.hepar[mi]  * trend * noise()),
      coag:   Math.round(base.coag   * SEASONAL_MULT.coag[mi]   * trend * noise()),
      suero:  Math.round(base.suero  * SEASONAL_MULT.suero[mi]  * trend * noise()),
      gluco:  Math.round(base.gluco  * SEASONAL_MULT.gluco[mi]  * trend * noise()),
      orina:  Math.round(base.orina  * SEASONAL_MULT.orina[mi]  * trend * noise()),
      inmuno: Math.round(base.inmuno * SEASONAL_MULT.inmuno[mi] * trend * noise()),
      hemoc:  Math.round(base.hemoc  * SEASONAL_MULT.hemoc[mi]  * trend * noise()),
    }
  })
}

// ─── Forecast con bandas de confianza ─────────────────────────────────────────

export function generarForecast(hospitalId: string, baseData: ConsumoMensual[], mesesForecast = 3): ForecastPunto[] {
  if (baseData.length < 3) return []
  const rand = seededRand(hospitalSeed(hospitalId, 42))
  const totals = baseData.map(d =>
    TUBOS.reduce((s, t) => s + (d[t.key as keyof ConsumoMensual] as number), 0)
  )
  const last6 = totals.slice(-6)
  const trendPerMonth = last6.length > 1 ? (last6[last6.length - 1] - last6[0]) / last6.length : 0
  const lastTotal = totals[totals.length - 1]

  const result: ForecastPunto[] = baseData.map((d, i) => ({
    mes: d.mes, valor: totals[i], lower: totals[i], upper: totals[i], esForecast: false,
  }))

  const lastDate = new Date()
  for (let i = 1; i <= mesesForecast; i++) {
    const d = new Date(lastDate.getFullYear(), lastDate.getMonth() + i, 1)
    const mes = d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" })
    const noise = 0.95 + rand() * 0.10
    const valor = Math.round((lastTotal + trendPerMonth * i) * noise)
    const unc = 0.08 + 0.06 * i
    result.push({ mes, valor, lower: Math.round(valor * (1 - unc)), upper: Math.round(valor * (1 + unc)), esForecast: true })
  }
  return result
}

// ─── Incidencias ──────────────────────────────────────────────────────────────

const TIPOS: TipoIncidencia[] = ["TEMPERATURA", "RUTA", "NEVERA", "TRANSPORTE", "SISTEMA", "MUESTRA"]
const GRAVEDADES_LIST = ["CRITICA", "ALTA", "ALTA", "MEDIA", "MEDIA", "MEDIA", "BAJA"] as const
const ESTADOS_LIST = ["RESUELTA", "RESUELTA", "RESUELTA", "EN_CURSO", "EN_CURSO", "ABIERTA"] as const
const CAUSAS = [
  "Fallo de sensor RFID", "Corte eléctrico en centro de salud", "Temperatura ambiente excesiva",
  "Error de software BC Robo", "Retraso en ruta de recogida", "Puerta nevera mal cerrada",
  "Calibración incorrecta de sensor", "Fallo Gateway BT", "Muestra etiquetada incorrectamente",
  "Mantenimiento no programado", "Conectividad de red intermitente", "Error de operador",
]
const DESCS: Record<TipoIncidencia, string[]> = {
  TEMPERATURA: ["Nevera fuera de rango (>8°C) durante 45 min", "Temperatura crítica en transporte", "Fluctuación térmica en laboratorio central"],
  RUTA:        ["Ruta retrasada >2h por tráfico", "Conductor no disponible para turno", "Vehículo averiado en ruta norte"],
  NEVERA:      ["Nevera sin conectividad 3h", "Sensor RFID sin señal en CS periférico", "Alarma de batería baja en nevera móvil"],
  TRANSPORTE:  ["Muestra sin confirmar recepción en laboratorio", "Bote roto en transporte", "Cadena de frío interrumpida 20 min"],
  SISTEMA:     ["BC Robo sin comunicación 20 min", "Error de sincronización InLab", "Timeout en Reader RFID fijo"],
  MUESTRA:     ["Muestra rechazada por laboratorio receptor", "Volumen insuficiente en tubo", "Tubo roto en centrífuga"],
}

export function generarIncidencias(hospitalId: string): Incidencia[] {
  const rand = seededRand(hospitalSeed(hospitalId, 99))
  const n = Math.floor(18 + rand() * 15)
  const ahora = new Date()
  return Array.from({ length: n }, (_, i) => {
    const tipo = TIPOS[Math.floor(rand() * TIPOS.length)]
    const gravedad = GRAVEDADES_LIST[Math.floor(rand() * GRAVEDADES_LIST.length)]
    const estado = ESTADOS_LIST[Math.floor(rand() * ESTADOS_LIST.length)]
    const daysAgo = Math.floor(rand() * 90)
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - daysAgo)
    const descs = DESCS[tipo]
    return {
      id:          `INC-${String(i + 1).padStart(4, "0")}`,
      fecha:       fecha.toISOString().split("T")[0],
      hospital:    hospitalId,
      hospitalId,
      tipo,
      gravedad,
      estado,
      descripcion: descs[Math.floor(rand() * descs.length)],
      mttrHoras:   estado === "RESUELTA" ? parseFloat((0.5 + rand() * 47.5).toFixed(1)) : 0,
      causa:       CAUSAS[Math.floor(rand() * CAUSAS.length)],
      recurrente:  rand() > 0.72,
    }
  }).sort((a, b) => b.fecha.localeCompare(a.fecha))
}

// ─── Alertas ──────────────────────────────────────────────────────────────────

export function generarAlertas(hospitales: Hospital[]): Alerta[] {
  if (!hospitales.length) return []
  const rand = seededRand(12345)
  const ahora = new Date()
  const defs: Omit<Alerta, "id" | "hospital" | "timestamp">[] = [
    { tipo: "TEMPERATURA", severidad: "CRITICA", titulo: "Nevera #NV-03 fuera de rango", detalle: "Temperatura 9.2°C detectada. Rango permitido: 2–8°C. Llevan 47 min fuera de rango. Acción inmediata requerida.", activa: true },
    { tipo: "CONSUMO",     severidad: "CRITICA", titulo: "Pico de consumo anómalo EDTA +38%", detalle: "EDTA K2 supera umbral mensual en 3.2σ respecto a la media histórica. Posible evento puntual o error de registro.", activa: true },
    { tipo: "EQUIPO",      severidad: "ALTA",    titulo: "BC Robo sin comunicación 22 min", detalle: "El autómata de dispensación lleva 22 min sin reportar estado. Verificar conexión de red y estado físico.", activa: true },
    { tipo: "INCIDENCIA",  severidad: "ALTA",    titulo: "3 incidencias abiertas >48h", detalle: "INC-0012, INC-0018, INC-0023 superan SLA de 48h sin resolución. Escalar a supervisor de zona.", activa: true },
    { tipo: "TEMPERATURA", severidad: "MEDIA",   titulo: "Gateway BT sin señal CS Norte", detalle: "Gateway BT del centro de salud Norte lleva 3h sin reportar ubicaciones de neveras. Verificar alimentación.", activa: true },
    { tipo: "CONSUMO",     severidad: "MEDIA",   titulo: "Caída Hemocultivo -28% en 2 semanas", detalle: "Tendencia descendente inusual. Puede indicar cambio en protocolo de laboratorio o problema de demanda.", activa: false },
  ]
  return defs.map((def, i) => {
    const h = hospitales[i % hospitales.length]
    const minsAgo = Math.floor(rand() * 240)
    const ts = new Date(ahora.getTime() - minsAgo * 60000)
    return { ...def, id: `ALR-${String(i + 1).padStart(4, "0")}`, hospital: h.nombre, timestamp: ts.toISOString() }
  })
}

// ─── Correlaciones ────────────────────────────────────────────────────────────

export function generarCorrelaciones(hospitales: Hospital[]): CorrelacionPunto[] {
  return hospitales.map(h => {
    const rand = seededRand(hospitalSeed(h.id))
    const distancia = 5 + rand() * 95
    const poblacion = 10000 + rand() * 90000
    const consumo = 2000 + distancia * 18 + rand() * 800
    return {
      hospitalId:    h.id,
      nombre:        h.nombre,
      consumoTotal:  Math.round(consumo),
      distanciaKm:   parseFloat(distancia.toFixed(1)),
      poblacionArea: Math.round(poblacion),
      numVisitas:    Math.floor(2 + rand() * 20),
    }
  })
}

// ─── Franja horaria ───────────────────────────────────────────────────────────

export function generarFranjaHoraria(hospitalId: string): FranjaHoraria[] {
  const rand = seededRand(hospitalSeed(hospitalId, 77))
  const BASE = [2,1,1,1,2,5,15,35,55,60,52,40,30,28,35,45,55,50,35,20,12,8,5,3]
  const vals = BASE.map(v => Math.round(v * (0.85 + rand() * 0.30)))
  const maxV = Math.max(...vals)
  return vals.map((valor, hora) => ({ hora, valor, pct: valor / maxV }))
}

// ─── Día de semana heatmap ────────────────────────────────────────────────────

export function generarDiaSemana(hospitalId: string): DiaSemanaHeatmap[] {
  const rand = seededRand(hospitalSeed(hospitalId, 55))
  const DIA_MULT = [1.0, 1.05, 1.02, 1.0, 0.95, 0.40, 0.15]
  const raw: number[][] = []
  let maxV = 0
  for (let dia = 0; dia < 7; dia++) {
    raw[dia] = []
    for (let mes = 0; mes < 12; mes++) {
      const v = Math.round(100 * DIA_MULT[dia] * SEASONAL_MULT.edta[mes] * (0.8 + rand() * 0.4))
      raw[dia][mes] = v
      if (v > maxV) maxV = v
    }
  }
  const result: DiaSemanaHeatmap[] = []
  for (let dia = 0; dia < 7; dia++)
    for (let mes = 0; mes < 12; mes++)
      result.push({ dia, mes, valor: raw[dia][mes], intensity: maxV > 0 ? raw[dia][mes] / maxV : 0 })
  return result
}

// ─── Indicadores avanzados ────────────────────────────────────────────────────

export function generarIndicadores(data: ConsumoMensual[]): IndicadorAvanzado[] {
  return TUBOS.map(t => {
    const vals = data.map(d => d[t.key as keyof ConsumoMensual] as number).sort((a, b) => a - b)
    const n = vals.length
    if (n === 0) return { tubo: t.label, key: t.key, color: t.color, media: 0, mediana: 0, std: 0, p10: 0, p25: 0, p75: 0, p90: 0, cagr: 0, trend: "FLAT" as const }
    const media = vals.reduce((s, v) => s + v, 0) / n
    const mediana = n % 2 === 0 ? (vals[n / 2 - 1] + vals[n / 2]) / 2 : vals[Math.floor(n / 2)]
    const std = Math.sqrt(vals.reduce((s, v) => s + (v - media) ** 2, 0) / n)
    const p = (pct: number) => vals[Math.min(Math.floor(pct * (n - 1)), n - 1)]
    const m1 = data.slice(0, Math.floor(n / 2)).reduce((s, d) => s + (d[t.key as keyof ConsumoMensual] as number), 0) / Math.floor(n / 2)
    const m2 = data.slice(Math.floor(n / 2)).reduce((s, d) => s + (d[t.key as keyof ConsumoMensual] as number), 0) / (n - Math.floor(n / 2))
    const cagr = m1 > 0 ? parseFloat((((m2 - m1) / m1) * 100).toFixed(1)) : 0
    const trend: "UP" | "DOWN" | "FLAT" = cagr > 2 ? "UP" : cagr < -2 ? "DOWN" : "FLAT"
    return {
      tubo: t.label, key: t.key, color: t.color,
      media: Math.round(media), mediana: Math.round(mediana), std: Math.round(std),
      p10: p(0.10), p25: p(0.25), p75: p(0.75), p90: p(0.90), cagr, trend,
    }
  })
}
