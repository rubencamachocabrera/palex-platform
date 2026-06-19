import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { logActividad } from "@/lib/log-actividad"

const FASES_DEFAULT = [
  { tipo: "FIRMA_CONTRATO",     nombre: "Firma de Contrato",        orden: 1 },
  { tipo: "VISITA_TECNICA",     nombre: "Visita Técnica Previa",    orden: 2 },
  { tipo: "SOLICITUD_MATERIAL", nombre: "Solicitud de Material",    orden: 3 },
  { tipo: "ENTREGA_MATERIAL",   nombre: "Entrega de Material",      orden: 4 },
  { tipo: "CONFIGURACION",      nombre: "Configuración",            orden: 5 },
  { tipo: "INSTALACION",        nombre: "Instalación",              orden: 6 },
  { tipo: "PUESTA_EN_MARCHA",   nombre: "Puesta en Marcha",         orden: 7 },
  { tipo: "FORMACION",          nombre: "Formación",                orden: 8 },
  { tipo: "VALIDACION",         nombre: "Validación Técnica",       orden: 9 },
  { tipo: "ENTREGA_PROYECTO",   nombre: "Entrega del Proyecto",     orden: 10 },
  { tipo: "SOPORTE_POST",       nombre: "Soporte Post-Instalación", orden: 11 },
] as const

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const estado = searchParams.get("estado")
  const hospitalId = searchParams.get("hospitalId")
  const q = searchParams.get("q")
  const prioridad = searchParams.get("prioridad")
  const responsableId = searchParams.get("responsableId")
  const rol    = session.user.role
  const userId = session.user.id
  try {
    const conditions: Record<string, unknown>[] = []
    if (rol !== "ADMIN") {
      conditions.push({
        OR: [
          { responsableId: userId },
          { hospital: { zona: { usuarios: { some: { usuarioId: userId } } } } },
        ],
      })
    }
    if (estado) conditions.push({ estado: estado as never })
    if (hospitalId) conditions.push({ hospitalId })
    if (prioridad !== null && prioridad !== "") conditions.push({ prioridad: parseInt(prioridad) })
    if (responsableId) conditions.push({ responsableId })
    if (q) {
      conditions.push({
        OR: [
          { titulo: { contains: q, mode: "insensitive" } },
          { hospital: { nombre: { contains: q, mode: "insensitive" } } },
        ],
      })
    }
    const items = await db.proyecto.findMany({
      where: conditions.length > 0 ? { AND: conditions } : {},
      include: {
        hospital: { select: { id: true, nombre: true, ciudad: true } },
        responsable: { select: { id: true, nombre: true } },
        fases: { select: { id: true, tipo: true, estado: true, orden: true } },
        visitas: { select: { id: true } },
        solicitudes: { select: { id: true } },
        hardwareUnidades: { select: { id: true } },
        modulos: { include: { modulo: { select: { id: true, nombre: true } } } },
      },
      orderBy: { creadoEn: "desc" },
    })
    return NextResponse.json(items, {
      headers: { "Cache-Control": "private, max-age=0, no-store" },
    })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  try {
    const body = await req.json()
    const { titulo, hospitalId, responsableId, descripcion, prioridad, presupuesto, fechaInicio, fechaFinPlan, refConcurso, moduloIds } = body
    if (!titulo || !hospitalId) return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })

    const proyecto = await db.proyecto.create({
      data: {
        titulo,
        hospitalId,
        responsableId: responsableId || null,
        descripcion: descripcion || null,
        prioridad: prioridad ?? 0,
        presupuesto: presupuesto ? parseFloat(presupuesto) : null,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFinPlan: fechaFinPlan ? new Date(fechaFinPlan) : null,
        refConcurso: refConcurso || null,
        fases: {
          create: FASES_DEFAULT.map(f => ({ ...f })),
        },
        ...(Array.isArray(moduloIds) && moduloIds.length > 0 ? {
          modulos: {
            create: moduloIds.map((moduloId: string) => ({ moduloId })),
          },
        } : {}),
      },
      include: {
        hospital: { select: { id: true, nombre: true, ciudad: true } },
        fases: true,
        modulos: { include: { modulo: { select: { id: true, nombre: true } } } },
      },
    })
    logActividad(session.user.id, "CREAR", "proyecto", proyecto.id, titulo)
    return NextResponse.json(proyecto, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
