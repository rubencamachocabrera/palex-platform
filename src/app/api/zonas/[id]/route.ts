import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = await checkRateLimit(req, "/api/zonas/[id]", { limit: 30 })
  if (rl) return rl
  try {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const { id } = await params
    const body = await req.json()
    const { nombre, descripcion, activo } = body
    const data = Object.fromEntries(
      Object.entries({ nombre, descripcion, activo }).filter(([, v]) => v !== undefined)
    )
    const zona = await db.zona.update({ where: { id }, data })
    return NextResponse.json(zona)
  } catch (err) {
    console.error("[PATCH]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = await checkRateLimit(_, "/api/zonas/[id]", { limit: 30 })
  if (rl) return rl
  try {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const { id } = await params
    await db.zona.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
