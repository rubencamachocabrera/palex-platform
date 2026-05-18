import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const proyecto = await db.proyecto.findUnique({
      where: { mapaToken: token },
      select: {
        nombre: true,
        mapaHtml: true,
        hospital: { select: { nombre: true, ciudad: true } },
      },
    })
    if (!proyecto || !proyecto.mapaHtml) {
      return NextResponse.json({ error: "Enlace no válido o expirado" }, { status: 404 })
    }
    return NextResponse.json({
      nombre: proyecto.nombre,
      hospital: proyecto.hospital.nombre,
      ciudad: proyecto.hospital.ciudad,
      mapaHtml: proyecto.mapaHtml,
    })
  } catch (err) {
    console.error("[GET /api/share/[token]]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
