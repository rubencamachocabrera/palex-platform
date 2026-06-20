"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { TEAL, ORANGE } from "@/lib/brand"
import { useToast } from "@/components/Toast"
import { useFavoritos } from "@/hooks/useFavoritos"
import { IconHospital, IconBuilding, IconMicroscope, IconActivity, IconGraduation } from "@/components/ui/Icons"
import { PageHeader } from "@/components/ui/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"

function SkeletonHospitalRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <div className="w-10 h-10 rounded-xl skeleton-shimmer shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/2 rounded-lg skeleton-shimmer" />
        <div className="h-3 w-1/3 rounded-lg skeleton-shimmer" />
      </div>
      <div className="h-3 w-12 rounded skeleton-shimmer shrink-0" />
    </div>
  )
}

function SkeletonHospitalCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl skeleton-shimmer shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded-lg skeleton-shimmer" />
          <div className="h-3 w-1/2 rounded-lg skeleton-shimmer" />
        </div>
      </div>
      <div className="pt-2 border-t border-gray-100 flex justify-between">
        <div className="h-5 w-24 rounded-md skeleton-shimmer" />
        <div className="h-5 w-16 rounded skeleton-shimmer" />
      </div>
    </div>
  )
}

const TIPO_LABELS: Record<string, string> = {
  HOSPITAL_PUBLICO: "Hospital Público",
  HOSPITAL_PRIVADO: "Hospital Privado",
  CLINICA_PRIVADA: "Clínica Privada",
  LABORATORIO: "Laboratorio",
  CENTRO_SALUD: "Centro de Salud",
  UNIVERSIDAD: "Universidad",
  OTRO: "Otro",
}

const TIPO_ICON: Record<string, React.ReactNode> = {
  HOSPITAL_PUBLICO: <IconHospital size={18} />,
  HOSPITAL_PRIVADO: <IconHospital size={18} />,
  CLINICA_PRIVADA:  <IconBuilding size={18} />,
  LABORATORIO:      <IconMicroscope size={18} />,
  CENTRO_SALUD:     <IconActivity size={18} />,
  UNIVERSIDAD:      <IconGraduation size={18} />,
  OTRO:             <IconBuilding size={18} />,
}

interface Hospital {
  id: string
  nombre: string
  ciudad: string
  provincia: string | null
  tipo: string
  camas: number | null
  grupoId?: string | null
  zona: { id: string; nombre: string }
  grupo?: { id: string; nombre: string } | null
  centros?: { id: string; nombre: string; ciudad: string; tipo: string }[]
  _count: { visitas: number; contactos: number }
  score?: number
}

function scoreStyle(s: number): { bg: string; text: string } {
  if (s >= 80) return { bg: "#f0fdf4", text: "#16a34a" }
  if (s >= 60) return { bg: "#f0fdfa", text: "#0d9488" }
  if (s >= 30) return { bg: "#fef3c7", text: "#d97706" }
  return { bg: "#fef2f2", text: "#dc2626" }
}

type Vista = "lista" | "grid"

// ─── Favoritos (DB-backed via useFavoritos hook) ────────────────────────────

function StarBtn({ activo, onClick }: { activo: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      title={activo ? "Quitar de favoritos" : "Añadir a favoritos"}
      className="p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
      style={activo ? { color: "#f59e0b" } : { color: "#d1d5db" }}
      onMouseEnter={e => { if (!activo) (e.currentTarget as HTMLButtonElement).style.color = "#f59e0b" }}
      onMouseLeave={e => { if (!activo) (e.currentTarget as HTMLButtonElement).style.color = "#d1d5db" }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={activo ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    </button>
  )
}

export default function HospitalesPage() {
  const { success, error: toastError } = useToast()
  const [hospitales, setHospitales] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [filtroZona, setFiltroZona] = useState("TODAS")
  const [vista, setVista] = useState<Vista>("lista")
  const [esAdmin, setEsAdmin] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const { ids: favoritos, toggle: toggleFavorito } = useFavoritos("HOSPITAL")

  useEffect(() => {
    fetch("/api/hospitales")
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => { setHospitales(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(e => { console.error("Error cargando hospitales:", e); setFetchError(true); setLoading(false) })
    fetch("/api/perfil")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.rol === "ADMIN") setEsAdmin(true) })
      .catch(() => {})
  }, [])

  async function eliminarHospital(e: React.MouseEvent, h: Hospital) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`¿Eliminar "${h.nombre}"? Esta acción no se puede deshacer.`)) return
    setEliminando(h.id)
    const r = await fetch(`/api/hospitales/${h.id}`, { method: "DELETE" })
    setEliminando(null)
    if (r.ok) {
      setHospitales(prev => prev.filter(x => x.id !== h.id))
      success("Hospital eliminado")
    } else {
      const d = await r.json() as { error?: string }
      toastError(d.error ?? "Error al eliminar")
    }
  }

  const zonas = Array.from(new Set(hospitales.map(h => h.zona.nombre))).sort()

  const filtrados = hospitales.filter(h => {
    const q = busqueda.toLowerCase()
    const coincideQ = !q || h.nombre.toLowerCase().includes(q) || h.ciudad.toLowerCase().includes(q)
    const coincideZ = filtroZona === "TODAS" || h.zona.nombre === filtroZona
    return coincideQ && coincideZ
  })

  const porZona = filtrados.reduce<Record<string, Hospital[]>>((acc, h) => {
    const zona = h.zona.nombre
    if (!acc[zona]) acc[zona] = []
    acc[zona].push(h)
    return acc
  }, {})

  const favHospitales = hospitales.filter(h => favoritos.has(h.id))

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-200">
      <PageHeader
        title="Mis hospitales"
        subtitle={`${filtrados.length} de ${hospitales.length} centros${filtroZona !== "TODAS" ? ` · ${filtroZona}` : ""}`}
        actions={
          /* Toggle vista */
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
          <button
            onClick={() => setVista("lista")}
            title="Vista lista"
            className="p-1.5 rounded transition-colors"
            style={vista === "lista" ? { backgroundColor: TEAL, color: "#fff" } : { color: "#9ca3af" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="3" width="14" height="2" rx="1" fill="currentColor"/>
              <rect x="1" y="7" width="14" height="2" rx="1" fill="currentColor"/>
              <rect x="1" y="11" width="14" height="2" rx="1" fill="currentColor"/>
            </svg>
          </button>
          <button
            onClick={() => setVista("grid")}
            title="Vista tarjetas"
            className="p-1.5 rounded transition-colors"
            style={vista === "grid" ? { backgroundColor: TEAL, color: "#fff" } : { color: "#9ca3af" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
              <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
              <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor"/>
              <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor"/>
            </svg>
          </button>
        </div>}
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o ciudad…"
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 bg-white"
          style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
        />
        {zonas.length > 1 && (
          <select
            value={filtroZona}
            onChange={e => setFiltroZona(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 sm:w-48"
            style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
          >
            <option value="TODAS">Todas las zonas</option>
            {zonas.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        )}
      </div>

      {/* Chips de zona rápida */}
      {zonas.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setFiltroZona("TODAS")}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${filtroZona === "TODAS" ? "text-white" : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300"}`}
            style={filtroZona === "TODAS"
              ? { backgroundColor: TEAL, borderColor: TEAL }
              : {}}
          >
            Todas ({hospitales.length})
          </button>
          {zonas.map(z => {
            const cnt = hospitales.filter(h => h.zona.nombre === z).length
            return (
              <button
                key={z}
                onClick={() => setFiltroZona(filtroZona === z ? "TODAS" : z)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${filtroZona === z ? "text-white" : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300"}`}
                style={filtroZona === z
                  ? { backgroundColor: TEAL, borderColor: TEAL }
                  : {}}
              >
                {z} ({cnt})
              </button>
            )
          })}
        </div>
      )}

      {fetchError ? (
        <div role="alert" aria-live="polite" className="bg-red-50 border border-red-100 rounded-xl px-5 py-4 flex items-center gap-3 text-sm text-red-700">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>No se pudo cargar la lista de hospitales. <button onClick={() => { setFetchError(false); setLoading(true); fetch("/api/hospitales").then(r => r.ok ? r.json() : []).then(d => { setHospitales(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => { setFetchError(true); setLoading(false) }) }} className="font-semibold underline ml-1">Reintentar</button></span>
        </div>
      ) : loading ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {[1,2].map(g => (
            <div key={g}>
              <div className="h-4 w-24 rounded skeleton-shimmer mb-3" />
              {vista === "lista" ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                  {Array.from({ length: 3 }).map((_, i) => <SkeletonHospitalRow key={i} />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => <SkeletonHospitalCard key={i} />)}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <EmptyState
            icon="search"
            title="No hay hospitales que coincidan"
            description="Prueba con otro término o cambia los filtros de zona."
            action={(busqueda || filtroZona !== "TODAS")
              ? { label: "Limpiar filtros", variant: "ghost", onClick: () => { setBusqueda(""); setFiltroZona("TODAS") } }
              : undefined
            }
          />
        </div>
      ) : (
        <div className="space-y-5">
          {/* ── Sección Anclados ── */}
          {favHospitales.length > 0 && !busqueda && filtroZona === "TODAS" && (
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Anclados</span>
                <span className="text-xs text-gray-300">({favHospitales.length})</span>
              </div>
              <div className="bg-white rounded-xl border border-amber-100 overflow-hidden shadow-sm">
                <div className="divide-y divide-gray-50">
                  {favHospitales.map(h => (
                    <div key={h.id} className="relative group flex items-center">
                      <Link href={`/hospitales/${h.id}`} className="flex items-center gap-3 px-4 py-3.5 flex-1 min-w-0 hover:bg-amber-50/30 transition-colors">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-amber-600 shrink-0 bg-amber-50">
                          {TIPO_ICON[h.tipo] ?? <IconHospital size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{h.nombre}</p>
                          <p className="text-xs text-gray-400">{h.ciudad}{h.zona ? ` · ${h.zona.nombre}` : ""}</p>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{h._count.visitas} visitas</span>
                      </Link>
                      <StarBtn activo={true} onClick={e => { e.preventDefault(); toggleFavorito(h.id) }} />
                      <span className="pr-3" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Vista ── */}
          {vista === "lista" ? (
        /* ── VISTA LISTA ── */
        <div className="space-y-6">
          {Object.entries(porZona).map(([zona, lista]) => (
            <div key={zona}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{zona}</span>
                <span className="text-xs text-gray-300">({lista.length})</span>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {lista.map(h => (
                    <div key={h.id} className="relative group">
                      <Link
                        href={`/hospitales/${h.id}`}
                        className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors active:bg-gray-100"
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-teal-600 shrink-0 bg-teal-50">
                          {TIPO_ICON[h.tipo] ?? <IconHospital size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-gray-800 truncate">{h.nombre}</p>
                            {h.centros && h.centros.length > 0 && !h.grupoId && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                                style={{ backgroundColor: TEAL + "15", color: TEAL }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                                {h.centros.length}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {h.ciudad}{h.provincia ? `, ${h.provincia}` : ""}
                            {h.camas ? ` · ${h.camas} camas` : ""}
                          </p>
                          <p className="text-xs text-gray-300 mt-0.5">
                            {TIPO_LABELS[h.tipo] ?? h.tipo}
                            {h.grupo && (
                              <span className="ml-1.5 text-gray-400">
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline -mt-px mr-0.5"><polyline points="9 18 15 12 9 6"/></svg>
                                {h.grupo.nombre}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right shrink-0 space-y-0.5">
                          {h.score !== undefined && (() => {
                            const ss = scoreStyle(h.score)
                            return (
                              <span className="inline-block text-[10px] font-black px-1.5 py-0.5 rounded-full mb-0.5" style={{ backgroundColor: ss.bg, color: ss.text }}>
                                {h.score}
                              </span>
                            )
                          })()}
                          <p className="text-xs text-gray-400">{h._count.visitas} visitas</p>
                          <p className="text-xs text-gray-300">{h._count.contactos} contactos</p>
                          <span className="text-gray-300 text-sm block">›</span>
                        </div>
                      </Link>
                      <div className="flex items-center gap-1 pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <StarBtn activo={favoritos.has(h.id)} onClick={e => { e.preventDefault(); toggleFavorito(h.id) }} />
                        {esAdmin && (
                          <button
                            onClick={e => eliminarHospital(e, h)}
                            disabled={eliminando === h.id}
                            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-300 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all bg-white"
                            aria-label={`Eliminar ${h.nombre}`}
                            title="Eliminar hospital"
                          >
                            {eliminando === h.id ? (
                              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── VISTA GRID ── */
        <div className="space-y-6">
          {Object.entries(porZona).map(([zona, lista]) => (
            <div key={zona}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{zona}</span>
                <span className="text-xs text-gray-300">({lista.length})</span>
              </div>
              <div className="stagger-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {lista.map(h => (
                  <div key={h.id} className="relative group">
                    <Link
                      href={`/hospitales/${h.id}`}
                      className="card-hover block bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-teal-600 shrink-0 bg-teal-50">
                          {TIPO_ICON[h.tipo] ?? <IconHospital size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2">{h.nombre}</p>
                            {h.centros && h.centros.length > 0 && !h.grupoId && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                                style={{ backgroundColor: TEAL + "15", color: TEAL }}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                                {h.centros.length}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {h.ciudad}{h.provincia ? `, ${h.provincia}` : ""}
                            {h.grupo && (
                              <span className="ml-1 text-gray-400">
                                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="inline -mt-px mr-0.5"><polyline points="9 18 15 12 9 6"/></svg>
                                {h.grupo.nombre}
                              </span>
                            )}
                          </p>
                        </div>
                        {h.score !== undefined && (() => {
                          const ss = scoreStyle(h.score)
                          return (
                            <span className="text-[11px] font-black px-1.5 py-0.5 rounded-full shrink-0 self-start" style={{ backgroundColor: ss.bg, color: ss.text }}>
                              {h.score}
                            </span>
                          )
                        })()}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                          {TIPO_LABELS[h.tipo] ?? h.tipo}
                        </span>
                        <div className="text-right">
                          <span className="text-xs font-semibold" style={{ color: TEAL }}>
                            {h._count.visitas} visitas
                          </span>
                        </div>
                      </div>
                    </Link>
                    {/* Star + delete overlay */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <StarBtn activo={favoritos.has(h.id)} onClick={e => { e.preventDefault(); toggleFavorito(h.id) }} />
                      {esAdmin && (
                        <button
                          onClick={e => eliminarHospital(e, h)}
                          disabled={eliminando === h.id}
                          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-300 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all bg-white"
                          aria-label={`Eliminar ${h.nombre}`}
                          title="Eliminar hospital"
                        >
                          {eliminando === h.id ? (
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
          )}
        </div>
      )}
    </div>
  )
}
