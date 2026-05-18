import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const proyecto = await db.proyecto.findUnique({
      where: { id },
      include: {
        hospital: { select: { id: true, nombre: true, ciudad: true, provincia: true } },
        modulos: { include: { modulo: true } },
      },
    })
    if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    return NextResponse.json(proyecto)
  } catch (err) {
    console.error("[GET /api/proyectos/[id]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const rol = session.user.role
    if (rol !== "ADMIN" && rol !== "PROYECTOS") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { nombre, hospitalId, fechaInicio, fechaFin, refConcurso, moduloIds } = body

    // Solo tocar módulos si se envía explícitamente en el body
    if (moduloIds !== undefined) {
      await db.proyectoModulo.deleteMany({ where: { proyectoId: id } })
    }

    const proyecto = await db.proyecto.update({
      where: { id },
      data: {
        ...(nombre && { nombre }),
        ...(hospitalId && { hospitalId }),
        ...(fechaInicio && { fechaInicio: new Date(fechaInicio) }),
        fechaFin: fechaFin !== undefined ? (fechaFin ? new Date(fechaFin) : null) : undefined,
        refConcurso: refConcurso !== undefined ? (refConcurso || null) : undefined,
        ...(moduloIds !== undefined && moduloIds.length > 0 && {
          modulos: { create: (moduloIds as string[]).map((mid: string) => ({ moduloId: mid })) },
        }),
      },
      include: {
        hospital: { select: { id: true, nombre: true, ciudad: true, provincia: true } },
        modulos: { include: { modulo: true } },
      },
    })
    return NextResponse.json(proyecto)
  } catch (err) {
    console.error("[PATCH /api/proyectos/[id]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const { id } = await params
    await db.proyecto.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/proyectos/[id]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
