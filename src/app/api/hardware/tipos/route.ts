import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  try {
    const tipos = await db.hardwareTipo.findMany({
      where: { activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      include: { _count: { select: { catalogos: true } } },
    })
    return NextResponse.json(tipos)
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
    if (!body.nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
    const tipo = await db.hardwareTipo.create({
      data: {
        nombre: body.nombre.trim(),
        color: body.color || "#6b7280",
        orden: body.orden ?? 0,
      },
      include: { _count: { select: { catalogos: true } } },
    })
    return NextResponse.json(tipo, { status: 201 })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002")
      return NextResponse.json({ error: "Ya existe un tipo con ese nombre" }, { status: 409 })
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
