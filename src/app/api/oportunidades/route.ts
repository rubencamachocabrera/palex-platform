import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/oportunidades — lista (ADMIN ve todas, VENTAS las suyas)
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const rol = session.user.role
  const userId = session.user.id

  const oportunidades = await db.oportunidad.findMany({
    where: rol === "ADMIN" ? {} : { usuarioId: userId },
    include: {
      hospital: { select: { id: true, nombre: true, ciudad: true, zona: { select: { nombre: true } } } },
      usuario:  { select: { id: true, nombre: true } },
    },
    orderBy: { editadoEn: "desc" },
  })

  return NextResponse.json(oportunidades)
}

// POST /api/oportunidades — crea oportunidad (VENTAS y ADMIN)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.role === "PROYECTOS") return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { hospitalId, titulo, etapa, valorEstimado, probabilidad, fechaCierre, productos, notas } = await req.json()

  if (!hospitalId || !titulo?.trim()) {
    return NextResponse.json({ error: "Hospital y titulo son obligatorios" }, { status: 400 })
  }

  const oportunidad = await db.oportunidad.create({
    data: {
      hospitalId,
      usuarioId: session.user.id,
      titulo: titulo.trim(),
      etapa: etapa ?? "IDENTIFICADO",
      valorEstimado: valorEstimado ? parseFloat(valorEstimado) : null,
      probabilidad: probabilidad ? parseInt(probabilidad) : null,
      fechaCierre: fechaCierre ? new Date(fechaCierre) : null,
      productos: productos ?? [],
      notas: notas?.trim() || null,
    },
    include: {
      hospital: { select: { id: true, nombre: true, ciudad: true, zona: { select: { nombre: true } } } },
      usuario:  { select: { id: true, nombre: true } },
    },
  })

  return NextResponse.json(oportunidad, { status: 201 })
}
