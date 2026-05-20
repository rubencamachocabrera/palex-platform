"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { TEAL, ORANGE } from "@/lib/brand"
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
  zona: { id: string; nombre: string }
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

export default function HospitalesPage() {
  const [hospitales, setHospitales] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroZona, setFiltroZona] = useState("TODAS")
  const [vista, setVista] = useState<Vista>("lista")

  useEffect(() => {
    fetch("/api/hospitales")
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => { setHospitales(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(e => { console.error("Error cargando hospitales:", e); setLoading(false) })
  }, [])

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

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-200">
      <PageHeader
        title="Mis hospitales"
        subtitle={`${filtrados.length} de ${hospitales.length} centros${filtroZona !== "TODAS" ? ` · ${filtroZona}` : ""}`}
        actions={
          /* Toggle vista */
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
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
            className="text-xs font-medium px-3 py-1.5 rounded-full border transition-colors"
            style={filtroZona === "TODAS"
              ? { backgroundColor: TEAL, color: "#fff", borderColor: TEAL }
              : { backgroundColor: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}
          >
            Todas ({hospitales.length})
          </button>
          {zonas.map(z => {
            const cnt = hospitales.filter(h => h.zona.nombre === z).length
            return (
              <button
                key={z}
                onClick={() => setFiltroZona(filtroZona === z ? "TODAS" : z)}
                className="text-xs font-medium px-3 py-1.5 rounded-full border transition-colors"
                style={filtroZona === z
                  ? { backgroundColor: TEAL, color: "#fff", borderColor: TEAL }
                  : { backgroundColor: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}
              >
                {z} ({cnt})
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
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
      ) : vista === "lista" ? (
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
                    <Link
                      key={h.id}
                      href={`/hospitales/${h.id}`}
                      className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors active:bg-gray-100"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-teal-600 shrink-0 bg-teal-50">
                        {TIPO_ICON[h.tipo] ?? <IconHospital size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{h.nombre}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {h.ciudad}{h.provincia ? `, ${h.provincia}` : ""}
                          {h.camas ? ` · ${h.camas} camas` : ""}
                        </p>
                        <p className="text-xs text-gray-300 mt-0.5">{TIPO_LABELS[h.tipo] ?? h.tipo}</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {lista.map(h => (
                  <Link
                    key={h.id}
                    href={`/hospitales/${h.id}`}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm hover:border-gray-300 transition-all active:bg-gray-50"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-teal-600 shrink-0 bg-teal-50">
                        {TIPO_ICON[h.tipo] ?? <IconHospital size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2">{h.nombre}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {h.ciudad}{h.provincia ? `, ${h.provincia}` : ""}
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
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
