import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { parseBody, InlabCargaCheck } from "@/lib/schemas"
import { requireInlabUser, puedeAccederHospital } from "@/lib/inlab/access"
import { cargasConDias, diasYaCargados } from "@/lib/inlab/persist"
import { dateToDia, rangosContiguos } from "@/lib/inlab/dates"

// POST /api/inlab/cargas/check — antes de guardar: ¿fichero ya cargado (hash)? ¿días solapados?
export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "inlab-cargas-check", { limit: 30 })
    if (rl) return rl
    const user = await requireInlabUser()
    if (user instanceof NextResponse) return user

    const parsed = parseBody(InlabCargaCheck, await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: parsed.error.slice(0, 500) }, { status: 400 })
    const { hospitalId, hash, dias } = parsed.data
    if (!(await puedeAccederHospital(user, hospitalId))) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const [duplicado, solapados] = await Promise.all([
      db.inlabCarga.findFirst({
        where: { hospitalId, hash, estado: { not: "SUSTITUIDA" } },
        select: { id: true, fichero: true, creadoEn: true, usuario: { select: { nombre: true } } },
        orderBy: { creadoEn: "desc" },
      }),
      diasYaCargados(hospitalId, dias),
    ])
    const afectadas = await cargasConDias(hospitalId, solapados)

    return NextResponse.json({
      duplicado,
      diasSolapados: solapados.length,
      rangosSolapados: rangosContiguos(solapados).slice(0, 20),
      diasNuevos: dias.length - solapados.length,
      cargasAfectadas: afectadas.map(c => ({ ...c, desde: dateToDia(c.desde), hasta: dateToDia(c.hasta) })),
    })
  } catch (err) {
    console.error("[POST inlab/cargas/check]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
