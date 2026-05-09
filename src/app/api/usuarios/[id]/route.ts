// PATCH /api/usuarios/[id] — edita rol o estado activo
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { id } = await params
  const data = await req.json()

  // Solo permite actualizar campos seguros
  const campos: Record<string, unknown> = {}
  if (data.rol !== undefined) campos.rol = data.rol
  if (data.activo !== undefined) campos.activo = data.activo
  if (data.nombre !== undefined) campos.nombre = data.nombre

  const usuario = await db.usuario.update({
    where: { id },
    data: campos,
    select: { id: true, nombre: true, email: true, rol: true, activo: true },
  })

  return NextResponse.json(usuario)
}
