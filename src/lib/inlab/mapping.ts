/**
 * Inteligencia InLab — módulo de ADAPTACIÓN a la exportación real.
 *
 * InLab corre sobre SQL Server (tablas dbo.*). Se admiten dos formatos:
 *   A) CSV plano generado con la consulta de docs/inlab/exportacion-inlab.sql
 *      (una fila por tubo/etiqueta, cabeceras = CABECERAS_PLANAS). Se autodetecta.
 *   B) Exportación completa de la BD (un CSV por tabla, dbo.*.csv): sqlserver.ts
 *      la cruza en el navegador y produce exactamente las filas del formato A.
 * Cualquier otro CSV se puede emparejar a mano en el asistente.
 *
 * Semántica del flujo InLab (Gómez Ulla, verificado con la BD real):
 *   llegada del paciente (ticket) → numeración/impresión de etiquetas → validación
 *   de la extracción. Prioridad 1 = normal, 2 = urgente. Tubo State -1 = anulado.
 *
 * Este fichero se ejecuta en el navegador (y en el Web Worker): no importar nada de servidor.
 */

export type CampoKey =
  | "idOrden"
  | "fechaPeticion"
  | "fechaLlegada"
  | "fechaNumeracion"
  | "fechaValidacion"
  | "fechaImpresion"
  | "fechaValidacionTubo"
  | "area"
  | "puesto"
  | "impresora"
  | "consumible"
  | "cantidad"
  | "prioridad"
  | "impresiones"
  | "estadoTubo"
  | "incidenciaPedido"
  | "incidenciaTubo"
  | "evento"

export type CampoTipo = "texto" | "fecha" | "numero"

export interface CampoDef {
  key: CampoKey
  label: string
  tipo: CampoTipo
  ayuda: string
  grupo: "Hitos" | "Dónde" | "Qué" | "Calidad"
  /** true si el valor es del PEDIDO (se repite en cada tubo): se cuenta una vez por pedido */
  nivelPedido?: boolean
}

export const CAMPOS: CampoDef[] = [
  { key: "fechaLlegada",        label: "Llegada del paciente",   tipo: "fecha",  grupo: "Hitos", nivelPedido: true, ayuda: "Hora de llegada / ticket en sala de espera (DateTimePatientArrived)." },
  { key: "fechaNumeracion",     label: "Numeración del pedido",  tipo: "fecha",  grupo: "Hitos", nivelPedido: true, ayuda: "Hora en que se numera el pedido e imprimen etiquetas (DateLabOrderNumber)." },
  { key: "fechaValidacion",     label: "Validación del pedido",  tipo: "fecha",  grupo: "Hitos", nivelPedido: true, ayuda: "Hora de validación de la extracción (DateTimeValidated)." },
  { key: "fechaImpresion",      label: "Impresión del tubo",     tipo: "fecha",  grupo: "Hitos", ayuda: "Hora de impresión de cada tubo/etiqueta. Define el día de la fila." },
  { key: "fechaValidacionTubo", label: "Validación del tubo",    tipo: "fecha",  grupo: "Hitos", ayuda: "Hora de validación de cada tubo (opcional)." },
  { key: "fechaPeticion",       label: "Entrada de la petición", tipo: "fecha",  grupo: "Hitos", nivelPedido: true, ayuda: "Hora de recepción de la orden (HL7). Solo se usa si faltan las demás fechas." },
  { key: "area",                label: "Área de trabajo",        tipo: "texto",  grupo: "Dónde", ayuda: "Extracciones, Urgencias, Plantas…" },
  { key: "puesto",              label: "Puesto",                 tipo: "texto",  grupo: "Dónde", ayuda: "Mostrador o box (MO-01, BOX-3…)." },
  { key: "impresora",           label: "Impresora",              tipo: "texto",  grupo: "Dónde", ayuda: "Zebra o BC Robo asociada al puesto." },
  { key: "consumible",          label: "Consumible / tubo",      tipo: "texto",  grupo: "Qué",   ayuda: "Tipo de tubo o etiqueta (ROJO SUERO, MALVA EDTA, ETIQUETAS…)." },
  { key: "cantidad",            label: "Cantidad",               tipo: "numero", grupo: "Qué",   ayuda: "Unidades de la fila. Si no se empareja, cada fila es 1 tubo." },
  { key: "prioridad",           label: "Prioridad",              tipo: "texto",  grupo: "Qué",   ayuda: "InLab: 1 = normal, 2 = urgente (también admite texto Urgente/Normal)." },
  { key: "idOrden",             label: "Nº de pedido",           tipo: "texto",  grupo: "Qué",   ayuda: "Identificador interno del pedido: cuenta pedidos y evita contar tiempos por tubo. Nunca se envía." },
  { key: "impresiones",         label: "Nº de impresiones",      tipo: "numero", grupo: "Calidad", ayuda: "Veces que se imprimió el tubo (NumPrinted). Más de 1 = reimpresión." },
  { key: "estadoTubo",          label: "Estado del tubo",        tipo: "texto",  grupo: "Calidad", ayuda: "InLab: 5 = válido, -1 = anulado." },
  { key: "incidenciaTubo",      label: "Incidencia del tubo",    tipo: "texto",  grupo: "Calidad", ayuda: "Código de incidencia en el tubo (Cfg_Lab_Incidences)." },
  { key: "incidenciaPedido",    label: "Incidencia del pedido",  tipo: "texto",  grupo: "Calidad", nivelPedido: true, ayuda: "Código de incidencia de extracción del pedido (no acude, no ayunas…)." },
  { key: "evento",              label: "Otro evento",            tipo: "texto",  grupo: "Calidad", ayuda: "Columna genérica de eventos (reimpresión, rechazo, error de impresora…)." },
]

export const CAMPOS_FECHA: CampoKey[] = ["fechaLlegada", "fechaNumeracion", "fechaValidacion", "fechaImpresion", "fechaValidacionTubo", "fechaPeticion"]

/** Orden de preferencia para decidir a qué DÍA pertenece una fila (tubo). */
export const PRIORIDAD_FECHA_REFERENCIA: CampoKey[] = ["fechaImpresion", "fechaNumeracion", "fechaLlegada", "fechaPeticion", "fechaValidacionTubo", "fechaValidacion"]

/** Mapeo: campo canónico → nombre EXACTO de la cabecera del CSV (o null). */
export type Mapeo = Partial<Record<CampoKey, string | null>>

/**
 * Cabeceras del formato plano A (consulta docs/inlab/exportacion-inlab.sql) y de las
 * filas que genera sqlserver.ts a partir de la exportación completa (formato B).
 */
export const CABECERAS_PLANAS = [
  "TuboId", "PedidoId", "Area", "Puesto", "Impresora", "Consumible", "Seccion", "Prioridad",
  "UnidadReceptora", "EstadoPedido", "EstadoTubo", "Impresiones", "IncidenciaPedido", "IncidenciaTubo",
  "FechaPeticion", "FechaLlegada", "FechaNumeracion", "FechaImpresion", "FechaValidacionTubo", "FechaValidacionPedido",
  "NumPruebasPedido",
] as const

/** Emparejamiento fijo del formato plano. */
export const MAPEO_PLANO: Mapeo = {
  idOrden: "PedidoId",
  fechaPeticion: "FechaPeticion",
  fechaLlegada: "FechaLlegada",
  fechaNumeracion: "FechaNumeracion",
  fechaValidacion: "FechaValidacionPedido",
  fechaImpresion: "FechaImpresion",
  fechaValidacionTubo: "FechaValidacionTubo",
  area: "Area",
  puesto: "Puesto",
  impresora: "Impresora",
  consumible: "Consumible",
  cantidad: null,
  prioridad: "Prioridad",
  impresiones: "Impresiones",
  estadoTubo: "EstadoTubo",
  incidenciaPedido: "IncidenciaPedido",
  incidenciaTubo: "IncidenciaTubo",
  evento: null,
}

/** ¿Las cabeceras son las del formato plano? (todas las imprescindibles presentes) */
export function esFormatoPlano(cabeceras: string[]): boolean {
  const set = new Set(cabeceras.map(normalizar))
  return ["pedidoid", "consumible", "fechaimpresion", "prioridad"].every(c => set.has(c))
}

/**
 * Alias de cabecera (se comparan normalizados: minúsculas, sin acentos ni signos;
 * ojo: "FechaPeticion" se normaliza a "fechapeticion"). Incluye las columnas de las
 * tablas dbo.* de InLab por si se exporta una vista propia con esos nombres.
 */
export const ALIAS_CABECERA: Record<CampoKey, string[]> = {
  idOrden: ["pedidoid", "pedido_id", "id_pedido", "laborderid", "laborder_id", "id_orden", "orden", "num_orden", "order_id", "orderid", "peticion", "id_peticion"],
  fechaPeticion: ["fechapeticion", "fecha_peticion", "orderdate", "order_date", "orderdatecreated", "fecha_orden", "fecha_solicitud", "creation_date", "created_at"],
  fechaLlegada: ["fechallegada", "fecha_llegada", "datetimepatientarrived", "patient_arrived", "llegada", "llegada_paciente", "hora_llegada", "arrival_date"],
  fechaNumeracion: ["fechanumeracion", "fecha_numeracion", "datelabordernumber", "numeracion", "fecha_dispensacion", "datetimedispensated", "dispensacion"],
  fechaValidacion: ["fechavalidacionpedido", "fecha_validacion_pedido", "fechavalidacion", "fecha_validacion", "datetimevalidated", "validacion", "validated_at"],
  fechaImpresion: ["fechaimpresion", "fecha_impresion", "fecha_tubo", "datetimecreated", "impresion", "print_date", "printed_at", "fecha_etiqueta", "fecha_extraccion"],
  fechaValidacionTubo: ["fechavalidaciontubo", "fecha_validacion_tubo", "validacion_tubo", "specimen_validated"],
  area: ["area", "area_trabajo", "workarea", "work_area", "centerworkarea", "zona", "servicio"],
  puesto: ["puesto", "puesto_trabajo", "workstation", "work_station", "aliasnamepc", "box", "mostrador", "terminal"],
  impresora: ["impresora", "printer", "printer_name", "nombre_impresora", "etiquetadora"],
  consumible: ["consumible", "tipo_tubo", "tubo", "specimencode", "specimen", "specimen_type", "tube", "tube_type", "contenedor", "recipiente", "etiqueta"],
  cantidad: ["cantidad", "unidades", "qty", "quantity", "num_etiquetas"],
  prioridad: ["prioridad", "priority", "urgente", "urgencia", "es_urgente", "urgent", "stat"],
  impresiones: ["impresiones", "numprinted", "num_printed", "num_impresiones", "veces_impreso", "copias"],
  estadoTubo: ["estadotubo", "estado_tubo", "specimen_state", "estado_muestra"],
  incidenciaPedido: ["incidenciapedido", "incidencia_pedido", "order_incidence"],
  incidenciaTubo: ["incidenciatubo", "incidencia_tubo", "incidencia", "codeincidence", "incidence"],
  evento: ["evento", "tipo_evento", "event", "event_type", "accion", "motivo"],
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
 * Autodetecta el emparejamiento a partir de las cabeceras. El formato plano se
 * reconoce entero; si no, 1º coincidencia exacta con un alias, 2º la cabecera
 * contiene un alias (≥5 caracteres). Una cabecera solo se asigna a un campo.
 */
export function autodetectarMapeo(cabeceras: string[]): Mapeo {
  if (esFormatoPlano(cabeceras)) {
    const porNorm = new Map(cabeceras.map(c => [normalizar(c), c]))
    const out: Mapeo = {}
    for (const [k, v] of Object.entries(MAPEO_PLANO) as [CampoKey, string | null][]) out[k] = v ? porNorm.get(normalizar(v)) ?? null : null
    return out
  }
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
    const alias = ALIAS_CABECERA[campo.key].map(normalizar).filter(a => a.length >= 5)
    const idx = norm.findIndex((h, i) => !usadas.has(i) && alias.some(a => h.includes(a)))
    if (idx >= 0) asignar(campo.key, idx)
  }
  return mapeo
}

/** Aplica un mapeo guardado solo con las cabeceras que existan en este fichero. */
export function combinarMapeo(guardado: Mapeo | null | undefined, auto: Mapeo, cabeceras: string[]): Mapeo {
  if (!guardado || esFormatoPlano(cabeceras)) return auto
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
  if (!CAMPOS_FECHA.some(k => m[k])) return "Empareja al menos una columna de fecha (impresión, numeración, llegada o validación)."
  return null
}

// ─── Normalización de valores ────────────────────────────────────────────────

/** Categorías de evento. Añadir SIEMPRE al final: el índice viaja en el payload. */
export const EVENTO_CATEGORIAS = ["REIMPRESION", "RECHAZO", "ANULACION", "ERROR_IMPRESORA", "OTRO", "INCIDENCIA"] as const
export type EventoCategoria = typeof EVENTO_CATEGORIAS[number]

export const EVENTO_LABEL: Record<EventoCategoria, string> = {
  REIMPRESION: "Reimpresiones",
  RECHAZO: "Tubos rechazados",
  ANULACION: "Tubos anulados",
  ERROR_IMPRESORA: "Errores de impresora",
  OTRO: "Otros eventos",
  INCIDENCIA: "Incidencias de extracción",
}

/** Valores de la columna genérica "evento" que significan "fila normal, sin incidencia". */
export const EVENTO_NEUTRO = /^(|-|0|5|ok|normal|n_a|na|null|none|ninguno|ninguna|sin_incidencia|impresion|impreso|printed|print|extraccion|extraido|recibido|received|validado|validated|correcto|completado|completed)$/

/** Patrones (sobre el valor normalizado) para clasificar eventos genéricos. */
export const ALIAS_EVENTO: [EventoCategoria, RegExp][] = [
  ["REIMPRESION", /(reimp|re_imp|reprint|duplicad|copia)/],
  ["RECHAZO", /(rechaz|reject|hemoliz|coagulad|insuficiente|no_apta|invalida|muestra_mal)/],
  ["ANULACION", /(anul|cancel|borrad|delete|baja)/],
  ["ERROR_IMPRESORA", /(impresora|printer|zebra|bc_?robo|atasco|jam|sin_papel|paper|ribbon|cinta|error_imp|offline)/],
]

/** Devuelve la categoría del evento genérico o null si la fila es normal. */
export function clasificarEvento(valor: string): EventoCategoria | null {
  const n = normalizar(valor)
  if (EVENTO_NEUTRO.test(n)) return null
  for (const [cat, re] of ALIAS_EVENTO) if (re.test(n)) return cat
  return "OTRO"
}

/** InLab: estado del tubo -1 = anulado (también texto "anulado"/"cancelado"). */
export function esAnulado(valor: string): boolean {
  const v = valor.trim()
  if (v === "-1") return true
  return /(anul|cancel)/.test(normalizar(v))
}

/** Código de incidencia válido (vacío, NULL o 0 = sin incidencia). */
export function esIncidencia(valor: string): boolean {
  const v = valor.trim()
  return v !== "" && v !== "0" && v.toUpperCase() !== "NULL"
}

const URGENTE_TEXTO = /^(u|s|si|y|yes|true|stat|urg|urgente|urgent|alta|high|preferente|vital|emergencia)$/
/** ¿La prioridad indica urgente? InLab usa Priority 1 = normal, 2 = urgente. */
export function esUrgente(valor: string): boolean {
  const n = normalizar(valor)
  if (!n) return false
  if (n === "2") return true
  if (/^\d+$/.test(n)) return false
  return URGENTE_TEXTO.test(n) || n.includes("urg") || n.includes("stat")
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
