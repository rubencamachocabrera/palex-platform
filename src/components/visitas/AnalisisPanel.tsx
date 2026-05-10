"use client"

import { useMemo, useState } from "react"
import { analizarVisita } from "@/lib/visita-analysis"
import type { Riesgo } from "@/lib/visita-analysis"

const TEAL = "#00A99D"

const NIVEL_CONFIG = {
  alto:  { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    icon: "🔴", label: "Alto" },
  medio: { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  icon: "🟡", label: "Medio" },
  info:  { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   icon: "🔵", label: "Info" },
}

interface AnalisisPanelProps {
  datos: Record<string, unknown>
}

export function AnalisisPanel({ datos }: AnalisisPanelProps) {
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null)
  const [showScore, setShowScore] = useState(false)

  const analisis = useMemo(() => analizarVisita(datos), [datos])
  const { riesgos, score, scoreLabel, scoreColor, detalleScore } = analisis

  const altos  = riesgos.filter(r => r.nivel === "alto")
  const medios = riesgos.filter(r => r.nivel === "medio")
  const infos  = riesgos.filter(r => r.nivel === "info")

  // No mostrar si no hay datos suficientes para el análisis
  const hayDatos = Object.values(datos).some(v =>
    v !== "" && v !== 0 && !(Array.isArray(v) && v.length === 0)
  )
  if (!hayDatos) return null

  return (
    <div className="space-y-3">
      {/* ── Score de complejidad ── */}
      <div
        className="bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer"
        onClick={() => setShowScore(!showScore)}
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
            <p className="text-sm font-semibold text-gray-800">
              Complejidad del proyecto
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: scoreColor }}
              >
                {scoreLabel}
              </span>
              <span className="text-xs text-gray-400">{score}/100 puntos</span>
            </div>
          </div>

          <span className="text-gray-300 text-lg shrink-0 transition-transform duration-200"
            style={{ transform: showScore ? "rotate(90deg)" : "none" }}>›</span>
        </div>

        {/* Detalle del score */}
        {showScore && (
          <div className="border-t border-gray-100 px-4 py-4 space-y-3">
            {detalleScore.map(d => (
              <div key={d.categoria}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600 font-medium">{d.categoria}</span>
                  <span className="text-xs text-gray-400">{d.puntos}/{d.max} pts</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(d.puntos / d.max) * 100}%`,
                        backgroundColor: d.puntos > d.max * 0.7 ? "#f97316" : TEAL,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 w-32 truncate">{d.descripcion}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Panel de riesgos ── */}
      {riesgos.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Cabecera resumen */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-gray-800">
              Alertas detectadas
            </span>
            <div className="flex items-center gap-1.5 ml-auto flex-wrap">
              {altos.length > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                  🔴 {altos.length} alto{altos.length > 1 ? "s" : ""}
                </span>
              )}
              {medios.length > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                  🟡 {medios.length} medio{medios.length > 1 ? "s" : ""}
                </span>
              )}
              {infos.length > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                  🔵 {infos.length}
                </span>
              )}
            </div>
          </div>

          {/* Lista de riesgos */}
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

      {/* Sin riesgos */}
      {riesgos.length === 0 && hayDatos && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-xl">✅</span>
          <div>
            <p className="text-sm font-medium text-green-700">Sin alertas detectadas</p>
            <p className="text-xs text-green-500 mt-0.5">Los datos recogidos no muestran banderas rojas en este momento.</p>
          </div>
        </div>
      )}
    </div>
  )
}

function RiesgoItem({ riesgo, expanded, onToggle }: {
  riesgo: Riesgo
  expanded: boolean
  onToggle: () => void
}) {
  const cfg = NIVEL_CONFIG[riesgo.nivel]

  return (
    <button
      onClick={onToggle}
      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <span className="text-base shrink-0 mt-0.5">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-gray-800">{riesgo.titulo}</p>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
              {cfg.label}
            </span>
          </div>
          {expanded && (
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{riesgo.descripcion}</p>
          )}
        </div>
        <span className="text-gray-300 shrink-0 transition-transform duration-200 mt-0.5"
          style={{ transform: expanded ? "rotate(90deg)" : "none" }}>›</span>
      </div>
    </button>
  )
}
