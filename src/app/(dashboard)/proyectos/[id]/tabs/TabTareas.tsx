"use client"

import { useState, useEffect } from "react"
import { TEAL } from "@/lib/brand"
import { useToast } from "@/components/Toast"
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core"
import type { Proyecto, Tarea } from "../types"
import { fmtFechaInput } from "../types"

// ========== KANBAN DE TAREAS ==========

function KanbanCard({ tarea, onClick }: { tarea: Tarea; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: tarea.id })
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const PRIO_COLOR: Record<string, string> = { BAJA:"#9ca3af", MEDIA:"#6b7280", ALTA:"#d97706", CRITICA:"#dc2626" }
  const venc = tarea.fechaVencimiento ? new Date(tarea.fechaVencimiento) : null
  const vencida = venc && venc < hoy && !["COMPLETADA","CANCELADA"].includes(tarea.estado)

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      onClick={onClick}
      style={transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, zIndex: 50, opacity: isDragging ? 0.5 : 1 } : {}}
      className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing select-none hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2 flex-1">{tarea.titulo}</p>
        <span className="w-2 h-2 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: PRIO_COLOR[tarea.prioridad] }}/>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {(tarea.asignado?.nombre || tarea.asignadoA) && (
          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium truncate max-w-[80px]">
            {tarea.asignado?.nombre ?? tarea.asignadoA}
          </span>
        )}
        {venc && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={vencida ? { color:"#dc2626", backgroundColor:"#fef2f2" } : { color:"#6b7280", backgroundColor:"#f3f4f6" }}>
            {venc.toLocaleDateString("es-ES",{day:"2-digit",month:"short"})}
          </span>
        )}
      </div>
    </div>
  )
}

function KanbanCol({ estado, label, color, bg, tareas, onCardClick }: {
  estado: string; label: string; color: string; bg: string
  tareas: Tarea[]; onCardClick: (t: Tarea) => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: estado })
  return (
    <div ref={setNodeRef} className="flex flex-col flex-1 min-w-[180px] max-w-[240px] rounded-xl border transition-colors"
      style={{ backgroundColor: isOver ? bg : "#f9fafb", borderColor: isOver ? color : "#e5e7eb" }}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color }}>{label}</span>
        <span className="text-xs font-semibold text-gray-400">{tareas.length}</span>
      </div>
      <div className="flex-1 p-2 space-y-2 min-h-[120px]">
        {tareas.map(t => <KanbanCard key={t.id} tarea={t} onClick={() => onCardClick(t)} />)}
      </div>
    </div>
  )
}

// ========== TAB TAREAS ==========

const TAREA_PRIO: Record<string, { color: string; bg: string; label: string }> = {
  BAJA:    { color: "#6b7280", bg: "#f3f4f6", label: "Baja" },
  MEDIA:   { color: "#3b82f6", bg: "#eff6ff", label: "Media" },
  ALTA:    { color: "#f97316", bg: "#fff7ed", label: "Alta" },
  CRITICA: { color: "#dc2626", bg: "#fef2f2", label: "Crítica" },
}

function TareaCheck({ estado }: { estado: string }) {
  if (estado === "COMPLETADA") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#16a34a" stroke="none">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="8 12 11 15 16 9" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  if (estado === "EN_PROGRESO") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 3"/>
    </svg>
  )
  if (estado === "CANCELADA") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9"/>
      <line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>
    </svg>
  )
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2">
      <circle cx="12" cy="12" r="9"/>
    </svg>
  )
}

interface TareasQFProps {
  parentId: string | null
  titulo: string; prioridad: string; fechaVencimiento: string; asignadoAId: string
  usuarios: { id: string; nombre: string }[]
  guardando: boolean
  onChange: (f: "titulo" | "prioridad" | "fechaVencimiento" | "asignadoAId", v: string) => void
  onSubmit: () => void
  onCancel: () => void
}
function QuickFormInline({ parentId, titulo, prioridad, fechaVencimiento, asignadoAId, usuarios, guardando, onChange, onSubmit, onCancel }: TareasQFProps) {
  return (
    <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-3 space-y-2">
      <input
        autoFocus
        value={titulo}
        onChange={e => onChange("titulo", e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") onSubmit(); if (e.key === "Escape") onCancel() }}
        placeholder={parentId ? "Nombre de la subtarea..." : "Nombre de la tarea..."}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white"
        style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
      />
      <div className="flex flex-wrap gap-2">
        <select value={prioridad} onChange={e => onChange("prioridad", e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent">
          <option value="BAJA">Baja</option>
          <option value="MEDIA">Media</option>
          <option value="ALTA">Alta</option>
          <option value="CRITICA">Crítica</option>
        </select>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-400">Vence:</label>
          <input type="date" value={fechaVencimiento} onChange={e => onChange("fechaVencimiento", e.target.value)}
            className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white" />
        </div>
        <select value={asignadoAId} onChange={e => onChange("asignadoAId", e.target.value)}
          className="flex-1 min-w-28 px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent">
          <option value="">Sin asignar</option>
          {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={onSubmit} disabled={guardando}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: TEAL }}>
          {guardando ? "Guardando..." : "Añadir"}
        </button>
        <button onClick={onCancel}
          className="px-4 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  )
}

export function TabTareas({ pp, onUpdate }: { pp: Proyecto; onUpdate: (p: Proyecto) => void }) {
  const { success, error: toastError } = useToast()
  type Filtro = "TODAS" | "PENDIENTE" | "EN_PROGRESO" | "RETRASADAS" | "COMPLETADA"
  const [filtro, setFiltro] = useState<Filtro>("TODAS")
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())
  const [addingTo, setAddingTo] = useState<"ROOT" | string | null>(null)
  const [qForm, setQForm] = useState({ titulo: "", prioridad: "MEDIA", fechaVencimiento: "", asignadoAId: "" })
  const [guardando, setGuardando] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ titulo: "", prioridad: "MEDIA", fechaVencimiento: "", asignadoAId: "" })
  const [usuarios, setUsuarios] = useState<{ id: string; nombre: string }[]>([])

  useEffect(() => {
    fetch("/api/usuarios/menciones?q=").then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setUsuarios(d) })
  }, [])
  const [vistaKanban, setVistaKanban] = useState(false)

  const tareas = pp.tareas ?? []
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1)

  const esRetrasada = (t: Tarea) =>
    !["COMPLETADA", "CANCELADA"].includes(t.estado) &&
    !!t.fechaVencimiento && new Date(t.fechaVencimiento) < hoy

  const retrasadas = tareas.filter(esRetrasada)
  const vencenHoy = tareas.filter(t =>
    !["COMPLETADA", "CANCELADA"].includes(t.estado) &&
    !!t.fechaVencimiento &&
    new Date(t.fechaVencimiento) >= hoy &&
    new Date(t.fechaVencimiento) < manana
  )

  const tareasRaiz = tareas.filter(t => !t.parentId)
  const getSubtareas = (pid: string) => tareas.filter(t => t.parentId === pid).sort((a, b) => a.orden - b.orden)

  const totalRaiz = tareasRaiz.length
  const completadasRaiz = tareasRaiz.filter(t => t.estado === "COMPLETADA").length
  const pct = totalRaiz > 0 ? Math.round((completadasRaiz / totalRaiz) * 100) : 0

  const tareasVista = tareasRaiz
    .filter(t => {
      if (filtro === "TODAS") return true
      if (filtro === "RETRASADAS") return esRetrasada(t)
      return t.estado === filtro
    })
    .sort((a, b) => {
      const ac = a.estado === "COMPLETADA" || a.estado === "CANCELADA"
      const bc = b.estado === "COMPLETADA" || b.estado === "CANCELADA"
      if (ac && !bc) return 1
      if (!ac && bc) return -1
      if (esRetrasada(a) && !esRetrasada(b)) return -1
      if (!esRetrasada(a) && esRetrasada(b)) return 1
      return a.orden - b.orden
    })

  function vencStyle(f: string | null, estado: string) {
    if (!f || ["COMPLETADA", "CANCELADA"].includes(estado)) return null
    const d = new Date(f); d.setHours(0, 0, 0, 0)
    if (d < hoy)  return { color: "#dc2626", bg: "#fef2f2", label: "Vencida" }
    if (d.getTime() === hoy.getTime()) return { color: "#d97706", bg: "#fef3c7", label: "Hoy" }
    if (d.getTime() === manana.getTime()) return { color: "#d97706", bg: "#fef3c7", label: "Mañana" }
    return { color: "#6b7280", bg: "#f3f4f6", label: d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) }
  }

  function ciclarEstado(t: Tarea) {
    const next: Record<string, string> = { PENDIENTE: "EN_PROGRESO", EN_PROGRESO: "COMPLETADA", COMPLETADA: "PENDIENTE", CANCELADA: "PENDIENTE" }
    patchTarea(t.id, { estado: next[t.estado] ?? "PENDIENTE" })
  }

  async function crearTarea(parentId: string | null) {
    if (!qForm.titulo.trim()) { toastError("El título es obligatorio"); return }
    setGuardando(true)
    try {
      const r = await fetch(`/api/proyectos/${pp.id}/tareas`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: qForm.titulo.trim(), prioridad: qForm.prioridad, fechaVencimiento: qForm.fechaVencimiento || null, asignadoAId: qForm.asignadoAId || null, asignadoA: usuarios.find(u => u.id === qForm.asignadoAId)?.nombre ?? null, parentId }),
      })
      if (!r.ok) throw new Error()
      const nueva = await r.json()
      onUpdate({ ...pp, tareas: [...tareas, nueva] })
      setQForm({ titulo: "", prioridad: "MEDIA", fechaVencimiento: "", asignadoAId: "" })
      setAddingTo(null)
      if (parentId) setExpandidas(prev => new Set([...prev, parentId]))
      success(parentId ? "Subtarea creada" : "Tarea creada")
    } catch { toastError("Error al crear tarea") }
    finally { setGuardando(false) }
  }

  const kSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  function handleKanbanDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const nuevoEstado = over.id as string
    const tarea = tareas.find(t => t.id === active.id)
    if (tarea && tarea.estado !== nuevoEstado) patchTarea(tarea.id, { estado: nuevoEstado })
  }

  async function patchTarea(tareaId: string, data: Record<string, unknown>) {
    try {
      const r = await fetch(`/api/proyectos/${pp.id}/tareas/${tareaId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      })
      if (!r.ok) throw new Error()
      const updated = await r.json()
      onUpdate({ ...pp, tareas: tareas.map(t => t.id === tareaId ? { ...t, ...updated } : t) })
    } catch { toastError("Error") }
  }

  async function eliminarTarea(tareaId: string) {
    if (!confirm("¿Eliminar esta tarea? Esta acción no se puede deshacer.")) return
    try {
      await fetch(`/api/proyectos/${pp.id}/tareas/${tareaId}`, { method: "DELETE" })
      onUpdate({ ...pp, tareas: tareas.filter(t => t.id !== tareaId && t.parentId !== tareaId) })
      success("Eliminada")
    } catch { toastError("Error") }
  }

  function toggleExpand(id: string) {
    setExpandidas(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function openAdd(to: "ROOT" | string) {
    setQForm({ titulo: "", prioridad: "MEDIA", fechaVencimiento: "", asignadoAId: "" })
    setAddingTo(to)
    setEditId(null)
  }

  function openEdit(t: Tarea) {
    setEditId(t.id)
    setEditForm({
      titulo: t.titulo,
      prioridad: t.prioridad,
      fechaVencimiento: t.fechaVencimiento ? fmtFechaInput(t.fechaVencimiento) : "",
      asignadoAId: t.asignadoAId ?? "",
    })
    setAddingTo(null)
  }

  async function guardarEdit(tareaId: string) {
    if (!editForm.titulo.trim()) { toastError("El título es obligatorio"); return }
    setGuardando(true)
    try {
      const r = await fetch(`/api/proyectos/${pp.id}/tareas/${tareaId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: editForm.titulo.trim(),
          prioridad: editForm.prioridad,
          fechaVencimiento: editForm.fechaVencimiento || null,
          asignadoAId: editForm.asignadoAId || null,
          asignadoA: usuarios.find(u => u.id === editForm.asignadoAId)?.nombre ?? null,
        }),
      })
      if (!r.ok) throw new Error()
      const updated = await r.json()
      onUpdate({ ...pp, tareas: tareas.map(t => t.id === tareaId ? { ...t, ...updated } : t) })
      setEditId(null)
      success("Guardada")
    } catch { toastError("Error al guardar") }
    finally { setGuardando(false) }
  }

  return (
    <div className="space-y-4">

      {/* Panel alertas: retrasadas */}
      {retrasadas.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4">
          <p className="text-sm font-bold text-red-700 mb-2 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {retrasadas.length} {retrasadas.length === 1 ? "tarea retrasada" : "tareas retrasadas"}
          </p>
          <ul className="space-y-1">
            {retrasadas.slice(0, 4).map(t => (
              <li key={t.id} className="text-xs text-red-600 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                <span className="font-medium">{t.titulo}</span>
                <span className="text-red-400">· vencía {new Date(t.fechaVencimiento!).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}</span>
              </li>
            ))}
            {retrasadas.length > 4 && <li className="text-xs text-red-400">+{retrasadas.length - 4} más</li>}
          </ul>
        </div>
      )}

      {/* Panel alertas: vencen hoy */}
      {vencenHoy.length > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-2xl px-5 py-3 flex items-start gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" className="mt-0.5 shrink-0">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <p className="text-sm text-orange-700">
            <span className="font-semibold">{vencenHoy.length === 1 ? "1 tarea vence hoy" : `${vencenHoy.length} tareas vencen hoy`}:</span>
            {" "}{vencenHoy.map(t => t.titulo).join(", ")}
          </p>
        </div>
      )}

      {/* Cabecera: progreso + botón añadir */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>{completadasRaiz} de {totalRaiz} tareas completadas</span>
            <span className="font-semibold" style={{ color: pct === 100 ? "#16a34a" : TEAL }}>{pct}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#16a34a" : TEAL }} />
          </div>
        </div>
        <button
          onClick={() => openAdd("ROOT")}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity active:opacity-80"
          style={{ backgroundColor: TEAL }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nueva tarea
        </button>
        <div className="flex bg-gray-100 p-0.5 rounded-xl shrink-0">
          <button onClick={() => setVistaKanban(false)} title="Vista lista" className={`p-1.5 rounded-lg transition-all cursor-pointer ${!vistaKanban ? "bg-white shadow-sm text-gray-700" : "text-gray-400 hover:text-gray-600"}`}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></button>
          <button onClick={() => setVistaKanban(true)} title="Vista Kanban" className={`p-1.5 rounded-lg transition-all cursor-pointer ${vistaKanban ? "bg-white shadow-sm text-gray-700" : "text-gray-400 hover:text-gray-600"}`}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></button>
        </div>
      </div>

      {/* Formulario nueva tarea raíz */}
      {addingTo === "ROOT" && (
        <QuickFormInline
          parentId={null}
          titulo={qForm.titulo} prioridad={qForm.prioridad}
          fechaVencimiento={qForm.fechaVencimiento} asignadoAId={qForm.asignadoAId}
          usuarios={usuarios} guardando={guardando}
          onChange={(f, v) => setQForm(p => ({ ...p, [f]: v }))}
          onSubmit={() => crearTarea(null)}
          onCancel={() => setAddingTo(null)}
        />
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-1.5">
        {([
          { k: "TODAS",       label: "Todas",       count: tareasRaiz.length },
          { k: "PENDIENTE",   label: "Pendiente",   count: tareasRaiz.filter(t => t.estado === "PENDIENTE").length },
          { k: "EN_PROGRESO", label: "En progreso", count: tareasRaiz.filter(t => t.estado === "EN_PROGRESO").length },
          { k: "RETRASADAS",  label: "Retrasadas",  count: retrasadas.filter(t => !t.parentId).length },
          { k: "COMPLETADA",  label: "Completadas", count: tareasRaiz.filter(t => t.estado === "COMPLETADA").length },
        ] as { k: Filtro; label: string; count: number }[]).map(({ k, label, count }) => (
          <button key={k} onClick={() => setFiltro(k)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all border"
            style={filtro === k
              ? k === "RETRASADAS"
                ? { backgroundColor: "#fef2f2", color: "#dc2626", borderColor: "#fca5a5" }
                : { backgroundColor: "#E6F7F6", color: TEAL, borderColor: TEAL }
              : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}>
            {label}{count > 0 ? ` · ${count}` : ""}
          </button>
        ))}
      </div>

      {/* -------- KANBAN VIEW -------- */}
      {vistaKanban && (
        <DndContext sensors={kSensors} onDragEnd={handleKanbanDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-3 min-h-[300px]">
            {([
              { estado: "PENDIENTE",   label: "Pendiente",   color: "#9ca3af", bg: "#f9fafb" },
              { estado: "EN_PROGRESO", label: "En progreso", color: TEAL, bg: "#E6F7F6" },
              { estado: "COMPLETADA",  label: "Completada",  color: "#16a34a", bg: "#f0fdf4" },
              { estado: "CANCELADA",   label: "Cancelada",   color: "#dc2626", bg: "#fef2f2" },
            ]).map(col => (
              <KanbanCol key={col.estado} {...col}
                tareas={tareasRaiz.filter(t => t.estado === col.estado)}
                onCardClick={t => { setEditId(t.id); setEditForm({ titulo: t.titulo, prioridad: t.prioridad, fechaVencimiento: t.fechaVencimiento?.slice(0,10) ?? "", asignadoAId: t.asignadoAId ?? "" }) }}
              />
            ))}
          </div>
        </DndContext>
      )}

      {/* -------- LIST VIEW -------- */}
      {!vistaKanban && (
        <div>
      {/* Lista vacía */}
      {tareasVista.length === 0 && (
        <div className="py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 11 12 14 22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-500">
            {filtro === "TODAS" ? "Sin tareas" : `Sin tareas ${filtro === "RETRASADAS" ? "retrasadas" : filtro === "COMPLETADA" ? "completadas" : "en este estado"}`}
          </p>
          {filtro === "TODAS" && <p className="text-xs text-gray-400 mt-1">Pulsa &quot;Nueva tarea&quot; para empezar</p>}
        </div>
      )}

      {/* Tarjetas de tarea */}
      <div className="space-y-2">
        {tareasVista.map(tarea => {
          const subs = getSubtareas(tarea.id)
          const isExp = expandidas.has(tarea.id)
          const subComp = subs.filter(s => s.estado === "COMPLETADA").length
          const prio = TAREA_PRIO[tarea.prioridad] ?? TAREA_PRIO.MEDIA
          const vc = vencStyle(tarea.fechaVencimiento, tarea.estado)
          const done = tarea.estado === "COMPLETADA"
          const retrasada = esRetrasada(tarea)

          return (
            <div key={tarea.id}
              className="bg-white rounded-2xl border shadow-sm overflow-hidden transition-all"
              style={{ borderColor: editId === tarea.id ? TEAL : retrasada ? "#fca5a5" : "#f3f4f6" }}>

              {/* Modo edición */}
              {editId === tarea.id ? (
                <div className="p-4 space-y-2.5">
                  <input
                    autoFocus
                    value={editForm.titulo}
                    onChange={e => setEditForm(p => ({ ...p, titulo: e.target.value }))}
                    onKeyDown={e => { if (e.key === "Enter") guardarEdit(tarea.id); if (e.key === "Escape") setEditId(null) }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white"
                    style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
                  />
                  <div className="flex flex-wrap gap-2">
                    <select value={editForm.prioridad} onChange={e => setEditForm(p => ({ ...p, prioridad: e.target.value }))}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent">
                      <option value="BAJA">Baja</option><option value="MEDIA">Media</option>
                      <option value="ALTA">Alta</option><option value="CRITICA">Crítica</option>
                    </select>
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-gray-400">Vence:</label>
                      <input type="date" value={editForm.fechaVencimiento}
                        onChange={e => setEditForm(p => ({ ...p, fechaVencimiento: e.target.value }))}
                        className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white" />
                    </div>
                    <select value={editForm.asignadoAId}
                      onChange={e => setEditForm(p => ({ ...p, asignadoAId: e.target.value }))}
                      className="flex-1 min-w-28 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white">
                      <option value="">Sin asignar</option>
                      {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => guardarEdit(tarea.id)} disabled={guardando}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: TEAL }}>
                      {guardando ? "Guardando..." : "Guardar"}
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="px-4 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
              /* Fila principal */
              <div className="flex items-center gap-3 px-4 py-3.5">
                <button onClick={() => ciclarEstado(tarea)}
                  className="shrink-0 hover:scale-110 transition-transform" title="Cambiar estado">
                  <TareaCheck estado={tarea.estado} />
                </button>

                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: prio.color }} title={prio.label} />

                <p className={`flex-1 text-sm font-medium min-w-0 truncate ${done ? "line-through text-gray-400" : "text-gray-800"}`}>
                  {tarea.titulo}
                </p>

                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {/* Badge prioridad (solo alta/critica) */}
                  {(tarea.prioridad === "ALTA" || tarea.prioridad === "CRITICA") && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline"
                      style={{ backgroundColor: prio.bg, color: prio.color }}>
                      {prio.label}
                    </span>
                  )}
                  {/* Vencimiento */}
                  {vc && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: vc.bg, color: vc.color }}>
                      {vc.label}
                    </span>
                  )}
                  {/* Asignado */}
                  {(tarea.asignado?.nombre || tarea.asignadoA) && (
                    <span className="text-[11px] text-gray-400 hidden sm:inline max-w-24 truncate"
                      title={tarea.asignado?.nombre ?? tarea.asignadoA ?? ""}>
                      {tarea.asignado?.nombre ?? tarea.asignadoA}
                    </span>
                  )}
                  {/* Toggle subtareas */}
                  {subs.length > 0 && (
                    <button onClick={() => toggleExpand(tarea.id)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors px-1.5 py-0.5 rounded-lg hover:bg-gray-100">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                        style={{ transform: isExp ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                      <span>{subComp}/{subs.length}</span>
                    </button>
                  )}
                  {/* Anadir subtarea */}
                  <button onClick={() => openAdd(tarea.id)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-teal-500 hover:bg-teal-50 transition-colors"
                    title="Añadir subtarea">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>
                  {/* Editar */}
                  <button onClick={() => openEdit(tarea)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                    title="Editar tarea">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  {/* Eliminar */}
                  <button onClick={() => eliminarTarea(tarea.id)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Eliminar tarea">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/>
                    </svg>
                  </button>
                </div>
              </div>
              )} {/* fin modo edición / fila normal */}

              {/* Sección subtareas */}
              {(subs.length > 0 || addingTo === tarea.id) && (
                <div className="border-t border-gray-50 bg-gray-50/40">
                  {/* Collapsed: mostrar resumen */}
                  {!isExp && subs.length > 0 && addingTo !== tarea.id && (
                    <button onClick={() => toggleExpand(tarea.id)}
                      className="w-full flex items-center gap-2 px-5 py-2.5 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-left">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                      <span>{subs.length} subtarea{subs.length > 1 ? "s" : ""}</span>
                      <div className="flex-1 max-w-20 h-1 bg-gray-200 rounded-full">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${subs.length ? Math.round(subComp / subs.length * 100) : 0}%`, backgroundColor: TEAL }} />
                      </div>
                      <span>{subComp} completada{subComp !== 1 ? "s" : ""}</span>
                    </button>
                  )}

                  {/* Expanded: filas subtareas */}
                  {(isExp || addingTo === tarea.id) && subs.map(sub => {
                    const sp = TAREA_PRIO[sub.prioridad] ?? TAREA_PRIO.MEDIA
                    const sv = vencStyle(sub.fechaVencimiento, sub.estado)
                    const sd = sub.estado === "COMPLETADA"
                    return (
                      <div key={sub.id} className="border-b border-gray-100 last:border-0"
                        style={{ backgroundColor: editId === sub.id ? "#f0fdf4" : undefined }}>
                        {editId === sub.id ? (
                          <div className="px-5 py-3 space-y-2">
                            <input
                              autoFocus
                              value={editForm.titulo}
                              onChange={e => setEditForm(p => ({ ...p, titulo: e.target.value }))}
                              onKeyDown={e => { if (e.key === "Enter") guardarEdit(sub.id); if (e.key === "Escape") setEditId(null) }}
                              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white"
                              style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
                            />
                            <div className="flex flex-wrap gap-2">
                              <select value={editForm.prioridad} onChange={e => setEditForm(p => ({ ...p, prioridad: e.target.value }))}
                                className="px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent">
                                <option value="BAJA">Baja</option><option value="MEDIA">Media</option>
                                <option value="ALTA">Alta</option><option value="CRITICA">Crítica</option>
                              </select>
                              <input type="date" value={editForm.fechaVencimiento}
                                onChange={e => setEditForm(p => ({ ...p, fechaVencimiento: e.target.value }))}
                                className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white" />
                              <select value={editForm.asignadoAId}
                                onChange={e => setEditForm(p => ({ ...p, asignadoAId: e.target.value }))}
                                className="flex-1 min-w-24 px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white">
                                <option value="">Sin asignar</option>
                                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => guardarEdit(sub.id)} disabled={guardando}
                                className="px-3 py-1 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                                style={{ backgroundColor: TEAL }}>
                                {guardando ? "..." : "Guardar"}
                              </button>
                              <button onClick={() => setEditId(null)}
                                className="px-3 py-1 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition-colors">
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-2.5">
                            <div className="w-4 shrink-0" />
                            <button onClick={() => ciclarEstado(sub)} className="shrink-0 hover:scale-110 transition-transform">
                              <TareaCheck estado={sub.estado} />
                            </button>
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sp.color }} />
                            <p className={`flex-1 text-sm min-w-0 truncate ${sd ? "line-through text-gray-400" : "text-gray-700"}`}>
                              {sub.titulo}
                            </p>
                            <div className="flex items-center gap-2 shrink-0">
                              {sv && (
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: sv.bg, color: sv.color }}>
                                  {sv.label}
                                </span>
                              )}
                              {(sub.asignado?.nombre || sub.asignadoA) && (
                                <span className="text-[11px] text-gray-400 hidden sm:inline max-w-16 truncate">{sub.asignado?.nombre ?? sub.asignadoA}</span>
                              )}
                              <button onClick={() => openEdit(sub)}
                                className="p-1 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                                title="Editar subtarea">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                              <button onClick={() => eliminarTarea(sub.id)}
                                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Formulario nueva subtarea */}
                  {addingTo === tarea.id && (
                    <div className="px-4 py-3">
                      <QuickFormInline
                        parentId={tarea.id}
                        titulo={qForm.titulo} prioridad={qForm.prioridad}
                        fechaVencimiento={qForm.fechaVencimiento} asignadoAId={qForm.asignadoAId}
                        usuarios={usuarios}
                        guardando={guardando}
                        onChange={(f, v) => setQForm(p => ({ ...p, [f]: v }))}
                        onSubmit={() => crearTarea(tarea.id)}
                        onCancel={() => setAddingTo(null)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
        </div>
      )}
    </div>
  )
}

