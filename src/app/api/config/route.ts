import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

async function getOrCreateConfig() {
  let config = await db.configApp.findUnique({ where: { id: 1 } })
  if (!config) config = await db.configApp.create({ data: { id: 1, crmActivo: true } })
  return config
}

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
    const body = await req.json()
    await getOrCreateConfig()
    const data: Record<string, unknown> = {}
    if ("crmActivo" in body) data.crmActivo = Boolean(body.crmActivo)
    if ("incidenciasActivo" in body) data.incidenciasActivo = Boolean(body.incidenciasActivo)
    if ("scoringConfig" in body && body.scoringConfig !== null && typeof body.scoringConfig === "object") {
      data.scoringConfig = body.scoringConfig
    }
    const config = await db.configApp.update({ where: { id: 1 }, data })
    return NextResponse.json(config)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
