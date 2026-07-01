"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { TEAL, ORANGE } from "@/lib/brand"
import { Skeleton } from "@/components/ui/Skeleton"

interface TecnicoStat {
  id: string
  nombre: string
  total: number
  resueltas: number
  slaCumplidas: number
  slaAplicables: number
  slaRate: number | null
  horasTotales: number
}

interface StatsData {
  total: number
  totalAbiertas: number
  totalEnProgreso: number
  totalResueltas: number
  slaCumplimiento: number | null
  horasTotales: number
  porCategoria: Record<string, number>
  porPrioridad: Record<string, number>
  porTipo: Record<string, number>
  tecnicos: TecnicoStat[]
}

const PERIODO_OPTIONS = [
  { label: "7 días", days: 7 },
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 },
  { label: "Todo", days: 0 },
]

const PRIO_LABEL: Record<string, string> = {
  CRITICA: "Crítica", ALTA: "Alta", MEDIA: "Media", BAJA: "Baja",
}
const PRIO_COLOR: Record<string, string> = {
  CRITICA: "#dc2626", ALTA: "#f97316", MEDIA: TEAL, BAJA: "#6b7280",
}
const CAT_LABEL: Record<string, string> = {
  RED: "Red", SERVIDOR: "Servidor", PC: "PC", IMPRESORA: "Impresora",
  SOFTWARE: "Software", BCROBO: "BC Robo", RFID: "RFID", BT: "Bluetooth",
  OTRO_HW: "Otro HW", OTRO_SW: "Otro SW",
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-black tabular-nums leading-none" style={{ color: color ?? "#111827" }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
    </div>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs tabular-nums text-gray-500 shrink-0 w-6 text-right">{value}</span>
    </div>
  )
}

function SlaRing({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-xs text-gray-400">—</span>
  const color = rate >= 90 ? "#16a34a" : rate >= 70 ? ORANGE : "#dc2626"
  return (
    <span className="text-sm font-bold tabular-nums" style={{ color }}>{rate}%</span>
  )
}

export default function IncidenciasStatsPage() {
  const [datos, setDatos] = useState<StatsData | null>(null)
  const [cargando, setCargando] = useState(true)
  const [periodo, setPeriodo] = useState(30)

  useEffect(() => {
    setCargando(true)
    const params = new URLSearchParams()
    if (periodo > 0) {
      const desde = new Date(Date.now() - periodo * 86_400_000).toISOString()
      params.set("desde", desde)
    }
    fetch(`/api/incidencias/stats?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setDatos(d); setCargando(false) })
      .catch(() => setCargando(false))
  }, [periodo])

  const topCategoria = datos
    ? Object.entries(datos.porCategoria).sort((a, b) => b[1] - a[1]).slice(0, 6)
    : []
  const maxCat = topCategoria[0]?.[1] ?? 1

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/incidencias" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Métricas de incidencias</h1>
              <p className="text-xs text-gray-400">Rendimiento por técnico · SLA · Distribución</p>
            </div>
          </div>

          {/* Periodo selector */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            {PERIODO_OPTIONS.map(opt => (
              <button
                key={opt.days}
                onClick={() => setPeriodo(opt.days)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={periodo === opt.days
                  ? { backgroundColor: TEAL, color: "#fff" }
                  : { color: "#6b7280" }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Cards */}
        {cargando ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : datos ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <KpiCard label="Total" value={datos.total} />
            <KpiCard label="Abiertas" value={datos.totalAbiertas} color="#f97316" />
            <KpiCard label="En progreso" value={datos.totalEnProgreso} color={TEAL} />
            <KpiCard label="Resueltas" value={datos.totalResueltas} color="#16a34a" />
            <KpiCard
              label="SLA cumplido"
              value={datos.slaCumplimiento !== null ? `${datos.slaCumplimiento}%` : "—"}
              sub={`${datos.horasTotales}h trabajadas`}
              color={datos.slaCumplimiento !== null
                ? datos.slaCumplimiento >= 90 ? "#16a34a" : datos.slaCumplimiento >= 70 ? ORANGE : "#dc2626"
                : undefined}
            />
          </div>
        ) : null}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Distribución categorías */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Por categoría</h2>
            {cargando ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 rounded" />)}</div>
            ) : (
              <div className="space-y-3">
                {topCategoria.map(([cat, count]) => (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{CAT_LABEL[cat] ?? cat}</span>
                    </div>
                    <MiniBar value={count} max={maxCat} color={TEAL} />
                  </div>
                ))}
                {topCategoria.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>}
              </div>
            )}
          </div>

          {/* Distribución prioridad */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Por prioridad</h2>
            {cargando ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 rounded" />)}</div>
            ) : datos ? (
              <div className="space-y-4">
                {["CRITICA", "ALTA", "MEDIA", "BAJA"].map(p => {
                  const count = datos.porPrioridad[p] ?? 0
                  const maxP = Math.max(...Object.values(datos.porPrioridad), 1)
                  return (
                    <div key={p}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIO_COLOR[p] }} />
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{PRIO_LABEL[p]}</span>
                        </div>
                      </div>
                      <MiniBar value={count} max={maxP} color={PRIO_COLOR[p]} />
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>

          {/* Tipo HW/SW */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Hardware vs Software</h2>
            {cargando ? <Skeleton className="h-32 rounded" /> : datos ? (
              <div className="flex items-center justify-center gap-8 py-4">
                {(["HW", "SW"] as const).map(t => {
                  const count = datos.porTipo[t] ?? 0
                  const pct = datos.total > 0 ? Math.round((count / datos.total) * 100) : 0
                  const color = t === "HW" ? ORANGE : TEAL
                  return (
                    <div key={t} className="text-center">
                      <div className="relative w-20 h-20 mx-auto mb-2">
                        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                          <circle cx="40" cy="40" r="34" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                          <circle
                            cx="40" cy="40" r="34" fill="none" strokeWidth="8"
                            stroke={color} strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 34}`}
                            strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
                            style={{ transition: "stroke-dashoffset 0.8s ease" }}
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-lg font-black" style={{ color }}>{pct}%</span>
                      </div>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{t === "HW" ? "Hardware" : "Software"}</p>
                      <p className="text-xs text-gray-400">{count} incidencias</p>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>

        {/* Tabla técnicos */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Rendimiento por técnico</h2>
            <span className="text-xs text-gray-400">{datos?.tecnicos.length ?? 0} técnicos</span>
          </div>

          {cargando ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
            </div>
          ) : !datos?.tecnicos.length ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-400">Sin incidencias asignadas en este periodo</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 dark:border-gray-800">
                    <th className="px-5 py-3 text-left">Técnico</th>
                    <th className="px-3 py-3 text-center">Total</th>
                    <th className="px-3 py-3 text-center">Resueltas</th>
                    <th className="px-3 py-3 text-center">SLA</th>
                    <th className="px-3 py-3 text-center">Horas</th>
                    <th className="px-5 py-3 text-left">Resolución</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {datos.tecnicos.map((t, idx) => {
                    const resRate = t.total > 0 ? Math.round((t.resueltas / t.total) * 100) : 0
                    return (
                      <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black text-white shrink-0"
                              style={{ backgroundColor: idx === 0 ? TEAL : idx === 1 ? ORANGE : "#6b7280" }}
                            >
                              {idx + 1}
                            </div>
                            <span className="font-semibold text-gray-800 dark:text-gray-100">{t.nombre}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-gray-700 dark:text-gray-200 tabular-nums">{t.total}</td>
                        <td className="px-3 py-3 text-center tabular-nums font-semibold" style={{ color: "#16a34a" }}>{t.resueltas}</td>
                        <td className="px-3 py-3 text-center"><SlaRing rate={t.slaRate} /></td>
                        <td className="px-3 py-3 text-center text-gray-500 tabular-nums">{t.horasTotales}h</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2 w-32">
                            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${resRate}%`, backgroundColor: resRate >= 80 ? "#16a34a" : resRate >= 50 ? ORANGE : "#dc2626", transition: "width 0.8s ease" }}
                              />
                            </div>
                            <span className="text-[11px] font-semibold text-gray-500 shrink-0">{resRate}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
