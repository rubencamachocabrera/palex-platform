import { z } from "zod"

const str = z.string().min(1).max(500)
const strOpt = z.string().max(2000).optional()
const id = z.string().min(1).max(100)
const dateStr = z.string().refine(s => !isNaN(Date.parse(s)), { message: "Fecha inválida" })
const dateStrOpt = z.string().refine(s => !isNaN(Date.parse(s)), { message: "Fecha inválida" }).optional().nullable()

export const TareaCreate = z.object({
  titulo: str,
  descripcion: strOpt.nullable(),
  estado: z.enum(["PENDIENTE", "EN_PROGRESO", "COMPLETADA", "CANCELADA"]).default("PENDIENTE"),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]).default("MEDIA"),
  asignadoA: z.string().max(200).optional().nullable(),
  asignadoAId: id.optional().nullable(),
  parentId: id.optional().nullable(),
  fechaVencimiento: dateStrOpt,
  orden: z.number().int().min(0).max(9999).default(0),
})

export const TareaPatch = z.object({
  titulo: str.optional(),
  descripcion: strOpt.nullable().optional(),
  estado: z.enum(["PENDIENTE", "EN_PROGRESO", "COMPLETADA", "CANCELADA"]).optional(),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]).optional(),
  asignadoA: z.string().max(200).optional().nullable(),
  asignadoAId: id.optional().nullable(),
  parentId: id.optional().nullable(),
  fechaVencimiento: dateStrOpt,
  fechaCompletada: dateStrOpt,
  orden: z.number().int().min(0).max(9999).optional(),
}).refine(o => Object.keys(o).length > 0, { message: "Sin campos" })

export const HitoCreate = z.object({
  titulo: str,
  descripcion: strOpt.nullable(),
  fecha: dateStr,
})

export const HitoPatch = z.object({
  titulo: str.optional(),
  descripcion: strOpt.nullable().optional(),
  fecha: dateStrOpt,
  fechaReal: dateStrOpt,
  completado: z.boolean().optional(),
}).refine(o => Object.keys(o).length > 0, { message: "Sin campos" })

export const EntradaCreate = z.object({
  tipo: z.enum(["EVENTO", "COMENTARIO", "CITA"]),
  titulo: z.string().max(500).optional(),
  contenido: z.string().max(5000).optional().nullable(),
  fechaEntrada: dateStrOpt,
  fechaCita: dateStrOpt,
  personaCita: z.string().max(200).optional().nullable(),
  lugarCita: z.string().max(300).optional().nullable(),
  motivoCita: z.string().max(500).optional().nullable(),
  importanciaCita: z.number().int().min(0).max(5).optional().nullable(),
})

const LineaMaterial = z.object({
  nombre: str,
  referencia: z.string().max(200).optional().nullable(),
  cantidad: z.coerce.number().int().min(1).max(999999),
  unidad: z.string().max(50).default("ud"),
  notas: strOpt.nullable(),
})

export const SolicitudCreate = z.object({
  titulo: str,
  estado: z.string().max(50).default("PENDIENTE"),
  fechaEntregaPlan: dateStrOpt,
  notas: strOpt.nullable(),
  lineas: z.array(LineaMaterial).max(100).optional(),
})

export const SolicitudPatch = z.object({
  titulo: str.optional(),
  estado: z.string().max(50).optional(),
  fechaEntregaPlan: dateStrOpt,
  fechaEntregaReal: dateStrOpt,
  notas: strOpt.nullable().optional(),
})

export const ContactoPivot = z.object({
  contactoId: id,
})

export const ModulosReplace = z.object({
  moduloIds: z.array(id).min(1).max(50),
})

export const ModuloPatch = z.object({
  estado: z.enum(["PENDIENTE", "EN_INSTALACION", "INSTALADO", "FORMACION", "VALIDADO"]),
})

export const FasePatch = z.object({
  estado: z.enum(["PENDIENTE", "EN_PROGRESO", "COMPLETADO", "BLOQUEADO"]).optional(),
  fechaPlan: dateStrOpt,
  fechaReal: dateStrOpt,
  notas: z.string().max(2000).optional().nullable(),
}).refine(o => Object.keys(o).length > 0, { message: "Sin campos" })

export const RecordatorioCreate = z.object({
  titulo: str,
  descripcion: strOpt.nullable(),
  fecha: dateStr,
})

export const RecordatorioPatch = z.object({
  titulo: str.optional(),
  descripcion: strOpt.nullable().optional(),
  fecha: dateStrOpt,
  completado: z.boolean().optional(),
}).refine(o => Object.keys(o).length > 0, { message: "Sin campos" })

export const OnboardingPatch = z.object({
  completado: z.boolean(),
})

export const ComentarioCreate = z.object({
  texto: z.string().min(1).max(5000),
  mencionIds: z.array(id).max(20).optional(),
  foto: z.string().max(2_000_000).optional(),
})

export const TagCreate = z.object({
  nombre: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  tipo: z.enum(["VISITA", "PROYECTO"]),
  orden: z.number().int().min(0).max(9999).default(0),
})

export const TagPatch = z.object({
  nombre: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  orden: z.number().int().min(0).max(9999).optional(),
  activo: z.boolean().optional(),
}).refine(o => Object.keys(o).length > 0, { message: "Sin campos" })

export const ContactoCreate = z.object({
  nombre: str,
  cargo: z.string().max(200).optional().nullable(),
  email: z.string().email().max(200).optional().nullable(),
  telefono: z.string().max(50).optional().nullable(),
  principal: z.boolean().default(false),
})

export const ContactoPatch = z.object({
  nombre: str.optional(),
  cargo: z.string().max(200).optional().nullable(),
  email: z.string().email().max(200).optional().nullable(),
  telefono: z.string().max(50).optional().nullable(),
  principal: z.boolean().optional(),
}).refine(o => Object.keys(o).length > 0, { message: "Sin campos" })

export const HardwareUnidadCreate = z.object({
  catalogoId: id,
  numSerie: z.string().max(200).optional().nullable(),
  estado: z.enum(["DISPONIBLE", "ASIGNADO", "EN_MANTENIMIENTO", "RETIRADO", "BAJA"]).default("DISPONIBLE"),
  hospitalId: id.optional().nullable(),
  notas: strOpt.nullable(),
  fechaInstalacion: dateStrOpt,
  fechaGarantia: dateStrOpt,
  fechaMantenimiento: dateStrOpt,
})

export const LlamadaCreate = z.object({
  hospitalId: id,
  contactoId: id.optional().nullable(),
  asunto: str,
  duracion: z.coerce.number().int().min(0).max(9999).optional().nullable(),
  notas: z.string().max(5000).optional().nullable(),
  resultado: z.string().max(200).optional().nullable(),
  seguimiento: z.boolean().default(false),
  fechaSeguimiento: dateStrOpt,
})

export const LlamadaPatch = z.object({
  asunto: str.optional(),
  duracion: z.coerce.number().int().min(0).max(9999).optional().nullable(),
  notas: z.string().max(5000).optional().nullable(),
  resultado: z.string().max(200).optional().nullable(),
  seguimiento: z.boolean().optional(),
  fechaSeguimiento: dateStrOpt,
}).refine(o => Object.keys(o).length > 0, { message: "Sin campos" })

export const IncidenciaCreate = z.object({
  titulo: str,
  descripcion: z.string().min(1).max(5000),
  tipo: z.enum(["HARDWARE", "SOFTWARE"]),
  categoria: z.enum(["BC_ROBO", "ZEBRA_MC", "ZEBRA_IMPRESORA", "READER_RFID", "GATEWAY_BT", "MINI_PC", "NEVERA", "PANTALLA", "INLAB", "OTRO"]),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]).default("MEDIA"),
  equipoResponsable: z.enum(["SERVICIO_TECNICO", "APLICACIONES", "COMERCIAL", "MARKETING", "PROYECTOS"]).default("SERVICIO_TECNICO"),
  hospitalId: id,
  contactoId: id.optional().nullable(),
  hardwareUnidadId: id.optional().nullable(),
  asignadoAId: id.optional().nullable(),
  coasignadosIds: z.array(id).max(10).optional(),
  slaHoras: z.coerce.number().int().min(1).max(9999).optional().nullable(),
})

export const IncidenciaPatch = z.object({
  titulo: str.optional(),
  descripcion: z.string().min(1).max(5000).optional(),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]).optional(),
  estado: z.enum(["ABIERTA", "EN_PROGRESO", "PENDIENTE_CLIENTE", "PENDIENTE_PROVEEDOR", "RESUELTA", "CERRADA"]).optional(),
  equipoResponsable: z.enum(["SERVICIO_TECNICO", "APLICACIONES", "AMBOS"]).optional(),
  asignadoAId: id.optional().nullable(),
  resolucion: z.string().max(5000).optional().nullable(),
  slaHoras: z.coerce.number().int().min(1).max(9999).optional().nullable(),
}).refine(o => Object.keys(o).length > 0, { message: "Sin campos" })

export const EventoIncidenciaCreate = z.object({
  tipo: z.enum(["NOTA", "LLAMADA_ENTRANTE", "LLAMADA_SALIENTE", "EMAIL_ENVIADO", "EMAIL_RECIBIDO", "CAMBIO_ESTADO", "CAMBIO_ASIGNACION", "ESCALADO", "RESPUESTA_TECNICA", "RESPUESTA_APLICACIONES", "COMUNICACION_CLIENTE"]),
  descripcion: z.string().min(1).max(5000),
  duracion: z.coerce.number().int().min(0).max(9999).optional().nullable(),
  privado: z.boolean().default(false),
  fecha: z.coerce.date().optional(),
  fotos: z.array(z.string()).max(5).optional(),
})

export const EventoIncidenciaPatch = z.object({
  descripcion: z.string().min(1).max(5000).optional(),
  privado: z.boolean().optional(),
  fotos: z.array(z.string()).max(5).optional(),
}).refine(o => Object.keys(o).length > 0, { message: "Sin campos" })

export function parseBody<T>(schema: z.ZodType<T>, data: unknown):
  { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) return { success: true, data: result.data }
  const msg = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ")
  return { success: false, error: msg }
}
