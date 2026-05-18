import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

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
