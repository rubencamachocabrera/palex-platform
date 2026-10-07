/**
 * Lectura de CSV/TSV en streaming (navegador y Web Worker).
 * - Detección de codificación (UTF-8 estricto → si falla, Windows-1252/latin1).
 * - Detección de delimitador ( ; , \t | ) por consistencia entre líneas.
 * - Parser incremental RFC 4180: comillas, "" escapadas, saltos de línea dentro de comillas, CRLF.
 */

export type Delimitador = ";" | "," | "\t" | "|"
export type Codificacion = "utf-8" | "windows-1252"

export const DELIMITADORES: { value: Delimitador; label: string }[] = [
  { value: ";", label: "Punto y coma ( ; )" },
  { value: ",", label: "Coma ( , )" },
  { value: "\t", label: "Tabulador" },
  { value: "|", label: "Barra ( | )" },
]

export function detectarCodificacion(bytes: Uint8Array): Codificacion {
  // Recorta al último byte ASCII para no cortar un carácter multibyte a la mitad
  let end = bytes.length
  while (end > 0 && end > bytes.length - 4 && bytes[end - 1] >= 0x80) end--
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, end))
    return "utf-8"
  } catch {
    return "windows-1252"
  }
}

export function detectarDelimitador(texto: string): Delimitador {
  const lineas = texto.split(/\r?\n/).filter(l => l.trim()).slice(0, 30)
  const candidatos: Delimitador[] = [";", ",", "\t", "|"]
  let mejor: Delimitador = ";"
  let mejorScore = -1
  for (const c of candidatos) {
    const cuentas = lineas.map(l => contarFueraDeComillas(l, c))
    if (cuentas.length === 0 || cuentas[0] === 0) continue
    const iguales = cuentas.filter(n => n === cuentas[0]).length
    const score = (iguales / cuentas.length) * 1000 + cuentas[0]
    if (score > mejorScore) { mejorScore = score; mejor = c }
  }
  return mejor
}

function contarFueraDeComillas(linea: string, c: string): number {
  let n = 0, q = false
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i]
    if (ch === '"') q = !q
    else if (!q && ch === c) n++
  }
  return n
}

/**
 * Parser incremental. push(texto) puede recibir trozos arbitrarios; las filas
 * completas se entregan a onRow. end() vacía la última fila sin salto final.
 */
export class CsvStreamParser {
  private campo = ""
  private fila: string[] = []
  private enComillas = false
  private comillaPendiente = false // vimos " dentro de comillas; puede ser "" o cierre
  private crPendiente = false
  private readonly d: number

  constructor(delimitador: Delimitador, private onRow: (row: string[]) => void | boolean) {
    this.d = delimitador.charCodeAt(0)
  }

  /** Devuelve false si onRow pidió parar. */
  push(chunk: string): boolean {
    const d = this.d
    let campo = this.campo
    let start = 0
    const len = chunk.length
    for (let i = 0; i < len; i++) {
      const c = chunk.charCodeAt(i)
      if (this.crPendiente) {
        this.crPendiente = false
        if (c === 10) { start = i + 1; continue }
      }
      if (this.enComillas) {
        if (this.comillaPendiente) {
          this.comillaPendiente = false
          if (c === 34) { campo += '"'; start = i + 1; continue }
          this.enComillas = false
          start = i
          // cae al tratamiento normal del carácter actual
        } else {
          if (c === 34) {
            campo += chunk.slice(start, i)
            this.comillaPendiente = true
            start = i + 1
          }
          continue
        }
      }
      if (c === 34) {
        campo += chunk.slice(start, i)
        this.enComillas = true
        start = i + 1
      } else if (c === d) {
        this.fila.push(campo + chunk.slice(start, i))
        campo = ""
        start = i + 1
      } else if (c === 10 || c === 13) {
        this.fila.push(campo + chunk.slice(start, i))
        campo = ""
        start = i + 1
        if (c === 13) this.crPendiente = true
        const row = this.fila
        this.fila = []
        if (!(row.length === 1 && row[0] === "")) {
          if (this.onRow(row) === false) { this.campo = ""; return false }
        }
      }
    }
    if (this.enComillas && this.comillaPendiente) {
      // la comilla está al final del trozo: se resuelve con el siguiente
    } else if (start < len) {
      campo += chunk.slice(start)
    }
    this.campo = campo
    return true
  }

  end() {
    if (this.comillaPendiente) { this.comillaPendiente = false; this.enComillas = false }
    if (this.campo !== "" || this.fila.length > 0) {
      this.fila.push(this.campo)
      const row = this.fila
      this.fila = []
      this.campo = ""
      if (!(row.length === 1 && row[0] === "")) this.onRow(row)
    }
  }
}

export interface Previsualizacion {
  codificacion: Codificacion
  delimitador: Delimitador
  cabeceras: string[]
  filas: string[][]
}

/** Lee el inicio del fichero (256 KB) para detectar formato y previsualizar. */
export async function previsualizar(file: Blob, opciones?: { codificacion?: Codificacion; delimitador?: Delimitador; maxFilas?: number }): Promise<Previsualizacion> {
  const buf = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer())
  const codificacion = opciones?.codificacion ?? detectarCodificacion(buf)
  let texto = new TextDecoder(codificacion).decode(buf)
  if (texto.charCodeAt(0) === 0xfeff) texto = texto.slice(1)
  // Si el fichero es más largo que la muestra, descarta la última línea (posiblemente cortada)
  if (file.size > buf.length) {
    const corte = Math.max(texto.lastIndexOf("\n"), 0)
    texto = texto.slice(0, corte)
  }
  const delimitador = opciones?.delimitador ?? detectarDelimitador(texto)
  const max = (opciones?.maxFilas ?? 8) + 1
  const filas: string[][] = []
  const p = new CsvStreamParser(delimitador, row => { filas.push(row); return filas.length < max })
  if (p.push(texto)) p.end()
  const cabeceras = (filas.shift() ?? []).map((h, i) => h.trim() || `Columna ${i + 1}`)
  return { codificacion, delimitador, cabeceras: deduplicarCabeceras(cabeceras), filas }
}

/** Cabeceras repetidas → "nombre (2)" para que el mapeo por nombre sea inequívoco. */
export function deduplicarCabeceras(cabeceras: string[]): string[] {
  const vistos = new Map<string, number>()
  return cabeceras.map(h => {
    const n = (vistos.get(h) ?? 0) + 1
    vistos.set(h, n)
    return n === 1 ? h : `${h} (${n})`
  })
}
