import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { parseBody, InlabMapeoUpsert } from "@/lib/schemas"
import { requireInlabUser, puedeAccederHospital } from "@/lib/inlab/access"

type Ctx = { params: Promise<{ hospitalId: string }> }

// GET /api/inlab/mapeos/[hospitalId] — mapeo de columnas guardado (o null)
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const rl = await checkRateLimit(req, "inlab-mapeos")
    if (rl) return rl
    const user = await requireInlabUser()
    if (user instanceof NextResponse) return user
    const { hospitalId } = await params
    if (!(await puedeAccederHospital(user, hospitalId))) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const m = await db.inlabMapeo.findUnique({ where: { hospitalId }, select: { mapeo: true, opciones: true, editadoEn: true } })
    return NextResponse.json(m ?? null, { headers: { "Cache-Control": "private, no-store" } })
  } catch (err) {
    console.error("[GET inlab/mapeos]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// PUT /api/inlab/mapeos/[hospitalId] — guarda el mapeo para siguientes cargas
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const rl = await checkRateLimit(req, "inlab-mapeos-put", { limit: 30 })
    if (rl) return rl
    const user = await requireInlabUser()
    if (user instanceof NextResponse) return user
    const { hospitalId } = await params
    if (!(await puedeAccederHospital(user, hospitalId))) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const parsed = parseBody(InlabMapeoUpsert, await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const data = {
      mapeo: parsed.data.mapeo as Prisma.InputJsonValue,
      opciones: (parsed.data.opciones ?? undefined) as Prisma.InputJsonValue | undefined,
      usuarioId: user.id,
    }
    const m = await db.inlabMapeo.upsert({ where: { hospitalId }, create: { hospitalId, ...data }, update: data, select: { mapeo: true, opciones: true, editadoEn: true } })
    return NextResponse.json(m)
  } catch (err) {
    console.error("[PUT inlab/mapeos]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
