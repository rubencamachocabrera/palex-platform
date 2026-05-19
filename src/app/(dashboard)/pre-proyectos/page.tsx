"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { TEAL, ORANGE } from "@/lib/brand"

// ---- tipos ----

interface Hospital { id: string; nombre: string; ciudad: string }
interface Responsable { id: string; nombre: string }
interface FaseResumen { id: string; tipo: string; estado: string; orden: number }
interface PreProyecto {
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
  _count: { visitas: number; solicitudes: number; hardwareUnidades: number }
}

// ---- constantes ----

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

// ---- componentes ----

function KpiCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold mt-1" style={{ color: color ?? "#111827" }}>{value}</p>
    </div>
  )
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}
function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

// ---- modal crear ----

function ModalCrear({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (item: PreProyecto) => void
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
      const r = await fetch("/api/pre-proyectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          prioridad: parseInt(form.prioridad),
          presupuesto: form.presupuesto ? parseFloat(form.presupuesto) : null,
          responsableId: form.responsableId || null,
        }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? "Error"); }
      const nuevo = await r.json()
      onCreate(nuevo)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Nuevo Pre-Proyecto</h2>
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
              {guardando ? "Creando…" : "Crear Pre-Proyecto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---- página principal ----

export default function PreProyectosPage() {
  const [items, setItems] = useState<PreProyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [mostrarModal, setMostrarModal] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (filtroEstado) params.set("estado", filtroEstado)
    const r = await fetch(`/api/pre-proyectos?${params}`)
    if (r.ok) setItems(await r.json())
    setLoading(false)
  }, [q, filtroEstado])

  useEffect(() => { cargar() }, [cargar])

  const total       = items.length
  const enCurso     = items.filter(i => i.estado === "EN_CURSO").length
  const retrasados  = items.filter(i =>
    i.fechaFinPlan && new Date(i.fechaFinPlan) < new Date() && i.estado !== "COMPLETADO" && i.estado !== "CANCELADO"
  ).length
  const completados = items.filter(i => i.estado === "COMPLETADO").length

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestor de Pre-Proyectos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión completa del ciclo de vida de proyectos</p>
        </div>
        <button
          onClick={() => setMostrarModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
          style={{ backgroundColor: TEAL }}
        >
          <IconPlus />
          Nuevo Pre-Proyecto
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total" value={total} />
        <KpiCard label="En curso" value={enCurso} color={TEAL} />
        <KpiCard label="Retrasados" value={retrasados} color="#dc2626" />
        <KpiCard label="Completados" value={completados} color="#16a34a" />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><IconSearch /></span>
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar por título u hospital…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
        <select
          value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${TEAL}18` }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Sin pre-proyectos</h3>
          <p className="text-sm text-gray-500">Crea el primero con el botón superior</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const pct = progreso(item.fases)
            const estadoStyle = ESTADO_COLOR[item.estado] ?? { bg: "#f3f4f6", text: "#6b7280" }
            const prio = PRIORIDAD_LABEL[item.prioridad]
            const retrasado = item.fechaFinPlan && new Date(item.fechaFinPlan) < new Date()
              && item.estado !== "COMPLETADO" && item.estado !== "CANCELADO"
            return (
              <Link
                key={item.id}
                href={`/pre-proyectos/${item.id}`}
                className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-teal-200 hover:shadow-md transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* left */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: estadoStyle.bg, color: estadoStyle.text }}>
                        {ESTADO_LABEL[item.estado]}
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
                  {/* right */}
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
                {/* Barra de progreso de fases */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5 text-xs text-gray-500">
                    <span>Progreso de fases</span>
                    <span className="font-semibold" style={{ color: pct === 100 ? "#16a34a" : TEAL }}>{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#16a34a" : TEAL }}
                    />
                  </div>
                </div>
                {/* Contadores */}
                <div className="mt-3 flex gap-4 text-xs text-gray-400">
                  <span>{item._count.visitas} visita{item._count.visitas !== 1 ? "s" : ""}</span>
                  <span>{item._count.solicitudes} solicitud{item._count.solicitudes !== 1 ? "es" : ""}</span>
                  <span>{item._count.hardwareUnidades} HW asignado{item._count.hardwareUnidades !== 1 ? "s" : ""}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {mostrarModal && (
        <ModalCrear
          onClose={() => setMostrarModal(false)}
          onCreate={nuevo => {
            setItems(prev => [nuevo, ...prev])
            setMostrarModal(false)
          }}
        />
      )}
    </div>
  )
}
