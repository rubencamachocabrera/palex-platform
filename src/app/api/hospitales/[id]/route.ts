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
