import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const item = await db.hardwareCatalogo.findUnique({
      where: { id },
      include: {
        tipo: true,
        unidades: {
          include: {
            hospital: { select: { id: true, nombre: true, ciudad: true } },
            preProyecto: { select: { id: true, titulo: true } },
          },
          orderBy: { creadoEn: "desc" },
        },
      },
    })
    if (!item) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    return NextResponse.json(item)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  const { id } = await params
  try {
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if ("tipoId" in body) data.tipoId = body.tipoId || null
    if ("marca" in body) data.marca = body.marca
    if ("modelo" in body) data.modelo = body.modelo
    if ("referenciaPalex" in body) data.referenciaPalex = body.referenciaPalex || null
    if ("proveedor" in body) data.proveedor = body.proveedor || null
    if ("descripcion" in body) data.descripcion = body.descripcion || null
    if ("precio" in body) data.precio = body.precio != null ? parseFloat(body.precio) : null
    if ("fichaUrl" in body) data.fichaUrl = body.fichaUrl || null
    if ("garantiaMeses" in body) data.garantiaMeses = body.garantiaMeses != null ? parseInt(body.garantiaMeses) : null
    if ("activo" in body) data.activo = body.activo
    const updated = await db.hardwareCatalogo.update({
      where: { id },
      data,
      include: { tipo: true },
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  const { id } = await params
  try {
    await db.hardwareCatalogo.update({ where: { id }, data: { activo: false } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
