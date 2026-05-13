import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const userId = session.user.id
    const rol = session.user.role
    const now = new Date()
    const hace7dias = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const hace48h = new Date(now.getTime() - 48 * 60 * 60 * 1000)

    const [opsInactivas, visitasBorrador] = await Promise.all([
      db.oportunidad.findMany({
        where: {
          ...(rol === "ADMIN" ? {} : { usuarioId: userId }),
          etapa: { notIn: ["GANADO", "PERDIDO"] },
          editadoEn: { lt: hace7dias },
        },
        select: { id: true, titulo: true, editadoEn: true, etapa: true },
        orderBy: { editadoEn: "asc" },
        take: 10,
      }),
      db.visita.findMany({
        where: {
          usuarioId: userId,
          estado: "BORRADOR",
          editadoEn: { lt: hace48h },
        },
        select: { id: true, editadoEn: true, hospital: { select: { nombre: true } } },
        orderBy: { editadoEn: "asc" },
        take: 10,
      }),
    ])

    const items = [
      ...opsInactivas.map(op => ({
        tipo: "oportunidad_inactiva" as const,
        id: op.id,
        titulo: op.titulo,
        href: "/ventas/pipeline",
        mensaje: `Sin actividad desde ${new Date(op.editadoEn).toLocaleDateString("es-ES")}`,
      })),
      ...visitasBorrador.map(v => ({
        tipo: "visita_borrador" as const,
        id: v.id,
        titulo: v.hospital.nombre,
        href: `/visitas/${v.id}`,
        mensaje: `Borrador pendiente desde ${new Date(v.editadoEn).toLocaleDateString("es-ES")}`,
      })),
    ]

    const res = NextResponse.json({ total: items.length, items })
    res.headers.set("Cache-Control", "private, max-age=120, stale-while-revalidate=60")
    return res
  } catch (err) {
    console.error("[GET notificaciones]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
