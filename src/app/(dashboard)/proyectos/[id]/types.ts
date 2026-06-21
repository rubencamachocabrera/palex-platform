import { TEAL, ORANGE } from "@/lib/brand"

// ---- interfaces ----

export interface Hospital {
  id: string; nombre: string; ciudad: string; provincia: string | null
  tipo?: string; camas?: number | null; direccion?: string | null; pais?: string
  zona?: { nombre: string }
}
export interface Responsable { id: string; nombre: string; email: string }
export interface Fase {
  id: string; tipo: string; nombre: string; orden: number; estado: string
  fechaPlan: string | null; fechaReal: string | null; notas: string | null
}
export interface Hito {
  id: string; titulo: string; descripcion: string | null
  fecha: string; fechaReal: string | null; completado: boolean
}
export interface LineaMaterial {
  id: string; nombre: string; referencia: string | null; cantidad: number
  cantidadEntregada: number; unidad: string; notas: string | null
}
export interface Solicitud {
  id: string; titulo: string; estado: string
  fechaSolicitud: string; fechaEntregaPlan: string | null; fechaEntregaReal: string | null
  notas: string | null; lineas: LineaMaterial[]
}
export interface Contacto {
  id: string; nombre: string; cargo: string | null; email: string | null; telefono: string | null; principal: boolean
}
export interface ContactoPivot { contacto: Contacto }
export interface EntradaTimeline {
  id: string; tipo: "EVENTO" | "COMENTARIO" | "CITA"
  titulo: string; contenido: string | null
  fechaEntrada: string; fechaCita: string | null; personaCita: string | null
  lugarCita: string | null; motivoCita: string | null; importanciaCita: number | null
  autor: string; creadoEn: string
}
export interface Tarea {
  id: string; parentId: string | null
  titulo: string; descripcion: string | null
  estado: "PENDIENTE" | "EN_PROGRESO" | "COMPLETADA" | "CANCELADA"
  prioridad: "BAJA" | "MEDIA" | "ALTA" | "CRITICA"
  asignadoA: string | null
  asignadoAId: string | null
  asignado: { id: string; nombre: string } | null
  fechaVencimiento: string | null; fechaCompletada: string | null
  orden: number; creadoEn: string
}
export interface Visita {
  id: string; fecha: string; estado: string; tipo: string
  usuario: { nombre: string }
}
export interface HardwareCatalogo {
  tipo: string; marca: string; modelo: string; precio?: number | null
}
export interface HardwareUnidad {
  id: string; numSerie: string | null; estado: string; notas: string | null
  catalogo: HardwareCatalogo
}
export interface Adjunto {
  id: string; nombre: string; tipo: string; tamano: number; creadoPor: string; creadoEn: string
}
export interface ProyectoRef { id: string; nombre: string }
export interface ModuloInfo { id: string; nombre: string }
export interface ProyectoModuloItem { modulo: ModuloInfo; estado: string; proyectoId: string; moduloId: string }
export interface Proyecto {
  id: string; titulo: string; descripcion: string | null; estado: string; prioridad: number
  presupuesto: number | null; fechaInicio: string | null; fechaFinPlan: string | null; fechaFinReal: string | null
  notas: string | null; mapaHtml?: string | null; shareToken?: string | null
  proyectoId?: string | null; refContrato?: string | null; refConcurso?: string | null
  creadoEn: string; editadoEn: string
  hospital: Hospital; responsable: Responsable | null
  fases: Fase[]; hitos: Hito[]; solicitudes: Solicitud[]
  contactos: ContactoPivot[]; visitas: Visita[]; hardwareUnidades: HardwareUnidad[]
  entradas: EntradaTimeline[]; tareas: Tarea[]
  adjuntos?: { id: string }[]
  modulos?: ProyectoModuloItem[]
  tags?: { tag: { id: string; nombre: string; color: string } }[]
}

// ---- constantes ----

export const ESTADO_LABEL: Record<string, string> = {
  NUEVO: "Nuevo", EN_CURSO: "En curso", PAUSADO: "Pausado", COMPLETADO: "Completado", CANCELADO: "Cancelado",
}
export const ESTADO_COLOR: Record<string, { bg: string; text: string }> = {
  NUEVO:      { bg: "#f0f9ff", text: "#0369a1" },
  EN_CURSO:   { bg: `${TEAL}18`, text: TEAL },
  PAUSADO:    { bg: "#fef3c7", text: "#d97706" },
  COMPLETADO: { bg: "#f0fdf4", text: "#16a34a" },
  CANCELADO:  { bg: "#fef2f2", text: "#dc2626" },
}
export const FASE_ESTADO_COLOR: Record<string, { dot: string; text: string; bg: string }> = {
  PENDIENTE:    { dot: "#d1d5db", text: "#6b7280", bg: "#f9fafb" },
  EN_PROGRESO:  { dot: TEAL,     text: TEAL,       bg: `${TEAL}10` },
  COMPLETADO:   { dot: "#16a34a", text: "#16a34a",  bg: "#f0fdf4" },
  BLOQUEADO:    { dot: "#dc2626", text: "#dc2626",  bg: "#fef2f2" },
}
export const SOLICITUD_ESTADO: Record<string, { label: string; color: string; bg: string }> = {
  PENDIENTE:      { label: "Pendiente",      color: "#d97706", bg: "#fef3c7" },
  APROBADA:       { label: "Aprobada",       color: TEAL,      bg: `${TEAL}18` },
  EN_PREPARACION: { label: "En preparación", color: "#7c3aed", bg: "#f5f3ff" },
  ENVIADA:        { label: "Enviada",        color: "#0369a1", bg: "#f0f9ff" },
  ENTREGADA:      { label: "Entregada",      color: "#16a34a", bg: "#f0fdf4" },
  CANCELADA:      { label: "Cancelada",      color: "#dc2626", bg: "#fef2f2" },
}
export const HW_ESTADO: Record<string, { label: string; color: string; bg: string }> = {
  DISPONIBLE:      { label: "Disponible",      color: "#16a34a", bg: "#f0fdf4" },
  ASIGNADO:        { label: "Asignado",        color: TEAL,      bg: `${TEAL}18` },
  EN_MANTENIMIENTO:{ label: "Mantenimiento",   color: "#d97706", bg: "#fef3c7" },
  RETIRADO:        { label: "Retirado",        color: "#6b7280", bg: "#f3f4f6" },
  BAJA:            { label: "Baja",            color: "#dc2626", bg: "#fef2f2" },
}
export const HW_TIPO_LABEL: Record<string, string> = {
  BC_ROBOT: "BC Robo", ZEBRA_MC: "Zebra MC", ZEBRA_PRINTER: "Zebra Printer",
  LECTOR_BARRAS: "Lector Barras", SERVIDOR: "Servidor", SWITCH_RED: "Switch Red",
  TABLET: "Tablet", OTRO: "Otro",
}
export const VISITA_ESTADO_COLOR: Record<string, string> = {
  BORRADOR: "#d97706", COMPLETADA: "#16a34a", ARCHIVADA: "#6b7280",
}
export const PRIORIDAD: Record<number, { label: string; color: string }> = {
  0: { label: "Normal", color: "#6b7280" },
  1: { label: "Alta",   color: ORANGE },
  2: { label: "Crítica",color: "#dc2626" },
}

export const TABS = ["Cockpit", "Info", "Tareas", "Timeline", "Materiales", "Contactos", "Visitas", "Módulos", "Adjuntos", "Resumen"] as const
export type Tab = typeof TABS[number]

// ---- helpers ----

export function fmtFecha(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}
export function fmtFechaInput(s: string | null) {
  if (!s) return ""
  return new Date(s).toISOString().split("T")[0]
}
export function relativo(s: string) {
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000)
  if (d === 0) return "hoy"
  if (d === 1) return "ayer"
  if (d < 7) return `hace ${d}d`
  if (d < 30) return `hace ${Math.floor(d / 7)}sem`
  return `hace ${Math.floor(d / 30)}m`
}

export const TIPO_HOSPITAL_LABEL: Record<string, string> = {
  PUBLICO: "Público", PRIVADO: "Privado", CONCERTADO: "Concertado",
  CLINICA: "Clínica", LABORATORIO: "Laboratorio", FUNDACION: "Fundación",
  CENTRO_SALUD: "Centro de Salud", UNIVERSIDAD: "Universidad", OTRO: "Otro",
}
