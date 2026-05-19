import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get("tipo")
  const soloActivos = searchParams.get("activo") !== "false"
  try {
    const items = await db.hardwareCatalogo.findMany({
      where: {
        ...(soloActivos ? { activo: true } : {}),
        ...(tipo ? { tipo: tipo as never } : {}),
      },
      include: {
        unidades: { select: { estado: true } },
      },
      orderBy: [{ tipo: "asc" }, { marca: "asc" }, { modelo: "asc" }],
    })
    const result = items.map(item => ({
      ...item,
      _stock: {
        total: item.unidades.length,
        disponibles: item.unidades.filter(u => u.estado === "DISPONIBLE").length,
        asignados: item.unidades.filter(u => u.estado === "ASIGNADO").length,
      },
      unidades: undefined,
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
    if (!body.tipo || !body.marca || !body.modelo) return NextResponse.json({ error: "Faltan campos" }, { status: 400 })
    const item = await db.hardwareCatalogo.create({
      data: {
        tipo: body.tipo,
        marca: body.marca,
        modelo: body.modelo,
        descripcion: body.descripcion || null,
        precio: body.precio ? parseFloat(body.precio) : null,
        fichaUrl: body.fichaUrl || null,
      },
    })
    return NextResponse.json(item, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
