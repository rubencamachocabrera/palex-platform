import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCoords } from "@/lib/hospital-coords"

// Radio amplio porque muchos hospitales solo tienen coordenadas aproximadas
// (centro de la ciudad, ver lib/hospital-coords.ts), no la direccion exacta.
const RADIO_MAX_KM = 15

// Distancia en km entre dos puntos (formula de Haversine)
function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// GET /api/hospitales/cercano?lat=&lng= — hospital mas cercano a una posicion, dentro de RADIO_MAX_KM
export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "hospitales-cercano", { limit: 20, windowMs: 60000 })
    if (rl) return rl

    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "")
    const lng = parseFloat(req.nextUrl.searchParams.get("lng") ?? "")
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: "Coordenadas invalidas" }, { status: 400 })
    }

    const rol = session.user.role
    const userId = session.user.id
    const where = rol === "ADMIN" ? { activo: true } : {
      activo: true,
      zona: { usuarios: { some: { usuarioId: userId } } },
    }

    const hospitales = await db.hospital.findMany({
      where,
      select: { id: true, nombre: true, ciudad: true, latitud: true, longitud: true },
    })

    let masCercano: { id: string; nombre: string; ciudad: string; distanciaKm: number; exacta: boolean } | null = null
    for (const h of hospitales) {
      const c = getCoords(h)
      if (!c) continue
      const d = distanciaKm(lat, lng, c.lat, c.lng)
      if (d <= RADIO_MAX_KM && (!masCercano || d < masCercano.distanciaKm)) {
        masCercano = { id: h.id, nombre: h.nombre, ciudad: h.ciudad, distanciaKm: Math.round(d * 100) / 100, exacta: c.exacta }
      }
    }

    if (!masCercano) return NextResponse.json({ error: `No hay ningun hospital a menos de ${RADIO_MAX_KM}km` }, { status: 404 })
    return NextResponse.json(masCercano)
  } catch (err) {
    console.error("[GET hospitales/cercano]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
