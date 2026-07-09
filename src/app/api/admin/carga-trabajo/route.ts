import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 })

    const rl = await checkRateLimit(req, "admin-carga-trabajo")
    if (rl) return rl

    const url = new URL(req.url)
    const mesParam = url.searchParams.get("mes")

    // Default to current month in YYYY-MM format
    const ahora = new Date()
    let anio: number
    let mes: number

    if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
      const [a, m] = mesParam.split("-").map(Number)
      anio = a
      mes = m
    } else {
      anio = ahora.getFullYear()
      mes = ahora.getMonth() + 1
    }

    const mesStr = `${anio}-${String(mes).padStart(2, "0")}`
    const inicio = new Date(anio, mes - 1, 1)
    const fin = new Date(anio, mes, 1) // first day of next month

    // Get all active users
    const usuarios = await db.usuario.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, rol: true },
      orderBy: { nombre: "asc" },
    })

    // Count visits per user per day using raw SQL for efficiency
    const visitas = await db.$queryRaw<
      { usuarioId: string; dia: number; count: bigint }[]
    >`
      SELECT "usuarioId",
             EXTRACT(DAY FROM fecha)::int as dia,
             COUNT(*)::bigint as count
      FROM visitas
      WHERE fecha >= ${inicio}
        AND fecha < ${fin}
      GROUP BY "usuarioId", EXTRACT(DAY FROM fecha)
      ORDER BY "usuarioId", dia
    `

    // Build lookup: usuarioId -> { day -> count }
    const diasMap = new Map<string, Record<string, number>>()
    const totalMap = new Map<string, number>()

    for (const row of visitas) {
      const uid = row.usuarioId
      if (!diasMap.has(uid)) diasMap.set(uid, {})
      const dias = diasMap.get(uid)!
      const cnt = Number(row.count)
      dias[String(row.dia)] = cnt
      totalMap.set(uid, (totalMap.get(uid) ?? 0) + cnt)
    }

    const resultado = usuarios.map(u => ({
      id: u.id,
      nombre: u.nombre,
      rol: u.rol,
      totalMes: totalMap.get(u.id) ?? 0,
      dias: diasMap.get(u.id) ?? {},
    }))

    return NextResponse.json(
      { mes: mesStr, usuarios: resultado },
      { headers: { "Cache-Control": "private, no-store" } }
    )
  } catch (err) {
    console.error("[GET admin/carga-trabajo]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
