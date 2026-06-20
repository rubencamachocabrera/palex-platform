import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

// GET /api/usuarios/menciones?q=search — lightweight user search for @mentions
// Available to all authenticated users (not restricted to ADMIN)
export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "usuarios_menciones", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""

    const usuarios = await db.usuario.findMany({
      where: {
        activo: true,
        ...(q.length > 0 ? { nombre: { contains: q, mode: "insensitive" as const } } : {}),
      },
      select: {
        id: true,
        nombre: true,
        rol: true,
      },
      orderBy: { nombre: "asc" },
      take: 5,
    })

    const res = NextResponse.json(usuarios)
    res.headers.set("Cache-Control", "private, max-age=30")
    return res
  } catch (err) {
    console.error("[GET usuarios/menciones]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
