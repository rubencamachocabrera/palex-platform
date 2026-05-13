import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// PATCH /api/oportunidades/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const op = await db.oportunidad.findUnique({ where: { id } })
    if (!op) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    const rol = session.user.role
    if (rol !== "ADMIN" && op.usuarioId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const body = await req.json()
    const data: Record<string, unknown> = {}

    if (body.titulo      !== undefined) data.titulo       = body.titulo.trim()
    if (body.etapa !== undefined) {
      if (body.etapa !== op.etapa) {
        const prev = Array.isArray(op.historial) ? (op.historial as Array<Record<string, string>>) : []
        data.historial = [...prev, {
          etapaAnterior: op.etapa as string,
          etapaNueva: body.etapa as string,
          fecha: new Date().toISOString(),
          usuario: (session.user as { name?: string; email?: string }).name
            ?? (session.user as { name?: string; email?: string }).email
            ?? "Usuario",
        }]
      }
      data.etapa = body.etapa
    }
    if (body.valorEstimado !== undefined) data.valorEstimado = body.valorEstimado ? parseFloat(body.valorEstimado) : null
    if (body.probabilidad  !== undefined) data.probabilidad  = body.probabilidad ? parseInt(body.probabilidad) : null
    if (body.fechaCierre   !== undefined) data.fechaCierre   = body.fechaCierre ? new Date(body.fechaCierre) : null
    if (body.productos     !== undefined) data.productos     = body.productos
    if (body.notas         !== undefined) data.notas         = body.notas?.trim() || null
    if (body.motivoPerdida !== undefined) data.motivoPerdida = body.motivoPerdida?.trim() || null

    const updated = await db.oportunidad.update({
      where: { id },
      data,
      include: {
        hospital: { select: { id: true, nombre: true, ciudad: true, zona: { select: { nombre: true } } } },
        usuario:  { select: { id: true, nombre: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error("[PATCH]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// DELETE /api/oportunidades/[id]
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const op = await db.oportunidad.findUnique({ where: { id } })
    if (!op) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    const rol = session.user.role
    if (rol !== "ADMIN" && op.usuarioId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    await db.oportunidad.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
