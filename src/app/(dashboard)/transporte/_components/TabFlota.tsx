"use client"

import { useEffect, useState } from "react"
import { TEAL, ORANGE } from "@/lib/brand"
import type { Nevera, Ruta, LecturaTemperatura, EstadoNevera, TipoSensorNevera } from "../_lib/types"
import { getRutas, getNeveras, getLecturasTemperatura } from "../_lib/data-service"
import { TempChart } from "./Charts"

const ESTADO_LABEL: Record<EstadoNevera, string> = {
  EN_TRANSITO: "En tránsito", EN_LABORATORIO: "En laboratorio", EN_CENTRO: "En centro",
  MANTENIMIENTO: "Mantenimiento", FUERA_SERVICIO: "Fuera de servicio",
}
const ESTADO_COLOR: Record<EstadoNevera, string> = {
  EN_TRANSITO: TEAL, EN_LABORATORIO: "#6366f1", EN_CENTRO: "#6b7280",
  MANTENIMIENTO: ORANGE, FUERA_SERVICIO: "#ef4444",
}
const TIPO_LABEL: Record<TipoSensorNevera, string> = { RFID: "RFID", BT: "Bluetooth", RFID_BT: "RFID + BT" }

function BateriaBar({ pct }: { pct: number }) {
  const color = pct > 50 ? "#10b981" : pct > 20 ? ORANGE : "#ef4444"
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-bold tabular-nums" style={{ color }}>{pct}%</span>
    </div>
  )
}

function NeveraCard({ nevera, ruta, onClick, selected }: {
  nevera: Nevera; ruta: Ruta | undefined; onClick: () => void; selected: boolean
}) {
  const color = ESTADO_COLOR[nevera.estado]
  const fueraDeRango = nevera.temperaturaActual > nevera.rangoMax || nevera.temperaturaActual < nevera.rangoMin
  return (
    <button onClick={onClick}
      className="text-left bg-white rounded-2xl border shadow-sm p-4 hover:shadow-md transition-all cursor-pointer w-full"
      style={{ borderColor: selected ? color : "#f3f4f6", borderTopWidth: 3, borderTopColor: color }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-sm font-bold text-gray-800">{nevera.codigo}</p>
          <p className="text-[11px] text-gray-400">{TIPO_LABEL[nevera.tipo]} · {ruta ? ruta.nombre : nevera.ubicacionActual}</p>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: `${color}15`, color }}>
          {ESTADO_LABEL[nevera.estado]}
        </span>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xl font-bold tabular-nums ${fueraDeRango ? "text-red-500" : ""}`} style={fueraDeRango ? {} : { color: TEAL }}>
          {nevera.estado === "MANTENIMIENTO" ? "—" : `${nevera.temperaturaActual}°C`}
        </span>
        <span className="text-[10px] text-gray-400">Rango {nevera.rangoMin}–{nevera.rangoMax}°C</span>
      </div>
      <div className="flex items-center justify-between text-[11px] text-gray-400">
        <BateriaBar pct={nevera.bateria} />
        <span>Hace {Math.max(1, Math.round((Date.now() - new Date(nevera.ultimaLectura).getTime()) / 60000))} min</span>
      </div>
    </button>
  )
}

export function TabFlota() {
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [neveras, setNeveras] = useState<Nevera[]>([])
  const [lecturas, setLecturas] = useState<LecturaTemperatura[]>([])
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const r = await getRutas()
      const n = await getNeveras(r)
      setRutas(r); setNeveras(n); setSeleccion(n[0]?.id ?? null); setLoading(false)
    })()
  }, [])

  useEffect(() => {
    const n = neveras.find(x => x.id === seleccion)
    if (!n) return
    getLecturasTemperatura(n).then(setLecturas)
  }, [seleccion, neveras])

  if (loading) return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-32 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse" />)}
    </div>
  )

  const seleccionada = neveras.find(n => n.id === seleccion)
  const enTransito = neveras.filter(n => n.estado === "EN_TRANSITO")
  const otras = neveras.filter(n => n.estado !== "EN_TRANSITO")

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-bold text-gray-800 mb-3">Neveras en tránsito ({enTransito.length})</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {enTransito.map(n => (
            <NeveraCard key={n.id} nevera={n} ruta={rutas.find(r => r.id === n.rutaId)} onClick={() => setSeleccion(n.id)} selected={seleccion === n.id} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-gray-800 mb-3">Resto de la flota ({otras.length})</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {otras.map(n => (
            <NeveraCard key={n.id} nevera={n} ruta={rutas.find(r => r.id === n.rutaId)} onClick={() => setSeleccion(n.id)} selected={seleccion === n.id} />
          ))}
        </div>
      </div>

      {seleccionada && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h2 className="text-sm font-bold text-gray-800">Temperatura últimas 24h · {seleccionada.codigo}</h2>
            <span className="text-[11px] text-gray-400">{seleccionada.ubicacionActual}</span>
          </div>
          <p className="text-[11px] text-gray-400 mb-3">Puntos en rojo indican lecturas fuera del rango seguro 2–8°C</p>
          {seleccionada.estado === "MANTENIMIENTO" ? (
            <p className="text-xs text-gray-400 text-center py-10">Sensor en mantenimiento — sin lecturas disponibles.</p>
          ) : lecturas.length > 0 ? (
            <TempChart data={lecturas} />
          ) : null}
        </div>
      )}
    </div>
  )
}
