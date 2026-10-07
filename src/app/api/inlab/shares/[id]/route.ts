import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { logActividad } from "@/lib/log-actividad"
import { requireInlabUser, puedeAccederHospital } from "@/lib/inlab/access"

// DELETE /api/inlab/shares/[id] — revoca el enlace público (autor o ADMIN)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await checkRateLimit(req, "inlab-shares-delete", { limit: 30 })
    if (rl) return rl
    const user = await requireInlabUser()
    if (user instanceof NextResponse) return user
    const { id } = await params
    const share = await db.inlabShare.findUnique({ where: { id }, select: { id: true, hospitalId: true, creadoPorId: true } })
    if (!share) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (!(await puedeAccederHospital(user, share.hospitalId))) return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    if (user.role !== "ADMIN" && share.creadoPorId !== user.id) return NextResponse.json({ error: "Solo el autor o un administrador pueden revocarlo" }, { status: 403 })

    await db.inlabShare.update({ where: { id }, data: { revocado: true } })
    await logActividad(user.id, "ELIMINAR", "InlabShare", id, "Enlace público InLab revocado")
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE inlab/shares/[id]]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
