import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await checkRateLimit(req, "filtros-guardados-delete", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const filtro = await db.filtroGuardado.findUnique({ where: { id } })
    if (!filtro) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (filtro.usuarioId !== session.user.id) return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

    await db.filtroGuardado.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/filtros-guardados/[id]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
