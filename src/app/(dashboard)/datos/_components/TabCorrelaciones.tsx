"use client"

import { useEffect, useState } from "react"
import { TEAL } from "@/lib/brand"
import { getCorrelaciones } from "../_lib/data-service"
import type { Hospital, PeriodoKey, CorrelacionPunto } from "../_lib/types"

interface Props { hospitalId: string; periodo: PeriodoKey; hospitales: Hospital[] }

type EjeX = "distanciaKm" | "poblacionArea" | "numVisitas"
const EJE_CONFIG: Record<EjeX, { label: string; suffix: string; color: string; icon: string }> = {
  distanciaKm:   { label: "Distancia (km)", suffix: " km", color: "#6366f1", icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
  poblacionArea: { label: "Población área", suffix: " hab", color: "#ec4899", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8" },
  numVisitas:    { label: "Nº visitas",      suffix: "",     color: "#10b981", icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2" },
}

function calcR2(xs: number[], ys: number[]): number {
  const n = xs.length; if (n < 2) return 0
  const mx = xs.reduce((s, v) => s + v, 0) / n
  const my = ys.reduce((s, v) => s + v, 0) / n
  const ssxy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0)
  const ssx = xs.reduce((s, x) => s + (x - mx) ** 2, 0)
  const ssy = ys.reduce((s, y) => s + (y - my) ** 2, 0)
  return ssx * ssy > 0 ? (ssxy / Math.sqrt(ssx * ssy)) ** 2 : 0
}

function ScatterPlot({ data, ejeX, selected, onSelect }: {
  data: CorrelacionPunto[]
  ejeX: EjeX
  selected: string | null
  onSelect: (id: string | null) => void
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const cfg = EJE_CONFIG[ejeX]
  if (data.length === 0) return <div className="h-52 bg-gray-50 rounded-xl animate-pulse" />

  const W = 500; const H = 200
  const PAD = { l: 52, r: 16, t: 16, b: 36 }
  const cW = W - PAD.l - PAD.r; const cH = H - PAD.t - PAD.b

  const xVals = data.map(d => d[ejeX])
  const yVals = data.map(d => d.consumoTotal)
  const minX = Math.min(...xVals); const maxX = Math.max(...xVals) || 1
  const minY = Math.min(...yVals); const maxY = Math.max(...yVals) || 1

  const xOf = (v: number) => PAD.l + ((v - minX) / (maxX - minX || 1)) * cW
  const yOf = (v: number) => PAD.t + cH - ((v - minY) / (maxY - minY || 1)) * cH

  // Regression line
  const mx = xVals.reduce((s, v) => s + v, 0) / xVals.length
  const my = yVals.reduce((s, v) => s + v, 0) / yVals.length
  const ssxy = xVals.reduce((s, x, i) => s + (x - mx) * (yVals[i] - my), 0)
  const ssx  = xVals.reduce((s, x) => s + (x - mx) ** 2, 0)
  const slope = ssx ? ssxy / ssx : 0
  const intercept = my - slope * mx
  const rLine = `${xOf(minX)},${yOf(slope * minX + intercept)} ${xOf(maxX)},${yOf(slope * maxX + intercept)}`

  const r2 = calcR2(xVals, yVals)

  const hoveredItem = data.find(d => d.hospitalId === hovered)

  return (
    <div className="relative select-none">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {/* Grid */}
        {[0.25, 0.5, 0.75, 1].map((f, i) => {
          const yv = minY + f * (maxY - minY)
          return (
            <g key={i}>
              <line x1={PAD.l} y1={yOf(yv)} x2={W - PAD.r} y2={yOf(yv)} stroke="#e5e7eb" strokeWidth="0.7" />
              <text x={PAD.l - 5} y={yOf(yv) + 3} textAnchor="end" fontSize={8} fill="#9ca3af">
                {yv >= 1000 ? `${(yv / 1000).toFixed(0)}k` : Math.round(yv)}
              </text>
            </g>
          )
        })}
        {/* Axes */}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + cH} stroke="#e5e7eb" strokeWidth="1" />
        <line x1={PAD.l} y1={PAD.t + cH} x2={W - PAD.r} y2={PAD.t + cH} stroke="#e5e7eb" strokeWidth="1" />
        {/* Axis labels */}
        <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="#9ca3af">{cfg.label}</text>
        <text x={10} y={PAD.t + cH / 2} textAnchor="middle" fontSize={9} fill="#9ca3af"
          transform={`rotate(-90,10,${PAD.t + cH / 2})`}>Consumo total</text>
        {/* X axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const xv = minX + f * (maxX - minX)
          return <text key={i} x={xOf(xv)} y={PAD.t + cH + 14} textAnchor="middle" fontSize={8} fill="#9ca3af">
            {ejeX === "poblacionArea" ? `${(xv / 1000).toFixed(0)}k` : Math.round(xv)}
          </text>
        })}
        {/* Regression line */}
        <polyline points={rLine} fill="none" stroke={cfg.color} strokeWidth="1.5" strokeDasharray="5 3" opacity="0.6" />
        {/* Points */}
        {data.map(pt => {
          const cx = xOf(pt[ejeX]); const cy = yOf(pt.consumoTotal)
          const isSel = selected === pt.hospitalId
          const isHov = hovered === pt.hospitalId
          return (
            <circle key={pt.hospitalId} cx={cx} cy={cy} r={isSel ? 8 : isHov ? 7 : 5.5}
              fill={isSel ? cfg.color : isHov ? `${cfg.color}cc` : `${cfg.color}99`}
              stroke="white" strokeWidth={isSel ? 2.5 : 1.5}
              style={{ cursor: "pointer", transition: "r 150ms, fill 150ms" }}
              onMouseEnter={() => setHovered(pt.hospitalId)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect(selected === pt.hospitalId ? null : pt.hospitalId)} />
          )
        })}
      </svg>

      {/* R² badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/90 border border-gray-100 rounded-xl px-2.5 py-1.5 shadow-sm">
        <span className="text-[10px] text-gray-500">R²</span>
        <span className="text-xs font-bold tabular-nums" style={{ color: r2 > 0.6 ? "#10b981" : r2 > 0.3 ? "#f59e0b" : "#ef4444" }}>
          {r2.toFixed(3)}
        </span>
        <span className="text-[9px] text-gray-400">
          {r2 > 0.6 ? "correlación fuerte" : r2 > 0.3 ? "correlación moderada" : "correlación débil"}
        </span>
      </div>

      {/* Tooltip hover */}
      {hoveredItem && (
        <div className="absolute pointer-events-none z-10 bg-white/95 border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs"
          style={{ left: "50%", top: 16, transform: "translateX(-50%)" }}>
          <p className="font-bold text-gray-800">{hoveredItem.nombre}</p>
          <p className="text-gray-500">{cfg.label}: <span className="font-semibold tabular-nums">{hoveredItem[ejeX].toLocaleString("es-ES")}{cfg.suffix}</span></p>
          <p className="text-gray-500">Consumo: <span className="font-semibold tabular-nums" style={{ color: cfg.color }}>{hoveredItem.consumoTotal.toLocaleString("es-ES")}</span></p>
        </div>
      )}
    </div>
  )
}

export function TabCorrelaciones({ hospitalId, periodo, hospitales }: Props) {
  const [data, setData] = useState<CorrelacionPunto[]>([])
  const [loading, setLoading] = useState(true)
  const [ejeX, setEjeX] = useState<EjeX>("distanciaKm")
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getCorrelaciones(hospitales).then(d => { setData(d); setLoading(false) })
  }, [hospitales])

  const r2s = useMemo_lite(data)
  function useMemo_lite(d: CorrelacionPunto[]) {
    if (!d.length) return { dist: 0, pob: 0, vis: 0 }
    return {
      dist: calcR2(d.map(x => x.distanciaKm), d.map(x => x.consumoTotal)),
      pob:  calcR2(d.map(x => x.poblacionArea), d.map(x => x.consumoTotal)),
      vis:  calcR2(d.map(x => x.numVisitas), d.map(x => x.consumoTotal)),
    }
  }

  const selectedItem = data.find(d => d.hospitalId === selected)

  return (
    <div className="space-y-5">

      {/* Cabecera R² */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(EJE_CONFIG) as [EjeX, typeof EJE_CONFIG[EjeX]][]).map(([key, cfg]) => {
          const r2 = key === "distanciaKm" ? r2s.dist : key === "poblacionArea" ? r2s.pob : r2s.vis
          return (
            <button key={key} onClick={() => setEjeX(key)}
              className="bg-white rounded-2xl border shadow-sm p-4 text-left transition-all hover:shadow-md cursor-pointer"
              style={{ borderColor: ejeX === key ? cfg.color : "#e5e7eb", borderTopWidth: ejeX === key ? 3 : 1, borderTopColor: ejeX === key ? cfg.color : "#e5e7eb" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cfg.color}15` }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={cfg.icon} />
                  </svg>
                </div>
                <span className="text-[11px] font-bold text-gray-700">{cfg.label}</span>
              </div>
              <p className="text-xl font-bold tabular-nums" style={{ color: cfg.color }}>R² = {r2.toFixed(3)}</p>
              <p className="text-[10px] mt-1" style={{ color: r2 > 0.6 ? "#10b981" : r2 > 0.3 ? "#f59e0b" : "#9ca3af" }}>
                {r2 > 0.6 ? "Correlación fuerte" : r2 > 0.3 ? "Correlación moderada" : "Correlación débil"}
              </p>
            </button>
          )
        })}
      </div>

      {/* Scatter plot principal */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" style={{ borderTop: `3px solid ${EJE_CONFIG[ejeX].color}` }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-800">Consumo vs {EJE_CONFIG[ejeX].label}</h2>
            <p className="text-[10px] text-gray-400 mt-0.5">Cada punto es un hospital · línea de regresión lineal</p>
          </div>
          <div className="flex gap-1.5">
            {(Object.keys(EJE_CONFIG) as EjeX[]).map(k => (
              <button key={k} onClick={() => setEjeX(k)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                style={ejeX === k ? { backgroundColor: EJE_CONFIG[k].color, color: "white" } : { backgroundColor: "#f3f4f6", color: "#6b7280" }}>
                {k === "distanciaKm" ? "Distancia" : k === "poblacionArea" ? "Población" : "Visitas"}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="h-52 bg-gray-100 rounded-xl animate-pulse" />
        ) : (
          <ScatterPlot data={data} ejeX={ejeX} selected={selected} onSelect={setSelected} />
        )}
      </div>

      {/* Tabla correlación + detalle hospital */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Tabla de hospitales */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Datos de correlación</h2>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2 pr-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Hospital</th>
                  <th className="py-2 px-2 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Consumo</th>
                  <th className="py-2 px-2 text-right text-[10px] font-semibold text-indigo-400 uppercase tracking-wide">Dist.</th>
                  <th className="py-2 px-2 text-right text-[10px] font-semibold text-pink-400 uppercase tracking-wide">Pob.</th>
                  <th className="py-2 pl-2 text-right text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">Vis.</th>
                </tr>
              </thead>
              <tbody>
                {[...data].sort((a, b) => b.consumoTotal - a.consumoTotal).map(pt => (
                  <tr key={pt.hospitalId}
                    className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/70 transition-colors cursor-pointer ${selected === pt.hospitalId ? "bg-teal-50/50" : ""}`}
                    onClick={() => setSelected(selected === pt.hospitalId ? null : pt.hospitalId)}>
                    <td className="py-2 pr-2 font-semibold text-gray-700 truncate max-w-[120px]">{pt.nombre}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-600">{pt.consumoTotal.toLocaleString("es-ES")}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-indigo-500">{pt.distanciaKm} km</td>
                    <td className="py-2 px-2 text-right tabular-nums text-pink-500">{(pt.poblacionArea / 1000).toFixed(0)}k</td>
                    <td className="py-2 pl-2 text-right tabular-nums text-emerald-500">{pt.numVisitas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detalle + insights */}
        <div className="space-y-4">
          {selectedItem ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" style={{ borderTop: `3px solid ${TEAL}` }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${TEAL}15` }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-800">{selectedItem.nombre}</h3>
                  <p className="text-[10px] text-gray-400">Hospital seleccionado</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Consumo total", value: selectedItem.consumoTotal.toLocaleString("es-ES"), color: TEAL },
                  { label: "Distancia", value: `${selectedItem.distanciaKm} km`, color: "#6366f1" },
                  { label: "Población área", value: `${(selectedItem.poblacionArea / 1000).toFixed(0)}k hab.`, color: "#ec4899" },
                  { label: "Nº visitas", value: selectedItem.numVisitas.toString(), color: "#10b981" },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] text-gray-400">{s.label}</p>
                    <p className="text-sm font-bold tabular-nums mt-0.5" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-center h-40">
              <p className="text-sm text-gray-400">Haz clic en un punto del scatter para ver el detalle.</p>
            </div>
          )}

          {/* Insights de correlación */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-3">Conclusiones automáticas</h2>
            <div className="space-y-2.5">
              {[
                { r2: r2s.dist, var1: "consumo", var2: "distancia", color: "#6366f1", insight: r2s.dist > 0.5 ? "Los hospitales más lejanos tienden a tener mayor consumo de tubos, posiblemente por rutas más largas y mayor área de influencia." : "No se detecta correlación significativa entre distancia y consumo en este período." },
                { r2: r2s.pob, var1: "consumo", var2: "población", color: "#ec4899", insight: r2s.pob > 0.5 ? "La población del área de influencia explica en gran parte el volumen de muestras generadas por cada hospital." : "La correlación entre población y consumo es moderada. Existen otros factores determinantes." },
                { r2: r2s.vis, var1: "consumo", var2: "visitas", color: "#10b981", insight: r2s.vis > 0.5 ? "Los hospitales con más visitas de seguimiento Palex muestran mayor consumo. Posible efecto de mejor gestión." : "El número de visitas no explica de forma significativa las diferencias de consumo." },
              ].map((ins, i) => (
                <div key={i} className="flex gap-2.5 p-3 rounded-xl" style={{ backgroundColor: `${ins.color}08`, border: `1px solid ${ins.color}20` }}>
                  <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: ins.color }} />
                  <div>
                    <p className="text-[10px] font-bold mb-0.5" style={{ color: ins.color }}>
                      {ins.var1} vs {ins.var2} · R² = {(ins.r2).toFixed(3)}
                    </p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">{ins.insight}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
