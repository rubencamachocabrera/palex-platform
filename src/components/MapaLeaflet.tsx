"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import Link from "next/link"
import { TEAL } from "@/lib/brand"

export type HospitalMapa = {
  id: string
  nombre: string
  ciudad: string
  provincia: string | null
  latitud: number | null
  longitud: number | null
  zona: { id: string; nombre: string }
  _count: { visitas: number; oportunidades: number }
}

const ZONE_PALETTE = [
  TEAL,
  "#3b82f6",
  "#f59e0b",
  "#a78bfa",
  "#ef4444",
  "#10b981",
  "#ec4899",
  "#f97316",
  "#06b6d4",
  "#84cc16",
]

const COORDS_POR_CIUDAD: Record<string, [number, number]> = {
  "madrid":                     [40.4168,  -3.7038],
  "barcelona":                  [41.3851,   2.1734],
  "valencia":                   [39.4699,  -0.3763],
  "sevilla":                    [37.3891,  -5.9845],
  "zaragoza":                   [41.6488,  -0.8891],
  "málaga":                     [36.7213,  -4.4214],
  "malaga":                     [36.7213,  -4.4214],
  "murcia":                     [37.9922,  -1.1307],
  "palma":                      [39.5696,   2.6502],
  "palma de mallorca":          [39.5696,   2.6502],
  "las palmas":                 [28.1248, -15.4300],
  "las palmas de gran canaria": [28.1248, -15.4300],
  "bilbao":                     [43.2630,  -2.9350],
  "alicante":                   [38.3453,  -0.4815],
  "alacant":                    [38.3453,  -0.4815],
  "córdoba":                    [37.8882,  -4.7794],
  "cordoba":                    [37.8882,  -4.7794],
  "valladolid":                 [41.6523,  -4.7245],
  "vigo":                       [42.2314,  -8.7124],
  "gijón":                      [43.5322,  -5.6611],
  "gijon":                      [43.5322,  -5.6611],
  "a coruña":                   [43.3623,  -8.4115],
  "vitoria":                    [42.8467,  -2.6727],
  "vitoria-gasteiz":            [42.8467,  -2.6727],
  "granada":                    [37.1773,  -3.5986],
  "elche":                      [38.2669,  -0.6985],
  "oviedo":                     [43.3614,  -5.8593],
  "badalona":                   [41.4500,   2.2472],
  "cartagena":                  [37.6001,  -0.9989],
  "terrassa":                   [41.5641,   2.0093],
  "jerez":                      [36.6869,  -6.1361],
  "jerez de la frontera":       [36.6869,  -6.1361],
  "sabadell":                   [41.5434,   2.1091],
  "santa cruz de tenerife":     [28.4636, -16.2518],
  "pamplona":                   [42.8125,  -1.6458],
  "iruña":                      [42.8125,  -1.6458],
  "almería":                    [36.8340,  -2.4637],
  "almeria":                    [36.8340,  -2.4637],
  "fuenlabrada":                [40.2842,  -3.7956],
  "leganés":                    [40.3280,  -3.7638],
  "leganes":                    [40.3280,  -3.7638],
  "san sebastián":              [43.3183,  -1.9812],
  "donostia":                   [43.3183,  -1.9812],
  "burgos":                     [42.3440,  -3.6969],
  "santander":                  [43.4623,  -3.8099],
  "castellón":                  [39.9864,  -0.0513],
  "castellon":                  [39.9864,  -0.0513],
  "albacete":                   [38.9947,  -1.8585],
  "alcorcón":                   [40.3440,  -3.8247],
  "alcorcon":                   [40.3440,  -3.8247],
  "getafe":                     [40.3058,  -3.7326],
  "logroño":                    [42.4667,  -2.4500],
  "logrono":                    [42.4667,  -2.4500],
  "badajoz":                    [38.8794,  -6.9706],
  "huelva":                     [37.2614,  -6.9447],
  "salamanca":                  [40.9651,  -5.6644],
  "leon":                       [42.5987,  -5.5671],
  "león":                       [42.5987,  -5.5671],
  "cádiz":                      [36.5297,  -6.2922],
  "cadiz":                      [36.5297,  -6.2922],
  "guadalajara":                [40.6333,  -3.1667],
  "toledo":                     [39.8628,  -4.0273],
  "pontevedra":                 [42.4333,  -8.6500],
  "mérida":                     [38.9181,  -6.3436],
  "merida":                     [38.9181,  -6.3436],
  "cáceres":                    [39.4769,  -6.3722],
  "caceres":                    [39.4769,  -6.3722],
  "lugo":                       [43.0124,  -7.5557],
  "ourense":                    [42.3367,  -7.8638],
  "orense":                     [42.3367,  -7.8638],
  "segovia":                    [40.9429,  -4.1088],
  "ávila":                      [40.6564,  -4.6814],
  "avila":                      [40.6564,  -4.6814],
  "soria":                      [41.7636,  -2.4650],
  "cuenca":                     [40.0704,  -2.1374],
  "teruel":                     [40.3456,  -1.1065],
  "huesca":                     [42.1401,  -0.4089],
  "lleida":                     [41.6148,   0.6269],
  "girona":                     [41.9794,   2.8214],
  "tarragona":                  [41.1189,   1.2445],
  "reus":                       [41.1561,   1.1066],
  "ibiza":                      [38.9092,   1.4329],
  "manresa":                    [41.7286,   1.8232],
  "mataró":                     [41.5396,   2.4456],
  "mataro":                     [41.5396,   2.4456],
  "alcalá de henares":          [40.4818,  -3.3636],
  "alcala de henares":          [40.4818,  -3.3636],
  "móstoles":                   [40.3223,  -3.8654],
  "mostoles":                   [40.3223,  -3.8654],
  "marbella":                   [36.5101,  -4.8858],
  "santiago de compostela":     [42.8782,  -8.5448],
  "ferrol":                     [43.4832,  -8.2328],
  "talavera de la reina":       [39.9627,  -4.8296],
}

function getCoords(h: HospitalMapa): [number, number] | null {
  if (h.latitud != null && h.longitud != null) return [h.latitud, h.longitud]
  return COORDS_POR_CIUDAD[h.ciudad.toLowerCase().trim()] ?? null
}

// Carga Leaflet desde CDN — sin dependencia npm
function cargarLeaflet(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link")
      link.id = "leaflet-css"
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).L) { resolve(); return }
    if (document.getElementById("leaflet-js")) {
      // Script ya en DOM pero aún cargando — esperar
      const existing = document.getElementById("leaflet-js") as HTMLScriptElement
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener("error", reject, { once: true })
      return
    }
    const script = document.createElement("script")
    script.id = "leaflet-js"
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("No se pudo cargar Leaflet"))
    document.head.appendChild(script)
  })
}

export default function MapaLeaflet({ hospitales }: { hospitales: HospitalMapa[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapObj = useRef<any>(null)
  const [mapReady, setMapReady] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [selected, setSelected] = useState<HospitalMapa | null>(null)

  const zoneColorMap = useMemo(() => {
    const sorted = [...new Map(hospitales.map(h => [h.zona.id, h.zona.nombre])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
    const res: Record<string, string> = {}
    sorted.forEach(([id], i) => { res[id] = ZONE_PALETTE[i % ZONE_PALETTE.length] })
    return res
  }, [hospitales])

  const zonasPaleta = useMemo(() =>
    [...new Map(hospitales.map(h => [h.zona.id, h.zona.nombre])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, nombre]) => ({ id, nombre, color: zoneColorMap[id] ?? TEAL })),
  [hospitales, zoneColorMap])

  const ubicados = useMemo(() => hospitales.filter(h => getCoords(h) !== null), [hospitales])

  useEffect(() => {
    if (!mapRef.current || mapObj.current) return
    const el = mapRef.current

    cargarLeaflet()
      .then(() => {
        if (!el || mapObj.current) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const L = (window as any).L

        const map = L.map(el, { center: [40.4168, -3.7038], zoom: 6, zoomControl: true })
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© <a href="https://openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
          maxZoom: 18,
        }).addTo(map)

        hospitales.forEach(h => {
          const coords = getCoords(h)
          if (!coords) return
          const color = zoneColorMap[h.zona.id] ?? TEAL
          L.circleMarker(coords, {
            radius: 9, fillColor: color,
            color: "#ffffff", weight: 2.5, opacity: 1, fillOpacity: 0.88,
          })
            .bindTooltip(h.nombre, { permanent: false, direction: "top", offset: [0, -6], className: "leaflet-tooltip-palex" })
            .addTo(map)
            .on("click", () => setSelected(h))
        })

        mapObj.current = map
        setMapReady(true)
      })
      .catch(() => setLoadError(true))

    return () => {
      if (mapObj.current) { mapObj.current.remove(); mapObj.current = null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative flex h-full overflow-hidden">
      <div ref={mapRef} className="flex-1 h-full" />

      {/* Loading */}
      {!mapReady && !loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-[500]">
          <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin mb-3" style={{ borderTopColor: TEAL }} />
          <p className="text-xs text-gray-400">Cargando mapa…</p>
        </div>
      )}

      {/* Error */}
      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-[500] gap-2">
          <p className="text-sm font-semibold text-gray-700">No se pudo cargar el mapa</p>
          <p className="text-xs text-gray-400">Comprueba la conexión a internet</p>
        </div>
      )}

      {/* Zone legend */}
      {mapReady && zonasPaleta.length > 0 && (
        <div className="absolute bottom-6 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 p-3 max-w-[180px]">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Zonas</p>
          <div className="space-y-1.5">
            {zonasPaleta.map(z => (
              <div key={z.id} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
                <span className="text-xs text-gray-600 truncate">{z.nombre}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-[10px] text-gray-400">{ubicados.length} de {hospitales.length} hospitales</p>
            {hospitales.length - ubicados.length > 0 && (
              <p className="text-[10px] text-amber-500 mt-0.5">{hospitales.length - ubicados.length} sin coordenadas</p>
            )}
          </div>
        </div>
      )}

      {/* Hospital panel */}
      {selected && (
        <div className="absolute right-0 top-0 h-full w-72 bg-white border-l border-gray-100 shadow-2xl z-[1001] flex flex-col">
          <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 leading-tight">{selected.nombre}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                {selected.ciudad}{selected.provincia ? `, ${selected.provincia}` : ""}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors mt-0.5"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          <div className="px-5 py-4 grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{selected._count.visitas}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-wide">Visitas</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{selected._count.oportunidades}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-wide">Oport.</p>
            </div>
          </div>

          <div className="px-5 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: zoneColorMap[selected.zona.id] ?? TEAL }} />
              <span className="text-xs text-gray-500">Zona {selected.zona.nombre}</span>
            </div>
            {selected.latitud != null && selected.longitud != null && (
              <p className="text-[10px] text-gray-300 mt-1.5 font-mono">
                {selected.latitud.toFixed(5)}, {selected.longitud.toFixed(5)}
              </p>
            )}
          </div>

          <div className="mt-auto px-5 py-4 border-t border-gray-50">
            <Link
              href={`/hospitales/${selected.id}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: TEAL }}
            >
              Ver ficha completa
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>
          </div>
        </div>
      )}

      <style>{`
        .leaflet-tooltip-palex {
          background: rgba(17,24,39,0.9);
          border: none;
          border-radius: 6px;
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 8px;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        }
        .leaflet-tooltip-palex::before { display: none; }
      `}</style>
    </div>
  )
}
