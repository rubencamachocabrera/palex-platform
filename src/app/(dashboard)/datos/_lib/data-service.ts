// Capa de datos — HOY usa mock, FUTURO reemplaza el cuerpo con fetch("/api/datos/...")
// Los tipos de retorno son el contrato con la API real. Los componentes no cambian al migrar.

import type {
  Hospital, ConsumoParams, ConsumoMensual, ForecastPunto,
  Incidencia, Alerta, CorrelacionPunto, FranjaHoraria,
  DiaSemanaHeatmap, IndicadorAvanzado,
} from "./types"
import {
  generarConsumoMensual, generarForecast, generarIncidencias,
  generarAlertas, generarCorrelaciones, generarFranjaHoraria,
  generarDiaSemana, generarIndicadores,
} from "./mock-data"

// Consumo mensual por hospital
// FUTURO: fetch(`/api/datos/consumo?hospitalId=${p.hospitalId}&meses=${p.meses}`)
export async function getConsumoMensual(params: ConsumoParams): Promise<ConsumoMensual[]> {
  return generarConsumoMensual(params)
}

// Forecast con bandas de confianza (30/60/90 días)
// FUTURO: fetch(`/api/datos/forecast?hospitalId=${hospitalId}&meses=${mesesForecast}`)
export async function getForecast(hospitalId: string, base: ConsumoMensual[], mesesForecast = 3): Promise<ForecastPunto[]> {
  return generarForecast(hospitalId, base, mesesForecast)
}

// Incidencias del hospital
// FUTURO: fetch(`/api/datos/incidencias?hospitalId=${hospitalId}`)
export async function getIncidencias(hospitalId: string): Promise<Incidencia[]> {
  return generarIncidencias(hospitalId)
}

// Alertas activas del sistema
// FUTURO: fetch("/api/datos/alertas")
export async function getAlertas(hospitales: Hospital[]): Promise<Alerta[]> {
  return generarAlertas(hospitales)
}

// Puntos de correlación consumo vs distancia/población
// FUTURO: fetch("/api/datos/correlaciones")
export async function getCorrelaciones(hospitales: Hospital[]): Promise<CorrelacionPunto[]> {
  return generarCorrelaciones(hospitales)
}

// Distribución de consumo por franja horaria (0-23h)
// FUTURO: fetch(`/api/datos/franja-horaria?hospitalId=${hospitalId}`)
export async function getFranjaHoraria(hospitalId: string): Promise<FranjaHoraria[]> {
  return generarFranjaHoraria(hospitalId)
}

// Heatmap día de semana × mes
// FUTURO: fetch(`/api/datos/dia-semana?hospitalId=${hospitalId}`)
export async function getDiaSemana(hospitalId: string): Promise<DiaSemanaHeatmap[]> {
  return generarDiaSemana(hospitalId)
}

// Indicadores estadísticos avanzados (std, percentiles, CAGR)
// FUTURO: fetch(`/api/datos/indicadores?hospitalId=${hospitalId}`)
export async function getIndicadores(data: ConsumoMensual[]): Promise<IndicadorAvanzado[]> {
  return generarIndicadores(data)
}
