"use client"

import { useMemo, useState, useEffect } from "react"
import { analizarVisita } from "@/lib/visita-analysis"
import { getScoringConfig } from "@/lib/scoring-config"
import type { Riesgo, AnalisisVisita } from "@/lib/visita-analysis"
import type { ScoringConfig } from "@/lib/scoring-config"
import { DEFAULT_SCORING_CONFIG } from "@/lib/scoring-config"
import { TEAL } from "@/lib/brand"

const NIVEL_CONFIG = {
  alto:  { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    dot: "#ef4444", label: "Alto" },
  medio: { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  dot: "#f59e0b", label: "Medio" },
  info:  { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   dot: "#3b82f6", label: "Info" },
}

interface AnalisisPanelProps {
  datos: Record<string, unknown>
  hospitalId?: string
}

interface Stats {
  hospital: { avg: number | null; count: number } | null
  global: { avg: number | null; count: number }
}

export function AnalisisPanel({ datos, hospitalId }: AnalisisPanelProps) {
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null)
  const [showScore, setShowScore] = useState(false)
  const [cfg, setCfg] = useState<ScoringConfig>(DEFAULT_SCORING_CONFIG)
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    getScoringConfig().then(setCfg)
    if (hospitalId) {
      fetch(`/api/visitas/estadisticas?hospitalId=${hospitalId}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setStats(d) })
        .catch(() => {})
    } else {
      fetch("/api/visitas/estadisticas")
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setStats(d) })
        .catch(() => {})
    }
  }, [hospitalId])

  const analisis: AnalisisVisita = useMemo(() => analizarVisita(datos, cfg), [datos, cfg])
  const { riesgos, score, scoreLabel, scoreColor, detalleScore } = analisis

  const altos  = riesgos.filter(r => r.nivel === "alto")
  const medios = riesgos.filter(r => r.nivel === "medio")
  const infos  = riesgos.filter(r => r.nivel === "info")

  const hayDatos = Object.values(datos).some(v =>
    v !== "" && v !== 0 && !(Array.isArray(v) && v.length === 0)
  )
  if (!hayDatos) return null

  const diffHospital = stats?.hospital?.avg !== null && stats?.hospital?.avg !== undefined
    ? score - stats.hospital.avg
    : null
  const diffGlobal = stats?.global?.avg !== null && stats?.global?.avg !== undefined
    ? score - stats.global.avg
    : null

  function DiffBadge({ diff, label }: { diff: number; label: string }) {
    const positive = diff > 0
    const neutral = Math.abs(diff) <= 2
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
        neutral ? "bg-gray-100 text-gray-500" :
        positive ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
      }`}>
        {neutral ? "≈" : positive ? "▲" : "▼"} {Math.abs(diff)} vs {label}
      </span>
    )
  }

  return (
    <div className="space-y-3">
      {/* ── Score de complejidad ── */}
      <div
        className="bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer"
        onClick={() => setShowScore(s => !s)}
      >
        <div className="px-4 py-4 flex items-center gap-4">
          {/* Gauge circular */}
          <div className="relative shrink-0 w-14 h-14">
            <svg width="56" height="56" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="#f3f4f6" strokeWidth="5" />
              <circle
                cx="28" cy="28" r="22" fill="none"
                stroke={scoreColor} strokeWidth="5"
                strokeDasharray={`${(score / 100) * 138.2} 138.2`}
                strokeLinecap="round"
                transform="rotate(-90 28 28)"
                style={{ transition: "stroke-dasharray 0.6s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-gray-700">{score}</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">Complejidad del proyecto</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: scoreColor }}>
                {scoreLabel}
              </span>
              <span className="text-xs text-gray-400">{score}/100 pts</span>
            </div>
            {/* Comparativas */}
            {(diffHospital !== null || diffGlobal !== null) && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {diffHospital !== null && stats?.hospital?.count && stats.hospital.count > 1 && (
                  <DiffBadge diff={diffHospital} label={`media hospital (${stats.hospital.avg})`} />
                )}
                {diffGlobal !== null && stats?.global?.count && stats.global.count > 1 && (
                  <DiffBadge diff={diffGlobal} label={`media global (${stats.global.avg})`} />
                )}
              </div>
            )}
          </div>

          <span className="text-gray-300 text-lg shrink-0 transition-transform duration-200"
            style={{ transform: showScore ? "rotate(90deg)" : "none" }}>›</span>
        </div>

        {/* Detalle del score */}
        {showScore && (
          <div className="border-t border-gray-100 px-4 py-4 space-y-3">
            <p className="text-xs text-gray-400 mb-2">Desglose por categoría</p>
            {detalleScore.map(d => (
              <div key={d.categoria}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600 font-medium">{d.categoria}</span>
                  <span className="text-xs text-gray-400 tabular-nums">{d.puntos}/{d.max} pts</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(d.puntos / d.max) * 100}%`,
                        backgroundColor: d.puntos > d.max * 0.7 ? "#f97316" : TEAL,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0 w-32 truncate">{d.descripcion}</span>
                </div>
              </div>
            ))}
            {/* Umbrales activos */}
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 flex-wrap">
              <span className="text-[10px] text-gray-400">Umbrales:</span>
              {[
                { label: "Baja", max: cfg.umbrales.baja, color: "#10b981" },
                { label: "Media", max: cfg.umbrales.media, color: "#f59e0b" },
                { label: "Alta", max: cfg.umbrales.alta, color: "#f97316" },
                { label: "Muy alta", max: 100, color: "#ef4444" },
              ].map(u => (
                <span key={u.label} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: u.color }}>
                  {u.label} ≤{u.max}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Panel de riesgos ── */}
      {riesgos.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-gray-800">Alertas detectadas</span>
            <div className="flex items-center gap-1.5 ml-auto flex-wrap">
              {altos.length > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  {altos.length} alto{altos.length > 1 ? "s" : ""}
                </span>
              )}
              {medios.length > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  {medios.length} medio{medios.length > 1 ? "s" : ""}
                </span>
              )}
              {infos.length > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  {infos.length}
                </span>
              )}
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {riesgos.map(riesgo => (
              <RiesgoItem
                key={riesgo.id}
                riesgo={riesgo}
                expanded={expandedRisk === riesgo.id}
                onToggle={() => setExpandedRisk(expandedRisk === riesgo.id ? null : riesgo.id)}
              />
            ))}
          </div>
        </div>
      )}

      {riesgos.length === 0 && hayDatos && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-green-700">Sin alertas detectadas</p>
            <p className="text-xs text-green-500 mt-0.5">Los datos recogidos no muestran banderas rojas.</p>
          </div>
        </div>
      )}
    </div>
  )
}

function RiesgoItem({ riesgo, expanded, onToggle }: { riesgo: Riesgo; expanded: boolean; onToggle: () => void }) {
  const cfg = NIVEL_CONFIG[riesgo.nivel]
  return (
    <button onClick={onToggle} className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3">
        <span className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: cfg.dot }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-gray-800">{riesgo.titulo}</p>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
              {cfg.label}
            </span>
          </div>
          {expanded && <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{riesgo.descripcion}</p>}
        </div>
        <span className="text-gray-300 shrink-0 transition-transform duration-200 mt-0.5"
          style={{ transform: expanded ? "rotate(90deg)" : "none" }}>›</span>
      </div>
    </button>
  )
}
