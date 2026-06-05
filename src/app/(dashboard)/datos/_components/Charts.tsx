"use client"

import { useState } from "react"
import { TEAL } from "@/lib/brand"
import { TUBOS, EVENTOS } from "../_lib/mock-data"
import type { ConsumoMensual, ForecastPunto } from "../_lib/types"

type TuboKey = typeof TUBOS[number]["key"]

// ─── Sparkline ────────────────────────────────────────────────────────────────

export function Sparkline({ values, color, height = 36, forecast = false }: {
  values: number[]; color: string; height?: number; forecast?: boolean
}) {
  if (values.length < 2) return null
  const W = 100; const H = height
  const min = Math.min(...values); const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`)
  const split = Math.floor(values.length * 0.8)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`sp-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={`${pts.join(" ")} ${W},${H} 0,${H}`} fill={`url(#sp-${color.replace("#", "")})`} />
      <polyline points={pts.slice(0, split + 1).join(" ")} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {forecast && <polyline points={pts.slice(split).join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />}
    </svg>
  )
}

// ─── Area Chart principal con tooltip ─────────────────────────────────────────

export function AreaChart({ data, visibles, height = 220 }: {
  data: ConsumoMensual[]
  visibles: Set<TuboKey>
  height?: number
}) {
  const [tooltip, setTooltip] = useState<number | null>(null)
  const W = 800; const H = height
  const PAD = { l: 52, r: 16, t: 16, b: 32 }
  const cW = W - PAD.l - PAD.r; const cH = H - PAD.t - PAD.b

  const allVals = data.flatMap(d => TUBOS.filter(t => visibles.has(t.key)).map(t => d[t.key as keyof ConsumoMensual] as number))
  const maxV = Math.max(...allVals, 1)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(f * maxV))

  const xOf = (i: number) => PAD.l + (data.length > 1 ? (i / (data.length - 1)) * cW : cW / 2)
  const yOf = (v: number) => PAD.t + cH - (v / maxV) * cH

  return (
    <div className="relative select-none" onMouseLeave={() => setTooltip(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <defs>
          {TUBOS.map(t => (
            <linearGradient key={t.key} id={`ag2-${t.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.color} stopOpacity="0.20" />
              <stop offset="100%" stopColor={t.color} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>

        {/* Bandas estacionales */}
        {data.map((d, i) => {
          const ev = EVENTOS[d.monthIndex]
          if (!ev || (i > 0 && data[i - 1].monthIndex === d.monthIndex)) return null
          const x1 = xOf(i)
          const nextIdx = data.findIndex((dd, ii) => ii > i && dd.monthIndex !== d.monthIndex)
          const x2 = nextIdx === -1 ? W - PAD.r : xOf(nextIdx)
          return <rect key={i} x={x1} y={PAD.t} width={x2 - x1} height={cH} fill={ev.color} opacity="0.9" />
        })}

        {/* Grid */}
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={PAD.l} y1={yOf(v)} x2={W - PAD.r} y2={yOf(v)} stroke="#e5e7eb" strokeWidth="0.7" />
            <text x={PAD.l - 6} y={yOf(v) + 3.5} textAnchor="end" fontSize={9} fill="#9ca3af">
              {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            </text>
          </g>
        ))}

        {/* Áreas y líneas */}
        {TUBOS.filter(t => visibles.has(t.key)).map(t => {
          const pts = data.map((d, i) => `${xOf(i)},${yOf(d[t.key as keyof ConsumoMensual] as number)}`)
          const area = `${pts.join(" ")} ${xOf(data.length - 1)},${PAD.t + cH} ${PAD.l},${PAD.t + cH}`
          return (
            <g key={t.key}>
              <polygon points={area} fill={`url(#ag2-${t.key})`} />
              <polyline points={pts.join(" ")} fill="none" stroke={t.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )
        })}

        {/* Hover */}
        {tooltip !== null && (
          <line x1={xOf(tooltip)} y1={PAD.t} x2={xOf(tooltip)} y2={PAD.t + cH} stroke="#6b7280" strokeWidth="1" strokeDasharray="4 3" />
        )}
        {tooltip !== null && TUBOS.filter(t => visibles.has(t.key)).map(t => (
          <circle key={t.key} cx={xOf(tooltip)} cy={yOf(data[tooltip][t.key as keyof ConsumoMensual] as number)}
            r={4} fill="white" stroke={t.color} strokeWidth="2" />
        ))}

        {/* Eje X */}
        {data.map((d, i) => {
          const step = Math.max(1, Math.floor(data.length / 10))
          if (i % step !== 0 && i !== data.length - 1) return null
          return <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="#9ca3af">{d.mes}</text>
        })}

        {/* Zonas hover */}
        {data.map((_, i) => (
          <rect key={i} x={xOf(i) - cW / (data.length * 2)} y={PAD.t} width={cW / data.length} height={cH}
            fill="transparent" onMouseEnter={() => setTooltip(i)} style={{ cursor: "crosshair" }} />
        ))}
      </svg>

      {/* Tooltip */}
      {tooltip !== null && (
        <div className="absolute pointer-events-none z-20 bg-white/95 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-xl px-3.5 py-3 text-xs min-w-[170px]"
          style={{
            left: `${(xOf(tooltip) / W) * 100}%`,
            top: "10px",
            transform: tooltip > data.length * 0.65 ? "translateX(-110%)" : "translateX(10px)",
          }}>
          <div className="flex items-center justify-between gap-3 mb-2.5 pb-2 border-b border-gray-100">
            <p className="font-bold text-gray-800">{data[tooltip].mes}</p>
            {EVENTOS[data[tooltip].monthIndex] && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: EVENTOS[data[tooltip].monthIndex].color, color: EVENTOS[data[tooltip].monthIndex].border }}>
                {EVENTOS[data[tooltip].monthIndex].label}
              </span>
            )}
          </div>
          {TUBOS.filter(t => visibles.has(t.key)).map(t => (
            <div key={t.key} className="flex items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                <span className="text-gray-500">{t.label}</span>
              </div>
              <span className="font-bold tabular-nums text-gray-800">
                {(data[tooltip][t.key as keyof ConsumoMensual] as number).toLocaleString("es-ES")}
              </span>
            </div>
          ))}
          <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between">
            <span className="text-gray-400">Total</span>
            <span className="font-bold tabular-nums text-gray-800">
              {TUBOS.filter(t => visibles.has(t.key))
                .reduce((s, t) => s + (data[tooltip][t.key as keyof ConsumoMensual] as number), 0)
                .toLocaleString("es-ES")}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Forecast chart con bandas de confianza ────────────────────────────────────

export function ForecastChart({ data, height = 200 }: { data: ForecastPunto[]; height?: number }) {
  const [tooltip, setTooltip] = useState<number | null>(null)
  if (data.length === 0) return null
  const W = 800; const H = height
  const PAD = { l: 52, r: 16, t: 20, b: 32 }
  const cW = W - PAD.l - PAD.r; const cH = H - PAD.t - PAD.b

  const allVals = data.flatMap(d => [d.upper, d.lower])
  const maxV = Math.max(...allVals, 1); const minV = Math.min(...allVals, 0)
  const range = maxV - minV || 1

  const xOf = (i: number) => PAD.l + (data.length > 1 ? (i / (data.length - 1)) * cW : cW / 2)
  const yOf = (v: number) => PAD.t + cH - ((v - minV) / range) * cH

  const realData = data.filter(d => !d.esForecast)
  const fcData = data.filter(d => d.esForecast)
  const splitIdx = realData.length - 1

  const upperPts = data.map((d, i) => `${xOf(i)},${yOf(d.upper)}`).join(" ")
  const lowerPtsRev = [...data].reverse().map((d, i) => `${xOf(data.length - 1 - i)},${yOf(d.lower)}`).join(" ")
  const realPts = realData.map((d, i) => `${xOf(i)},${yOf(d.valor)}`).join(" ")
  const fcPts = [realData[splitIdx], ...fcData].map((d, i) => `${xOf(splitIdx + i)},${yOf(d.valor)}`).join(" ")

  const ticks = 4
  return (
    <div className="relative select-none" onMouseLeave={() => setTooltip(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <defs>
          <linearGradient id="fc-band" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={TEAL} stopOpacity="0.15" />
            <stop offset="100%" stopColor={TEAL} stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* Banda de confianza */}
        <polygon points={`${upperPts} ${lowerPtsRev}`} fill="url(#fc-band)" />

        {/* Grid */}
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const v = minV + (range / ticks) * i
          return (
            <g key={i}>
              <line x1={PAD.l} y1={yOf(v)} x2={W - PAD.r} y2={yOf(v)} stroke="#e5e7eb" strokeWidth="0.7" />
              <text x={PAD.l - 6} y={yOf(v) + 3.5} textAnchor="end" fontSize={9} fill="#9ca3af">
                {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : Math.round(v)}
              </text>
            </g>
          )
        })}

        {/* Línea separadora real/forecast */}
        {splitIdx >= 0 && (
          <line x1={xOf(splitIdx)} y1={PAD.t} x2={xOf(splitIdx)} y2={PAD.t + cH}
            stroke="#9ca3af" strokeWidth="1" strokeDasharray="6 4" />
        )}

        {/* Líneas */}
        <polyline points={realPts} fill="none" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {fcData.length > 0 && (
          <polyline points={fcPts} fill="none" stroke={TEAL} strokeWidth="2" strokeDasharray="6 3" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
        )}

        {/* Puntos hover */}
        {tooltip !== null && (
          <circle cx={xOf(tooltip)} cy={yOf(data[tooltip].valor)} r={5}
            fill="white" stroke={TEAL} strokeWidth="2.5" />
        )}

        {/* Eje X */}
        {data.map((d, i) => {
          const step = Math.max(1, Math.floor(data.length / 8))
          if (i % step !== 0 && i !== data.length - 1) return null
          return (
            <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle" fontSize={9}
              fill={d.esForecast ? TEAL : "#9ca3af"} fontWeight={d.esForecast ? "600" : "400"}>
              {d.mes}
            </text>
          )
        })}

        {/* Hover zones */}
        {data.map((_, i) => (
          <rect key={i} x={xOf(i) - cW / (data.length * 2)} y={PAD.t}
            width={cW / data.length} height={cH} fill="transparent"
            onMouseEnter={() => setTooltip(i)} style={{ cursor: "crosshair" }} />
        ))}
      </svg>

      {/* Tooltip */}
      {tooltip !== null && (
        <div className="absolute pointer-events-none z-20 bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl shadow-xl px-3 py-2.5 text-xs"
          style={{
            left: `${(xOf(tooltip) / W) * 100}%`,
            top: "10px",
            transform: tooltip > data.length * 0.65 ? "translateX(-110%)" : "translateX(10px)",
          }}>
          <p className="font-bold text-gray-800 mb-1">{data[tooltip].mes} {data[tooltip].esForecast ? "· Forecast" : ""}</p>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: TEAL }} />
            <span className="text-gray-500">Valor:</span>
            <span className="font-bold tabular-nums" style={{ color: TEAL }}>{data[tooltip].valor.toLocaleString("es-ES")}</span>
          </div>
          {data[tooltip].esForecast && (
            <p className="text-[10px] text-gray-400 mt-1">
              Intervalo: {data[tooltip].lower.toLocaleString("es-ES")} – {data[tooltip].upper.toLocaleString("es-ES")}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Donut chart (CSS conic-gradient) ─────────────────────────────────────────

export function DonutChart({ segments }: {
  segments: { label: string; value: number; color: string }[]
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return null
  let cumPct = 0
  const stops = segments.map(seg => {
    const pct = (seg.value / total) * 100
    const start = cumPct; cumPct += pct
    return `${seg.color} ${start.toFixed(1)}% ${cumPct.toFixed(1)}%`
  })
  return (
    <div className="relative w-28 h-28 shrink-0">
      <div className="w-full h-full rounded-full"
        style={{ background: `conic-gradient(${stops.join(", ")})` }} />
      <div className="absolute inset-3 rounded-full bg-white flex flex-col items-center justify-center">
        <span className="text-[10px] text-gray-400 font-medium">Total</span>
        <span className="text-xs font-bold text-gray-700 tabular-nums leading-tight">
          {total >= 1000 ? `${(total / 1000).toFixed(0)}k` : total}
        </span>
      </div>
    </div>
  )
}
