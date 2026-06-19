import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 })

    const rl = checkRateLimit(req, "log-actividad")
    if (rl) return rl

    const url = new URL(req.url)
    const take = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200)
    const skip = parseInt(url.searchParams.get("offset") ?? "0")

    const [logs, total] = await Promise.all([
      db.logActividad.findMany({
        take,
        skip,
        orderBy: { creadoEn: "desc" },
        include: { usuario: { select: { id: true, nombre: true, rol: true } } },
      }),
      db.logActividad.count(),
    ])

    return NextResponse.json({ logs, total }, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (err) {
    console.error("[GET log-actividad]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
