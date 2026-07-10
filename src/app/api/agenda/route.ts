import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

// GET /api/agenda?desde=&hasta= — visitas + tareas + recordatorios del usuario en el rango
export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "/api/agenda")
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const userId = session.user.id
    const { searchParams } = req.nextUrl
    const desde = searchParams.get("desde")
    const hasta = searchParams.get("hasta")
    if (!desde || !hasta) return NextResponse.json({ error: "desde y hasta son obligatorios" }, { status: 400 })

    const rangoFecha = { gte: new Date(desde + "T00:00:00"), lte: new Date(hasta + "T23:59:59") }

    const [visitas, tareas, recordatorios] = await Promise.all([
      db.visita.findMany({
        where: { usuarioId: userId, fecha: rangoFecha },
        select: {
          id: true, titulo: true, tipo: true, estado: true, fecha: true,
          hospital: { select: { nombre: true } },
        },
        orderBy: { fecha: "asc" },
      }),
      db.tarea.findMany({
        where: { asignadoAId: userId, fechaVencimiento: rangoFecha, parentId: null },
        select: {
          id: true, titulo: true, estado: true, prioridad: true, fechaVencimiento: true,
          proyecto: { select: { id: true, titulo: true } },
        },
        orderBy: { fechaVencimiento: "asc" },
      }),
      db.recordatorio.findMany({
        where: { OR: [{ usuarioId: userId }, { asignadoAId: userId }], fecha: rangoFecha },
        select: { id: true, titulo: true, completado: true, fecha: true },
        orderBy: { fecha: "asc" },
      }),
    ])

    const items = [
      ...visitas.map(v => ({
        id: v.id, tipo: "visita" as const,
        titulo: v.titulo || v.hospital.nombre,
        subtitulo: v.hospital.nombre,
        fecha: v.fecha,
        estado: v.estado,
        href: `/visitas/${v.id}`,
      })),
      ...tareas.map(t => ({
        id: t.id, tipo: "tarea" as const,
        titulo: t.titulo,
        subtitulo: t.proyecto.titulo,
        fecha: t.fechaVencimiento!,
        estado: t.estado,
        href: `/proyectos/${t.proyecto.id}?tab=Tareas`,
      })),
      ...recordatorios.map(r => ({
        id: r.id, tipo: "recordatorio" as const,
        titulo: r.titulo,
        subtitulo: null,
        fecha: r.fecha,
        estado: r.completado ? "COMPLETADO" : "PENDIENTE",
        href: "/recordatorios",
      })),
    ].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

    const res = NextResponse.json(items)
    res.headers.set("Cache-Control", "private, max-age=30")
    return res
  } catch (err) {
    console.error("[GET /api/agenda]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
