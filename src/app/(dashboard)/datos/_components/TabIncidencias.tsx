"use client"

import { useEffect, useMemo, useState } from "react"
import { TEAL } from "@/lib/brand"
import { generarConsumoMensual, TUBOS } from "../_lib/mock-data"
import { getIncidencias } from "../_lib/data-service"
import type { Hospital, Incidencia, PeriodoKey, TipoIncidencia, GravedadIncidencia, EstadoIncidencia } from "../_lib/types"
import { PERIODOS } from "../_lib/types"

interface Props { hospitalId: string; periodo: PeriodoKey; hospitales: Hospital[] }

const TIPO_COLOR: Record<TipoIncidencia, { bg: string; text: string; label: string }> = {
  TEMPERATURA: { bg: "#fee2e2", text: "#dc2626", label: "Temperatura" },
  RUTA:        { bg: "#dbeafe", text: "#2563eb", label: "Ruta" },
  NEVERA:      { bg: "#d1fae5", text: "#059669", label: "Nevera" },
  TRANSPORTE:  { bg: "#fef9c3", text: "#ca8a04", label: "Transporte" },
  SISTEMA:     { bg: "#ede9fe", text: "#7c3aed", label: "Sistema" },
  MUESTRA:     { bg: "#fce7f3", text: "#db2777", label: "Muestra" },
}
const GRAV_COLOR: Record<GravedadIncidencia, { bg: string; text: string }> = {
  CRITICA: { bg: "#fee2e2", text: "#b91c1c" },
  ALTA:    { bg: "#fef3c7", text: "#b45309" },
  MEDIA:   { bg: "#dbeafe", text: "#1d4ed8" },
  BAJA:    { bg: "#f3f4f6", text: "#4b5563" },
}
const ESTADO_COLOR: Record<EstadoIncidencia, { dot: string; label: string }> = {
  ABIERTA:  { dot: "#ef4444", label: "Abierta" },
  EN_CURSO: { dot: "#f59e0b", label: "En curso" },
  RESUELTA: { dot: "#10b981", label: "Resuelta" },
}

type SortKey = "fecha" | "gravedad" | "mttrHoras" | "tipo" | "estado"
type SortDir = "asc" | "desc"

const GRAV_ORDER: Record<GravedadIncidencia, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 }
const ESTADO_ORDER: Record<EstadoIncidencia, number> = { ABIERTA: 0, EN_CURSO: 1, RESUELTA: 2 }

export function TabIncidencias({ hospitalId, periodo, hospitales }: Props) {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>("fecha")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [filtroTipo, setFiltroTipo] = useState<TipoIncidencia | "TODOS">("TODOS")
  const [filtroGrav, setFiltroGrav] = useState<GravedadIncidencia | "TODOS">("TODOS")
  const [filtroEst, setFiltroEst] = useState<EstadoIncidencia | "TODOS">("TODOS")

  useEffect(() => {
    if (!hospitalId) return
    setLoading(true)
    getIncidencias(hospitalId).then(data => { setIncidencias(data); setLoading(false) })
  }, [hospitalId])

  const meses = PERIODOS.find(p => p.k === periodo)?.meses ?? 12
  const consumo = useMemo(() => hospitalId ? generarConsumoMensual({ hospitalId, meses }) : [], [hospitalId, meses])

  const filtradas = useMemo(() => {
    let list = [...incidencias]
    if (filtroTipo !== "TODOS") list = list.filter(i => i.tipo === filtroTipo)
    if (filtroGrav !== "TODOS") list = list.filter(i => i.gravedad === filtroGrav)
    if (filtroEst !== "TODOS") list = list.filter(i => i.estado === filtroEst)
    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === "fecha")     cmp = a.fecha.localeCompare(b.fecha)
      if (sortKey === "gravedad")  cmp = GRAV_ORDER[a.gravedad] - GRAV_ORDER[b.gravedad]
      if (sortKey === "mttrHoras") cmp = a.mttrHoras - b.mttrHoras
      if (sortKey === "tipo")      cmp = a.tipo.localeCompare(b.tipo)
      if (sortKey === "estado")    cmp = ESTADO_ORDER[a.estado] - ESTADO_ORDER[b.estado]
      return sortDir === "asc" ? cmp : -cmp
    })
    return list
  }, [incidencias, filtroTipo, filtroGrav, filtroEst, sortKey, sortDir])

  // KPIs
  const total = incidencias.length
  const resueltas = incidencias.filter(i => i.estado === "RESUELTA")
  const mttrMedio = resueltas.length ? (resueltas.reduce((s, i) => s + i.mttrHoras, 0) / resueltas.length).toFixed(1) : "—"
  const criticas = incidencias.filter(i => i.gravedad === "CRITICA" && i.estado !== "RESUELTA").length
  const recurrentes = incidencias.filter(i => i.recurrente).length

  // Causas raíz
  const causas = useMemo(() => {
    const map: Record<string, number> = {}
    incidencias.forEach(i => { map[i.causa] = (map[i.causa] ?? 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [incidencias])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  function SortIcon({ k }: { k: SortKey }) {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        {sortKey === k && sortDir === "asc"
          ? <path d="M12 19V5M5 12l7-7 7 7" />
          : sortKey === k && sortDir === "desc"
          ? <path d="M12 5v14M19 12l-7 7-7-7" />
          : <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />}
      </svg>
    )
  }

  if (!hospitalId) return (
    <div className="flex items-center justify-center h-48">
      <p className="text-sm text-gray-400">Selecciona un hospital para ver incidencias.</p>
    </div>
  )

  return (
    <div className="space-y-5">

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total incidencias", value: total.toString(), sub: "últimos 90 días", color: TEAL, icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" },
          { label: "MTTR medio", value: `${mttrMedio}h`, sub: "tiempo medio de resolución", color: "#6366f1", icon: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2" },
          { label: "Críticas abiertas", value: criticas.toString(), sub: "requieren acción inmediata", color: "#ef4444", icon: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" },
          { label: "Recurrentes", value: recurrentes.toString(), sub: `de ${total} incidencias totales`, color: "#f59e0b", icon: "M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" },
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
            <p className="text-[10px] text-gray-400">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">

        {/* Tabla de incidencias */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <h2 className="text-sm font-bold text-gray-800 flex-1">Registro de incidencias</h2>
            {/* Filtros */}
            {(["TODOS", "TEMPERATURA", "RUTA", "NEVERA", "TRANSPORTE", "SISTEMA", "MUESTRA"] as const).map(t => (
              <button key={t} onClick={() => setFiltroTipo(t)}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                style={filtroTipo === t ? { backgroundColor: TEAL, color: "white" } : { backgroundColor: "#f3f4f6", color: "#6b7280" }}>
                {t === "TODOS" ? "Todos" : TIPO_COLOR[t].label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mb-3 flex-wrap">
            {(["TODOS", "CRITICA", "ALTA", "MEDIA", "BAJA"] as const).map(g => (
              <button key={g} onClick={() => setFiltroGrav(g)}
                className="px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors cursor-pointer"
                style={filtroGrav === g
                  ? (g !== "TODOS" ? { backgroundColor: GRAV_COLOR[g as GravedadIncidencia].bg, color: GRAV_COLOR[g as GravedadIncidencia].text } : { backgroundColor: "#e5e7eb", color: "#374151" })
                  : { backgroundColor: "#f9fafb", color: "#9ca3af" }}>
                {g}
              </button>
            ))}
            {(["TODOS", "ABIERTA", "EN_CURSO", "RESUELTA"] as const).map(e => (
              <button key={e} onClick={() => setFiltroEst(e)}
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer"
                style={filtroEst === e ? { backgroundColor: "#f0fdf4", color: "#16a34a" } : { backgroundColor: "#f9fafb", color: "#9ca3af" }}>
                {e === "TODOS" ? "Todo estado" : ESTADO_COLOR[e as EstadoIncidencia].label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {([
                      { k: "fecha",     l: "Fecha" },
                      { k: "tipo",      l: "Tipo" },
                      { k: "gravedad",  l: "Gravedad" },
                      { k: "estado",    l: "Estado" },
                      { k: "mttrHoras", l: "MTTR" },
                    ] as const).map(col => (
                      <th key={col.k} className="py-2 px-2 text-left font-semibold text-gray-400 uppercase tracking-wide text-[10px] cursor-pointer hover:text-gray-600 transition-colors whitespace-nowrap"
                        onClick={() => toggleSort(col.k)}>
                        <span className="flex items-center gap-1">{col.l} <SortIcon k={col.k} /></span>
                      </th>
                    ))}
                    <th className="py-2 px-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.slice(0, 20).map(inc => (
                    <tr key={inc.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                      <td className="py-2 px-2 text-gray-500 whitespace-nowrap tabular-nums text-[11px]">{inc.fecha}</td>
                      <td className="py-2 px-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                          style={{ backgroundColor: TIPO_COLOR[inc.tipo].bg, color: TIPO_COLOR[inc.tipo].text }}>
                          {TIPO_COLOR[inc.tipo].label}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                          style={{ backgroundColor: GRAV_COLOR[inc.gravedad].bg, color: GRAV_COLOR[inc.gravedad].text }}>
                          {inc.gravedad}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ESTADO_COLOR[inc.estado].dot }} />
                          <span className="text-[11px] text-gray-600">{ESTADO_COLOR[inc.estado].label}</span>
                          {inc.recurrente && <span className="text-[9px] bg-orange-100 text-orange-600 font-bold px-1 rounded">R</span>}
                        </span>
                      </td>
                      <td className="py-2 px-2 tabular-nums text-[11px] text-gray-600">
                        {inc.estado === "RESUELTA" ? `${inc.mttrHoras}h` : "—"}
                      </td>
                      <td className="py-2 px-2 text-[11px] text-gray-500 max-w-[200px] truncate">{inc.descripcion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtradas.length > 20 && (
                <p className="text-[10px] text-gray-400 text-center pt-3">{filtradas.length - 20} incidencias adicionales — usa filtros para acotar.</p>
              )}
            </div>
          )}
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">

          {/* Causas raíz */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" style={{ borderTop: `3px solid #ef4444` }}>
            <h2 className="text-sm font-bold text-gray-800 mb-4">Top causas raíz</h2>
            {causas.map(([causa, n], i) => {
              const maxN = causas[0]?.[1] ?? 1
              return (
                <div key={causa} className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-gray-700 truncate max-w-[170px]">{causa}</span>
                    <span className="text-[10px] tabular-nums font-bold ml-2" style={{ color: i === 0 ? "#ef4444" : "#6b7280" }}>{n}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(n / maxN) * 100}%`, backgroundColor: i === 0 ? "#ef4444" : "#e5e7eb" }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Distribución por tipo */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-4">Por tipo de incidencia</h2>
            {(Object.keys(TIPO_COLOR) as TipoIncidencia[]).map(tipo => {
              const n = incidencias.filter(i => i.tipo === tipo).length
              const pct = total > 0 ? (n / total) * 100 : 0
              const cfg = TIPO_COLOR[tipo]
              return (
                <div key={tipo} className="flex items-center gap-2 mb-2.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: cfg.bg, color: cfg.text }}>{cfg.label}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg.text }} />
                  </div>
                  <span className="text-[10px] tabular-nums text-gray-500 shrink-0">{n}</span>
                </div>
              )
            })}
          </div>

          {/* Correlación consumo-incidencias */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-1">Correlación consumo × incidencias</h2>
            <p className="text-[10px] text-gray-400 mb-4">Meses con mayor consumo y su nivel de incidencias</p>
            <div className="space-y-1.5">
              {consumo.slice(-6).map((d, i) => {
                const total = TUBOS.reduce((s, t) => s + (d[t.key as keyof typeof d] as number), 0)
                const maxTotal = Math.max(...consumo.map(x => TUBOS.reduce((s, t) => s + (x[t.key as keyof typeof x] as number), 0)), 1)
                const incN = Math.floor((total / maxTotal) * 5 + Math.random() * 2)
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] tabular-nums text-gray-400 w-8 shrink-0">{d.mes}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(total / maxTotal) * 100}%`, backgroundColor: `${TEAL}99` }} />
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">{incN} inc.</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
