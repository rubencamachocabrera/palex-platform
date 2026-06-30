import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { logActividad } from "@/lib/log-actividad"
import { PLANTILLAS_PROYECTO } from "@/lib/project-templates"
import type { TipoFase } from "@prisma/client"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = checkRateLimit(req, "plantilla-proyecto", { limit: 10, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id: proyectoId } = await params
    const body = await req.json()
    const { plantillaId } = body as { plantillaId: string }

    const plantilla = PLANTILLAS_PROYECTO.find(p => p.id === plantillaId)
    if (!plantilla) return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 })

    const proyectoWhere: Record<string, unknown> = { id: proyectoId }
    if (session.user.role !== "ADMIN") {
      proyectoWhere.OR = [
        { responsableId: session.user.id },
        { hospital: { zona: { usuarios: { some: { usuarioId: session.user.id } } } } },
      ]
    }
    const proyecto = await db.proyecto.findFirst({ where: proyectoWhere, select: { id: true, titulo: true } })
    if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado o sin acceso" }, { status: 404 })

    const [fases, tareas, hitos] = await Promise.all([
      Promise.all(
        plantilla.fases.map(f =>
          db.faseProyecto.create({
            data: { proyectoId, tipo: f.tipo as TipoFase, nombre: f.nombre, orden: f.orden },
          })
        )
      ),
      Promise.all(
        plantilla.tareas.map(t =>
          db.tarea.create({
            data: { proyectoId, titulo: t.titulo, orden: t.orden },
          })
        )
      ),
      Promise.all(
        plantilla.hitos.map(h => {
          const fecha = new Date(Date.now() + h.diasDesdeHoy * 86_400_000)
          return db.hito.create({
            data: { proyectoId, titulo: h.titulo, fecha },
          })
        })
      ),
    ])

    await logActividad(
      session.user.id, "EDITAR", "PROYECTO", proyectoId,
      `Plantilla "${plantilla.nombre}" aplicada — ${fases.length} fases, ${tareas.length} tareas, ${hitos.length} hitos`,
    ).catch(() => {})

    return NextResponse.json({ fases: fases.length, tareas: tareas.length, hitos: hitos.length })
  } catch (err) {
    console.error("[POST aplicar-plantilla]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
