import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// Returns score statistics: avg for a given hospital + global avg
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const hospitalId = searchParams.get("hospitalId")

    // Use raw groupBy to avoid type issues before schema is pushed
    const [hospitalRows, globalRows] = await Promise.all([
      hospitalId
        ? db.$queryRaw<{ avg: number | null; count: bigint }[]>`
            SELECT AVG(score) as avg, COUNT(*) as count
            FROM visitas
            WHERE "hospitalId" = ${hospitalId} AND score IS NOT NULL
          `
        : Promise.resolve(null),
      db.$queryRaw<{ avg: number | null; count: bigint }[]>`
        SELECT AVG(score) as avg, COUNT(*) as count
        FROM visitas
        WHERE score IS NOT NULL
      `,
    ])

    const hospitalResult = hospitalRows?.[0] ?? null
    const globalResult = globalRows[0] ?? null

    return NextResponse.json({
      hospital: hospitalResult
        ? {
            avg: hospitalResult.avg !== null ? Math.round(Number(hospitalResult.avg)) : null,
            count: Number(hospitalResult.count),
          }
        : null,
      global: {
        avg: globalResult?.avg !== null ? Math.round(Number(globalResult?.avg ?? 0)) : null,
        count: Number(globalResult?.count ?? 0),
      },
    })
  } catch (err) {
    console.error("[GET /api/visitas/estadisticas]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
