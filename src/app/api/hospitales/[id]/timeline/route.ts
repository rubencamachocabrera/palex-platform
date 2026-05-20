import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params

    const [visitas, oportunidades, proyectos, preProyectos] = await Promise.all([
      db.visita.findMany({
        where: { hospitalId: id },
        select: { id: true, fecha: true, estado: true, tipo: true, usuario: { select: { nombre: true } } },
        orderBy: { fecha: "desc" },
      }),
      db.oportunidad.findMany({
        where: { hospitalId: id },
        select: { id: true, titulo: true, etapa: true, creadoEn: true, editadoEn: true, historial: true, usuario: { select: { nombre: true } } },
        orderBy: { creadoEn: "desc" },
      }),
      db.proyecto.findMany({
        where: { hospitalId: id },
        select: { id: true, nombre: true, creadoEn: true, fechaInicio: true },
        orderBy: { creadoEn: "desc" },
      }),
      db.preProyecto.findMany({
        where: { hospitalId: id },
        select: {
          id: true, titulo: true, estado: true, creadoEn: true,
          responsable: { select: { nombre: true } },
          fases: {
            where: { estado: { in: ["COMPLETADO", "BLOQUEADO"] } },
            select: { id: true, nombre: true, estado: true, fechaReal: true, editadoEn: true },
          },
          hitos: {
            where: { completado: true },
            select: { id: true, titulo: true, fechaReal: true, fecha: true },
          },
          solicitudes: {
            where: { estado: "ENTREGADA" },
            select: { id: true, titulo: true, fechaEntregaReal: true, fechaSolicitud: true },
          },
        },
        orderBy: { creadoEn: "desc" },
      }),
    ])

    type Evento = {
      id: string; tipo: string; titulo: string
      descripcion: string; fecha: string; href?: string
    }
    const eventos: Evento[] = []

    for (const v of visitas) {
      eventos.push({
        id: `v-${v.id}`, tipo: "visita",
        titulo: `Visita ${v.tipo === "VENTAS" ? "comercial" : "técnica"}`,
        descripcion: `Estado: ${v.estado} · ${v.usuario.nombre}`,
        fecha: v.fecha.toISOString(), href: `/visitas/${v.id}`,
      })
    }

    for (const o of oportunidades) {
      eventos.push({
        id: `o-${o.id}`, tipo: "oportunidad",
        titulo: o.titulo,
        descripcion: `Etapa: ${o.etapa} · ${o.usuario.nombre}`,
        fecha: o.creadoEn.toISOString(), href: `/ventas/pipeline`,
      })
      // Añadir entradas del historial de etapas
      const hist = Array.isArray(o.historial) ? o.historial as { etapaNueva: string; fecha: string; usuario: string }[] : []
      for (const h of hist) {
        eventos.push({
          id: `oh-${o.id}-${h.fecha}`, tipo: "etapa",
          titulo: `Oportunidad: ${o.titulo}`,
          descripcion: `Cambio a etapa ${h.etapaNueva} · ${h.usuario}`,
          fecha: h.fecha,
        })
      }
    }

    for (const p of proyectos) {
      eventos.push({
        id: `p-${p.id}`, tipo: "proyecto",
        titulo: `Proyecto: ${p.nombre}`,
        descripcion: `Inicio: ${new Date(p.fechaInicio).toLocaleDateString("es-ES")}`,
        fecha: p.creadoEn.toISOString(), href: `/proyectos/${p.id}`,
      })
    }

    const ESTADO_PP: Record<string, string> = {
      NUEVO: "Nuevo", EN_CURSO: "En curso", PAUSADO: "Pausado", COMPLETADO: "Completado", CANCELADO: "Cancelado",
    }
    for (const pp of preProyectos) {
      eventos.push({
        id: `pp-${pp.id}`, tipo: "preproyecto",
        titulo: pp.titulo,
        descripcion: `Pre-proyecto · ${ESTADO_PP[pp.estado] ?? pp.estado}${pp.responsable ? ` · ${pp.responsable.nombre}` : ""}`,
        fecha: pp.creadoEn.toISOString(), href: `/pre-proyectos/${pp.id}`,
      })
      for (const fase of pp.fases) {
        eventos.push({
          id: `f-${fase.id}`, tipo: "fase",
          titulo: fase.nombre,
          descripcion: `${fase.estado === "COMPLETADO" ? "Fase completada" : "Fase bloqueada"} · ${pp.titulo}`,
          fecha: (fase.fechaReal ?? fase.editadoEn).toISOString(),
          href: `/pre-proyectos/${pp.id}`,
        })
      }
      for (const hito of pp.hitos) {
        eventos.push({
          id: `h-${hito.id}`, tipo: "hito",
          titulo: hito.titulo,
          descripcion: `Hito completado · ${pp.titulo}`,
          fecha: (hito.fechaReal ?? hito.fecha).toISOString(),
          href: `/pre-proyectos/${pp.id}`,
        })
      }
      for (const sol of pp.solicitudes) {
        eventos.push({
          id: `m-${sol.id}`, tipo: "material",
          titulo: sol.titulo,
          descripcion: `Material entregado · ${pp.titulo}`,
          fecha: (sol.fechaEntregaReal ?? sol.fechaSolicitud).toISOString(),
          href: `/pre-proyectos/${pp.id}`,
        })
      }
    }

    eventos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

    const res = NextResponse.json(eventos)
    res.headers.set("Cache-Control", "private, max-age=30")
    return res
  } catch (err) {
    console.error("[GET /api/hospitales/[id]/timeline]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
