"use client"

import { useMemo, useState } from "react"
import { TEAL } from "@/lib/brand"
import { generarConsumoMensual, generarFranjaHoraria, generarDiaSemana, TUBOS, EVENTOS } from "../_lib/mock-data"
import { PERIODOS } from "../_lib/types"
import type { Hospital, PeriodoKey } from "../_lib/types"

interface Props { hospitalId: string; periodo: PeriodoKey; hospitales: Hospital[] }

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

// ─── Franja horaria ────────────────────────────────────────────────────────────

function FranjaHorariaChart({ hospitalId }: { hospitalId: string }) {
  const franja = useMemo(() => generarFranjaHoraria(hospitalId), [hospitalId])
  const maxVal = Math.max(...franja.map(f => f.valor), 1)

  const intensityColor = (pct: number) => {
    if (pct < 0.20) return "#f3f4f6"
    if (pct < 0.45) return `${TEAL}50`
    if (pct < 0.70) return `${TEAL}90`
    return TEAL
  }

  return (
    <div className="space-y-1.5">
      {franja.map(f => (
        <div key={f.hora} className="flex items-center gap-2 group">
          <span className="w-8 text-[10px] tabular-nums font-semibold text-gray-400 text-right shrink-0">{String(f.hora).padStart(2, "0")}h</span>
          <div className="flex-1 h-5 bg-gray-100 rounded-md overflow-hidden">
            <div className="h-full rounded-md transition-all duration-500"
              style={{ width: `${(f.valor / maxVal) * 100}%`, backgroundColor: intensityColor(f.pct) }} />
          </div>
          <span className="w-7 text-[10px] tabular-nums text-gray-500 text-right shrink-0">{f.valor}</span>
          {f.hora >= 8 && f.hora <= 10 && <span className="text-[9px] text-teal-600 font-bold shrink-0">pico</span>}
          {f.hora >= 16 && f.hora <= 17 && <span className="text-[9px] text-orange-500 font-bold shrink-0">pico</span>}
        </div>
      ))}
    </div>
  )
}

// ─── Heatmap día semana × mes ──────────────────────────────────────────────────

function DiaSemanaHeatmap({ hospitalId }: { hospitalId: string }) {
  const data = useMemo(() => generarDiaSemana(hospitalId), [hospitalId])
  const [hovered, setHovered] = useState<{ dia: number; mes: number } | null>(null)

  const intensityColor = (intensity: number) => {
    if (intensity < 0.15) return "#f3f4f6"
    if (intensity < 0.35) return `${TEAL}35`
    if (intensity < 0.60) return `${TEAL}65`
    if (intensity < 0.80) return `${TEAL}99`
    return TEAL
  }

  const hoverItem = hovered ? data.find(d => d.dia === hovered.dia && d.mes === hovered.mes) : null

  return (
    <div>
      {/* Header meses */}
      <div className="flex ml-9 mb-1">
        {MESES.map(m => (
          <div key={m} className="flex-1 text-center text-[9px] font-semibold text-gray-400">{m}</div>
        ))}
      </div>
      {/* Grid */}
      {DIAS.map((dia, dIdx) => (
        <div key={dia} className="flex items-center mb-1">
          <span className="w-8 text-[10px] font-semibold text-gray-400 shrink-0">{dia}</span>
          {MESES.map((_, mIdx) => {
            const item = data.find(d => d.dia === dIdx && d.mes === mIdx)
            const isHov = hovered?.dia === dIdx && hovered?.mes === mIdx
            return (
              <div key={mIdx} className="flex-1 px-0.5"
                onMouseEnter={() => setHovered({ dia: dIdx, mes: mIdx })}
                onMouseLeave={() => setHovered(null)}>
                <div
                  className="rounded-sm cursor-default transition-all duration-150 mx-auto"
                  style={{
                    height: 20,
                    backgroundColor: intensityColor(item?.intensity ?? 0),
                    outline: isHov ? `2px solid ${TEAL}` : "none",
                    outlineOffset: 1,
                  }} />
              </div>
            )
          })}
        </div>
      ))}
      {/* Leyenda */}
      <div className="flex items-center gap-2 mt-2 ml-9">
        <span className="text-[10px] text-gray-400">Menos</span>
        {[0.1, 0.3, 0.55, 0.75, 1].map((v, i) => (
          <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: intensityColor(v) }} />
        ))}
        <span className="text-[10px] text-gray-400">Más</span>
        {hoverItem && (
          <span className="ml-auto text-[10px] font-semibold text-gray-600">
            {DIAS[hoverItem.dia]} · {MESES[hoverItem.mes]}: <span className="tabular-nums">{hoverItem.valor}</span>
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Comparador mes vs mes ─────────────────────────────────────────────────────

function ComparadorMeses({ hospitalId, meses }: { hospitalId: string; meses: number }) {
  const data = useMemo(() => generarConsumoMensual({ hospitalId, meses }), [hospitalId, meses])
  const [idxA, setIdxA] = useState(() => Math.max(0, meses - 2))
  const [idxB, setIdxB] = useState(() => Math.max(0, meses - 1))

  const mesA = data[idxA]; const mesB = data[idxB]
  if (!mesA || !mesB) return null
  const maxVal = Math.max(...TUBOS.flatMap(t => [mesA[t.key as keyof typeof mesA] as number, mesB[t.key as keyof typeof mesB] as number]), 1)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-indigo-500 shrink-0" />
          <select value={idxA} onChange={e => setIdxA(+e.target.value)}
            className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent">
            {data.map((d, i) => <option key={i} value={i}>{d.mes}</option>)}
          </select>
        </div>
        <span className="text-xs font-bold text-gray-300">vs</span>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-orange-400 shrink-0" />
          <select value={idxB} onChange={e => setIdxB(+e.target.value)}
            className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent">
            {data.map((d, i) => <option key={i} value={i}>{d.mes}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-3">
        {TUBOS.map(t => {
          const vA = mesA[t.key as keyof typeof mesA] as number
          const vB = mesB[t.key as keyof typeof mesB] as number
          const diff = vA ? ((vB - vA) / vA) * 100 : 0
          return (
            <div key={t.key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                  <span className="text-[11px] font-semibold text-gray-700">{t.label}</span>
                </div>
                <span className={`text-[10px] font-bold ${diff > 5 ? "text-emerald-600" : diff < -5 ? "text-red-500" : "text-gray-400"}`}>
                  {diff > 0 ? "▲" : diff < 0 ? "▼" : "="}{Math.abs(diff).toFixed(1)}%
                </span>
              </div>
              <div className="space-y-1">
                {[{ val: vA, color: "#6366f1", label: mesA.mes }, { val: vB, color: "#f97316", label: mesB.mes }].map((row, ri) => (
                  <div key={ri} className="flex items-center gap-2">
                    <span className="text-[9px] font-semibold text-gray-400 w-10 truncate">{row.label}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(row.val / maxVal) * 100}%`, backgroundColor: row.color }} />
                    </div>
                    <span className="text-[10px] tabular-nums text-gray-500 w-12 text-right">{row.val.toLocaleString("es-ES")}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Estacionalidad por año ────────────────────────────────────────────────────

function EstacionalidadChart({ hospitalId }: { hospitalId: string }) {
  const data = useMemo(() => generarConsumoMensual({ hospitalId, meses: 24 }), [hospitalId])
  const anios = [...new Set(data.map(d => d.year))].sort()
  const [anioA, setAnioA] = useState(anios[0] ?? new Date().getFullYear() - 1)
  const [anioB, setAnioB] = useState(anios[anios.length - 1] ?? new Date().getFullYear())

  const W = 500; const H = 130; const PAD = { l: 8, r: 8, t: 10, b: 22 }
  const cW = W - PAD.l - PAD.r; const cH = H - PAD.t - PAD.b

  const firstTubo = TUBOS[0]
  const valsA = MESES.map((_, mi) => { const d = data.find(x => x.year === anioA && x.monthIndex === mi); return d ? (d[firstTubo.key as keyof typeof d] as number) : 0 })
  const valsB = MESES.map((_, mi) => { const d = data.find(x => x.year === anioB && x.monthIndex === mi); return d ? (d[firstTubo.key as keyof typeof d] as number) : 0 })
  const maxV = Math.max(...valsA, ...valsB, 1)

  const xOf = (i: number) => PAD.l + (i / 11) * cW
  const yOf = (v: number) => PAD.t + cH - (v / maxV) * cH
  const ptsA = valsA.map((v, i) => `${xOf(i)},${yOf(v)}`).join(" ")
  const ptsB = valsB.map((v, i) => `${xOf(i)},${yOf(v)}`).join(" ")

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select value={anioA} onChange={e => setAnioA(+e.target.value)}
          className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent">
          {anios.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="text-xs font-bold text-gray-300">vs</span>
        <select value={anioB} onChange={e => setAnioB(+e.target.value)}
          className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent">
          {anios.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="text-[10px] text-gray-400 ml-auto">{firstTubo.label}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <defs>
          <linearGradient id="ya-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" /><stop offset="100%" stopColor="#6366f1" stopOpacity="0.01" /></linearGradient>
          <linearGradient id="yb-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f97316" stopOpacity="0.15" /><stop offset="100%" stopColor="#f97316" stopOpacity="0.01" /></linearGradient>
        </defs>
        <polygon points={`${ptsA} ${xOf(11)},${PAD.t + cH} ${PAD.l},${PAD.t + cH}`} fill="url(#ya-g)" />
        <polygon points={`${ptsB} ${xOf(11)},${PAD.t + cH} ${PAD.l},${PAD.t + cH}`} fill="url(#yb-g)" />
        <polyline points={ptsA} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={ptsB} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3" />
        {MESES.map((m, i) => (
          <text key={i} x={xOf(i)} y={H - 4} textAnchor="middle" fontSize={8} fill="#9ca3af">{m}</text>
        ))}
      </svg>
      <div className="flex items-center gap-4 mt-2 text-[10px]">
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-indigo-500 inline-block rounded" />{anioA}</span>
        <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-orange-400 inline-block" />{anioB}</span>
      </div>
    </div>
  )
}

// ─── Tab Analítica ─────────────────────────────────────────────────────────────

export function TabAnalitica({ hospitalId, periodo }: Props) {
  const meses = PERIODOS.find(p => p.k === periodo)?.meses ?? 12

  if (!hospitalId) return (
    <div className="flex items-center justify-center h-48">
      <p className="text-sm text-gray-400">Selecciona un hospital para ver la analítica.</p>
    </div>
  )

  return (
    <div className="space-y-5">

      {/* Distribución horaria + heatmap */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Franja horaria */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" style={{ borderTop: `3px solid ${TEAL}` }}>
          <h2 className="text-sm font-bold text-gray-800 mb-1">Consumo por franja horaria</h2>
          <p className="text-[11px] text-gray-400 mb-4">Distribución promedio del volumen de muestras a lo largo del día</p>
          <FranjaHorariaChart hospitalId={hospitalId} />
          <div className="mt-4 flex flex-wrap gap-3 text-[10px] pt-3 border-t border-gray-50">
            <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm" style={{ backgroundColor: TEAL }} />Pico mañana (8–10h)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm" style={{ backgroundColor: "#f97316" }} />Pico tarde (16–17h)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm bg-gray-100" />Actividad baja</span>
          </div>
        </div>

        {/* Heatmap día-semana */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" style={{ borderTop: "3px solid #6366f1" }}>
          <h2 className="text-sm font-bold text-gray-800 mb-1">Heatmap día de semana × mes</h2>
          <p className="text-[11px] text-gray-400 mb-4">Intensidad de consumo agregada por combinación día–mes</p>
          <DiaSemanaHeatmap hospitalId={hospitalId} />
          <div className="mt-4 p-3 bg-violet-50 rounded-xl border border-violet-100">
            <p className="text-[10px] text-violet-600 font-semibold">Patrón detectado</p>
            <p className="text-[10px] text-violet-500 mt-0.5">Mayor actividad en lunes-jueves, caída progresiva hacia el fin de semana. Pico oct-nov en todos los días laborables.</p>
          </div>
        </div>
      </div>

      {/* Estacionalidad + comparador */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" style={{ borderTop: "3px solid #f59e0b" }}>
          <h2 className="text-sm font-bold text-gray-800 mb-1">Comparativa interanual</h2>
          <p className="text-[11px] text-gray-400 mb-4">Evolución mes a mes entre dos años — patrón estacional</p>
          <EstacionalidadChart hospitalId={hospitalId} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" style={{ borderTop: "3px solid #ec4899" }}>
          <h2 className="text-sm font-bold text-gray-800 mb-1">Comparador mes vs mes</h2>
          <p className="text-[11px] text-gray-400 mb-4">Selecciona dos meses para comparar el consumo por tipo de tubo</p>
          <ComparadorMeses hospitalId={hospitalId} meses={meses} />
        </div>
      </div>

      {/* Contextualización estacional */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-800 mb-4">Contexto estacional — Gestión Sanitaria Sur Córdoba</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { periodo: "Ene–Feb",  titulo: "Resaca navideña",         desc: "Pico bioquímica, suero y glucosa. Reconocimientos empresa post-navidad.", color: "#f59e0b", icon: "M3 3v18h18" },
            { periodo: "Mar–May",  titulo: "Campaña alergias",        desc: "Pico inmunología IgE. Polinización intensa en Andalucía. +30-45% inmuno.", color: "#ec4899", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
            { periodo: "Jul–Ago",  titulo: "Mínimo estival",          desc: "Caída 25-35% todos los tipos. Calor extremo (+40°C). Cadena de frío crítica.", color: "#3b82f6", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8" },
            { periodo: "Oct–Nov",  titulo: "Pico anual máximo",       desc: "Reconocimientos médicos laborales. Máximo histórico EDTA, bioquímica, orina.", color: "#8b5cf6", icon: "M22 12h-4l-3 9L9 3l-3 9H2" },
          ].map(ev => (
            <div key={ev.periodo} className="p-4 rounded-xl border" style={{ backgroundColor: `${ev.color}08`, borderColor: `${ev.color}25` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${ev.color}20` }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ev.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={ev.icon} />
                  </svg>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${ev.color}20`, color: ev.color }}>{ev.periodo}</span>
              </div>
              <p className="text-xs font-bold text-gray-800 mb-1">{ev.titulo}</p>
              <p className="text-[10px] text-gray-500 leading-relaxed">{ev.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
