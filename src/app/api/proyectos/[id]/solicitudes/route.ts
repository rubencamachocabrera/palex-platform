import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const pp = await db.proyecto.findUnique({ where: { id }, select: { responsableId: true } })
    if (!pp) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session?.user?.role !== "ADMIN" && pp.responsableId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const solicitudes = await db.solicitudMaterial.findMany({
      where: { proyectoId: id },
      include: { lineas: true },
      orderBy: { creadoEn: "desc" },
    })
    return NextResponse.json(solicitudes)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const pp = await db.proyecto.findUnique({ where: { id }, select: { responsableId: true } })
    if (!pp) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session?.user?.role !== "ADMIN" && pp.responsableId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const body = await req.json()
    if (!body.titulo) return NextResponse.json({ error: "Título requerido" }, { status: 400 })
    const solicitud = await db.solicitudMaterial.create({
      data: {
        proyectoId: id,
        titulo: body.titulo,
        estado: body.estado || "PENDIENTE",
        fechaEntregaPlan: body.fechaEntregaPlan ? new Date(body.fechaEntregaPlan) : null,
        notas: body.notas || null,
        lineas: body.lineas?.length
          ? {
              create: body.lineas.map((l: { nombre: string; referencia?: string; cantidad: number; unidad?: string; notas?: string }) => ({
                nombre: l.nombre,
                referencia: l.referencia || null,
                cantidad: parseInt(l.cantidad as unknown as string),
                unidad: l.unidad || "ud",
                notas: l.notas || null,
              })),
            }
          : undefined,
      },
      include: { lineas: true },
    })
    return NextResponse.json(solicitud, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
