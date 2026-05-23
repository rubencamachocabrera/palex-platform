import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const hospital = await db.hospital.findUnique({
      where: { id },
      include: {
        zona: true,
        contactos: { orderBy: [{ principal: "desc" }, { nombre: "asc" }] },
        visitas: {
          include: { usuario: { select: { id: true, nombre: true, rol: true } } },
          orderBy: { fecha: "desc" },
        },
      },
    })
    if (!hospital) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    return NextResponse.json(hospital)
  } catch (err) {
    console.error("[GET]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const { id } = await params
    const data = await req.json()
    const hospital = await db.hospital.update({ where: { id }, data })
    return NextResponse.json(hospital)
  } catch (err) {
    console.error("[PATCH]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const { id } = await params

    const [visitas, oportunidades, preProyectos, proyectos] = await Promise.all([
      db.visita.count({ where: { hospitalId: id } }),
      db.oportunidad.count({ where: { hospitalId: id } }),
      db.preProyecto.count({ where: { hospitalId: id } }),
      db.proyecto.count({ where: { hospitalId: id } }),
    ])

    const total = visitas + oportunidades + preProyectos + proyectos
    if (total > 0) {
      const partes: string[] = []
      if (visitas > 0) partes.push(`${visitas} visita${visitas !== 1 ? "s" : ""}`)
      if (oportunidades > 0) partes.push(`${oportunidades} oportunidad${oportunidades !== 1 ? "es" : ""}`)
      if (preProyectos > 0) partes.push(`${preProyectos} pre-proyecto${preProyectos !== 1 ? "s" : ""}`)
      if (proyectos > 0) partes.push(`${proyectos} proyecto${proyectos !== 1 ? "s" : ""}`)
      return NextResponse.json(
        { error: `No se puede eliminar: tiene ${partes.join(", ")} vinculados` },
        { status: 409 }
      )
    }

    await db.hospital.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
