import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, "/api/plantillas")
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const tipo = req.nextUrl.searchParams.get("tipo")
  const all = tipo === "all"
  try {
    const plantillas = await db.plantillaVisita.findMany({
      where: {
        ...(all ? {} : { activa: true }),
        ...(tipo && !all ? { tipo } : {}),
      },
      orderBy: { creadoEn: "asc" },
    })
    return NextResponse.json(plantillas)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "/api/plantillas", { limit: 30 })
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Prohibido" }, { status: 403 })
  try {
    const body = await req.json()
    const { nombre, descripcion, tipo, datos } = body
    if (!nombre?.trim()) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 })
    const plantilla = await db.plantillaVisita.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        tipo: tipo ?? "PROYECTOS",
        datos: datos ?? {},
      },
    })
    return NextResponse.json(plantilla, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
