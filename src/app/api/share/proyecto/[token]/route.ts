import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const rl = checkRateLimit(_req as NextRequest, "/api/share/proyecto/[token]", { limit: 20 })
  if (rl) return rl
  const { token } = await params
  try {
    const pp = await db.proyecto.findUnique({
      where: { shareToken: token },
      include: {
        hospital: {
          select: {
            id: true, nombre: true, ciudad: true, provincia: true,
            tipo: true, camas: true, direccion: true, pais: true,
            zona: { select: { nombre: true } },
          },
        },
        responsable: { select: { id: true, nombre: true } },
        fases: { orderBy: { orden: "asc" } },
        hitos: { orderBy: { fecha: "asc" } },
        contactos: { select: { contacto: { select: { nombre: true, cargo: true } } } },
        visitas: {
          orderBy: { fecha: "desc" },
          select: { id: true, fecha: true, estado: true, tipo: true, usuario: { select: { nombre: true } } },
        },
        hardwareUnidades: {
          include: { catalogo: true },
        },
      },
    })
    if (!pp) return NextResponse.json({ error: "Enlace no válido o expirado" }, { status: 404 })
    // Strip shareToken from public response
    const { shareToken: _t, ...safe } = pp
    void _t
    return NextResponse.json(safe)
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
