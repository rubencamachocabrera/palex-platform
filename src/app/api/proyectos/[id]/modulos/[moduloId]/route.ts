import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

const ESTADOS_VALIDOS = ["PENDIENTE", "EN_INSTALACION", "INSTALADO", "FORMACION", "VALIDADO"]

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; moduloId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const rol = session.user.role
    if (rol !== "ADMIN" && rol !== "PROYECTOS" && rol !== "TECNICO") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const { id, moduloId } = await params
    const { estado } = await req.json()
    if (!ESTADOS_VALIDOS.includes(estado)) {
      return NextResponse.json({ error: "Estado no válido" }, { status: 400 })
    }

    const pm = await db.proyectoModulo.update({
      where: { proyectoId_moduloId: { proyectoId: id, moduloId } },
      data: { estado },
    })
    return NextResponse.json(pm)
  } catch (err) {
    console.error("[PATCH /api/proyectos/[id]/modulos/[moduloId]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
