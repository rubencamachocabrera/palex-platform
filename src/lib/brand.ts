/**
 * Brand tokens de Palex Medical.
 * Un único lugar para los colores de marca — si cambia el teal, se cambia aquí.
 * Para estilos Tailwind usar las clases teal-* / orange-* ya configuradas.
 * Para inline styles (donde Tailwind no llega) usar estas constantes.
 */

export const TEAL       = "#00A99D"
export const TEAL_LIGHT = "#E6F7F6"
export const TEAL_DARK  = "#007F75"

export const ORANGE       = "#F7941D"
export const ORANGE_LIGHT = "#FEF3E5"
export const ORANGE_DARK  = "#D97706"

/** Color por tipo de resultado en busqueda global (TopBar, CommandPalette). */
export const TIPO_RESULTADO_COLOR: Record<string, { bg: string; color: string }> = {
  accion:   { bg: "#F0F9FF", color: "#0EA5E9" },
  hospital: { bg: TEAL_LIGHT, color: TEAL },
  visita:   { bg: ORANGE_LIGHT, color: ORANGE },
  proyecto: { bg: "#EEF2FF", color: "#4F46E5" },
}
