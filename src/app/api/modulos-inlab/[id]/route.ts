import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(req, "/api/modulos-inlab/[id]", { limit: 30 })
  if (rl) return rl
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const { id } = await params
    const body = await req.json()
    const data: { nombre?: string; activo?: boolean } = {}
    if (typeof body.nombre === "string" && body.nombre.trim()) data.nombre = body.nombre.trim()
    if (typeof body.activo === "boolean") data.activo = body.activo

    if (Object.keys(data).length === 0)
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 })

    const modulo = await db.moduloInlab.update({ where: { id }, data })
    return NextResponse.json(modulo)
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002")
      return NextResponse.json({ error: "Ya existe un módulo con ese nombre" }, { status: 409 })
    console.error("[PATCH /api/modulos-inlab/[id]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(_req, "/api/modulos-inlab/[id]", { limit: 30 })
  if (rl) return rl
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const { id } = await params

    const count = await db.proyectoModulo.count({ where: { moduloId: id } })
    if (count > 0)
      return NextResponse.json(
        { error: `Este módulo está en uso en ${count} proyecto${count !== 1 ? "s" : ""}. Desasígnalo antes de eliminarlo.` },
        { status: 409 }
      )

    await db.moduloInlab.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error("[DELETE /api/modulos-inlab/[id]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
