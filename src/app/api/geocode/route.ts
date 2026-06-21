import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"

// Proxy para Nominatim (OpenStreetMap) — requiere User-Agent propio y rate-limit 1 req/s
// Cached 24h en Edge para no martillar el servicio
export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, "/api/geocode", { limit: 20 })
  if (rl) return rl
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const q = new URL(req.url).searchParams.get("q")?.trim()
  if (!q) return NextResponse.json({ error: "Parámetro q requerido" }, { status: 400 })

  try {
    const params = new URLSearchParams({
      q,
      format:         "json",
      limit:          "5",
      addressdetails: "0",
      "accept-language": "es,en",
    })
    const r = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        "User-Agent":      "PALEX-Platform/1.0 (medical-equipment-management; Spain)",
        "Accept":          "application/json",
        "Accept-Language": "es,en",
        "Referer":         "https://palex-platform-production.up.railway.app",
      },
    })
    if (!r.ok) throw new Error(`Nominatim ${r.status}`)
    const data = await r.json()
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    })
  } catch (err) {
    console.error("[GET /api/geocode]", err)
    return NextResponse.json({ error: "Error al geocodificar" }, { status: 500 })
  }
}
