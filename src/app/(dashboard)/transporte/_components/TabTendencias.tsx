"use client"

import { useEffect, useMemo, useState } from "react"
import { TEAL, ORANGE } from "@/lib/brand"
import type { TendenciaPunto, PeriodoKey } from "../_lib/types"
import { PERIODOS_TRANSPORTE } from "../_lib/types"
import { getTendencias } from "../_lib/data-service"
import { TendenciaChart } from "./Charts"

function ResumenCard({ label, value, sub, color, trend }: {
  label: string; value: string; sub: string; color: string; trend?: number
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" style={{ borderTop: `3px solid ${color}` }}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-2xl font-bold tabular-nums leading-none" style={{ color }}>{value}</p>
        {trend != null && Math.abs(trend) > 0.1 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: trend > 0 ? "#fee2e2" : "#d1fae5", color: trend > 0 ? "#991b1b" : "#065f46" }}>
            {trend > 0 ? "▲" : "▼"}{Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-xs font-semibold text-gray-700 mb-0.5">{label}</p>
      <p className="text-[10px] text-gray-400">{sub}</p>
    </div>
  )
}

export function TabTendencias() {
  const [periodo, setPeriodo] = useState<PeriodoKey>("30d")
  const [data, setData] = useState<TendenciaPunto[]>([])
  const [loading, setLoading] = useState(true)

  const dias = PERIODOS_TRANSPORTE.find(p => p.k === periodo)?.dias ?? 30

  useEffect(() => {
    setLoading(true)
    getTendencias(dias).then(d => { setData(d); setLoading(false) })
  }, [dias])

  const stats = useMemo(() => {
    if (data.length === 0) return null
    const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length
    const half = Math.floor(data.length / 2)
    const tiempos = data.map(d => d.tiempoMedioMin)
    const temps = data.map(d => d.tempMedia)
    const cumpl = data.map(d => d.cumplimientoPct)
    const excursionesTotal = data.reduce((s, d) => s + d.excursiones, 0)
    const rutasTotal = data.reduce((s, d) => s + d.rutasCompletadas, 0)

    const trendOf = (arr: number[]) => {
      const m1 = avg(arr.slice(0, half)); const m2 = avg(arr.slice(half))
      return m1 > 0 ? ((m2 - m1) / m1) * 100 : 0
    }

    return {
      tiempoMedio: Math.round(avg(tiempos)),
      tiempoTrend: trendOf(tiempos),
      tempMedia: parseFloat(avg(temps).toFixed(1)),
      tempTrend: trendOf(temps),
      cumplimiento: Math.round(avg(cumpl)),
      cumplimientoTrend: trendOf(cumpl),
      excursionesTotal,
      rutasTotal,
    }
  }, [data])

  if (loading || !stats) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse" />)}
      </div>
      <div className="h-56 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse" />
    </div>
  )

  return (
    <div className="space-y-5">

      {/* Selector periodo */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-bold text-gray-800">Tendencias de transporte</h2>
        <div className="flex bg-gray-100 p-0.5 rounded-xl">
          {PERIODOS_TRANSPORTE.map(p => (
            <button key={p.k} onClick={() => setPeriodo(p.k)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={periodo === p.k ? { backgroundColor: "white", color: TEAL, boxShadow: "0 1px 4px rgba(0,0,0,.08)" } : { color: "#6b7280" }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ResumenCard label="Tiempo medio por ruta" value={`${stats.tiempoMedio} min`} sub={`Media del período · ${PERIODOS_TRANSPORTE.find(p => p.k === periodo)?.label}`} color={TEAL} trend={stats.tiempoTrend} />
        <ResumenCard label="Temperatura media flota" value={`${stats.tempMedia}°C`} sub="Rango seguro: 2–8°C" color="#6366f1" trend={stats.tempTrend} />
        <ResumenCard label="Cumplimiento térmico" value={`${stats.cumplimiento}%`} sub="Lecturas dentro de rango" color="#10b981" trend={-stats.cumplimientoTrend} />
        <ResumenCard label="Excursiones totales" value={String(stats.excursionesTotal)} sub={`${stats.rutasTotal} rutas completadas`} color={stats.excursionesTotal > 0 ? "#ef4444" : ORANGE} />
      </div>

      {/* Gráficos */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-1">Tiempo medio de transporte</h2>
          <p className="text-[11px] text-gray-400 mb-3">Minutos desde salida de laboratorio hasta cierre de ruta</p>
          <TendenciaChart data={data} dataKey="tiempoMedioMin" color={TEAL} suffix=" min" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-1">Temperatura media de la flota</h2>
          <p className="text-[11px] text-gray-400 mb-3">Media diaria de lecturas de neveras activas</p>
          <TendenciaChart data={data} dataKey="tempMedia" color="#6366f1" suffix="°C" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-1">Cumplimiento térmico</h2>
          <p className="text-[11px] text-gray-400 mb-3">% de lecturas dentro del rango 2–8°C</p>
          <TendenciaChart data={data} dataKey="cumplimientoPct" color="#10b981" suffix="%" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-1">Rutas completadas por día</h2>
          <p className="text-[11px] text-gray-400 mb-3">Incluye fines de semana con servicio reducido</p>
          <TendenciaChart data={data} dataKey="rutasCompletadas" color={ORANGE} />
        </div>
      </div>

      {/* Footer info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-800 mb-2">Lectura de los datos</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          Los fines de semana muestran menos rutas completadas y mayor variabilidad en tiempos por el servicio reducido.
          Un aumento sostenido de excursiones de temperatura suele coincidir con temperaturas exteriores elevadas o
          retrasos en ruta — correlación que se podrá cruzar con incidencias de laboratorio cuando se integre el feed real del LIS.
        </p>
      </div>
    </div>
  )
}
