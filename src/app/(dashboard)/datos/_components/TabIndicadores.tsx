"use client"

import { useMemo, useState } from "react"
import { TEAL } from "@/lib/brand"
import { generarConsumoMensual, TUBOS, generarIndicadores } from "../_lib/mock-data"
import type { Hospital, PeriodoKey } from "../_lib/types"
import { PERIODOS } from "../_lib/types"

interface Props { hospitalId: string; periodo: PeriodoKey; hospitales: Hospital[] }

// ─── Box plot SVG ──────────────────────────────────────────────────────────────

function BoxPlot({ p10, p25, mediana, p75, p90, color }: {
  p10: number; p25: number; mediana: number; p75: number; p90: number; color: string
}) {
  const H = 40; const W = 100
  const min = p10; const max = p90; const range = max - min || 1
  const x = (v: number) => ((v - min) / range) * (W - 20) + 10

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <line x1={x(p10)} y1={H / 2} x2={x(p25)} y2={H / 2} stroke={`${color}80`} strokeWidth="1.5" />
      <line x1={x(p75)} y1={H / 2} x2={x(p90)} y2={H / 2} stroke={`${color}80`} strokeWidth="1.5" />
      <line x1={x(p10)} y1={H / 2 - 6} x2={x(p10)} y2={H / 2 + 6} stroke={`${color}80`} strokeWidth="1.5" />
      <line x1={x(p90)} y1={H / 2 - 6} x2={x(p90)} y2={H / 2 + 6} stroke={`${color}80`} strokeWidth="1.5" />
      <rect x={x(p25)} y={H / 2 - 9} width={Math.max(2, x(p75) - x(p25))} height={18}
        fill={`${color}20`} stroke={color} strokeWidth="1.5" rx="3" />
      <line x1={x(mediana)} y1={H / 2 - 9} x2={x(mediana)} y2={H / 2 + 9} stroke={color} strokeWidth="2.5" />
      <text x={x(p10)} y={H - 2} textAnchor="middle" fontSize={7} fill="#9ca3af">{p10}</text>
      <text x={x(mediana)} y={H - 2} textAnchor="middle" fontSize={7} fill={color} fontWeight="600">{mediana}</text>
      <text x={x(p90)} y={H - 2} textAnchor="middle" fontSize={7} fill="#9ca3af">{p90}</text>
    </svg>
  )
}

// ─── Banda desviación estándar ─────────────────────────────────────────────────

function StdBandChart({ vals, color, media, std, height = 160 }: {
  vals: number[]; color: string; media: number; std: number; height?: number
}) {
  if (vals.length < 2) return null
  const W = 500; const H = height
  const PAD = { l: 44, r: 10, t: 12, b: 24 }
  const cW = W - PAD.l - PAD.r; const cH = H - PAD.t - PAD.b

  const minV = Math.min(...vals, media - 2 * std)
  const maxV = Math.max(...vals, media + 2 * std)
  const range = maxV - minV || 1

  const xOf = (i: number) => PAD.l + (i / (vals.length - 1)) * cW
  const yOf = (v: number) => PAD.t + cH - ((v - minV) / range) * cH

  const linePts = vals.map((v, i) => `${xOf(i)},${yOf(v)}`).join(" ")
  const y1s = yOf(media + std); const y2s = yOf(media - std)
  const y1s2 = yOf(media + 2 * std); const y2s2 = yOf(media - 2 * std)
  const yMedia = yOf(media)
  const gradId = `std-g-${color.replace("#", "")}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <rect x={PAD.l} y={y1s2} width={cW} height={y2s2 - y1s2} fill={`${color}08`} />
      <rect x={PAD.l} y={y1s} width={cW} height={y2s - y1s} fill={`${color}18`} />
      <line x1={PAD.l} y1={yMedia} x2={W - PAD.r} y2={yMedia}
        stroke={color} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
      <polygon points={`${linePts} ${xOf(vals.length - 1)},${PAD.t + cH} ${PAD.l},${PAD.t + cH}`}
        fill={`url(#${gradId})`} />
      <polyline points={linePts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {[media - 2 * std, media - std, media, media + std, media + 2 * std].map((v, i) => (
        <g key={i}>
          <line x1={PAD.l} y1={yOf(v)} x2={W - PAD.r} y2={yOf(v)} stroke="#e5e7eb" strokeWidth="0.5" />
          <text x={PAD.l - 4} y={yOf(v) + 3} textAnchor="end" fontSize={8} fill="#9ca3af">
            {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : Math.round(v)}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ─── Tab Indicadores ────────────────────────────────────────────────────────────

export function TabIndicadores({ hospitalId, periodo }: Props) {
  const [selTubo, setSelTubo] = useState("edta")
  const meses  = PERIODOS.find(p => p.k === periodo)?.meses ?? 12
  const data   = useMemo(() => hospitalId ? generarConsumoMensual({ hospitalId, meses }) : [], [hospitalId, meses])
  const indicadores = useMemo(() => data.length ? generarIndicadores(data) : [], [data])

  const selInd = indicadores.find(i => i.key === selTubo) ?? indicadores[0]
  const selVals = useMemo(() => data.map(d => d[selTubo as keyof typeof d] as number), [data, selTubo])

  if (!hospitalId) return (
    <div className="flex items-center justify-center h-48">
      <p className="text-sm text-gray-400">Selecciona un hospital para ver los indicadores.</p>
    </div>
  )

  return (
    <div className="space-y-5">

      {/* CAGR cards */}
      <div>
        <h2 className="text-sm font-bold text-gray-700 mb-3">Crecimiento interanual (CAGR) por tipo de tubo</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {indicadores.map(ind => (
            <button key={ind.key} onClick={() => setSelTubo(ind.key)}
              className="bg-white rounded-2xl border shadow-sm p-4 text-left cursor-pointer transition-all hover:shadow-md"
              style={selTubo === ind.key
                ? { borderColor: ind.color, borderTopWidth: 3, borderTopColor: ind.color }
                : { borderColor: "#e5e7eb" }}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ind.color }} />
                <span className="text-[11px] font-bold text-gray-700 truncate">{ind.tubo}</span>
              </div>
              <div className="flex items-end justify-between gap-1">
                <span className="text-xl font-bold tabular-nums" style={{ color: ind.cagr >= 0 ? "#10b981" : "#ef4444" }}>
                  {ind.cagr >= 0 ? "+" : ""}{ind.cagr}%
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: ind.trend === "UP" ? "#d1fae5" : ind.trend === "DOWN" ? "#fee2e2" : "#f3f4f6",
                    color: ind.trend === "UP" ? "#065f46" : ind.trend === "DOWN" ? "#991b1b" : "#6b7280",
                  }}>
                  {ind.trend === "UP" ? "▲" : ind.trend === "DOWN" ? "▼" : "→"}
                </span>
              </div>
              <p className="text-[9px] text-gray-400 mt-1">CAGR · {meses} meses</p>
            </button>
          ))}
        </div>
      </div>

      {/* Análisis completo del tubo seleccionado */}
      {selInd && (
        <div className="grid lg:grid-cols-3 gap-4">

          {/* Estadísticas */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" style={{ borderTop: `3px solid ${selInd.color}` }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selInd.color }} />
              <h2 className="text-sm font-bold text-gray-800">{selInd.tubo}</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: "Media (μ)",           value: selInd.media.toLocaleString("es-ES"),    color: selInd.color },
                { label: "Mediana",              value: selInd.mediana.toLocaleString("es-ES"),   color: "#6b7280" },
                { label: "Desv. estándar (σ)",   value: selInd.std.toLocaleString("es-ES"),       color: "#6b7280" },
                { label: "Coef. de variación",   value: `${selInd.media > 0 ? ((selInd.std / selInd.media) * 100).toFixed(1) : 0}%`, color: "#f59e0b" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-500">{s.label}</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: `${selInd.color}08` }}>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Percentiles</p>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { label: "P10", value: selInd.p10 },
                  { label: "P25", value: selInd.p25 },
                  { label: "P50", value: selInd.mediana },
                  { label: "P75", value: selInd.p75 },
                  { label: "P90", value: selInd.p90 },
                ].map(p => (
                  <div key={p.label} className="text-center">
                    <p className="text-[9px] text-gray-400">{p.label}</p>
                    <p className="text-[10px] font-bold tabular-nums" style={{ color: p.label === "P50" ? selInd.color : "#374151" }}>
                      {p.value.toLocaleString("es-ES")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Box plot */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-1">Distribución — Box plot</h2>
            <p className="text-[10px] text-gray-400 mb-4">P10 · P25 · Mediana · P75 · P90</p>
            <BoxPlot
              p10={selInd.p10} p25={selInd.p25} mediana={selInd.mediana}
              p75={selInd.p75} p90={selInd.p90} color={selInd.color}
            />
            <div className="mt-4 flex flex-wrap gap-3 text-[10px]">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border-2 inline-block" style={{ borderColor: selInd.color, backgroundColor: `${selInd.color}20` }} />IQR (P25–P75)</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 inline-block" style={{ backgroundColor: selInd.color }} />Mediana</span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Medianas comparadas</p>
              <div className="space-y-1.5">
                {indicadores.map(ind => {
                  const maxMed = Math.max(...indicadores.map(i => i.mediana), 1)
                  return (
                    <div key={ind.key} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ind.color }} />
                      <span className="text-[10px] text-gray-500 w-20 truncate shrink-0">{ind.tubo}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(ind.mediana / maxMed) * 100}%`, backgroundColor: ind.color }} />
                      </div>
                      <span className="text-[10px] tabular-nums text-gray-500 shrink-0">{ind.mediana.toLocaleString("es-ES")}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Banda σ */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-1">Banda de desviación estándar</h2>
            <p className="text-[10px] text-gray-400 mb-4">Evolución histórica con ±1σ y ±2σ</p>
            <StdBandChart vals={selVals} color={selInd.color} media={selInd.media} std={selInd.std} />
            <div className="mt-4 flex flex-wrap gap-3 text-[10px]">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: `${selInd.color}18` }} />±1σ</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: `${selInd.color}08` }} />±2σ</span>
              <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed inline-block" style={{ borderColor: selInd.color }} />μ (media)</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabla resumen completo */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-800 mb-4">Resumen estadístico completo</h2>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100">
                {["Tubo", "Media", "Mediana", "σ", "CV%", "P10", "P25", "P75", "P90", "CAGR", "Trend"].map(h => (
                  <th key={h} className="py-2.5 px-2 text-right first:text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {indicadores.map(ind => {
                const cv = ind.media > 0 ? ((ind.std / ind.media) * 100).toFixed(1) : "0"
                return (
                  <tr key={ind.key}
                    className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/70 transition-colors cursor-pointer ${selTubo === ind.key ? "bg-gray-50" : ""}`}
                    onClick={() => setSelTubo(ind.key)}>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ind.color }} />
                        <span className="font-semibold text-gray-700">{ind.tubo}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-gray-700">{ind.media.toLocaleString("es-ES")}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-gray-700">{ind.mediana.toLocaleString("es-ES")}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-gray-500">{ind.std.toLocaleString("es-ES")}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-gray-500">{cv}%</td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-gray-500">{ind.p10.toLocaleString("es-ES")}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-gray-500">{ind.p25.toLocaleString("es-ES")}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-gray-500">{ind.p75.toLocaleString("es-ES")}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-gray-500">{ind.p90.toLocaleString("es-ES")}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums font-bold" style={{ color: ind.cagr >= 0 ? "#10b981" : "#ef4444" }}>
                      {ind.cagr >= 0 ? "+" : ""}{ind.cagr}%
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <span className="font-bold text-sm" style={{ color: ind.trend === "UP" ? "#10b981" : ind.trend === "DOWN" ? "#ef4444" : "#9ca3af" }}>
                        {ind.trend === "UP" ? "▲" : ind.trend === "DOWN" ? "▼" : "→"}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
