import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { requireInlabUser, filtrarHospitalesAccesibles } from "@/lib/inlab/access"
import { cargarDataset } from "@/lib/inlab/queries"
import { diffDias, esDiaValido } from "@/lib/inlab/dates"
import { LIMITES } from "@/lib/inlab/types"

// GET /api/inlab/datos?hospitalIds=a,b&desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// Devuelve los agregados diarios del rango en formato compacto (InlabPayload).
export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "inlab-datos")
    if (rl) return rl
    const user = await requireInlabUser()
    if (user instanceof NextResponse) return user

    const sp = req.nextUrl.searchParams
    const ids = (sp.get("hospitalIds") ?? "").split(",").map(s => s.trim()).filter(Boolean).slice(0, 20)
    const desde = sp.get("desde") ?? ""
    const hasta = sp.get("hasta") ?? ""
    if (ids.length === 0) return NextResponse.json({ error: "hospitalIds requerido" }, { status: 400 })
    if (!esDiaValido(desde) || !esDiaValido(hasta) || desde > hasta) return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 })
    if (diffDias(desde, hasta) > LIMITES.maxDias) return NextResponse.json({ error: "Rango demasiado amplio" }, { status: 400 })

    const permitidos = await filtrarHospitalesAccesibles(user, ids)
    if (permitidos.length !== ids.length) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const dataset = await cargarDataset(permitidos, desde, hasta)
    return NextResponse.json(dataset, { headers: { "Cache-Control": "private, max-age=30" } })
  } catch (err) {
    console.error("[GET inlab/datos]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
