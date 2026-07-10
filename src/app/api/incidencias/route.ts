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
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = `INC-${year}-${String(Date.now()).slice(-6)}${attempt || ""}`
    const exists = await db.incidencia.findUnique({ where: { codigo: code }, select: { id: true } })
    if (!exists) return code
  }
  return `INC-${year}-${crypto.randomUUID().slice(0, 8)}`
}

export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "incidencias", { limit: 60, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { searchParams } = req.nextUrl
    const estado = searchParams.get("estado")
    const prioridad = searchParams.get("prioridad")
    const tipo = searchParams.get("tipo")
    const equipo = searchParams.get("equipo")
    const hospitalId = searchParams.get("hospitalId")
    const asignadoAId = searchParams.get("asignadoAId")
    const desde = searchParams.get("desde")
    const hasta = searchParams.get("hasta")
    const busqueda = searchParams.get("q")

    const where: Record<string, unknown> = {}

    if (estado === "PENDIENTE") {
      where.estado = { in: ["PENDIENTE_CLIENTE", "PENDIENTE_PROVEEDOR"] }
    } else if (estado === "RESUELTA_CERRADA") {
      where.estado = { in: ["RESUELTA", "CERRADA"] }
    } else if (estado) {
      where.estado = estado
    }
    if (prioridad) where.prioridad = prioridad
    if (tipo) where.tipo = tipo
    if (equipo) where.equipoResponsable = equipo
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
          slaPausadoMs: true, slaPausadoEn: true,
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

    const ids = incidencias.map(i => i.id)
    const tiempos = ids.length > 0
      ? await db.eventoIncidencia.groupBy({
          by: ["incidenciaId"],
          where: { incidenciaId: { in: ids }, duracion: { not: null } },
          _sum: { duracion: true },
        })
      : []
    const tiempoMap = new Map(tiempos.map(t => [t.incidenciaId, t._sum.duracion ?? 0]))
    const result = incidencias.map(inc => ({ ...inc, tiempoTotalMinutos: tiempoMap.get(inc.id) ?? 0 }))

    const res = NextResponse.json(result)
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
    const rl = await checkRateLimit(req, "incidencias-post", { limit: 30, windowMs: 60000 })
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

    // Deteccion de recurrencia: mismo hospital+categoria+equipo, resuelta/cerrada en los ultimos 30 dias
    let recurrencia: { id: string; codigo: string; titulo: string } | null = null
    try {
      const hace30dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const previa = await db.incidencia.findFirst({
        where: {
          id: { not: incidencia.id },
          hospitalId,
          categoria: rest.categoria,
          equipoResponsable: rest.equipoResponsable,
          estado: { in: ["RESUELTA", "CERRADA"] },
          creadoEn: { gte: hace30dias },
        },
        select: { id: true, codigo: true, titulo: true },
        orderBy: { creadoEn: "desc" },
      })
      if (previa) {
        await db.incidenciaRelacion.create({
          data: { tipo: "RELACIONADA", incidenciaId: incidencia.id, relacionadaId: previa.id, creadoPorId: session.user.id },
        })
        await db.eventoIncidencia.create({
          data: {
            incidenciaId: incidencia.id,
            autorId: session.user.id,
            tipo: "NOTA",
            descripcion: `Posible recurrencia detectada automáticamente — vinculada a ${previa.codigo} (mismo hospital, categoría y equipo, resuelta en los últimos 30 días)`,
          },
        })
        recurrencia = previa
      }
    } catch (e) {
      console.error("[POST /api/incidencias] deteccion recurrencia", e)
    }

    await logActividad(
      session.user.id, "CREAR", "INCIDENCIA", incidencia.id,
      `Incidencia ${codigo}: ${rest.titulo} — ${hospital.nombre}`,
    ).catch(() => {})

    return NextResponse.json({ ...incidencia, recurrencia }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/incidencias]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
