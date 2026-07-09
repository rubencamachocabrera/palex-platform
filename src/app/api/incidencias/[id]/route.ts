import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { logActividad } from "@/lib/log-actividad"
import { parseBody, IncidenciaPatch } from "@/lib/schemas"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = checkRateLimit(req, "incidencias-detail", { limit: 60, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params

    const where: Record<string, unknown> = { id }
    if (session.user.role !== "ADMIN") {
      where.hospital = { zona: { usuarios: { some: { usuarioId: session.user.id } } } }
    }

    const incidencia = await db.incidencia.findFirst({
      where,
      include: {
        hospital: { select: { id: true, nombre: true, ciudad: true, provincia: true } },
        // coasignadosIds is a JSON field, returned automatically
        contacto: { select: { id: true, nombre: true, cargo: true, email: true, telefono: true } },
        reportadoPor: { select: { id: true, nombre: true } },
        asignadoA: { select: { id: true, nombre: true } },
        hardwareUnidad: {
          select: {
            id: true, numSerie: true, estado: true,
            catalogo: { select: { id: true, marca: true, modelo: true, referenciaPalex: true } },
          },
        },
        eventos: {
          select: {
            id: true, tipo: true, descripcion: true, duracion: true,
            privado: true, metadatos: true, fotos: true, creadoEn: true,
            editadoPor: true, editadoEn: true, realizadoPorNombres: true,
            autor: { select: { id: true, nombre: true } },
          },
          orderBy: { creadoEn: "desc" },
        },
      },
    })

    if (!incidencia) return NextResponse.json({ error: "Incidencia no encontrada" }, { status: 404 })

    if (session.user.role !== "ADMIN") {
      incidencia.eventos = incidencia.eventos.filter(e => !e.privado || e.autor.id === session.user.id)
    }

    return NextResponse.json(incidencia)
  } catch (err) {
    console.error("[GET /api/incidencias/[id]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = checkRateLimit(req, "incidencias-patch", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const parsed = parseBody(IncidenciaPatch, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const where: Record<string, unknown> = { id }
    if (session.user.role !== "ADMIN") {
      where.hospital = { zona: { usuarios: { some: { usuarioId: session.user.id } } } }
    }

    const txResult = await db.$transaction(async tx => {
      const existing = await tx.incidencia.findFirst({
        where,
        select: { id: true, estado: true, asignadoAId: true, codigo: true, titulo: true, slaPausadoEn: true, slaPausadoMs: true },
      })
      if (!existing) return null

      const data: Record<string, unknown> = { ...parsed.data }

      if (parsed.data.estado === "RESUELTA" && existing.estado !== "RESUELTA") {
        data.fechaResolucion = new Date()
      }
      if (parsed.data.estado === "CERRADA" && existing.estado !== "CERRADA") {
        data.fechaCierre = new Date()
        if (!data.fechaResolucion) data.fechaResolucion = new Date()
      }

      const ESTADOS_PAUSA = ["PENDIENTE_CLIENTE", "PENDIENTE_PROVEEDOR"]
      if (parsed.data.estado && parsed.data.estado !== existing.estado) {
        const entraPausa = ESTADOS_PAUSA.includes(parsed.data.estado) && !ESTADOS_PAUSA.includes(existing.estado)
        const salePausa = !ESTADOS_PAUSA.includes(parsed.data.estado) && ESTADOS_PAUSA.includes(existing.estado)
        if (entraPausa) {
          data.slaPausadoEn = new Date()
        } else if (salePausa && existing.slaPausadoEn) {
          const pausadoMs = Date.now() - new Date(existing.slaPausadoEn).getTime()
          data.slaPausadoMs = (existing.slaPausadoMs || 0) + pausadoMs
          data.slaPausadoEn = null
        }
      }

      const updated = await tx.incidencia.update({
        where: { id },
        data: data as Parameters<typeof db.incidencia.update>[0]["data"],
        include: {
          hospital: { select: { id: true, nombre: true, ciudad: true } },
          asignadoA: { select: { id: true, nombre: true } },
        },
      })
      return { existing, updated }
    }, { isolationLevel: "Serializable" })
    if (!txResult) return NextResponse.json({ error: "Incidencia no encontrada" }, { status: 404 })
    const { existing, updated } = txResult

    if (parsed.data.estado && parsed.data.estado !== existing.estado) {
      await db.eventoIncidencia.create({
        data: {
          incidenciaId: id, autorId: session.user.id,
          tipo: "CAMBIO_ESTADO",
          descripcion: `Estado cambiado de ${existing.estado} a ${parsed.data.estado}`,
        },
      })
    }

    if (parsed.data.asignadoAId !== undefined && parsed.data.asignadoAId !== existing.asignadoAId) {
      const nombre = updated.asignadoA?.nombre ?? "Sin asignar"
      await db.eventoIncidencia.create({
        data: {
          incidenciaId: id, autorId: session.user.id,
          tipo: "CAMBIO_ASIGNACION",
          descripcion: `Asignada a ${nombre}`,
        },
      })
    }

    await logActividad(
      session.user.id, "EDITAR", "INCIDENCIA", id,
      `Incidencia ${existing.codigo} actualizada`,
    ).catch(() => {})

    return NextResponse.json(updated)
  } catch (err) {
    console.error("[PATCH /api/incidencias/[id]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = checkRateLimit(req, "incidencias-delete", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const { id } = await params
    const inc = await db.incidencia.findUnique({ where: { id }, select: { codigo: true, titulo: true } })
    if (!inc) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

    await db.incidencia.delete({ where: { id } })

    await logActividad(
      session.user.id, "ELIMINAR", "INCIDENCIA", id,
      `Incidencia ${inc.codigo} eliminada: ${inc.titulo}`,
    ).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/incidencias/[id]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
