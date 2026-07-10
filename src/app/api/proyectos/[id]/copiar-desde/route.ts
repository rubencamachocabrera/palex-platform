import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { logActividad } from "@/lib/log-actividad"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await checkRateLimit(req, "proyecto-copiar-desde", { limit: 10, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id: proyectoId } = await params
    const body = await req.json()
    const { proyectoOrigenId } = body as { proyectoOrigenId: string }
    if (!proyectoOrigenId || typeof proyectoOrigenId !== "string") {
      return NextResponse.json({ error: "proyectoOrigenId requerido" }, { status: 400 })
    }
    if (proyectoOrigenId === proyectoId) {
      return NextResponse.json({ error: "No puedes copiar un proyecto sobre si mismo" }, { status: 400 })
    }

    const proyectoWhere: Record<string, unknown> = { id: proyectoId }
    const origenWhere: Record<string, unknown> = { id: proyectoOrigenId }
    if (session.user.role !== "ADMIN") {
      const zonaOr = [
        { responsableId: session.user.id },
        { hospital: { zona: { usuarios: { some: { usuarioId: session.user.id } } } } },
      ]
      proyectoWhere.OR = zonaOr
      origenWhere.OR = zonaOr
    }

    const [proyecto, origen] = await Promise.all([
      db.proyecto.findFirst({ where: proyectoWhere, select: { id: true, titulo: true, fechaInicio: true } }),
      db.proyecto.findFirst({ where: origenWhere, select: { id: true, titulo: true, fechaInicio: true, creadoEn: true } }),
    ])
    if (!proyecto) return NextResponse.json({ error: "Proyecto destino no encontrado o sin acceso" }, { status: 404 })
    if (!origen) return NextResponse.json({ error: "Proyecto origen no encontrado o sin acceso" }, { status: 404 })

    const [fasesOrigen, tareasOrigen, hitosOrigen, ultimaFase, ultimaTarea] = await Promise.all([
      db.faseProyecto.findMany({ where: { proyectoId: proyectoOrigenId }, orderBy: { orden: "asc" } }),
      db.tarea.findMany({ where: { proyectoId: proyectoOrigenId }, orderBy: { orden: "asc" } }),
      db.hito.findMany({ where: { proyectoId: proyectoOrigenId }, orderBy: { fecha: "asc" } }),
      db.faseProyecto.findFirst({ where: { proyectoId }, orderBy: { orden: "desc" }, select: { orden: true } }),
      db.tarea.findFirst({ where: { proyectoId, parentId: null }, orderBy: { orden: "desc" }, select: { orden: true } }),
    ])

    const ordenFaseBase = (ultimaFase?.orden ?? -1) + 1
    const ordenTareaBase = (ultimaTarea?.orden ?? -1) + 1
    const refOrigen = origen.fechaInicio ?? origen.creadoEn

    const [fases, tareasTop, hitos] = await db.$transaction(async tx => {
      const fasesCreadas = await Promise.all(
        fasesOrigen.map((f, i) =>
          tx.faseProyecto.create({
            data: { proyectoId, tipo: f.tipo, nombre: f.nombre, orden: ordenFaseBase + i },
          })
        )
      )

      const tareasTopOrigen = tareasOrigen.filter(t => !t.parentId)
      const subtareasOrigen = tareasOrigen.filter(t => t.parentId)

      const tareasTopCreadas = await Promise.all(
        tareasTopOrigen.map((t, i) =>
          tx.tarea.create({
            data: { proyectoId, titulo: t.titulo, descripcion: t.descripcion, prioridad: t.prioridad, orden: ordenTareaBase + i },
          })
        )
      )
      const idMap = new Map(tareasTopOrigen.map((t, i) => [t.id, tareasTopCreadas[i].id]))

      await Promise.all(
        subtareasOrigen
          .filter(st => idMap.has(st.parentId!))
          .map(st =>
            tx.tarea.create({
              data: {
                proyectoId, titulo: st.titulo, descripcion: st.descripcion, prioridad: st.prioridad,
                orden: st.orden, parentId: idMap.get(st.parentId!)!,
              },
            })
          )
      )

      const hitosCreados = await Promise.all(
        hitosOrigen.map(h => {
          const diasDesdeRef = Math.round((new Date(h.fecha).getTime() - new Date(refOrigen).getTime()) / 86_400_000)
          const fecha = new Date(Date.now() + diasDesdeRef * 86_400_000)
          return tx.hito.create({
            data: { proyectoId, titulo: h.titulo, descripcion: h.descripcion, fecha },
          })
        })
      )

      return [fasesCreadas, tareasTopCreadas, hitosCreados]
    })

    const totalTareas = tareasTop.length + tareasOrigen.filter(t => t.parentId).length

    await logActividad(
      session.user.id, "EDITAR", "PROYECTO", proyectoId,
      `Copiadas ${fases.length} fases, ${totalTareas} tareas y ${hitos.length} hitos desde "${origen.titulo}"`,
    ).catch(() => {})

    return NextResponse.json({ fases: fases.length, tareas: totalTareas, hitos: hitos.length })
  } catch (err) {
    console.error("[POST copiar-desde]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
