import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { parseBody, TagPatch } from "@/lib/schemas"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = checkRateLimit(req, "/api/tags/id", { limit: 30 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    if ((session.user.role as string) !== "ADMIN")
      return NextResponse.json({ error: "Solo ADMIN puede editar tags" }, { status: 403 })

    const { id } = await params
    const body = await req.json()
    const parsed = parseBody(TagPatch, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const existing = await db.tag.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    const data: Record<string, unknown> = {}
    if (parsed.data.nombre !== undefined) data.nombre = parsed.data.nombre.trim()
    if (parsed.data.color !== undefined) data.color = parsed.data.color
    if (parsed.data.orden !== undefined) data.orden = parsed.data.orden
    if (parsed.data.activo !== undefined) data.activo = parsed.data.activo

    const updated = await db.tag.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Ya existe un tag con ese nombre y tipo" }, { status: 409 })
    }
    console.error("[PATCH /api/tags/[id]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = checkRateLimit(_req, "/api/tags/id", { limit: 30 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    if ((session.user.role as string) !== "ADMIN")
      return NextResponse.json({ error: "Solo ADMIN puede eliminar tags" }, { status: 403 })

    const { id } = await params
    const existing = await db.tag.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    // Cascade deletes pivots automatically (onDelete: Cascade in schema)
    await db.tag.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/tags/[id]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
