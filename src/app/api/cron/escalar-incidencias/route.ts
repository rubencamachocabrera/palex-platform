import { NextRequest, NextResponse } from "next/server"
import { createHash, timingSafeEqual } from "crypto"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

function secretsMatch(recibido: string, esperado: string): boolean {
  const a = createHash("sha256").update(recibido).digest()
  const b = createHash("sha256").update(esperado).digest()
  return timingSafeEqual(a, b)
}

// GET /api/cron/escalar-incidencias — pensado para ser golpeado por un cron externo
// (Railway no tiene cron nativo). Configurar CRON_SECRET y llamar cada 15-30 min con
// header "x-cron-secret" o query "?secret=".
export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "cron-escalar-incidencias", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const secretEsperado = process.env.CRON_SECRET
    if (!secretEsperado) {
      return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 503 })
    }
    const secretRecibido = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret")
    if (!secretRecibido || !secretsMatch(secretRecibido, secretEsperado)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const hace4h = new Date(Date.now() - 4 * 60 * 60 * 1000)

    const candidatas = await db.incidencia.findMany({
      where: {
        prioridad: "CRITICA",
        asignadoAId: null,
        estado: { notIn: ["RESUELTA", "CERRADA"] },
        creadoEn: { lt: hace4h },
      },
      select: { id: true, codigo: true, reportadoPorId: true },
    })

    if (candidatas.length === 0) {
      return NextResponse.json({ escaladas: 0, ids: [] })
    }

    const yaEscaladas = await db.eventoIncidencia.findMany({
      where: { tipo: "ESCALADO", incidenciaId: { in: candidatas.map(c => c.id) } },
      select: { incidenciaId: true },
    })
    const yaEscaladasSet = new Set(yaEscaladas.map(e => e.incidenciaId))
    const porEscalar = candidatas.filter(c => !yaEscaladasSet.has(c.id))

    if (porEscalar.length === 0) {
      return NextResponse.json({ escaladas: 0, ids: [] })
    }

    await db.eventoIncidencia.createMany({
      data: porEscalar.map(c => ({
        incidenciaId: c.id,
        autorId: c.reportadoPorId,
        tipo: "ESCALADO" as const,
        descripcion: `Escalado automático: incidencia CRÍTICA sin asignar durante más de 4 horas`,
      })),
    })

    return NextResponse.json({ escaladas: porEscalar.length, ids: porEscalar.map(c => c.codigo) })
  } catch (err) {
    console.error("[GET cron/escalar-incidencias]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
