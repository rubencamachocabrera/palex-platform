"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { TEAL } from "@/lib/brand"
import { PageHeader } from "@/components/ui/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { IconSearch, IconChevronRight } from "@/components/ui/Icons"
import { exportarCSV } from "@/lib/csv"

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

interface Hospital { id: string; nombre: string; ciudad: string }

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

type Orden = "fecha-desc" | "fecha-asc" | "hospital"

export default function MisVisitasPage() {
  const router = useRouter()
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("TODOS")
  const [busqueda, setBusqueda] = useState("")
  const [orden, setOrden] = useState<Orden>("fecha-desc")

  // Modal quick-create
  const [mostrarModal, setMostrarModal] = useState(false)
  const [hospitalesLista, setHospitalesLista] = useState<Hospital[]>([])
  const [hospitalId, setHospitalId] = useState("")
  const [busqHosp, setBusqHosp] = useState("")
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    fetch("/api/visitas")
      .then(r => r.json())
      .then(data => { setVisitas(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function abrirModal() {
    setMostrarModal(true)
    setHospitalId("")
    setBusqHosp("")
    if (hospitalesLista.length === 0) {
      const data = await fetch("/api/hospitales").then(r => r.json())
      setHospitalesLista(data)
    }
  }

  async function crearVisita() {
    if (!hospitalId) return
    setCreando(true)
    try {
      const res = await fetch("/api/visitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalId }),
      })
      const nueva = await res.json()
      router.push("/visitas/" + nueva.id)
    } catch {
      setCreando(false)
    }
  }

  const filtradas = visitas
    .filter(v => filtro === "TODOS" || v.estado === filtro)
    .filter(v => !busqueda ||
      v.hospital.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.hospital.ciudad.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => {
      if (orden === "fecha-asc") return new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      if (orden === "hospital") return a.hospital.nombre.localeCompare(b.hospital.nombre)
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    })

  const hospFiltrados = hospitalesLista.filter(h =>
    !busqHosp ||
    h.nombre.toLowerCase().includes(busqHosp.toLowerCase()) ||
    h.ciudad.toLowerCase().includes(busqHosp.toLowerCase())
  ).slice(0, 20)

  const btnClass = (active: boolean) =>
    `text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
      active ? "text-white shadow-sm" : "text-gray-500 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
    }`

  return (
    <div className="animate-in fade-in duration-200">

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <PageHeader
          title="Mis visitas"
          subtitle={loading ? "Cargando..." : `${visitas.length} visita${visitas.length !== 1 ? "s" : ""} en total`}
          className="mb-0"
        />
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <Link
            href="/visitas/calendario"
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition"
            title="Vista calendario"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Calendario
          </Link>
          <button
            onClick={abrirModal}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl text-white shadow-sm hover:opacity-90 transition"
            style={{ backgroundColor: TEAL }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nueva visita
          </button>
        </div>
      </div>

      {/* Busqueda + orden + CSV */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <IconSearch size={15} />
          </div>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por hospital o ciudad..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
          />
        </div>
        <select
          value={orden}
          onChange={e => setOrden(e.target.value as Orden)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-700 focus:outline-none sm:w-44"
        >
          <option value="fecha-desc">Mas recientes</option>
          <option value="fecha-asc">Mas antiguas</option>
          <option value="hospital">Por hospital</option>
        </select>
        <button
          onClick={() => exportarCSV(
            filtradas.map(v => ({
              Hospital: v.hospital.nombre,
              Ciudad: v.hospital.ciudad,
              Fecha: new Date(v.fecha).toLocaleDateString("es-ES"),
              Estado: ESTADO_LABEL[v.estado] ?? v.estado,
              Tipo: v.tipo,
            })),
            "visitas"
          )}
          disabled={filtradas.length === 0}
          className="flex items-center gap-1.5 text-sm px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          title="Exportar CSV"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          CSV
        </button>
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
              : filtro === "TODOS" ? "Crea tu primera visita seleccionando un hospital."
              : undefined
            }
            action={
              busqueda ? { label: "Limpiar busqueda", variant: "ghost", onClick: () => setBusqueda("") }
              : filtro === "TODOS" ? { label: "Nueva visita", onClick: abrirModal }
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
                    {v.hospital.ciudad} &middot; {new Date(v.fecha).toLocaleDateString("es-ES")}
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

      {/* Modal quick-create */}
      {mostrarModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={e => { if (e.target === e.currentTarget) setMostrarModal(false) }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="font-semibold text-gray-800">Nueva visita</p>
              <button onClick={() => setMostrarModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Selecciona el hospital</p>
              <div className="relative mb-3">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <IconSearch size={14} />
                </div>
                <input
                  autoFocus
                  value={busqHosp}
                  onChange={e => setBusqHosp(e.target.value)}
                  placeholder="Buscar hospital..."
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
                />
              </div>
              <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-50">
                {hospFiltrados.length > 0 ? hospFiltrados.map(h => (
                  <button
                    key={h.id}
                    onClick={() => setHospitalId(h.id)}
                    className={`w-full text-left px-3 py-2.5 transition-colors ${hospitalId === h.id ? "bg-teal-50" : "hover:bg-gray-50"}`}
                  >
                    <p className="text-sm font-medium text-gray-800">{h.nombre}</p>
                    <p className="text-xs text-gray-400">{h.ciudad}</p>
                  </button>
                )) : (
                  <div className="py-6 text-center text-xs text-gray-400">
                    {hospitalesLista.length === 0 ? "Cargando hospitales..." : "Sin resultados"}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 px-4 pb-4">
              <button onClick={() => setMostrarModal(false)} className="flex-1 py-2.5 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={crearVisita}
                disabled={!hospitalId || creando}
                className="flex-1 py-2.5 text-sm font-medium rounded-xl text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: TEAL }}
              >
                {creando ? "Creando..." : "Crear visita"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
