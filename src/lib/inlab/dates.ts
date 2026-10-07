/**
 * Parseo rápido de fechas de la exportación InLab, sin zonas horarias:
 * las horas se tratan como hora local del hospital y el día se toma tal cual.
 *
 * Formatos admitidos:
 *   2026-03-01 08:15:00 · 2026-03-01T08:15 · 2026/03/01 08:15
 *   01/03/2026 08:15[:00] · 01-03-2026 · 01.03.26 (DMY por defecto, MDY opcional)
 *   0000-00-00 00:00:00 (fecha nula de MySQL) → null
 */

export type OrdenFecha = "DMY" | "MDY"

export interface FechaParseada {
  /** YYYY-MM-DD */
  dia: string
  hora: number
  /** minutos desde epoch (UTC "naive"), para calcular duraciones */
  min: number
}

const RE_ISO = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T ]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
const RE_LOCAL = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/

const pad = (n: number) => (n < 10 ? "0" + n : String(n))

const dig = (s: string, i: number) => { const c = s.charCodeAt(i) - 48; return c >= 0 && c <= 9 ? c : -1 }
const DIAS_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** Ruta rápida para "YYYY-MM-DD[ T]HH:MM[:SS]" (formato habitual de MySQL), sin regex. undefined = no aplica. */
function parseIsoRapido(s: string): FechaParseada | null | undefined {
  if (s.length < 10 || s.charCodeAt(4) !== 45 || s.charCodeAt(7) !== 45) return undefined
  for (const i of [0, 1, 2, 3, 5, 6, 8, 9]) if (dig(s, i) < 0) return undefined
  const y = dig(s, 0) * 1000 + dig(s, 1) * 100 + dig(s, 2) * 10 + dig(s, 3)
  const mo = dig(s, 5) * 10 + dig(s, 6), d = dig(s, 8) * 10 + dig(s, 9)
  let h = 0, mi = 0, se = 0
  if (s.length >= 16) {
    const sep = s.charCodeAt(10)
    if ((sep !== 32 && sep !== 84) || s.charCodeAt(13) !== 58) return undefined
    h = dig(s, 11) * 10 + dig(s, 12); mi = dig(s, 14) * 10 + dig(s, 15)
    if (dig(s, 11) < 0 || dig(s, 12) < 0 || dig(s, 14) < 0 || dig(s, 15) < 0) return undefined
    if (s.length >= 19 && s.charCodeAt(16) === 58 && dig(s, 17) >= 0 && dig(s, 18) >= 0) se = dig(s, 17) * 10 + dig(s, 18)
  } else if (s.length !== 10) return undefined
  if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > DIAS_MES[mo - 1] || h > 23 || mi > 59) return null
  if (mo === 2 && d === 29 && !((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0)) return null
  return { dia: s.slice(0, 10), hora: h, min: Date.UTC(y, mo - 1, d, h, mi, se) / 60000 }
}

export function parseFecha(raw: string | undefined, orden: OrdenFecha = "DMY"): FechaParseada | null {
  if (!raw) return null
  const s = raw.trim()
  if (s.length < 6) return null
  const rapido = parseIsoRapido(s)
  if (rapido !== undefined) return rapido
  let y: number, mo: number, d: number, h = 0, mi = 0, se = 0
  let m = RE_ISO.exec(s)
  if (m) {
    y = +m[1]; mo = +m[2]; d = +m[3]
    if (m[4] !== undefined) { h = +m[4]; mi = +m[5]; se = m[6] ? +m[6] : 0 }
  } else {
    m = RE_LOCAL.exec(s)
    if (!m) return null
    const a = +m[1], b = +m[2]
    y = +m[3]
    if (y < 100) y += 2000
    // Si un componente > 12 no hay ambigüedad
    if (a > 12) { d = a; mo = b }
    else if (b > 12) { mo = a; d = b }
    else if (orden === "MDY") { mo = a; d = b }
    else { d = a; mo = b }
    if (m[4] !== undefined) { h = +m[4]; mi = +m[5]; se = m[6] ? +m[6] : 0 }
  }
  if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null
  const ms = Date.UTC(y, mo - 1, d, h, mi, se)
  // Descarta fechas imposibles (31/02 → se desplazaría de mes)
  const check = new Date(ms)
  if (check.getUTCDate() !== d) return null
  return { dia: `${y}-${pad(mo)}-${pad(d)}`, hora: h, min: ms / 60000 }
}

// ─── Utilidades de días (YYYY-MM-DD) compartidas cliente/servidor ────────────

export function diaToDate(dia: string): Date {
  return new Date(`${dia}T00:00:00.000Z`)
}

export function dateToDia(d: Date | string): string {
  return (typeof d === "string" ? d : d.toISOString()).slice(0, 10)
}

export function addDias(dia: string, n: number): string {
  const d = diaToDate(dia)
  d.setUTCDate(d.getUTCDate() + n)
  return dateToDia(d)
}

export function diffDias(desde: string, hasta: string): number {
  return Math.round((diaToDate(hasta).getTime() - diaToDate(desde).getTime()) / 86400000)
}

/** 0 = lunes … 6 = domingo */
export function diaSemana(dia: string): number {
  return (diaToDate(dia).getUTCDay() + 6) % 7
}

/** Lunes de la semana ISO del día */
export function inicioSemana(dia: string): string {
  return addDias(dia, -diaSemana(dia))
}

export function esDiaValido(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(diaToDate(s).getTime()) && dateToDia(diaToDate(s)) === s
}

/** Agrupa una lista ordenada de días en rangos contiguos. */
export function rangosContiguos(dias: string[]): { desde: string; hasta: string; n: number }[] {
  const out: { desde: string; hasta: string; n: number }[] = []
  for (const d of dias) {
    const last = out[out.length - 1]
    if (last && addDias(last.hasta, 1) === d) { last.hasta = d; last.n++ }
    else out.push({ desde: d, hasta: d, n: 1 })
  }
  return out
}
