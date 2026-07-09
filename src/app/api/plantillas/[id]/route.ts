import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = await checkRateLimit(_req, "/api/plantillas/[id]")
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const p = await db.plantillaVisita.findUnique({ where: { id } })
    if (!p) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    return NextResponse.json(p)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = await checkRateLimit(req, "/api/plantillas/[id]", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Prohibido" }, { status: 403 })
  const { id } = await params
  try {
    const body = await req.json()
    const allowed = ["nombre", "descripcion", "tipo", "datos", "activa"]
    const data: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) data[key] = body[key]
    }
    const updated = await db.plantillaVisita.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = await checkRateLimit(_req, "/api/plantillas/[id]", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Prohibido" }, { status: 403 })
  const { id } = await params
  try {
    await db.plantillaVisita.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
