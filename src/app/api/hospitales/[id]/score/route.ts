import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { computeHospitalScore } from "@/lib/hospital-score"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = checkRateLimit(req, "hospitales-score-id")
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id } = await params
    const score = await computeHospitalScore(id)

    return NextResponse.json(score, {
      headers: { "Cache-Control": "private, max-age=120" },
    })
  } catch (err) {
    console.error("[GET hospitales/[id]/score]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
