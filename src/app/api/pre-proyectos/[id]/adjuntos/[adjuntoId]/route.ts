import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; adjuntoId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { adjuntoId } = await params
  try {
    const adj = await db.adjunto.findUnique({ where: { id: adjuntoId } })
    if (!adj) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    const buffer = Buffer.from(adj.contenido, "base64")
    return new Response(buffer, {
      headers: {
        "Content-Type": adj.tipo,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(adj.nombre)}"`,
        "Content-Length": String(buffer.length),
      },
    })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; adjuntoId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { adjuntoId } = await params
  try {
    await db.adjunto.delete({ where: { id: adjuntoId } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
