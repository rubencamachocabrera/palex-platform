import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { requireInlabUser, puedeFacturacion, whereHospitalesAccesibles } from "@/lib/inlab/access"
import { coberturaHospitales } from "@/lib/inlab/queries"

// GET /api/inlab/hospitales — hospitales accesibles (para el asistente) + cobertura de datos cargados
export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "inlab-hospitales")
    if (rl) return rl
    const user = await requireInlabUser()
    if (user instanceof NextResponse) return user

    const todos = await db.hospital.findMany({
      where: whereHospitalesAccesibles(user),
      select: { id: true, nombre: true, ciudad: true, camas: true },
      orderBy: { nombre: "asc" },
      take: 1000,
    })
    const conDatos = await coberturaHospitales(todos.map(h => h.id))

    return NextResponse.json(
      { todos, conDatos, puedeFacturacion: puedeFacturacion(user) },
      { headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (err) {
    console.error("[GET inlab/hospitales]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
