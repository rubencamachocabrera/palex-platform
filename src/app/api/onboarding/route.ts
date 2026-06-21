import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { parseBody, OnboardingPatch } from "@/lib/schemas"

// GET /api/onboarding — estado del onboarding del usuario en sesion
export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "/api/onboarding")
    if (rl) return rl

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
    const rl = checkRateLimit(req, "/api/onboarding", { limit: 30 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const body = await req.json()
    const parsed = parseBody(OnboardingPatch, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

    await db.usuario.update({
      where: { id: session.user.id },
      data: { onboardingCompletado: parsed.data.completado },
    })

    return NextResponse.json({ completado: parsed.data.completado })
  } catch (err) {
    console.error("[PATCH /api/onboarding]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
