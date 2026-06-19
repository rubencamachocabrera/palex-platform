import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    // ?admin=1 — gestión completa (todos los módulos + conteo), solo ADMIN
    const adminView = req.nextUrl.searchParams.get("admin") === "1"
    if (adminView && session.user.role === "ADMIN") {
      const modulos = await db.moduloInlab.findMany({
        orderBy: { nombre: "asc" },
        include: { _count: { select: { proyectoModulos: true } } },
      })
      return NextResponse.json(modulos)
    }

    // Vista normal: solo módulos activos (usada en formularios de proyecto)
    const modulos = await db.moduloInlab.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    })
    const res = NextResponse.json(modulos)
    res.headers.set("Cache-Control", "private, max-age=300, stale-while-revalidate=600")
    return res
  } catch (err) {
    console.error("[GET /api/modulos-inlab]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const { nombre } = await req.json()
    if (!nombre?.trim())
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })

    const modulo = await db.moduloInlab.create({ data: { nombre: nombre.trim() } })
    return NextResponse.json(modulo, { status: 201 })
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002")
      return NextResponse.json({ error: "Ya existe un módulo con ese nombre" }, { status: 409 })
    console.error("[POST /api/modulos-inlab]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
