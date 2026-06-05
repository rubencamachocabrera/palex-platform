"use client"

import { useEffect, useMemo, useState } from "react"
import { TEAL } from "@/lib/brand"
import { generarConsumoMensual, TUBOS } from "../_lib/mock-data"
import { getForecast } from "../_lib/data-service"
import type { Hospital, PeriodoKey, ForecastPunto } from "../_lib/types"
import { PERIODOS } from "../_lib/types"
import { ForecastChart } from "./Charts"

interface Props { hospitalId: string; periodo: PeriodoKey; hospitales: Hospital[] }

type HorizonKey = 1 | 2 | 3

const ANOMALIAS = [
  { id: 1, tubo: "EDTA K2", color: "#8B5CF6", fecha: "hace 3 días", severidad: "ALTA", pct: 38, desc: "Consumo 3.2σ por encima de la media estacional esperada. Revisar evento puntual o error de registro.", tipo: "exceso" as const },
  { id: 2, tubo: "Hemocultivo", color: "#EF4444", fecha: "hace 11 días", severidad: "MEDIA", pct: -28, desc: "Caída inusual en dos semanas consecutivas. Puede indicar cambio de protocolo en laboratorio.", tipo: "caida" as const },
  { id: 3, tubo: "Inmunología", color: "#EC4899", fecha: "hace 22 días", severidad: "BAJA", pct: 45, desc: "Pico esperado campaña de alergias. Patrón estacional normal confirmado por modelo.", tipo: "patron" as const },
]

const RECOMENDACIONES = [
  { id: 1, accion: "Revisar inventario EDTA K2", impacto: "Alto", confianza: 91, desc: "Nivel de stock puede ser insuficiente para cubrir el forecast de las próximas 4 semanas. Solicitar aprovisionamiento preventivo.", color: "#8B5CF6", urgencia: "Inmediata" },
  { id: 2, accion: "Auditar registro Hemocultivo", impacto: "Medio", confianza: 78, desc: "La caída detectada no correlaciona con patrones estacionales conocidos. Verificar integridad del registro de datos.", color: "#EF4444", urgencia: "Esta semana" },
  { id: 3, accion: "Ampliar capacidad en pico anual", impacto: "Alto", confianza: 95, desc: "El modelo ARIMA predice un pico máximo del año en octubre–noviembre. Planificar recursos con 6 semanas de antelación.", color: TEAL, urgencia: "Próximo mes" },
]

export function TabIA({ hospitalId, periodo }: Props) {
  const [forecast, setForecast] = useState<ForecastPunto[]>([])
  const [horizon, setHorizon] = useState<HorizonKey>(3)
  const [loadingFc, setLoadingFc] = useState(true)

  const meses = PERIODOS.find(p => p.k === periodo)?.meses ?? 12
  const base = useMemo(() => hospitalId ? generarConsumoMensual({ hospitalId, meses }) : [], [hospitalId, meses])

  useEffect(() => {
    if (!hospitalId || base.length === 0) return
    setLoadingFc(true)
    getForecast(hospitalId, base, horizon).then(data => {
      setForecast(data)
      setLoadingFc(false)
    })
  }, [hospitalId, base, horizon])

  const totalReal = base.length ? TUBOS.reduce((s, t) => s + (base[base.length - 1][t.key as keyof typeof base[0]] as number), 0) : 0
  const fcPoints = forecast.filter(f => f.esForecast)
  const fcLast = fcPoints[fcPoints.length - 1]
  const growthFc = fcLast && totalReal ? (((fcLast.valor - totalReal) / totalReal) * 100).toFixed(1) : "—"
  const confidencia = horizon === 1 ? 91 : horizon === 2 ? 84 : 76

  if (!hospitalId) return (
    <div className="flex items-center justify-center h-48">
      <p className="text-sm text-gray-400">Selecciona un hospital para ver el módulo IA.</p>
    </div>
  )

  return (
    <div className="space-y-5">

      {/* Header modelo */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${TEAL}20, #8B5CF620)` }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12l-5 5M12 12l5-5M12 12v7M12 12H5"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Motor de Predicción InLab IA</p>
            <p className="text-[10px] text-gray-400">Modelo ARIMA estacional · datos InLab Palex</p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          {[
            { label: "Precisión modelo", value: `${confidencia}%`, color: TEAL },
            { label: "Anomalías activas", value: "2", color: "#ef4444" },
            { label: "Recomendaciones", value: "3", color: "#8b5cf6" },
            { label: "Horizon activo", value: `${horizon * 30}d`, color: "#f59e0b" },
          ].map(m => (
            <div key={m.label} className="px-3 py-2 rounded-xl border border-gray-100 bg-gray-50/80">
              <p className="text-xs font-bold tabular-nums" style={{ color: m.color }}>{m.value}</p>
              <p className="text-[9px] text-gray-400 mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Forecast */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" style={{ borderTop: `3px solid ${TEAL}` }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-800">Predicción de consumo total</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Histórico real + forecast con banda de confianza {confidencia}%</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-gray-400">Horizon:</span>
            {([1, 2, 3] as const).map(h => (
              <button key={h} onClick={() => setHorizon(h)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                style={horizon === h ? { backgroundColor: `${TEAL}15`, color: TEAL } : { color: "#6b7280" }}>
                {h * 30}d
              </button>
            ))}
          </div>
        </div>

        {loadingFc ? (
          <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        ) : (
          <ForecastChart data={forecast} height={210} />
        )}

        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-50">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 rounded-full inline-block" style={{ backgroundColor: TEAL }} />
              <span className="text-[10px] text-gray-500">Datos reales</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 border-t-2 border-dashed inline-block" style={{ borderColor: TEAL }} />
            <span className="text-[10px] text-gray-500">Forecast ({horizon * 30} días)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-3 rounded-sm inline-block opacity-30" style={{ backgroundColor: TEAL }} />
            <span className="text-[10px] text-gray-500">Banda de confianza ±{horizon === 1 ? 8 : horizon === 2 ? 14 : 20}%</span>
          </div>
          {fcLast && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] text-gray-500">Forecast fin:</span>
              <span className="text-[11px] font-bold tabular-nums" style={{ color: TEAL }}>{fcLast.valor.toLocaleString("es-ES")}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${growthFc !== "—" && parseFloat(growthFc) >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {growthFc !== "—" && parseFloat(growthFc) >= 0 ? "+" : ""}{growthFc}%
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">

        {/* Anomalías detectadas */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" style={{ borderTop: "3px solid #ef4444" }}>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-bold text-gray-800">Anomalías detectadas</h2>
            <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold flex items-center justify-center">{ANOMALIAS.filter(a => a.tipo !== "patron").length}</span>
          </div>
          <div className="space-y-3">
            {ANOMALIAS.map(a => (
              <div key={a.id} className="flex gap-3 p-3.5 rounded-xl border transition-all hover:shadow-sm cursor-default"
                style={{ borderColor: `${a.color}30`, backgroundColor: `${a.color}08` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${a.color}20` }}>
                  {a.tipo === "exceso" ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={a.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                    </svg>
                  ) : a.tipo === "caida" ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={a.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={a.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-800">{a.tubo}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: a.tipo === "patron" ? "#f0fdf4" : "#fef2f2", color: a.tipo === "patron" ? "#16a34a" : a.color }}>
                        {a.severidad}
                      </span>
                    </div>
                    <span className="text-[10px] tabular-nums font-bold shrink-0"
                      style={{ color: a.pct > 0 ? "#ef4444" : "#10b981" }}>
                      {a.pct > 0 ? "+" : ""}{a.pct}%
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed">{a.desc}</p>
                  <p className="text-[9px] text-gray-400 mt-1.5">{a.fecha}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recomendaciones */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" style={{ borderTop: "3px solid #8b5cf6" }}>
          <h2 className="text-sm font-bold text-gray-800 mb-4">Recomendaciones automáticas</h2>
          <div className="space-y-3">
            {RECOMENDACIONES.map(r => (
              <div key={r.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-default">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-800">{r.accion}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: `${r.color}15`, color: r.color }}>
                        Impacto {r.impacto}
                      </span>
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{r.urgencia}</span>
                    </div>
                  </div>
                  {/* Confianza gauge */}
                  <div className="shrink-0 text-center">
                    <div className="relative w-10 h-10">
                      <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                        <circle cx="18" cy="18" r="14" fill="none" stroke={r.color} strokeWidth="3"
                          strokeDasharray={`${(r.confianza / 100) * 88} 88`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold" style={{ color: r.color }}>{r.confianza}%</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>

          {/* Disclaimer modelo */}
          <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p className="text-[10px] text-amber-700 leading-relaxed">
              <strong>Modelo demo.</strong> En producción se entrenará con datos reales de InLab Palex, integrando variables adicionales: distancia de ruta, temperatura ambiente, histórico completo y datos de gestión de lotes.
            </p>
          </div>
        </div>
      </div>

      {/* Predicción por tipo de tubo */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-800 mb-4">Predicción por tipo de tubo — próximos {horizon * 30} días</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TUBOS.map(t => {
            const vals = base.map(d => d[t.key as keyof typeof d] as number)
            const last = vals[vals.length - 1] ?? 0
            const trend = vals.length >= 2 ? ((vals[vals.length - 1] - vals[vals.length - 2]) / (vals[vals.length - 2] || 1)) : 0
            const predicted = Math.round(last * (1 + trend * horizon * 0.3))
            const growthPct = last > 0 ? ((predicted - last) / last * 100) : 0
            return (
              <div key={t.key} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/60">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  <span className="text-[11px] font-bold text-gray-700 truncate">{t.label}</span>
                </div>
                <p className="text-lg font-bold tabular-nums" style={{ color: t.color }}>{predicted.toLocaleString("es-ES")}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className={`text-[10px] font-bold ${growthPct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {growthPct >= 0 ? "▲" : "▼"}{Math.abs(growthPct).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-gray-400">vs hoy</span>
                </div>
                {/* Mini bar */}
                <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, 50 + growthPct * 2)}%`, backgroundColor: t.color }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
