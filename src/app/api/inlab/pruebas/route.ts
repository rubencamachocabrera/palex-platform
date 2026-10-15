import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { requireInlabUser, filtrarHospitalesAccesibles } from "@/lib/inlab/access"
import { cargarPruebas, huellaCargas } from "@/lib/inlab/queries"
import { claveDatos, etagDatos, guardarDatos, leerDatos } from "@/lib/inlab/cache-datos"

// GET /api/inlab/pruebas?hospitalIds=a,b
// Pruebas de laboratorio pedidas (InlabPruebasPayload) de toda la cobertura: el dashboard las
// pide al abrir la pestaña «Pruebas» y recorta el periodo en el cliente. Misma caché por huella
// de cargas + ETag que /api/inlab/datos (clave propia).
export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "inlab-pruebas")
    if (rl) return rl
    const user = await requireInlabUser()
    if (user instanceof NextResponse) return user

    const ids = [...new Set((req.nextUrl.searchParams.get("hospitalIds") ?? "").split(",").map(s => s.trim()).filter(Boolean))].slice(0, 20)
    if (ids.length === 0) return NextResponse.json({ error: "hospitalIds requerido" }, { status: 400 })

    const [permitidos, huella] = await Promise.all([filtrarHospitalesAccesibles(user, ids), huellaCargas(ids)])
    if (permitidos.length !== ids.length) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const clave = `pruebas|${claveDatos(ids)}`
    const etag = etagDatos(clave, huella)
    const cabeceras = { "Cache-Control": "private, no-cache", ETag: etag }
    if (req.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers: cabeceras })

    let entrada = leerDatos(clave, huella)
    if (!entrada) entrada = guardarDatos(clave, ids, huella, JSON.stringify(await cargarPruebas(ids)))
    return new NextResponse(entrada.json, { headers: { "Content-Type": "application/json", ...cabeceras } })
  } catch (err) {
    console.error("[GET inlab/pruebas]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
