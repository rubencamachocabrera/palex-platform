import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const tipoId = searchParams.get("tipoId")
  const soloActivos = searchParams.get("activo") !== "false"
  try {
    const items = await db.hardwareCatalogo.findMany({
      where: {
        ...(soloActivos ? { activo: true } : {}),
        ...(tipoId ? { tipoId } : {}),
      },
      include: {
        tipo: true,
        unidades: { select: { estado: true } },
        _count: { select: { docs: true } },
      },
      orderBy: [{ tipo: { nombre: "asc" } }, { marca: "asc" }, { modelo: "asc" }],
    })
    const result = items.map(item => ({
      ...item,
      _stock: {
        total: item.unidades.length,
        disponibles: item.unidades.filter(u => u.estado === "DISPONIBLE").length,
        asignados: item.unidades.filter(u => u.estado === "ASIGNADO").length,
        mantenimiento: item.unidades.filter(u => u.estado === "EN_MANTENIMIENTO").length,
      },
      docsCount: item._count.docs,
      unidades: undefined,
      _count: undefined,
    }))
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  try {
    const body = await req.json()
    if (!body.marca || !body.modelo) return NextResponse.json({ error: "Marca y modelo son obligatorios" }, { status: 400 })
    const item = await db.hardwareCatalogo.create({
      data: {
        tipoId: body.tipoId || null,
        marca: body.marca,
        modelo: body.modelo,
        referenciaPalex: body.referenciaPalex || null,
        proveedor: body.proveedor || null,
        descripcion: body.descripcion || null,
        precio: body.precio ? parseFloat(body.precio) : null,
        garantiaMeses: body.garantiaMeses ? parseInt(body.garantiaMeses) : null,
        fichaUrl: body.fichaUrl || null,
      },
      include: { tipo: true },
    })
    return NextResponse.json({ ...item, _stock: { total: 0, disponibles: 0, asignados: 0, mantenimiento: 0 } }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
