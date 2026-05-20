import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const adjuntos = await db.adjunto.findMany({
      where: { preProyectoId: id },
      select: { id: true, nombre: true, tipo: true, tamano: true, creadoPor: true, creadoEn: true },
      orderBy: { creadoEn: "desc" },
    })
    return NextResponse.json(adjuntos)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  try {
    const fd = await req.formData()
    const file = fd.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "El archivo no puede superar 10 MB" }, { status: 400 })
    const buffer = await file.arrayBuffer()
    const contenido = Buffer.from(buffer).toString("base64")
    const adjunto = await db.adjunto.create({
      data: {
        preProyectoId: id,
        nombre: file.name,
        tipo: file.type || "application/octet-stream",
        tamano: file.size,
        contenido,
        creadoPor: (session.user as { name?: string }).name ?? "—",
      },
      select: { id: true, nombre: true, tipo: true, tamano: true, creadoPor: true, creadoEn: true },
    })
    return NextResponse.json(adjunto, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
