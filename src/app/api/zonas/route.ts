import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const zonas = await db.zona.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { hospitales: true, usuarios: true } } },
    })
    return NextResponse.json(zonas)
  } catch (err) {
    console.error("[GET /api/zonas]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const { nombre, descripcion } = await req.json()
    if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })

    const zona = await db.zona.create({ data: { nombre, descripcion } })
    return NextResponse.json(zona, { status: 201 })
  } catch (err) {
    console.error("[POST /api/zonas]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
