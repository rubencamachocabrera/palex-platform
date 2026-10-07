import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { cargarDataset, coberturaHospitales } from "@/lib/inlab/queries"
import { dateToDia } from "@/lib/inlab/dates"

// GET /api/share/inlab/[token] — informe InLab público de solo lectura (sin auth, exento en middleware)
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const rl = await checkRateLimit(req, "share-inlab", { limit: 30 })
    if (rl) return rl
    const { token } = await params
    if (!token || token.length > 100) return NextResponse.json({ error: "Enlace no válido" }, { status: 404 })

    const share = await db.inlabShare.findUnique({
      where: { token },
      select: {
        id: true, hospitalId: true, desde: true, hasta: true, incluirFacturacion: true, expiraEn: true, revocado: true, creadoEn: true,
        hospital: { select: { nombre: true, ciudad: true, provincia: true, camas: true } },
      },
    })
    if (!share || share.revocado || (share.expiraEn && share.expiraEn < new Date())) {
      return NextResponse.json({ error: "Enlace no válido, revocado o caducado" }, { status: 404 })
    }

    const [cob] = await coberturaHospitales([share.hospitalId])
    if (!cob) return NextResponse.json({ error: "Este hospital todavía no tiene datos" }, { status: 404 })
    const desde = share.desde ? dateToDia(share.desde) : cob.desde
    const hasta = share.hasta ? dateToDia(share.hasta) : cob.hasta

    const [dataset, tarifas] = await Promise.all([
      cargarDataset([share.hospitalId], desde, hasta),
      share.incluirFacturacion ? db.inlabTarifa.findMany({ where: { hospitalId: share.hospitalId } }) : Promise.resolve([]),
    ])

    db.inlabShare.update({ where: { id: share.id }, data: { vistas: { increment: 1 }, ultimaVista: new Date() } }).catch(() => {})

    return NextResponse.json({
      hospital: share.hospital,
      desde, hasta,
      generado: new Date().toISOString(),
      dataset,
      tarifas: tarifas.map(t => ({
        consumible: t.consumible, precio: t.precio.toNumber(), moneda: t.moneda, unidad: t.unidad,
        vigenteDesde: t.vigenteDesde ? dateToDia(t.vigenteDesde) : null, vigenteHasta: t.vigenteHasta ? dateToDia(t.vigenteHasta) : null,
      })),
      incluirFacturacion: share.incluirFacturacion,
    }, { headers: { "Cache-Control": "private, max-age=60", "X-Robots-Tag": "noindex" } })
  } catch (err) {
    console.error("[GET share/inlab/[token]]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
