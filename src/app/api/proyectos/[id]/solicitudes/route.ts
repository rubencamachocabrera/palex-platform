import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { parseBody, SolicitudCreate } from "@/lib/schemas"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await checkRateLimit(req as NextRequest, "/api/proyectos/solicitudes")
  if (rl) return rl
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
  const rl = await checkRateLimit(req as NextRequest, "/api/proyectos/solicitudes", { limit: 30 })
  if (rl) return rl
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
    const parsed = parseBody(SolicitudCreate, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const d = parsed.data
    const solicitud = await db.solicitudMaterial.create({
      data: {
        proyectoId: id,
        titulo: d.titulo,
        estado: d.estado as "PENDIENTE" | "APROBADA" | "EN_PREPARACION" | "ENVIADA" | "ENTREGADA" | "CANCELADA",
        fechaEntregaPlan: d.fechaEntregaPlan ? new Date(d.fechaEntregaPlan) : null,
        notas: d.notas ?? null,
        lineas: d.lineas?.length
          ? {
              create: d.lineas.map((l) => ({
                nombre: l.nombre,
                referencia: l.referencia ?? null,
                cantidad: l.cantidad,
                unidad: l.unidad,
                notas: l.notas ?? null,
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
