import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

async function getOrCreateConfig() {
  let config = await db.configApp.findUnique({ where: { id: 1 } })
  if (!config) config = await db.configApp.create({ data: { id: 1, crmActivo: true } })
  return config
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  try {
    const config = await getOrCreateConfig()
    return NextResponse.json(config)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  try {
    const body = await req.json()
    await getOrCreateConfig()
    const config = await db.configApp.update({
      where: { id: 1 },
      data: { crmActivo: body.crmActivo },
    })
    return NextResponse.json(config)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
