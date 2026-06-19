import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

interface HistorialEntry { etapaAnterior: string; etapaNueva: string; fecha: string; usuario: string }

const ETAPA_LABEL: Record<string, string> = {
  IDENTIFICADO: "Identificado", PRIMERA_VISITA: "Primera visita",
  PROPUESTA: "Propuesta", NEGOCIACION: "Negociacion", GANADO: "Ganado", PERDIDO: "Perdido",
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params

    const hospital = await db.hospital.findUnique({ where: { id }, select: { id: true } })
    if (!hospital) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    const [visitas, oportunidades, proyectos, contactos] = await Promise.all([
      db.visita.findMany({ where: { hospitalId: id }, select: { id: true, estado: true, fecha: true, usuario: { select: { nombre: true } } }, orderBy: { fecha: "desc" }, take: 50 }),
      db.oportunidad.findMany({ where: { hospitalId: id }, select: { id: true, titulo: true, etapa: true, historial: true, creadoEn: true, usuario: { select: { nombre: true } } }, orderBy: { creadoEn: "desc" }, take: 20 }),
      db.proyecto.findMany({ where: { hospitalId: id }, select: { id: true, titulo: true, estado: true, creadoEn: true, fases: { select: { id: true, nombre: true, fechaReal: true } }, hitos: { select: { id: true, titulo: true, fecha: true, fechaReal: true, completado: true } }, solicitudes: { select: { id: true, titulo: true, estado: true, fechaSolicitud: true } } }, orderBy: { creadoEn: "desc" }, take: 20 }),
      db.contacto.findMany({ where: { hospitalId: id }, select: { id: true, nombre: true, cargo: true, creadoEn: true }, orderBy: { creadoEn: "desc" }, take: 20 }),
    ])

    const VL: Record<string, string> = { BORRADOR: "borrador", COMPLETADA: "completada", ARCHIVADA: "archivada" }
    const eventos: { id: string; tipo: string; titulo: string; descripcion: string; fecha: string; href?: string }[] = []

    for (const v of visitas) {
      eventos.push({ id: `visita-${v.id}`, tipo: "visita", titulo: `Visita ${VL[v.estado] ?? v.estado}`, descripcion: v.usuario.nombre, fecha: v.fecha.toISOString(), href: `/visitas/${v.id}` })
    }

    for (const op of oportunidades) {
      eventos.push({ id: `op-${op.id}`, tipo: "oportunidad", titulo: op.titulo, descripcion: `${ETAPA_LABEL[op.etapa] ?? op.etapa} · ${op.usuario.nombre}`, fecha: op.creadoEn.toISOString() })
      const hist = Array.isArray(op.historial) ? (op.historial as unknown as HistorialEntry[]) : []
      for (const h of hist) {
        eventos.push({ id: `etapa-${op.id}-${h.fecha}`, tipo: "etapa", titulo: `${ETAPA_LABEL[h.etapaAnterior] ?? h.etapaAnterior} → ${ETAPA_LABEL[h.etapaNueva] ?? h.etapaNueva}`, descripcion: `${op.titulo} · ${h.usuario}`, fecha: h.fecha })
      }
    }

    for (const pp of proyectos) {
      eventos.push({ id: `pp-${pp.id}`, tipo: "proyecto", titulo: pp.titulo, descripcion: `Proyecto ${pp.estado.toLowerCase().replace(/_/g, " ")}`, fecha: pp.creadoEn.toISOString(), href: `/proyectos/${pp.id}` })
      for (const f of pp.fases) {
        if (f.fechaReal) eventos.push({ id: `fase-${f.id}`, tipo: "fase", titulo: `Fase completada: ${f.nombre}`, descripcion: pp.titulo, fecha: f.fechaReal.toISOString(), href: `/proyectos/${pp.id}` })
      }
      for (const h of pp.hitos) {
        if (h.completado) eventos.push({ id: `hito-${h.id}`, tipo: "hito", titulo: h.titulo, descripcion: `Hito completado · ${pp.titulo}`, fecha: (h.fechaReal ?? h.fecha).toISOString(), href: `/proyectos/${pp.id}` })
      }
      for (const s of pp.solicitudes) {
        if (s.estado === "ENTREGADA" || s.estado === "ENVIADA") eventos.push({ id: `mat-${s.id}`, tipo: "material", titulo: s.titulo, descripcion: `Material ${s.estado.toLowerCase()} · ${pp.titulo}`, fecha: s.fechaSolicitud.toISOString(), href: `/proyectos/${pp.id}` })
      }
    }

    for (const c of contactos) {
      eventos.push({ id: `contacto-${c.id}`, tipo: "contacto", titulo: c.nombre, descripcion: c.cargo ? `Contacto · ${c.cargo}` : "Contacto añadido", fecha: c.creadoEn.toISOString() })
    }

    eventos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    const res = NextResponse.json(eventos.slice(0, 100))
    res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60")
    return res
  } catch (err) {
    console.error("[GET /api/hospitales/[id]/timeline]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
