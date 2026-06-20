"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { TEAL } from "@/lib/brand"
import { PageHeader } from "@/components/ui/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { IconSearch } from "@/components/ui/Icons"
import { exportarCSV } from "@/lib/csv"

// ─── Configuración de estados ─────────────────────────────────────────────────

const ESTADO: Record<string, { label: string; bg: string; text: string; bar: string; dot: string }> = {
  BORRADOR:   { label: "En curso",   bg: "#fffbeb", text: "#92400e", bar: "#f59e0b", dot: "#f59e0b" },
  COMPLETADA: { label: "Completada", bg: "#f0fdf4", text: "#15803d", bar: "#16a34a", dot: "#22c55e" },
  ARCHIVADA:  { label: "Archivada",  bg: "#f3f4f6", text: "#6b7280", bar: "#9ca3af", dot: "#9ca3af" },
}

const TIPO_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  VENTAS:     { label: "Comercial", bg: "#fef3c7", text: "#92400e" },
  PROYECTOS:  { label: "Técnica",   bg: `${TEAL}15`, text: TEAL },
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

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

function mesLabel(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { month: "long", year: "numeric" })
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Visita {
  id: string
  titulo?: string | null
  estado: string
  tipo: string
  fecha: string
  score?: number | null
  hospital: { id: string; nombre: string; ciudad: string; zona: { nombre: string } }
  usuario: { id: string; nombre: string; rol: string }
}

interface Hospital { id: string; nombre: string; ciudad: string; zona?: { id: string; nombre: string } }
interface Zona { id: string; nombre: string }
interface ProyectoMini { id: string; titulo: string; estado: string }

// ─── Skeletons ────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="w-10 h-10 rounded-xl skeleton-shimmer shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-36 rounded skeleton-shimmer" />
          <div className="h-5 w-16 rounded-full skeleton-shimmer" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full skeleton-shimmer" />
          <div className="h-2.5 w-24 rounded skeleton-shimmer" />
          <div className="h-2.5 w-16 rounded skeleton-shimmer" />
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:block text-right space-y-1">
          <div className="h-3 w-20 rounded skeleton-shimmer" />
          <div className="h-2.5 w-12 rounded skeleton-shimmer" />
        </div>
        <div className="h-7 w-20 rounded-full skeleton-shimmer" />
      </div>
    </div>
  )
}

type Orden = "fecha-desc" | "fecha-asc" | "hospital"

// ─── Página ──────────────────────────────────────────────────────────────────

export default function VisitasPage() {
  const router = useRouter()
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState("TODOS")
  const [filtroTipo, setFiltroTipo] = useState("TODOS")
  const [filtroZona, setFiltroZona] = useState("TODOS")
  const [busqueda, setBusqueda] = useState("")
  const [orden, setOrden] = useState<Orden>("fecha-desc")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filtroDesde, setFiltroDesde] = useState("")
  const [filtroHasta, setFiltroHasta] = useState("")
  const [filtrosAvanzados, setFiltrosAvanzados] = useState(false)

  // Modal quick-create
  const [mostrarModal, setMostrarModal] = useState(false)
  const [hospitalesLista, setHospitalesLista] = useState<Hospital[]>([])
  const [hospitalId, setHospitalId] = useState("")
  const [busqHosp, setBusqHosp] = useState("")
  const [tituloModal, setTituloModal] = useState("")
  const [tituloAutoGen, setTituloAutoGen] = useState(true)
  const [fechaModal, setFechaModal] = useState("")
  const [zonaModal, setZonaModal] = useState("TODAS")
  const [zonasLista, setZonasLista] = useState<Zona[]>([])
  const [proyectos, setProyectos] = useState<ProyectoMini[]>([])
  const [proyectoId, setProyectoId] = useState("")
  const [creando, setCreando] = useState(false)
  const [userRol, setUserRol] = useState("PROYECTOS")
  const [userName, setUserName] = useState("")
  const [plantillas, setPlantillas] = useState<{ id: string; nombre: string; descripcion: string | null; datos: Record<string, unknown> }[]>([])
  const [plantillaId, setPlantillaId] = useState("")
  const [tipoModal, setTipoModal] = useState<"PROYECTOS" | "VENTAS">("PROYECTOS")
  const [contactos, setContactos] = useState<{ id: string; nombre: string; cargo: string | null; principal: boolean }[]>([])
  const [contactoId, setContactoId] = useState("")
  const [eliminarId, setEliminarId] = useState<string | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const searchParams = useSearchParams()
  const autoAbierto = useRef(false)

  useEffect(() => {
    fetch("/api/perfil").then(r => r.ok ? r.json() : null).then(d => { if (d?.rol) setUserRol(d.rol); if (d?.nombre) setUserName(d.nombre) }).catch(() => {})
    cargarVisitas()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { cargarVisitas() }, [filtroDesde, filtroHasta]) // eslint-disable-line react-hooks/exhaustive-deps

  function cargarVisitas() {
    setLoading(true); setPage(1)
    const url = (filtroDesde && filtroHasta)
      ? `/api/visitas?desde=${filtroDesde}&hasta=${filtroHasta}`
      : "/api/visitas?limit=50&page=1"
    fetch(url)
      .then(r => {
        const total = parseInt(r.headers.get("X-Total-Count") ?? "0")
        return r.ok ? r.json().then((data: Visita[]) => ({ data, total })) : null
      })
      .then(res => {
        if (res && Array.isArray(res.data)) {
          setVisitas(res.data)
          setHasMore(!filtroDesde && res.data.length < res.total)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    if (autoAbierto.current) return
    if (searchParams.get("abrir") === "1") {
      autoAbierto.current = true
      setFechaModal(searchParams.get("fecha") ?? "")
      abrirModal()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function cargarMas() {
    const nextPage = page + 1; setLoadingMore(true)
    try {
      const r = await fetch(`/api/visitas?limit=50&page=${nextPage}`)
      const total = parseInt(r.headers.get("X-Total-Count") ?? "0")
      const data: Visita[] = r.ok ? await r.json() : []
      if (Array.isArray(data) && data.length > 0) {
        setVisitas(prev => [...prev, ...data]); setPage(nextPage)
        setHasMore(visitas.length + data.length < total)
      }
    } finally { setLoadingMore(false) }
  }

  async function confirmarEliminar() {
    if (!eliminarId) return
    setEliminando(true)
    try {
      const r = await fetch(`/api/visitas/${eliminarId}`, { method: "DELETE" })
      if (r.ok) {
        setVisitas(prev => prev.filter(v => v.id !== eliminarId))
        setEliminarId(null)
      }
    } finally { setEliminando(false) }
  }

  function generarTitulo(hospNombre: string, fecha: string) {
    const f = fecha ? new Date(fecha) : new Date()
    return `Visita ${hospNombre} — ${f.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}`
  }

  async function abrirModal() {
    const hoy = new Date().toISOString().slice(0, 10)
    setMostrarModal(true); setHospitalId(""); setBusqHosp(""); setTituloModal(""); setTituloAutoGen(true)
    setPlantillaId(""); setZonaModal("TODAS"); setProyectoId(""); setProyectos([])
    setFechaModal(hoy); setTipoModal(userRol === "VENTAS" ? "VENTAS" : "PROYECTOS")
    setContactos([]); setContactoId("")
    if (hospitalesLista.length === 0) {
      const r = await fetch("/api/hospitales")
      const data = r.ok ? await r.json() : []
      if (Array.isArray(data)) {
        setHospitalesLista(data)
        const zonas = new Map<string, Zona>()
        data.forEach((h: Hospital) => { if (h.zona) zonas.set(h.zona.id, h.zona) })
        setZonasLista(Array.from(zonas.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)))
      }
    }
    const tipoInicial = userRol === "VENTAS" ? "VENTAS" : "PROYECTOS"
    fetch(`/api/plantillas?tipo=${tipoInicial}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setPlantillas(d) })
      .catch(() => {})
  }

  function seleccionarHospital(hId: string) {
    setHospitalId(hId)
    const hosp = hospitalesLista.find(h => h.id === hId)
    if (hosp && tituloAutoGen) setTituloModal(generarTitulo(hosp.nombre, fechaModal))
    setProyectoId(""); setContactoId(""); setContactos([])
    if (hId) {
      fetch(`/api/proyectos?hospitalId=${hId}`)
        .then(r => r.ok ? r.json() : [])
        .then(d => setProyectos(Array.isArray(d) ? d.filter((p: ProyectoMini) => p.estado !== "CANCELADO") : []))
        .catch(() => setProyectos([]))
      fetch(`/api/hospitales/${hId}/contactos`)
        .then(r => r.ok ? r.json() : [])
        .then(d => {
          if (Array.isArray(d)) {
            setContactos(d)
            const principal = d.find((c: { principal: boolean }) => c.principal)
            if (principal) setContactoId(principal.id)
          }
        })
        .catch(() => setContactos([]))
    } else {
      setProyectos([]); setContactos([])
    }
  }

  async function crearVisita() {
    if (!hospitalId) return; setCreando(true)
    try {
      const plantilla = plantillas.find(p => p.id === plantillaId)
      const body: Record<string, unknown> = { hospitalId, tipo: tipoModal }
      if (tituloModal.trim()) body.titulo = tituloModal.trim()
      if (fechaModal) body.fecha = fechaModal
      if (plantilla) body.datos = plantilla.datos
      if (proyectoId) body.proyectoId = proyectoId
      if (contactoId) body.contactoPrincipalId = contactoId
      const res = await fetch("/api/visitas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!res.ok) { setCreando(false); return }
      const nueva = await res.json()
      router.push("/visitas/" + nueva.id)
    } catch { setCreando(false) }
  }

  // ─── Zonas únicas extraídas de los datos cargados ────────────────────────

  const zonasDisponibles = useMemo(() => {
    const set = new Set<string>()
    visitas.forEach(v => { if (v.hospital.zona?.nombre) set.add(v.hospital.zona.nombre) })
    return Array.from(set).sort()
  }, [visitas])

  // ─── Filtrado y ordenación ────────────────────────────────────────────────

  const b = busqueda.toLowerCase()
  const filtradas = useMemo(() => visitas
    .filter(v => filtroEstado === "TODOS" || v.estado === filtroEstado)
    .filter(v => filtroTipo === "TODOS" || v.tipo === filtroTipo)
    .filter(v => filtroZona === "TODOS" || v.hospital.zona?.nombre === filtroZona)
    .filter(v => !busqueda ||
      v.hospital.nombre.toLowerCase().includes(b) ||
      v.hospital.ciudad.toLowerCase().includes(b) ||
      v.usuario.nombre.toLowerCase().includes(b) ||
      (v.titulo && v.titulo.toLowerCase().includes(b)))
    .sort((a, c) => {
      if (orden === "fecha-asc") return new Date(a.fecha).getTime() - new Date(c.fecha).getTime()
      if (orden === "hospital") return a.hospital.nombre.localeCompare(c.hospital.nombre)
      return new Date(c.fecha).getTime() - new Date(a.fecha).getTime()
    })
  , [visitas, filtroEstado, filtroTipo, filtroZona, busqueda, orden]) // eslint-disable-line react-hooks/exhaustive-deps

  const hospFiltrados = hospitalesLista
    .filter(h => zonaModal === "TODAS" || h.zona?.id === zonaModal)
    .filter(h => !busqHosp || h.nombre.toLowerCase().includes(busqHosp.toLowerCase()) || h.ciudad.toLowerCase().includes(busqHosp.toLowerCase()))
    .slice(0, 20)

  // ─── Stats ────────────────────────────────────────────────────────────────

  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const enCurso = visitas.filter(v => v.estado === "BORRADOR").length
  const completadasMes = visitas.filter(v => v.estado === "COMPLETADA" && new Date(v.fecha) >= inicioMes).length
  const ultimaFecha = visitas.length > 0 ? visitas.reduce((a,b) => new Date(a.fecha) > new Date(b.fecha) ? a : b).fecha : null

  // ─── Agrupación por mes ───────────────────────────────────────────────────

  const grupos = useMemo(() => {
    const gs: { mes: string; items: typeof filtradas }[] = []
    filtradas.forEach(v => {
      const mes = mesLabel(v.fecha)
      const g = gs.find(g => g.mes === mes)
      if (g) g.items.push(v); else gs.push({ mes, items: [v] })
    })
    return gs
  }, [filtradas])

  const filtrosActivos = filtroDesde || filtroHasta || filtroTipo !== "TODOS" || filtroZona !== "TODOS"

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="animate-in fade-in duration-200">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between mb-5">
        <PageHeader
          title={userRol === "ADMIN" ? "Todas las visitas" : "Mis visitas"}
          subtitle={loading ? "Cargando..." : `${visitas.length} visita${visitas.length !== 1 ? "s" : ""}${filtradas.length !== visitas.length ? ` · ${filtradas.length} filtradas` : ""}`}
          className="mb-0"
        />
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <Link href="/visitas/calendario"
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className="hidden sm:inline">Calendario</span>
          </Link>
          <button onClick={abrirModal}
            className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl text-white hover:opacity-90 transition min-h-[42px]"
            style={{ backgroundColor: TEAL, boxShadow: `0 2px 8px ${TEAL}50` }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nueva visita
          </button>
        </div>
      </div>

      {/* ── STATS ── */}
      {!loading && visitas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total", value: visitas.length, color: TEAL, bg: `${TEAL}12`,
              icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
            { label: "En curso", value: enCurso, color: "#d97706", bg: "#fef3c7",
              icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
            { label: "Completadas (mes)", value: completadasMes, color: "#16a34a", bg: "#f0fdf4",
              icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
            { label: "Última visita", value: ultimaFecha ? fechaRelativa(ultimaFecha) : "—", color: "#6366f1", bg: "#eef2ff",
              icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
          ].map(k => (
            <div key={k.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: k.bg, color: k.color }}>{k.icon}</div>
              <div className="min-w-0">
                <p className="text-lg font-bold leading-none truncate" style={{ color: typeof k.value === "number" && k.value === 0 ? "#9ca3af" : k.color }}>{k.value}</p>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5 leading-none">{k.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── BARRA DE BÚSQUEDA + CONTROLES ── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><IconSearch size={15} /></div>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Hospital, ciudad o técnico..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ "--tw-ring-color": TEAL } as React.CSSProperties} />
        </div>
        <select value={orden} onChange={e => setOrden(e.target.value as Orden)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-700 focus:outline-none sm:w-44">
          <option value="fecha-desc">Más recientes</option>
          <option value="fecha-asc">Más antiguas</option>
          <option value="hospital">Por hospital</option>
        </select>
        <button
          onClick={() => exportarCSV(
            filtradas.map(v => ({
              Título: v.titulo ?? "",
              Hospital: v.hospital.nombre, Ciudad: v.hospital.ciudad, Zona: v.hospital.zona?.nombre ?? "",
              Técnico: v.usuario.nombre, Fecha: fmtFecha(v.fecha),
              Estado: ESTADO[v.estado]?.label ?? v.estado, Tipo: TIPO_CONFIG[v.tipo]?.label ?? v.tipo,
              Score: v.score ?? "",
            })),
            "visitas"
          )}
          disabled={filtradas.length === 0}
          className="flex items-center gap-1.5 text-sm px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 shrink-0"
          title="Exportar CSV">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          CSV
        </button>
        <button onClick={() => setFiltrosAvanzados(v => !v)}
          className={`flex items-center gap-1.5 text-sm px-3 py-2.5 rounded-xl border transition-colors shrink-0 ${
            filtrosAvanzados || filtrosActivos ? "" : "border-gray-200 text-gray-500 bg-white"
          }`}
          style={filtrosAvanzados || filtrosActivos
            ? { borderColor: TEAL, color: TEAL, backgroundColor: `${TEAL}0c` }
            : undefined}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          Filtros
          {filtrosActivos && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: TEAL }} />}
        </button>
      </div>

      {/* ── FILTROS AVANZADOS ── */}
      {filtrosAvanzados && (
        <div className="flex flex-wrap gap-3 mb-4 p-4 bg-gray-50/80 rounded-xl border border-gray-100">
          {/* Tipo */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 shrink-0">Tipo:</span>
            {(["TODOS", "VENTAS", "PROYECTOS"] as const).map(t => (
              <button key={t} onClick={() => setFiltroTipo(t)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                  filtroTipo === t ? "text-white" : "bg-white border-gray-200 text-gray-500"
                }`}
                style={filtroTipo === t ? { backgroundColor: TEAL, borderColor: TEAL } : undefined}>
                {t === "TODOS" ? "Todos" : TIPO_CONFIG[t]?.label}
              </button>
            ))}
          </div>
          {/* Zona */}
          {zonasDisponibles.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-500 shrink-0">Zona:</span>
              {(["TODOS", ...zonasDisponibles]).map(z => (
                <button key={z} onClick={() => setFiltroZona(z)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                    filtroZona === z ? "text-white" : "bg-white border-gray-200 text-gray-500"
                  }`}
                  style={filtroZona === z ? { backgroundColor: "#6366f1", borderColor: "#6366f1" } : undefined}>
                  {z === "TODOS" ? "Todas" : z}
                </button>
              ))}
            </div>
          )}
          {/* Rango fechas */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 shrink-0">Desde:</span>
            <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer" />
            <span className="text-xs text-gray-400">hasta</span>
            <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} min={filtroDesde}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer" />
          </div>
          {filtrosActivos && (
            <button onClick={() => { setFiltroDesde(""); setFiltroHasta(""); setFiltroTipo("TODOS"); setFiltroZona("TODOS") }}
              className="text-xs text-red-400 hover:text-red-600 font-semibold cursor-pointer transition-colors ml-auto">
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* ── PILLS DE ESTADO ── */}
      <div className="flex gap-2 flex-wrap mb-5">
        {(["TODOS", "BORRADOR", "COMPLETADA", "ARCHIVADA"] as const).map(e => {
          const cfg = ESTADO[e]
          const isActive = filtroEstado === e
          const count = e === "TODOS" ? visitas.length : visitas.filter(v => v.estado === e).length
          return (
            <button key={e} onClick={() => setFiltroEstado(e)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all min-h-[34px] cursor-pointer"
              style={isActive
                ? { backgroundColor: cfg?.bg ?? `${TEAL}18`, color: cfg?.text ?? TEAL, borderColor: cfg?.dot ?? TEAL }
                : { backgroundColor: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: isActive ? (cfg?.dot ?? TEAL) : "#d1d5db" }} />
              {e === "TODOS" ? "Todas" : (cfg?.label ?? e)}
              {!loading && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={isActive
                    ? { backgroundColor: "rgba(0,0,0,0.08)", color: cfg?.text ?? TEAL }
                    : { backgroundColor: "#f3f4f6", color: "#9ca3af" }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── LISTA ── */}
      <div className="space-y-1">
        {loading ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-50">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <EmptyState
              icon={busqueda ? "search" : "document"}
              title={busqueda ? `Sin resultados para "${busqueda}"` : filtroEstado === "TODOS" ? "No hay visitas registradas" : `No hay visitas "${ESTADO[filtroEstado]?.label ?? filtroEstado}"`}
              description={busqueda ? "Prueba con otro hospital, ciudad o nombre de técnico." : filtroEstado === "TODOS" ? "Crea tu primera visita seleccionando un hospital." : undefined}
              action={busqueda ? { label: "Limpiar búsqueda", variant: "ghost", onClick: () => setBusqueda("") } : filtroEstado === "TODOS" ? { label: "Nueva visita", onClick: abrirModal } : undefined}
            />
          </div>
        ) : (
          grupos.map(({ mes, items }) => (
            <div key={mes}>
              {/* Separador de mes */}
              <div className="flex items-center gap-2 px-1 py-2.5">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider capitalize">{mes}</span>
                <span className="text-xs text-gray-300 font-medium">· {items.length}</span>
                <div className="flex-1 h-px bg-gray-100 ml-1" />
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden divide-y divide-gray-50/80">
                {items.map(v => {
                  const est = ESTADO[v.estado]
                  const tipoC = TIPO_CONFIG[v.tipo]
                  const hospColor = avatarColor(v.hospital.nombre)
                  const userColor = avatarColor(v.usuario.nombre)
                  return (
                    <Link key={v.id} href={`/visitas/${v.id}`}
                      className="flex items-center gap-3.5 px-5 py-4 hover:bg-gray-50/60 transition-colors group relative">

                      {/* Barra estado lateral */}
                      <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full transition-all"
                        style={{ backgroundColor: est?.bar ?? "#e5e7eb" }} />

                      {/* Avatar hospital */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
                        style={{ backgroundColor: hospColor }}>
                        {v.hospital.nombre.charAt(0).toUpperCase()}
                      </div>

                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        {/* Titulo si existe */}
                        {v.titulo && (
                          <p className="text-[13px] font-semibold text-gray-800 group-hover:text-teal-700 transition-colors truncate mb-0.5">
                            {v.titulo}
                          </p>
                        )}
                        {/* Fila 1: nombre hospital + tipo */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-sm ${v.titulo ? "font-medium text-gray-500" : "font-bold text-gray-900 group-hover:text-teal-700 transition-colors"} truncate`}>
                            {v.hospital.nombre}
                          </span>
                          {tipoC && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                              style={{ backgroundColor: tipoC.bg, color: tipoC.text }}>
                              {tipoC.label}
                            </span>
                          )}
                          {v.hospital.zona?.nombre && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 hidden sm:inline shrink-0">
                              {v.hospital.zona.nombre}
                            </span>
                          )}
                        </div>
                        {/* Fila 2: responsable + ciudad */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                              style={{ backgroundColor: userColor }}>
                              {v.usuario.nombre.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-medium text-gray-600 truncate max-w-[120px]">{v.usuario.nombre}</span>
                          </div>
                          <span className="text-gray-200 text-xs shrink-0">·</span>
                          <span className="text-xs text-gray-400 truncate">{v.hospital.ciudad}</span>
                        </div>
                      </div>

                      {/* Columna derecha */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Score */}
                        {v.score != null && v.score > 0 && (
                          <div className="hidden md:flex flex-col items-center" title={`Score de complejidad: ${v.score}/100`}>
                            <span className="text-sm font-black leading-none"
                              style={{ color: v.score >= 70 ? "#16a34a" : v.score >= 40 ? TEAL : "#f59e0b" }}>
                              {v.score}
                            </span>
                            <span className="text-[9px] text-gray-300 font-medium">pts</span>
                          </div>
                        )}
                        {/* Fecha */}
                        <div className="hidden sm:block text-right">
                          <p className="text-xs font-semibold text-gray-700 whitespace-nowrap">{fmtFecha(v.fecha)}</p>
                          <p className="text-[10px] text-gray-400">{fechaRelativa(v.fecha)}</p>
                        </div>
                        {/* Estado badge */}
                        {est && (
                          <span className="text-xs font-semibold px-3 py-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: est.bg, color: est.text }}>
                            {est.label}
                          </span>
                        )}
                        {/* Eliminar */}
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEliminarId(v.id) }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all shrink-0"
                          title="Eliminar visita"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                        {/* Chevron */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className="group-hover:stroke-gray-400 transition-colors shrink-0">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── CARGAR MÁS ── */}
      {hasMore && !loading && (
        <div className="flex justify-center mt-4">
          <button onClick={cargarMas} disabled={loadingMore}
            className="text-sm font-medium px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            {loadingMore ? "Cargando..." : "Cargar más visitas"}
          </button>
        </div>
      )}

      {/* ── MODAL CONFIRMAR ELIMINAR ── */}
      {eliminarId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !eliminando && setEliminarId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in fade-in zoom-in-95 dark:bg-[#1e293b]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Eliminar visita</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Esta accion no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5 dark:text-gray-300">
              ¿Estas seguro de que quieres eliminar esta visita? Se borraran todos los datos, comentarios y fotos asociados.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setEliminarId(null)} disabled={eliminando}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                Cancelar
              </button>
              <button onClick={confirmarEliminar} disabled={eliminando}
                className="flex-1 px-4 py-2.5 text-sm font-bold rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50">
                {eliminando ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL NUEVA VISITA ── */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] sm:pt-[10vh] p-4 backdrop-blur-sm overflow-y-auto"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={e => { if (e.target === e.currentTarget) setMostrarModal(false) }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200"
            style={{ borderTop: `3px solid ${TEAL}` }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="font-bold text-gray-900 dark:text-white">Nueva visita</p>
                {userName && <p className="text-xs text-gray-400 mt-0.5">Responsable: <span className="font-medium text-gray-600 dark:text-gray-300">{userName}</span></p>}
              </div>
              <button onClick={() => setMostrarModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 max-h-[60vh] sm:max-h-[65vh] overflow-y-auto">

              {/* Título */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">Nombre de la visita</label>
                <input value={tituloModal}
                  onChange={e => { setTituloModal(e.target.value); setTituloAutoGen(false) }}
                  placeholder="Se genera automáticamente al seleccionar hospital"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-300 dark:placeholder:text-gray-600"
                  style={{ "--tw-ring-color": TEAL } as React.CSSProperties} />
              </div>

              {/* Tipo de visita */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">Tipo de visita</label>
                <div className="flex gap-2">
                  {([
                    { value: "PROYECTOS" as const, label: "Técnica", color: TEAL },
                    { value: "VENTAS" as const, label: "Comercial", color: "#f59e0b" },
                  ]).map(t => (
                    <button key={t.value} type="button" onClick={() => setTipoModal(t.value)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                        tipoModal === t.value
                          ? "text-white shadow-sm"
                          : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      style={tipoModal === t.value ? { backgroundColor: t.color, borderColor: t.color } : {}}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zona + Fecha en fila */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">Zona</label>
                  <select value={zonaModal} onChange={e => { setZonaModal(e.target.value); setHospitalId(""); setProyectos([]) }}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent cursor-pointer"
                    style={{ "--tw-ring-color": TEAL } as React.CSSProperties}>
                    <option value="TODAS">Todas las zonas</option>
                    {zonasLista.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">Fecha</label>
                  <input type="date" value={fechaModal}
                    onChange={e => {
                      setFechaModal(e.target.value)
                      if (tituloAutoGen && hospitalId) {
                        const hosp = hospitalesLista.find(h => h.id === hospitalId)
                        if (hosp) setTituloModal(generarTitulo(hosp.nombre, e.target.value))
                      }
                    }}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ "--tw-ring-color": TEAL } as React.CSSProperties} />
                </div>
              </div>

              {/* Hospital */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">
                  Hospital {zonaModal !== "TODAS" && <span className="font-normal normal-case">({hospFiltrados.length})</span>}
                </label>
                <div className="relative mb-2">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><IconSearch size={14} /></div>
                  <input value={busqHosp} onChange={e => setBusqHosp(e.target.value)}
                    placeholder="Buscar hospital..."
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ "--tw-ring-color": TEAL } as React.CSSProperties} />
                </div>
                <div className="max-h-36 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-800">
                  {hospFiltrados.length > 0 ? hospFiltrados.map(h => (
                    <button key={h.id} onClick={() => seleccionarHospital(h.id)}
                      className={`w-full text-left px-3 py-2.5 transition-colors flex items-center gap-2.5 cursor-pointer ${hospitalId === h.id ? "" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                      style={hospitalId === h.id ? { backgroundColor: `${TEAL}12` } : {}}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: avatarColor(h.nombre) }}>
                        {h.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{h.nombre}</p>
                        <p className="text-xs text-gray-400 truncate">{h.ciudad}{h.zona ? ` · ${h.zona.nombre}` : ""}</p>
                      </div>
                      {hospitalId === h.id && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  )) : (
                    <div className="py-8 text-center text-xs text-gray-400">
                      {hospitalesLista.length === 0 ? "Cargando hospitales..." : "Sin resultados para esta zona"}
                    </div>
                  )}
                </div>
              </div>

              {/* Contacto principal (solo si hay hospital y tiene contactos) */}
              {hospitalId && contactos.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">
                    Contacto principal
                    <span className="font-normal normal-case text-gray-400 dark:text-gray-500 ml-1">(opcional)</span>
                  </label>
                  <div className="space-y-1 max-h-32 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-800">
                    <button type="button" onClick={() => setContactoId("")}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer ${!contactoId ? "font-medium" : "text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                      style={!contactoId ? { backgroundColor: `${TEAL}12`, color: TEAL } : {}}>
                      Sin contacto asignado
                    </button>
                    {contactos.map(c => (
                      <button key={c.id} type="button" onClick={() => setContactoId(c.id)}
                        className={`w-full text-left px-3 py-2.5 transition-colors flex items-center gap-2.5 cursor-pointer ${contactoId === c.id ? "" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                        style={contactoId === c.id ? { backgroundColor: `${TEAL}12` } : {}}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: avatarColor(c.nombre) }}>
                          {c.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${contactoId === c.id ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>
                            {c.nombre}
                            {c.principal && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${TEAL}18`, color: TEAL }}>Principal</span>}
                          </p>
                          {c.cargo && <p className="text-xs text-gray-400 truncate">{c.cargo}</p>}
                        </div>
                        {contactoId === c.id && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Proyecto (solo si hay hospital seleccionado y tiene proyectos) */}
              {hospitalId && proyectos.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">Proyecto (opcional)</label>
                  <select value={proyectoId} onChange={e => setProyectoId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent cursor-pointer"
                    style={{ "--tw-ring-color": TEAL } as React.CSSProperties}>
                    <option value="">Sin proyecto vinculado</option>
                    {proyectos.map(p => (
                      <option key={p.id} value={p.id}>{p.titulo} ({p.estado === "EN_CURSO" ? "En curso" : p.estado === "NUEVO" ? "Nuevo" : p.estado})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Plantilla */}
              {plantillas.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">Plantilla (opcional)</label>
                  <select value={plantillaId} onChange={e => setPlantillaId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent cursor-pointer"
                    style={{ "--tw-ring-color": TEAL } as React.CSSProperties}>
                    <option value="">Sin plantilla — formulario en blanco</option>
                    {plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  {plantillaId && (
                    <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: TEAL }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      El formulario se abrirá pre-rellenado
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer acciones */}
            <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => setMostrarModal(false)}
                className="flex-1 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                Cancelar
              </button>
              <button onClick={crearVisita} disabled={!hospitalId || creando}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 cursor-pointer"
                style={{ backgroundColor: TEAL, boxShadow: hospitalId ? `0 2px 8px ${TEAL}40` : "none" }}>
                {creando ? "Creando..." : "Crear visita"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
