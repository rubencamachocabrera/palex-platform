import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { getConfigApp as getOrCreateConfig } from "@/lib/config-app"

export async function GET(req: NextRequest) {
  const rl = await checkRateLimit(req, "/api/config")
  if (rl) return rl

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  try {
    const config = await getOrCreateConfig()
    return NextResponse.json(config)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const rl = await checkRateLimit(req, "/api/config", { limit: 30 })
  if (rl) return rl

  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Body invalido" }, { status: 400 })
    }
    await getOrCreateConfig()
    const data: Record<string, unknown> = {}
    // Whitelist de toggles de modulo: solo booleanos reales
    for (const key of ["crmActivo", "incidenciasActivo", "analiticaActivo"] as const) {
      if (!(key in body)) continue
      if (typeof body[key] !== "boolean") {
        return NextResponse.json({ error: `${key} debe ser booleano` }, { status: 400 })
      }
      data[key] = body[key]
    }
    if ("scoringConfig" in body && body.scoringConfig !== null && typeof body.scoringConfig === "object") {
      data.scoringConfig = body.scoringConfig
    }
    const config = await db.configApp.update({ where: { id: 1 }, data })
    return NextResponse.json(config)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
