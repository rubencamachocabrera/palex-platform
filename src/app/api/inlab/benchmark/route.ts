import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { requireInlabUser, whereHospitalesAccesibles } from "@/lib/inlab/access"
import { benchmark } from "@/lib/inlab/queries"
import { diffDias, esDiaValido } from "@/lib/inlab/dates"
import { LIMITES } from "@/lib/inlab/types"

// GET /api/inlab/benchmark?desde=&hasta= — comparativa entre todos los hospitales accesibles con datos
export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "inlab-benchmark")
    if (rl) return rl
    const user = await requireInlabUser()
    if (user instanceof NextResponse) return user

    const sp = req.nextUrl.searchParams
    const desde = sp.get("desde") ?? ""
    const hasta = sp.get("hasta") ?? ""
    if (!esDiaValido(desde) || !esDiaValido(hasta) || desde > hasta) return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 })
    if (diffDias(desde, hasta) > LIMITES.maxDias) return NextResponse.json({ error: "Rango demasiado amplio" }, { status: 400 })

    const hospitales = await db.hospital.findMany({
      where: { ...whereHospitalesAccesibles(user), inlabCargas: { some: {} } },
      select: { id: true, nombre: true, ciudad: true, camas: true },
    })
    const filas = await benchmark(hospitales.map(h => h.id), desde, hasta)
    const info = new Map(hospitales.map(h => [h.id, h]))
    return NextResponse.json(
      { filas: filas.map(f => ({ ...f, nombre: info.get(f.hospitalId)?.nombre ?? "", ciudad: info.get(f.hospitalId)?.ciudad ?? "", camas: info.get(f.hospitalId)?.camas ?? null })) },
      { headers: { "Cache-Control": "private, max-age=60" } },
    )
  } catch (err) {
    console.error("[GET inlab/benchmark]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
