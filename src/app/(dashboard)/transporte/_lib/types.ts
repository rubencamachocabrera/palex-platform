// Contrato de tipos UI ↔ API futura (sincronización con BD termografía)
// Cuando se conecte el backend real, SOLO cambia data-service.ts — estos tipos no se tocan

export type EstadoRuta = "PROGRAMADA" | "EN_CURSO" | "COMPLETADA" | "RETRASADA"
export type EstadoParada = "PENDIENTE" | "EN_CURSO" | "COMPLETADA" | "RETRASADA"

export interface ParadaRuta {
  id: string
  orden: number
  hospitalNombre: string
  ciudad: string
  lat: number
  lng: number
  horaProgramada: string
  horaReal: string | null
  estado: EstadoParada
  temperaturaRecogida: number | null
  muestrasRecogidas: number
}

export interface Ruta {
  id: string
  nombre: string
  zona: string
  conductor: string
  vehiculo: string
  estado: EstadoRuta
  horaInicio: string
  horaFinEstimada: string
  horaFinReal: string | null
  distanciaKm: number
  neveraId: string
  paradas: ParadaRuta[]
}

export type TipoSensorNevera = "RFID" | "BT" | "RFID_BT"
export type EstadoNevera = "EN_TRANSITO" | "EN_LABORATORIO" | "EN_CENTRO" | "MANTENIMIENTO" | "FUERA_SERVICIO"

export interface Nevera {
  id: string
  codigo: string
  tipo: TipoSensorNevera
  estado: EstadoNevera
  temperaturaActual: number
  rangoMin: number
  rangoMax: number
  bateria: number
  ultimaLectura: string
  ubicacionActual: string
  rutaId: string | null
}

export interface LecturaTemperatura {
  hora: string
  timestamp: string
  temperatura: number
  rangoMin: number
  rangoMax: number
}

export type TipoIncidenciaTransporte = "EXCURSION_TEMP" | "RETRASO_RUTA" | "AVERIA_VEHICULO" | "FALLO_SENSOR" | "MUESTRA_DANADA" | "CONECTIVIDAD"
export type GravedadIncidencia = "CRITICA" | "ALTA" | "MEDIA" | "BAJA"
export type EstadoIncidencia = "ABIERTA" | "EN_CURSO" | "RESUELTA"

export interface IncidenciaTransporte {
  id: string
  fecha: string
  ruta: string
  nevera: string | null
  tipo: TipoIncidenciaTransporte
  gravedad: GravedadIncidencia
  estado: EstadoIncidencia
  descripcion: string
  duracionMin: number
  mttrHoras: number
}

export type TipoAlertaTransporte = "TEMPERATURA" | "BATERIA" | "RETRASO" | "CONECTIVIDAD" | "MANTENIMIENTO"
export type SeveridadAlerta = "CRITICA" | "ALTA" | "MEDIA"

export interface AlertaTransporte {
  id: string
  tipo: TipoAlertaTransporte
  severidad: SeveridadAlerta
  titulo: string
  detalle: string
  entidad: string
  timestamp: string
  activa: boolean
}

export interface TendenciaPunto {
  fecha: string
  label: string
  tiempoMedioMin: number
  tempMedia: number
  excursiones: number
  cumplimientoPct: number
  rutasCompletadas: number
}

export interface KpiResumen {
  rutasActivas: number
  rutasProgramadas: number
  neverasEnTransito: number
  paradasCompletadas: number
  paradasTotales: number
  excursionesHoy: number
  tiempoMedioMin: number
  cumplimientoPct: number
}

export type PeriodoKey = "7d" | "30d" | "90d"
export const PERIODOS_TRANSPORTE: { k: PeriodoKey; label: string; dias: number }[] = [
  { k: "7d",  label: "7 días",  dias: 7  },
  { k: "30d", label: "30 días", dias: 30 },
  { k: "90d", label: "90 días", dias: 90 },
]

export type TabKeyTransporte =
  | "dashboard"
  | "mapa"
  | "tendencias"
  | "flota"
  | "incidencias"
  | "alertas"
