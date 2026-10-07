/**
 * Inteligencia InLab — módulo de ADAPTACIÓN al fichero real.
 *
 * Aquí vive todo lo que depende del formato de la exportación MySQL de InLab:
 *   1. Los campos canónicos que entiende el agregador (CAMPOS).
 *   2. Los alias de cabecera para autodetectar el emparejamiento (ALIAS_CABECERA).
 *   3. La normalización de valores: eventos/incidencias, prioridad urgente, áreas.
 *
 * Cuando llegue el CSV real, normalmente basta con:
 *   - añadir los nombres reales de columna a ALIAS_CABECERA,
 *   - ajustar ALIAS_EVENTO / EVENTO_NEUTRO / esUrgente() a los códigos reales,
 *   - revisar si hacen falta campos nuevos (ver README.md en esta carpeta).
 *
 * Este fichero se ejecuta en el navegador (y en el Web Worker): no importar nada de servidor.
 */

export type CampoKey =
  | "idOrden"
  | "fechaPeticion"
  | "fechaExtraccion"
  | "fechaRecepcion"
  | "fechaValidacion"
  | "area"
  | "puesto"
  | "consumible"
  | "cantidad"
  | "evento"
  | "prioridad"
  | "impresora"

export type CampoTipo = "texto" | "fecha" | "numero"

export interface CampoDef {
  key: CampoKey
  label: string
  tipo: CampoTipo
  ayuda: string
  grupo: "Hitos" | "Dónde" | "Qué" | "Calidad"
}

export const CAMPOS: CampoDef[] = [
  { key: "fechaPeticion",   label: "Petición",              tipo: "fecha",  grupo: "Hitos",   ayuda: "Fecha/hora de creación de la orden o petición." },
  { key: "fechaExtraccion", label: "Extracción / impresión", tipo: "fecha", grupo: "Hitos",   ayuda: "Fecha/hora de extracción o de impresión de la etiqueta." },
  { key: "fechaRecepcion",  label: "Recepción laboratorio", tipo: "fecha",  grupo: "Hitos",   ayuda: "Fecha/hora de llegada de la muestra al laboratorio." },
  { key: "fechaValidacion", label: "Validación",            tipo: "fecha",  grupo: "Hitos",   ayuda: "Fecha/hora de validación o hito final (opcional)." },
  { key: "area",            label: "Área de trabajo",       tipo: "texto",  grupo: "Dónde",   ayuda: "Extracciones, Urgencias, Planta, Laboratorio…" },
  { key: "puesto",          label: "Puesto",                tipo: "texto",  grupo: "Dónde",   ayuda: "Mostrador, box o puesto concreto (MO-01, BOX-3…)." },
  { key: "impresora",       label: "Impresora",             tipo: "texto",  grupo: "Dónde",   ayuda: "Zebra o BC Robo que imprimió la etiqueta." },
  { key: "consumible",      label: "Consumible / tubo",     tipo: "texto",  grupo: "Qué",     ayuda: "Tipo de tubo o etiqueta (Suero, EDTA, Coagulación…)." },
  { key: "cantidad",        label: "Cantidad",              tipo: "numero", grupo: "Qué",     ayuda: "Unidades de la fila. Si no se empareja, cada fila cuenta 1." },
  { key: "prioridad",       label: "Prioridad",             tipo: "texto",  grupo: "Qué",     ayuda: "Urgente / normal (o rango de numeración urgente)." },
  { key: "idOrden",         label: "Nº de orden",           tipo: "texto",  grupo: "Qué",     ayuda: "Solo para contar órdenes distintas en tu equipo. Nunca se envía." },
  { key: "evento",          label: "Evento / incidencia",   tipo: "texto",  grupo: "Calidad", ayuda: "Reimpresión, rechazo, anulación, error de impresora…" },
]

export const CAMPOS_FECHA: CampoKey[] = ["fechaPeticion", "fechaExtraccion", "fechaRecepcion", "fechaValidacion"]

/** Orden de preferencia para decidir a qué DÍA pertenece una fila. */
export const PRIORIDAD_FECHA_REFERENCIA: CampoKey[] = ["fechaExtraccion", "fechaPeticion", "fechaRecepcion", "fechaValidacion"]

/** Mapeo: campo canónico → nombre EXACTO de la cabecera del CSV (o null). */
export type Mapeo = Partial<Record<CampoKey, string | null>>

/**
 * Alias de cabecera (se comparan normalizados: minúsculas, sin acentos ni signos).
 * Incluye nombres en español y los típicos de tablas MySQL de InLab en inglés
 * (LabOrder, Specimens...). AÑADIR AQUÍ los nombres reales cuando llegue el fichero.
 */
export const ALIAS_CABECERA: Record<CampoKey, string[]> = {
  idOrden: ["id_orden", "orden", "num_orden", "n_orden", "norden", "peticion", "id_peticion", "num_peticion", "order_id", "orderid", "laborder_id", "laborderid", "order", "request_id", "requestid", "episodio", "accession", "accession_number"],
  fechaPeticion: ["fecha_peticion", "fecha_orden", "fecha_creacion", "f_peticion", "creacion", "fecha_solicitud", "creation_date", "creationdate", "created_at", "createdat", "order_date", "orderdate", "request_date", "date_created"],
  fechaExtraccion: ["fecha_extraccion", "fecha_impresion", "f_extraccion", "extraccion", "impresion", "fecha_etiqueta", "extraction_date", "extractiondate", "collection_date", "collected_at", "print_date", "printdate", "printed_at", "dispensacion", "fecha_dispensacion", "dispense_date"],
  fechaRecepcion: ["fecha_recepcion", "f_recepcion", "recepcion", "fecha_llegada", "llegada", "reception_date", "receptiondate", "received_at", "receivedat", "arrival_date", "lab_reception"],
  fechaValidacion: ["fecha_validacion", "f_validacion", "validacion", "fecha_fin", "validation_date", "validated_at", "validatedat", "completed_at", "fecha_cierre"],
  area: ["area", "area_trabajo", "work_area", "workarea", "zona", "servicio", "unidad", "departamento", "department", "location", "ubicacion", "centro"],
  puesto: ["puesto", "puesto_trabajo", "workstation", "work_station", "station", "terminal", "box", "mostrador", "estacion", "pc", "equipo"],
  consumible: ["consumible", "tipo_tubo", "tubo", "recipiente", "tipo_recipiente", "contenedor", "specimen", "specimen_type", "specimentype", "container", "container_type", "tube", "tube_type", "etiqueta", "tipo_etiqueta", "label_type", "material", "producto"],
  cantidad: ["cantidad", "unidades", "num", "numero", "n", "qty", "quantity", "count", "total", "copias", "copies", "num_etiquetas"],
  evento: ["evento", "tipo_evento", "incidencia", "tipo_incidencia", "accion", "event", "event_type", "eventtype", "action", "status_event", "motivo", "causa", "estado_muestra", "estado"],
  prioridad: ["prioridad", "urgente", "urgencia", "es_urgente", "priority", "urgent", "is_urgent", "stat", "tipo_peticion", "circuito"],
  impresora: ["impresora", "printer", "printer_name", "nombre_impresora", "zebra", "dispositivo", "device", "etiquetadora", "bcrobo"],
}

/** Normaliza una cabecera o valor para comparar: minúsculas, sin acentos, solo [a-z0-9_]. */
export function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

/**
 * Autodetecta el emparejamiento a partir de las cabeceras.
 * 1º coincidencia exacta con un alias, 2º la cabecera contiene un alias (≥4 caracteres).
 * Una cabecera solo se asigna a un campo.
 */
export function autodetectarMapeo(cabeceras: string[]): Mapeo {
  const norm = cabeceras.map(normalizar)
  const usadas = new Set<number>()
  const mapeo: Mapeo = {}
  const asignar = (key: CampoKey, idx: number) => { mapeo[key] = cabeceras[idx]; usadas.add(idx) }

  for (const campo of CAMPOS) {
    const alias = ALIAS_CABECERA[campo.key].map(normalizar)
    const idx = norm.findIndex((h, i) => !usadas.has(i) && alias.includes(h))
    if (idx >= 0) asignar(campo.key, idx)
  }
  for (const campo of CAMPOS) {
    if (mapeo[campo.key]) continue
    const alias = ALIAS_CABECERA[campo.key].map(normalizar).filter(a => a.length >= 4)
    const idx = norm.findIndex((h, i) => !usadas.has(i) && alias.some(a => h.includes(a)))
    if (idx >= 0) asignar(campo.key, idx)
  }
  return mapeo
}

/** Aplica un mapeo guardado solo con las cabeceras que existan en este fichero. */
export function combinarMapeo(guardado: Mapeo | null | undefined, auto: Mapeo, cabeceras: string[]): Mapeo {
  if (!guardado) return auto
  const set = new Set(cabeceras)
  const out: Mapeo = { ...auto }
  for (const campo of CAMPOS) {
    const g = guardado[campo.key]
    if (g === null) out[campo.key] = null
    else if (g && set.has(g)) out[campo.key] = g
  }
  return out
}

export function validarMapeo(m: Mapeo): string | null {
  if (!CAMPOS_FECHA.some(k => m[k])) return "Empareja al menos una columna de fecha (petición, extracción, recepción o validación)."
  return null
}

// ─── Normalización de valores ────────────────────────────────────────────────

export const EVENTO_CATEGORIAS = ["REIMPRESION", "RECHAZO", "ANULACION", "ERROR_IMPRESORA", "OTRO"] as const
export type EventoCategoria = typeof EVENTO_CATEGORIAS[number]

export const EVENTO_LABEL: Record<EventoCategoria, string> = {
  REIMPRESION: "Reimpresiones",
  RECHAZO: "Tubos rechazados",
  ANULACION: "Anulaciones",
  ERROR_IMPRESORA: "Errores de impresora",
  OTRO: "Otros eventos",
}

/** Valores de la columna "evento" que significan "fila normal, sin incidencia". AJUSTAR con el fichero real. */
export const EVENTO_NEUTRO = /^(|-|0|ok|normal|n_a|na|null|none|ninguno|ninguna|sin_incidencia|impresion|impreso|printed|print|extraccion|extraido|recibido|received|validado|validated|correcto|completado|completed)$/

/** Patrones (sobre el valor normalizado) para clasificar eventos. AJUSTAR con los códigos reales. */
export const ALIAS_EVENTO: [EventoCategoria, RegExp][] = [
  ["REIMPRESION", /(reimp|re_imp|reprint|duplicad|copia)/],
  ["RECHAZO", /(rechaz|reject|hemoliz|coagulad|insuficiente|no_apta|invalida|muestra_mal)/],
  ["ANULACION", /(anul|cancel|borrad|delete|baja)/],
  ["ERROR_IMPRESORA", /(impresora|printer|zebra|bc_?robo|atasco|jam|sin_papel|paper|ribbon|cinta|error_imp|offline)/],
]

/** Devuelve la categoría del evento o null si la fila es normal. */
export function clasificarEvento(valor: string): EventoCategoria | null {
  const n = normalizar(valor)
  if (EVENTO_NEUTRO.test(n)) return null
  for (const [cat, re] of ALIAS_EVENTO) if (re.test(n)) return cat
  return "OTRO"
}

const URGENTE_EXACTO = /^(u|s|si|y|yes|1|true|stat|urg|urgente|urgent|alta|high|preferente|vital|emergencia)$/
/** ¿La prioridad indica urgente? AJUSTAR si el fichero usa otros códigos (p. ej. rango de numeración). */
export function esUrgente(valor: string): boolean {
  const n = normalizar(valor)
  if (!n) return false
  return URGENTE_EXACTO.test(n) || n.includes("urg") || n.includes("stat")
}

/** Limpia un texto de dimensión (área, puesto, consumible…) para agrupar. */
export function limpiarDimension(valor: string | undefined, vacio: string): string {
  const v = (valor ?? "").trim().replace(/\s+/g, " ")
  if (!v || v.toUpperCase() === "NULL") return vacio
  return v.slice(0, 80)
}

export const SIN_AREA = "Sin área"
export const SIN_PUESTO = "Sin puesto"
export const SIN_CONSUMIBLE = "Sin tipo"
