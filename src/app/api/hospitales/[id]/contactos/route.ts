import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { parseBody, ContactoCreate } from "@/lib/schemas"

// GET /api/hospitales/[id]/contactos — lista contactos del hospital (todos los roles)
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await checkRateLimit(_, "/api/hospitales/contactos")
    if (rl) return rl

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

// POST /api/hospitales/[id]/contactos — crea un contacto (todos los roles autenticados)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await checkRateLimit(req, "/api/hospitales/contactos", { limit: 30 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id: hospitalId } = await params
    const body = await req.json()
    const parsed = parseBody(ContactoCreate, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const { nombre, cargo, email, telefono, principal } = parsed.data

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
