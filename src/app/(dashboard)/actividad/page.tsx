"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { TEAL } from "@/lib/brand"
import { PageHeader } from "@/components/ui/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { Skeleton } from "@/components/ui/Skeleton"

interface LogEntry {
  id: string
  accion: string
  entidad: string
  entidadId: string | null
  detalle: string | null
  creadoEn: string
  usuario: { id: string; nombre: string; rol: string }
}

interface DayGroup {
  label: string
  entries: LogEntry[]
}

// ── Config ────────────────────────────────────────────────────────────────────

const ACCION_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  CREAR:    { label: "creó",     color: "#16a34a", bg: "#f0fdf4", icon: "+" },
  EDITAR:   { label: "editó",    color: "#2563eb", bg: "#eff6ff", icon: "~" },
  ELIMINAR: { label: "eliminó",  color: "#dc2626", bg: "#fef2f2", icon: "×" },
}

const ENTIDAD_CFG: Record<string, { label: string; href: (id: string | null) => string | null }> = {
  VISITA:     { label: "visita",     href: id => id ? `/visitas/${id}` : null },
  HOSPITAL:   { label: "hospital",   href: id => id ? `/hospitales/${id}` : null },
  PROYECTO:   { label: "proyecto",   href: id => id ? `/proyectos/${id}` : null },
  INCIDENCIA: { label: "incidencia", href: id => id ? `/incidencias/${id}` : null },
  LLAMADA:    { label: "llamada",    href: _  => `/llamadas` },
  HARDWARE:   { label: "hardware",   href: _  => `/hardware` },
  USUARIO:    { label: "usuario",    href: _  => `/admin/usuarios` },
  RECORDATORIO: { label: "recordatorio", href: _ => `/recordatorios` },
}

const ENTIDAD_ICONS: Record<string, React.ReactElement> = {
  VISITA: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  HOSPITAL: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  PROYECTO: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  INCIDENCIA: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  LLAMADA: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  HARDWARE: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
    </svg>
  ),
  USUARIO: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
}

const ALL_ENTIDADES = Object.keys(ENTIDAD_CFG)

function avatarColor(nombre: string) {
  const colors = ["#0d9488", "#0891b2", "#7c3aed", "#db2777", "#ea580c", "#65a30d", "#2563eb"]
  let h = 0
  for (let i = 0; i < nombre.length; i++) h = nombre.charCodeAt(i) + ((h << 5) - h)
  return colors[Math.abs(h) % colors.length]
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
}

function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return "Hoy"
  if (d.toDateString() === yesterday.toDateString()) return "Ayer"
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

function groupByDay(logs: LogEntry[]): DayGroup[] {
  const map = new Map<string, LogEntry[]>()
  for (const log of logs) {
    const key = new Date(log.creadoEn).toDateString()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(log)
  }
  return Array.from(map.entries()).map(([key, entries]) => ({
    label: dayLabel(new Date(entries[0].creadoEn).toISOString()),
    entries,
    _key: key,
  })) as DayGroup[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ActividadPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [filterEntidad, setFilterEntidad] = useState("")
  const LIMIT = 60

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
    if (filterEntidad) params.set("entidad", filterEntidad)
    const r = await fetch(`/api/log-actividad?${params}`)
    if (r.ok) {
      const d = await r.json()
      setLogs(d.logs ?? [])
      setTotal(d.total ?? 0)
    }
    setLoading(false)
  }, [offset, filterEntidad])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  useEffect(() => { setOffset(0) }, [filterEntidad])

  const groups = groupByDay(logs)
  const totalPages = Math.ceil(total / LIMIT)
  const currentPage = Math.floor(offset / LIMIT) + 1

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Actividad del equipo" subtitle={`${total} acciones registradas`} />

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilterEntidad("")}
          className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer"
          style={!filterEntidad
            ? { backgroundColor: TEAL, color: "white" }
            : { backgroundColor: "#f3f4f6", color: "#6b7280" }}
        >
          Todo
        </button>
        {ALL_ENTIDADES.map(e => (
          <button
            key={e}
            onClick={() => setFilterEntidad(filterEntidad === e ? "" : e)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer"
            style={filterEntidad === e
              ? { backgroundColor: TEAL, color: "white" }
              : { backgroundColor: "#f3f4f6", color: "#6b7280" }}
          >
            {ENTIDAD_CFG[e]?.label ?? e.toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2].map(g => (
            <div key={g}>
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState icon="document" title="Sin actividad registrada" description="Las acciones del equipo aparecerán aquí." />
      ) : (
        <div className="space-y-8">
          {groups.map((group, gi) => (
            <div key={gi}>
              {/* Day header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                <span className="text-[11px] text-gray-400">{group.entries.length} acción{group.entries.length !== 1 ? "es" : ""}</span>
              </div>

              {/* Entries */}
              <div className="relative">
                {/* Timeline spine */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100 dark:bg-gray-800" />

                <div className="space-y-1">
                  {group.entries.map(log => {
                    const ac = ACCION_CFG[log.accion] ?? { label: log.accion.toLowerCase(), color: "#6b7280", bg: "#f9fafb", icon: "·" }
                    const ec = ENTIDAD_CFG[log.entidad.toUpperCase()]
                    const href = ec?.href(log.entidadId) ?? null
                    const entidadIcon = ENTIDAD_ICONS[log.entidad.toUpperCase()]
                    const entidadLabel = ec?.label ?? log.entidad.toLowerCase()

                    return (
                      <div key={log.id} className="relative flex items-start gap-3 pl-9 py-2 group">
                        {/* Dot on spine */}
                        <div className="absolute left-2.5 top-3.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-950 z-10"
                          style={{ backgroundColor: ac.color }} />

                        {/* Action badge */}
                        <div className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold mt-0.5"
                          style={{ backgroundColor: ac.bg, color: ac.color }}>
                          {ac.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-3.5 py-2.5 shadow-sm hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              {/* Avatar */}
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                                style={{ backgroundColor: avatarColor(log.usuario.nombre) }}>
                                {log.usuario.nombre.charAt(0).toUpperCase()}
                              </span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">{log.usuario.nombre}</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">{ac.label}</span>
                              {/* Entity */}
                              <span className="flex items-center gap-1 text-sm font-medium" style={{ color: ac.color }}>
                                {entidadIcon && <span className="opacity-70">{entidadIcon}</span>}
                                {href ? (
                                  <Link href={href} className="hover:underline underline-offset-2">{entidadLabel}</Link>
                                ) : (
                                  <span>{entidadLabel}</span>
                                )}
                              </span>
                            </div>
                            <span className="text-[11px] text-gray-400 shrink-0 mt-0.5">{fmtHora(log.creadoEn)}</span>
                          </div>
                          {log.detalle && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{log.detalle}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={() => setOffset(Math.max(0, offset - LIMIT))} disabled={offset === 0}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors">
            ← Anterior
          </button>
          <span className="text-xs text-gray-400">Página {currentPage} de {totalPages} · {total} entradas</span>
          <button onClick={() => setOffset(offset + LIMIT)} disabled={offset + LIMIT >= total}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
            style={{ borderColor: offset + LIMIT < total ? TEAL : "#e5e7eb", color: offset + LIMIT < total ? TEAL : "#9ca3af" }}>
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}
