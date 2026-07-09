import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

// GET /api/share/hardware/[id] — pasaporte público de una unidad HW (sin auth)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await checkRateLimit(req, "share-hardware")
    if (rl) return rl

    const { id } = await params
    const unidad = await db.hardwareUnidad.findUnique({
      where: { id },
      include: {
        catalogo: { include: { tipo: true } },
        hospital: { select: { id: true, nombre: true, ciudad: true, provincia: true } },
        proyecto: { select: { id: true, titulo: true } },
        incidencias: {
          select: {
            id: true, codigo: true, titulo: true, estado: true,
            prioridad: true, creadoEn: true, fechaCierre: true,
          },
          orderBy: { creadoEn: "desc" },
          take: 20,
        },
      },
    })

    if (!unidad) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    return NextResponse.json(unidad, {
      headers: { "Cache-Control": "public, max-age=60" },
    })
  } catch (err) {
    console.error("[GET share/hardware/[id]]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
