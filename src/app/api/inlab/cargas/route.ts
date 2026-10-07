import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { logActividad } from "@/lib/log-actividad"
import { parseBody, InlabCargaCreate, validarIndicesPayload } from "@/lib/schemas"
import { requireInlabUser, puedeAccederHospital, filtrarHospitalesAccesibles } from "@/lib/inlab/access"
import { persistirCarga, SinDiasNuevosError, SolapeError } from "@/lib/inlab/persist"
import { LIMITES, type InlabPayload } from "@/lib/inlab/types"
import { dateToDia } from "@/lib/inlab/dates"

// GET /api/inlab/cargas?hospitalId=X — histórico de cargas de un hospital (o de todos los accesibles)
export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "inlab-cargas")
    if (rl) return rl
    const user = await requireInlabUser()
    if (user instanceof NextResponse) return user

    const hospitalIds = (req.nextUrl.searchParams.get("hospitalIds") ?? req.nextUrl.searchParams.get("hospitalId") ?? "")
      .split(",").map(s => s.trim()).filter(Boolean).slice(0, 20)
    if (hospitalIds.length === 0) return NextResponse.json({ error: "hospitalId requerido" }, { status: 400 })
    const permitidos = await filtrarHospitalesAccesibles(user, hospitalIds)
    if (permitidos.length !== hospitalIds.length) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const cargas = await db.inlabCarga.findMany({
      where: { hospitalId: { in: permitidos } },
      select: {
        id: true, hospitalId: true, fichero: true, tamanoBytes: true, desde: true, hasta: true, filas: true,
        filasValidas: true, filasDescartadas: true, dias: true, diasSustituidos: true, diasOmitidos: true,
        modo: true, estado: true, avisos: true, creadoEn: true, usuarioId: true,
        usuario: { select: { nombre: true } },
        hospital: { select: { nombre: true } },
      },
      orderBy: { creadoEn: "desc" },
      take: 200,
    })
    return NextResponse.json(
      cargas.map(c => ({ ...c, desde: dateToDia(c.desde), hasta: dateToDia(c.hasta), puedeBorrar: user.role === "ADMIN" || c.usuarioId === user.id })),
      { headers: { "Cache-Control": "private, no-store" } },
    )
  } catch (err) {
    console.error("[GET inlab/cargas]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST /api/inlab/cargas — guarda los AGREGADOS de un fichero procesado en el navegador
export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "inlab-cargas-post", { limit: 10 })
    if (rl) return rl
    const user = await requireInlabUser()
    if (user instanceof NextResponse) return user

    const len = Number(req.headers.get("content-length") ?? 0)
    if (len > LIMITES.maxBodyBytes) return NextResponse.json({ error: "Los agregados superan el tamaño máximo permitido" }, { status: 413 })
    const raw = await req.text()
    if (raw.length > LIMITES.maxBodyBytes) return NextResponse.json({ error: "Los agregados superan el tamaño máximo permitido" }, { status: 413 })
    let json: unknown
    try { json = JSON.parse(raw) } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

    const parsed = parseBody(InlabCargaCreate, json)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.slice(0, 500) }, { status: 400 })
    const body = parsed.data
    const errIdx = validarIndicesPayload(body.payload)
    if (errIdx) return NextResponse.json({ error: errIdx }, { status: 400 })

    if (!(await puedeAccederHospital(user, body.hospitalId))) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    try {
      const res = await persistirCarga({
        hospitalId: body.hospitalId,
        usuarioId: user.id,
        modo: body.modo,
        meta: body.meta,
        mapeo: body.mapeo,
        opciones: body.opciones,
        payload: body.payload as InlabPayload,
      })

      if (body.guardarMapeo) {
        await db.inlabMapeo.upsert({
          where: { hospitalId: body.hospitalId },
          create: { hospitalId: body.hospitalId, mapeo: body.mapeo as Prisma.InputJsonValue, opciones: body.opciones as Prisma.InputJsonValue, usuarioId: user.id },
          update: { mapeo: body.mapeo as Prisma.InputJsonValue, opciones: body.opciones as Prisma.InputJsonValue, usuarioId: user.id },
        })
      }
      await logActividad(user.id, "CREAR", "InlabCarga", res.id, `${body.meta.fichero} · ${res.dias} días (${body.modo})`)
      return NextResponse.json(res, { status: 201 })
    } catch (e) {
      if (e instanceof SolapeError) return NextResponse.json({ error: "La carga solapa días ya cargados", diasSolapados: e.dias }, { status: 409 })
      if (e instanceof SinDiasNuevosError) return NextResponse.json({ error: e.message }, { status: 409 })
      const code = (e as { code?: string })?.code
      if (code === "P2034") return NextResponse.json({ error: "Otra carga del mismo hospital se está guardando. Inténtalo de nuevo." }, { status: 409 })
      throw e
    }
  } catch (err) {
    console.error("[POST inlab/cargas]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
