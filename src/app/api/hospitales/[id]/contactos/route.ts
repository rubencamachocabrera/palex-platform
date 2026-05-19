import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/hospitales/[id]/contactos — lista contactos del hospital (todos los roles)
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id: hospitalId } = await params
    const contactos = await db.contacto.findMany({
      where: { hospitalId },
      orderBy: [{ principal: "desc" }, { nombre: "asc" }],
    })
    return NextResponse.json(contactos)
  } catch (err) {
    console.error("[GET]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST /api/hospitales/[id]/contactos — crea un contacto (solo ADMIN)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const { id: hospitalId } = await params
    const { nombre, cargo, email, telefono, principal } = await req.json()

    if (!nombre?.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })
    }

    // Si este contacto es principal, quitar el flag al anterior principal
    if (principal) {
      await db.contacto.updateMany({
        where: { hospitalId, principal: true },
        data: { principal: false },
      })
    }

    const contacto = await db.contacto.create({
      data: {
        hospitalId,
        nombre: nombre.trim(),
        cargo: cargo?.trim() || null,
        email: email?.trim() || null,
        telefono: telefono?.trim() || null,
        principal: !!principal,
      },
    })

    return NextResponse.json(contacto, { status: 201 })
  } catch (err) {
    console.error("[POST]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
