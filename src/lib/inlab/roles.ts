/** Roles con acceso a Inteligencia InLab (compartido cliente/servidor). */
export const INLAB_ROLES_VER = ["ADMIN", "VENTAS", "PROYECTOS", "TECNICO"] as const
/** Tarifas y modelo comercial: información comercial sensible. */
export const INLAB_ROLES_FACTURACION = ["ADMIN", "VENTAS"] as const

export const puedeVerFacturacionRol = (rol: string | null | undefined) =>
  !!rol && (INLAB_ROLES_FACTURACION as readonly string[]).includes(rol)
