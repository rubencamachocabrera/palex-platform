"use client"

import { useEffect, useMemo, useState } from "react"
import { TEAL, ORANGE } from "@/lib/brand"
import type { IncidenciaTransporte, TipoIncidenciaTransporte, GravedadIncidencia, EstadoIncidencia } from "../_lib/types"
import { getIncidencias } from "../_lib/data-service"

const TIPO_LABEL: Record<TipoIncidenciaTransporte, string> = {
  EXCURSION_TEMP: "Excursión temperatura", RETRASO_RUTA: "Retraso de ruta", AVERIA_VEHICULO: "Avería vehículo",
  FALLO_SENSOR: "Fallo de sensor", MUESTRA_DANADA: "Muestra dañada", CONECTIVIDAD: "Conectividad",
}
const GRAVEDAD_COLOR: Record<GravedadIncidencia, string> = { CRITICA: "#ef4444", ALTA: ORANGE, MEDIA: "#6366f1", BAJA: "#6b7280" }
const ESTADO_COLOR: Record<EstadoIncidencia, string> = { ABIERTA: "#ef4444", EN_CURSO: ORANGE, RESUELTA: "#10b981" }
const ESTADO_LABEL: Record<EstadoIncidencia, string> = { ABIERTA: "Abierta", EN_CURSO: "En curso", RESUELTA: "Resuelta" }

function KpiMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" style={{ borderTop: `3px solid ${color}` }}>
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
      <p className="text-xs font-semibold text-gray-700 mt-1">{label}</p>
    </div>
  )
}

export function TabIncidencias() {
  const [incidencias, setIncidencias] = useState<IncidenciaTransporte[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<Set<TipoIncidenciaTransporte>>(new Set())
  const [filtroEstado, setFiltroEstado] = useState<Set<EstadoIncidencia>>(new Set())

  useEffect(() => { getIncidencias().then(d => { setIncidencias(d); setLoading(false) }) }, [])

  const filtradas = useMemo(() => incidencias.filter(i =>
    (filtroTipo.size === 0 || filtroTipo.has(i.tipo)) &&
    (filtroEstado.size === 0 || filtroEstado.has(i.estado))
  ), [incidencias, filtroTipo, filtroEstado])

  const stats = useMemo(() => ({
    total: incidencias.length,
    abiertas: incidencias.filter(i => i.estado === "ABIERTA").length,
    criticas: incidencias.filter(i => i.gravedad === "CRITICA").length,
    mttr: incidencias.filter(i => i.mttrHoras > 0).length
      ? parseFloat((incidencias.filter(i => i.mttrHoras > 0).reduce((s, i) => s + i.mttrHoras, 0) / incidencias.filter(i => i.mttrHoras > 0).length).toFixed(1))
      : 0,
  }), [incidencias])

  function toggle<T>(set: Set<T>, setSet: (s: Set<T>) => void, val: T) {
    const next = new Set(set)
    if (next.has(val)) next.delete(val); else next.add(val)
    setSet(next)
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse" />)}
      </div>
      <div className="h-64 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse" />
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiMini label="Incidencias (90 días)" value={String(stats.total)} color={TEAL} />
        <KpiMini label="Abiertas" value={String(stats.abiertas)} color={stats.abiertas > 0 ? "#ef4444" : "#10b981"} />
        <KpiMini label="Críticas" value={String(stats.criticas)} color={stats.criticas > 0 ? "#ef4444" : "#10b981"} />
        <KpiMini label="MTTR medio" value={`${stats.mttr} h`} color="#6366f1" />
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide shrink-0">Tipo</span>
        {(Object.keys(TIPO_LABEL) as TipoIncidenciaTransporte[]).map(t => (
          <button key={t} onClick={() => toggle(filtroTipo, setFiltroTipo, t)}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer"
            style={filtroTipo.has(t) ? { backgroundColor: TEAL, color: "white", border: `1.5px solid ${TEAL}` } : { backgroundColor: "white", color: "#9ca3af", border: "1.5px solid #e5e7eb" }}>
            {TIPO_LABEL[t]}
          </button>
        ))}
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide shrink-0">Estado</span>
        {(Object.keys(ESTADO_LABEL) as EstadoIncidencia[]).map(e => (
          <button key={e} onClick={() => toggle(filtroEstado, setFiltroEstado, e)}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer"
            style={filtroEstado.has(e) ? { backgroundColor: ESTADO_COLOR[e], color: "white", border: `1.5px solid ${ESTADO_COLOR[e]}` } : { backgroundColor: "white", color: "#9ca3af", border: "1.5px solid #e5e7eb" }}>
            {ESTADO_LABEL[e]}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                <th scope="col" className="px-4 py-3">Fecha</th>
                <th scope="col" className="px-4 py-3">Ruta</th>
                <th scope="col" className="px-4 py-3">Tipo</th>
                <th scope="col" className="px-4 py-3">Descripción</th>
                <th scope="col" className="px-4 py-3">Gravedad</th>
                <th scope="col" className="px-4 py-3">Estado</th>
                <th scope="col" className="px-4 py-3">MTTR</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(inc => (
                <tr key={inc.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{inc.fecha}</td>
                  <td className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">{inc.ruta}{inc.nevera ? ` · ${inc.nevera}` : ""}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{TIPO_LABEL[inc.tipo]}</td>
                  <td className="px-4 py-3 text-gray-500 min-w-[220px]">{inc.descripcion}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${GRAVEDAD_COLOR[inc.gravedad]}15`, color: GRAVEDAD_COLOR[inc.gravedad] }}>
                      {inc.gravedad}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${ESTADO_COLOR[inc.estado]}15`, color: ESTADO_COLOR[inc.estado] }}>
                      {ESTADO_LABEL[inc.estado]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums whitespace-nowrap">{inc.mttrHoras > 0 ? `${inc.mttrHoras} h` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtradas.length === 0 && <p className="text-xs text-gray-400 text-center py-10">No hay incidencias con estos filtros.</p>}
        </div>
      </div>
    </div>
  )
}
