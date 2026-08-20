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
/** Tono aún más oscuro que ORANGE_DARK — contraste suficiente con texto blanco (botón login). */
export const ORANGE_DARKER  = "#b45309"
export const ORANGE_DARKEST = "#92400e"

/** Color por tipo de resultado en busqueda global (TopBar, CommandPalette). */
export const TIPO_RESULTADO_COLOR: Record<string, { bg: string; color: string }> = {
  accion:   { bg: "#F0F9FF", color: "#0EA5E9" },
  hospital: { bg: TEAL_LIGHT, color: TEAL },
  visita:   { bg: ORANGE_LIGHT, color: ORANGE },
  proyecto: { bg: "#EEF2FF", color: "#4F46E5" },
}

/**
 * Color por estado/prioridad de incidencia — fuente única, reusado en listas/detalle/stats.
 * Tonos de texto oscurecidos (equivalente Tailwind -700) para cumplir WCAG AA (4.5:1) sobre el bg pálido;
 * ver auditoría a11y — los tonos -500 originales daban ratios de 2.06–3.44:1.
 */
export const STATUS_COLORS = {
  estado: {
    ABIERTA:              { color: "#b91c1c", bg: "#fef2f2" },
    EN_PROGRESO:          { color: "#b45309", bg: "#fffbeb" },
    PENDIENTE_CLIENTE:    { color: "#8b5cf6", bg: "#f5f3ff" },
    PENDIENTE_PROVEEDOR:  { color: "#6366f1", bg: "#eef2ff" },
    RESUELTA:             { color: "#047857", bg: "#ecfdf5" },
    CERRADA:              { color: "#6b7280", bg: "#f3f4f6" },
  },
  prioridad: {
    CRITICA: { color: "#b91c1c", bg: "#fef2f2" },
    ALTA:    { color: "#f97316", bg: "#fff7ed" },
    MEDIA:   { color: "#b45309", bg: "#fffbeb" },
    BAJA:    { color: TEAL_DARK, bg: TEAL_LIGHT },
  },
} as const
