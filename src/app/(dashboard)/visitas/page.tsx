"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { TEAL, ORANGE } from "@/lib/brand"
import { PageHeader } from "@/components/ui/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { IconSearch, IconChevronRight } from "@/components/ui/Icons"

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador", COMPLETADA: "Completada", ARCHIVADA: "Archivada",
}
const ESTADO_COLOR: Record<string, string> = {
  BORRADOR:   "bg-amber-50 text-amber-600",
  COMPLETADA: "bg-green-50 text-green-600",
  ARCHIVADA:  "bg-gray-100 text-gray-400",
}

interface Visita {
  id: string
  estado: string
  tipo: string
  fecha: string
  hospital: { id: string; nombre: string; ciudad: string }
}

function SkeletonVisita() {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 rounded-lg skeleton-shimmer" />
        <div className="h-3 w-1/3 rounded-lg skeleton-shimmer" />
      </div>
      <div className="h-6 w-20 rounded-full skeleton-shimmer shrink-0" />
    </div>
  )
}

function DocumentIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}

type Orden = "fecha-desc" | "fecha-asc" | "hospital"

export default function MisVisitasPage() {
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("TODOS")
  const [busqueda, setBusqueda] = useState("")
  const [orden, setOrden] = useState<Orden>("fecha-desc")

  useEffect(() => {
    fetch("/api/visitas")
      .then(r => r.json())
      .then(data => { setVisitas(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtradas = visitas
    .filter(v => filtro === "TODOS" || v.estado === filtro)
    .filter(v => !busqueda || v.hospital.nombre.toLowerCase().includes(busqueda.toLowerCase()) || v.hospital.ciudad.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => {
      if (orden === "fecha-asc") return new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      if (orden === "hospital") return a.hospital.nombre.localeCompare(b.hospital.nombre)
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    })

  const btnClass = (active: boolean) =>
    `text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
      active ? "text-white shadow-sm" : "text-gray-500 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
    }`

  return (
    <div className="animate-in fade-in duration-200">
      <PageHeader
        title="Mis visitas"
        subtitle={loading ? "Cargando…" : `${visitas.length} visita${visitas.length !== 1 ? "s" : ""} en total`}
      />

      {/* Búsqueda + orden */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <IconSearch size={15} />
          </div>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por hospital o ciudad…"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
          />
        </div>
        <select
          value={orden}
          onChange={e => setOrden(e.target.value as Orden)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-700 focus:outline-none sm:w-44"
        >
          <option value="fecha-desc">Más recientes</option>
          <option value="fecha-asc">Más antiguas</option>
          <option value="hospital">Por hospital</option>
        </select>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap mb-5">
        {(["TODOS", "BORRADOR", "COMPLETADA", "ARCHIVADA"] as const).map(e => (
          <button
            key={e}
            onClick={() => setFiltro(e)}
            className={btnClass(filtro === e)}
            style={filtro === e ? { backgroundColor: TEAL } : {}}
          >
            {e === "TODOS" ? "Todas" : ESTADO_LABEL[e]}
            {!loading && e !== "TODOS" && (
              <span className="ml-1.5 opacity-60">
                {visitas.filter(v => v.estado === e).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonVisita key={i} />)}
          </div>
        ) : filtradas.length === 0 ? (
          <EmptyState
            icon={busqueda ? "search" : "document"}
            title={
              busqueda ? `Sin resultados para "${busqueda}"`
              : filtro === "TODOS" ? "No tienes visitas registradas"
              : `No hay visitas "${ESTADO_LABEL[filtro]}"`
            }
            description={
              busqueda ? "Prueba con otro nombre de hospital o ciudad."
              : filtro === "TODOS" ? "Accede a un hospital para registrar tu primera visita."
              : undefined
            }
            action={
              busqueda ? { label: "Limpiar búsqueda", variant: "ghost", onClick: () => setBusqueda("") }
              : filtro === "TODOS" ? { label: "Ver mis hospitales", href: "/hospitales" }
              : undefined
            }
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {filtradas.map((v, i) => (
              <Link
                key={v.id}
                href={`/visitas/${v.id}`}
                className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors active:bg-gray-100 group animate-in fade-in duration-200"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "#F3F4F6" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-gray-900">{v.hospital.nombre}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {v.hospital.ciudad} · {new Date(v.fecha).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ESTADO_COLOR[v.estado]}`}>
                    {ESTADO_LABEL[v.estado]}
                  </span>
                  <IconChevronRight size={16} className="text-gray-300 group-hover:text-gray-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
