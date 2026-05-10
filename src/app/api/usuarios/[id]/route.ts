import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/usuarios/[id] — detalle con zonas asignadas
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const { id } = await params
    const usuario = await db.usuario.findUnique({
      where: { id },
      select: {
        id: true, nombre: true, email: true, rol: true, activo: true,
        zonas: { select: { zonaId: true } },
      },
    })
    if (!usuario) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    return NextResponse.json({
      ...usuario,
      zonas: usuario.zonas.map(z => z.zonaId),
    })
  } catch (err) {
    console.error("[GET]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// PATCH /api/usuarios/[id] — edita rol, estado activo o zonas
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const { id } = await params
    const data = await req.json()

    // Actualiza campos escalares
    const campos: Record<string, unknown> = {}
    if (data.rol !== undefined) campos.rol = data.rol
    if (data.activo !== undefined) campos.activo = data.activo
    if (data.nombre !== undefined) campos.nombre = data.nombre

    if (Object.keys(campos).length > 0) {
      await db.usuario.update({ where: { id }, data: campos })
    }

    // Actualiza zonas (reemplaza todas)
    if (Array.isArray(data.zonas)) {
      await db.usuarioZona.deleteMany({ where: { usuarioId: id } })
      if (data.zonas.length > 0) {
        await db.usuarioZona.createMany({
          data: (data.zonas as string[]).map(zonaId => ({ usuarioId: id, zonaId })),
        })
      }
    }

    const usuario = await db.usuario.findUnique({
      where: { id },
      select: {
        id: true, nombre: true, email: true, rol: true, activo: true,
        zonas: { select: { zonaId: true } },
      },
    })

    return NextResponse.json({
      ...usuario,
      zonas: usuario?.zonas.map(z => z.zonaId) ?? [],
    })
  } catch (err) {
    console.error("[PATCH]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
