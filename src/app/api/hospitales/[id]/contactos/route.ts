import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// POST /api/hospitales/[id]/contactos — crea un contacto (solo ADMIN)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
}
