import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { logActividad } from "@/lib/log-actividad"
import { requireInlabUser, puedeAccederHospital } from "@/lib/inlab/access"
import { invalidarDatosInlab } from "@/lib/inlab/cache-datos"

// DELETE /api/inlab/cargas/[id] — elimina la carga y sus agregados (cascade). Solo autor o ADMIN.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await checkRateLimit(req, "inlab-cargas-delete", { limit: 30 })
    if (rl) return rl
    const user = await requireInlabUser()
    if (user instanceof NextResponse) return user

    const { id } = await params
    const carga = await db.inlabCarga.findUnique({ where: { id }, select: { id: true, hospitalId: true, usuarioId: true, fichero: true } })
    if (!carga) return NextResponse.json({ error: "No encontrada" }, { status: 404 })
    if (!(await puedeAccederHospital(user, carga.hospitalId))) return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    if (user.role !== "ADMIN" && carga.usuarioId !== user.id) return NextResponse.json({ error: "Solo el autor de la carga o un administrador pueden eliminarla" }, { status: 403 })

    await db.inlabCarga.delete({ where: { id } })
    invalidarDatosInlab(carga.hospitalId)
    await logActividad(user.id, "ELIMINAR", "InlabCarga", id, carga.fichero)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE inlab/cargas/[id]]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
