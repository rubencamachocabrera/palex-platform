"use client"

import { useEffect, useState } from "react"
import { TEAL } from "@/lib/brand"
import { getAlertas } from "../_lib/data-service"
import type { Hospital, PeriodoKey, Alerta, TipoAlerta, SeveridadAlerta } from "../_lib/types"

interface Props { hospitalId: string; periodo: PeriodoKey; hospitales: Hospital[] }

const SEV_CONFIG: Record<SeveridadAlerta, { bg: string; border: string; text: string; dot: string; label: string }> = {
  CRITICA: { bg: "#fef2f2", border: "#fca5a5", text: "#b91c1c", dot: "#ef4444", label: "Crítica" },
  ALTA:    { bg: "#fffbeb", border: "#fcd34d", text: "#b45309", dot: "#f59e0b", label: "Alta" },
  MEDIA:   { bg: "#eff6ff", border: "#93c5fd", text: "#1d4ed8", dot: "#3b82f6", label: "Media" },
}
const TIPO_ICON: Record<TipoAlerta, string> = {
  TEMPERATURA: "M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7zm0 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  CONSUMO:     "M18 20V10M12 20V4M6 20v-6M2 20h20",
  EQUIPO:      "M4 4h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM12 14v4M8 18h8",
  INCIDENCIA:  "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
}

const EQUIPOS = [
  { id: "BC-01", nombre: "BC Robo Lab", tipo: "BC Robo", estado: "OK" as const, ultima: "hace 2 min", temp: null },
  { id: "NV-01", nombre: "Nevera Ruta A", tipo: "Nevera", estado: "ALERTA" as const, ultima: "hace 47 min", temp: 9.2 },
  { id: "NV-02", nombre: "Nevera Ruta B", tipo: "Nevera", estado: "OK" as const, ultima: "hace 3 min", temp: 4.8 },
  { id: "NV-03", nombre: "Nevera CS Norte", tipo: "Nevera", estado: "OK" as const, ultima: "hace 5 min", temp: 6.1 },
  { id: "GW-01", nombre: "Gateway BT Norte", tipo: "Gateway BT", estado: "SIN_SEÑAL" as const, ultima: "hace 3h", temp: null },
  { id: "RF-01", nombre: "Reader RFID Lab", tipo: "Reader RFID", estado: "OK" as const, ultima: "hace 1 min", temp: null },
  { id: "MC-01", nombre: "Zebra MC 3300", tipo: "Zebra MC", estado: "OK" as const, ultima: "hace 12 min", temp: null },
  { id: "PC-01", nombre: "Mini-PC Lab", tipo: "Mini-PC", estado: "MANTENIMIENTO" as const, ultima: "hace 2h", temp: null },
]

type EstadoEquipo = "OK" | "ALERTA" | "SIN_SEÑAL" | "MANTENIMIENTO"
const ESTADO_EQUIPO: Record<EstadoEquipo, { color: string; label: string; bg: string }> = {
  OK:           { color: "#10b981", label: "Operativo", bg: "#f0fdf4" },
  ALERTA:       { color: "#ef4444", label: "Alerta", bg: "#fef2f2" },
  SIN_SEÑAL:    { color: "#f59e0b", label: "Sin señal", bg: "#fffbeb" },
  MANTENIMIENTO:{ color: "#6b7280", label: "Mantenimiento", bg: "#f3f4f6" },
}

function TempGauge({ temp }: { temp: number }) {
  const min = 0; const max = 15; const safe = { lo: 2, hi: 8 }
  const pct = ((temp - min) / (max - min)) * 100
  const inRange = temp >= safe.lo && temp <= safe.hi
  const color = inRange ? "#10b981" : temp < safe.lo ? "#3b82f6" : "#ef4444"

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 h-3 bg-gray-100 rounded-full overflow-visible">
        {/* Safe range zone */}
        <div className="absolute top-0 h-full rounded-full bg-green-100"
          style={{ left: `${((safe.lo - min) / (max - min)) * 100}%`, width: `${((safe.hi - safe.lo) / (max - min)) * 100}%` }} />
        {/* Needle */}
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm transition-all duration-700"
          style={{ left: `calc(${pct}% - 6px)`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] tabular-nums font-bold shrink-0" style={{ color }}>{temp.toFixed(1)}°C</span>
    </div>
  )
}

export function TabAlertas({ hospitalId, periodo, hospitales }: Props) {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)
  const [reconocidas, setReconocidas] = useState<Set<string>>(new Set())
  const [filtroSev, setFiltroSev] = useState<SeveridadAlerta | "TODAS">("TODAS")

  useEffect(() => {
    setLoading(true)
    getAlertas(hospitales).then(data => { setAlertas(data); setLoading(false) })
  }, [hospitales])

  const filtradas = alertas.filter(a => {
    if (filtroSev !== "TODAS" && a.severidad !== filtroSev) return false
    return true
  })

  const activas = alertas.filter(a => a.activa && !reconocidas.has(a.id))
  const criticas = activas.filter(a => a.severidad === "CRITICA").length

  function timeAgo(ts: string) {
    const mins = Math.round((Date.now() - new Date(ts).getTime()) / 60000)
    if (mins < 60) return `hace ${mins} min`
    if (mins < 1440) return `hace ${Math.round(mins / 60)}h`
    return `hace ${Math.round(mins / 1440)}d`
  }

  return (
    <div className="space-y-5">

      {/* KPIs alertas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Alertas activas", value: activas.length.toString(), color: "#ef4444", icon: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" },
          { label: "Críticas", value: criticas.toString(), color: "#b91c1c", icon: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" },
          { label: "Equipos OK", value: EQUIPOS.filter(e => e.estado === "OK").length.toString(), color: "#10b981", icon: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" },
          { label: "Con incidencia", value: EQUIPOS.filter(e => e.estado !== "OK").length.toString(), color: "#f59e0b", icon: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
            style={{ borderTop: `3px solid ${k.color}` }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: `${k.color}15` }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={k.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={k.icon} />
              </svg>
            </div>
            <p className="text-2xl font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs font-semibold text-gray-700 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">

        {/* Alertas activas */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" style={{ borderTop: `3px solid #ef4444` }}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-sm font-bold text-gray-800">Alertas del sistema</h2>
            <div className="flex gap-1.5">
              {(["TODAS", "CRITICA", "ALTA", "MEDIA"] as const).map(s => (
                <button key={s} onClick={() => setFiltroSev(s)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                  style={filtroSev === s
                    ? (s !== "TODAS" ? { backgroundColor: SEV_CONFIG[s as SeveridadAlerta].dot, color: "white" } : { backgroundColor: "#374151", color: "white" })
                    : { backgroundColor: "#f3f4f6", color: "#9ca3af" }}>
                  {s === "TODAS" ? "Todas" : SEV_CONFIG[s as SeveridadAlerta].label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="space-y-3">
              {filtradas.map(alerta => {
                const cfg = SEV_CONFIG[alerta.severidad]
                const recono = reconocidas.has(alerta.id)
                return (
                  <div key={alerta.id}
                    className={`flex gap-3 p-4 rounded-xl border transition-all ${recono ? "opacity-40" : "hover:shadow-sm"}`}
                    style={{ backgroundColor: recono ? "#f9fafb" : cfg.bg, borderColor: recono ? "#e5e7eb" : cfg.border }}>
                    {/* Barra izquierda severidad */}
                    <div className="w-1 rounded-full shrink-0 self-stretch" style={{ backgroundColor: recono ? "#d1d5db" : cfg.dot }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${cfg.dot}20` }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={cfg.dot} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d={TIPO_ICON[alerta.tipo]} />
                            </svg>
                          </div>
                          <span className="text-xs font-bold text-gray-800 truncate">{alerta.titulo}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: cfg.dot, color: "white" }}>{cfg.label}</span>
                          {!recono && (
                            <button onClick={() => setReconocidas(prev => new Set([...prev, alerta.id]))}
                              className="text-[9px] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer underline">
                              OK
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-600 leading-relaxed mb-1.5">{alerta.detalle}</p>
                      <div className="flex items-center gap-3 text-[9px] text-gray-400">
                        <span>{alerta.hospital}</span>
                        <span>·</span>
                        <span>{timeAgo(alerta.timestamp)}</span>
                        {!alerta.activa && <span className="text-gray-300">· Histórica</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
              {filtradas.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3"/>
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-600">Sin alertas activas</p>
                  <p className="text-xs text-gray-400 mt-1">El sistema opera con normalidad.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Estado equipos + temperaturas */}
        <div className="space-y-4">

          {/* Grid equipos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" style={{ borderTop: `3px solid ${TEAL}` }}>
            <h2 className="text-sm font-bold text-gray-800 mb-4">Estado del parque de equipos</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {EQUIPOS.map(eq => {
                const cfg = ESTADO_EQUIPO[eq.estado]
                return (
                  <div key={eq.id} className="p-3 rounded-xl border transition-all hover:shadow-sm cursor-default"
                    style={{ backgroundColor: cfg.bg, borderColor: `${cfg.color}30` }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-gray-500">{eq.tipo}</span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                        <span className="text-[9px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-gray-700 truncate">{eq.nombre}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">Últ. señal: {eq.ultima}</p>
                    {eq.temp !== null && (
                      <div className="mt-2">
                        <TempGauge temp={eq.temp} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Monitorización temperatura neveras */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" style={{ borderTop: "3px solid #3b82f6" }}>
            <h2 className="text-sm font-bold text-gray-800 mb-1">Monitorización de temperatura</h2>
            <p className="text-[10px] text-gray-400 mb-4">Cadena de frío en tiempo real · rango permitido 2–8°C</p>
            <div className="space-y-4">
              {EQUIPOS.filter(e => e.temp !== null).map(eq => (
                <div key={eq.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-gray-700">{eq.nombre}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      eq.temp! >= 2 && eq.temp! <= 8 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {eq.temp! >= 2 && eq.temp! <= 8 ? "En rango" : "Fuera de rango"}
                    </span>
                  </div>
                  <TempGauge temp={eq.temp!} />
                  <div className="flex justify-between text-[9px] text-gray-300 mt-0.5">
                    <span>0°C</span><span className="text-green-400">2°C</span><span className="text-green-400">8°C</span><span>15°C</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3 text-[10px] flex-wrap">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-green-100 inline-block" />Rango seguro (2–8°C)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />OK</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Fuera rango</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Frío extremo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
