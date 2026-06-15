// Capa de datos — HOY usa mock, FUTURO reemplaza el cuerpo con fetch("/api/transporte/...")
// Los tipos de retorno son el contrato con la API real (sync read-only desde BD termografía).
// Los componentes no cambian al migrar.

import type {
  Ruta, Nevera, LecturaTemperatura, IncidenciaTransporte,
  AlertaTransporte, TendenciaPunto, KpiResumen,
} from "./types"
import {
  generarRutas, generarNeveras, generarLecturasTemperatura, generarIncidenciasTransporte,
  generarAlertasTransporte, generarTendencias, generarKpis,
} from "./mock-data"

// Rutas del día (en curso, programadas, completadas)
// FUTURO: fetch("/api/transporte/rutas")
export async function getRutas(): Promise<Ruta[]> {
  return generarRutas()
}

// Flota de neveras (en ruta, laboratorio, mantenimiento)
// FUTURO: fetch("/api/transporte/neveras")
export async function getNeveras(rutas: Ruta[]): Promise<Nevera[]> {
  return generarNeveras(rutas)
}

// Lecturas de temperatura de una nevera (últimas 24h)
// FUTURO: fetch(`/api/transporte/neveras/${nevera.id}/lecturas`)
export async function getLecturasTemperatura(nevera: Nevera): Promise<LecturaTemperatura[]> {
  return generarLecturasTemperatura(nevera)
}

// Incidencias de transporte (excursiones, retrasos, averías...)
// FUTURO: fetch("/api/transporte/incidencias")
export async function getIncidencias(): Promise<IncidenciaTransporte[]> {
  return generarIncidenciasTransporte()
}

// Alertas activas del sistema de transporte
// FUTURO: fetch("/api/transporte/alertas")
export async function getAlertas(rutas: Ruta[], neveras: Nevera[]): Promise<AlertaTransporte[]> {
  return generarAlertasTransporte(rutas, neveras)
}

// Tendencias diarias (tiempo medio, temperatura media, cumplimiento)
// FUTURO: fetch(`/api/transporte/tendencias?dias=${dias}`)
export async function getTendencias(dias: number): Promise<TendenciaPunto[]> {
  return generarTendencias(dias)
}

// KPIs resumen del dashboard ejecutivo
// FUTURO: fetch("/api/transporte/kpis")
export async function getKpis(rutas: Ruta[], neveras: Nevera[], incidencias: IncidenciaTransporte[]): Promise<KpiResumen> {
  return generarKpis(rutas, neveras, incidencias)
}
