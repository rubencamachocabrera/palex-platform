import { db } from "@/lib/db"

export async function logActividad(
  usuarioId: string,
  accion: string,
  entidad: string,
  entidadId?: string | null,
  detalle?: string | null,
) {
  try {
    await db.logActividad.create({
      data: { usuarioId, accion, entidad, entidadId, detalle },
    })
  } catch (e) {
    console.warn("[logActividad]", e)
  }
}
