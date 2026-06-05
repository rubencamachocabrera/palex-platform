"use client"

import { useMemo, useState } from "react"
import { TEAL, ORANGE } from "@/lib/brand"
import { TUBOS, EVENTOS, generarConsumoMensual } from "../_lib/mock-data"
import { PERIODOS } from "../_lib/types"
import type { Hospital, PeriodoKey } from "../_lib/types"
import { Sparkline, AreaChart, DonutChart } from "./Charts"

type TuboKey = typeof TUBOS[number]["key"]

interface Props { hospitalId: string; periodo: PeriodoKey; hospitales: Hospital[] }

// ─── KPI card con sparkline ───────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, values, icon }: {
  label: string; value: string; sub: string; color: string; values: number[]; icon: string
}) {
  const trend = values.length >= 2 ? ((values[values.length - 1] - values[values.length - 2]) / (values[values.length - 2] || 1)) * 100 : 0
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow cursor-default"
      style={{ borderTop: `3px solid ${color}` }}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={icon} />
          </svg>
        </div>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${Math.abs(trend) < 0.1 ? "opacity-0" : ""}`}
          style={{ backgroundColor: trend > 0 ? "#d1fae5" : "#fee2e2", color: trend > 0 ? "#065f46" : "#991b1b" }}>
          {trend > 0 ? "▲" : "▼"}{Math.abs(trend).toFixed(1)}%
        </span>
      </div>
      <p className="text-2xl font-bold tabular-nums leading-none mb-1" style={{ color }}>{value}</p>
      <p className="text-xs font-semibold text-gray-700 mb-0.5">{label}</p>
      <p className="text-[10px] text-gray-400 truncate mb-2">{sub}</p>
      <Sparkline values={values} color={color} height={32} />
    </div>
  )
}

// ─── Ranking hospitales ───────────────────────────────────────────────────────

function RankingHospitales({ hospitales, meses, tuboKey }: {
  hospitales: Hospital[]; meses: number; tuboKey: TuboKey
}) {
  const ranking = useMemo(() =>
    hospitales.map(h => {
      const d = generarConsumoMensual({ hospitalId: h.id, meses })
      const total = d.reduce((s, p) => s + (p[tuboKey as keyof typeof p] as number), 0)
      return { ...h, total }
    }).sort((a, b) => b.total - a.total).slice(0, 8)
  , [hospitales, meses, tuboKey])

  const maxVal = ranking[0]?.total ?? 1
  const tubo = TUBOS.find(t => t.key === tuboKey)!
  const MEDALS = ["🥇", "", ""]

  return (
    <div className="space-y-2.5">
      {ranking.map((h, i) => (
        <div key={h.id} className="group flex items-center gap-2.5 hover:bg-gray-50/70 rounded-xl p-1.5 -mx-1.5 transition-colors cursor-default">
          <span className="w-6 text-[11px] font-bold text-center shrink-0" style={{ color: i < 3 ? tubo.color : "#d1d5db" }}>
            {i === 0 ? "①" : i === 1 ? "②" : i === 2 ? "③" : i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-gray-700 truncate max-w-[160px]">{h.nombre}</span>
              <span className="text-[10px] tabular-nums font-bold text-gray-500 shrink-0 ml-2">{h.total.toLocaleString("es-ES")}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(h.total / maxVal) * 100}%`, backgroundColor: i === 0 ? tubo.color : `${tubo.color}80` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Heatmap calendárico (2 años) ──────────────────────────────────────────────

function HeatmapCalendar({ data }: { data: ReturnType<typeof generarConsumoMensual> }) {
  const cols = data.slice(-24)
  const maxV = Math.max(...cols.map(d => TUBOS.reduce((s, t) => s + (d[t.key as keyof typeof d] as number), 0)), 1)
  const color = (v: number) => {
    const p = v / maxV
    if (p < 0.2) return "#f3f4f6"
    if (p < 0.4) return `${TEAL}40`
    if (p < 0.6) return `${TEAL}70`
    if (p < 0.8) return `${TEAL}aa`
    return TEAL
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {cols.map((d, i) => {
          const total = TUBOS.reduce((s, t) => s + (d[t.key as keyof typeof d] as number), 0)
          return (
            <div key={i} title={`${d.mes}: ${total.toLocaleString("es-ES")} tubos`}
              className="group relative cursor-default"
              style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: color(total) }}>
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
          <div key={i} className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: color(v * maxV) }} />
        ))}
        <span className="text-[10px] text-gray-400">Más</span>
      </div>
    </div>
  )
}

// ─── Insights automáticos ──────────────────────────────────────────────────────

function InsightsPanel({ data, visibles }: { data: ReturnType<typeof generarConsumoMensual>; visibles: Set<TuboKey> }) {
  const insights = useMemo(() => {
    if (data.length < 3) return []
    type Ins = { color: string; bg: string; titulo: string; detalle: string; tipo: "alerta" | "patron" | "info" }
    const result: Ins[] = []

    if (visibles.has("inmuno")) {
      const prim = data.filter(d => [2, 3, 4].includes(d.monthIndex))
      const rest = data.filter(d => ![2, 3, 4].includes(d.monthIndex))
      if (prim.length && rest.length) {
        const mp = prim.reduce((s, d) => s + d.inmuno, 0) / prim.length
        const mr = rest.reduce((s, d) => s + d.inmuno, 0) / rest.length
        const pct = mr > 0 ? ((mp - mr) / mr) * 100 : 0
        if (pct > 15) result.push({ color: "#ec4899", bg: "#fdf2f8", tipo: "patron",
          titulo: `+${pct.toFixed(0)}% Inmunología en primavera`,
          detalle: "Campaña alergias mar–may: pico IgE consistente con polinización en Andalucía."
        })
      }
    }
    if (visibles.has("edta")) {
      const recon = data.filter(d => [9, 10].includes(d.monthIndex))
      if (recon.length) {
        const mr = recon.reduce((s, d) => s + d.edta, 0) / recon.length
        const mg = data.reduce((s, d) => s + d.edta, 0) / data.length
        const pct = mg > 0 ? ((mr - mg) / mg) * 100 : 0
        if (pct > 8) result.push({ color: "#8b5cf6", bg: "#f5f3ff", tipo: "patron",
          titulo: `Pico reconocimientos oct–nov (+${pct.toFixed(0)}%)`,
          detalle: "Máximo anual: campaña reconocimientos médicos laborales."
        })
      }
    }
    if (data.length >= 2) {
      const ult = data[data.length - 1]; const pen = data[data.length - 2]
      for (const t of TUBOS.filter(tt => visibles.has(tt.key))) {
        const pct = pen[t.key as keyof typeof pen] ? (((ult[t.key as keyof typeof ult] as number) - (pen[t.key as keyof typeof pen] as number)) / (pen[t.key as keyof typeof pen] as number)) * 100 : 0
        if (Math.abs(pct) > 20) {
          result.push({ color: "#ef4444", bg: "#fef2f2", tipo: "alerta",
            titulo: `Anomalía ${t.label}: ${pct > 0 ? "+" : ""}${pct.toFixed(0)}% vs mes anterior`,
            detalle: "Variación >±20% del rango estacional esperado. Verificar si es puntual o error de registro."
          }); break
        }
      }
    }
    if (data.length >= 6) {
      const m1 = data.slice(0, Math.floor(data.length / 2)).reduce((s, d) => s + TUBOS.reduce((ss, t) => ss + (d[t.key as keyof typeof d] as number), 0), 0) / Math.floor(data.length / 2)
      const m2 = data.slice(Math.floor(data.length / 2)).reduce((s, d) => s + TUBOS.reduce((ss, t) => ss + (d[t.key as keyof typeof d] as number), 0), 0) / (data.length - Math.floor(data.length / 2))
      const pct = m1 > 0 ? ((m2 - m1) / m1) * 100 : 0
      result.push({ color: pct >= 0 ? "#10b981" : "#ef4444", bg: pct >= 0 ? "#f0fdf4" : "#fef2f2", tipo: "info",
        titulo: `Tendencia global ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`,
        detalle: `Volumen total ${pct >= 0 ? "al alza" : "descendente"} respecto a la primera mitad del período.`
      })
    }
    return result.slice(0, 4)
  }, [data, visibles])

  const iconPath = (tipo: string) =>
    tipo === "alerta" ? "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"
    : tipo === "patron" ? "M22 12h-4l-3 9L9 3l-3 9H2"
    : "M18 20V10M12 20V4M6 20v-6M2 20h20"

  return (
    <div className="space-y-2.5">
      {insights.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-6">Selecciona al menos 6 meses para ver análisis.</p>
      )}
      {insights.map((ins, i) => (
        <div key={i} className="flex gap-3 p-3 rounded-xl border"
          style={{ backgroundColor: ins.bg, borderColor: `${ins.color}30` }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${ins.color}20` }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ins.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={iconPath(ins.tipo)} />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold leading-snug" style={{ color: ins.color }}>{ins.titulo}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{ins.detalle}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Dashboard Tab ─────────────────────────────────────────────────────────────

export function TabDashboard({ hospitalId, periodo, hospitales }: Props) {
  const [visibles, setVisibles] = useState<Set<TuboKey>>(new Set(["edta", "hepar", "coag", "suero", "orina", "inmuno"]))
  const [tuboRanking, setTuboRanking] = useState<TuboKey>("edta")

  const meses = PERIODOS.find(p => p.k === periodo)?.meses ?? 12
  const data   = useMemo(() => hospitalId ? generarConsumoMensual({ hospitalId, meses }) : [], [hospitalId, meses])
  const data24 = useMemo(() => hospitalId ? generarConsumoMensual({ hospitalId, meses: 24 }) : [], [hospitalId])

  const kpis = useMemo(() => TUBOS.map(t => {
    const vals = data.map(d => d[t.key as keyof typeof d] as number)
    const total = vals.reduce((s, v) => s + v, 0)
    return { ...t, total, vals, media: vals.length ? Math.round(total / vals.length) : 0 }
  }), [data])

  const totalGlobal = kpis.reduce((s, k) => s + k.total, 0)
  const mediaGlobal = data.length ? Math.round(totalGlobal / data.length) : 0
  const costeEst = Math.round(totalGlobal * 0.12)

  const lastMonthTotal = data.length ? TUBOS.reduce((s, t) => s + (data[data.length - 1][t.key as keyof typeof data[0]] as number), 0) : 0
  const prevMonthTotal = data.length >= 2 ? TUBOS.reduce((s, t) => s + (data[data.length - 2][t.key as keyof typeof data[0]] as number), 0) : lastMonthTotal
  const trendUlt = prevMonthTotal > 0 ? ((lastMonthTotal - prevMonthTotal) / prevMonthTotal) * 100 : 0

  const donutSegs = kpis.filter(k => visibles.has(k.key as TuboKey)).map(k => ({
    label: k.label, value: k.total, color: k.color,
  }))

  function toggleTubo(k: TuboKey) {
    setVisibles(prev => {
      const n = new Set(prev); if (n.has(k) && n.size > 1) n.delete(k); else n.add(k); return n
    })
  }

  if (!hospitalId) return (
    <div className="flex items-center justify-center h-48">
      <p className="text-sm text-gray-400">Selecciona un hospital para ver el dashboard.</p>
    </div>
  )

  return (
    <div className="space-y-5">

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Total tubos" value={totalGlobal.toLocaleString("es-ES")}
          sub={`en ${meses} meses · todos los tipos`} color={TEAL}
          values={data.map(d => TUBOS.reduce((s, t) => s + (d[t.key as keyof typeof d] as number), 0))}
          icon="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11l-5 5"
        />
        <KpiCard
          label="Coste estimado" value={`${costeEst.toLocaleString("es-ES")} €`}
          sub="€0,12 por tubo · estimación Palex" color={ORANGE}
          values={data.map(d => TUBOS.reduce((s, t) => s + (d[t.key as keyof typeof d] as number), 0) * 0.12)}
          icon="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
        />
        <KpiCard
          label="Media mensual" value={mediaGlobal.toLocaleString("es-ES")}
          sub="unidades / mes · todos los tipos" color="#6366f1"
          values={data.map((_, i) => mediaGlobal)}
          icon="M18 20V10M12 20V4M6 20v-6M2 20h20"
        />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
          style={{ borderTop: `3px solid ${trendUlt >= 0 ? "#10b981" : "#ef4444"}` }}>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: trendUlt >= 0 ? "#d1fae5" : "#fee2e2" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={trendUlt >= 0 ? "#10b981" : "#ef4444"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: trendUlt >= 0 ? "#d1fae5" : "#fee2e2", color: trendUlt >= 0 ? "#065f46" : "#991b1b" }}>
              {trendUlt > 0 ? "▲" : "▼"}{Math.abs(trendUlt).toFixed(1)}%
            </span>
          </div>
          <p className="text-2xl font-bold tabular-nums leading-none mb-1" style={{ color: trendUlt >= 0 ? "#10b981" : "#ef4444" }}>
            {lastMonthTotal.toLocaleString("es-ES")}
          </p>
          <p className="text-xs font-semibold text-gray-700 mb-0.5">Último mes</p>
          <p className="text-[10px] text-gray-400 truncate mb-2">vs mes anterior</p>
          <Sparkline values={data.map(d => TUBOS.reduce((s, t) => s + (d[t.key as keyof typeof d] as number), 0))} color={trendUlt >= 0 ? "#10b981" : "#ef4444"} height={32} />
        </div>
      </div>

      {/* Filtro tubos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide shrink-0">Filtrar tubos</span>
        {TUBOS.map(t => (
          <button key={t.key} onClick={() => toggleTubo(t.key as TuboKey)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-150 cursor-pointer"
            style={visibles.has(t.key as TuboKey)
              ? { backgroundColor: t.color, color: "white", border: `1.5px solid ${t.color}` }
              : { backgroundColor: "white", color: "#9ca3af", border: "1.5px solid #e5e7eb" }}>
            <span className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: visibles.has(t.key as TuboKey) ? "rgba(255,255,255,0.5)" : t.color }} />
            {t.label}
          </button>
        ))}
        <button onClick={() => setVisibles(new Set(TUBOS.map(t => t.key as TuboKey)))}
          className="px-2.5 py-1 rounded-full border border-dashed border-gray-300 text-[11px] text-gray-400 hover:border-gray-400 transition-colors cursor-pointer">
          Todos
        </button>
      </div>

      {/* Gráfico + insights */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Evolución temporal del consumo</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">{PERIODOS.find(p => p.k === periodo)?.label} · bandas estacionales activas</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm inline-block bg-pink-200/60 border border-pink-400/40" />Alergias</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm inline-block bg-violet-200/60 border border-violet-400/40" />Reconoc.</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded-sm inline-block bg-blue-200/50 border border-blue-400/40" />Vacaciones</span>
            </div>
          </div>
          {data.length > 0 && <AreaChart data={data} visibles={visibles} />}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] text-gray-400 border-t border-gray-50 pt-3">
            {TUBOS.filter(t => visibles.has(t.key as TuboKey)).map(t => (
              <span key={t.key} className="flex items-center gap-1.5">
                <span className="w-3.5 h-[2px] rounded-full inline-block" style={{ backgroundColor: t.color }} />
                {t.label}
              </span>
            ))}
          </div>
        </div>

        {/* Panel insights */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${TEAL}18` }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-gray-800">Análisis inteligente</h2>
          </div>
          <InsightsPanel data={data} visibles={visibles} />
          <div className="mt-5 pt-4 border-t border-gray-50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2.5">Estacionalidad · Córdoba</p>
            {[
              { color: "#ec489920", border: "#ec4899", label: "Mar–May", desc: "Campaña alergias" },
              { color: "#8b5cf620", border: "#8b5cf6", label: "Oct–Nov", desc: "Reconocimientos" },
              { color: "#3b82f610", border: "#3b82f6", label: "Jul–Ago", desc: "Vacaciones" },
              { color: "#f59e0b15", border: "#f59e0b", label: "Ene–Feb", desc: "Resaca navideña" },
            ].map(e => (
              <div key={e.label} className="flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: e.color, border: `1px solid ${e.border}` }} />
                <span className="text-[10px] font-semibold text-gray-500">{e.label}</span>
                <span className="text-[10px] text-gray-400">{e.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ranking + Donut + Heatmap */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Ranking */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" style={{ borderTop: `3px solid ${TUBOS.find(t => t.key === tuboRanking)?.color}` }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-800">Ranking hospitales</h2>
            <select value={tuboRanking} onChange={e => setTuboRanking(e.target.value as TuboKey)}
              className="text-[11px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 cursor-pointer focus:outline-none">
              {TUBOS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <RankingHospitales hospitales={hospitales} meses={meses} tuboKey={tuboRanking} />
        </div>

        {/* Donut distribución */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Distribución por tipo</h2>
          <div className="flex items-start gap-4">
            <DonutChart segments={donutSegs} />
            <div className="flex-1 space-y-1.5 min-w-0">
              {donutSegs.map(s => {
                const pct = totalGlobal > 0 ? ((s.value / totalGlobal) * 100).toFixed(1) : "0"
                return (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-[10px] font-semibold text-gray-600 truncate flex-1">{s.label}</span>
                    <span className="text-[10px] tabular-nums font-bold text-gray-500">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Heatmap */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-1">Intensidad mensual</h2>
          <p className="text-[10px] text-gray-400 mb-4">Últimos 24 meses · todos los tubos</p>
          <HeatmapCalendar data={data24} />
        </div>
      </div>

      {/* Cards individuales por tubo */}
      <div>
        <h2 className="text-sm font-bold text-gray-700 mb-3">Detalle por tipo de tubo</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map(t => {
            const isVis = visibles.has(t.key as TuboKey)
            return (
              <div key={t.key} onClick={() => toggleTubo(t.key as TuboKey)}
                className={`bg-white rounded-2xl border shadow-sm p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${isVis ? "border-gray-100" : "opacity-40 grayscale border-gray-100"}`}
                style={isVis ? { borderTop: `3px solid ${t.color}` } : {}}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  <p className="text-xs font-bold text-gray-900 truncate">{t.label}</p>
                </div>
                <p className="text-[10px] text-gray-400 mb-2">{t.sub}</p>
                <Sparkline values={t.vals} color={t.color} height={34} forecast />
                <div className="grid grid-cols-2 gap-1.5 text-[10px] mt-2">
                  <div className="bg-gray-50 rounded-lg px-2 py-1.5">
                    <p className="text-gray-400">Total</p>
                    <p className="font-bold text-gray-800 tabular-nums">{t.total.toLocaleString("es-ES")}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-2 py-1.5">
                    <p className="text-gray-400">Media/mes</p>
                    <p className="font-bold text-gray-800 tabular-nums">{t.media.toLocaleString("es-ES")}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
