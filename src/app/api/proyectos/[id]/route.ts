import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const pp = await db.proyecto.findUnique({
      where: { id },
      include: {
        hospital: {
          select: {
            id: true, nombre: true, ciudad: true, provincia: true,
            tipo: true, camas: true, direccion: true, pais: true,
            zona: { select: { nombre: true } },
          },
        },
        responsable: { select: { id: true, nombre: true, email: true } },
        fases: { orderBy: { orden: "asc" } },
        hitos: { orderBy: { fecha: "asc" } },
        solicitudes: {
          orderBy: { creadoEn: "desc" },
          include: { lineas: true },
        },
        contactos: {
          include: { contacto: true },
        },
        visitas: {
          orderBy: { fecha: "desc" },
          select: {
            id: true, fecha: true, estado: true, tipo: true,
            usuario: { select: { nombre: true } },
          },
        },
        hardwareUnidades: {
          include: { catalogo: true },
        },
        entradas: {
          orderBy: { fechaEntrada: "asc" },
        },
        tareas: {
          orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
        },
        adjuntos: {
          select: { id: true },
        },
        modulos: {
          include: { modulo: { select: { id: true, nombre: true } } },
        },
      },
    })
    if (!pp) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    // Solo ADMIN o el responsable pueden ver el detalle
    if (session.user.role !== "ADMIN" && pp.responsableId !== session.user.id)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    return NextResponse.json(pp)
  } catch (err) {
    console.error("[GET /api/proyectos/[id]]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    // IDOR: solo ADMIN o el responsable pueden editar
    const existing = await db.proyecto.findUnique({ where: { id }, select: { responsableId: true } })
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session.user.role !== "ADMIN" && existing.responsableId !== session.user.id)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const body = await req.json()
    const allowed = ["titulo", "descripcion", "estado", "prioridad", "presupuesto",
                     "fechaInicio", "fechaFinPlan", "fechaFinReal", "notas", "refContrato", "refConcurso", "responsableId", "mapaHtml"]
    const data: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) {
        if (["fechaInicio", "fechaFinPlan", "fechaFinReal"].includes(key)) {
          data[key] = body[key] && !isNaN(Date.parse(body[key])) ? new Date(body[key]) : null
        } else if (key === "presupuesto") {
          const n = parseFloat(body[key])
          data[key] = Number.isFinite(n) ? n : null
        } else if (key === "titulo") {
          data[key] = String(body[key] ?? "").trim() || undefined
        } else {
          data[key] = body[key]
        }
      }
    }
    const updated = await db.proyecto.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (err) {
    console.error("[PATCH /api/proyectos/[id]]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  const { id } = await params
  try {
    await db.proyecto.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
