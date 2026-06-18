export interface CategoriaConfig {
  id: string
  nombre: string
  max: number
  activa: boolean
}

export interface ReglaConfig {
  id: string
  nivel: "alto" | "medio" | "info"
  activa: boolean
}

export interface UmbralesConfig {
  baja: number   // score <= baja  → "Baja"
  media: number  // score <= media → "Media"
  alta: number   // score <= alta  → "Alta" (> alta = "Muy alta")
}

export interface ScoringConfig {
  umbrales: UmbralesConfig
  categorias: CategoriaConfig[]
  reglas: ReglaConfig[]
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  umbrales: { baja: 20, media: 45, alta: 70 },
  categorias: [
    { id: "volumen",       nombre: "Volumen de pacientes",           max: 20, activa: true },
    { id: "integraciones", nombre: "Integraciones TI",               max: 20, activa: true },
    { id: "infra",         nombre: "Infraestructura",                max: 15, activa: true },
    { id: "hardware",      nombre: "Hardware a instalar",            max: 15, activa: true },
    { id: "peticion",      nombre: "Petición electrónica y accesos", max: 10, activa: true },
    { id: "casos-esp",     nombre: "Casos especiales",               max: 10, activa: true },
    { id: "incidencias",   nombre: "Incidencias y madurez",          max: 10, activa: true },
  ],
  reglas: [
    { id: "so-obsoleto",                  nivel: "alto",  activa: true },
    { id: "sin-red-cableada",             nivel: "alto",  activa: true },
    { id: "sin-pet-elec",                 nivel: "alto",  activa: true },
    { id: "sin-wifi",                     nivel: "medio", activa: true },
    { id: "sin-servidor",                 nivel: "alto",  activa: true },
    { id: "sin-pcs",                      nivel: "alto",  activa: true },
    { id: "alta-incidencias",             nivel: "medio", activa: true },
    { id: "sin-planos",                   nivel: "info",  activa: true },
    { id: "bcrobo-sin-red",               nivel: "alto",  activa: true },
    { id: "bcrobo-sin-elec",              nivel: "alto",  activa: true },
    { id: "zebra-sin-red",                nivel: "medio", activa: true },
    { id: "ldap-sin-ti",                  nivel: "medio", activa: true },
    { id: "bcrobo-acceso",                nivel: "info",  activa: true },
    { id: "etiq-sin-sistema",             nivel: "medio", activa: true },
    { id: "volumen-alto-sin-estadistico", nivel: "info",  activa: true },
  ],
}

// Client-side module cache (5 min TTL)
let _cache: ScoringConfig | null = null
let _cacheAt = 0
const TTL = 5 * 60 * 1000

export async function getScoringConfig(): Promise<ScoringConfig> {
  if (_cache && Date.now() - _cacheAt < TTL) return _cache
  try {
    const r = await fetch("/api/config")
    if (r.ok) {
      const data = await r.json()
      if (data.scoringConfig && typeof data.scoringConfig === "object") {
        _cache = mergeWithDefaults(data.scoringConfig as Partial<ScoringConfig>)
        _cacheAt = Date.now()
        return _cache
      }
    }
  } catch { /* usa defaults */ }
  return DEFAULT_SCORING_CONFIG
}

export function invalidateScoringCache() {
  _cache = null
  _cacheAt = 0
}

function mergeWithDefaults(partial: Partial<ScoringConfig>): ScoringConfig {
  const def = DEFAULT_SCORING_CONFIG
  return {
    umbrales: { ...def.umbrales, ...(partial.umbrales ?? {}) },
    categorias: partial.categorias?.length
      ? partial.categorias
      : def.categorias,
    reglas: partial.reglas?.length
      ? partial.reglas
      : def.reglas,
  }
}
