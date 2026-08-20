"use client"

import { useMemo, useState } from "react"
import { TEAL } from "@/lib/brand"
import { generarConsumoMensual, TUBOS, EVENTOS } from "../_lib/mock-data"
import { exportarCSV } from "@/lib/csv"
import type { Hospital, PeriodoKey } from "../_lib/types"
import { PERIODOS } from "../_lib/types"

type TuboKey = typeof TUBOS[number]["key"]
interface Props { hospitalId: string; periodo: PeriodoKey; hospitales: Hospital[] }

type SortKey = "mes" | TuboKey | "total"
type SortDir = "asc" | "desc"

const PAGE_SIZES = [10, 25, 50] as const

export function TabExplorador({ hospitalId, periodo, hospitales }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("mes")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [colsVis, setColsVis] = useState<Set<TuboKey>>(new Set(TUBOS.map(t => t.key as TuboKey)))
  const [pageSize, setPageSize] = useState<typeof PAGE_SIZES[number]>(25)
  const [page, setPage] = useState(0)
  const [hosFilter, setHosFilter] = useState(hospitalId)
  const [perFilter, setPerFilter] = useState<PeriodoKey>(periodo)
  const [busqueda, setBusqueda] = useState("")

  const meses = PERIODOS.find(p => p.k === perFilter)?.meses ?? 12
  const data = useMemo(() => hosFilter ? generarConsumoMensual({ hospitalId: hosFilter, meses }) : [], [hosFilter, meses])

  const hosNombre = hospitales.find(h => h.id === hosFilter)?.nombre ?? "—"

  const sorted = useMemo(() => {
    let rows = data.map(d => ({
      ...d,
      total: TUBOS.reduce((s, t) => s + (d[t.key as keyof typeof d] as number), 0),
    }))
    if (busqueda) rows = rows.filter(r => r.mes.toLowerCase().includes(busqueda.toLowerCase()))
    rows.sort((a, b) => {
      let cmp = 0
      if (sortKey === "mes")   cmp = a.mes.localeCompare(b.mes)
      else if (sortKey === "total") cmp = a.total - b.total
      else cmp = (a[sortKey as keyof typeof a] as number) - (b[sortKey as keyof typeof b] as number)
      return sortDir === "asc" ? cmp : -cmp
    })
    return rows
  }, [data, sortKey, sortDir, busqueda])

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize)

  // Stats de resumen
  const stats = useMemo(() => {
    const totals = data.map(d => TUBOS.reduce((s, t) => s + (d[t.key as keyof typeof d] as number), 0))
    const grand = totals.reduce((s, v) => s + v, 0)
    const maxVal = Math.max(...totals, 1)
    const minVal = Math.min(...totals)
    const media = totals.length ? Math.round(grand / totals.length) : 0
    return { grand, maxVal, minVal, media }
  }, [data])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc"); setPage(0) }
  }

  function toggleCol(k: TuboKey) {
    setColsVis(prev => { const n = new Set(prev); if (n.has(k) && n.size > 1) n.delete(k); else n.add(k); return n })
  }

  function handleExport() {
    const visibleTubos = TUBOS.filter(t => colsVis.has(t.key as TuboKey))
    const filas: Record<string, unknown>[] = sorted.map(r => {
      const fila: Record<string, unknown> = { Mes: r.mes, Año: r.year }
      visibleTubos.forEach(t => { fila[t.label] = r[t.key as keyof typeof r] })
      fila["Total"] = r.total
      return fila
    })
    exportarCSV(filas, `InLab_consumo_${hosNombre}_${perFilter}`)
  }

  function SortIcon({ k }: { k: SortKey }) {
    return (
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="inline-block ml-1 opacity-60">
        {sortKey === k && sortDir === "asc"
          ? <path d="M12 19V5M5 12l7-7 7 7" />
          : sortKey === k && sortDir === "desc"
          ? <path d="M12 5v14M19 12l-7 7-7-7" />
          : <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />}
      </svg>
    )
  }

  return (
    <div className="space-y-4">

      {/* Filtros + acciones */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Hospital</label>
            <select value={hosFilter} onChange={e => { setHosFilter(e.target.value); setPage(0) }}
              className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 cursor-pointer focus:outline-none min-w-[180px]">
              {hospitales.map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Período</label>
            <div className="flex bg-gray-100 p-0.5 rounded-xl">
              {PERIODOS.map(p => (
                <button key={p.k} onClick={() => { setPerFilter(p.k); setPage(0) }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  style={perFilter === p.k ? { backgroundColor: "white", color: TEAL, boxShadow: "0 1px 4px rgba(0,0,0,.08)" } : { color: "#6b7280" }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Búsqueda</label>
            <div className="relative">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input value={busqueda} onChange={e => { setBusqueda(e.target.value); setPage(0) }}
                placeholder="Filtrar por mes..."
                className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-teal-400 text-gray-700" />
            </div>
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors cursor-pointer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Columnas visibles */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide shrink-0">Columnas:</span>
          {TUBOS.map(t => (
            <button key={t.key} onClick={() => toggleCol(t.key as TuboKey)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer"
              style={colsVis.has(t.key as TuboKey)
                ? { backgroundColor: t.color, color: "white" }
                : { backgroundColor: "#f3f4f6", color: "#9ca3af" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total período", value: stats.grand.toLocaleString("es-ES"), icon: "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11", color: TEAL },
          { label: "Media mensual", value: stats.media.toLocaleString("es-ES"), icon: "M18 20V10M12 20V4M6 20v-6M2 20h20", color: "#6366f1" },
          { label: "Máximo mensual", value: stats.maxVal.toLocaleString("es-ES"), icon: "M22 12h-4l-3 9L9 3l-3 9H2", color: "#10b981" },
          { label: "Mínimo mensual", value: stats.minVal.toLocaleString("es-ES"), icon: "M22 12h-4l-3 9L9 3l-3 9H2", color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${s.color}15` }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={s.icon} />
              </svg>
            </div>
            <div>
              <p className="text-base font-bold tabular-nums leading-none" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-800">Desglose mensual detallado</h2>
            <p className="text-[10px] text-gray-400 mt-0.5">{hosNombre} · {PERIODOS.find(p => p.k === perFilter)?.label} · {sorted.length} meses</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">Mostrar:</span>
            {PAGE_SIZES.map(n => (
              <button key={n} onClick={() => { setPageSize(n); setPage(0) }}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                style={pageSize === n ? { backgroundColor: `${TEAL}15`, color: TEAL } : { color: "#6b7280" }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th scope="col" className="py-2.5 pr-3 text-left cursor-pointer hover:text-gray-700 transition-colors whitespace-nowrap"
                  onClick={() => toggleSort("mes")}>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    Mes <SortIcon k="mes" />
                  </span>
                </th>
                {TUBOS.filter(t => colsVis.has(t.key as TuboKey)).map(t => (
                  <th key={t.key} scope="col" className="py-2.5 px-2 text-right cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap"
                    onClick={() => toggleSort(t.key as TuboKey)}>
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: t.color }}>
                      {t.label} <SortIcon k={t.key as SortKey} />
                    </span>
                  </th>
                ))}
                <th scope="col" className="py-2.5 pl-3 text-right cursor-pointer hover:text-gray-700 transition-colors whitespace-nowrap"
                  onClick={() => toggleSort("total")}>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    Total <SortIcon k="total" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((d, i) => {
                const ev = EVENTOS[d.monthIndex]
                const isMax = d.total === stats.maxVal
                return (
                  <tr key={d.mes} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/70 transition-colors ${i === 0 && page === 0 && sortDir === "desc" ? "font-semibold" : ""}`}>
                    <td className="py-2.5 pr-3 text-gray-700 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{d.mes}</span>
                        {ev && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: ev.color, color: ev.border }}>{ev.label}</span>}
                        {isMax && <span className="text-[9px] font-bold px-1 rounded bg-amber-100 text-amber-600">máx</span>}
                      </div>
                    </td>
                    {TUBOS.filter(t => colsVis.has(t.key as TuboKey)).map(t => (
                      <td key={t.key} className="py-2.5 px-2 text-right tabular-nums text-gray-700">
                        {(d[t.key as keyof typeof d] as number).toLocaleString("es-ES")}
                      </td>
                    ))}
                    <td className="py-2.5 pl-3 text-right tabular-nums font-bold text-gray-800">{d.total.toLocaleString("es-ES")}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50/50">
                <td className="py-2.5 pr-3 text-[10px] font-bold text-gray-500 uppercase tracking-wide">Totales</td>
                {TUBOS.filter(t => colsVis.has(t.key as TuboKey)).map(t => {
                  const col = data.reduce((s, d) => s + (d[t.key as keyof typeof d] as number), 0)
                  return (
                    <td key={t.key} className="py-2.5 px-2 text-right tabular-nums font-bold text-xs" style={{ color: t.color }}>
                      {col.toLocaleString("es-ES")}
                    </td>
                  )
                })}
                <td className="py-2.5 pl-3 text-right tabular-nums font-bold text-sm text-gray-900">{stats.grand.toLocaleString("es-ES")}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <p className="text-[10px] text-gray-400">
              Mostrando {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} de {sorted.length}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100">
                ← Ant.
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = page < 3 ? i : page > totalPages - 4 ? totalPages - 5 + i : page - 2 + i
                if (pg < 0 || pg >= totalPages) return null
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className="w-7 h-7 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                    style={page === pg ? { backgroundColor: TEAL, color: "white" } : { color: "#6b7280" }}>
                    {pg + 1}
                  </button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100">
                Sig. →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
