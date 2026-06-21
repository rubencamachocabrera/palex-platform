"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/ui/PageHeader"
import { Skeleton } from "@/components/ui/Skeleton"
import { TEAL, TEAL_DARK } from "@/lib/brand"
import { usePerfil } from "@/hooks/usePerfil"

// ─── Types ──────────────────────────────────────────────────────────────────

interface UsuarioCarga {
  id: string
  nombre: string
  rol: string
  totalMes: number
  dias: Record<string, number>
}

interface CargaData {
  mes: string
  usuarios: UsuarioCarga[]
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const ROL_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  VENTAS: "Ventas",
  PROYECTOS: "Proyectos",
  TECNICO: "Tecnico",
}

const ROL_COLOR: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  ADMIN:     { bg: "bg-red-50",    text: "text-red-600",    darkBg: "dark:bg-red-950/40",    darkText: "dark:text-red-400" },
  VENTAS:    { bg: "bg-orange-50", text: "text-orange-600", darkBg: "dark:bg-orange-950/40", darkText: "dark:text-orange-400" },
  PROYECTOS: { bg: "bg-teal-50",   text: "text-teal-600",   darkBg: "dark:bg-teal-950/40",   darkText: "dark:text-teal-400" },
  TECNICO:   { bg: "bg-purple-50", text: "text-purple-600", darkBg: "dark:bg-purple-950/40", darkText: "dark:text-purple-400" },
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function diasEnMes(anio: number, mes: number): number {
  return new Date(anio, mes, 0).getDate()
}

function heatColor(count: number): string {
  if (count === 0) return "hc-0"
  if (count === 1) return "hc-1"
  if (count === 2) return "hc-2"
  return "hc-3"
}

function heatColorLabel(level: number): string {
  switch (level) {
    case 0: return "0 visitas"
    case 1: return "1 visita"
    case 2: return "2 visitas"
    default: return "3+ visitas"
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CargaTrabajoPage() {
  const router = useRouter()
  const { rol } = usePerfil()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<CargaData | null>(null)

  // Current month state
  const ahora = new Date()
  const [anio, setAnio] = useState(ahora.getFullYear())
  const [mes, setMes] = useState(ahora.getMonth() + 1)

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; usuario: string; dia: number; count: number
  } | null>(null)

  // ── Auth check ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (rol && rol !== "ADMIN") router.replace("/dashboard")
  }, [rol, router])

  // ── Fetch data ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (rol !== "ADMIN") return
    setLoading(true)
    const mesStr = `${anio}-${String(mes).padStart(2, "0")}`
    fetch(`/api/admin/carga-trabajo?mes=${mesStr}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [rol, anio, mes])

  // ── Derived stats ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!data || data.usuarios.length === 0) {
      return { total: 0, media: 0, diaMasActivo: "-", maxDia: 0 }
    }

    const total = data.usuarios.reduce((s, u) => s + u.totalMes, 0)
    const usuariosConVisitas = data.usuarios.filter(u => u.totalMes > 0).length
    const media = usuariosConVisitas > 0 ? Math.round((total / usuariosConVisitas) * 10) / 10 : 0

    // Find most active day
    const diasTotal: Record<string, number> = {}
    for (const u of data.usuarios) {
      for (const [d, c] of Object.entries(u.dias)) {
        diasTotal[d] = (diasTotal[d] ?? 0) + c
      }
    }

    let diaMasActivo = "-"
    let maxDia = 0
    for (const [d, c] of Object.entries(diasTotal)) {
      if (c > maxDia) {
        maxDia = c
        diaMasActivo = d
      }
    }

    return { total, media, diaMasActivo, maxDia }
  }, [data])

  const numDias = diasEnMes(anio, mes)

  // ── Month navigation ──────────────────────────────────────────────────
  function prevMes() {
    if (mes === 1) { setAnio(a => a - 1); setMes(12) }
    else setMes(m => m - 1)
  }
  function nextMes() {
    if (mes === 12) { setAnio(a => a + 1); setMes(1) }
    else setMes(m => m + 1)
  }

  // ── Guard ──────────────────────────────────────────────────────────────
  if (rol === null) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (rol !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500 dark:text-gray-400">No tienes permisos para acceder a esta pagina.</p>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="Carga de Trabajo"
        subtitle="Heatmap de visitas por usuario y dia"
        breadcrumb={[{ label: "Admin", href: "/admin/usuarios" }]}
      />

      {/* ── Month navigation ─────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={prevMes}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          aria-label="Mes anterior"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span className="text-lg font-semibold text-gray-900 dark:text-white min-w-[180px] text-center">
          {MESES[mes - 1]} {anio}
        </span>
        <button
          onClick={nextMes}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          aria-label="Mes siguiente"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
              <Skeleton className="h-3 w-20 mb-3" />
              <Skeleton className="h-8 w-14" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Total visitas */}
          <div
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm"
            style={{ borderTop: `3px solid ${TEAL}` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${TEAL}15` }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total visitas</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>

          {/* Media por usuario */}
          <div
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm"
            style={{ borderTop: `3px solid ${TEAL_DARK}` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${TEAL_DARK}15` }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL_DARK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
              </div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Media por usuario</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.media}</p>
          </div>

          {/* Dia mas activo */}
          <div
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm"
            style={{ borderTop: `3px solid #6366f1` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#6366f115" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Dia mas activo</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.diaMasActivo !== "-" ? `Dia ${stats.diaMasActivo}` : "-"}
              {stats.maxDia > 0 && (
                <span className="text-sm font-normal text-gray-400 ml-2">({stats.maxDia} visitas)</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* ── Heatmap ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-6 w-28 shrink-0" />
              <div className="flex gap-1 flex-1">
                {Array.from({ length: 15 }).map((_, j) => (
                  <Skeleton key={j} className="w-7 h-7 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : data && data.usuarios.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-fit p-4 sm:p-6">
              {/* Column headers: day numbers */}
              <div className="flex items-end gap-0 mb-2">
                {/* Row header spacer */}
                <div className="w-32 sm:w-40 shrink-0" />
                {/* Day numbers */}
                <div className="flex gap-[3px]">
                  {Array.from({ length: numDias }).map((_, i) => {
                    const day = i + 1
                    const isWeekend = new Date(anio, mes - 1, day).getDay() % 6 === 0
                    return (
                      <div
                        key={day}
                        className={`w-7 h-5 flex items-center justify-center text-[10px] font-medium ${
                          isWeekend
                            ? "text-gray-300 dark:text-gray-600"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {day}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Rows: users */}
              {data.usuarios.map(u => {
                const rc = ROL_COLOR[u.rol] ?? { bg: "bg-gray-50", text: "text-gray-600", darkBg: "dark:bg-gray-800", darkText: "dark:text-gray-400" }
                return (
                  <div key={u.id} className="flex items-center gap-0 mb-[3px]">
                    {/* Row header: name + role */}
                    <div className="w-32 sm:w-40 shrink-0 flex items-center gap-2 pr-3">
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate flex-1">
                        {u.nombre}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${rc.bg} ${rc.text} ${rc.darkBg} ${rc.darkText}`}
                      >
                        {ROL_LABEL[u.rol] ?? u.rol}
                      </span>
                    </div>

                    {/* Cells */}
                    <div className="flex gap-[3px]">
                      {Array.from({ length: numDias }).map((_, i) => {
                        const day = i + 1
                        const count = u.dias[String(day)] ?? 0
                        const colorClass = heatColor(count)

                        return (
                          <div
                            key={day}
                            className={`heat-cell w-7 h-7 rounded-[4px] cursor-default transition-transform hover:scale-110 ${colorClass}`}
                            onMouseEnter={e => {
                              const rect = e.currentTarget.getBoundingClientRect()
                              setTooltip({
                                x: rect.left + rect.width / 2,
                                y: rect.top - 8,
                                usuario: u.nombre,
                                dia: day,
                                count,
                              })
                            }}
                            onMouseLeave={() => setTooltip(null)}
                          />
                        )
                      })}
                    </div>

                    {/* Total for this user */}
                    <div className="w-10 shrink-0 flex items-center justify-end pl-2">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {u.totalMes}
                      </span>
                    </div>
                  </div>
                )
              })}

              {/* ── Legend ──────────────────────────────────────────────── */}
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                <span className="text-[11px] text-gray-400">Menos</span>
                {[0, 1, 2, 3].map(level => (
                  <div key={level} className="flex items-center gap-1">
                    <div className={`w-4 h-4 rounded-[3px] ${heatColor(level)}`} />
                    <span className="text-[10px] text-gray-400">{heatColorLabel(level)}</span>
                  </div>
                ))}
                <span className="text-[11px] text-gray-400">Mas</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">No hay datos de visitas para este mes</p>
        </div>
      )}

      {/* ── Tooltip (portal-style, fixed) ─────────────────────────────── */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
            <p className="font-semibold">{tooltip.usuario}</p>
            <p>
              Dia {tooltip.dia}: {tooltip.count} visita{tooltip.count !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      {/* ── Inline styles for heatmap cells ───────────────────────────── */}
      <style>{`
        .hc-0 { background-color: #f3f4f6; }
        .hc-1 { background-color: #ccfbf1; }
        .hc-2 { background-color: #5eead4; }
        .hc-3 { background-color: ${TEAL}; }

        .dark .hc-0 { background-color: #1f2937; }
        .dark .hc-1 { background-color: #134e4a; }
        .dark .hc-2 { background-color: #0f766e; }
        .dark .hc-3 { background-color: ${TEAL}; }
      `}</style>
    </div>
  )
}
