import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const pp = await db.preProyecto.findUnique({ where: { id }, select: { responsableId: true } })
    if (!pp) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (session?.user?.role !== "ADMIN" && pp.responsableId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const body = await req.json()
    if (!body.titulo || !body.fecha) return NextResponse.json({ error: "Faltan campos" }, { status: 400 })
    const hito = await db.hito.create({
      data: {
        preProyectoId: id,
        titulo: body.titulo,
        descripcion: body.descripcion || null,
        fecha: new Date(body.fecha),
      },
    })
    return NextResponse.json(hito, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
