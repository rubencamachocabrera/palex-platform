import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { cargarDataset, coberturaHospitales } from "@/lib/inlab/queries"
import { dateToDia } from "@/lib/inlab/dates"
import { filtrarPayloadPorAreas } from "@/lib/inlab/share"

// Tokens generados con randomBytes(24).toString("base64url") → 32 caracteres
const TOKEN_RE = /^[A-Za-z0-9_-]{16,100}$/

/**
 * GET /api/share/inlab/[token] — informe InLab público de solo lectura (sin auth, exento en middleware).
 *
 * El token es la única credencial. Solo devuelve agregados diarios del periodo y de las
 * work areas del enlace (recortados aquí, no en el cliente); tarifas solo si el enlace
 * incluye facturación y solo de los consumibles presentes. Nunca devuelve ids internos.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const rl = await checkRateLimit(req, "share-inlab", { limit: 30 })
    if (rl) return rl
    const { token } = await params
    if (!token || !TOKEN_RE.test(token)) return NextResponse.json({ error: "Enlace no válido" }, { status: 404 })

    const share = await db.inlabShare.findUnique({
      where: { token },
      select: {
        id: true, hospitalId: true, desde: true, hasta: true, incluirFacturacion: true, areas: true, expiraEn: true, revocado: true, creadoEn: true,
        hospital: { select: { nombre: true, ciudad: true, provincia: true, camas: true } },
      },
    })
    if (!share) return NextResponse.json({ error: "Enlace no válido" }, { status: 404 })
    // 410: el enlace existió. El token tiene 192 bits aleatorios, distinguirlo no da pistas útiles.
    if (share.revocado) return NextResponse.json({ error: "Este enlace ha sido revocado.", motivo: "revocado" }, { status: 410 })
    if (share.expiraEn && share.expiraEn < new Date()) {
      return NextResponse.json({ error: `Este enlace caducó el ${share.expiraEn.toLocaleDateString("es-ES")}.`, motivo: "caducado" }, { status: 410 })
    }

    const [cob] = await coberturaHospitales([share.hospitalId])
    if (!cob) return NextResponse.json({ error: "Este hospital todavía no tiene datos" }, { status: 404 })
    const desde = share.desde ? dateToDia(share.desde) : cob.desde
    const hasta = share.hasta ? dateToDia(share.hasta) : cob.hasta

    const [completo, tarifas] = await Promise.all([
      cargarDataset([share.hospitalId], desde, hasta),
      share.incluirFacturacion ? db.inlabTarifa.findMany({ where: { hospitalId: share.hospitalId } }) : Promise.resolve([]),
    ])
    const dataset = filtrarPayloadPorAreas(completo, share.areas)
    const consumibles = new Set(dataset.dic.consumibles)

    db.inlabShare.update({ where: { id: share.id }, data: { vistas: { increment: 1 }, ultimaVista: new Date() } }).catch(() => {})

    return NextResponse.json({
      hospital: share.hospital,
      desde, hasta,
      areas: share.areas,
      expiraEn: share.expiraEn?.toISOString() ?? null,
      creadoEn: share.creadoEn.toISOString(),
      generado: new Date().toISOString(),
      dataset,
      tarifas: tarifas.filter(t => consumibles.has(t.consumible)).map(t => ({
        consumible: t.consumible, precio: t.precio.toNumber(), moneda: t.moneda, unidad: t.unidad,
        vigenteDesde: t.vigenteDesde ? dateToDia(t.vigenteDesde) : null, vigenteHasta: t.vigenteHasta ? dateToDia(t.vigenteHasta) : null,
      })),
      incluirFacturacion: share.incluirFacturacion,
    }, { headers: { "Cache-Control": "private, max-age=60", "X-Robots-Tag": "noindex, nofollow" } })
  } catch (err) {
    console.error("[GET share/inlab/[token]]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
