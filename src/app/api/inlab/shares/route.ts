import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { logActividad } from "@/lib/log-actividad"
import { parseBody, InlabShareCreate } from "@/lib/schemas"
import { requireInlabUser, puedeAccederHospital, puedeFacturacion } from "@/lib/inlab/access"
import { dateToDia, diaToDate } from "@/lib/inlab/dates"

type ShareRow = { id: string; token: string; hospitalId: string; desde: Date | null; hasta: Date | null; incluirFacturacion: boolean; areas: string[]; expiraEn: Date | null; revocado: boolean; vistas: number; ultimaVista: Date | null; creadoEn: Date; creadoPor?: { nombre: string } }
const serializar = (s: ShareRow) => ({
  ...s,
  desde: s.desde ? dateToDia(s.desde) : null,
  hasta: s.hasta ? dateToDia(s.hasta) : null,
})

// GET /api/inlab/shares?hospitalId=X — enlaces públicos del hospital
export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "inlab-shares")
    if (rl) return rl
    const user = await requireInlabUser()
    if (user instanceof NextResponse) return user
    const hospitalId = req.nextUrl.searchParams.get("hospitalId") ?? ""
    if (!hospitalId) return NextResponse.json({ error: "hospitalId requerido" }, { status: 400 })
    if (!(await puedeAccederHospital(user, hospitalId))) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const shares = await db.inlabShare.findMany({
      where: { hospitalId },
      include: { creadoPor: { select: { nombre: true } } },
      orderBy: { creadoEn: "desc" },
      take: 50,
    })
    return NextResponse.json(shares.map(serializar), { headers: { "Cache-Control": "private, no-store" } })
  } catch (err) {
    console.error("[GET inlab/shares]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST /api/inlab/shares — crea un enlace público de solo lectura
export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "inlab-shares-post", { limit: 10, windowMs: 3_600_000 })
    if (rl) return rl
    const user = await requireInlabUser()
    if (user instanceof NextResponse) return user

    const parsed = parseBody(InlabShareCreate, await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { hospitalId, desde, hasta, incluirFacturacion, expiraDias } = parsed.data
    // Vacío = todas las áreas (también las de cargas futuras)
    const areas = [...new Set(parsed.data.areas ?? [])].sort((a, b) => a.localeCompare(b, "es"))
    if (!(await puedeAccederHospital(user, hospitalId))) return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    if (desde && hasta && desde > hasta) return NextResponse.json({ error: "Rango inválido" }, { status: 400 })
    if (incluirFacturacion && !puedeFacturacion(user)) return NextResponse.json({ error: "Sin permiso para compartir facturación" }, { status: 403 })

    const share = await db.inlabShare.create({
      data: {
        token: randomBytes(24).toString("base64url"),
        hospitalId,
        creadoPorId: user.id,
        desde: desde ? diaToDate(desde) : null,
        hasta: hasta ? diaToDate(hasta) : null,
        incluirFacturacion: !!incluirFacturacion,
        areas,
        expiraEn: expiraDias ? new Date(Date.now() + expiraDias * 86_400_000) : null,
      },
      include: { creadoPor: { select: { nombre: true } } },
    })
    await logActividad(user.id, "CREAR", "InlabShare", share.id, `Enlace público InLab ${desde ?? "inicio"} → ${hasta ?? "fin"} · ${areas.length ? `${areas.length} áreas` : "todas las áreas"}${incluirFacturacion ? " · con facturación" : ""}`)
    return NextResponse.json(serializar(share), { status: 201 })
  } catch (err) {
    console.error("[POST inlab/shares]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
