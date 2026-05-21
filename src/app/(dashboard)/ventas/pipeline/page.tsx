"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core"
import { TEAL } from "@/lib/brand"
import { IconX, IconCheck, IconPlus, IconSearch, IconTrendingUp } from "@/components/ui/Icons"
import { exportarCSV } from "@/lib/csv"
import { EmptyState } from "@/components/ui/EmptyState"

// ─── Tipos ────────────────────────────────────────────────

interface HistorialEntry {
  etapaAnterior: string
  etapaNueva: string
  fecha: string
  usuario: string
}

interface Oportunidad {
  id: string
  titulo: string
  etapa: string
  valorEstimado: number | null
  probabilidad: number | null
  fechaCierre: string | null
  productos: string[]
  notas: string | null
  motivoPerdida: string | null
  historial: HistorialEntry[]
  creadoEn: string
  hospital: { id: string; nombre: string; ciudad: string; zona?: { nombre: string } }
  usuario: { id: string; nombre: string }
}

interface Hospital {
  id: string
  nombre: string
  ciudad: string
}

// ─── Constantes ───────────────────────────────────────────

const ETAPAS = ["IDENTIFICADO", "PRIMERA_VISITA", "PROPUESTA", "NEGOCIACION", "GANADO", "PERDIDO"] as const
type Etapa = typeof ETAPAS[number]

const ETAPA_LABEL: Record<Etapa, string> = {
  IDENTIFICADO: "Identificado",
  PRIMERA_VISITA: "Primera visita",
  PROPUESTA: "Propuesta",
  NEGOCIACION: "Negociacion",
  GANADO: "Ganado",
  PERDIDO: "Perdido",
}

const ETAPA_COLOR: Record<Etapa, string> = {
  IDENTIFICADO: "bg-gray-100 text-gray-600",
  PRIMERA_VISITA: "bg-blue-50 text-blue-600",
  PROPUESTA: "bg-amber-50 text-amber-600",
  NEGOCIACION: "bg-purple-50 text-purple-700",
  GANADO: "bg-green-50 text-green-700",
  PERDIDO: "bg-red-50 text-red-500",
}

const PROB_DEFECTO: Record<Etapa, number> = {
  IDENTIFICADO: 10,
  PRIMERA_VISITA: 25,
  PROPUESTA: 50,
  NEGOCIACION: 75,
  GANADO: 100,
  PERDIDO: 0,
}

const PROB_BAR_COLOR: Record<Etapa, string> = {
  IDENTIFICADO: "#9ca3af",
  PRIMERA_VISITA: "#3b82f6",
  PROPUESTA: "#f59e0b",
  NEGOCIACION: "#a855f7",
  GANADO: "#22c55e",
  PERDIDO: "#ef4444",
}

const PRODUCTOS_LISTA = [
  "Sistema BEXEN",
  "Tubos Vacutainer",
  "Centrifugas",
  "Racks de muestras",
  "Software LIS",
  "Etiquetadoras",
  "Neveras transporte",
  "Formacion",
  "Mantenimiento",
  "Otro",
]

// ─── Helpers ──────────────────────────────────────────────

function fmtEuros(n: number | null | undefined): string {
  if (n == null) return "—"
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n)
}

function valorPonderado(op: Oportunidad): number {
  const val = op.valorEstimado ?? 0
  const prob = op.probabilidad ?? PROB_DEFECTO[op.etapa as Etapa] ?? 0
  return (val * prob) / 100
}

// ─── Estado del formulario ────────────────────────────────

interface FormState {
  hospitalId: string
  titulo: string
  etapa: Etapa
  valorEstimado: string
  probabilidad: string
  fechaCierre: string
  productos: string[]
  notas: string
  motivoPerdida: string
}

const FORM_VACIO: FormState = {
  hospitalId: "",
  titulo: "",
  etapa: "IDENTIFICADO",
  valorEstimado: "",
  probabilidad: "",
  fechaCierre: "",
  productos: [],
  notas: "",
  motivoPerdida: "",
}

// ─── Kanban: card arrastrable ──────────────────────────────

function DraggableCard({ op, onClick, activa }: { op: Oportunidad; onClick: () => void; activa: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: op.id })
  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, zIndex: isDragging ? 50 : undefined, opacity: isDragging ? 0.4 : 1 }
    : {}
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`kanban-card bg-white rounded-lg border p-3 cursor-grab active:cursor-grabbing select-none ${activa ? "border-teal-400 shadow-md" : "border-gray-200"}`}
    >
      <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug">{op.titulo}</p>
      <p className="text-[11px] text-gray-400 mt-1 truncate">{op.hospital.nombre}</p>
      {op.valorEstimado != null && (
        <p className="text-xs font-bold text-gray-700 mt-2">{fmtEuros(op.valorEstimado)}</p>
      )}
      {op.probabilidad != null && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="flex-1 h-0.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${op.probabilidad}%`, backgroundColor: PROB_BAR_COLOR[op.etapa as Etapa] }} />
          </div>
          <span className="text-[10px] text-gray-400">{op.probabilidad}%</span>
        </div>
      )}
    </div>
  )
}

// ─── Kanban: columna droppable ─────────────────────────────

function DroppableColumn({ etapa, ops, onCardClick, panelId }: {
  etapa: Etapa
  ops: Oportunidad[]
  onCardClick: (op: Oportunidad) => void
  panelId: string | null
}) {
  const { isOver, setNodeRef } = useDroppable({ id: etapa })
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border min-w-[190px] max-w-[210px] flex-1 transition-colors ${isOver ? "border-teal-300 bg-teal-50/40" : "border-gray-200 bg-gray-50/60"}`}
    >
      <div className="px-3 py-2.5 border-b border-gray-200 flex items-center justify-between">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ETAPA_COLOR[etapa]}`}>
          {ETAPA_LABEL[etapa]}
        </span>
        <span className="text-xs text-gray-400 font-medium shrink-0 ml-1">{ops.length}</span>
      </div>
      <div className="flex-1 p-2 space-y-2 min-h-[80px]">
        {ops.map(op => (
          <DraggableCard
            key={op.id}
            op={op}
            onClick={() => onCardClick(op)}
            activa={panelId === op.id}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────

export default function PipelinePage() {
  const [rol, setRol] = useState("")
  const esAdmin = rol === "ADMIN"

  const [ops, setOps] = useState<Oportunidad[]>([])
  const [hospitales, setHospitales] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEtapa, setFiltroEtapa] = useState<Etapa | "TODOS">("TODOS")
  const [busqueda, setBusqueda] = useState("")
  const [vistaKanban, setVistaKanban] = useState(false)

  // Panel lateral
  const [panelOp, setPanelOp] = useState<Oportunidad | null>(null)

  // Modal crear/editar
  const [modalOpen, setModalOpen] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)

  // DnD
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const cargar = useCallback(async () => {
    const res = await fetch("/api/oportunidades")
    const data = await res.json()
    setOps(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => {
    cargar()
    fetch("/api/perfil").then(r => r.ok ? r.json() : null).then(d => { if (d?.rol) setRol(d.rol) }).catch(() => {})
    fetch("/api/hospitales").then(r => r.json()).then(d => setHospitales(Array.isArray(d) ? d : []))
  }, [cargar])

  // ── KPIs ──
  const opsActivas = ops.filter(o => o.etapa !== "PERDIDO")
  const totalPipeline = opsActivas.reduce((s, o) => s + (o.valorEstimado ?? 0), 0)
  const totalPonderado = opsActivas.reduce((s, o) => s + valorPonderado(o), 0)
  const ganadas = ops.filter(o => o.etapa === "GANADO")
  const totalGanado = ganadas.reduce((s, o) => s + (o.valorEstimado ?? 0), 0)

  // ── Filtros ──
  const filtradas = ops.filter(o => {
    const coincideEtapa = filtroEtapa === "TODOS" || o.etapa === filtroEtapa
    const coincideBusq = busqueda === "" ||
      o.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      o.hospital.nombre.toLowerCase().includes(busqueda.toLowerCase())
    return coincideEtapa && coincideBusq
  })

  // ── DnD handler ──
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const opId = active.id as string
    const nuevaEtapa = over.id as Etapa
    const op = ops.find(o => o.id === opId)
    if (op && (ETAPAS as readonly string[]).includes(nuevaEtapa) && op.etapa !== nuevaEtapa) {
      cambiarEtapa(opId, nuevaEtapa)
    }
  }

  // ── CRUD ──
  function abrirCrear() {
    setEditandoId(null)
    setForm(FORM_VACIO)
    setModalOpen(true)
  }

  function abrirEditar(op: Oportunidad) {
    setEditandoId(op.id)
    setForm({
      hospitalId: op.hospital.id,
      titulo: op.titulo,
      etapa: op.etapa as Etapa,
      valorEstimado: op.valorEstimado?.toString() ?? "",
      probabilidad: op.probabilidad?.toString() ?? "",
      fechaCierre: op.fechaCierre ? op.fechaCierre.split("T")[0] : "",
      productos: op.productos ?? [],
      notas: op.notas ?? "",
      motivoPerdida: op.motivoPerdida ?? "",
    })
    setModalOpen(true)
  }

  async function guardarOportunidad() {
    if (!form.titulo.trim() || !form.hospitalId) return
    setGuardando(true)
    const body = {
      hospitalId: form.hospitalId,
      titulo: form.titulo.trim(),
      etapa: form.etapa,
      valorEstimado: form.valorEstimado ? parseFloat(form.valorEstimado) : null,
      probabilidad: form.probabilidad ? parseInt(form.probabilidad) : null,
      fechaCierre: form.fechaCierre || null,
      productos: form.productos,
      notas: form.notas.trim() || null,
      motivoPerdida: form.etapa === "PERDIDO" ? (form.motivoPerdida.trim() || null) : null,
    }
    const url = editandoId ? `/api/oportunidades/${editandoId}` : "/api/oportunidades"
    const method = editandoId ? "PATCH" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (res.ok) {
      await cargar()
      setModalOpen(false)
      if (panelOp && editandoId === panelOp.id) {
        const updated = await fetch("/api/oportunidades").then(r => r.json())
        const found = (updated as Oportunidad[]).find(o => o.id === editandoId)
        if (found) setPanelOp(found)
      }
    }
    setGuardando(false)
  }

  async function cambiarEtapa(id: string, etapa: Etapa) {
    await fetch(`/api/oportunidades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa }),
    })
    await cargar()
    if (panelOp?.id === id) {
      const updated = await fetch("/api/oportunidades").then(r => r.json())
      const found = (updated as Oportunidad[]).find(o => o.id === id)
      if (found) setPanelOp(found)
    }
  }

  async function eliminarOportunidad(id: string) {
    if (!confirm("¿Eliminar esta oportunidad?")) return
    await fetch(`/api/oportunidades/${id}`, { method: "DELETE" })
    setPanelOp(null)
    await cargar()
  }

  function toggleProducto(p: string) {
    setForm(f => ({
      ...f,
      productos: f.productos.includes(p) ? f.productos.filter(x => x !== p) : [...f.productos, p],
    }))
  }

  // ─────────────────────────────────────────────────────────

  return (
    <div className="flex gap-6 h-full">

      {/* ── Columna principal ── */}
      <div className="flex-1 min-w-0">

        {/* Cabecera */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Pipeline de ventas</h1>
            <p className="text-sm text-gray-400 mt-0.5">{ops.length} oportunidad{ops.length !== 1 ? "es" : ""} en total</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle vista */}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setVistaKanban(false)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${!vistaKanban ? "bg-gray-800 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
              >
                Lista
              </button>
              <button
                onClick={() => setVistaKanban(true)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${vistaKanban ? "bg-gray-800 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
              >
                Kanban
              </button>
            </div>
            <button
              onClick={() => exportarCSV(
                filtradas.map(o => ({
                  Titulo: o.titulo,
                  Hospital: o.hospital.nombre,
                  Ciudad: o.hospital.ciudad,
                  Etapa: ETAPA_LABEL[o.etapa as Etapa] ?? o.etapa,
                  "Valor estimado": o.valorEstimado ?? "",
                  "Probabilidad (%)": o.probabilidad ?? "",
                  "Fecha cierre": o.fechaCierre ? new Date(o.fechaCierre).toLocaleDateString("es-ES") : "",
                  Comercial: o.usuario.nombre,
                  Productos: o.productos.join("; "),
                })),
                "pipeline"
              )}
              disabled={filtradas.length === 0}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Exportar CSV"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              CSV
            </button>
            {(rol === "VENTAS" || esAdmin) && (
              <button
                onClick={abrirCrear}
                className="flex items-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-lg shadow-sm hover:opacity-90 transition"
                style={{ backgroundColor: TEAL }}
              >
                <IconPlus size={15} /> Nueva oportunidad
              </button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Pipeline total", value: fmtEuros(totalPipeline), sub: "valor bruto activo" },
            { label: "Valor ponderado", value: fmtEuros(totalPonderado), sub: "ajustado por probabilidad" },
            { label: "Oportunidades activas", value: opsActivas.length.toString(), sub: "sin perdidas" },
            { label: "Ganadas", value: fmtEuros(totalGanado), sub: `${ganadas.length} contrato${ganadas.length !== 1 ? "s" : ""}` },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">{kpi.label}</p>
              <p className="text-lg font-bold text-gray-800">{kpi.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Filtros (solo en lista) */}
        {!vistaKanban && (
          <div className="flex flex-wrap gap-2 mb-4">
            <input
              type="search"
              placeholder="Buscar oportunidad o hospital..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-56 focus:outline-none focus:ring-1 focus:border-transparent"
              style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
            />
            {(["TODOS", ...ETAPAS] as const).map(e => {
              const activo = filtroEtapa === e
              return (
                <button
                  key={e}
                  onClick={() => setFiltroEtapa(e as typeof filtroEtapa)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                  style={activo
                    ? { backgroundColor: TEAL, color: "white" }
                    : { backgroundColor: "white", color: "#6b7280", border: "1px solid #e5e7eb" }}
                >
                  {e === "TODOS" ? "Todas" : ETAPA_LABEL[e as Etapa]}
                </button>
              )
            })}
          </div>
        )}

        {/* ── Vista lista ── */}
        {!vistaKanban && (
          loading ? (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-8 h-8 rounded-full skeleton-shimmer shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 rounded-lg skeleton-shimmer" />
                    <div className="h-3 w-1/3 rounded-lg skeleton-shimmer" />
                    <div className="h-1 w-full rounded-full skeleton-shimmer mt-1" />
                  </div>
                  <div className="text-right space-y-1 shrink-0">
                    <div className="h-4 w-20 rounded-lg skeleton-shimmer" />
                    <div className="h-3 w-14 rounded skeleton-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtradas.length === 0 ? (
            <EmptyState
              icon="pipeline"
              title={filtroEtapa !== "TODOS" ? `Sin oportunidades en "${ETAPA_LABEL[filtroEtapa as Etapa]}"` : "Sin oportunidades todavia"}
              description={filtroEtapa === "TODOS" && rol !== "PROYECTOS" ? "Crea tu primera oportunidad de venta." : undefined}
              action={filtroEtapa === "TODOS" && rol !== "PROYECTOS" ? { label: "Nueva oportunidad", onClick: abrirCrear } : undefined}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {filtradas.map(op => {
                const prob = op.probabilidad ?? PROB_DEFECTO[op.etapa as Etapa] ?? 0
                const activa = panelOp?.id === op.id
                return (
                  <button
                    key={op.id}
                    onClick={() => setPanelOp(activa ? null : op)}
                    className="w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                    style={activa ? { backgroundColor: "#f0fafa" } : {}}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${PROB_BAR_COLOR[op.etapa as Etapa]}20`, color: PROB_BAR_COLOR[op.etapa as Etapa] }}
                    >
                      {op.etapa === "GANADO" ? <IconCheck size={14} /> : op.etapa === "PERDIDO" ? <IconX size={14} /> : <IconTrendingUp size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800 truncate">{op.titulo}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${ETAPA_COLOR[op.etapa as Etapa]}`}>
                          {ETAPA_LABEL[op.etapa as Etapa]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {op.hospital.nombre} &middot; {op.hospital.ciudad}
                        {op.hospital.zona ? ` · ${op.hospital.zona.nombre}` : ""}
                        {esAdmin ? ` · ${op.usuario.nombre}` : ""}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${prob}%`, backgroundColor: PROB_BAR_COLOR[op.etapa as Etapa] }} />
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{prob}%</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-800">{fmtEuros(op.valorEstimado)}</p>
                      {op.valorEstimado && <p className="text-xs text-gray-400">pond. {fmtEuros(valorPonderado(op))}</p>}
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                )
              })}
            </div>
          )
        )}

        {/* ── Vista Kanban ── */}
        {vistaKanban && (
          loading ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {ETAPAS.map(e => (
                <div key={e} className="flex-1 min-w-[190px] max-w-[210px] rounded-xl border border-gray-200 bg-gray-50/60">
                  <div className="px-3 py-2.5 border-b border-gray-200">
                    <div className="h-5 w-24 rounded-full skeleton-shimmer" />
                  </div>
                  <div className="p-2 space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 rounded-lg skeleton-shimmer" />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="flex gap-3 overflow-x-auto pb-3">
                {ETAPAS.map(etapa => (
                  <DroppableColumn
                    key={etapa}
                    etapa={etapa}
                    ops={ops.filter(o => o.etapa === etapa)}
                    onCardClick={op => setPanelOp(panelOp?.id === op.id ? null : op)}
                    panelId={panelOp?.id ?? null}
                  />
                ))}
              </div>
            </DndContext>
          )
        )}
      </div>

      {/* ── Panel lateral de detalle ── */}
      {panelOp && (
        <aside className="slide-down w-80 shrink-0 bg-white rounded-xl border border-gray-200 p-5 self-start sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0 pr-2">
              <h2 className="text-base font-bold text-gray-800 leading-tight">{panelOp.titulo}</h2>
              <p className="text-xs text-gray-400 mt-1">{panelOp.hospital.nombre} &middot; {panelOp.hospital.ciudad}</p>
            </div>
            <button onClick={() => setPanelOp(null)} aria-label="Cerrar panel" className="text-gray-300 hover:text-gray-500 shrink-0 p-1 rounded-lg hover:bg-gray-100 transition-colors"><IconX size={18} /></button>
          </div>

          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-4 ${ETAPA_COLOR[panelOp.etapa as Etapa]}`}>
            {ETAPA_LABEL[panelOp.etapa as Etapa]}
          </span>

          {/* Cambio rapido de etapa */}
          {(rol === "VENTAS" || esAdmin) && panelOp.etapa !== "GANADO" && panelOp.etapa !== "PERDIDO" && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Avanzar etapa</p>
              <div className="flex flex-wrap gap-1.5">
                {ETAPAS.filter(e => e !== panelOp.etapa).map(e => (
                  <button
                    key={e}
                    onClick={() => cambiarEtapa(panelOp.id, e)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-400 transition-colors"
                  >
                    {ETAPA_LABEL[e]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Valor estimado</span>
              <span className="font-semibold text-gray-800">{fmtEuros(panelOp.valorEstimado)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Probabilidad</span>
              <span className="font-semibold text-gray-800">
                {panelOp.probabilidad ?? PROB_DEFECTO[panelOp.etapa as Etapa]}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Valor ponderado</span>
              <span className="font-semibold" style={{ color: TEAL }}>{fmtEuros(valorPonderado(panelOp))}</span>
            </div>
            {panelOp.fechaCierre && (
              <div className="flex justify-between">
                <span className="text-gray-400">Fecha cierre</span>
                <span className="font-semibold text-gray-800">
                  {new Date(panelOp.fechaCierre).toLocaleDateString("es-ES")}
                </span>
              </div>
            )}
            {esAdmin && (
              <div className="flex justify-between">
                <span className="text-gray-400">Responsable</span>
                <span className="font-semibold text-gray-800">{panelOp.usuario.nombre}</span>
              </div>
            )}
          </div>

          {/* Productos */}
          {panelOp.productos.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Productos de interes</p>
              <div className="flex flex-wrap gap-1.5">
                {panelOp.productos.map(p => (
                  <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{p}</span>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          {panelOp.notas && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500 mb-1">Notas</p>
              <p className="text-sm text-gray-600 leading-relaxed">{panelOp.notas}</p>
            </div>
          )}

          {/* Motivo perdida */}
          {panelOp.motivoPerdida && (
            <div className="mt-4 bg-red-50 rounded-lg p-3">
              <p className="text-xs font-medium text-red-500 mb-1">Motivo perdida</p>
              <p className="text-sm text-red-700">{panelOp.motivoPerdida}</p>
            </div>
          )}

          {/* Historial de etapas */}
          <div className="mt-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Historial</p>
            <div className="relative pl-4">
              {/* Línea vertical */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-100" />

              {/* Entradas del historial (más reciente arriba) */}
              {[...panelOp.historial].reverse().map((h, i) => {
                const color = PROB_BAR_COLOR[h.etapaNueva as Etapa] ?? "#9ca3af"
                const fecha = new Date(h.fecha)
                const hoy = new Date()
                const dias = Math.floor((hoy.getTime() - fecha.getTime()) / 86400000)
                const fechaLabel = dias === 0 ? "Hoy" : dias === 1 ? "Ayer" : dias < 7 ? `Hace ${dias}d` : fecha.toLocaleDateString("es-ES", { day: "numeric", month: "short" })
                return (
                  <div key={i} className="relative flex gap-3 pb-4 last:pb-0">
                    {/* Dot */}
                    <div className="absolute left-[-10px] w-3.5 h-3.5 rounded-full border-2 border-white shrink-0 mt-0.5" style={{ backgroundColor: color }} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {h.etapaAnterior && (
                          <>
                            <span className="text-[11px] text-gray-400">{ETAPA_LABEL[h.etapaAnterior as Etapa] ?? h.etapaAnterior}</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                          </>
                        )}
                        <span className="text-[11px] font-semibold" style={{ color }}>{ETAPA_LABEL[h.etapaNueva as Etapa] ?? h.etapaNueva}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {fechaLabel}
                        {h.usuario && <span className="ml-1">· {h.usuario}</span>}
                      </p>
                    </div>
                  </div>
                )
              })}

              {/* Entrada de creación */}
              <div className="relative flex gap-3">
                <div className="absolute left-[-10px] w-3.5 h-3.5 rounded-full border-2 border-white bg-gray-200 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-gray-500">Creada</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(panelOp.creadoEn).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                    <span className="ml-1">· {panelOp.usuario.nombre}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="mt-5 space-y-2">
            <Link
              href={`/ventas/pipeline/${panelOp.id}`}
              className="flex items-center justify-center gap-2 w-full text-sm font-medium py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
            >
              Ver ficha completa
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </Link>
            {(rol === "VENTAS" || esAdmin) && (
              <div className="flex gap-2">
                <button
                  onClick={() => { abrirEditar(panelOp) }}
                  className="flex-1 text-sm font-medium text-white py-2 rounded-lg hover:opacity-90 transition"
                  style={{ backgroundColor: TEAL }}
                >
                  Editar
                </button>
                <button
                  onClick={() => eliminarOportunidad(panelOp.id)}
                  className="px-3 py-2 text-sm font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition"
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* ── Modal crear / editar ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-150">
          <div className="slide-up bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">
                {editandoId ? "Editar oportunidad" : "Nueva oportunidad"}
              </h2>
              <button onClick={() => setModalOpen(false)} aria-label="Cerrar modal" className="text-gray-300 hover:text-gray-500 p-1 rounded-lg hover:bg-gray-100 transition-colors"><IconX size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Hospital *</label>
                <select
                  value={form.hospitalId}
                  onChange={e => setForm(f => ({ ...f, hospitalId: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none"
                >
                  <option value="">Selecciona un hospital...</option>
                  {hospitales.map(h => (
                    <option key={h.id} value={h.id}>{h.nombre} &mdash; {h.ciudad}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Titulo *</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ej. Implantacion sistema prealitico planta 3"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Etapa *</label>
                <div className="grid grid-cols-3 gap-2">
                  {ETAPAS.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, etapa: e, probabilidad: f.probabilidad || PROB_DEFECTO[e].toString() }))}
                      className={`text-xs py-2 px-2 rounded-lg border font-medium transition-all ${form.etapa === e ? "border-transparent text-white" : "border-gray-200 text-gray-600"}`}
                      style={form.etapa === e ? { backgroundColor: PROB_BAR_COLOR[e] } : {}}
                    >
                      {ETAPA_LABEL[e]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Valor estimado (EUR)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.valorEstimado}
                    onChange={e => setForm(f => ({ ...f, valorEstimado: e.target.value }))}
                    placeholder="0"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Probabilidad (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.probabilidad || PROB_DEFECTO[form.etapa]}
                    onChange={e => setForm(f => ({ ...f, probabilidad: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Fecha estimada de cierre</label>
                <input
                  type="date"
                  value={form.fechaCierre}
                  onChange={e => setForm(f => ({ ...f, fechaCierre: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Productos de interes</label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCTOS_LISTA.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => toggleProducto(p)}
                      className="text-xs px-2.5 py-1 rounded-full border font-medium transition-all"
                      style={form.productos.includes(p)
                        ? { backgroundColor: TEAL, color: "white", borderColor: TEAL }
                        : { borderColor: "#e5e7eb", color: "#6b7280" }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {form.etapa === "PERDIDO" && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Motivo de perdida</label>
                  <textarea
                    value={form.motivoPerdida}
                    onChange={e => setForm(f => ({ ...f, motivoPerdida: e.target.value }))}
                    placeholder="Por que se perdio esta oportunidad?"
                    rows={2}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none resize-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notas</label>
                <textarea
                  value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  placeholder="Observaciones, contexto, proximos pasos..."
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 pb-5">
              <button
                onClick={() => setModalOpen(false)}
                className="text-sm font-medium text-gray-500 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={guardarOportunidad}
                disabled={guardando || !form.titulo.trim() || !form.hospitalId}
                className="text-sm font-medium text-white px-5 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                style={{ backgroundColor: TEAL }}
              >
                {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Crear oportunidad"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
