import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

async function checkAccess(id: string, userId: string, role: string) {
  const pp = await db.proyecto.findUnique({ where: { id }, select: { responsableId: true } })
  if (!pp) return { error: "No encontrado", status: 404 }
  if (role !== "ADMIN" && pp.responsableId !== userId)
    return { error: "No autorizado", status: 403 }
  return null
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const denied = await checkAccess(id, session.user.id, session.user.role as string)
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status })

    const modulos = await db.proyectoModulo.findMany({
      where: { proyectoId: id },
      include: { modulo: { select: { id: true, nombre: true } } },
    })
    return NextResponse.json(modulos)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const denied = await checkAccess(id, session.user.id, session.user.role as string)
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status })

    const { moduloIds } = await req.json()
    if (!Array.isArray(moduloIds) || moduloIds.length === 0)
      return NextResponse.json({ error: "moduloIds requerido" }, { status: 400 })

    await db.proyectoModulo.deleteMany({ where: { proyectoId: id } })
    await db.proyectoModulo.createMany({
      data: moduloIds.map((moduloId: string) => ({ proyectoId: id, moduloId })),
    })

    const modulos = await db.proyectoModulo.findMany({
      where: { proyectoId: id },
      include: { modulo: { select: { id: true, nombre: true } } },
    })
    return NextResponse.json(modulos, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
