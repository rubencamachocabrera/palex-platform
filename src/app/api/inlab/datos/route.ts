import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { requireInlabUser, filtrarHospitalesAccesibles } from "@/lib/inlab/access"
import { cargarDataset, huellaCargas } from "@/lib/inlab/queries"
import { claveDatos, etagDatos, guardarDatos, hayDatos, leerDatos } from "@/lib/inlab/cache-datos"
import { diffDias, esDiaValido } from "@/lib/inlab/dates"
import { LIMITES } from "@/lib/inlab/types"

// GET /api/inlab/datos?hospitalIds=a,b[&desde=YYYY-MM-DD&hasta=YYYY-MM-DD]
// Agregados diarios en formato compacto (InlabPayload). Sin desde/hasta → toda la cobertura
// (lo que pide el dashboard: una petición por selección de hospitales; el periodo se recorta
// en el cliente). Caché en memoria por huella de cargas + ETag (304 si no ha cambiado).
export async function GET(req: NextRequest) {
  const t0 = performance.now()
  const timing: string[] = []
  const marca = (nombre: string, desde: number) => timing.push(`${nombre};dur=${(performance.now() - desde).toFixed(1)}`)
  try {
    const rl = await checkRateLimit(req, "inlab-datos")
    if (rl) return rl
    const tAuth = performance.now()
    const user = await requireInlabUser()
    if (user instanceof NextResponse) return user
    marca("auth", tAuth)

    const sp = req.nextUrl.searchParams
    const ids = [...new Set((sp.get("hospitalIds") ?? "").split(",").map(s => s.trim()).filter(Boolean))].slice(0, 20)
    const desde = sp.get("desde") || undefined
    const hasta = sp.get("hasta") || undefined
    if (ids.length === 0) return NextResponse.json({ error: "hospitalIds requerido" }, { status: 400 })
    if (!!desde !== !!hasta) return NextResponse.json({ error: "Indica desde y hasta, o ninguno" }, { status: 400 })
    if (desde && hasta) {
      if (!esDiaValido(desde) || !esDiaValido(hasta) || desde > hasta) return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 })
      if (diffDias(desde, hasta) > LIMITES.maxDias) return NextResponse.json({ error: "Rango demasiado amplio" }, { status: 400 })
    }

    // Acceso y huella en paralelo; si no hay nada en caché, la consulta grande arranca en
    // cuanto se conoce la huella (nunca se devuelve nada sin haber comprobado el acceso).
    // La huella se lee ANTES de la consulta: si entra una carga entre medias, los datos son
    // como mucho más nuevos que la huella y la siguiente petición (otra huella) los recarga.
    const clave = claveDatos(ids, desde, hasta)
    const tDb = performance.now()
    const huellaP = huellaCargas(ids)
    const especulativa = hayDatos(clave) ? null : huellaP.then(() => cargarDataset(ids, desde, hasta))
    especulativa?.catch(() => { /* se re-lanza abajo si se usa */ })
    const [permitidos, huella] = await Promise.all([filtrarHospitalesAccesibles(user, ids), huellaP])
    marca("acceso", tDb)
    if (permitidos.length !== ids.length) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

    const etag = etagDatos(clave, huella)
    const cabeceras = (estado: string) => ({
      // privado y siempre revalidado: el navegador guarda la respuesta y pregunta con If-None-Match
      "Cache-Control": "private, no-cache",
      ETag: etag,
      "Server-Timing": [...timing, `cache;desc="${estado}"`, `total;dur=${(performance.now() - t0).toFixed(1)}`].join(", "),
    })
    if (req.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers: cabeceras("304") })

    let entrada = leerDatos(clave, huella)
    const estado = entrada ? "hit" : "miss"
    if (!entrada) {
      const tQ = performance.now()
      const dataset = await (especulativa ?? cargarDataset(ids, desde, hasta))
      marca("db", tQ)
      entrada = guardarDatos(clave, ids, huella, JSON.stringify(dataset))
    }
    return new NextResponse(entrada.json, { headers: { "Content-Type": "application/json", ...cabeceras(estado) } })
  } catch (err) {
    console.error("[GET inlab/datos]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
