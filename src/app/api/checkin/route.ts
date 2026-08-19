import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { CheckinCreate, parseBody } from "@/lib/schemas"

// GET /api/checkin?hospitalId=&activo=true — checkins del usuario actual
export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "checkin-get")
    if (rl) return rl
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const url = new URL(req.url)
    const hospitalId = url.searchParams.get("hospitalId") || undefined
    const activo = url.searchParams.get("activo") === "true"
    const usuarioId = (session.user as { id: string }).id

    const checkins = await db.checkinHospital.findMany({
      where: {
        usuarioId,
        ...(hospitalId ? { hospitalId } : {}),
        ...(activo ? { salidaEn: null } : {}),
      },
      include: {
        hospital: { select: { id: true, nombre: true, ciudad: true } },
        usuario: { select: { id: true, nombre: true } },
      },
      orderBy: { entradaEn: "desc" },
      take: 50,
    })

    return NextResponse.json(checkins, { headers: { "Cache-Control": "no-store" } })
  } catch (err) {
    console.error("[GET checkin]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST /api/checkin — iniciar check-in en un hospital
export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "checkin-post")
    if (rl) return rl
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const usuarioId = (session.user as { id: string }).id
    const parsed = parseBody(CheckinCreate, await req.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { hospitalId, notas } = parsed.data

    // Transaccion serializable: evita crear check-ins duplicados por doble-tap o reintento offline
    const { checkin, creado } = await db.$transaction(async (tx) => {
      const activo = await tx.checkinHospital.findFirst({
        where: { usuarioId, hospitalId, salidaEn: null },
      })
      if (activo) return { checkin: activo, creado: false }

      const nuevo = await tx.checkinHospital.create({
        data: { usuarioId, hospitalId, notas: notas || null },
        include: {
          hospital: { select: { id: true, nombre: true, ciudad: true } },
        },
      })
      return { checkin: nuevo, creado: true }
    }, { isolationLevel: "Serializable" })

    return NextResponse.json(checkin, { status: creado ? 201 : 200 })
  } catch (err) {
    console.error("[POST checkin]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
