"use client"

import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { TEAL } from "@/lib/brand"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Hospital { id: string; nombre: string; ciudad: string }

interface PuntoTemporal {
  mes: string      // "Ene 25"
  edta: number
  coag: number
  suero: number
  orina: number
}

// ─── Colores por tipo de tubo ─────────────────────────────────────────────────

const TUBOS = [
  { key: "edta",  label: "EDTA",          sub: "Tapón lila · Hematología",              color: "#8B5CF6", bg: "#F5F3FF", light: "#EDE9FE" },
  { key: "coag",  label: "Coagulación",   sub: "Tapón azul · Hemostasia",               color: "#3B82F6", bg: "#EFF6FF", light: "#DBEAFE" },
  { key: "suero", label: "Suero / SST",   sub: "Tapón dorado · Bioquímica",             color: "#F59E0B", bg: "#FFFBEB", light: "#FEF3C7" },
  { key: "orina", label: "Contenedor orina", sub: "Tapa amarilla · Urianálisis",        color: "#10B981", bg: "#ECFDF5", light: "#D1FAE5" },
] as const
type TuboKey = typeof TUBOS[number]["key"]

const PERIODOS = [
  { k: "3m",   label: "3 meses",   meses: 3  },
  { k: "6m",   label: "6 meses",   meses: 6  },
  { k: "12m",  label: "1 año",     meses: 12 },
  { k: "24m",  label: "2 años",    meses: 24 },
] as const
type PeriodoKey = typeof PERIODOS[number]["k"]

// ─── Generador de datos ficticios ─────────────────────────────────────────────
// Usa el ID del hospital como semilla para que cada hospital tenga datos únicos

function seededRand(seed: number): () => number {
  let s = seed
  return () => { s = (s * 1664525 + 1013904223) & 0xFFFFFFFF; return (s >>> 0) / 0xFFFFFFFF }
}

function generarDatos(hospitalId: string, meses: number): PuntoTemporal[] {
  const rand = seededRand(hospitalId.split("").reduce((a, c) => a + c.charCodeAt(0), 0))
  const base = { edta: 180 + rand() * 120, coag: 70 + rand() * 60, suero: 140 + rand() * 100, orina: 55 + rand() * 50 }
  const ahora = new Date()
  return Array.from({ length: meses }, (_, i) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - (meses - 1 - i), 1)
    const mes = d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" })
    const season = 1 + 0.12 * Math.sin((d.getMonth() / 12) * 2 * Math.PI)
    const trend = 1 + 0.003 * i
    const noise = () => 0.88 + rand() * 0.24
    return {
      mes,
      edta:  Math.round(base.edta  * season * trend * noise()),
      coag:  Math.round(base.coag  * season * trend * noise()),
      suero: Math.round(base.suero * season * trend * noise()),
      orina: Math.round(base.orina * season * trend * noise()),
    }
  })
}

// ─── Componente: Sparkline SVG ─────────────────────────────────────────────────

function Sparkline({ values, color, height = 36 }: { values: number[]; color: string; height?: number }) {
  if (!values.length) return null
  const W = 100; const H = height
  const min = Math.min(...values); const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`)
  const poly = pts.join(" ")
  const areaClose = `${W},${H} 0,${H}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <polygon points={`${poly} ${areaClose}`} fill={`url(#sg-${color.replace("#","")})`} />
      <polyline points={poly} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Componente: Área chart grande ────────────────────────────────────────────

function AreaChart({ data, visibles, tooltip, onHover }: {
  data: PuntoTemporal[]
  visibles: Set<TuboKey>
  tooltip: number | null
  onHover: (i: number | null) => void
}) {
  const W = 700; const H = 200
  const PAD = { l: 44, r: 12, t: 14, b: 28 }
  const cW = W - PAD.l - PAD.r; const cH = H - PAD.t - PAD.b

  const allVals = data.flatMap(d => TUBOS.filter(t => visibles.has(t.key)).map(t => d[t.key as keyof typeof d] as number))
  const maxV = Math.max(...allVals, 1)

  const xOf = (i: number) => PAD.l + (i / (data.length - 1)) * cW
  const yOf = (v: number) => PAD.t + cH - (v / maxV) * cH

  const ticks = [0, Math.round(maxV * 0.5), maxV]

  return (
    <div className="relative select-none" onMouseLeave={() => onHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <defs>
          {TUBOS.map(t => (
            <linearGradient key={t.key} id={`ag-${t.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={t.color} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid lines */}
        {ticks.map((v, i) => {
          const y = yOf(v)
          return (
            <g key={i}>
              <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#f0f0f0" strokeWidth="1" />
              <text x={PAD.l - 6} y={y + 3} textAnchor="end" fontSize={9} fill="#c0c0c0">{v}</text>
            </g>
          )
        })}

        {/* Áreas + líneas */}
        {TUBOS.filter(t => visibles.has(t.key)).map(t => {
          const pts = data.map((d, i) => `${xOf(i)},${yOf(d[t.key as keyof typeof d] as number)}`)
          const area = `${pts.join(" ")} ${W - PAD.r},${PAD.t + cH} ${PAD.l},${PAD.t + cH}`
          return (
            <g key={t.key}>
              <polygon points={area} fill={`url(#ag-${t.key})`} />
              <polyline points={pts.join(" ")} fill="none" stroke={t.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )
        })}

        {/* Tooltip vertical line */}
        {tooltip !== null && (
          <line x1={xOf(tooltip)} y1={PAD.t} x2={xOf(tooltip)} y2={PAD.t + cH} stroke="#9ca3af" strokeWidth="1" strokeDasharray="4 3" />
        )}

        {/* Puntos en hover */}
        {tooltip !== null && TUBOS.filter(t => visibles.has(t.key)).map(t => (
          <circle key={t.key}
            cx={xOf(tooltip)} cy={yOf(data[tooltip][t.key as keyof PuntoTemporal] as number)}
            r={4} fill="white" stroke={t.color} strokeWidth="2" />
        ))}

        {/* Labels eje X */}
        {data.map((d, i) => {
          const step = Math.max(1, Math.floor(data.length / 8))
          if (i % step !== 0 && i !== data.length - 1) return null
          return <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="#9ca3af">{d.mes}</text>
        })}

        {/* Zona hover invisible */}
        {data.map((_, i) => (
          <rect key={i}
            x={xOf(i) - cW / (data.length * 2)} y={PAD.t}
            width={cW / data.length} height={cH}
            fill="transparent"
            onMouseEnter={() => onHover(i)}
          />
        ))}
      </svg>

      {/* Tooltip flotante */}
      {tooltip !== null && (
        <div className="absolute pointer-events-none z-10 bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2.5 text-xs min-w-[140px]"
          style={{
            left: `${((xOf(tooltip) / W) * 100)}%`,
            top: "20px",
            transform: tooltip > data.length * 0.7 ? "translateX(-100%)" : "translateX(8px)",
          }}>
          <p className="font-bold text-gray-700 mb-2">{data[tooltip].mes}</p>
          {TUBOS.filter(t => visibles.has(t.key)).map(t => (
            <div key={t.key} className="flex items-center justify-between gap-4 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <span className="text-gray-500">{t.label}</span>
              </div>
              <span className="font-bold tabular-nums text-gray-800">{(data[tooltip][t.key as keyof PuntoTemporal] as number).toLocaleString("es-ES")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Componente: Barras comparativas por mes ──────────────────────────────────

function BarrasChart({ data, tuboKey, color }: { data: PuntoTemporal[]; tuboKey: TuboKey; color: string }) {
  const valores = data.map(d => d[tuboKey])
  const maxV = Math.max(...valores, 1)
  const [hover, setHover] = useState<number | null>(null)
  return (
    <div className="flex items-end gap-0.5 h-14 w-full">
      {data.map((d, i) => {
        const pct = (d[tuboKey] / maxV) * 100
        const isHov = hover === i
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full cursor-default relative group"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <div className="w-full rounded-sm transition-all duration-150"
              style={{ height: `${Math.max(4, pct)}%`, backgroundColor: color, opacity: isHov ? 1 : 0.7 }} />
            {isHov && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {d.mes}: {d[tuboKey].toLocaleString("es-ES")}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DatosPage() {
  const [hospitales, setHospitales] = useState<Hospital[]>([])
  const [hospitalId, setHospitalId] = useState("")
  const [periodo, setPeriodo] = useState<PeriodoKey>("12m")
  const [visibles, setVisibles] = useState<Set<TuboKey>>(new Set(["edta","coag","suero","orina"]))
  const [vista, setVista] = useState<"area"|"barras">("area")
  const [tooltip, setTooltip] = useState<number | null>(null)
  const [userRol, setUserRol] = useState("")

  useEffect(() => {
    fetch("/api/hospitales").then(r => r.ok ? r.json() : []).then(d => {
      if (Array.isArray(d) && d.length > 0) {
        const sorted = d.sort((a: Hospital, b: Hospital) => a.nombre.localeCompare(b.nombre))
        setHospitales(sorted)
        setHospitalId(sorted[0].id)
      }
    })
    fetch("/api/perfil").then(r => r.ok ? r.json() : null).then(d => { if (d?.rol) setUserRol(d.rol) })
  }, [])

  const meses = PERIODOS.find(p => p.k === periodo)?.meses ?? 12
  const data: PuntoTemporal[] = useMemo(() => hospitalId ? generarDatos(hospitalId, meses) : [], [hospitalId, meses])
  const hospital = hospitales.find(h => h.id === hospitalId)

  function toggleTubo(k: TuboKey) {
    setVisibles(prev => {
      const next = new Set(prev)
      if (next.has(k) && next.size > 1) next.delete(k)
      else next.add(k)
      return next
    })
  }

  // KPIs por tubo
  const kpis = useMemo(() => TUBOS.map(t => {
    const vals = data.map(d => d[t.key])
    const total = vals.reduce((s, v) => s + v, 0)
    const media = vals.length ? Math.round(total / vals.length) : 0
    const ultimo = vals[vals.length - 1] ?? 0
    const penultimo = vals[vals.length - 2] ?? ultimo
    const trend = penultimo ? ((ultimo - penultimo) / penultimo) * 100 : 0
    const pico = Math.max(...vals)
    const mesPico = data[vals.indexOf(pico)]?.mes ?? "—"
    return { ...t, total, media, ultimo, trend, pico, mesPico }
  }), [data])

  // Total global
  const totalGlobal = kpis.reduce((s, k) => s + k.total, 0)
  const mediaGlobal = Math.round(totalGlobal / (data.length || 1))

  if (userRol && userRol !== "ADMIN" && userRol !== "VENTAS") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
        </div>
        <p className="text-gray-500 font-semibold">Acceso restringido</p>
        <p className="text-sm text-gray-400 mt-1">Este módulo es solo para ADMIN y VENTAS.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">

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
          <p className="text-sm text-gray-400 max-w-xl">
            Panel de consumo de material de laboratorio por centro sanitario.
            {" "}<span className="text-gray-300">Los datos mostrados son ficticios — en producción se conectará a la base de datos de consumo en tiempo real.</span>
          </p>
        </div>
        {/* Hospital selector */}
        <div className="flex items-center gap-2 shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <select value={hospitalId} onChange={e => setHospitalId(e.target.value)}
            className="text-sm font-semibold text-gray-800 bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 cursor-pointer"
            style={{ "--tw-ring-color": TEAL } as React.CSSProperties}>
            {hospitales.map(h => <option key={h.id} value={h.id}>{h.nombre} ({h.ciudad})</option>)}
          </select>
        </div>
      </div>

      {/* ── Selector periodo + filtros tubos ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Periodo */}
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

        {/* Toggle tubos */}
        {TUBOS.map(t => (
          <button key={t.key} onClick={() => toggleTubo(t.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-150 cursor-pointer"
            style={visibles.has(t.key)
              ? { backgroundColor: t.color, borderColor: t.color, color: "white" }
              : { backgroundColor: "white", borderColor: "#e5e7eb", color: "#6b7280" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", display: "inline-block",
              backgroundColor: visibles.has(t.key) ? "rgba(255,255,255,0.6)" : t.color }} />
            {t.label}
          </button>
        ))}

        <div className="ml-auto flex bg-gray-100 p-0.5 rounded-xl">
          <button onClick={() => setVista("area")} title="Gráfico de área"
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${vista === "area" ? "bg-white shadow-sm text-gray-700" : "text-gray-400 hover:text-gray-600"}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </button>
          <button onClick={() => setVista("barras")} title="Barras"
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${vista === "barras" ? "bg-white shadow-sm text-gray-700" : "text-gray-400 hover:text-gray-600"}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
          </button>
        </div>
      </div>

      {/* ── KPIs globales ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total tubos",          value: totalGlobal.toLocaleString("es-ES"),        sub: `en ${meses} meses`,              color: TEAL   },
          { label: "Media mensual",         value: mediaGlobal.toLocaleString("es-ES"),        sub: "unidades/mes · todos los tipos", color: "#6366f1" },
          { label: "Meses analizados",      value: String(meses),                               sub: hospital?.nombre ?? "—",          color: "#f59e0b" },
          { label: "Tipos de material",     value: `${visibles.size} / 4`,                     sub: "activos en gráfica",             color: "#10b981" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm" style={{ borderTop: `3px solid ${k.color}` }}>
            <p className="text-2xl font-bold leading-none" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs font-semibold text-gray-700 mt-1.5">{k.label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Gráfico principal ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-800">Evolución temporal del consumo</h2>
            <p className="text-xs text-gray-400 mt-0.5">{hospital?.nombre} · {PERIODOS.find(p => p.k === periodo)?.label}</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {TUBOS.filter(t => visibles.has(t.key)).map(t => (
              <span key={t.key} className="flex items-center gap-1.5">
                <span className="w-3 h-[2px] rounded-full inline-block" style={{ backgroundColor: t.color }} />
                {t.label}
              </span>
            ))}
          </div>
        </div>
        {data.length > 0 && (
          <AreaChart data={data} visibles={visibles} tooltip={tooltip} onHover={setTooltip} />
        )}
      </div>

      {/* ── Cards individuales por tubo ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(t => {
          const vals = data.map(d => d[t.key])
          const isVis = visibles.has(t.key)
          return (
            <div key={t.key} onClick={() => toggleTubo(t.key)}
              className={`bg-white rounded-2xl border shadow-sm p-4 cursor-pointer transition-all duration-200 ${isVis ? "border-gray-100 hover:shadow-md" : "border-gray-100 opacity-50"}`}
              style={isVis ? { borderTop: `3px solid ${t.color}` } : {}}>
              {/* Header tubo */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">{t.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{t.sub}</p>
                </div>
                <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: t.light, color: t.color }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11l-5 5"/><path d="M3 9h18"/></svg>
                </span>
              </div>

              {/* Sparkline */}
              <div className="mb-3">
                <Sparkline values={vals} color={t.color} height={36} />
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 rounded-xl px-2.5 py-2">
                  <p className="text-gray-400 text-[10px]">Total período</p>
                  <p className="font-bold text-gray-800 mt-0.5 tabular-nums">{t.total.toLocaleString("es-ES")}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-2.5 py-2">
                  <p className="text-gray-400 text-[10px]">Media/mes</p>
                  <p className="font-bold text-gray-800 mt-0.5 tabular-nums">{t.media.toLocaleString("es-ES")}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-2.5 py-2">
                  <p className="text-gray-400 text-[10px]">Último mes</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <p className="font-bold text-gray-800 tabular-nums">{t.ultimo.toLocaleString("es-ES")}</p>
                    {Math.abs(t.trend) > 0.5 && (
                      <span className="text-[10px] font-bold" style={{ color: t.trend > 0 ? "#10b981" : "#ef4444" }}>
                        {t.trend > 0 ? "▲" : "▼"}{Math.abs(t.trend).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl px-2.5 py-2">
                  <p className="text-gray-400 text-[10px]">Pico · {t.mesPico}</p>
                  <p className="font-bold tabular-nums mt-0.5" style={{ color: t.color }}>{t.pico.toLocaleString("es-ES")}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Vista barras detallada ── */}
      {vista === "barras" && (
        <div className="grid sm:grid-cols-2 gap-4">
          {TUBOS.filter(t => visibles.has(t.key)).map(t => (
            <div key={t.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                <p className="text-sm font-bold text-gray-800">{t.label}</p>
                <span className="text-[10px] text-gray-400 ml-auto">Media: {kpis.find(k => k.key === t.key)?.media}/mes</span>
              </div>
              <BarrasChart data={data} tuboKey={t.key} color={t.color} />
              <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400">
                <span>{data[0]?.mes}</span>
                <span>{data[Math.floor(data.length / 2)]?.mes}</span>
                <span>{data[data.length - 1]?.mes}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabla de datos ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-bold text-gray-800">Desglose mensual</h2>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">Datos de demostración</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/60">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Mes</th>
                {TUBOS.filter(t => visibles.has(t.key)).map(t => (
                  <th key={t.key} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: t.color }}>{t.label}</th>
                ))}
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d, i) => {
                const total = TUBOS.filter(t => visibles.has(t.key)).reduce((s, t) => s + d[t.key], 0)
                const isLast = i === 0
                return (
                  <tr key={d.mes} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors ${isLast ? "font-semibold" : ""}`}>
                    <td className="px-5 py-3 text-sm text-gray-700">
                      {d.mes}
                      {isLast && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${TEAL}18`, color: TEAL }}>Último</span>}
                    </td>
                    {TUBOS.filter(t => visibles.has(t.key)).map(t => (
                      <td key={t.key} className="px-4 py-3 text-right tabular-nums text-sm text-gray-700">
                        {d[t.key].toLocaleString("es-ES")}
                      </td>
                    ))}
                    <td className="px-5 py-3 text-right tabular-nums text-sm font-bold text-gray-800">{total.toLocaleString("es-ES")}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Footer disclaimer ── */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div className="text-xs text-amber-700 leading-relaxed">
          <strong>Vista de demostración.</strong> Los datos de consumo mostrados son ficticios y generados algorítmicamente para ilustrar el funcionamiento del panel. En producción, esta sección se conectará con la base de datos de consumo de material de laboratorio en tiempo real, incluyendo gestión de lotes, caducidades y análisis estadístico avanzado.
        </div>
      </div>
    </div>
  )
}
