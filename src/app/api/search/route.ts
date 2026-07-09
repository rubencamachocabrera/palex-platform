import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "/api/search")
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    let q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
    if (q.length > 100) q = q.slice(0, 100)
    const rol = session.user.role
    const userId = session.user.id

    if (q.length < 2) return NextResponse.json({ hospitales: [], visitas: [], proyectos: [] })

    const [hospitales, visitas, proyectos] = await Promise.all([
      db.hospital.findMany({
        where: {
          ...(rol === "ADMIN" ? {} : {
            activo: true,
            zona: { usuarios: { some: { usuarioId: userId } } },
          }),
          OR: [
            { nombre: { contains: q, mode: "insensitive" } },
            { ciudad: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true, nombre: true, ciudad: true,
          zona: { select: { nombre: true } },
          grupo: { select: { id: true, nombre: true } },
          centros: { select: { id: true, nombre: true }, where: { activo: true }, take: 5 },
        },
        take: 5,
        orderBy: { nombre: "asc" },
      }),
      db.visita.findMany({
        where: {
          ...(rol === "ADMIN" ? {} : { usuarioId: userId }),
          OR: [
            { titulo: { contains: q, mode: "insensitive" } },
            { hospital: { nombre: { contains: q, mode: "insensitive" } } },
            { hospital: { ciudad: { contains: q, mode: "insensitive" } } },
          ],
        },
        select: { id: true, titulo: true, estado: true, fecha: true, hospital: { select: { nombre: true } } },
        take: 4,
        orderBy: { fecha: "desc" },
      }),
      db.proyecto.findMany({
        where: {
          ...(rol !== "ADMIN" ? { responsableId: userId } : {}),
          OR: [
            { titulo: { contains: q, mode: "insensitive" } },
            { hospital: { nombre: { contains: q, mode: "insensitive" } } },
          ],
        },
        select: {
          id: true, titulo: true, estado: true,
          hospital: { select: { nombre: true, ciudad: true } },
        },
        take: 4,
        orderBy: { editadoEn: "desc" },
      }),
    ])

    const res = NextResponse.json({ hospitales, visitas, proyectos })
    res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60")
    return res
  } catch (err) {
    console.error("[GET /api/search]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
