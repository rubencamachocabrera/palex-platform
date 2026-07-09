import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import * as XLSX from "xlsx"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await checkRateLimit(_req as NextRequest, "/api/proyectos/excel")
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  try {
    const pp = await db.proyecto.findUnique({
      where: { id },
      include: {
        hospital: {
          select: {
            id: true, nombre: true, ciudad: true, provincia: true,
            zona: { select: { nombre: true } },
          },
        },
        responsable: { select: { nombre: true, email: true } },
        fases: {
          orderBy: { orden: "asc" },
          include: { responsable: { select: { nombre: true } } },
        },
        tareas: { orderBy: [{ orden: "asc" }, { creadoEn: "asc" }] },
        hitos: { orderBy: { fecha: "asc" } },
        modulos: { include: { modulo: { select: { nombre: true } } } },
        solicitudes: {
          orderBy: { creadoEn: "desc" },
          include: { lineas: true },
        },
      },
    })

    if (!pp) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    // IDOR: ADMIN, responsable, or same zone
    if (session.user.role !== "ADMIN" && pp.responsableId !== session.user.id) {
      const zoneAccess = await db.hospital.findFirst({
        where: { id: pp.hospital.id, zona: { usuarios: { some: { usuarioId: session.user.id } } } },
        select: { id: true },
      })
      if (!zoneAccess) return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    // ── Helpers ──
    const fmtDate = (d: Date | string | null | undefined) =>
      d ? new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : ""

    const ESTADO_LABEL: Record<string, string> = {
      NUEVO: "Nuevo", EN_CURSO: "En curso", PAUSADO: "Pausado",
      COMPLETADO: "Completado", CANCELADO: "Cancelado",
    }

    const FASE_ESTADO: Record<string, string> = {
      PENDIENTE: "Pendiente", EN_PROGRESO: "En progreso",
      COMPLETADO: "Completado", BLOQUEADO: "Bloqueado",
    }

    const TAREA_ESTADO: Record<string, string> = {
      PENDIENTE: "Pendiente", EN_PROGRESO: "En progreso",
      COMPLETADA: "Completada", CANCELADA: "Cancelada",
    }

    const TAREA_PRIORIDAD: Record<string, string> = {
      BAJA: "Baja", MEDIA: "Media", ALTA: "Alta", CRITICA: "Critica",
    }

    const MODULO_ESTADO: Record<string, string> = {
      PENDIENTE: "Pendiente", EN_INSTALACION: "En instalacion",
      INSTALADO: "Instalado", FORMACION: "Formacion", VALIDADO: "Validado",
    }

    const SOLICITUD_ESTADO: Record<string, string> = {
      PENDIENTE: "Pendiente", APROBADA: "Aprobada", EN_PREPARACION: "En preparacion",
      ENVIADA: "Enviada", ENTREGADA: "Entregada", CANCELADA: "Cancelada",
    }

    // ── Sheet 1: Resumen ──
    const resumenData = [
      { Campo: "Titulo", Valor: pp.titulo },
      { Campo: "Hospital", Valor: pp.hospital.nombre },
      { Campo: "Ciudad", Valor: `${pp.hospital.ciudad}${pp.hospital.provincia ? `, ${pp.hospital.provincia}` : ""}` },
      { Campo: "Zona", Valor: pp.hospital.zona?.nombre ?? "" },
      { Campo: "Responsable", Valor: pp.responsable?.nombre ?? "Sin asignar" },
      { Campo: "Estado", Valor: ESTADO_LABEL[pp.estado] ?? pp.estado },
      { Campo: "Prioridad", Valor: pp.prioridad > 0 ? String(pp.prioridad) : "Normal" },
      { Campo: "Presupuesto", Valor: pp.presupuesto != null ? `${pp.presupuesto.toLocaleString("es-ES")} EUR` : "" },
      { Campo: "Ref. Contrato", Valor: pp.refContrato ?? "" },
      { Campo: "Ref. Concurso", Valor: pp.refConcurso ?? "" },
      { Campo: "Fecha Inicio", Valor: fmtDate(pp.fechaInicio) },
      { Campo: "Fecha Fin Plan", Valor: fmtDate(pp.fechaFinPlan) },
      { Campo: "Fecha Fin Real", Valor: fmtDate(pp.fechaFinReal) },
      { Campo: "Creado", Valor: fmtDate(pp.creadoEn) },
      { Campo: "Descripcion", Valor: pp.descripcion ?? "" },
      { Campo: "Notas", Valor: pp.notas ?? "" },
    ]
    const wsResumen = XLSX.utils.json_to_sheet(resumenData)
    wsResumen["!cols"] = [{ wch: 18 }, { wch: 50 }]

    // ── Sheet 2: Fases ──
    const fasesData = pp.fases.map(f => ({
      Nombre: f.nombre,
      Tipo: f.tipo,
      Estado: FASE_ESTADO[f.estado] ?? f.estado,
      "Fecha Plan": fmtDate(f.fechaPlan),
      "Fecha Real": fmtDate(f.fechaReal),
      Responsable: f.responsable?.nombre ?? "",
    }))
    const wsFases = XLSX.utils.json_to_sheet(fasesData.length ? fasesData : [{ Nombre: "", Tipo: "", Estado: "", "Fecha Plan": "", "Fecha Real": "", Responsable: "" }])
    wsFases["!cols"] = [{ wch: 30 }, { wch: 22 }, { wch: 15 }, { wch: 14 }, { wch: 14 }, { wch: 20 }]

    // ── Sheet 3: Tareas (top-level only, parentId = null) ──
    const tareasTopLevel = pp.tareas.filter(t => t.parentId === null)
    const tareasData = tareasTopLevel.map(t => ({
      Titulo: t.titulo,
      Estado: TAREA_ESTADO[t.estado] ?? t.estado,
      Prioridad: TAREA_PRIORIDAD[t.prioridad] ?? t.prioridad,
      "Asignado a": t.asignadoA ?? "",
      "Fecha Vencimiento": fmtDate(t.fechaVencimiento),
      Completada: t.fechaCompletada ? fmtDate(t.fechaCompletada) : "",
    }))
    const wsTareas = XLSX.utils.json_to_sheet(tareasData.length ? tareasData : [{ Titulo: "", Estado: "", Prioridad: "", "Asignado a": "", "Fecha Vencimiento": "", Completada: "" }])
    wsTareas["!cols"] = [{ wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 14 }]

    // ── Sheet 4: Hitos ──
    const hitosData = pp.hitos.map(h => ({
      Titulo: h.titulo,
      Fecha: fmtDate(h.fecha),
      "Fecha Real": fmtDate(h.fechaReal),
      Completado: h.completado ? "Si" : "No",
    }))
    const wsHitos = XLSX.utils.json_to_sheet(hitosData.length ? hitosData : [{ Titulo: "", Fecha: "", "Fecha Real": "", Completado: "" }])
    wsHitos["!cols"] = [{ wch: 35 }, { wch: 14 }, { wch: 14 }, { wch: 12 }]

    // ── Sheet 5: Modulos ──
    const modulosData = (pp.modulos ?? []).map(m => ({
      "Modulo InLab": m.modulo.nombre,
      Estado: MODULO_ESTADO[m.estado] ?? m.estado,
    }))
    const wsModulos = XLSX.utils.json_to_sheet(modulosData.length ? modulosData : [{ "Modulo InLab": "", Estado: "" }])
    wsModulos["!cols"] = [{ wch: 30 }, { wch: 18 }]

    // ── Sheet 6: Materiales ──
    const materialesData: { Solicitud: string; Estado: string; Material: string; Referencia: string; Cantidad: number; Entregado: number; Unidad: string }[] = []
    for (const sol of pp.solicitudes) {
      if (sol.lineas.length === 0) {
        materialesData.push({
          Solicitud: sol.titulo,
          Estado: SOLICITUD_ESTADO[sol.estado] ?? sol.estado,
          Material: "", Referencia: "", Cantidad: 0, Entregado: 0, Unidad: "",
        })
      } else {
        for (const lin of sol.lineas) {
          materialesData.push({
            Solicitud: sol.titulo,
            Estado: SOLICITUD_ESTADO[sol.estado] ?? sol.estado,
            Material: lin.nombre,
            Referencia: lin.referencia ?? "",
            Cantidad: lin.cantidad,
            Entregado: lin.cantidadEntregada,
            Unidad: lin.unidad,
          })
        }
      }
    }
    const wsMateriales = XLSX.utils.json_to_sheet(materialesData.length ? materialesData : [{ Solicitud: "", Estado: "", Material: "", Referencia: "", Cantidad: "", Entregado: "", Unidad: "" }])
    wsMateriales["!cols"] = [{ wch: 30 }, { wch: 16 }, { wch: 30 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 8 }]

    // ── Build workbook ──
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen")
    XLSX.utils.book_append_sheet(wb, wsFases, "Fases")
    XLSX.utils.book_append_sheet(wb, wsTareas, "Tareas")
    XLSX.utils.book_append_sheet(wb, wsHitos, "Hitos")
    XLSX.utils.book_append_sheet(wb, wsModulos, "Modulos")
    XLSX.utils.book_append_sheet(wb, wsMateriales, "Materiales")

    const arrayBuf: ArrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" })
    const buf = new Uint8Array(arrayBuf)

    // Sanitize filename
    const safeTitle = pp.titulo.replace(/[^a-zA-Z0-9áéíóúñüÁÉÍÓÚÑÜ _-]/g, "").slice(0, 60)
    const dateStr = new Date().toISOString().slice(0, 10)
    const filename = `Proyecto_${safeTitle}_${dateStr}.xlsx`

    return new Response(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error("[GET /api/proyectos/[id]/excel]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
