"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { TEAL, ORANGE } from "@/lib/brand"
import { useFavoritos } from "@/hooks/useFavoritos"
import { PageHeader } from "@/components/ui/PageHeader"

const KanbanView = dynamic(() => import("./KanbanView"), { ssr: false })

// ---- tipos ----

interface Hospital { id: string; nombre: string; ciudad: string }
interface Responsable { id: string; nombre: string }
interface FaseResumen { id: string; tipo: string; estado: string; orden: number }
interface Proyecto {
  id: string
  titulo: string
  estado: string
  prioridad: number
  presupuesto: number | null
  fechaInicio: string | null
  fechaFinPlan: string | null
  creadoEn: string
  hospital: Hospital
  responsable: Responsable | null
  fases: FaseResumen[]
  visitas: { id: string }[]
  solicitudes: { id: string }[]
  hardwareUnidades: { id: string }[]
}

// ---- constantes ----

const ESTADOS = ["NUEVO", "EN_CURSO", "PAUSADO", "COMPLETADO", "CANCELADO"] as const

const ESTADO_LABEL: Record<string, string> = {
  NUEVO: "Nuevo", EN_CURSO: "En curso", PAUSADO: "Pausado",
  COMPLETADO: "Completado", CANCELADO: "Cancelado",
}
const ESTADO_COLOR: Record<string, { bg: string; text: string }> = {
  NUEVO:      { bg: "#f0f9ff", text: "#0369a1" },
  EN_CURSO:   { bg: `${TEAL}18`, text: TEAL },
  PAUSADO:    { bg: "#fef3c7", text: "#d97706" },
  COMPLETADO: { bg: "#f0fdf4", text: "#16a34a" },
  CANCELADO:  { bg: "#fef2f2", text: "#dc2626" },
}
const PRIORIDAD_LABEL: Record<number, { label: string; color: string }> = {
  0: { label: "Normal",   color: "#6b7280" },
  1: { label: "Alta",     color: ORANGE },
  2: { label: "Crítica",  color: "#dc2626" },
}

// ---- helpers ----

function fmtFecha(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

function progreso(fases: FaseResumen[]) {
  if (!fases.length) return 0
  return Math.round((fases.filter(f => f.estado === "COMPLETADO").length / fases.length) * 100)
}

function estadoEfectivo(item: Proyecto): string {
  if (item.estado === "PAUSADO" || item.estado === "CANCELADO") return item.estado
  if (!item.fases.length) return "NUEVO"
  if (item.fases.every(f => f.estado === "COMPLETADO")) return "COMPLETADO"
  if (item.fases.some(f => f.estado === "EN_PROGRESO" || f.estado === "COMPLETADO")) return "EN_CURSO"
  return "NUEVO"
}

// ---- icons ----

function IconPlus() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
function IconSearch() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function IconList() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
}
function IconKanban() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="8" rx="1"/></svg>
}
// ---- KpiCard ----

function KpiCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold mt-1" style={{ color: color ?? "#111827" }}>{value}</p>
    </div>
  )
}


// ---- modal crear ----

function ModalCrear({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (item: Proyecto) => void
}) {
  const [form, setForm] = useState({
    titulo: "", hospitalId: "", responsableId: "",
    prioridad: "0", presupuesto: "", fechaInicio: "", fechaFinPlan: "",
  })
  const [hospitales, setHospitales] = useState<Hospital[]>([])
  const [usuarios, setUsuarios] = useState<Responsable[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    Promise.all([
      fetch("/api/hospitales").then(r => r.json()),
      fetch("/api/usuarios").then(r => r.json()),
    ]).then(([h, u]) => {
      setHospitales(Array.isArray(h) ? h : [])
      setUsuarios(Array.isArray(u) ? u : [])
    })
  }, [])

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim() || !form.hospitalId) { setError("Título y hospital son obligatorios"); return }
    setGuardando(true); setError("")
    try {
      const r = await fetch("/api/proyectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          prioridad: parseInt(form.prioridad),
          presupuesto: form.presupuesto ? parseFloat(form.presupuesto) : null,
          responsableId: form.responsableId || null,
        }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? "Error") }
      const nuevo = await r.json()
      onCreate(nuevo)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg my-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Nuevo Proyecto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form onSubmit={guardar} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input
              value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
              placeholder="Ej: Implantación SCCL Hospital Norte"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hospital *</label>
            <select
              value={form.hospitalId} onChange={e => setForm(p => ({ ...p, hospitalId: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="">Seleccionar hospital…</option>
              {hospitales.map(h => <option key={h.id} value={h.id}>{h.nombre} — {h.ciudad}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
              <select
                value={form.responsableId} onChange={e => setForm(p => ({ ...p, responsableId: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="">Sin asignar</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
              <select
                value={form.prioridad} onChange={e => setForm(p => ({ ...p, prioridad: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="0">Normal</option>
                <option value="1">Alta</option>
                <option value="2">Crítica</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inicio planificado</label>
              <input type="date" value={form.fechaInicio} onChange={e => setForm(p => ({ ...p, fechaInicio: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fin planificado</label>
              <input type="date" value={form.fechaFinPlan} onChange={e => setForm(p => ({ ...p, fechaFinPlan: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto (€)</label>
            <input type="number" step="0.01" value={form.presupuesto} onChange={e => setForm(p => ({ ...p, presupuesto: e.target.value }))}
              placeholder="0.00"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: TEAL }}>
              {guardando ? "Creando…" : "Crear Proyecto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---- página principal ----

// ── Favoritos (DB-backed via useFavoritos hook) ──────────────────────────────

export default function ProyectosPage() {
  const [items, setItems] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const { ids: favPP, toggle: toggleFavPP } = useFavoritos("PROYECTO")
  const [q, setQ] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroPrioridad, setFiltroPrioridad] = useState("")
  const [filtroResponsable, setFiltroResponsable] = useState("")
  const [responsables, setResponsables] = useState<Responsable[]>([])
  const [vista, setVista] = useState<"lista" | "kanban">("lista")
  const [compacto, setCompacto] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const stored = localStorage.getItem("proyectos_compacto")
    if (stored === "true") setCompacto(true)
  }, [])

  const toggleCompacto = () => {
    setCompacto(v => {
      localStorage.setItem("proyectos_compacto", String(!v))
      return !v
    })
  }

  const PAGE_SIZE = 100

  useEffect(() => {
    fetch("/api/usuarios").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setResponsables(d)
    })
  }, [])

  const cargar = useCallback(async () => {
    setLoading(true)
    setCurrentPage(1)
    const params = new URLSearchParams()
    params.set("limit", String(PAGE_SIZE))
    params.set("page", "1")
    if (q) params.set("q", q)
    if (filtroEstado && vista === "lista") params.set("estado", filtroEstado)
    if (filtroPrioridad && vista === "lista") params.set("prioridad", filtroPrioridad)
    if (filtroResponsable && vista === "lista") params.set("responsableId", filtroResponsable)
    const r = await fetch(`/api/proyectos?${params}`)
    if (r.ok) {
      setTotalCount(parseInt(r.headers.get("X-Total-Count") ?? "0"))
      setItems(await r.json())
    }
    setLoading(false)
  }, [q, filtroEstado, filtroPrioridad, filtroResponsable, vista])

  useEffect(() => { cargar() }, [cargar])

  async function cargarMasProyectos() {
    const nextPage = currentPage + 1
    setLoadingMore(true)
    const params = new URLSearchParams()
    params.set("limit", String(PAGE_SIZE))
    params.set("page", String(nextPage))
    if (q) params.set("q", q)
    if (filtroEstado && vista === "lista") params.set("estado", filtroEstado)
    if (filtroPrioridad && vista === "lista") params.set("prioridad", filtroPrioridad)
    if (filtroResponsable && vista === "lista") params.set("responsableId", filtroResponsable)
    try {
      const r = await fetch(`/api/proyectos?${params}`)
      if (r.ok) {
        const data = await r.json()
        if (Array.isArray(data)) { setItems(prev => [...prev, ...data]); setCurrentPage(nextPage) }
      }
    } catch { /* silently fail */ }
    setLoadingMore(false)
  }

  async function handleMoveItem(id: string, newEstado: string) {
    const item = items.find(i => i.id === id)
    if (!item) return
    setItems(prev => prev.map(i => i.id === id ? { ...i, estado: newEstado } : i))
    const r = await fetch(`/api/proyectos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: newEstado }),
    })
    if (!r.ok) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, estado: item.estado } : i))
    }
  }

  function exportarCSV() {
    const header = ["Título", "Hospital", "Ciudad", "Estado", "Prioridad", "Responsable", "Inicio", "Fin planificado", "Progreso (%)", "Presupuesto (€)"]
    const rows = items.map(i => {
      const pct = progreso(i.fases)
      const prio = PRIORIDAD_LABEL[i.prioridad]?.label ?? "Normal"
      return [
        `"${i.titulo.replace(/"/g, '""')}"`,
        `"${i.hospital.nombre.replace(/"/g, '""')}"`,
        `"${i.hospital.ciudad}"`,
        ESTADO_LABEL[estadoEfectivo(i)] ?? i.estado,
        prio,
        i.responsable?.nombre ?? "—",
        i.fechaInicio ? new Date(i.fechaInicio).toLocaleDateString("es-ES") : "—",
        i.fechaFinPlan ? new Date(i.fechaFinPlan).toLocaleDateString("es-ES") : "—",
        String(pct),
        i.presupuesto != null ? String(i.presupuesto) : "—",
      ].join(",")
    })
    const csv = [header.join(","), ...rows].join("\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `proyectos_${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  const hayFiltros = !!(filtroEstado || filtroPrioridad || filtroResponsable)

  const total       = items.length
  const enCurso     = items.filter(i => estadoEfectivo(i) === "EN_CURSO").length
  const retrasados  = items.filter(i =>
    i.fechaFinPlan && new Date(i.fechaFinPlan) < new Date()
    && !["COMPLETADO", "CANCELADO"].includes(estadoEfectivo(i))
  ).length
  const completados = items.filter(i => estadoEfectivo(i) === "COMPLETADO").length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Proyectos"
        subtitle="Gestión completa del ciclo de vida de proyectos"
        actions={
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setVista("lista")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${vista === "lista" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              <IconList /> Lista
            </button>
            <button
              onClick={() => setVista("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${vista === "kanban" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              <IconKanban /> Kanban
            </button>
          </div>
          {vista === "lista" && (
            <button
              onClick={toggleCompacto}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              title={compacto ? "Vista detallada" : "Vista compacta"}
            >
              {compacto ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="7" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              )}
              {compacto ? "Detallada" : "Compacta"}
            </button>
          )}
          {vista === "lista" && items.length > 0 && (
            <button
              onClick={exportarCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              title="Exportar lista actual a CSV"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              CSV
            </button>
          )}
          <button
            onClick={() => setMostrarModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
            style={{ backgroundColor: TEAL }}
          >
            <IconPlus />
            Nuevo
          </button>
        </div>
        }
      />

      {/* KPIs */}
      <div className="stagger-grid grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total" value={total} />
        <KpiCard label="En curso" value={enCurso} color={TEAL} />
        <KpiCard label="Retrasados" value={retrasados} color="#dc2626" />
        <KpiCard label="Completados" value={completados} color="#16a34a" />
      </div>

      {/* Filtros */}
      <div className={`space-y-3 mb-5 ${vista === "kanban" ? "max-w-sm" : ""}`}>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><IconSearch /></span>
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar por título u hospital…"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
          {vista === "lista" && (
            <>
              <select
                value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              >
                <option value="">Estado</option>
                {Object.entries(ESTADO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select
                value={filtroPrioridad} onChange={e => setFiltroPrioridad(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              >
                <option value="">Prioridad</option>
                <option value="0">Normal</option>
                <option value="1">Alta</option>
                <option value="2">Crítica</option>
              </select>
              {responsables.length > 0 && (
                <select
                  value={filtroResponsable} onChange={e => setFiltroResponsable(e.target.value)}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                >
                  <option value="">Responsable</option>
                  {responsables.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              )}
            </>
          )}
        </div>
        {/* Chips de filtros activos */}
        {(q || hayFiltros) && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-400">Filtros activos:</span>
            {q && (
              <button onClick={() => setQ("")} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                &quot;{q}&quot; <span className="text-gray-400">×</span>
              </button>
            )}
            {filtroEstado && (
              <button onClick={() => setFiltroEstado("")} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                {ESTADO_LABEL[filtroEstado]} <span>×</span>
              </button>
            )}
            {filtroPrioridad && (
              <button onClick={() => setFiltroPrioridad("")} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors">
                {PRIORIDAD_LABEL[parseInt(filtroPrioridad)]?.label} <span>×</span>
              </button>
            )}
            {filtroResponsable && (
              <button onClick={() => setFiltroResponsable("")} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors">
                {responsables.find(r => r.id === filtroResponsable)?.nombre ?? "Responsable"} <span>×</span>
              </button>
            )}
            <button onClick={() => { setQ(""); setFiltroEstado(""); setFiltroPrioridad(""); setFiltroResponsable("") }} className="text-xs text-gray-400 hover:text-gray-700 underline">
              Limpiar todo
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : vista === "lista" ? (
        items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${TEAL}18` }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Sin proyectos</h3>
            <p className="text-sm text-gray-500">Crea el primero con el botón superior</p>
          </div>
        ) : (
          <div className={compacto ? "stagger-list space-y-1.5" : "stagger-list space-y-3"}>
            {items.map((item, idx) => {
              const pct = progreso(item.fases)
              const ef = estadoEfectivo(item)
              const estadoStyle = ESTADO_COLOR[ef] ?? { bg: "#f3f4f6", text: "#6b7280" }
              const prio = PRIORIDAD_LABEL[item.prioridad]
              const retrasado = item.fechaFinPlan && new Date(item.fechaFinPlan) < new Date()
                && ef !== "COMPLETADO" && ef !== "CANCELADO"
              if (compacto) {
                return (
                  <Link
                    key={item.id}
                    href={`/proyectos/${item.id}`}
                    className="card flex items-center gap-3 px-4 py-2.5 card-hover group"
                  >
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: estadoStyle.bg, color: estadoStyle.text }}>
                      {ESTADO_LABEL[ef]}
                    </span>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-teal-700 transition-colors truncate min-w-0 flex-1">
                      {item.titulo}
                    </h2>
                    <span className="text-xs text-gray-400 truncate hidden sm:block max-w-[220px]">
                      {item.hospital.nombre}{item.responsable && ` · ${item.responsable.nombre}`}
                    </span>
                    {retrasado && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 shrink-0">Retrasado</span>
                    )}
                    <div className="hidden md:flex items-center gap-1.5 shrink-0 w-24">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#16a34a" : TEAL }} />
                      </div>
                      <span className="text-[10px] font-semibold shrink-0" style={{ color: pct === 100 ? "#16a34a" : TEAL }}>{pct}%</span>
                    </div>
                    <button onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFavPP(item.id) }}
                      className="p-1 rounded cursor-pointer transition-colors shrink-0"
                      title={favPP.has(item.id) ? "Quitar de favoritos" : "Añadir a favoritos"}
                      style={{ color: favPP.has(item.id) ? "#f59e0b" : "#e5e7eb" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill={favPP.has(item.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    </button>
                  </Link>
                )
              }
              return (
                <Link
                  key={item.id}
                  href={`/proyectos/${item.id}`}
                  className="card block p-5 card-hover group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: estadoStyle.bg, color: estadoStyle.text }}>
                          {ESTADO_LABEL[ef]}
                        </span>
                        {item.prioridad > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50" style={{ color: prio.color }}>
                            {prio.label}
                          </span>
                        )}
                        {retrasado && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Retrasado</span>
                        )}
                      </div>
                      <h2 className="text-base font-bold text-gray-900 group-hover:text-teal-700 transition-colors truncate">{item.titulo}</h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {item.hospital.nombre} · {item.hospital.ciudad}
                        {item.responsable && <> · <span className="text-gray-700">{item.responsable.nombre}</span></>}
                      </p>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 text-sm shrink-0">
                      {item.presupuesto != null && (
                        <span className="font-semibold text-gray-800">
                          {item.presupuesto.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {fmtFecha(item.fechaInicio)} → {fmtFecha(item.fechaFinPlan)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5 text-xs text-gray-500">
                      <span>Progreso de fases</span>
                      <span className="font-semibold" style={{ color: pct === 100 ? "#16a34a" : TEAL }}>{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full progress-bar-anim"
                        style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#16a34a" : TEAL, "--bar-delay": `${200 + idx * 60}ms` } as React.CSSProperties}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                    <span>{item.visitas.length} visita{item.visitas.length !== 1 ? "s" : ""}</span>
                    <span>{item.solicitudes.length} solicitud{item.solicitudes.length !== 1 ? "es" : ""}</span>
                    <span>{item.hardwareUnidades.length} HW</span>
                    <button onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFavPP(item.id) }}
                      className="ml-auto p-1 rounded cursor-pointer transition-colors"
                      title={favPP.has(item.id) ? "Quitar de favoritos" : "Añadir a favoritos"}
                      style={{ color: favPP.has(item.id) ? "#f59e0b" : "#e5e7eb" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={favPP.has(item.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    </button>
                  </div>
                </Link>
              )
            })}
          </div>
        )
      ) : (
        <KanbanView items={items} onMove={handleMoveItem} />
      )}

      {items.length < totalCount && vista === "lista" && (
        <div className="flex justify-center pt-4">
          <button onClick={cargarMasProyectos} disabled={loadingMore}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: TEAL }}>
            {loadingMore ? "Cargando..." : `Cargar más (${items.length} de ${totalCount})`}
          </button>
        </div>
      )}

      {mostrarModal && (
        <ModalCrear
          onClose={() => setMostrarModal(false)}
          onCreate={nuevo => {
            setItems(prev => [{ ...nuevo, visitas: [], solicitudes: [], hardwareUnidades: [] }, ...prev])
            setMostrarModal(false)
          }}
        />
      )}
    </div>
  )
}
