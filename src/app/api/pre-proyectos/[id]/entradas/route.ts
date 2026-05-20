import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const entradas = await db.entradaTimeline.findMany({
      where: { preProyectoId: id },
      orderBy: { fechaEntrada: "asc" },
    })
    return NextResponse.json(entradas)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const body = await req.json()
    if (!body.tipo || !["EVENTO", "COMENTARIO", "CITA"].includes(body.tipo)) {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 })
    }
    if (!body.titulo && body.tipo !== "COMENTARIO") {
      return NextResponse.json({ error: "Falta el título" }, { status: 400 })
    }
    const autor = (session.user as { name?: string; email?: string }).name || session.user.email || "Usuario"
    const entrada = await db.entradaTimeline.create({
      data: {
        preProyectoId: id,
        tipo: body.tipo,
        titulo: body.titulo || "Nota",
        contenido: body.contenido || null,
        fechaCita: body.fechaCita ? new Date(body.fechaCita) : null,
        personaCita: body.personaCita || null,
        fechaEntrada: body.fechaEntrada ? new Date(body.fechaEntrada) : undefined,
        autor,
      },
    })
    return NextResponse.json(entrada, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
