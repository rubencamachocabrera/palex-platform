"use client"

import { useEffect, useRef, useState } from "react"
import { TEAL } from "@/lib/brand"
import type { Ruta, EstadoRuta, EstadoParada } from "../_lib/types"
import { LABORATORIO } from "../_lib/mock-data"

const ESTADO_RUTA_COLOR: Record<EstadoRuta, string> = {
  PROGRAMADA: "#9ca3af", EN_CURSO: TEAL, COMPLETADA: "#10b981", RETRASADA: "#ef4444",
}
const ESTADO_PARADA_COLOR: Record<EstadoParada, string> = {
  PENDIENTE: "#d1d5db", EN_CURSO: TEAL, COMPLETADA: "#10b981", RETRASADA: "#ef4444",
}
const ESTADO_RUTA_LABEL: Record<EstadoRuta, string> = {
  PROGRAMADA: "Programada", EN_CURSO: "En curso", COMPLETADA: "Completada", RETRASADA: "Retrasada",
}
const ESTADO_PARADA_LABEL: Record<EstadoParada, string> = {
  PENDIENTE: "Pendiente", EN_CURSO: "En curso", COMPLETADA: "Completada", RETRASADA: "Retrasada",
}

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

export default function TransporteMapaLeaflet({ rutas }: { rutas: Ruta[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapObj = useRef<any>(null)
  const [mapReady, setMapReady] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [selected, setSelected] = useState<Ruta | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapObj.current) return
    const el = mapRef.current

    cargarLeaflet()
      .then(() => {
        if (!el || mapObj.current) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const L = (window as any).L

        const map = L.map(el, { center: [LABORATORIO.lat, LABORATORIO.lng], zoom: 9, zoomControl: true })
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© <a href="https://openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
          maxZoom: 18,
        }).addTo(map)

        // Laboratorio
        L.marker([LABORATORIO.lat, LABORATORIO.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:18px;height:18px;border-radius:6px;background:#1e293b;border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
            iconSize: [18, 18], iconAnchor: [9, 9],
          }),
        }).bindTooltip(LABORATORIO.nombre, { permanent: false, direction: "top", offset: [0, -8], className: "leaflet-tooltip-palex" }).addTo(map)

        rutas.forEach(ruta => {
          const color = ESTADO_RUTA_COLOR[ruta.estado]
          const coords: [number, number][] = [
            [LABORATORIO.lat, LABORATORIO.lng],
            ...ruta.paradas.sort((a, b) => a.orden - b.orden).map(p => [p.lat, p.lng] as [number, number]),
            [LABORATORIO.lat, LABORATORIO.lng],
          ]
          const polyline = L.polyline(coords, {
            color, weight: 3, opacity: 0.7,
            dashArray: ruta.estado === "PROGRAMADA" ? "6 6" : undefined,
          }).addTo(map).on("click", () => setSelected(ruta))
          polyline.bindTooltip(`${ruta.nombre} · ${ESTADO_RUTA_LABEL[ruta.estado]}`, { sticky: true, className: "leaflet-tooltip-palex" })

          ruta.paradas.forEach(parada => {
            const pColor = ESTADO_PARADA_COLOR[parada.estado]
            L.circleMarker([parada.lat, parada.lng], {
              radius: 8, fillColor: pColor, color: "#ffffff", weight: 2, opacity: 1, fillOpacity: 0.9,
            })
              .bindTooltip(
                `<strong>${parada.hospitalNombre}</strong><br/>${ESTADO_PARADA_LABEL[parada.estado]} · ${parada.horaReal ?? parada.horaProgramada}${parada.temperaturaRecogida ? ` · ${parada.temperaturaRecogida}°C` : ""}`,
                { permanent: false, direction: "top", offset: [0, -8], className: "leaflet-tooltip-palex" }
              )
              .addTo(map)
              .on("click", () => setSelected(ruta))
          })
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

      {!mapReady && !loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-[500]">
          <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin mb-3" style={{ borderTopColor: TEAL }} />
          <p className="text-xs text-gray-400">Cargando mapa…</p>
        </div>
      )}
      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-[500] gap-2">
          <p className="text-sm font-semibold text-gray-700">No se pudo cargar el mapa</p>
          <p className="text-xs text-gray-400">Comprueba la conexión a internet</p>
        </div>
      )}

      {/* Leyenda */}
      {mapReady && (
        <div className="absolute bottom-6 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 p-3 max-w-[180px]">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Estado de ruta</p>
          <div className="space-y-1.5">
            {(Object.keys(ESTADO_RUTA_LABEL) as EstadoRuta[]).map(e => (
              <div key={e} className="flex items-center gap-2">
                <div className="w-3 h-[3px] rounded-full shrink-0" style={{ backgroundColor: ESTADO_RUTA_COLOR[e] }} />
                <span className="text-xs text-gray-600">{ESTADO_RUTA_LABEL[e]}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: "#1e293b" }} />
            <span className="text-[10px] text-gray-400">Laboratorio central</span>
          </div>
        </div>
      )}

      {/* Panel detalle ruta */}
      {selected && (
        <div className="absolute right-0 top-0 h-full w-80 bg-white border-l border-gray-100 shadow-2xl z-[1001] flex flex-col">
          <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 leading-tight">{selected.nombre}</p>
              <p className="text-xs text-gray-400 mt-0.5">{selected.zona} · {selected.conductor} · {selected.vehiculo}</p>
            </div>
            <button onClick={() => setSelected(null)}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors mt-0.5"
              aria-label="Cerrar">×</button>
          </div>

          <div className="px-5 py-3 grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-sm font-bold" style={{ color: ESTADO_RUTA_COLOR[selected.estado] }}>{ESTADO_RUTA_LABEL[selected.estado]}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-wide">Estado</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-sm font-bold text-gray-800">{selected.distanciaKm} km</p>
              <p className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-wide">Distancia</p>
            </div>
          </div>

          <div className="px-5 py-2 text-xs text-gray-500">
            Salida {selected.horaInicio} · Fin {selected.horaFinReal ?? `${selected.horaFinEstimada} (est.)`}
          </div>

          <div className="px-5 py-3 flex-1 overflow-y-auto">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Paradas</p>
            <div className="space-y-2">
              {selected.paradas.sort((a, b) => a.orden - b.orden).map(p => (
                <div key={p.id} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: ESTADO_PARADA_COLOR[p.estado] }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-700 truncate">{p.hospitalNombre}</p>
                    <p className="text-[10px] text-gray-400">{p.ciudad} · {p.horaReal ?? p.horaProgramada}{p.horaReal ? "" : " (prog.)"}</p>
                    {p.temperaturaRecogida != null && (
                      <p className="text-[10px] text-gray-400">{p.muestrasRecogidas} muestras · {p.temperaturaRecogida}°C</p>
                    )}
                  </div>
                  <span className="text-[10px] font-bold shrink-0" style={{ color: ESTADO_PARADA_COLOR[p.estado] }}>{ESTADO_PARADA_LABEL[p.estado]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .leaflet-tooltip-palex {
          background: rgba(17,24,39,0.92);
          border: none;
          border-radius: 6px;
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        }
        .leaflet-tooltip-palex::before { display: none; }
      `}</style>
    </div>
  )
}
