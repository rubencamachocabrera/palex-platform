export interface PlantillaFase {
  tipo: string
  nombre: string
  orden: number
}

export interface PlantillaTarea {
  titulo: string
  orden: number
}

export interface PlantillaHito {
  titulo: string
  diasDesdeHoy: number
}

export interface PlantillaProyecto {
  id: string
  nombre: string
  descripcion: string
  fases: PlantillaFase[]
  tareas: PlantillaTarea[]
  hitos: PlantillaHito[]
}

export const PLANTILLAS_PROYECTO: PlantillaProyecto[] = [
  {
    id: "implantacion_completa",
    nombre: "Implantación completa",
    descripcion: "Ciclo completo: contrato, visita técnica, materiales, instalación, formación y cierre.",
    fases: [
      { tipo: "FIRMA_CONTRATO",   nombre: "Firma de contrato",            orden: 0 },
      { tipo: "VISITA_TECNICA",   nombre: "Visita técnica previa",         orden: 1 },
      { tipo: "SOLICITUD_MATERIAL", nombre: "Solicitud de material",       orden: 2 },
      { tipo: "ENTREGA_MATERIAL", nombre: "Entrega de material en hospital", orden: 3 },
      { tipo: "CONFIGURACION",    nombre: "Configuración del sistema",     orden: 4 },
      { tipo: "INSTALACION",      nombre: "Instalación física en planta",  orden: 5 },
      { tipo: "PUESTA_EN_MARCHA", nombre: "Puesta en marcha",             orden: 6 },
      { tipo: "FORMACION",        nombre: "Formación del personal",        orden: 7 },
      { tipo: "VALIDACION",       nombre: "Validación y pruebas",          orden: 8 },
      { tipo: "ENTREGA_PROYECTO", nombre: "Entrega y cierre del proyecto", orden: 9 },
      { tipo: "SOPORTE_POST",     nombre: "Soporte post-implantación",     orden: 10 },
    ],
    tareas: [
      { titulo: "Revisar documentación contractual", orden: 0 },
      { titulo: "Confirmar fecha de visita técnica con el hospital", orden: 1 },
      { titulo: "Preparar lista de material necesario", orden: 2 },
      { titulo: "Coordinar logística de entrega con almacén", orden: 3 },
      { titulo: "Configurar parámetros en sistemas centrales", orden: 4 },
      { titulo: "Pruebas de integración HIS/LIS", orden: 5 },
      { titulo: "Sesión de formación al personal del laboratorio", orden: 6 },
      { titulo: "Obtener firma del acta de entrega", orden: 7 },
    ],
    hitos: [
      { titulo: "Contrato firmado",                  diasDesdeHoy: 0 },
      { titulo: "Material entregado en hospital",     diasDesdeHoy: 30 },
      { titulo: "Sistema validado y operativo",       diasDesdeHoy: 60 },
      { titulo: "Proyecto cerrado",                   diasDesdeHoy: 90 },
    ],
  },
  {
    id: "instalacion_basica",
    nombre: "Instalación básica",
    descripcion: "Proceso simplificado para hardware sin configuración compleja. Ideal para Zebra, impresoras y periféricos.",
    fases: [
      { tipo: "VISITA_TECNICA",   nombre: "Visita técnica",        orden: 0 },
      { tipo: "ENTREGA_MATERIAL", nombre: "Entrega de material",   orden: 1 },
      { tipo: "INSTALACION",      nombre: "Instalación del equipo", orden: 2 },
      { tipo: "PUESTA_EN_MARCHA", nombre: "Puesta en marcha",      orden: 3 },
      { tipo: "ENTREGA_PROYECTO", nombre: "Entrega y cierre",      orden: 4 },
    ],
    tareas: [
      { titulo: "Preparar material e instrucciones de instalación", orden: 0 },
      { titulo: "Realizar instalación física",                       orden: 1 },
      { titulo: "Verificar conectividad de red",                     orden: 2 },
      { titulo: "Registrar número de serie en sistema",              orden: 3 },
      { titulo: "Firmar albarán de entrega",                         orden: 4 },
    ],
    hitos: [
      { titulo: "Instalación completada", diasDesdeHoy: 14 },
    ],
  },
  {
    id: "mantenimiento_preventivo",
    nombre: "Mantenimiento preventivo",
    descripcion: "Revisión periódica de equipos. Verificación de funcionamiento, limpieza y actualización de firmware.",
    fases: [
      { tipo: "VISITA_TECNICA",   nombre: "Visita de revisión in situ",      orden: 0 },
      { tipo: "CONFIGURACION",    nombre: "Actualizaciones y ajustes",        orden: 1 },
      { tipo: "VALIDACION",       nombre: "Verificación de funcionamiento",   orden: 2 },
      { tipo: "ENTREGA_PROYECTO", nombre: "Informe de mantenimiento",         orden: 3 },
    ],
    tareas: [
      { titulo: "Inspección visual de todos los equipos",                   orden: 0 },
      { titulo: "Actualizar firmware/software si hay versión disponible",   orden: 1 },
      { titulo: "Limpiar lectores y sensores",                               orden: 2 },
      { titulo: "Realizar pruebas de funcionamiento completas",              orden: 3 },
      { titulo: "Documentar hallazgos y redactar informe",                   orden: 4 },
    ],
    hitos: [
      { titulo: "Mantenimiento completado y validado", diasDesdeHoy: 7 },
    ],
  },
  {
    id: "auditoria_hardware",
    nombre: "Auditoría de hardware",
    descripcion: "Inventario y evaluación del estado de los equipos instalados. Detección de unidades obsoletas o en mal estado.",
    fases: [
      { tipo: "VISITA_TECNICA",   nombre: "Visita de auditoría",            orden: 0 },
      { tipo: "VALIDACION",       nombre: "Evaluación del estado de equipos", orden: 1 },
      { tipo: "ENTREGA_PROYECTO", nombre: "Entrega del informe",             orden: 2 },
    ],
    tareas: [
      { titulo: "Listar todos los equipos instalados en el hospital",        orden: 0 },
      { titulo: "Verificar estado físico de cada unidad",                    orden: 1 },
      { titulo: "Identificar equipos con garantía caducada",                 orden: 2 },
      { titulo: "Registrar números de serie y modelos actualizados",         orden: 3 },
      { titulo: "Redactar informe con recomendaciones de renovación",        orden: 4 },
    ],
    hitos: [
      { titulo: "Informe de auditoría entregado al hospital", diasDesdeHoy: 14 },
    ],
  },
]
