import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { checkRateLimit } from "@/lib/rate-limit"

type Params = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Params) {
  const rl = await checkRateLimit(_, "/api/usuarios/[id]")
  if (rl) return rl
  const session = await auth()
  if (session?.user?.role !== "ADMIN")
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const { id } = await params
  const usuario = await db.usuario.findUnique({
    where: { id },
    select: { id: true, nombre: true, email: true, rol: true, activo: true, creadoEn: true },
  })
  if (!usuario) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json(usuario)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const rl = await checkRateLimit(req, "/api/usuarios/[id]", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  if (session?.user?.role !== "ADMIN")
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const { id } = await params
  try {
    const body = await req.json()
    const data: Record<string, unknown> = {}

    if (body.nombre !== undefined) data.nombre = String(body.nombre).trim()
    if (body.email !== undefined) data.email = String(body.email).trim().toLowerCase()
    if (body.rol !== undefined && ["ADMIN", "VENTAS", "PROYECTOS", "TECNICO"].includes(body.rol))
      data.rol = body.rol
    if (body.activo !== undefined) data.activo = Boolean(body.activo)
    if (body.password !== undefined && typeof body.password === "string" && body.password.length >= 8)
      data.password = await bcrypt.hash(body.password, 12)
    if (body.onboardingCompletado !== undefined) data.onboardingCompletado = Boolean(body.onboardingCompletado)

    const updated = await db.usuario.update({
      where: { id },
      data,
      select: { id: true, nombre: true, email: true, rol: true, activo: true },
    })
    return NextResponse.json(updated)
  } catch (err) {
    console.error("[PATCH /api/usuarios/[id]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const rl = await checkRateLimit(_, "/api/usuarios/[id]", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  if (session?.user?.role !== "ADMIN")
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const { id } = await params

  if (session.user.id === id)
    return NextResponse.json({ error: "No puedes eliminar tu propio usuario" }, { status: 400 })

  try {
    await db.usuario.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    if ((err as { code?: string })?.code === "P2003") {
      return NextResponse.json(
        { error: "Este usuario tiene actividad registrada (visitas, llamadas, incidencias...) y no se puede eliminar. Desactivalo en su lugar." },
        { status: 409 }
      )
    }
    console.error("[DELETE /api/usuarios/[id]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
