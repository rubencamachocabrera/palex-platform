/**
 * Colores por entidad de InLab Analytics (el mismo color para la misma cosa en todas las vistas).
 * Secciones del laboratorio: fijos por nombre. Work areas en la pantalla «Pulso»: por posición en
 * el ranking del periodo (las 5 primeras con color propio, el resto en gris).
 */
import { TEAL, ORANGE } from "@/lib/brand"
import { GRIS, SERIE } from "./charts"

export const COLOR_SECCION: Record<string, string> = {
  "Bioquímica": TEAL,
  "Hematología": "#E11D48",
  "Hemostasia": "#7C3AED",
  "Banco de sangre": "#BE123C",
  "Orina": "#CA8A04",
  "Inmunología": "#6366F1",
  "Serología": "#0EA5E9",
  "Microbiología": "#16A34A",
  "Urgencias": ORANGE,
  "Hormonas": "#DB2777",
  "Fármacos y tóxicos": "#A16207",
  "Genética y molecular": "#0891B2",
}
export const colorSeccion = (s: string) => COLOR_SECCION[s] ?? GRIS

/** Paleta de work areas del Pulso: distinta de la de secciones para que el río se lea en dos colores. */
export const COLORES_AREA = [TEAL, ORANGE, "#6366F1", "#0EA5E9", "#D946EF"]
export const colorAreaPorPosicion = (i: number) => (i >= 0 && i < COLORES_AREA.length ? COLORES_AREA[i] : GRIS)
export { GRIS, SERIE }
