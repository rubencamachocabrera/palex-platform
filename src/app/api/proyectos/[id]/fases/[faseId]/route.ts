import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; faseId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id: proyectoId, faseId } = await params
  try {
    const proyecto = await db.proyecto.findUnique({ where: { id: proyectoId }, select: { responsableId: true, estado: true } })
    if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session.user.role !== "ADMIN" && proyecto.responsableId !== session.user.id)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if ("estado" in body) data.estado = body.estado
    if ("nombre" in body) data.nombre = body.nombre
    if ("notas" in body) data.notas = body.notas
    if ("responsableId" in body) data.responsableId = body.responsableId || null
    if ("fechaPlan" in body) data.fechaPlan = body.fechaPlan ? new Date(body.fechaPlan) : null
    if ("fechaReal" in body) data.fechaReal = body.fechaReal ? new Date(body.fechaReal) : null
    const updated = await db.faseProyecto.update({ where: { id: faseId }, data })

    // Auto-transición de estado del proyecto según progreso de fases
    if (data.estado === "EN_PROGRESO" || data.estado === "COMPLETADO") {
      if (proyecto.estado === "NUEVO") {
        await db.proyecto.update({ where: { id: proyectoId }, data: { estado: "EN_CURSO" } })
      }
      // EN_CURSO → COMPLETADO cuando todas las fases estén completadas
      if (
        data.estado === "COMPLETADO" &&
        proyecto &&
        !["PAUSADO", "CANCELADO", "COMPLETADO"].includes(proyecto.estado)
      ) {
        const sinCompletar = await db.faseProyecto.count({
          where: { proyectoId: proyectoId, estado: { not: "COMPLETADO" } },
        })
        if (sinCompletar === 0) {
          await db.proyecto.update({ where: { id: proyectoId }, data: { estado: "COMPLETADO" } })
        }
      }
    }

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
