import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { parseBody, ContactoPatch } from "@/lib/schemas"

// PATCH /api/contactos/[id] — edita un contacto (solo ADMIN)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await checkRateLimit(req, "/api/contactos/id", { limit: 30 })
    if (rl) return rl

    const session = await auth()
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = parseBody(ContactoPatch, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const { nombre, cargo, email, telefono, principal } = parsed.data

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
        ...(nombre !== undefined && { nombre: nombre.trim() }),
        ...(cargo !== undefined && { cargo: cargo?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(telefono !== undefined && { telefono: telefono?.trim() || null }),
        ...(principal !== undefined && { principal: !!principal }),
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
    const rl = await checkRateLimit(_, "/api/contactos/id", { limit: 30 })
    if (rl) return rl

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
