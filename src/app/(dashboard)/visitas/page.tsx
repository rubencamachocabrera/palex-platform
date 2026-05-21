"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
const ESTADO_BAR: Record<string, string> = {
  BORRADOR: "#f59e0b", COMPLETADA: "#16a34a", ARCHIVADA: "#9ca3af",
}

function avatarColor(nombre: string) {
  const colors = ["#0d9488","#0891b2","#7c3aed","#db2777","#ea580c","#65a30d","#2563eb"]
  let h = 0; for (let i = 0; i < nombre.length; i++) h = nombre.charCodeAt(i) + ((h << 5) - h)
  return colors[Math.abs(h) % colors.length]
}

function fechaRelativa(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return "Hoy"
  if (d === 1) return "Ayer"
  if (d < 7)  return `Hace ${d} días`
  if (d < 30) return `Hace ${Math.floor(d/7)} sem.`
  if (d < 365) return `Hace ${Math.floor(d/30)} mes${Math.floor(d/30)>1?"es":""}`
  return `Hace ${Math.floor(d/365)} año${Math.floor(d/365)>1?"s":""}`
}

function mesLabel(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { month: "long", year: "numeric" })
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
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="w-9 h-9 rounded-full skeleton-shimmer shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-2/3 rounded skeleton-shimmer" />
        <div className="h-2.5 w-1/3 rounded skeleton-shimmer" />
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
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Modal quick-create
  const [mostrarModal, setMostrarModal] = useState(false)
  const [hospitalesLista, setHospitalesLista] = useState<Hospital[]>([])
  const [hospitalId, setHospitalId] = useState("")
  const [busqHosp, setBusqHosp] = useState("")
  const [fechaModal, setFechaModal] = useState("")
  const [creando, setCreando] = useState(false)
  const [userRol, setUserRol] = useState("PROYECTOS")
  const [plantillas, setPlantillas] = useState<{ id: string; nombre: string; descripcion: string | null; datos: Record<string, unknown> }[]>([])
  const [plantillaId, setPlantillaId] = useState("")
  const searchParams = useSearchParams()
  const autoAbierto = useRef(false)

  useEffect(() => {
    fetch("/api/visitas?limit=50&page=1")
      .then(r => {
        const total = parseInt(r.headers.get("X-Total-Count") ?? "0")
        return r.ok ? r.json().then((data: Visita[]) => ({ data, total })) : null
      })
      .then(res => {
        if (res && Array.isArray(res.data)) {
          setVisitas(res.data)
          setHasMore(res.data.length < res.total)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
    fetch("/api/perfil")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.rol) setUserRol(d.rol) })
      .catch(() => {})
  }, [])

  // Abrir modal automáticamente si viene desde el calendario con ?abrir=1&fecha=
  useEffect(() => {
    if (autoAbierto.current) return
    if (searchParams.get("abrir") === "1") {
      autoAbierto.current = true
      const fechaParam = searchParams.get("fecha") ?? ""
      setFechaModal(fechaParam)
      abrirModal()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function cargarMas() {
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const r = await fetch(`/api/visitas?limit=50&page=${nextPage}`)
      const total = parseInt(r.headers.get("X-Total-Count") ?? "0")
      const data: Visita[] = r.ok ? await r.json() : []
      if (Array.isArray(data) && data.length > 0) {
        setVisitas(prev => [...prev, ...data])
        setPage(nextPage)
        setHasMore(visitas.length + data.length < total)
      }
    } finally {
      setLoadingMore(false)
    }
  }

  async function abrirModal() {
    setMostrarModal(true)
    setHospitalId("")
    setBusqHosp("")
    setPlantillaId("")
    if (hospitalesLista.length === 0) {
      const r = await fetch("/api/hospitales")
      const data = r.ok ? await r.json() : []
      setHospitalesLista(Array.isArray(data) ? data : [])
    }
    const tipo = userRol === "VENTAS" ? "VENTAS" : "PROYECTOS"
    fetch(`/api/plantillas?tipo=${tipo}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setPlantillas(d) })
      .catch(() => {})
  }

  async function crearVisita() {
    if (!hospitalId) return
    setCreando(true)
    try {
      const tipo = userRol === "VENTAS" ? "VENTAS" : "PROYECTOS"
      const plantilla = plantillas.find(p => p.id === plantillaId)
      const body: Record<string, unknown> = { hospitalId, tipo }
      if (fechaModal) body.fecha = fechaModal
      if (plantilla) body.datos = plantilla.datos
      const res = await fetch("/api/visitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) { setCreando(false); return }
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

  // Stats para el banner
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const completadasMes = visitas.filter(v => v.estado === "COMPLETADA" && new Date(v.fecha) >= inicioMes).length
  const borradores = visitas.filter(v => v.estado === "BORRADOR").length
  const ultimaFecha = visitas.length > 0 ? visitas.reduce((a,b) => new Date(a.fecha) > new Date(b.fecha) ? a : b).fecha : null

  // Agrupación por mes
  const grupos: { mes: string; items: typeof filtradas }[] = []
  filtradas.forEach(v => {
    const mes = mesLabel(v.fecha)
    const g = grupos.find(g => g.mes === mes)
    if (g) g.items.push(v)
    else grupos.push({ mes, items: [v] })
  })

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

      {/* Stats banner */}
      {!loading && visitas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Total visitas",       value: visitas.length,     color: "#111827" },
            { label: "En borrador",         value: borradores,         color: "#d97706" },
            { label: "Completadas este mes",value: completadasMes,     color: "#16a34a" },
            { label: "Última visita",       value: ultimaFecha ? fechaRelativa(ultimaFecha) : "—", color: TEAL, isText: true },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{s.label}</p>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lista */}
      <div className="space-y-1">
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonVisita key={i} />)}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100">
            <EmptyState
              icon={busqueda ? "search" : "document"}
              title={busqueda ? `Sin resultados para "${busqueda}"` : filtro === "TODOS" ? "No tienes visitas registradas" : `No hay visitas "${ESTADO_LABEL[filtro]}"`}
              description={busqueda ? "Prueba con otro nombre de hospital o ciudad." : filtro === "TODOS" ? "Crea tu primera visita seleccionando un hospital." : undefined}
              action={busqueda ? { label: "Limpiar busqueda", variant: "ghost", onClick: () => setBusqueda("") } : filtro === "TODOS" ? { label: "Nueva visita", onClick: abrirModal } : undefined}
            />
          </div>
        ) : (
          grupos.map(({ mes, items }) => (
            <div key={mes}>
              {/* Separador de mes */}
              <div className="flex items-center gap-2 px-1 py-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide capitalize">{mes}</span>
                <span className="text-xs text-gray-300 font-medium">· {items.length}</span>
                <div className="flex-1 h-px bg-gray-100 ml-1" />
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                {items.map((v, i) => {
                  const color = avatarColor(v.hospital.nombre)
                  const inicial = v.hospital.nombre.charAt(0).toUpperCase()
                  return (
                    <Link key={v.id} href={`/visitas/${v.id}`}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/70 transition-colors group relative"
                      style={{ animationDelay: `${i * 25}ms` }}>
                      {/* Barra lateral estado */}
                      <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full" style={{ backgroundColor: ESTADO_BAR[v.estado] ?? "#e5e7eb" }} />
                      {/* Avatar hospital */}
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ml-2" style={{ backgroundColor: color }}>
                        {inicial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{v.hospital.nombre}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-gray-400">{v.hospital.ciudad}</span>
                          <span className="text-gray-200">·</span>
                          <span className="text-xs text-gray-400" title={new Date(v.fecha).toLocaleDateString("es-ES")}>{fechaRelativa(v.fecha)}</span>
                          <span className="text-gray-200">·</span>
                          <span className="text-xs font-medium" style={{ color: TEAL }}>{v.tipo === "VENTAS" ? "Ventas" : "Proyectos"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ESTADO_COLOR[v.estado]}`}>{ESTADO_LABEL[v.estado]}</span>
                        <IconChevronRight size={15} className="text-gray-300 group-hover:text-gray-400 transition-colors" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cargar más */}
      {hasMore && !loading && (
        <div className="flex justify-center mt-4">
          <button
            onClick={cargarMas}
            disabled={loadingMore}
            className="text-sm font-medium px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {loadingMore ? "Cargando..." : "Cargar más visitas"}
          </button>
        </div>
      )}

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
            <div className="px-4 pb-2">
              <label className="text-xs font-medium text-gray-500 block mb-1">Fecha de la visita</label>
              <input
                type="date"
                value={fechaModal}
                onChange={e => setFechaModal(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
              />
            </div>
            {/* Selector de plantilla */}
            {plantillas.length > 0 && (
              <div className="px-4 pb-2">
                <label className="text-xs font-medium text-gray-500 block mb-1">Plantilla (opcional)</label>
                <select
                  value={plantillaId}
                  onChange={e => setPlantillaId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 bg-white focus:border-transparent"
                  style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
                >
                  <option value="">Sin plantilla — formulario en blanco</option>
                  {plantillas.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                {plantillaId && (
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: TEAL }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    El formulario se abrirá pre-rellenado
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-2 px-4 pb-4 pt-2">
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
