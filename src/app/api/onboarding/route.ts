import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/onboarding — estado del onboarding del usuario en sesion
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const usuario = await db.usuario.findUnique({
      where: { id: session.user.id },
      select: { onboardingCompletado: true },
    })
    if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

    return NextResponse.json({ completado: usuario.onboardingCompletado })
  } catch (err) {
    console.error("[GET /api/onboarding]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// PATCH /api/onboarding — marcar onboarding como completado/pendiente
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const body = await req.json()
    if (typeof body.completado !== "boolean") {
      return NextResponse.json({ error: "Campo 'completado' requerido (boolean)" }, { status: 400 })
    }

    await db.usuario.update({
      where: { id: session.user.id },
      data: { onboardingCompletado: body.completado },
    })

    return NextResponse.json({ completado: body.completado })
  } catch (err) {
    console.error("[PATCH /api/onboarding]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
