import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { logActividad } from "@/lib/log-actividad"
import { parseBody, IncidenciaCreate } from "@/lib/schemas"

async function generarCodigo(): Promise<string> {
  const year = new Date().getFullYear()
  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await db.incidencia.count({
      where: { creadoEn: { gte: new Date(`${year}-01-01`) } },
    })
    const code = `INC-${year}-${String(count + 1 + attempt).padStart(4, "0")}`
    const exists = await db.incidencia.findUnique({ where: { codigo: code }, select: { id: true } })
    if (!exists) return code
  }
  return `INC-${year}-${String(Date.now()).slice(-6)}`
}

export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "incidencias", { limit: 60, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { searchParams } = req.nextUrl
    const estado = searchParams.get("estado")
    const prioridad = searchParams.get("prioridad")
    const tipo = searchParams.get("tipo")
    const hospitalId = searchParams.get("hospitalId")
    const asignadoAId = searchParams.get("asignadoAId")
    const desde = searchParams.get("desde")
    const hasta = searchParams.get("hasta")
    const busqueda = searchParams.get("q")

    const where: Record<string, unknown> = {}

    if (estado === "PENDIENTE") {
      where.estado = { in: ["PENDIENTE_CLIENTE", "PENDIENTE_PROVEEDOR"] }
    } else if (estado) {
      where.estado = estado
    }
    if (prioridad) where.prioridad = prioridad
    if (tipo) where.tipo = tipo
    if (hospitalId) where.hospitalId = hospitalId
    if (asignadoAId) where.asignadoAId = asignadoAId

    if (desde || hasta) {
      const fechaFilter: Record<string, unknown> = {}
      if (desde) fechaFilter.gte = new Date(desde + "T00:00:00")
      if (hasta) fechaFilter.lte = new Date(hasta + "T23:59:59")
      where.creadoEn = fechaFilter
    }

    if (busqueda) {
      where.OR = [
        { titulo: { contains: busqueda, mode: "insensitive" } },
        { codigo: { contains: busqueda, mode: "insensitive" } },
        { descripcion: { contains: busqueda, mode: "insensitive" } },
      ]
    }

    if (session.user.role !== "ADMIN") {
      where.hospital = { zona: { usuarios: { some: { usuarioId: session.user.id } } } }
    }

    const limitParam = searchParams.get("limit")
    const take = Math.min(Math.max(1, parseInt(limitParam ?? "200") || 200), 500)

    const [incidencias, total] = await Promise.all([
      db.incidencia.findMany({
        where,
        select: {
          id: true, codigo: true, titulo: true, tipo: true, categoria: true,
          prioridad: true, estado: true, equipoResponsable: true, slaHoras: true,
          creadoEn: true, actualizadoEn: true, fechaResolucion: true, fechaCierre: true,
          hospital: { select: { id: true, nombre: true, ciudad: true } },
          contacto: { select: { id: true, nombre: true, cargo: true } },
          reportadoPor: { select: { id: true, nombre: true } },
          asignadoA: { select: { id: true, nombre: true } },
          hardwareUnidad: { select: { id: true, numSerie: true, catalogo: { select: { marca: true, modelo: true } } } },
          _count: { select: { eventos: true } },
        },
        orderBy: { creadoEn: "desc" },
        take,
      }),
      db.incidencia.count({ where }),
    ])

    const res = NextResponse.json(incidencias)
    res.headers.set("X-Total-Count", String(total))
    res.headers.set("Cache-Control", "private, max-age=10")
    return res
  } catch (err) {
    console.error("[GET /api/incidencias]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, "incidencias-post", { limit: 30, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const body = await req.json()
    const parsed = parseBody(IncidenciaCreate, body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const { hospitalId, contactoId, hardwareUnidadId, asignadoAId, coasignadosIds, ...rest } = parsed.data

    const hospitalWhere: Record<string, unknown> = { id: hospitalId }
    if (session.user.role !== "ADMIN") {
      hospitalWhere.zona = { usuarios: { some: { usuarioId: session.user.id } } }
    }
    const hospital = await db.hospital.findFirst({ where: hospitalWhere, select: { id: true, nombre: true } })
    if (!hospital) return NextResponse.json({ error: "Hospital no encontrado o sin acceso" }, { status: 404 })

    if (contactoId) {
      const c = await db.contacto.findFirst({ where: { id: contactoId, hospitalId }, select: { id: true } })
      if (!c) return NextResponse.json({ error: "Contacto no encontrado en este hospital" }, { status: 404 })
    }

    if (hardwareUnidadId) {
      const hw = await db.hardwareUnidad.findFirst({ where: { id: hardwareUnidadId }, select: { id: true } })
      if (!hw) return NextResponse.json({ error: "Unidad de hardware no encontrada" }, { status: 404 })
    }

    const codigo = await generarCodigo()

    let coasignadosData: { id: string; nombre: string }[] = []
    if (coasignadosIds && coasignadosIds.length > 0) {
      const users = await db.usuario.findMany({ where: { id: { in: coasignadosIds } }, select: { id: true, nombre: true } })
      coasignadosData = coasignadosIds.map(uid => users.find(u => u.id === uid)).filter(Boolean) as { id: string; nombre: string }[]
    }

    const incidencia = await db.incidencia.create({
      data: {
        ...rest,
        codigo,
        hospitalId,
        contactoId: contactoId || null,
        hardwareUnidadId: hardwareUnidadId || null,
        asignadoAId: asignadoAId || null,
        coasignadosIds: coasignadosData,
        reportadoPorId: session.user.id,
      },
      include: {
        hospital: { select: { id: true, nombre: true, ciudad: true } },
        reportadoPor: { select: { id: true, nombre: true } },
        asignadoA: { select: { id: true, nombre: true } },
      },
    })

    await db.eventoIncidencia.create({
      data: {
        incidenciaId: incidencia.id,
        autorId: session.user.id,
        tipo: "NOTA",
        descripcion: `Incidencia creada: ${rest.titulo}`,
      },
    })

    await logActividad(
      session.user.id, "CREAR", "INCIDENCIA", incidencia.id,
      `Incidencia ${codigo}: ${rest.titulo} — ${hospital.nombre}`,
    ).catch(() => {})

    return NextResponse.json(incidencia, { status: 201 })
  } catch (err) {
    console.error("[POST /api/incidencias]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
