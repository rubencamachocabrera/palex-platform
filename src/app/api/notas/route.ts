import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import { z } from "zod"
import { parseBody } from "@/lib/schemas"

const NotaCreate = z.object({
  texto: z.string().min(1).max(5000),
  mencionIds: z.array(z.string().min(1).max(100)).max(20).optional(),
  fijada: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "notas-get", { limit: 60, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { searchParams } = req.nextUrl
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200)
    const offset = parseInt(searchParams.get("offset") ?? "0")

    const [notas, total] = await Promise.all([
      db.notaEquipo.findMany({
        take: limit,
        skip: offset,
        orderBy: [{ fijada: "desc" }, { creadoEn: "desc" }],
        include: { autor: { select: { id: true, nombre: true, rol: true } } },
      }),
      db.notaEquipo.count(),
    ])

    const res = NextResponse.json({ notas, total })
    res.headers.set("Cache-Control", "no-store")
    return res
  } catch (err) {
    console.error("[GET /api/notas]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "notas-post", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const body = await req.json()
    const parsed = parseBody(NotaCreate, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const { texto, mencionIds, fijada } = parsed.data

    const nota = await db.notaEquipo.create({
      data: {
        texto,
        autorId: session.user.id,
        mencionIds: mencionIds ?? [],
        fijada: fijada ?? false,
      },
      include: { autor: { select: { id: true, nombre: true, rol: true } } },
    })

    return NextResponse.json(nota, { status: 201 })
  } catch (err) {
    console.error("[POST /api/notas]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
