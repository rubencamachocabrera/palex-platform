import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// Tamaño máximo del fichero HTML: 5 MB
const MAX_SIZE = 5 * 1024 * 1024

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const rol = session.user.role
    if (rol !== "ADMIN" && rol !== "PROYECTOS") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const { id } = await params
    const formData = await req.formData()
    const file = formData.get("mapa") as File | null
    if (!file) return NextResponse.json({ error: "No se recibió fichero" }, { status: 400 })
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "El fichero supera el límite de 5 MB" }, { status: 413 })
    }

    const html = await file.text()
    await db.proyecto.update({ where: { id }, data: { mapaHtml: html } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/proyectos/[id]/mapa]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const rol = session.user.role
    if (rol !== "ADMIN" && rol !== "PROYECTOS") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const { id } = await params
    await db.proyecto.update({ where: { id }, data: { mapaHtml: null } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/proyectos/[id]/mapa]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
