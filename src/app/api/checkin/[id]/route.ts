import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

// PATCH /api/checkin/[id] — hacer check-out
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = checkRateLimit(req, "checkin-patch")
    if (rl) return rl
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const usuarioId = (session.user as { id: string }).id

    const existing = await db.checkinHospital.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (existing.usuarioId !== usuarioId) return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    if (existing.salidaEn) return NextResponse.json({ error: "Ya has hecho check-out" }, { status: 400 })

    const { notas } = await req.json().catch(() => ({}))
    const salidaEn = new Date()
    const duracion = Math.round((salidaEn.getTime() - existing.entradaEn.getTime()) / 60000)

    const updated = await db.checkinHospital.update({
      where: { id },
      data: { salidaEn, duracion, ...(notas ? { notas } : {}) },
      include: {
        hospital: { select: { id: true, nombre: true, ciudad: true } },
      },
    })
    return NextResponse.json(updated)
  } catch (err) {
    console.error("[PATCH checkin]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
