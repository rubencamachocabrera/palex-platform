import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "tags", { limit: 60, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const tipo = req.nextUrl.searchParams.get("tipo")
    const where: Record<string, unknown> = {}
    if (tipo === "VISITA" || tipo === "PROYECTO") {
      where.tipo = tipo
    }

    const tags = await db.tag.findMany({
      where,
      include: {
        _count: {
          select: {
            visitas: true,
            proyectos: true,
          },
        },
      },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    })

    const res = NextResponse.json(tags)
    res.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=120")
    return res
  } catch (err) {
    console.error("[GET /api/tags]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    if ((session.user.role as string) !== "ADMIN")
      return NextResponse.json({ error: "Solo ADMIN puede crear tags" }, { status: 403 })

    const { nombre, color, tipo, orden } = await req.json()
    if (!nombre || !tipo) return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })
    if (tipo !== "VISITA" && tipo !== "PROYECTO")
      return NextResponse.json({ error: "Tipo debe ser VISITA o PROYECTO" }, { status: 400 })

    const tag = await db.tag.create({
      data: {
        nombre: String(nombre).trim(),
        color: color && typeof color === "string" ? color : "#00A99D",
        tipo,
        orden: typeof orden === "number" ? orden : 0,
      },
    })

    return NextResponse.json(tag, { status: 201 })
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Ya existe un tag con ese nombre y tipo" }, { status: 409 })
    }
    console.error("[POST /api/tags]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
