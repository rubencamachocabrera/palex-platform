import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contactoId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id: hospitalId, contactoId } = await params
    const body = await req.json()

    if (body.principal === true) {
      await db.contacto.updateMany({
        where: { hospitalId, principal: true },
        data: { principal: false },
      })
    }

    const contacto = await db.contacto.update({
      where: { id: contactoId },
      data: { principal: !!body.principal },
    })

    return NextResponse.json(contacto)
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
