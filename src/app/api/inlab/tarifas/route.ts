import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { logActividad } from "@/lib/log-actividad"
import { parseBody, InlabTarifasUpsert } from "@/lib/schemas"
import { requireInlabUser, puedeAccederHospital, filtrarHospitalesAccesibles } from "@/lib/inlab/access"
import { dateToDia, diaToDate } from "@/lib/inlab/dates"

function serializar(t: { id: string; hospitalId: string; consumible: string; precio: { toNumber(): number }; moneda: string; unidad: string | null; vigenteDesde: Date | null; vigenteHasta: Date | null }) {
  return {
    id: t.id, hospitalId: t.hospitalId, consumible: t.consumible, precio: t.precio.toNumber(), moneda: t.moneda, unidad: t.unidad,
    vigenteDesde: t.vigenteDesde ? dateToDia(t.vigenteDesde) : null, vigenteHasta: t.vigenteHasta ? dateToDia(t.vigenteHasta) : null,
  }
}

// GET /api/inlab/tarifas?hospitalIds=a,b — tarifas de facturación (ADMIN/VENTAS)
export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "inlab-tarifas")
    if (rl) return rl
    const user = await requireInlabUser({ facturacion: true })
    if (user instanceof NextResponse) return user
    const ids = (req.nextUrl.searchParams.get("hospitalIds") ?? req.nextUrl.searchParams.get("hospitalId") ?? "")
      .split(",").map(s => s.trim()).filter(Boolean).slice(0, 20)
    if (ids.length === 0) return NextResponse.json({ error: "hospitalId requerido" }, { status: 400 })
    const permitidos = await filtrarHospitalesAccesibles(user, ids)
    if (permitidos.length !== ids.length) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const tarifas = await db.inlabTarifa.findMany({ where: { hospitalId: { in: permitidos } }, orderBy: [{ hospitalId: "asc" }, { consumible: "asc" }] })
    return NextResponse.json(tarifas.map(serializar), { headers: { "Cache-Control": "private, no-store" } })
  } catch (err) {
    console.error("[GET inlab/tarifas]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// PUT /api/inlab/tarifas — reemplaza la tabla de tarifas de un hospital (transacción)
export async function PUT(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "inlab-tarifas-put", { limit: 30 })
    if (rl) return rl
    const user = await requireInlabUser({ facturacion: true })
    if (user instanceof NextResponse) return user

    const parsed = parseBody(InlabTarifasUpsert, await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { hospitalId, tarifas } = parsed.data
    if (!(await puedeAccederHospital(user, hospitalId))) return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    for (const t of tarifas) {
      if (t.vigenteDesde && t.vigenteHasta && t.vigenteDesde > t.vigenteHasta) {
        return NextResponse.json({ error: `Vigencia inválida en "${t.consumible}"` }, { status: 400 })
      }
    }

    const guardadas = await db.$transaction(async tx => {
      await tx.inlabTarifa.deleteMany({ where: { hospitalId } })
      if (tarifas.length > 0) {
        await tx.inlabTarifa.createMany({
          data: tarifas.map(t => ({
            hospitalId, consumible: t.consumible.trim(), precio: t.precio, moneda: t.moneda.toUpperCase(), unidad: t.unidad ?? null,
            vigenteDesde: t.vigenteDesde ? diaToDate(t.vigenteDesde) : null, vigenteHasta: t.vigenteHasta ? diaToDate(t.vigenteHasta) : null,
          })),
        })
      }
      return tx.inlabTarifa.findMany({ where: { hospitalId }, orderBy: { consumible: "asc" } })
    })
    await logActividad(user.id, "EDITAR", "InlabTarifa", hospitalId, `${tarifas.length} tarifas`)
    return NextResponse.json(guardadas.map(serializar))
  } catch (err) {
    console.error("[PUT inlab/tarifas]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
