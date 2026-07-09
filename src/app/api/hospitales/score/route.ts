import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { computeHospitalScore } from "@/lib/hospital-score"

// GET /api/hospitales/score?ids=id1,id2 — batch scores for hospital list
export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "hospitales-score")
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const idsParam = req.nextUrl.searchParams.get("ids") ?? ""
    let ids = idsParam.split(",").map(s => s.trim()).filter(Boolean).slice(0, 50)

    if (!ids.length) return NextResponse.json({})

    if (session.user.role !== "ADMIN") {
      const permitidos = await db.hospital.findMany({
        where: { id: { in: ids }, zona: { usuarios: { some: { usuarioId: session.user.id } } } },
        select: { id: true },
      })
      const permitidosSet = new Set(permitidos.map(h => h.id))
      ids = ids.filter(id => permitidosSet.has(id))
      if (!ids.length) return NextResponse.json({})
    }

    const results = await Promise.all(
      ids.map(async id => {
        const score = await computeHospitalScore(id)
        return [id, { total: score.total, color: score.color, label: score.label }] as const
      })
    )

    return NextResponse.json(Object.fromEntries(results), {
      headers: { "Cache-Control": "private, max-age=120" },
    })
  } catch (err) {
    console.error("[GET hospitales/score]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
