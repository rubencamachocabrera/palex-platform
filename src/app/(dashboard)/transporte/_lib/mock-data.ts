// Generadores de datos ficticios — misma firma que la futura API real
// Para conectar backend real (sync read-only desde BD termografía): solo se toca data-service.ts

import type {
  Ruta, ParadaRuta, Nevera, LecturaTemperatura, IncidenciaTransporte,
  AlertaTransporte, TendenciaPunto, KpiResumen, EstadoRuta, EstadoParada,
  TipoIncidenciaTransporte,
} from "./types"

// ─── Utilidades ────────────────────────────────────────────────────────────────

export function seededRand(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF
    return (s >>> 0) / 0xFFFFFFFF
  }
}

function strSeed(str: string, offset = 0) {
  return str.split("").reduce((a, c) => a + c.charCodeAt(0), offset)
}

// ─── Centros y paradas (zona Sur de Córdoba) ──────────────────────────────────

export const LABORATORIO = { nombre: "Laboratorio Central Córdoba", ciudad: "Córdoba", lat: 37.8882, lng: -4.7794 }

interface ParadaDef { hospitalNombre: string; ciudad: string; lat: number; lng: number; hora: string }
interface RutaDef {
  id: string; nombre: string; zona: string; conductor: string; vehiculo: string
  horaInicio: string; horaFinEstimada: string; distanciaKm: number
  estadoForzado: EstadoRuta; neveraId: string
  paradas: ParadaDef[]
}

export const RUTAS_DEF: RutaDef[] = [
  {
    id: "RT-01", nombre: "Ruta Norte", zona: "Norte Córdoba", conductor: "Antonio Ruiz", vehiculo: "Furgón 12-CRD",
    horaInicio: "07:30", horaFinEstimada: "10:15", distanciaKm: 86, estadoForzado: "EN_CURSO", neveraId: "NV-01",
    paradas: [
      { hospitalNombre: "C. Salud Bujalance",        ciudad: "Bujalance",      lat: 37.8966, lng: -4.3787, hora: "08:10" },
      { hospitalNombre: "C. Salud Baena",            ciudad: "Baena",          lat: 37.6167, lng: -4.3214, hora: "08:55" },
      { hospitalNombre: "C. Salud Castro del Río",   ciudad: "Castro del Río", lat: 37.6919, lng: -4.4814, hora: "09:35" },
    ],
  },
  {
    id: "RT-02", nombre: "Ruta Sur", zona: "Campiña Sur", conductor: "María Gómez", vehiculo: "Furgón 07-CRD",
    horaInicio: "07:45", horaFinEstimada: "10:30", distanciaKm: 92, estadoForzado: "RETRASADA", neveraId: "NV-02",
    paradas: [
      { hospitalNombre: "Hospital Montilla",              ciudad: "Montilla",             lat: 37.5862, lng: -4.6373, hora: "08:30" },
      { hospitalNombre: "C. Salud Aguilar de la Frontera", ciudad: "Aguilar de la Frontera", lat: 37.5145, lng: -4.6533, hora: "09:10" },
      { hospitalNombre: "Hospital Puente Genil",          ciudad: "Puente Genil",         lat: 37.3868, lng: -4.7664, hora: "09:50" },
    ],
  },
  {
    id: "RT-03", nombre: "Ruta Sureste", zona: "Subbética", conductor: "Javier Pérez", vehiculo: "Furgón 03-CRD",
    horaInicio: "08:00", horaFinEstimada: "11:00", distanciaKm: 104, estadoForzado: "EN_CURSO", neveraId: "NV-03",
    paradas: [
      { hospitalNombre: "C. Salud Cabra",            ciudad: "Cabra",  lat: 37.4730, lng: -4.4422, hora: "08:50" },
      { hospitalNombre: "Hospital Lucena",           ciudad: "Lucena", lat: 37.4083, lng: -4.4847, hora: "09:40" },
      { hospitalNombre: "C. Salud Priego de Córdoba", ciudad: "Priego de Córdoba", lat: 37.4378, lng: -4.1962, hora: "10:30" },
    ],
  },
  {
    id: "RT-04", nombre: "Ruta Oeste", zona: "Vega del Guadalquivir", conductor: "Lucía Fernández", vehiculo: "Furgón 09-CRD",
    horaInicio: "07:15", horaFinEstimada: "09:45", distanciaKm: 78, estadoForzado: "COMPLETADA", neveraId: "NV-04",
    paradas: [
      { hospitalNombre: "C. Salud Almodóvar del Río", ciudad: "Almodóvar del Río", lat: 37.8064, lng: -4.9994, hora: "07:55" },
      { hospitalNombre: "C. Salud Posadas",           ciudad: "Posadas",          lat: 37.7989, lng: -5.1097, hora: "08:35" },
      { hospitalNombre: "Hospital Palma del Río",     ciudad: "Palma del Río",    lat: 37.7113, lng: -5.2826, hora: "09:20" },
    ],
  },
  {
    id: "RT-05", nombre: "Ruta Centro", zona: "Córdoba Capital", conductor: "Carlos Jiménez", vehiculo: "Furgón 15-CRD",
    horaInicio: "09:00", horaFinEstimada: "11:00", distanciaKm: 34, estadoForzado: "PROGRAMADA", neveraId: "NV-05",
    paradas: [
      { hospitalNombre: "C. Salud Levante",  ciudad: "Córdoba", lat: 37.8945, lng: -4.7550, hora: "09:30" },
      { hospitalNombre: "C. Salud Poniente", ciudad: "Córdoba", lat: 37.8801, lng: -4.8120, hora: "10:00" },
      { hospitalNombre: "C. Salud Brillante", ciudad: "Córdoba", lat: 37.9105, lng: -4.7720, hora: "10:30" },
    ],
  },
]

// ─── Rutas + paradas (estado calculado) ───────────────────────────────────────

function estadoParadas(estadoRuta: EstadoRuta, total: number, rand: () => number): EstadoParada[] {
  if (estadoRuta === "COMPLETADA") return Array.from({ length: total }, () => "COMPLETADA")
  if (estadoRuta === "PROGRAMADA") return Array.from({ length: total }, () => "PENDIENTE")
  // EN_CURSO / RETRASADA: progreso parcial
  const completadas = Math.min(total - 1, Math.floor(rand() * total))
  return Array.from({ length: total }, (_, i) => {
    if (i < completadas) return "COMPLETADA"
    if (i === completadas) return estadoRuta === "RETRASADA" ? "RETRASADA" : "EN_CURSO"
    return "PENDIENTE"
  })
}

export function generarRutas(): Ruta[] {
  return RUTAS_DEF.map(def => {
    const rand = seededRand(strSeed(def.id))
    const estados = estadoParadas(def.estadoForzado, def.paradas.length, rand)
    const paradas: ParadaRuta[] = def.paradas.map((p, i) => ({
      id: `${def.id}-P${i + 1}`,
      orden: i + 1,
      hospitalNombre: p.hospitalNombre,
      ciudad: p.ciudad,
      lat: p.lat,
      lng: p.lng,
      horaProgramada: p.hora,
      horaReal: estados[i] === "COMPLETADA" || estados[i] === "EN_CURSO"
        ? p.hora.replace(/(\d+):(\d+)/, (_, h, m) => {
            const mins = parseInt(m) + Math.floor(rand() * 12) - 4
            const total = parseInt(h) * 60 + mins
            return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(((total % 60) + 60) % 60).padStart(2, "0")}`
          })
        : null,
      estado: estados[i],
      temperaturaRecogida: estados[i] === "COMPLETADA" ? parseFloat((4.5 + rand() * 3.5).toFixed(1)) : null,
      muestrasRecogidas: estados[i] === "COMPLETADA" ? Math.floor(8 + rand() * 35) : 0,
    }))
    return {
      id: def.id,
      nombre: def.nombre,
      zona: def.zona,
      conductor: def.conductor,
      vehiculo: def.vehiculo,
      estado: def.estadoForzado,
      horaInicio: def.horaInicio,
      horaFinEstimada: def.horaFinEstimada,
      horaFinReal: def.estadoForzado === "COMPLETADA"
        ? def.horaFinEstimada.replace(/(\d+):(\d+)/, (_, h, m) => {
            const mins = parseInt(m) + Math.floor(rand() * 20) - 5
            const total = parseInt(h) * 60 + mins
            return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(((total % 60) + 60) % 60).padStart(2, "0")}`
          })
        : null,
      distanciaKm: def.distanciaKm,
      neveraId: def.neveraId,
      paradas,
    }
  })
}

// ─── Neveras (flota) ──────────────────────────────────────────────────────────

const NEVERAS_EXTRA = [
  { id: "NV-06", codigo: "NV-06", tipo: "RFID_BT" as const, estado: "EN_LABORATORIO" as const, ubicacion: "Laboratorio Central Córdoba" },
  { id: "NV-07", codigo: "NV-07", tipo: "RFID" as const,    estado: "EN_LABORATORIO" as const, ubicacion: "Laboratorio Central Córdoba" },
  { id: "NV-08", codigo: "NV-08", tipo: "BT" as const,      estado: "MANTENIMIENTO" as const,  ubicacion: "Taller Palex Córdoba" },
]

export function generarNeveras(rutas: Ruta[]): Nevera[] {
  const enRuta: Nevera[] = rutas.map(r => {
    const rand = seededRand(strSeed(r.neveraId, 7))
    const rangoMin = 2, rangoMax = 8
    const excursion = r.estado === "RETRASADA" && rand() > 0.4
    const temperaturaActual = excursion
      ? parseFloat((rangoMax + 0.5 + rand() * 2).toFixed(1))
      : parseFloat((rangoMin + 1 + rand() * (rangoMax - rangoMin - 1.5)).toFixed(1))
    return {
      id: r.neveraId,
      codigo: r.neveraId,
      tipo: (["RFID", "BT", "RFID_BT"] as const)[Math.floor(rand() * 3)],
      estado: r.estado === "COMPLETADA" ? "EN_LABORATORIO" : r.estado === "PROGRAMADA" ? "EN_CENTRO" : "EN_TRANSITO",
      temperaturaActual,
      rangoMin, rangoMax,
      bateria: Math.floor(35 + rand() * 65),
      ultimaLectura: new Date(Date.now() - Math.floor(rand() * 8) * 60000).toISOString(),
      ubicacionActual: r.estado === "COMPLETADA" ? LABORATORIO.nombre : r.estado === "PROGRAMADA" ? "Laboratorio (pendiente salida)" : `En ruta · ${r.nombre}`,
      rutaId: r.id,
    }
  })
  const extra: Nevera[] = NEVERAS_EXTRA.map(n => {
    const rand = seededRand(strSeed(n.id, 13))
    return {
      id: n.id, codigo: n.codigo, tipo: n.tipo, estado: n.estado,
      temperaturaActual: n.estado === "MANTENIMIENTO" ? 0 : parseFloat((3 + rand() * 3).toFixed(1)),
      rangoMin: 2, rangoMax: 8,
      bateria: n.estado === "MANTENIMIENTO" ? Math.floor(5 + rand() * 15) : Math.floor(60 + rand() * 40),
      ultimaLectura: new Date(Date.now() - Math.floor(rand() * 240) * 60000).toISOString(),
      ubicacionActual: n.ubicacion,
      rutaId: null,
    }
  })
  return [...enRuta, ...extra]
}

// ─── Lecturas de temperatura (últimas 24h) ────────────────────────────────────

export function generarLecturasTemperatura(nevera: Nevera): LecturaTemperatura[] {
  const rand = seededRand(strSeed(nevera.id, 31))
  const ahora = new Date()
  const puntos: LecturaTemperatura[] = []
  const enExcursion = nevera.temperaturaActual > nevera.rangoMax
  for (let i = 23; i >= 0; i--) {
    const t = new Date(ahora.getTime() - i * 60 * 60 * 1000)
    const base = (nevera.rangoMin + nevera.rangoMax) / 2
    let temp = base + Math.sin(i / 3) * 1.2 + (rand() - 0.5) * 1.4
    if (enExcursion && i <= 2) temp = nevera.rangoMax + 0.6 + (2 - i) * 0.6 + rand() * 0.5
    puntos.push({
      hora: t.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      timestamp: t.toISOString(),
      temperatura: parseFloat(temp.toFixed(1)),
      rangoMin: nevera.rangoMin,
      rangoMax: nevera.rangoMax,
    })
  }
  return puntos
}

// ─── Incidencias de transporte ─────────────────────────────────────────────────

const TIPOS_INC: TipoIncidenciaTransporte[] = ["EXCURSION_TEMP", "RETRASO_RUTA", "AVERIA_VEHICULO", "FALLO_SENSOR", "MUESTRA_DANADA", "CONECTIVIDAD"]
const GRAVEDADES = ["CRITICA", "ALTA", "ALTA", "MEDIA", "MEDIA", "MEDIA", "BAJA"] as const
const ESTADOS_INC = ["RESUELTA", "RESUELTA", "RESUELTA", "EN_CURSO", "EN_CURSO", "ABIERTA"] as const
const DESCS_INC: Record<TipoIncidenciaTransporte, string[]> = {
  EXCURSION_TEMP:  ["Nevera fuera de rango (>8°C) durante el trayecto", "Temperatura crítica detectada al llegar al laboratorio", "Excursión térmica de 25 min en parada prolongada"],
  RETRASO_RUTA:    ["Ruta retrasada >45 min por tráfico en N-432", "Salida tardía del laboratorio por incidencia de carga", "Retraso acumulado por cierre de carretera"],
  AVERIA_VEHICULO: ["Furgón con avería de motor en ruta", "Pinchazo en Furgón 07-CRD, sustitución de vehículo", "Fallo de climatización en cabina"],
  FALLO_SENSOR:    ["Sensor RFID sin señal durante 1h", "Gateway BT sin conectividad en C. Salud Posadas", "Lectura de temperatura inconsistente, recalibrado"],
  MUESTRA_DANADA:  ["Bote roto durante el transporte", "Muestra derramada por mal cierre de nevera", "Etiqueta ilegible tras condensación"],
  CONECTIVIDAD:    ["Pérdida de GPS durante 30 min", "Sincronización de ruta retrasada 20 min", "Reader RFID del laboratorio sin respuesta"],
}

export function generarIncidenciasTransporte(): IncidenciaTransporte[] {
  const rand = seededRand(8842)
  const n = 26
  const ahora = new Date()
  return Array.from({ length: n }, (_, i) => {
    const tipo = TIPOS_INC[Math.floor(rand() * TIPOS_INC.length)]
    const gravedad = GRAVEDADES[Math.floor(rand() * GRAVEDADES.length)]
    const estado = ESTADOS_INC[Math.floor(rand() * ESTADOS_INC.length)]
    const daysAgo = Math.floor(rand() * 90)
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - daysAgo)
    const ruta = RUTAS_DEF[Math.floor(rand() * RUTAS_DEF.length)]
    const descs = DESCS_INC[tipo]
    return {
      id: `TRI-${String(i + 1).padStart(4, "0")}`,
      fecha: fecha.toISOString().split("T")[0],
      ruta: ruta.nombre,
      nevera: ["EXCURSION_TEMP", "FALLO_SENSOR"].includes(tipo) ? ruta.neveraId : null,
      tipo, gravedad, estado,
      descripcion: descs[Math.floor(rand() * descs.length)],
      duracionMin: Math.floor(10 + rand() * 110),
      mttrHoras: estado === "RESUELTA" ? parseFloat((0.5 + rand() * 23.5).toFixed(1)) : 0,
    }
  }).sort((a, b) => b.fecha.localeCompare(a.fecha))
}

// ─── Alertas activas ────────────────────────────────────────────────────────────

export function generarAlertasTransporte(rutas: Ruta[], neveras: Nevera[]): AlertaTransporte[] {
  const rand = seededRand(5521)
  const ahora = new Date()
  const defs: Omit<AlertaTransporte, "id" | "timestamp">[] = []

  const neveraExcursion = neveras.find(n => n.temperaturaActual > n.rangoMax)
  if (neveraExcursion) {
    defs.push({
      tipo: "TEMPERATURA", severidad: "CRITICA", activa: true,
      titulo: `Nevera ${neveraExcursion.codigo} fuera de rango`,
      detalle: `Temperatura ${neveraExcursion.temperaturaActual}°C detectada. Rango permitido: ${neveraExcursion.rangoMin}–${neveraExcursion.rangoMax}°C. Ruta: ${rutas.find(r => r.id === neveraExcursion.rutaId)?.nombre ?? "—"}.`,
      entidad: neveraExcursion.codigo,
    })
  }
  const rutaRetrasada = rutas.find(r => r.estado === "RETRASADA")
  if (rutaRetrasada) {
    defs.push({
      tipo: "RETRASO", severidad: "ALTA", activa: true,
      titulo: `${rutaRetrasada.nombre} con retraso`,
      detalle: `La ruta lleva retraso sobre la hora de finalización estimada (${rutaRetrasada.horaFinEstimada}). Conductor: ${rutaRetrasada.conductor}.`,
      entidad: rutaRetrasada.nombre,
    })
  }
  const neveraBateria = neveras.filter(n => n.bateria < 25)
  for (const n of neveraBateria) {
    defs.push({
      tipo: "BATERIA", severidad: "MEDIA", activa: true,
      titulo: `Batería baja en ${n.codigo}`,
      detalle: `Nivel de batería del sensor al ${n.bateria}%. Sustituir antes de la próxima ruta.`,
      entidad: n.codigo,
    })
  }
  defs.push({
    tipo: "MANTENIMIENTO", severidad: "MEDIA", activa: true,
    titulo: "Nevera NV-08 en mantenimiento",
    detalle: "Revisión programada del sensor BT. Tiempo estimado de vuelta a flota: 2 días.",
    entidad: "NV-08",
  })
  defs.push({
    tipo: "CONECTIVIDAD", severidad: "MEDIA", activa: false,
    titulo: "Gateway BT C. Salud Posadas sin señal",
    detalle: "Incidencia resuelta tras reinicio remoto del gateway. Sin pérdida de datos.",
    entidad: "C. Salud Posadas",
  })

  return defs.map((def, i) => {
    const minsAgo = Math.floor(rand() * 180)
    const ts = new Date(ahora.getTime() - minsAgo * 60000)
    return { ...def, id: `ALT-${String(i + 1).padStart(4, "0")}`, timestamp: ts.toISOString() }
  })
}

// ─── Tendencias temporales ─────────────────────────────────────────────────────

export function generarTendencias(dias: number): TendenciaPunto[] {
  const rand = seededRand(strSeed("tendencias-transporte", dias))
  const ahora = new Date()
  return Array.from({ length: dias }, (_, i) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - (dias - 1 - i))
    const diaSemana = d.getDay()
    const esFinde = diaSemana === 0 || diaSemana === 6
    const factorFinde = esFinde ? 0.35 : 1
    const tiempoMedioMin = Math.round((155 + Math.sin(i / 6) * 18 + (rand() - 0.5) * 20) * (esFinde ? 0.6 : 1))
    const tempMedia = parseFloat((4.8 + Math.sin(i / 5) * 0.6 + (rand() - 0.5) * 0.8).toFixed(1))
    const excursiones = esFinde ? (rand() > 0.85 ? 1 : 0) : (rand() > 0.78 ? 1 : rand() > 0.94 ? 2 : 0)
    const cumplimientoPct = Math.round(100 - excursiones * (4 + rand() * 5) - (rand() * 2))
    const rutasCompletadas = Math.round(5 * factorFinde * (0.85 + rand() * 0.3))
    return {
      fecha: d.toISOString().split("T")[0],
      label: d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
      tiempoMedioMin, tempMedia, excursiones,
      cumplimientoPct: Math.max(80, Math.min(100, cumplimientoPct)),
      rutasCompletadas,
    }
  })
}

// ─── KPIs resumen ───────────────────────────────────────────────────────────────

export function generarKpis(rutas: Ruta[], neveras: Nevera[], incidencias: IncidenciaTransporte[]): KpiResumen {
  const paradasTotales = rutas.reduce((s, r) => s + r.paradas.length, 0)
  const paradasCompletadas = rutas.reduce((s, r) => s + r.paradas.filter(p => p.estado === "COMPLETADA").length, 0)
  const hoy = new Date().toISOString().split("T")[0]
  const excursionesHoy = incidencias.filter(i => i.fecha === hoy && i.tipo === "EXCURSION_TEMP").length
    + (neveras.some(n => n.temperaturaActual > n.rangoMax) ? 1 : 0)
  const tiemposReales = rutas.filter(r => r.horaFinReal).map(r => {
    const [h1, m1] = r.horaInicio.split(":").map(Number)
    const [h2, m2] = r.horaFinReal!.split(":").map(Number)
    return (h2 * 60 + m2) - (h1 * 60 + m1)
  })
  const tiempoMedioMin = tiemposReales.length ? Math.round(tiemposReales.reduce((s, v) => s + v, 0) / tiemposReales.length) : 165
  return {
    rutasActivas: rutas.filter(r => r.estado === "EN_CURSO" || r.estado === "RETRASADA").length,
    rutasProgramadas: rutas.filter(r => r.estado === "PROGRAMADA").length,
    neverasEnTransito: neveras.filter(n => n.estado === "EN_TRANSITO").length,
    paradasCompletadas,
    paradasTotales,
    excursionesHoy,
    tiempoMedioMin,
    cumplimientoPct: Math.round(100 - (excursionesHoy / Math.max(1, rutas.length)) * 100),
  }
}
