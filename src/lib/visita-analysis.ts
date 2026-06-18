import type { ScoringConfig } from "@/lib/scoring-config"
import { DEFAULT_SCORING_CONFIG } from "@/lib/scoring-config"

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type RiesgoNivel = "alto" | "medio" | "info"

export interface Riesgo {
  id: string
  nivel: RiesgoNivel
  titulo: string
  descripcion: string
  campo?: string // field ID que lo originó
}

export interface ScoreDetalle {
  categoria: string
  puntos: number
  max: number
  descripcion: string
}

export interface AnalisisVisita {
  riesgos: Riesgo[]
  score: number           // 0-100
  scoreLabel: string      // "Baja" | "Media" | "Alta" | "Muy alta"
  scoreColor: string      // color hex
  detalleScore: ScoreDetalle[]
}

// ─── Detección de riesgos ─────────────────────────────────────────────────────

export function detectarRiesgos(datos: Record<string, unknown>, cfg: ScoringConfig = DEFAULT_SCORING_CONFIG): Riesgo[] {
  const riesgos: Riesgo[] = []

  function reglaCfg(id: string) {
    return cfg.reglas.find(r => r.id === id)
  }

  function r(id: string, nivelDefault: RiesgoNivel, titulo: string, descripcion: string, campo?: string) {
    const rc = reglaCfg(id)
    if (rc && !rc.activa) return
    const nivel = rc?.nivel ?? nivelDefault
    riesgos.push({ id, nivel, titulo, descripcion, campo })
  }

  // ── Sistema Operativo obsoleto
  if (datos.so_pc === "Windows 7 / anterior") {
    r("so-obsoleto", "alto",
      "SO incompatible",
      "Los PCs tienen Windows 7 o anterior. Inlab requiere Windows 10+. Hay que planificar actualización antes de la instalación.",
      "so_pc"
    )
  }

  // ── Sin red cableada
  if (datos.red_cableada === "No") {
    r("sin-red-cableada", "alto",
      "Sin red cableada",
      "No hay red cableada en el área. Las impresoras Zebra y el BC Robo requieren conexión estable. Valorar WiFi industrial o instalación de cableado.",
      "red_cableada"
    )
  }

  // ── Sin petición electrónica
  if (datos.solicitud_elec === "No") {
    r("sin-pet-elec", "alto",
      "Sin petición electrónica",
      "El centro no tiene solicitud electrónica. La integración con Inlab será más compleja y habrá que contemplar flujos manuales.",
      "solicitud_elec"
    )
  }

  // ── Sin WiFi
  if (datos.wifi === "No") {
    r("sin-wifi", "medio",
      "Sin cobertura WiFi",
      "No hay WiFi en el área. Alternativa: red cableada en todos los puntos. Si tampoco hay cableado completo, es bloqueante.",
      "wifi"
    )
  }

  // ── Sin posibilidad de servidor
  if (datos.servidor_hospital === "No" && datos.espacio_servidor === "No") {
    r("sin-servidor", "alto",
      "Sin espacio para servidor",
      "El hospital no puede alojar el servidor Palex ni tiene infraestructura para ello. Valorar solución cloud o servidor compacto externo.",
      "servidor_hospital"
    )
  }

  // ── Sin PCs disponibles
  if (datos.pc_disponible === "No") {
    r("sin-pcs", "alto",
      "Sin PCs en el área",
      "No hay ordenadores disponibles para Inlab. Hay que presupuestar equipos informáticos adicionales.",
      "pc_disponible"
    )
  }

  // ── Alta tasa de incidencias
  if (datos.frec_incidencia === ">5%") {
    r("alta-incidencias", "medio",
      "Alta tasa de incidencias (>5%)",
      "La tasa de incidencias es elevada. Inlab puede reducirla, pero hay que revisar los procesos actuales antes de la instalación.",
      "frec_incidencia"
    )
  }

  // ── Sin planos disponibles
  if (datos.planos_ok === "No") {
    r("sin-planos", "info",
      "Sin planos del área",
      "No disponen de planos de la zona de extracciones. Habrá que solicitarlos al servicio de obras o hacer un croquis en la visita.",
      "planos_ok"
    )
  }

  // ── Sin red para BC Robo
  if (datos.n_bcrobo && Number(datos.n_bcrobo) > 0 && datos.red_bcrobo === "No") {
    r("bcrobo-sin-red", "alto",
      "BC Robo sin toma de red",
      `Se necesitan ${datos.n_bcrobo} BC Robo pero no hay toma de red en la ubicación prevista. Hay que planificar la instalación de infraestructura.`,
      "red_bcrobo"
    )
  }

  // ── Sin electricidad para BC Robo
  if (datos.n_bcrobo && Number(datos.n_bcrobo) > 0 && datos.elec_bcrobo === "No") {
    r("bcrobo-sin-elec", "alto",
      "BC Robo sin toma eléctrica",
      `No hay toma eléctrica en la ubicación del BC Robo. Hay que planificar instalación eléctrica.`,
      "elec_bcrobo"
    )
  }

  // ── Sin red para impresoras Zebra
  const nZebra = Number(datos.n_zebra ?? 0)
  if (nZebra > 0 && datos.red_zebra === "No") {
    r("zebra-sin-red", "medio",
      "Zebras sin conectividad de red",
      `Se necesitan ${nZebra} impresoras Zebra pero no hay red en todos los puntos. Valorar configuración WiFi o USB por punto.`,
      "red_zebra"
    )
  }

  // ── LDAP / Directorio Activo puede requerir coordinación TI
  if (datos.ldap === "Sí" && (!datos.resp_ti || (datos.resp_ti as string).trim() === "")) {
    r("ldap-sin-ti", "medio",
      "LDAP requerido sin contacto TI",
      "La integración con LDAP/Directorio Activo requiere coordinación con el responsable TI del hospital, que no está identificado aún.",
      "ldap"
    )
  }

  // ── Acceso con restricciones al BC Robo
  if (datos.acceso_bcrobo === "CAES" || datos.acceso_bcrobo === "Solicitar autorización") {
    r("bcrobo-acceso", "info",
      "Acceso restringido para instalación BC Robo",
      `El acceso al área requiere ${datos.acceso_bcrobo}. Planificar con antelación los permisos y coordinación con el hospital.`,
      "acceso_bcrobo"
    )
  }

  // ── Etiquetado sin sistema definido
  if (datos.etiq_metodo === "Sin sistema definido") {
    r("etiq-sin-sistema", "medio",
      "Sin sistema de etiquetado definido",
      "El centro no tiene un sistema de etiquetado establecido. Habrá que diseñar el flujo desde cero con el cliente.",
      "etiq_metodo"
    )
  }

  // ── Volumen muy alto sin estadístico
  const pacDia = Number(datos.pac_dia ?? 0)
  if (pacDia > 300 && datos.estadistico === "No") {
    r("volumen-alto-sin-estadistico", "info",
      "Alto volumen sin estadístico de incidencias",
      `Con ${pacDia} pacientes/día, la falta de estadístico de incidencias dificulta evaluar el impacto de Inlab. Recomendar implementar registro.`,
      "pac_dia"
    )
  }

  return riesgos
}

// ─── Score de complejidad ─────────────────────────────────────────────────────

export function calcularScore(datos: Record<string, unknown>, cfg: ScoringConfig = DEFAULT_SCORING_CONFIG): Pick<AnalisisVisita, "score" | "scoreLabel" | "scoreColor" | "detalleScore"> {
  const detalleScore: ScoreDetalle[] = []
  let total = 0
  let maxTotal = 0

  function catMax(id: string, fallback: number): number {
    const c = cfg.categorias.find(c => c.id === id)
    if (c && !c.activa) return 0
    return c?.max ?? fallback
  }

  function add(catId: string, nombre: string, puntos: number, fallbackMax: number, descripcion: string) {
    const max = catMax(catId, fallbackMax)
    if (max === 0) return
    const pts = Math.min(puntos, max)
    detalleScore.push({ categoria: nombre, puntos: pts, max, descripcion })
    total += pts
    maxTotal += max
  }

  // 1. Volumen de pacientes
  const pacDia = Number(datos.pac_dia ?? 0)
  const maxVol = catMax("volumen", 20)
  const ptsPacRaw = pacDia > 400 ? maxVol : pacDia > 200 ? Math.round(maxVol * 0.7) : pacDia > 100 ? Math.round(maxVol * 0.4) : pacDia > 50 ? Math.round(maxVol * 0.2) : Math.round(maxVol * 0.1)
  add("volumen", "Volumen pacientes", ptsPacRaw, 20, `${pacDia} pac/día`)

  // 2. Integraciones TI
  const sistemas = (datos.sistemas_sw as string[] | undefined) ?? []
  const conexFut = (datos.conexiones_fut as string ?? "").length > 20 ? 5 : 0
  const maxInt = catMax("integraciones", 20)
  add("integraciones", "Integraciones TI", sistemas.length * Math.round(maxInt / 5) + conexFut, 20, `${sistemas.length} sistemas`)

  // 3. Infraestructura
  let ptsInfra = 0
  if (datos.so_pc === "Windows 7 / anterior") ptsInfra += 6
  if (datos.red_cableada === "No") ptsInfra += 4
  if (datos.wifi === "No") ptsInfra += 3
  if (datos.servidor_hospital === "No") ptsInfra += 2
  add("infra", "Infraestructura", ptsInfra, 15, "SO, red, servidor")

  // 4. Hardware
  const nBcRobo = Number(datos.n_bcrobo ?? 0)
  const nZebra = Number(datos.n_zebra ?? 0)
  const nPuntos = Number(datos.n_puntos ?? 0)
  add("hardware", "Hardware a instalar", nBcRobo * 5 + nZebra * 2 + Math.floor(nPuntos / 3), 15, `${nBcRobo} BC Robo · ${nZebra} Zebras`)

  // 5. Petición electrónica y accesos
  let ptsPet = 0
  if (datos.solicitud_elec === "No") ptsPet += 5
  else if (datos.solicitud_elec === "Parcialmente") ptsPet += 3
  if (datos.ldap === "Sí") ptsPet += 3
  if (datos.acceso_remoto === "No") ptsPet += 2
  add("peticion", "Petición electrónica y accesos", ptsPet, 10, "Petición elec., LDAP, acceso remoto")

  // 6. Casos especiales
  const tiposEsp = (datos.tipos_esp as string[] | undefined) ?? []
  add("casos-esp", "Casos especiales", tiposEsp.length * 2 + (datos.pacientes_esp === "Sí" ? 2 : 0), 10, `${tiposEsp.length} tipo${tiposEsp.length !== 1 ? "s" : ""}`)

  // 7. Incidencias y madurez
  let ptsMad = 0
  if (datos.frec_incidencia === ">5%") ptsMad += 5
  else if (datos.frec_incidencia === "3–5%") ptsMad += 3
  if (datos.sistema_registro === "No") ptsMad += 3
  if (datos.etiq_metodo === "Sin sistema definido") ptsMad += 2
  add("incidencias", "Incidencias y madurez", ptsMad, 10, "Tasa incidencias, registros, etiquetado")

  // Normalizar a 0-100 respecto al máximo posible con esta config
  const score = maxTotal > 0 ? Math.min(Math.round((total / maxTotal) * 100), 100) : 0

  const { baja, media, alta } = cfg.umbrales
  let scoreLabel: string
  let scoreColor: string
  if (score <= baja)        { scoreLabel = "Baja";     scoreColor = "#10b981" }
  else if (score <= media)  { scoreLabel = "Media";    scoreColor = "#f59e0b" }
  else if (score <= alta)   { scoreLabel = "Alta";     scoreColor = "#f97316" }
  else                      { scoreLabel = "Muy alta"; scoreColor = "#ef4444" }

  return { score, scoreLabel, scoreColor, detalleScore }
}

// ─── Función principal ────────────────────────────────────────────────────────

export function analizarVisita(datos: Record<string, unknown>, cfg: ScoringConfig = DEFAULT_SCORING_CONFIG): AnalisisVisita {
  const riesgos = detectarRiesgos(datos, cfg)
  const { score, scoreLabel, scoreColor, detalleScore } = calcularScore(datos, cfg)
  return { riesgos, score, scoreLabel, scoreColor, detalleScore }
}
