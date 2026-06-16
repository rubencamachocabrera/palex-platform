import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const rol = session.user.role
    if (rol !== "ADMIN" && rol !== "PROYECTOS") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const { id } = await params
    const proyecto = await db.proyecto.findUnique({ where: { id }, select: { mapaHtml: true, mapaToken: true } })
    if (!proyecto) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    if (!proyecto.mapaHtml) return NextResponse.json({ error: "Este proyecto no tiene mapa" }, { status: 400 })

    // Reusar token existente o generar uno nuevo
    const token = proyecto.mapaToken ?? generateToken()
    if (!proyecto.mapaToken) {
      await db.proyecto.update({ where: { id }, data: { mapaToken: token } })
    }

    const origin = req.headers.get("origin") ?? req.nextUrl.origin
    return NextResponse.json({ token, url: `${origin}/share/${token}` })
  } catch (err) {
    console.error("[POST /api/proyectos/[id]/mapa/compartir]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const rol = session.user.role
    if (rol !== "ADMIN" && rol !== "PROYECTOS") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }
    const { id } = await params
    await db.proyecto.update({ where: { id }, data: { mapaToken: null } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/proyectos/[id]/mapa/compartir]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

function generateToken() {
  return randomBytes(18).toString("hex")
}
