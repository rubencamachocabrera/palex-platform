import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

export async function GET(_req: Request, { params }: { params: Promise<{ docId: string }> }) {
  const rl = await checkRateLimit(_req as NextRequest, "/api/hardware/docs/[docId]")
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { docId } = await params
  try {
    const doc = await db.hardwareCatalogoDoc.findUnique({ where: { id: docId } })
    if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
    const buf = Buffer.from(doc.contenido, "base64")
    return new NextResponse(buf, {
      headers: {
        "Content-Type": doc.tipo || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.nombre)}"`,
        "Content-Length": String(buf.length),
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ docId: string }> }) {
  const rl = await checkRateLimit(_req as NextRequest, "/api/hardware/docs/[docId]", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  const { docId } = await params
  try {
    await db.hardwareCatalogoDoc.delete({ where: { id: docId } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
