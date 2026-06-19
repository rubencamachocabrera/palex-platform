import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const pp = await db.proyecto.findUnique({
      where: { shareToken: token },
      select: {
        titulo: true,
        mapaHtml: true,
        hospital: { select: { nombre: true, ciudad: true } },
      },
    })
    if (!pp || !pp.mapaHtml) {
      return NextResponse.json({ error: "Enlace no válido o expirado" }, { status: 404 })
    }
    return NextResponse.json({
      nombre: pp.titulo,
      hospital: pp.hospital.nombre,
      ciudad: pp.hospital.ciudad,
      mapaHtml: pp.mapaHtml,
    })
  } catch (err) {
    console.error("[GET /api/share/[token]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
