import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const rol = session.user.role
  const userId = session.user.id

  const visitas = await db.visita.findMany({
    where: rol === "ADMIN" ? {} : { usuarioId: userId },
    include: {
      hospital: { select: { id: true, nombre: true, ciudad: true, zona: { select: { nombre: true } } } },
      usuario: { select: { id: true, nombre: true, rol: true } },
    },
    orderBy: { fecha: "desc" },
  })
  return NextResponse.json(visitas)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { hospitalId, tipo } = await req.json()
  if (!hospitalId || !tipo) return NextResponse.json({ error: "Faltan campos" }, { status: 400 })

  const visita = await db.visita.create({
    data: {
      hospitalId,
      usuarioId: session.user.id,
      tipo,
      estado: "BORRADOR",
      datos: {},
    },
  })
  return NextResponse.json(visita, { status: 201 })
}
