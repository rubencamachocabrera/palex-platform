"use client"

import { useState } from "react"
import { TEAL } from "@/lib/brand"
import type { LecturaTemperatura, TendenciaPunto } from "../_lib/types"

// ─── Sparkline ────────────────────────────────────────────────────────────────

export function Sparkline({ values, color, height = 36 }: {
  values: number[]; color: string; height?: number
}) {
  if (values.length < 2) return null
  const W = 100; const H = height
  const min = Math.min(...values); const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`spt-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={`${pts.join(" ")} ${W},${H} 0,${H}`} fill={`url(#spt-${color.replace("#", "")})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Gráfico de temperatura con banda de rango seguro ─────────────────────────

export function TempChart({ data, height = 180 }: { data: LecturaTemperatura[]; height?: number }) {
  const [tooltip, setTooltip] = useState<number | null>(null)
  if (data.length === 0) return null
  const W = 800; const H = height
  const PAD = { l: 40, r: 16, t: 16, b: 28 }
  const cW = W - PAD.l - PAD.r; const cH = H - PAD.t - PAD.b

  const rangoMin = data[0].rangoMin; const rangoMax = data[0].rangoMax
  const allVals = data.map(d => d.temperatura)
  const maxV = Math.max(...allVals, rangoMax) + 1
  const minV = Math.min(...allVals, rangoMin) - 1
  const range = maxV - minV || 1

  const xOf = (i: number) => PAD.l + (data.length > 1 ? (i / (data.length - 1)) * cW : cW / 2)
  const yOf = (v: number) => PAD.t + cH - ((v - minV) / range) * cH

  const pts = data.map((d, i) => `${xOf(i)},${yOf(d.temperatura)}`).join(" ")

  return (
    <div className="relative select-none" onMouseLeave={() => setTooltip(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {/* Banda segura */}
        <rect x={PAD.l} y={yOf(rangoMax)} width={cW} height={yOf(rangoMin) - yOf(rangoMax)} fill="#10b98114" />
        <line x1={PAD.l} y1={yOf(rangoMax)} x2={W - PAD.r} y2={yOf(rangoMax)} stroke="#10b981" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
        <line x1={PAD.l} y1={yOf(rangoMin)} x2={W - PAD.r} y2={yOf(rangoMin)} stroke="#10b981" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
        <text x={PAD.l - 6} y={yOf(rangoMax) + 3} textAnchor="end" fontSize={9} fill="#9ca3af">{rangoMax}°</text>
        <text x={PAD.l - 6} y={yOf(rangoMin) + 3} textAnchor="end" fontSize={9} fill="#9ca3af">{rangoMin}°</text>

        {/* Línea temperatura */}
        <polyline points={pts} fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => d.temperatura > d.rangoMax || d.temperatura < d.rangoMin ? (
          <circle key={i} cx={xOf(i)} cy={yOf(d.temperatura)} r={3.5} fill="#ef4444" />
        ) : null)}

        {tooltip !== null && (
          <>
            <line x1={xOf(tooltip)} y1={PAD.t} x2={xOf(tooltip)} y2={PAD.t + cH} stroke="#6b7280" strokeWidth="1" strokeDasharray="4 3" />
            <circle cx={xOf(tooltip)} cy={yOf(data[tooltip].temperatura)} r={4.5} fill="white" stroke={TEAL} strokeWidth="2" />
          </>
        )}

        {/* Eje X */}
        {data.map((d, i) => {
          const step = Math.max(1, Math.floor(data.length / 8))
          if (i % step !== 0 && i !== data.length - 1) return null
          return <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="#9ca3af">{d.hora}</text>
        })}

        {/* Hover zones */}
        {data.map((_, i) => (
          <rect key={i} x={xOf(i) - cW / (data.length * 2)} y={PAD.t} width={cW / data.length} height={cH}
            fill="transparent" onMouseEnter={() => setTooltip(i)} style={{ cursor: "crosshair" }} />
        ))}
      </svg>

      {tooltip !== null && (
        <div className="absolute pointer-events-none z-20 bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl shadow-xl px-3 py-2 text-xs"
          style={{
            left: `${(xOf(tooltip) / W) * 100}%`,
            top: "6px",
            transform: tooltip > data.length * 0.65 ? "translateX(-110%)" : "translateX(10px)",
          }}>
          <p className="font-bold text-gray-800 mb-0.5">{data[tooltip].hora}</p>
          <p className={`font-bold tabular-nums ${data[tooltip].temperatura > data[tooltip].rangoMax || data[tooltip].temperatura < data[tooltip].rangoMin ? "text-red-500" : ""}`}
            style={{ color: data[tooltip].temperatura > data[tooltip].rangoMax || data[tooltip].temperatura < data[tooltip].rangoMin ? undefined : TEAL }}>
            {data[tooltip].temperatura}°C
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Gráfico de tendencias diarias (área simple) ──────────────────────────────

export function TendenciaChart({ data, dataKey, color, height = 200, suffix = "" }: {
  data: TendenciaPunto[]; dataKey: keyof TendenciaPunto; color: string; height?: number; suffix?: string
}) {
  const [tooltip, setTooltip] = useState<number | null>(null)
  if (data.length === 0) return null
  const W = 800; const H = height
  const PAD = { l: 40, r: 16, t: 16, b: 28 }
  const cW = W - PAD.l - PAD.r; const cH = H - PAD.t - PAD.b

  const vals = data.map(d => Number(d[dataKey]))
  const maxV = Math.max(...vals, 1)
  const minV = Math.min(...vals, 0)
  const range = (maxV - minV) || 1

  const xOf = (i: number) => PAD.l + (data.length > 1 ? (i / (data.length - 1)) * cW : cW / 2)
  const yOf = (v: number) => PAD.t + cH - ((v - minV) / range) * cH

  const pts = data.map((d, i) => `${xOf(i)},${yOf(Number(d[dataKey]))}`)
  const area = `${pts.join(" ")} ${xOf(data.length - 1)},${PAD.t + cH} ${PAD.l},${PAD.t + cH}`

  const ticks = [0, 0.5, 1].map(f => Math.round(minV + range * f))

  return (
    <div className="relative select-none" onMouseLeave={() => setTooltip(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <defs>
          <linearGradient id={`tg-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.20" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={PAD.l} y1={yOf(v)} x2={W - PAD.r} y2={yOf(v)} stroke="#e5e7eb" strokeWidth="0.7" />
            <text x={PAD.l - 6} y={yOf(v) + 3} textAnchor="end" fontSize={9} fill="#9ca3af">{v}{suffix}</text>
          </g>
        ))}
        <polygon points={area} fill={`url(#tg-${dataKey})`} />
        <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {tooltip !== null && (
          <>
            <line x1={xOf(tooltip)} y1={PAD.t} x2={xOf(tooltip)} y2={PAD.t + cH} stroke="#6b7280" strokeWidth="1" strokeDasharray="4 3" />
            <circle cx={xOf(tooltip)} cy={yOf(Number(data[tooltip][dataKey]))} r={4} fill="white" stroke={color} strokeWidth="2" />
          </>
        )}
        {data.map((d, i) => {
          const step = Math.max(1, Math.floor(data.length / 10))
          if (i % step !== 0 && i !== data.length - 1) return null
          return <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="#9ca3af">{d.label}</text>
        })}
        {data.map((_, i) => (
          <rect key={i} x={xOf(i) - cW / (data.length * 2)} y={PAD.t} width={cW / data.length} height={cH}
            fill="transparent" onMouseEnter={() => setTooltip(i)} style={{ cursor: "crosshair" }} />
        ))}
      </svg>
      {tooltip !== null && (
        <div className="absolute pointer-events-none z-20 bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl shadow-xl px-3 py-2 text-xs"
          style={{
            left: `${(xOf(tooltip) / W) * 100}%`,
            top: "6px",
            transform: tooltip > data.length * 0.65 ? "translateX(-110%)" : "translateX(10px)",
          }}>
          <p className="font-bold text-gray-800 mb-0.5">{data[tooltip].label}</p>
          <p className="font-bold tabular-nums" style={{ color }}>{data[tooltip][dataKey] as number}{suffix}</p>
        </div>
      )}
    </div>
  )
}
