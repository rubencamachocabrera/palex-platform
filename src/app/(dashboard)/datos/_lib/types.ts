// Contrato de tipos UI ↔ API futura
// Cuando se conecte el backend real, SOLO cambia data-service.ts — estos tipos no se tocan

export interface Hospital { id: string; nombre: string; ciudad: string }

export interface ConsumoParams {
  hospitalId: string
  meses: number
}

export interface ConsumoMensual {
  mes: string
  year: number
  monthIndex: number
  edta: number
  hepar: number
  coag: number
  suero: number
  gluco: number
  orina: number
  inmuno: number
  hemoc: number
}

export interface ForecastPunto {
  mes: string
  valor: number
  lower: number
  upper: number
  esForecast: boolean
}

export type TipoIncidencia = "TEMPERATURA" | "RUTA" | "NEVERA" | "TRANSPORTE" | "SISTEMA" | "MUESTRA"
export type GravedadIncidencia = "CRITICA" | "ALTA" | "MEDIA" | "BAJA"
export type EstadoIncidencia = "ABIERTA" | "EN_CURSO" | "RESUELTA"

export interface Incidencia {
  id: string
  fecha: string
  hospital: string
  hospitalId: string
  tipo: TipoIncidencia
  gravedad: GravedadIncidencia
  estado: EstadoIncidencia
  descripcion: string
  mttrHoras: number
  causa: string
  recurrente: boolean
}

export type TipoAlerta = "CONSUMO" | "TEMPERATURA" | "EQUIPO" | "INCIDENCIA"
export type SeveridadAlerta = "CRITICA" | "ALTA" | "MEDIA"

export interface Alerta {
  id: string
  tipo: TipoAlerta
  severidad: SeveridadAlerta
  titulo: string
  detalle: string
  hospital: string
  timestamp: string
  activa: boolean
}

export interface CorrelacionPunto {
  hospitalId: string
  nombre: string
  consumoTotal: number
  distanciaKm: number
  poblacionArea: number
  numVisitas: number
}

export interface FranjaHoraria {
  hora: number
  valor: number
  pct: number
}

export interface DiaSemanaHeatmap {
  dia: number
  mes: number
  valor: number
  intensity: number
}

export interface IndicadorAvanzado {
  tubo: string
  key: string
  color: string
  media: number
  mediana: number
  std: number
  p10: number
  p25: number
  p75: number
  p90: number
  cagr: number
  trend: "UP" | "DOWN" | "FLAT"
}

export type PeriodoKey = "3m" | "6m" | "12m" | "24m"
export type TabKey =
  | "dashboard"
  | "analitica"
  | "incidencias"
  | "ia"
  | "explorador"
  | "alertas"
  | "correlaciones"
  | "indicadores"

export const PERIODOS = [
  { k: "3m"  as PeriodoKey, label: "3 meses", meses: 3  },
  { k: "6m"  as PeriodoKey, label: "6 meses", meses: 6  },
  { k: "12m" as PeriodoKey, label: "1 año",   meses: 12 },
  { k: "24m" as PeriodoKey, label: "2 años",  meses: 24 },
]
