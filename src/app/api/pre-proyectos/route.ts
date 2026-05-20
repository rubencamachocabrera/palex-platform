import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

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
  try {
    const items = await db.preProyecto.findMany({
      where: {
        ...(estado ? { estado: estado as never } : {}),
        ...(hospitalId ? { hospitalId } : {}),
        ...(prioridad !== null && prioridad !== "" ? { prioridad: parseInt(prioridad) } : {}),
        ...(responsableId ? { responsableId } : {}),
        ...(q ? { OR: [
          { titulo: { contains: q, mode: "insensitive" } },
          { hospital: { nombre: { contains: q, mode: "insensitive" } } },
        ]} : {}),
      },
      include: {
        hospital: { select: { id: true, nombre: true, ciudad: true } },
        responsable: { select: { id: true, nombre: true } },
        fases: { select: { id: true, tipo: true, estado: true, orden: true } },
        visitas: { select: { id: true } },
        solicitudes: { select: { id: true } },
        hardwareUnidades: { select: { id: true } },
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
    const { titulo, hospitalId, responsableId, descripcion, prioridad, presupuesto, fechaInicio, fechaFinPlan } = body
    if (!titulo || !hospitalId) return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })

    const preProyecto = await db.preProyecto.create({
      data: {
        titulo,
        hospitalId,
        responsableId: responsableId || null,
        descripcion: descripcion || null,
        prioridad: prioridad ?? 0,
        presupuesto: presupuesto ? parseFloat(presupuesto) : null,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFinPlan: fechaFinPlan ? new Date(fechaFinPlan) : null,
        fases: {
          create: FASES_DEFAULT.map(f => ({ ...f })),
        },
      },
      include: {
        hospital: { select: { id: true, nombre: true, ciudad: true } },
        fases: true,
      },
    })
    return NextResponse.json(preProyecto, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
