import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get("tipo")
  const estado = searchParams.get("estado")
  const hospitalId = searchParams.get("hospitalId")
  const preProyectoId = searchParams.get("preProyectoId")
  const catalogoId = searchParams.get("catalogoId")
  const q = searchParams.get("q")
  try {
    const unidades = await db.hardwareUnidad.findMany({
      where: {
        ...(estado ? { estado: estado as never } : {}),
        ...(hospitalId ? { hospitalId } : {}),
        ...(preProyectoId ? { preProyectoId } : {}),
        ...(catalogoId ? { catalogoId } : {}),
        ...(tipo ? { catalogo: { tipo: tipo as never } } : {}),
        ...(q ? { OR: [
          { numSerie: { contains: q, mode: "insensitive" } },
          { catalogo: { modelo: { contains: q, mode: "insensitive" } } },
          { catalogo: { marca: { contains: q, mode: "insensitive" } } },
        ]} : {}),
      },
      include: {
        catalogo: true,
        hospital: { select: { id: true, nombre: true, ciudad: true } },
        preProyecto: { select: { id: true, titulo: true } },
      },
      orderBy: { creadoEn: "desc" },
    })
    const res = NextResponse.json(unidades)
    res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60")
    return res
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  const rol = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || (rol !== "ADMIN" && rol !== "PROYECTOS")) return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  try {
    const body = await req.json()

    // Bulk creation: array of units
    if (Array.isArray(body)) {
      if (body.length === 0) return NextResponse.json([], { status: 201 })
      if (!body.every((u) => u.catalogoId))
        return NextResponse.json({ error: "catalogoId requerido en todas las unidades" }, { status: 400 })
      const unidades = await Promise.all(
        body.map((item) =>
          db.hardwareUnidad.create({
            data: {
              catalogoId: item.catalogoId,
              numSerie: item.numSerie || null,
              estado: item.estado || "DISPONIBLE",
              hospitalId: item.hospitalId || null,
              preProyectoId: item.preProyectoId || null,
              fechaCompra: item.fechaCompra ? new Date(item.fechaCompra) : null,
              fechaGarantia: item.fechaGarantia ? new Date(item.fechaGarantia) : null,
              notas: item.notas || null,
            },
            include: { catalogo: true },
          })
        )
      )
      return NextResponse.json(unidades, { status: 201 })
    }

    // Single creation
    if (!body.catalogoId) return NextResponse.json({ error: "catalogoId requerido" }, { status: 400 })
    const unidad = await db.hardwareUnidad.create({
      data: {
        catalogoId: body.catalogoId,
        numSerie: body.numSerie || null,
        estado: body.estado || "DISPONIBLE",
        hospitalId: body.hospitalId || null,
        preProyectoId: body.preProyectoId || null,
        fechaCompra: body.fechaCompra ? new Date(body.fechaCompra) : null,
        fechaGarantia: body.fechaGarantia ? new Date(body.fechaGarantia) : null,
        notas: body.notas || null,
      },
      include: { catalogo: true },
    })
    return NextResponse.json(unidad, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// Bulk assignment: assign existing units to a project
export async function PUT(req: Request) {
  const session = await auth()
  const rol = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || (rol !== "ADMIN" && rol !== "PROYECTOS")) return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  try {
    const body = await req.json()
    const { ids, preProyectoId, hospitalId, estado } = body
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: "ids requerido" }, { status: 400 })
    await db.hardwareUnidad.updateMany({
      where: { id: { in: ids } },
      data: {
        ...(preProyectoId !== undefined ? { preProyectoId: preProyectoId || null } : {}),
        ...(hospitalId !== undefined ? { hospitalId: hospitalId || null } : {}),
        ...(estado ? { estado } : {}),
      },
    })
    const updated = await db.hardwareUnidad.findMany({
      where: { id: { in: ids } },
      include: { catalogo: true, hospital: { select: { id: true, nombre: true, ciudad: true } }, preProyecto: { select: { id: true, titulo: true } } },
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
