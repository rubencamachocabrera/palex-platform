import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { requireInlabUser, filtrarHospitalesAccesibles } from "@/lib/inlab/access"
import { huellaCargas } from "@/lib/inlab/queries"
import { cargarJuntas } from "@/lib/inlab/juntas"
import { etagDatos } from "@/lib/inlab/cache-datos"
import { esDiaValido } from "@/lib/inlab/dates"
import { LIMITES } from "@/lib/inlab/types"

// GET /api/inlab/pruebas/juntas?hospitalIds=a,b&desde=&hasta=&areas=X,Y&prueba=Colesterol
// Pruebas que se piden juntas (lib/inlab/juntas.ts). Sin `prueba`: parejas afines y frecuentes
// del periodo; con `prueba`: además sus compañeras. El periodo se amplía a meses completos.
// Respuestas pequeñas (<100 KB): caché propia en memoria por huella de cargas + ETag, aparte de
// la de /api/inlab/datos para no desalojar sus payloads.

const TTL_MS = 15 * 60_000
const MAX_ENTRADAS = 64
interface Entrada { json: string; huella: string; t: number }
const g = globalThis as unknown as { __inlabJuntasCache?: Map<string, Entrada> }
const cache = (g.__inlabJuntasCache ??= new Map<string, Entrada>())

const lista = (v: string | null) => [...new Set((v ?? "").split(",").map(s => s.trim()).filter(Boolean))]

export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(req, "inlab-juntas")
    if (rl) return rl
    const user = await requireInlabUser()
    if (user instanceof NextResponse) return user

    const sp = req.nextUrl.searchParams
    const ids = lista(sp.get("hospitalIds")).slice(0, 20)
    if (ids.length === 0) return NextResponse.json({ error: "hospitalIds requerido" }, { status: 400 })
    const desde = sp.get("desde") || undefined, hasta = sp.get("hasta") || undefined
    if ((desde && !esDiaValido(desde)) || (hasta && !esDiaValido(hasta))) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 })
    const areas = lista(sp.get("areas")).filter(a => a.length <= LIMITES.maxTextoDimension).slice(0, 200)
    const prueba = (sp.get("prueba") ?? "").trim().slice(0, LIMITES.maxTextoDimension) || null

    const [permitidos, huella] = await Promise.all([filtrarHospitalesAccesibles(user, ids), huellaCargas(ids)])
    if (permitidos.length !== ids.length) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const clave = `juntas|${[...ids].sort().join(",")}|${desde?.slice(0, 7) ?? "*"}|${hasta?.slice(0, 7) ?? "*"}|${[...areas].sort().join(",")}|${prueba ?? ""}`
    const etag = etagDatos(clave, huella)
    const cabeceras = { "Cache-Control": "private, no-cache", ETag: etag }
    if (req.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers: cabeceras })

    let e = cache.get(clave)
    if (!e || e.huella !== huella || Date.now() - e.t > TTL_MS) {
      e = { json: JSON.stringify(await cargarJuntas(ids, { desde, hasta, areas, prueba })), huella, t: Date.now() }
      cache.set(clave, e)
      while (cache.size > MAX_ENTRADAS) cache.delete(cache.keys().next().value!)
    } else {
      cache.delete(clave); cache.set(clave, e)
    }
    return new NextResponse(e.json, { headers: { "Content-Type": "application/json", ...cabeceras } })
  } catch (err) {
    console.error("[GET inlab/pruebas/juntas]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
