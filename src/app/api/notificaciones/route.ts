import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

export async function GET(_req: NextRequest) {
  try {
    const rl = checkRateLimit(_req, "/api/notificaciones")
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const userId = session.user.id
    const rol = session.user.role
    const now = new Date()
    const hace7dias = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const hace48h = new Date(now.getTime() - 48 * 60 * 60 * 1000)

    const hace30dias = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const en7dias = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const [opsInactivas, visitasBorrador, fasesRetrasadas, proyectosPorVencer, tareasRetrasadas, mencionesRecientes, recordatoriosPendientes, hwGarantiaVencida, hwMantenimientoVencido] = await Promise.all([
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
      db.faseProyecto.findMany({
        where: {
          fechaPlan: { lt: now },
          estado: { not: "COMPLETADO" },
          proyecto: {
            estado: { notIn: ["COMPLETADO", "CANCELADO"] },
            ...(rol === "ADMIN" ? {} : { responsableId: userId }),
          },
        },
        select: {
          id: true,
          nombre: true,
          fechaPlan: true,
          proyecto: { select: { id: true, titulo: true } },
        },
        orderBy: { fechaPlan: "asc" },
        take: 10,
      }),
      db.proyecto.findMany({
        where: {
          fechaFinPlan: { lte: en7dias, gte: now },
          estado: { notIn: ["COMPLETADO", "CANCELADO"] },
          ...(rol === "ADMIN" ? {} : { responsableId: userId }),
        },
        select: { id: true, titulo: true, fechaFinPlan: true },
        orderBy: { fechaFinPlan: "asc" },
        take: 5,
      }),
      db.tarea.findMany({
        where: {
          fechaVencimiento: { lt: now },
          estado: { notIn: ["COMPLETADA", "CANCELADA"] },
          parentId: null,
          proyecto: {
            estado: { notIn: ["COMPLETADO", "CANCELADO"] },
            ...(rol === "ADMIN" ? {} : { responsableId: userId }),
          },
        },
        select: {
          id: true, titulo: true, fechaVencimiento: true,
          proyecto: { select: { id: true, titulo: true } },
        },
        orderBy: { fechaVencimiento: "asc" },
        take: 8,
      }),
      // Mentions: comments from last 7 days where current user is mentioned
      db.comentario.findMany({
        where: {
          mencionIds: { array_contains: [userId] },
          autorId: { not: userId },
          creadoEn: { gte: hace7dias },
        },
        select: {
          id: true,
          autorNombre: true,
          creadoEn: true,
          visitaId: true,
          proyectoId: true,
          visita: { select: { id: true, hospital: { select: { nombre: true } } } },
          proyecto: { select: { id: true, titulo: true } },
        },
        orderBy: { creadoEn: "desc" },
        take: 10,
      }),
      // Recordatorios: due/overdue, not completed, user's own
      db.recordatorio.findMany({
        where: {
          usuarioId: userId,
          completado: false,
          fecha: { lte: now },
        },
        select: { id: true, titulo: true, fecha: true },
        orderBy: { fecha: "asc" },
        take: 5,
      }),
      // Hardware: warranty expired (ADMIN only)
      rol === "ADMIN"
        ? db.hardwareUnidad.findMany({
            where: {
              fechaGarantia: { lt: now },
              estado: { notIn: ["BAJA", "RETIRADO"] },
            },
            select: {
              id: true, fechaGarantia: true,
              catalogo: { select: { marca: true, modelo: true } },
              hospital: { select: { nombre: true } },
            },
            orderBy: { fechaGarantia: "asc" },
            take: 5,
          })
        : Promise.resolve([]),
      // Hardware: maintenance overdue (ADMIN only)
      rol === "ADMIN"
        ? db.hardwareUnidad.findMany({
            where: {
              proximoMantenimiento: { lt: now },
              estado: { notIn: ["BAJA", "RETIRADO"] },
            },
            select: {
              id: true, proximoMantenimiento: true,
              catalogo: { select: { marca: true, modelo: true } },
              hospital: { select: { nombre: true } },
            },
            orderBy: { proximoMantenimiento: "asc" },
            take: 5,
          })
        : Promise.resolve([]),
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
      ...fasesRetrasadas.map(f => ({
        tipo: "fase_retrasada" as const,
        id: f.id,
        titulo: f.proyecto.titulo,
        href: `/proyectos/${f.proyecto.id}`,
        mensaje: `Fase "${f.nombre}" retrasada desde ${new Date(f.fechaPlan!).toLocaleDateString("es-ES")}`,
      })),
      ...proyectosPorVencer.map(p => {
        const diasRestantes = Math.ceil((new Date(p.fechaFinPlan!).getTime() - now.getTime()) / 86400000)
        return {
          tipo: "proyecto_por_vencer" as const,
          id: p.id,
          titulo: p.titulo,
          href: `/proyectos/${p.id}`,
          mensaje: diasRestantes <= 0 ? "Fecha de entrega hoy" : `Entrega en ${diasRestantes} día${diasRestantes === 1 ? "" : "s"}`,
        }
      }),
      ...tareasRetrasadas.map(t => {
        const diasRetraso = Math.floor((now.getTime() - new Date(t.fechaVencimiento!).getTime()) / 86400000)
        return {
          tipo: "tarea_retrasada" as const,
          id: t.id,
          titulo: t.titulo,
          href: `/proyectos/${t.proyecto.id}`,
          mensaje: `En "${t.proyecto.titulo}" · ${diasRetraso === 0 ? "vencía hoy" : `retrasada ${diasRetraso}d`}`,
        }
      }),
      ...mencionesRecientes.map(m => {
        const esVisita = !!m.visitaId
        const titulo = esVisita
          ? (m.visita?.hospital?.nombre ?? "Visita")
          : (m.proyecto?.titulo ?? "Proyecto")
        const href = esVisita
          ? `/visitas/${m.visitaId}`
          : `/proyectos/${m.proyectoId}`
        return {
          tipo: "mencion" as const,
          id: m.id,
          titulo,
          href,
          mensaje: `${m.autorNombre} te mencionó en ${esVisita ? "una visita" : "un proyecto"}`,
        }
      }),
      ...recordatoriosPendientes.map(r => {
        const fechaR = new Date(r.fecha)
        const hoyR = new Date(now)
        hoyR.setHours(0, 0, 0, 0)
        const esHoy = fechaR.getFullYear() === hoyR.getFullYear() && fechaR.getMonth() === hoyR.getMonth() && fechaR.getDate() === hoyR.getDate()
        const diasRetraso = Math.floor((now.getTime() - fechaR.getTime()) / 86400000)
        return {
          tipo: "recordatorio" as const,
          id: r.id,
          titulo: r.titulo,
          href: "/recordatorios",
          mensaje: esHoy ? "Recordatorio de hoy" : `Vencido hace ${diasRetraso} día${diasRetraso === 1 ? "" : "s"}`,
        }
      }),
      ...hwGarantiaVencida.map(u => {
        const dias = Math.floor((now.getTime() - new Date(u.fechaGarantia!).getTime()) / 86400000)
        return {
          tipo: "hardware_garantia" as const,
          id: u.id,
          titulo: `${u.catalogo.marca} ${u.catalogo.modelo}`,
          href: "/hardware",
          mensaje: `Garantía vencida hace ${dias} día${dias === 1 ? "" : "s"}${u.hospital ? ` · ${u.hospital.nombre}` : ""}`,
        }
      }),
      ...hwMantenimientoVencido.map(u => {
        const dias = Math.floor((now.getTime() - new Date(u.proximoMantenimiento!).getTime()) / 86400000)
        return {
          tipo: "hardware_mantenimiento" as const,
          id: u.id,
          titulo: `${u.catalogo.marca} ${u.catalogo.modelo}`,
          href: "/hardware",
          mensaje: `Mantenimiento vencido hace ${dias} día${dias === 1 ? "" : "s"}${u.hospital ? ` · ${u.hospital.nombre}` : ""}`,
        }
      }),
    ]

    const res = NextResponse.json({ total: items.length, items })
    res.headers.set("Cache-Control", "private, max-age=120, stale-while-revalidate=60")
    return res
  } catch (err) {
    console.error("[GET notificaciones]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
