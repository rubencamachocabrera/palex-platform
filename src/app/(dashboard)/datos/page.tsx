"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { TEAL } from "@/lib/brand"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Hospital { id: string; nombre: string; ciudad: string }

interface PuntoTemporal {
  mes: string
  year: number
  monthIndex: number
  edta: number; hepar: number; coag: number; suero: number
  gluco: number; orina: number; inmuno: number; hemoc: number
}

// ─── Catálogo de tubos ────────────────────────────────────────────────────────

const TUBOS = [
  { key: "edta",  label: "EDTA K2",          sub: "Tapón lila · Hemograma, HbA1c, VSG",           color: "#8B5CF6", light: "#EDE9FE", dark: "#6D28D9" },
  { key: "hepar", label: "Heparina Li",       sub: "Tapón verde · Bioquímica urgente, ionograma",  color: "#10B981", light: "#D1FAE5", dark: "#059669" },
  { key: "coag",  label: "Coagulación",       sub: "Tapón azul · INR, TTPA, fibrinógeno",          color: "#3B82F6", light: "#DBEAFE", dark: "#2563EB" },
  { key: "suero", label: "Suero / SST",       sub: "Tapón dorado · Bioquímica, hormonas, tumoral", color: "#F59E0B", light: "#FEF3C7", dark: "#D97706" },
  { key: "gluco", label: "Glucosa / NaF",     sub: "Tapón gris · Glucemia, TTOG",                 color: "#6B7280", light: "#F3F4F6", dark: "#4B5563" },
  { key: "orina", label: "Orina",             sub: "Tapón amarillo · Análisis, sedimento",         color: "#EAB308", light: "#FEF9C3", dark: "#CA8A04" },
  { key: "inmuno",label: "Inmunología",       sub: "Tapón rosa · Alergias IgE, serologías",        color: "#EC4899", light: "#FCE7F3", dark: "#DB2777" },
  { key: "hemoc", label: "Hemocultivo",       sub: "Botella roja · Infecciones, urocultivo",       color: "#EF4444", light: "#FEE2E2", dark: "#DC2626" },
] as const
type TuboKey = typeof TUBOS[number]["key"]

// ─── Eventos estacionales ─────────────────────────────────────────────────────

const EVENTOS = [
  { mes: 0,  label: "Reconoc. empresa",    color: "#6366f120", border: "#6366f1", tubos: ["edta","hepar","suero","orina"] },
  { mes: 1,  label: "Resaca navideña",     color: "#f59e0b15", border: "#f59e0b", tubos: ["suero","gluco","edta"] },
  { mes: 2,  label: "Campaña alergias",    color: "#ec489920", border: "#ec4899", tubos: ["inmuno"] },
  { mes: 3,  label: "Semana Santa ↓",      color: "#6b728015", border: "#6b7280", tubos: [] },
  { mes: 4,  label: "Campaña alergias",    color: "#ec489920", border: "#ec4899", tubos: ["inmuno"] },
  { mes: 5,  label: "Revisiones verano",   color: "#10b98115", border: "#10b981", tubos: ["edta","suero"] },
  { mes: 6,  label: "Vacaciones ↓↓",       color: "#3b82f610", border: "#3b82f6", tubos: [] },
  { mes: 7,  label: "Vacaciones / calor",  color: "#3b82f610", border: "#3b82f6", tubos: [] },
  { mes: 8,  label: "Reincorporación",     color: "#10b98115", border: "#10b981", tubos: ["edta","suero","coag"] },
  { mes: 9,  label: "Reconoc. laborales",  color: "#8b5cf620", border: "#8b5cf6", tubos: ["edta","hepar","suero","orina","gluco"] },
  { mes: 10, label: "Pico máximo año",     color: "#ef444420", border: "#ef4444", tubos: ["edta","hepar","suero","orina","gluco"] },
  { mes: 11, label: "Cierre año ↓",        color: "#6b728015", border: "#6b7280", tubos: [] },
]

// ─── Generador de datos ficticios ─────────────────────────────────────────────

function seededRand(seed: number) {
  let s = seed
  return () => { s = (s * 1664525 + 1013904223) & 0xFFFFFFFF; return (s >>> 0) / 0xFFFFFFFF }
}

const SEASONAL_MULT: Record<TuboKey, number[]> = {
  edta:  [1.10,1.05,1.00,0.88,1.02,0.95,0.72,0.68,1.05,1.20,1.25,0.90],
  hepar: [1.12,1.08,1.00,0.85,1.00,0.93,0.70,0.65,1.08,1.22,1.28,0.88],
  coag:  [1.05,1.00,0.98,0.90,1.00,0.95,0.75,0.72,1.02,1.15,1.18,0.92],
  suero: [1.15,1.12,1.05,0.90,1.05,0.98,0.74,0.70,1.10,1.25,1.30,0.92],
  gluco: [1.08,1.10,1.02,0.88,1.00,0.95,0.72,0.68,1.05,1.18,1.22,0.90],
  orina: [1.05,1.02,0.98,0.88,1.00,0.92,0.70,0.68,1.05,1.18,1.20,0.88],
  inmuno:[0.90,0.85,1.30,1.20,1.45,0.95,0.65,0.62,0.88,0.85,0.82,0.75],
  hemoc: [1.05,1.02,0.95,0.90,0.95,0.92,0.85,0.88,0.95,1.05,1.10,0.98],
}

function generarDatos(hospitalId: string, meses: number): PuntoTemporal[] {
  const seed = hospitalId.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  const rand = seededRand(seed)
  const base = {
    edta:  180 + rand() * 120, hepar: 120 + rand() * 80,
    coag:  70  + rand() * 60,  suero: 140 + rand() * 100,
    gluco: 50  + rand() * 40,  orina: 55  + rand() * 50,
    inmuno:30  + rand() * 30,  hemoc: 15  + rand() * 20,
  }
  const ahora = new Date()
  return Array.from({ length: meses }, (_, i) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - (meses - 1 - i), 1)
    const mi = d.getMonth()
    const trend = 1 + 0.003 * i
    const noise = () => 0.90 + rand() * 0.20
    return {
      mes: d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }),
      year: d.getFullYear(), monthIndex: mi,
      edta:  Math.round(base.edta  * SEASONAL_MULT.edta[mi]  * trend * noise()),
      hepar: Math.round(base.hepar * SEASONAL_MULT.hepar[mi] * trend * noise()),
      coag:  Math.round(base.coag  * SEASONAL_MULT.coag[mi]  * trend * noise()),
      suero: Math.round(base.suero * SEASONAL_MULT.suero[mi] * trend * noise()),
      gluco: Math.round(base.gluco * SEASONAL_MULT.gluco[mi] * trend * noise()),
      orina: Math.round(base.orina * SEASONAL_MULT.orina[mi] * trend * noise()),
      inmuno:Math.round(base.inmuno* SEASONAL_MULT.inmuno[mi]* trend * noise()),
      hemoc: Math.round(base.hemoc * SEASONAL_MULT.hemoc[mi] * trend * noise()),
    }
  })
}

// ─── SVG Sparkline ────────────────────────────────────────────────────────────

function Sparkline({ values, color, height = 36, forecast = false }: { values: number[]; color: string; height?: number; forecast?: boolean }) {
  if (values.length < 2) return null
  const W = 100; const H = height
  const min = Math.min(...values); const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`)
  const splitAt = Math.floor(values.length * 0.8)
  const histPts = pts.slice(0, splitAt + 1).join(" ")
  const fcPts   = pts.slice(splitAt).join(" ")
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`sp-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={`${pts.join(" ")} ${W},${H} 0,${H}`} fill={`url(#sp-${color.replace("#","")})`} />
      <polyline points={histPts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {forecast && <polyline points={fcPts} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />}
    </svg>
  )
}

// ─── Gráfico de área principal con anotaciones estacionales ──────────────────

function AreaChart({ data, visibles, tooltip, onHover }: {
  data: PuntoTemporal[]
  visibles: Set<TuboKey>
  tooltip: number | null
  onHover: (i: number | null) => void
}) {
  const W = 800; const H = 220
  const PAD = { l: 50, r: 16, t: 16, b: 32 }
  const cW = W - PAD.l - PAD.r; const cH = H - PAD.t - PAD.b

  const allVals = data.flatMap(d => TUBOS.filter(t => visibles.has(t.key)).map(t => d[t.key as keyof PuntoTemporal] as number))
  const maxV = Math.max(...allVals, 1)
  const ticks = [0, Math.round(maxV * 0.25), Math.round(maxV * 0.5), Math.round(maxV * 0.75), maxV]

  const xOf = (i: number) => PAD.l + (data.length > 1 ? (i / (data.length - 1)) * cW : cW / 2)
  const yOf = (v: number) => PAD.t + cH - (v / maxV) * cH

  return (
    <div className="relative select-none" onMouseLeave={() => onHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <defs>
          {TUBOS.map(t => (
            <linearGradient key={t.key} id={`ag-${t.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={t.color} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>

        {/* Bandas estacionales */}
        {data.map((d, i) => {
          const ev = EVENTOS[d.monthIndex]
          if (!ev || i > 0 && data[i-1].monthIndex === d.monthIndex) return null
          const x1 = xOf(i)
          const nextIdx = data.findIndex((dd, ii) => ii > i && dd.monthIndex !== d.monthIndex)
          const x2 = nextIdx === -1 ? W - PAD.r : xOf(nextIdx)
          return (
            <rect key={i} x={x1} y={PAD.t} width={x2 - x1} height={cH}
              fill={ev.color} rx="0" opacity="0.9" />
          )
        })}

        {/* Grid lines */}
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={PAD.l} y1={yOf(v)} x2={W - PAD.r} y2={yOf(v)} stroke="#e5e7eb" strokeWidth="0.8" />
            <text x={PAD.l - 6} y={yOf(v) + 3.5} textAnchor="end" fontSize={9} fill="#9ca3af">
              {v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
            </text>
          </g>
        ))}

        {/* Áreas y líneas */}
        {TUBOS.filter(t => visibles.has(t.key)).map(t => {
          const pts = data.map((d, i) => `${xOf(i)},${yOf(d[t.key as keyof PuntoTemporal] as number)}`)
          const area = `${pts.join(" ")} ${xOf(data.length-1)},${PAD.t+cH} ${PAD.l},${PAD.t+cH}`
          return (
            <g key={t.key}>
              <polygon points={area} fill={`url(#ag-${t.key})`} />
              <polyline points={pts.join(" ")} fill="none" stroke={t.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )
        })}

        {/* Línea de hover */}
        {tooltip !== null && (
          <line x1={xOf(tooltip)} y1={PAD.t} x2={xOf(tooltip)} y2={PAD.t+cH}
            stroke="#6b7280" strokeWidth="1" strokeDasharray="4 3" />
        )}

        {/* Puntos en hover */}
        {tooltip !== null && TUBOS.filter(t => visibles.has(t.key)).map(t => (
          <circle key={t.key} cx={xOf(tooltip)} cy={yOf(data[tooltip][t.key as keyof PuntoTemporal] as number)}
            r={4} fill="white" stroke={t.color} strokeWidth="2" />
        ))}

        {/* Eje X */}
        {data.map((d, i) => {
          const step = Math.max(1, Math.floor(data.length / 10))
          if (i % step !== 0 && i !== data.length - 1) return null
          return <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="#9ca3af">{d.mes}</text>
        })}

        {/* Zonas de hover invisibles */}
        {data.map((_, i) => (
          <rect key={i} x={xOf(i) - cW / (data.length * 2)} y={PAD.t}
            width={cW / data.length} height={cH} fill="transparent"
            onMouseEnter={() => onHover(i)} style={{ cursor: "crosshair" }} />
        ))}
      </svg>

      {/* Tooltip flotante */}
      {tooltip !== null && (
        <div className="absolute pointer-events-none z-20 bg-white/95 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-xl px-3.5 py-3 text-xs min-w-[160px]"
          style={{
            left: `${(xOf(tooltip) / W) * 100}%`,
            top: "10px",
            transform: tooltip > data.length * 0.65 ? "translateX(-110%)" : "translateX(10px)",
          }}>
          <div className="flex items-center justify-between gap-3 mb-2.5 pb-2 border-b border-gray-100">
            <p className="font-bold text-gray-800">{data[tooltip].mes}</p>
            {EVENTOS[data[tooltip].monthIndex] && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
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
                {(data[tooltip][t.key as keyof PuntoTemporal] as number).toLocaleString("es-ES")}
              </span>
            </div>
          ))}
          <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between">
            <span className="text-gray-400">Total</span>
            <span className="font-bold text-gray-800 tabular-nums">
              {TUBOS.filter(t => visibles.has(t.key))
                .reduce((s, t) => s + (data[tooltip][t.key as keyof PuntoTemporal] as number), 0)
                .toLocaleString("es-ES")}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Comparador Mes vs Mes ────────────────────────────────────────────────────

function ComparadorMeses({ data, visibles }: { data: PuntoTemporal[]; visibles: Set<TuboKey> }) {
  const opciones = data.map((d, i) => ({ label: d.mes, idx: i }))
  const [idxA, setIdxA] = useState(Math.max(0, data.length - 2))
  const [idxB, setIdxB] = useState(Math.max(0, data.length - 1))

  const mesA = data[idxA]; const mesB = data[idxB]
  if (!mesA || !mesB) return null
  const tubosVis = TUBOS.filter(t => visibles.has(t.key))
  const maxVal = Math.max(...tubosVis.flatMap(t => [mesA[t.key as keyof PuntoTemporal] as number, mesB[t.key as keyof PuntoTemporal] as number]), 1)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-indigo-500" />
          <select value={idxA} onChange={e => setIdxA(+e.target.value)}
            className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none">
            {opciones.map(o => <option key={o.idx} value={o.idx}>{o.label}</option>)}
          </select>
        </div>
        <span className="text-xs font-bold text-gray-400">vs</span>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-orange-400" />
          <select value={idxB} onChange={e => setIdxB(+e.target.value)}
            className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none">
            {opciones.map(o => <option key={o.idx} value={o.idx}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-2.5">
        {tubosVis.map(t => {
          const vA = mesA[t.key as keyof PuntoTemporal] as number
          const vB = mesB[t.key as keyof PuntoTemporal] as number
          const pctA = (vA / maxVal) * 100; const pctB = (vB / maxVal) * 100
          const diff = vA ? ((vB - vA) / vA) * 100 : 0
          return (
            <div key={t.key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                  <span className="text-[11px] font-semibold text-gray-700">{t.label}</span>
                </div>
                <span className={`text-[10px] font-bold ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-500" : "text-gray-400"}`}>
                  {diff > 0 ? "▲" : diff < 0 ? "▼" : "="}{Math.abs(diff).toFixed(1)}%
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${pctA}%` }} />
                  </div>
                  <span className="text-[10px] tabular-nums text-gray-500 w-10 text-right">{vA.toLocaleString("es-ES")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-orange-400 transition-all duration-500" style={{ width: `${pctB}%` }} />
                  </div>
                  <span className="text-[10px] tabular-nums text-gray-500 w-10 text-right">{vB.toLocaleString("es-ES")}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Comparador Año vs Año ────────────────────────────────────────────────────

function ComparadorAnios({ dataLarga, visibles }: { dataLarga: PuntoTemporal[]; visibles: Set<TuboKey> }) {
  const anios = [...new Set(dataLarga.map(d => d.year))].sort()
  const [anioA, setAnioA] = useState(anios[0] ?? 2024)
  const [anioB, setAnioB] = useState(anios[anios.length - 1] ?? 2025)

  const mesesNombres = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
  const datA = useMemo(() => mesesNombres.map((_, mi) => dataLarga.find(d => d.year === anioA && d.monthIndex === mi)), [dataLarga, anioA])
  const datB = useMemo(() => mesesNombres.map((_, mi) => dataLarga.find(d => d.year === anioB && d.monthIndex === mi)), [dataLarga, anioB])

  const tubosVis = TUBOS.filter(t => visibles.has(t.key))
  const firstTubo = tubosVis[0]
  if (!firstTubo) return null

  const valsA = datA.map(d => d ? d[firstTubo.key as keyof PuntoTemporal] as number : 0)
  const valsB = datB.map(d => d ? d[firstTubo.key as keyof PuntoTemporal] as number : 0)
  const maxV = Math.max(...valsA, ...valsB, 1)

  const W = 500; const H = 120; const PAD = { l: 8, r: 8, t: 8, b: 20 }
  const cW = W - PAD.l - PAD.r; const cH = H - PAD.t - PAD.b
  const xOf = (i: number) => PAD.l + (i / 11) * cW
  const yOf = (v: number) => PAD.t + cH - (v / maxV) * cH
  const ptsA = valsA.map((v, i) => `${xOf(i)},${yOf(v)}`).join(" ")
  const ptsB = valsB.map((v, i) => `${xOf(i)},${yOf(v)}`).join(" ")

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select value={anioA} onChange={e => setAnioA(+e.target.value)}
          className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none">
          {anios.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="text-xs font-bold text-gray-400">vs</span>
        <select value={anioB} onChange={e => setAnioB(+e.target.value)}
          className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none">
          {anios.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="text-[10px] text-gray-400 ml-auto">Tubo: {firstTubo.label}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <defs>
          <linearGradient id="ya-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id="yb-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <polygon points={`${ptsA} ${xOf(11)},${PAD.t+cH} ${PAD.l},${PAD.t+cH}`} fill="url(#ya-grad)" />
        <polygon points={`${ptsB} ${xOf(11)},${PAD.t+cH} ${PAD.l},${PAD.t+cH}`} fill="url(#yb-grad)" />
        <polyline points={ptsA} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={ptsB} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3" />
        {mesesNombres.map((m, i) => (
          <text key={i} x={xOf(i)} y={H - 4} textAnchor="middle" fontSize={8} fill="#9ca3af">{m}</text>
        ))}
      </svg>
      <div className="flex items-center gap-4 mt-2 text-[10px]">
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-indigo-500 inline-block rounded" />{anioA}</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-px inline-block" style={{ borderTop: "2px dashed #f97316" }} />{anioB}</span>
      </div>
    </div>
  )
}

// ─── Ranking hospitales ───────────────────────────────────────────────────────

function RankingHospitales({ hospitales, periodoMeses, tuboKey }: { hospitales: Hospital[]; periodoMeses: number; tuboKey: TuboKey }) {
  const ranking = useMemo(() =>
    hospitales.map(h => {
      const d = generarDatos(h.id, periodoMeses)
      const total = d.reduce((s, p) => s + (p[tuboKey] as number), 0)
      return { ...h, total }
    }).sort((a, b) => b.total - a.total).slice(0, 8)
  , [hospitales, periodoMeses, tuboKey])

  const maxVal = ranking[0]?.total ?? 1
  const tubo = TUBOS.find(t => t.key === tuboKey)!

  return (
    <div className="space-y-2">
      {ranking.map((h, i) => (
        <div key={h.id} className="flex items-center gap-2.5">
          <span className="w-5 text-[10px] font-bold text-gray-300 text-right shrink-0">{i + 1}</span>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[11px] font-semibold text-gray-700 truncate max-w-[160px]">{h.nombre}</span>
              <span className="text-[10px] tabular-nums text-gray-500 shrink-0 ml-2">{h.total.toLocaleString("es-ES")}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(h.total / maxVal) * 100}%`, backgroundColor: i === 0 ? tubo.color : `${tubo.color}99` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Heatmap Calendar (GitHub-style) ─────────────────────────────────────────

function HeatmapCalendar({ data }: { data: PuntoTemporal[] }) {
  const cols = data.slice(-24)
  const maxV = Math.max(...cols.map(d =>
    TUBOS.reduce((s, t) => s + (d[t.key as keyof PuntoTemporal] as number), 0)
  ), 1)
  const intensityColor = (v: number) => {
    const pct = v / maxV
    if (pct < 0.2) return "#f3f4f6"
    if (pct < 0.4) return `${TEAL}40`
    if (pct < 0.6) return `${TEAL}70`
    if (pct < 0.8) return `${TEAL}aa`
    return TEAL
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {cols.map((d, i) => {
          const total = TUBOS.reduce((s, t) => s + (d[t.key as keyof PuntoTemporal] as number), 0)
          const pct = total / maxV
          return (
            <div key={i} title={`${d.mes}: ${total.toLocaleString("es-ES")} tubos`}
              className="group relative cursor-default"
              style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: intensityColor(total) }}>
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {d.mes}: {total.toLocaleString("es-ES")}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-[10px] text-gray-400">Menos</span>
        {[0.1, 0.3, 0.55, 0.75, 1].map((v, i) => (
          <div key={i} className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: intensityColor(v * maxV) }} />
        ))}
        <span className="text-[10px] text-gray-400">Más</span>
      </div>
    </div>
  )
}

// ─── Panel de insights IA ─────────────────────────────────────────────────────

function InsightsPanel({ data, visibles }: { data: PuntoTemporal[]; visibles: Set<TuboKey> }) {
  const insights = useMemo(() => {
    if (data.length < 3) return []
    const result: { icon: string; color: string; bg: string; titulo: string; detalle: string; tipo: "alerta" | "patron" | "info" }[] = []

    // Detección campaña alergias
    const primaveraMeses = data.filter(d => [2,3,4].includes(d.monthIndex))
    const restoMeses = data.filter(d => ![2,3,4].includes(d.monthIndex))
    if (primaveraMeses.length > 0 && restoMeses.length > 0 && visibles.has("inmuno")) {
      const mediaP = primaveraMeses.reduce((s,d) => s + d.inmuno, 0) / primaveraMeses.length
      const mediaR = restoMeses.reduce((s,d) => s + d.inmuno, 0) / restoMeses.length
      const pct = mediaR > 0 ? ((mediaP - mediaR) / mediaR) * 100 : 0
      if (pct > 15) result.push({ icon: "🌸", color: "#ec4899", bg: "#fdf2f8", tipo: "patron",
        titulo: `+${pct.toFixed(0)}% Inmunología en primavera`,
        detalle: "Patrón estacional detectado: campaña de alergias mar-may. Incremento de IgE total e IgE específica consistente con la polinización en Andalucía."
      })
    }

    // Detección reconocimientos oct-nov
    const reconMeses = data.filter(d => [9,10].includes(d.monthIndex))
    if (reconMeses.length > 0 && visibles.has("edta")) {
      const mediaR = reconMeses.reduce((s,d) => s + d.edta, 0) / reconMeses.length
      const mediaG = data.reduce((s,d) => s + d.edta, 0) / data.length
      const pct = mediaG > 0 ? ((mediaR - mediaG) / mediaG) * 100 : 0
      if (pct > 8) result.push({ icon: "🏥", color: "#8b5cf6", bg: "#f5f3ff", tipo: "patron",
        titulo: `Pico reconocimientos oct-nov (+${pct.toFixed(0)}%)`,
        detalle: "Máximo anual en octubre-noviembre coincide con la campaña de reconocimientos médicos laborales. Afecta a EDTA, Bioquímica, Orina y Glucosa."
      })
    }

    // Detección caída verano
    const veranoMeses = data.filter(d => [6,7].includes(d.monthIndex))
    if (veranoMeses.length > 0) {
      const mediaV = veranoMeses.reduce((s,d) => s + d.edta + d.suero, 0) / veranoMeses.length
      const mediaG = data.reduce((s,d) => s + d.edta + d.suero, 0) / data.length
      const pct = mediaG > 0 ? ((mediaG - mediaV) / mediaG) * 100 : 0
      if (pct > 10) result.push({ icon: "☀️", color: "#f59e0b", bg: "#fffbeb", tipo: "patron",
        titulo: `Mínimo estival en julio-agosto (-${pct.toFixed(0)}%)`,
        detalle: "Caída esperada por vacaciones y calor extremo en Córdoba (>40°C). La cadena de frío es crítica en este período para las muestras en tránsito."
      })
    }

    // Anomalía: último mes vs anterior
    if (data.length >= 2) {
      const ult = data[data.length - 1]
      const pen = data[data.length - 2]
      for (const t of TUBOS.filter(tt => visibles.has(tt.key))) {
        const v1 = pen[t.key as keyof PuntoTemporal] as number
        const v2 = ult[t.key as keyof PuntoTemporal] as number
        const pct = v1 > 0 ? ((v2 - v1) / v1) * 100 : 0
        if (Math.abs(pct) > 20) {
          result.push({ icon: "⚠", color: "#ef4444", bg: "#fef2f2", tipo: "alerta",
            titulo: `Anomalía ${t.label}: ${pct > 0 ? "+" : ""}${pct.toFixed(0)}% vs mes anterior`,
            detalle: `Variación fuera del rango estacional esperado (±15%). Revisar si corresponde a un evento puntual o error de registro.`
          })
          break
        }
      }
    }

    // Tendencia general
    if (data.length >= 6) {
      const primerMitad = data.slice(0, Math.floor(data.length / 2))
      const segundaMitad = data.slice(Math.floor(data.length / 2))
      const m1 = primerMitad.reduce((s,d) => s + TUBOS.reduce((ss,t) => ss + (d[t.key as keyof PuntoTemporal] as number), 0), 0) / primerMitad.length
      const m2 = segundaMitad.reduce((s,d) => s + TUBOS.reduce((ss,t) => ss + (d[t.key as keyof PuntoTemporal] as number), 0), 0) / segundaMitad.length
      const pct = m1 > 0 ? ((m2 - m1) / m1) * 100 : 0
      result.push({ icon: "📈", color: pct >= 0 ? "#10b981" : "#ef4444", bg: pct >= 0 ? "#f0fdf4" : "#fef2f2", tipo: "info",
        titulo: `Tendencia global: ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% segunda mitad del período`,
        detalle: `El volumen total de muestras muestra una tendencia ${pct >= 0 ? "al alza" : "descendente"} respecto a la primera mitad del período analizado.`
      })
    }

    return result.slice(0, 4)
  }, [data, visibles])

  return (
    <div className="space-y-3">
      {insights.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-6">Selecciona al menos 6 meses para ver análisis automático.</p>
      )}
      {insights.map((ins, i) => (
        <div key={i} className="flex gap-3 p-3 rounded-xl border transition-all"
          style={{ backgroundColor: ins.bg, borderColor: `${ins.color}30` }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm"
            style={{ backgroundColor: `${ins.color}20` }}>
            <span style={{ color: ins.color, fontSize: 14 }}>
              {ins.tipo === "alerta" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              ) : ins.tipo === "patron" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
              )}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold mb-0.5 leading-snug" style={{ color: ins.color }}>{ins.titulo}</p>
            <p className="text-[10px] text-gray-500 leading-relaxed">{ins.detalle}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Selector de tubos con tapones de color ───────────────────────────────────

function TuboPill({ tubo, active, onClick }: { tubo: typeof TUBOS[number]; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-150 cursor-pointer"
      style={active
        ? { backgroundColor: tubo.color, borderColor: tubo.color, color: "white" }
        : { backgroundColor: "white", borderColor: "#e5e7eb", color: "#6b7280" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", display: "inline-block",
        backgroundColor: active ? "rgba(255,255,255,0.55)" : tubo.color, border: active ? "none" : "1.5px solid rgba(0,0,0,0.1)" }} />
      {tubo.label}
    </button>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const PERIODOS = [
  { k: "3m",  label: "3 meses",  meses: 3  },
  { k: "6m",  label: "6 meses",  meses: 6  },
  { k: "12m", label: "1 año",    meses: 12 },
  { k: "24m", label: "2 años",   meses: 24 },
] as const
type PeriodoKey = typeof PERIODOS[number]["k"]

const VISTAS = ["area", "comparador", "anio", "ranking", "heatmap", "tabla"] as const
type Vista = typeof VISTAS[number]

export default function DatosPage() {
  const [hospitales, setHospitales] = useState<Hospital[]>([])
  const [hospitalId, setHospitalId] = useState("")
  const [periodo, setPeriodo] = useState<PeriodoKey>("12m")
  const [visibles, setVisibles] = useState<Set<TuboKey>>(new Set(["edta","hepar","coag","suero","orina","inmuno"]))
  const [vista, setVista] = useState<Vista>("area")
  const [tooltip, setTooltip] = useState<number | null>(null)
  const [userRol, setUserRol] = useState("")
  const [tuboRanking, setTuboRanking] = useState<TuboKey>("edta")
  const [panelInsights, setPanelInsights] = useState(true)

  useEffect(() => {
    fetch("/api/hospitales").then(r => r.ok ? r.json() : []).then(d => {
      if (Array.isArray(d) && d.length > 0) {
        const sorted = d.sort((a: Hospital, b: Hospital) => a.nombre.localeCompare(b.nombre))
        setHospitales(sorted); setHospitalId(sorted[0].id)
      }
    })
    fetch("/api/perfil").then(r => r.ok ? r.json() : null).then(d => { if (d?.rol) setUserRol(d.rol) })
  }, [])

  const meses = PERIODOS.find(p => p.k === periodo)?.meses ?? 12
  const data = useMemo(() => hospitalId ? generarDatos(hospitalId, meses) : [], [hospitalId, meses])
  const data24 = useMemo(() => hospitalId ? generarDatos(hospitalId, 24) : [], [hospitalId])
  const hospital = hospitales.find(h => h.id === hospitalId)

  function toggleTubo(k: TuboKey) {
    setVisibles(prev => {
      const next = new Set(prev)
      if (next.has(k) && next.size > 1) next.delete(k); else next.add(k)
      return next
    })
  }

  const kpis = useMemo(() => TUBOS.map(t => {
    const vals = data.map(d => d[t.key as keyof PuntoTemporal] as number)
    const total = vals.reduce((s, v) => s + v, 0)
    const media = vals.length ? Math.round(total / vals.length) : 0
    const ultimo = vals[vals.length - 1] ?? 0
    const penultimo = vals[vals.length - 2] ?? ultimo
    const trend = penultimo ? ((ultimo - penultimo) / penultimo) * 100 : 0
    const pico = Math.max(...vals); const mesPico = data[vals.indexOf(pico)]?.mes ?? "—"
    return { ...t, total, media, ultimo, trend, pico, mesPico }
  }), [data])

  const totalGlobal = kpis.reduce((s, k) => s + k.total, 0)
  const mediaGlobal = Math.round(totalGlobal / (data.length || 1))
  const mesUltTrend = (() => {
    if (data.length < 2) return 0
    const u = data[data.length-1]; const p = data[data.length-2]
    const tu = TUBOS.reduce((s,t) => s + (u[t.key as keyof PuntoTemporal] as number), 0)
    const tp = TUBOS.reduce((s,t) => s + (p[t.key as keyof PuntoTemporal] as number), 0)
    return tp ? ((tu - tp) / tp) * 100 : 0
  })()

  if (userRol && userRol !== "ADMIN" && userRol !== "VENTAS") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
        </div>
        <p className="text-gray-500 font-semibold">Acceso restringido</p>
        <p className="text-sm text-gray-400 mt-1">Módulo disponible para ADMIN y VENTAS.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-10">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Explotación de datos</h1>
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border"
              style={{ color: TEAL, borderColor: `${TEAL}50`, backgroundColor: `${TEAL}0c` }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Vista demo
            </span>
          </div>
          <p className="text-sm text-gray-400">InLab Palex · Área de Gestión Sanitaria Sur de Córdoba · Consumo de fungible por hospital</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Export */}
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 1 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Excel
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 1 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            PDF
          </button>
          {/* Hospital selector */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <select value={hospitalId} onChange={e => setHospitalId(e.target.value)}
              className="text-sm font-semibold text-gray-800 bg-transparent focus:outline-none cursor-pointer max-w-[220px]">
              {hospitales.map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── KPIs globales ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total tubos",       value: totalGlobal.toLocaleString("es-ES"),  sub: `en ${meses} meses`,              color: TEAL,     icon: "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11l-5 5" },
          { label: "Media mensual",     value: mediaGlobal.toLocaleString("es-ES"),  sub: "unidades / mes · todos tipos",   color: "#6366f1", icon: "M18 20V10M12 20V4M6 20v-6M2 20h20" },
          { label: "Último mes",        value: (data[data.length-1] ? TUBOS.reduce((s,t) => s + (data[data.length-1][t.key as keyof PuntoTemporal] as number), 0) : 0).toLocaleString("es-ES"),
            sub: `${mesUltTrend > 0 ? "▲" : "▼"}${Math.abs(mesUltTrend).toFixed(1)}% vs mes anterior`, color: mesUltTrend >= 0 ? "#10b981" : "#ef4444",
            icon: "M22 12h-4l-3 9L9 3l-3 9H2" },
          { label: "Tipos activos",     value: `${visibles.size} / ${TUBOS.length}`,  sub: hospital?.nombre ?? "—",          color: "#f59e0b", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderTop: `3px solid ${k.color}` }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-2xl font-bold leading-none tabular-nums" style={{ color: k.color }}>{k.value}</p>
                <p className="text-xs font-semibold text-gray-700 mt-1.5">{k.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{k.sub}</p>
              </div>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${k.color}15` }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={k.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={k.icon} />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Controles ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        {/* Periodo + vistas */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-gray-100 p-0.5 rounded-xl">
            {PERIODOS.map(p => (
              <button key={p.k} onClick={() => setPeriodo(p.k)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                style={periodo === p.k ? { backgroundColor: "white", color: TEAL, boxShadow: "0 1px 4px rgba(0,0,0,.08)" } : { color: "#6b7280" }}>
                {p.label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-gray-200" />

          {/* Vista tabs */}
          {([
            { k: "area",       label: "Tendencia",   icon: "M22 12h-4l-3 9L9 3l-3 9H2" },
            { k: "comparador", label: "Mes vs Mes",  icon: "M18 20V10M12 20V4M6 20v-6" },
            { k: "anio",       label: "Año vs Año",  icon: "M3 3v18h18" },
            { k: "ranking",    label: "Ranking",     icon: "M18 20V10M12 20V4M6 20v-6M2 20h20" },
            { k: "heatmap",    label: "Heatmap",     icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
            { k: "tabla",      label: "Tabla",       icon: "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11" },
          ] as const).map(v => (
            <button key={v.k} onClick={() => setVista(v.k as Vista)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={vista === v.k ? { backgroundColor: `${TEAL}15`, color: TEAL } : { color: "#6b7280" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={v.icon} />
              </svg>
              {v.label}
            </button>
          ))}
        </div>

        {/* Filtro tubos */}
        <div className="flex flex-wrap gap-2">
          {TUBOS.map(t => (
            <TuboPill key={t.key} tubo={t} active={visibles.has(t.key)} onClick={() => toggleTubo(t.key)} />
          ))}
          <button onClick={() => setVisibles(new Set(TUBOS.map(t => t.key)))}
            className="px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-xs text-gray-400 hover:border-gray-400 transition-colors cursor-pointer">
            Todos
          </button>
        </div>
      </div>

      {/* ── Cuerpo principal: gráfico + insights ── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Gráfico / vista principal */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          {vista === "area" && (
            <>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                  <h2 className="text-sm font-bold text-gray-800">Evolución temporal del consumo</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">{hospital?.nombre} · {PERIODOS.find(p => p.k === periodo)?.label}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-400">
                  {/* Leyenda bandas */}
                  <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm inline-block bg-pink-200/60 border border-pink-400/40" />Alergias</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm inline-block bg-violet-200/60 border border-violet-400/40" />Reconoc.</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm inline-block bg-blue-200/50 border border-blue-400/40" />Vacaciones</span>
                </div>
              </div>
              {data.length > 0 && <AreaChart data={data} visibles={visibles} tooltip={tooltip} onHover={setTooltip} />}
              <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] text-gray-400 border-t border-gray-50 pt-3">
                {TUBOS.filter(t => visibles.has(t.key)).map(t => (
                  <span key={t.key} className="flex items-center gap-1.5">
                    <span className="w-3.5 h-[2px] rounded-full inline-block" style={{ backgroundColor: t.color }} />
                    {t.label}
                  </span>
                ))}
              </div>
            </>
          )}
          {vista === "comparador" && (
            <>
              <h2 className="text-sm font-bold text-gray-800 mb-3">Comparador mes a mes</h2>
              <ComparadorMeses data={data} visibles={visibles} />
            </>
          )}
          {vista === "anio" && (
            <>
              <h2 className="text-sm font-bold text-gray-800 mb-3">Comparativa año vs año</h2>
              <ComparadorAnios dataLarga={data24} visibles={visibles} />
            </>
          )}
          {vista === "ranking" && (
            <>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-sm font-bold text-gray-800">Ranking de consumo por hospital</h2>
                <select value={tuboRanking} onChange={e => setTuboRanking(e.target.value as TuboKey)}
                  className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none">
                  {TUBOS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <RankingHospitales hospitales={hospitales} periodoMeses={meses} tuboKey={tuboRanking} />
            </>
          )}
          {vista === "heatmap" && (
            <>
              <h2 className="text-sm font-bold text-gray-800 mb-1">Intensidad de consumo mensual</h2>
              <p className="text-[11px] text-gray-400 mb-4">Últimos 24 meses · todos los tubos agregados</p>
              <HeatmapCalendar data={data24} />
            </>
          )}
          {vista === "tabla" && (
            <div className="overflow-x-auto -mx-5 px-5">
              <h2 className="text-sm font-bold text-gray-800 mb-3">Desglose mensual detallado</h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-2 pr-3 text-left font-semibold text-gray-400 uppercase tracking-wide text-[10px]">Mes</th>
                    {TUBOS.filter(t => visibles.has(t.key)).map(t => (
                      <th key={t.key} className="py-2 px-2 text-right font-semibold uppercase tracking-wide text-[10px]" style={{ color: t.color }}>{t.label}</th>
                    ))}
                    <th className="py-2 pl-3 text-right font-semibold text-gray-400 uppercase tracking-wide text-[10px]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data].reverse().map((d, i) => {
                    const total = TUBOS.filter(t => visibles.has(t.key)).reduce((s, t) => s + (d[t.key as keyof PuntoTemporal] as number), 0)
                    const ev = EVENTOS[d.monthIndex]
                    return (
                      <tr key={d.mes} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors ${i === 0 ? "font-semibold" : ""}`}>
                        <td className="py-2.5 pr-3 text-gray-700 whitespace-nowrap">
                          {d.mes}
                          {ev && <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: ev.color, color: ev.border }}>{ev.label}</span>}
                        </td>
                        {TUBOS.filter(t => visibles.has(t.key)).map(t => (
                          <td key={t.key} className="py-2.5 px-2 text-right tabular-nums text-gray-700">{(d[t.key as keyof PuntoTemporal] as number).toLocaleString("es-ES")}</td>
                        ))}
                        <td className="py-2.5 pl-3 text-right tabular-nums font-bold text-gray-800">{total.toLocaleString("es-ES")}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Panel lateral: insights */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${TEAL}18` }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              </div>
              <h2 className="text-sm font-bold text-gray-800">Análisis inteligente</h2>
            </div>
            <button onClick={() => setPanelInsights(v => !v)} className="text-[10px] text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
              {panelInsights ? "Ocultar" : "Ver"}
            </button>
          </div>
          {panelInsights && <InsightsPanel data={data} visibles={visibles} />}

          {/* Leyenda estacional */}
          <div className="mt-5 pt-4 border-t border-gray-50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2.5">Contexto estacional · Córdoba</p>
            <div className="space-y-1.5">
              {[
                { color: "#ec489920", border: "#ec4899", label: "Mar–May", desc: "Campaña alergias · pico IgE" },
                { color: "#8b5cf620", border: "#8b5cf6", label: "Oct–Nov", desc: "Reconocimientos · pico máximo" },
                { color: "#3b82f610", border: "#3b82f6", label: "Jul–Ago", desc: "Vacaciones · mínimo anual" },
                { color: "#f59e0b15", border: "#f59e0b", label: "Ene–Feb", desc: "Resaca navideña · bioquímica" },
              ].map(e => (
                <div key={e.label} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: e.color, border: `1px solid ${e.border}` }} />
                  <span className="text-[10px] font-semibold text-gray-500">{e.label}</span>
                  <span className="text-[10px] text-gray-400 truncate">{e.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Cards individuales por tubo ── */}
      <div>
        <h2 className="text-sm font-bold text-gray-700 mb-3">Detalle por tipo de tubo</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map(t => {
            const vals = data.map(d => d[t.key as keyof PuntoTemporal] as number)
            const isVis = visibles.has(t.key)
            return (
              <div key={t.key} onClick={() => toggleTubo(t.key)}
                className={`bg-white rounded-2xl border shadow-sm p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${isVis ? "border-gray-100" : "border-gray-100 opacity-40 grayscale"}`}
                style={isVis ? { borderTop: `3px solid ${t.color}` } : {}}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color, border: "1.5px solid rgba(0,0,0,0.08)" }} />
                      <p className="text-xs font-bold text-gray-900 truncate">{t.label}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-tight">{t.sub}</p>
                  </div>
                  <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${Math.abs(t.trend) > 0.5 ? "" : "opacity-0"}`}
                    style={{ backgroundColor: t.trend > 0 ? "#d1fae5" : "#fee2e2", color: t.trend > 0 ? "#065f46" : "#991b1b" }}>
                    {t.trend > 0 ? "▲" : "▼"}{Math.abs(t.trend).toFixed(0)}%
                  </div>
                </div>

                <div className="mb-2.5">
                  <Sparkline values={vals} color={t.color} height={38} forecast />
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="bg-gray-50 rounded-lg px-2 py-1.5">
                    <p className="text-gray-400">Total</p>
                    <p className="font-bold text-gray-800 tabular-nums">{t.total.toLocaleString("es-ES")}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-2 py-1.5">
                    <p className="text-gray-400">Media/mes</p>
                    <p className="font-bold text-gray-800 tabular-nums">{t.media.toLocaleString("es-ES")}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-2 py-1.5">
                    <p className="text-gray-400">Último</p>
                    <p className="font-bold text-gray-800 tabular-nums">{t.ultimo.toLocaleString("es-ES")}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-2 py-1.5">
                    <p className="text-gray-400">Pico · {t.mesPico}</p>
                    <p className="font-bold tabular-nums" style={{ color: t.color }}>{t.pico.toLocaleString("es-ES")}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Footer disclaimer ── */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>Vista de demostración.</strong> Datos ficticios generados con patrones estacionales reales de Andalucía. En producción se conectará a la base de datos de consumo en tiempo real de InLab Palex, incluyendo gestión de lotes, caducidades y trazabilidad por nevera y ruta de transporte.
        </p>
      </div>
    </div>
  )
}
