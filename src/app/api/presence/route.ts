import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { heartbeat, getActiveUsers, leave } from "@/lib/presence"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  try {
    const { entityType, entityId, action } = await req.json()
    if (!entityType || !entityId) return NextResponse.json({ error: "Faltan campos" }, { status: 400 })

    const userId = session.user.id
    const nombre = (session.user as { name?: string }).name ?? "Usuario"

    if (action === "leave") {
      leave(entityType, entityId, userId)
      return NextResponse.json({ ok: true })
    }

    heartbeat(entityType, entityId, userId, nombre)
    const activeUsers = getActiveUsers(entityType, entityId, userId)
    return NextResponse.json({ activeUsers }, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
