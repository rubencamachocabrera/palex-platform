import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// PATCH /api/contactos/[id] — edita un contacto (solo ADMIN)
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
    const { nombre, cargo, email, telefono, principal } = await req.json()

    if (!nombre?.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })
    }

    const actual = await db.contacto.findUnique({ where: { id } })
    if (!actual) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    // Si se marca como principal, quitar el flag a los demás del mismo hospital
    if (principal && !actual.principal) {
      await db.contacto.updateMany({
        where: { hospitalId: actual.hospitalId, principal: true },
        data: { principal: false },
      })
    }

    const contacto = await db.contacto.update({
      where: { id },
      data: {
        nombre: nombre.trim(),
        cargo: cargo?.trim() || null,
        email: email?.trim() || null,
        telefono: telefono?.trim() || null,
        principal: !!principal,
      },
    })

    return NextResponse.json(contacto)
  } catch (err) {
    console.error("[PATCH]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// DELETE /api/contactos/[id] — elimina un contacto (solo ADMIN)
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const { id } = await params
    await db.contacto.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
