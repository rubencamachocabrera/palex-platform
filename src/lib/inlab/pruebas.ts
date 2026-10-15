/**
 * Pruebas de laboratorio pedidas en cada petición (dbo.LabOrder_Tests de InLab).
 *
 * Se ejecuta en el navegador (Web Worker) durante la carga: no importar nada de servidor.
 *
 * Qué se cuenta: «peticiones que incluyen la prueba». Cada prueba cuenta UNA vez por
 * petición (en InLab una misma prueba puede aparecer repetida en el pedido: en Gómez Ulla,
 * 93.924 filas duplicadas), en el día, área y prioridad de la petición (los mismos que
 * «Peticiones»: el día de su primer tubo).
 *
 * Perfiles: InLab guarda cada parámetro por separado (un hemograma son ~20 filas: leucocitos,
 * hemoglobina, VCM…). Sin agrupar, copan el ranking y tapan las pruebas que interesan, así
 * que los parámetros de un mismo perfil se cuentan como una sola prueba («Hemograma»). La
 * regla va por NOMBRE (cada hospital tiene sus propios códigos) — ver PERFILES.
 *
 * Relación con el catálogo (verificada en Gómez Ulla): LabOrder_Tests.CodeTest =
 * Cfg_Lab_Tests.CodeAliasTest (¡no CodeTest!: por CodeTest solo casa el 54 % y los nombres
 * salen cambiados, la Urea aparece como «NRBC%»). La sección sale de
 * Cfg_Lab_TestsTubes.InfoExtraPrint (texto de la etiqueta del tubo) por Cfg_Lab_Tests.CodeTest.
 * La columna TestResult (resultados clínicos) no se lee nunca.
 */

/** Quita acentos, pasa a minúsculas y deja un solo espacio. */
export function normalizarPrueba(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\s.]+$/g, "") // "RDW-CV." / "Leucocitos ." → sin punto final
    .trim()
}

export interface PerfilDef {
  nombre: string
  /** Sección con la que se muestra el perfil */
  seccion: string
  /** Se compara con el nombre normalizado (normalizarPrueba) */
  re: RegExp
}

/**
 * Parámetros que se agrupan en un perfil. Orden = prioridad. Las pruebas que el médico pide
 * sueltas (colesterol, glucosa, hierro, ferritina…) NO se agrupan nunca.
 */
export const PERFILES: PerfilDef[] = [
  {
    nombre: "Hemograma",
    seccion: "Hematología",
    // Incluye la fórmula leucocitaria (absolutos y %). «Hemoglobina glicosilada» no casa (^…$).
    re: /^(leucocitos|hematies|hemoglobina|hematocrito|vcm|hcm|chcm|rdw-? ?(cv|sd)|plaquetas|vpm|pdw|neutrofilos|linfocitos|monocitos|eosinofilos|basofilos|nrbc) ?%?$/,
  },
  {
    nombre: "Estudio de coagulación",
    seccion: "Hemostasia",
    re: /^(tiempo de protrombina\b.*|tiempo de (tromboplastina|cefalina)\b.*|ttpa\b.*|inr|fibrinogeno)$/,
  },
  {
    nombre: "Sistemático de orina",
    seccion: "Orina",
    re: /^(perfil sistematico orina|sistematico de orina|cuerpos cetonicos|densidad|glucosa sistematico|proteinas orina|urobilinogeno|sangre uri|leucocitos uri|nitritos|bilirrubina orina|ph uri)$/,
  },
  {
    nombre: "Proteinograma",
    seccion: "Bioquímica",
    re: /^(alfa ?1 ?%|alfa ?2 ?%|beta ?1 ?%|beta ?2 ?%|gamma ?%|eef suero|proteinograma)$/,
  },
]

/** Secciones (normalizadas) que no son pruebas: códigos de error y marcas de visita. */
const SECCIONES_EXCLUIDAS = new Set(["error", "visita"])
const NOMBRES_EXCLUIDOS = /^(error indeterminado|visita)$/

/** Sección legible a partir del texto de la etiqueta del tubo («Bioquimica 60» → Bioquímica). */
const SECCIONES: [RegExp, string][] = [
  [/^bioq/, "Bioquímica"],
  [/^hemat/, "Hematología"],
  [/^(banco|hemoterap)/, "Banco de sangre"],
  [/^(coagul|hemost)/, "Hemostasia"],
  [/^(sistematico|orina)/, "Orina"],
  [/^(inmuno|alerg|autoinm)/, "Inmunología"],
  [/^serolog/, "Serología"],
  [/^(micro|hemocult|cultivo|parasit)/, "Microbiología"],
  [/^(urgenc|gaso)/, "Urgencias"],
  [/^(hormon|endocr)/, "Hormonas"],
  [/^(drogas|toxic|farmac)/, "Fármacos y tóxicos"],
  [/^(genet|molecul|pcr )/, "Genética y molecular"],
]
export const SIN_SECCION = "Otras"

export function seccionLegible(raw: string): string {
  const n = normalizarPrueba(raw)
  if (!n) return SIN_SECCION
  for (const [re, nombre] of SECCIONES) if (re.test(n)) return nombre
  return SIN_SECCION
}

export interface PruebaClasificada {
  /** Nombre con el que se cuenta: el del perfil o el de la prueba */
  prueba: string
  seccion: string
  /** Perfil al que pertenece (null = prueba suelta) */
  perfil: string | null
  /** Nombre original (para contar los parámetros distintos de cada perfil) */
  original: string
}

/** Clasifica una prueba del catálogo. null = no es una prueba (error, visita) o no tiene nombre. */
export function clasificarPrueba(nombre: string, seccionRaw: string): PruebaClasificada | null {
  const original = nombre.trim().replace(/\s+/g, " ").slice(0, 80)
  const n = normalizarPrueba(original)
  if (!n || NOMBRES_EXCLUIDOS.test(n) || SECCIONES_EXCLUIDAS.has(normalizarPrueba(seccionRaw))) return null
  for (const p of PERFILES) if (p.re.test(n)) return { prueba: p.nombre, seccion: p.seccion, perfil: p.nombre, original }
  return { prueba: original.replace(/[\s.]+$/, ""), seccion: seccionLegible(seccionRaw), perfil: null, original }
}

/**
 * Columna «Pruebas» del formato plano (una celda por petición, en su primer tubo):
 * "Sección~Nombre|Sección~Nombre|…". Sin «~», la parte es el nombre (sección desconocida).
 */
export function parsearCeldaPruebas(celda: string): { nombre: string; seccion: string }[] {
  const out: { nombre: string; seccion: string }[] = []
  for (const parte of celda.split("|")) {
    const p = parte.trim()
    if (!p) continue
    const i = p.indexOf("~")
    out.push(i >= 0 ? { seccion: p.slice(0, i).trim(), nombre: p.slice(i + 1).trim() } : { seccion: "", nombre: p })
  }
  return out
}
