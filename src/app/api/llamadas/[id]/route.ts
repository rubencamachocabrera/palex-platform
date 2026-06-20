import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { logActividad } from "@/lib/log-actividad"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = checkRateLimit(req, "llamadas-detail", { limit: 60, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params

    const llamada = await db.registroLlamada.findUnique({
      where: { id },
      include: {
        hospital: { select: { id: true, nombre: true, ciudad: true } },
        contacto: { select: { id: true, nombre: true, cargo: true, telefono: true, email: true } },
        usuario: { select: { id: true, nombre: true } },
      },
    })

    if (!llamada) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    // IDOR: only owner or ADMIN, or same zone
    if (session.user.role !== "ADMIN" && llamada.usuarioId !== session.user.id) {
      const inZone = await db.hospital.findFirst({
        where: { id: llamada.hospitalId, zona: { usuarios: { some: { usuarioId: session.user.id } } } },
        select: { id: true },
      })
      if (!inZone) return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const res = NextResponse.json(llamada)
    res.headers.set("Cache-Control", "private, max-age=15")
    return res
  } catch (err) {
    console.error("[GET /api/llamadas/[id]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params

    const existing = await db.registroLlamada.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    // Only owner or ADMIN can edit
    if (session.user.role !== "ADMIN" && existing.usuarioId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const body = await req.json()

    // Whitelist
    const data: Record<string, unknown> = {}
    if ("asunto" in body && typeof body.asunto === "string" && body.asunto.trim()) {
      data.asunto = body.asunto.trim()
    }
    if ("notas" in body) {
      data.notas = body.notas && typeof body.notas === "string" ? body.notas.trim() : null
    }
    if ("resultado" in body) {
      data.resultado = body.resultado && typeof body.resultado === "string" ? body.resultado.trim() : null
    }
    if ("duracion" in body) {
      data.duracion = body.duracion != null && typeof body.duracion === "number" && body.duracion > 0
        ? body.duracion
        : null
    }
    if ("seguimiento" in body && typeof body.seguimiento === "boolean") {
      data.seguimiento = body.seguimiento
    }
    if ("fechaSeguimiento" in body) {
      if (body.fechaSeguimiento) {
        const fs = new Date(body.fechaSeguimiento)
        if (!isNaN(fs.getTime())) data.fechaSeguimiento = fs
      } else {
        data.fechaSeguimiento = null
      }
    }
    if ("contactoId" in body) {
      if (body.contactoId && typeof body.contactoId === "string") {
        // Validate contacto belongs to the same hospital
        const contacto = await db.contacto.findFirst({
          where: { id: body.contactoId, hospitalId: existing.hospitalId },
          select: { id: true },
        })
        if (contacto) data.contactoId = body.contactoId
      } else {
        data.contactoId = null
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Sin campos validos para actualizar" }, { status: 400 })
    }

    const updated = await db.registroLlamada.update({
      where: { id },
      data,
      include: {
        hospital: { select: { id: true, nombre: true, ciudad: true } },
        contacto: { select: { id: true, nombre: true, cargo: true, telefono: true } },
        usuario: { select: { id: true, nombre: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error("[PATCH /api/llamadas/[id]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params

    const existing = await db.registroLlamada.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    // Only owner or ADMIN can delete
    if (session.user.role !== "ADMIN" && existing.usuarioId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    await db.registroLlamada.delete({ where: { id } })

    await logActividad(
      session.user.id,
      "ELIMINAR",
      "LLAMADA",
      id,
      `Llamada eliminada: ${existing.asunto}`,
    ).catch(() => {})

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error("[DELETE /api/llamadas/[id]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
