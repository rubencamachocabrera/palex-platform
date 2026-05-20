"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { TEAL, ORANGE } from "@/lib/brand"
import { useToast } from "@/components/Toast"

// ---- tipos ----

interface Hospital {
  id: string; nombre: string; ciudad: string; provincia: string | null
  tipo?: string; camas?: number | null; direccion?: string | null; pais?: string
  zona?: { nombre: string }
}
interface Responsable { id: string; nombre: string; email: string }
interface Fase {
  id: string; tipo: string; nombre: string; orden: number; estado: string
  fechaPlan: string | null; fechaReal: string | null; notas: string | null
}
interface Hito {
  id: string; titulo: string; descripcion: string | null
  fecha: string; fechaReal: string | null; completado: boolean
}
interface LineaMaterial {
  id: string; nombre: string; referencia: string | null; cantidad: number
  cantidadEntregada: number; unidad: string; notas: string | null
}
interface Solicitud {
  id: string; titulo: string; estado: string
  fechaSolicitud: string; fechaEntregaPlan: string | null; fechaEntregaReal: string | null
  notas: string | null; lineas: LineaMaterial[]
}
interface Contacto {
  id: string; nombre: string; cargo: string | null; email: string | null; telefono: string | null; principal: boolean
}
interface ContactoPivot { contacto: Contacto }
interface Visita {
  id: string; fecha: string; estado: string; tipo: string
  usuario: { nombre: string }
}
interface HardwareCatalogo {
  tipo: string; marca: string; modelo: string; precio?: number | null
}
interface HardwareUnidad {
  id: string; numSerie: string | null; estado: string; notas: string | null
  catalogo: HardwareCatalogo
}
interface PreProyecto {
  id: string; titulo: string; descripcion: string | null; estado: string; prioridad: number
  presupuesto: number | null; fechaInicio: string | null; fechaFinPlan: string | null; fechaFinReal: string | null
  notas: string | null; mapaHtml?: string | null; shareToken?: string | null
  creadoEn: string; editadoEn: string
  hospital: Hospital; responsable: Responsable | null
  fases: Fase[]; hitos: Hito[]; solicitudes: Solicitud[]
  contactos: ContactoPivot[]; visitas: Visita[]; hardwareUnidades: HardwareUnidad[]
}

// ---- constantes ----

const ESTADO_LABEL: Record<string, string> = {
  NUEVO: "Nuevo", EN_CURSO: "En curso", PAUSADO: "Pausado", COMPLETADO: "Completado", CANCELADO: "Cancelado",
}
const ESTADO_COLOR: Record<string, { bg: string; text: string }> = {
  NUEVO:      { bg: "#f0f9ff", text: "#0369a1" },
  EN_CURSO:   { bg: `${TEAL}18`, text: TEAL },
  PAUSADO:    { bg: "#fef3c7", text: "#d97706" },
  COMPLETADO: { bg: "#f0fdf4", text: "#16a34a" },
  CANCELADO:  { bg: "#fef2f2", text: "#dc2626" },
}
const FASE_ESTADO_COLOR: Record<string, { dot: string; text: string; bg: string }> = {
  PENDIENTE:    { dot: "#d1d5db", text: "#6b7280", bg: "#f9fafb" },
  EN_PROGRESO:  { dot: TEAL,     text: TEAL,       bg: `${TEAL}10` },
  COMPLETADO:   { dot: "#16a34a", text: "#16a34a",  bg: "#f0fdf4" },
  BLOQUEADO:    { dot: "#dc2626", text: "#dc2626",  bg: "#fef2f2" },
}
const SOLICITUD_ESTADO: Record<string, { label: string; color: string; bg: string }> = {
  PENDIENTE:      { label: "Pendiente",      color: "#d97706", bg: "#fef3c7" },
  APROBADA:       { label: "Aprobada",       color: TEAL,      bg: `${TEAL}18` },
  EN_PREPARACION: { label: "En preparación", color: "#7c3aed", bg: "#f5f3ff" },
  ENVIADA:        { label: "Enviada",        color: "#0369a1", bg: "#f0f9ff" },
  ENTREGADA:      { label: "Entregada",      color: "#16a34a", bg: "#f0fdf4" },
  CANCELADA:      { label: "Cancelada",      color: "#dc2626", bg: "#fef2f2" },
}
const HW_ESTADO: Record<string, { label: string; color: string; bg: string }> = {
  DISPONIBLE:      { label: "Disponible",      color: "#16a34a", bg: "#f0fdf4" },
  ASIGNADO:        { label: "Asignado",        color: TEAL,      bg: `${TEAL}18` },
  EN_MANTENIMIENTO:{ label: "Mantenimiento",   color: "#d97706", bg: "#fef3c7" },
  RETIRADO:        { label: "Retirado",        color: "#6b7280", bg: "#f3f4f6" },
  BAJA:            { label: "Baja",            color: "#dc2626", bg: "#fef2f2" },
}
const HW_TIPO_LABEL: Record<string, string> = {
  BC_ROBOT: "BC Robo", ZEBRA_MC: "Zebra MC", ZEBRA_PRINTER: "Zebra Printer",
  LECTOR_BARRAS: "Lector Barras", SERVIDOR: "Servidor", SWITCH_RED: "Switch Red",
  TABLET: "Tablet", OTRO: "Otro",
}
const VISITA_ESTADO_COLOR: Record<string, string> = {
  BORRADOR: "#d97706", COMPLETADA: "#16a34a", ARCHIVADA: "#6b7280",
}
const PRIORIDAD: Record<number, { label: string; color: string }> = {
  0: { label: "Normal", color: "#6b7280" },
  1: { label: "Alta",   color: ORANGE },
  2: { label: "Crítica",color: "#dc2626" },
}

// ---- helpers ----

function fmtFecha(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}
function fmtFechaInput(s: string | null) {
  if (!s) return ""
  return new Date(s).toISOString().split("T")[0]
}
function relativo(s: string) {
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000)
  if (d === 0) return "hoy"
  if (d === 1) return "ayer"
  if (d < 7) return `hace ${d}d`
  if (d < 30) return `hace ${Math.floor(d / 7)}sem`
  return `hace ${Math.floor(d / 30)}m`
}

// ---- tabs ----

const TABS = ["Info", "Timeline", "Materiales", "Contactos", "Visitas", "Resumen"] as const
type Tab = typeof TABS[number]

// ========== COMPONENTE PRINCIPAL ==========

export default function PreProyectoDetalle() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const [pp, setPp] = useState<PreProyecto | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("Info")

  const cargar = useCallback(async () => {
    const r = await fetch(`/api/pre-proyectos/${params.id}`)
    if (r.status === 404) { router.push("/pre-proyectos"); return }
    if (r.ok) setPp(await r.json())
    setLoading(false)
  }, [params.id, router])

  useEffect(() => { cargar() }, [cargar])

  if (loading) return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="h-10 bg-gray-100 rounded-xl animate-pulse w-1/2" />
      <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
    </div>
  )
  if (!pp) return null

  const estadoStyle = ESTADO_COLOR[pp.estado] ?? { bg: "#f3f4f6", text: "#6b7280" }
  const fasesCompletadas = pp.fases.filter(f => f.estado === "COMPLETADO").length
  const pct = pp.fases.length ? Math.round((fasesCompletadas / pp.fases.length) * 100) : 0

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/pre-proyectos" className="hover:text-teal-600 transition-colors">Proyectos</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate max-w-xs">{pp.titulo}</span>
      </nav>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: estadoStyle.bg, color: estadoStyle.text }}>
                {ESTADO_LABEL[pp.estado]}
              </span>
              {pp.prioridad > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-50" style={{ color: PRIORIDAD[pp.prioridad]?.color }}>
                  {PRIORIDAD[pp.prioridad]?.label}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{pp.titulo}</h1>
            <p className="text-gray-500 text-sm">
              <span className="font-medium text-gray-700">{pp.hospital.nombre}</span>
              {" · "}{pp.hospital.ciudad}{pp.hospital.provincia ? `, ${pp.hospital.provincia}` : ""}
            </p>
            {pp.responsable && (
              <p className="text-sm text-gray-400 mt-0.5">Responsable: <span className="text-gray-700 font-medium">{pp.responsable.nombre}</span></p>
            )}
          </div>
          <div className="shrink-0 text-sm text-right space-y-1">
            {pp.presupuesto != null && (
              <p className="text-2xl font-bold text-gray-900">
                {pp.presupuesto.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
              </p>
            )}
            <p className="text-gray-400">{fmtFecha(pp.fechaInicio)} → {fmtFecha(pp.fechaFinPlan)}</p>
            {pp.fechaFinReal && <p className="text-green-600 font-medium">Entregado: {fmtFecha(pp.fechaFinReal)}</p>}
          </div>
        </div>
        {/* Barra progreso */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>{fasesCompletadas} de {pp.fases.length} fases completadas</span>
            <span className="font-semibold" style={{ color: pct === 100 ? "#16a34a" : TEAL }}>{pct}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#16a34a" : TEAL }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
            style={tab === t ? { backgroundColor: "white", color: TEAL, boxShadow: "0 1px 4px rgba(0,0,0,.08)" } : { color: "#6b7280" }}
          >
            {t}
            {t === "Timeline" && <span className="ml-1.5 text-xs opacity-60">{pp.fases.length + pp.hitos.length}</span>}
            {t === "Materiales" && pp.hardwareUnidades.length > 0 && <span className="ml-1.5 text-xs opacity-60">{pp.hardwareUnidades.length}</span>}
            {t === "Contactos" && pp.contactos.length > 0 && <span className="ml-1.5 text-xs opacity-60">{pp.contactos.length}</span>}
            {t === "Visitas" && pp.visitas.length > 0 && <span className="ml-1.5 text-xs opacity-60">{pp.visitas.length}</span>}
            {t === "Resumen" && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${TEAL}20`, color: TEAL }}>360°</span>}
          </button>
        ))}
      </div>

      {/* Tab contenido */}
      {tab === "Info"       && <TabInfo pp={pp} onUpdate={setPp} />}
      {tab === "Timeline"   && <TabTimeline pp={pp} onUpdate={setPp} />}
      {tab === "Materiales" && <TabMateriales pp={pp} onUpdate={setPp} />}
      {tab === "Contactos"  && <TabContactos pp={pp} onUpdate={setPp} />}
      {tab === "Visitas"    && <TabVisitas pp={pp} onUpdate={setPp} />}
      {tab === "Resumen"    && <TabResumen pp={pp} onUpdate={setPp} />}
    </div>
  )
}

// ========== TAB INFO ==========

function TabInfo({ pp, onUpdate }: { pp: PreProyecto; onUpdate: (p: PreProyecto) => void }) {
  const { success, error: toastError } = useToast()
  const [form, setForm] = useState({
    titulo: pp.titulo, descripcion: pp.descripcion ?? "", estado: pp.estado,
    prioridad: String(pp.prioridad), presupuesto: pp.presupuesto != null ? String(pp.presupuesto) : "",
    fechaInicio: fmtFechaInput(pp.fechaInicio), fechaFinPlan: fmtFechaInput(pp.fechaFinPlan),
    fechaFinReal: fmtFechaInput(pp.fechaFinReal), notas: pp.notas ?? "",
  })
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    try {
      const r = await fetch(`/api/pre-proyectos/${pp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          prioridad: parseInt(form.prioridad),
          presupuesto: form.presupuesto ? parseFloat(form.presupuesto) : null,
        }),
      })
      if (!r.ok) throw new Error()
      success("Guardado correctamente")
      onUpdate({ ...pp, ...form, prioridad: parseInt(form.prioridad), presupuesto: form.presupuesto ? parseFloat(form.presupuesto) : null })
    } catch {
      toastError("Error al guardar")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Título</label>
          <input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
          <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
            {Object.entries({ NUEVO: "Nuevo", EN_CURSO: "En curso", PAUSADO: "Pausado", COMPLETADO: "Completado", CANCELADO: "Cancelado" }).map(([k, v]) =>
              <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Prioridad</label>
          <select value={form.prioridad} onChange={e => setForm(p => ({ ...p, prioridad: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
            <option value="0">Normal</option><option value="1">Alta</option><option value="2">Crítica</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Presupuesto (€)</label>
          <input type="number" step="0.01" value={form.presupuesto} onChange={e => setForm(p => ({ ...p, presupuesto: e.target.value }))}
            placeholder="0.00"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Inicio planificado</label>
          <input type="date" value={form.fechaInicio} onChange={e => setForm(p => ({ ...p, fechaInicio: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Fin planificado</label>
          <input type="date" value={form.fechaFinPlan} onChange={e => setForm(p => ({ ...p, fechaFinPlan: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Fin real</label>
          <input type="date" value={form.fechaFinReal} onChange={e => setForm(p => ({ ...p, fechaFinReal: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción</label>
          <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} rows={3}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas internas</label>
          <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={3}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
        </div>
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={guardando}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: TEAL }}>
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  )
}

// ========== TAB TIMELINE ==========

function TabTimeline({ pp, onUpdate }: { pp: PreProyecto; onUpdate: (p: PreProyecto) => void }) {
  const { success, error: toastError } = useToast()
  const [editFaseId, setEditFaseId] = useState<string | null>(null)
  const [fasePatch, setFasePatch] = useState<{ estado: string; fechaPlan: string; fechaReal: string; notas: string }>({
    estado: "", fechaPlan: "", fechaReal: "", notas: "",
  })
  const [mostrarHitoForm, setMostrarHitoForm] = useState(false)
  const [hitoForm, setHitoForm] = useState({ titulo: "", descripcion: "", fecha: "" })
  const [guardando, setGuardando] = useState(false)

  function abrirEditFase(f: Fase) {
    setEditFaseId(f.id)
    setFasePatch({
      estado: f.estado,
      fechaPlan: fmtFechaInput(f.fechaPlan),
      fechaReal: fmtFechaInput(f.fechaReal),
      notas: f.notas ?? "",
    })
  }

  async function guardarFase(faseId: string) {
    setGuardando(true)
    try {
      const r = await fetch(`/api/pre-proyectos/${pp.id}/fases/${faseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fasePatch),
      })
      if (!r.ok) throw new Error()
      const updated = await r.json()
      onUpdate({ ...pp, fases: pp.fases.map(f => f.id === faseId ? { ...f, ...updated } : f) })
      setEditFaseId(null)
      success("Fase actualizada")
    } catch {
      toastError("Error al guardar fase")
    } finally {
      setGuardando(false)
    }
  }

  async function crearHito() {
    if (!hitoForm.titulo || !hitoForm.fecha) return
    setGuardando(true)
    try {
      const r = await fetch(`/api/pre-proyectos/${pp.id}/hitos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hitoForm),
      })
      if (!r.ok) throw new Error()
      const nuevo = await r.json()
      onUpdate({ ...pp, hitos: [...pp.hitos, nuevo].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()) })
      setHitoForm({ titulo: "", descripcion: "", fecha: "" })
      setMostrarHitoForm(false)
      success("Hito añadido")
    } catch {
      toastError("Error al crear hito")
    } finally {
      setGuardando(false)
    }
  }

  async function toggleHito(hito: Hito) {
    try {
      const r = await fetch(`/api/pre-proyectos/${pp.id}/hitos/${hito.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completado: !hito.completado }),
      })
      if (!r.ok) throw new Error()
      onUpdate({ ...pp, hitos: pp.hitos.map(h => h.id === hito.id ? { ...h, completado: !h.completado } : h) })
    } catch {
      toastError("Error")
    }
  }

  async function eliminarHito(hitoId: string) {
    try {
      await fetch(`/api/pre-proyectos/${pp.id}/hitos/${hitoId}`, { method: "DELETE" })
      onUpdate({ ...pp, hitos: pp.hitos.filter(h => h.id !== hitoId) })
      success("Hito eliminado")
    } catch {
      toastError("Error")
    }
  }

  // Merge fases + hitos ordenados por fecha (fases sin fecha van al final)
  type TimelineItem = { kind: "fase"; data: Fase } | { kind: "hito"; data: Hito }
  const items: TimelineItem[] = [
    ...pp.fases.map(f => ({ kind: "fase" as const, data: f })),
  ].sort((a, b) => {
    const da = a.kind === "fase" ? ((a.data as Fase).fechaPlan ? new Date((a.data as Fase).fechaPlan!).getTime() : Infinity) : new Date((a.data as unknown as Hito).fecha).getTime()
    const db2 = b.kind === "fase" ? ((b.data as Fase).fechaPlan ? new Date((b.data as Fase).fechaPlan!).getTime() : Infinity) : new Date((b.data as unknown as Hito).fecha).getTime()
    return da - db2
  })

  // Insertamos hitos en orden cronológico
  const merged: TimelineItem[] = [...items]
  pp.hitos.forEach(h => {
    const pos = merged.findIndex(i => {
      const d = i.kind === "fase" ? (i.data.fechaPlan ? new Date(i.data.fechaPlan).getTime() : Infinity) : new Date((i.data as Hito).fecha).getTime()
      return d > new Date(h.fecha).getTime()
    })
    const item: TimelineItem = { kind: "hito", data: h }
    if (pos === -1) merged.push(item)
    else merged.splice(pos, 0, item)
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Timeline del Proyecto</h3>
        <button onClick={() => setMostrarHitoForm(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Añadir hito
        </button>
      </div>

      {mostrarHitoForm && (
        <div className="bg-white rounded-2xl border border-teal-200 p-5 shadow-sm mb-4">
          <h4 className="font-semibold text-gray-900 mb-3">Nuevo hito</h4>
          <div className="space-y-3">
            <input value={hitoForm.titulo} onChange={e => setHitoForm(p => ({ ...p, titulo: e.target.value }))}
              placeholder="Título del hito"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            <input value={hitoForm.descripcion} onChange={e => setHitoForm(p => ({ ...p, descripcion: e.target.value }))}
              placeholder="Descripción (opcional)"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            <input type="date" value={hitoForm.fecha} onChange={e => setHitoForm(p => ({ ...p, fecha: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            <div className="flex gap-2">
              <button onClick={() => setMostrarHitoForm(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={crearHito} disabled={guardando}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: TEAL }}>
                {guardando ? "Guardando…" : "Añadir"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative pl-8">
        {/* Línea vertical */}
        <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-gray-100" />

        <div className="space-y-3">
          {merged.map((item, idx) => {
            if (item.kind === "fase") {
              const f = item.data as Fase
              const s = FASE_ESTADO_COLOR[f.estado] ?? FASE_ESTADO_COLOR.PENDIENTE
              const editing = editFaseId === f.id
              return (
                <div key={`fase-${f.id}`} className="relative">
                  {/* Dot */}
                  <div className="absolute -left-[22px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm z-10"
                    style={{ backgroundColor: s.dot }} />
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: s.bg, color: s.text }}>
                            {f.estado === "PENDIENTE" ? "Pendiente" : f.estado === "EN_PROGRESO" ? "En progreso" : f.estado === "COMPLETADO" ? "Completado" : "Bloqueado"}
                          </span>
                          <span className="text-xs text-gray-400">Fase {f.orden}</span>
                        </div>
                        <h4 className="font-semibold text-gray-900 mt-1">{f.nombre}</h4>
                        {!editing && (
                          <div className="flex gap-4 mt-1 text-xs text-gray-400">
                            {f.fechaPlan && <span>Plan: {fmtFecha(f.fechaPlan)}</span>}
                            {f.fechaReal && <span className="text-green-600">Real: {fmtFecha(f.fechaReal)}</span>}
                          </div>
                        )}
                        {!editing && f.notas && <p className="text-xs text-gray-500 mt-1.5 italic">{f.notas}</p>}
                      </div>
                      {!editing && (
                        <button onClick={() => abrirEditFase(f)} className="shrink-0 text-gray-300 hover:text-teal-600 p-1 rounded-lg hover:bg-gray-50 transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                      )}
                    </div>
                    {editing && (
                      <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                        <select value={fasePatch.estado} onChange={e => setFasePatch(p => ({ ...p, estado: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
                          <option value="PENDIENTE">Pendiente</option>
                          <option value="EN_PROGRESO">En progreso</option>
                          <option value="COMPLETADO">Completado</option>
                          <option value="BLOQUEADO">Bloqueado</option>
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Fecha plan</label>
                            <input type="date" value={fasePatch.fechaPlan} onChange={e => setFasePatch(p => ({ ...p, fechaPlan: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Fecha real</label>
                            <input type="date" value={fasePatch.fechaReal} onChange={e => setFasePatch(p => ({ ...p, fechaReal: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                          </div>
                        </div>
                        <textarea value={fasePatch.notas} onChange={e => setFasePatch(p => ({ ...p, notas: e.target.value }))} rows={2}
                          placeholder="Notas…"
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
                        <div className="flex gap-2">
                          <button onClick={() => setEditFaseId(null)} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                          <button onClick={() => guardarFase(f.id)} disabled={guardando}
                            className="flex-1 px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                            style={{ backgroundColor: TEAL }}>
                            {guardando ? "…" : "Guardar"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            } else {
              const h = item.data as Hito
              return (
                <div key={`hito-${h.id}`} className="relative">
                  {/* Hito diamond */}
                  <div className="absolute -left-[24px] top-3.5 w-4 h-4 rotate-45 border-2 border-white shadow-sm z-10 rounded-sm"
                    style={{ backgroundColor: h.completado ? "#16a34a" : ORANGE }} />
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Hito</span>
                          <span className="text-xs text-gray-400">{fmtFecha(h.fecha)}</span>
                          {h.completado && <span className="text-xs font-bold text-green-600">Completado</span>}
                        </div>
                        <h4 className="font-semibold text-gray-900 mt-0.5">{h.titulo}</h4>
                        {h.descripcion && <p className="text-xs text-gray-500 mt-0.5">{h.descripcion}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => toggleHito(h)} title={h.completado ? "Marcar pendiente" : "Marcar completado"}
                          className="p-1.5 rounded-lg hover:bg-amber-100 transition-colors text-amber-600">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </button>
                        <button onClick={() => eliminarHito(h.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-red-400">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
          })}
        </div>
      </div>
    </div>
  )
}

// ========== TAB MATERIALES ==========

interface CatalogoItemPicker {
  id: string; tipo: string; marca: string; modelo: string
  _stock: { total: number; disponibles: number; asignados: number }
}
interface UnidadDisponible {
  id: string; numSerie: string | null; notas: string | null
}

function TabMateriales({ pp, onUpdate }: { pp: PreProyecto; onUpdate: (p: PreProyecto) => void }) {
  const { success, error: toastError } = useToast()
  const [mostrarPicker, setMostrarPicker] = useState(false)
  const [catalogo, setCatalogo] = useState<CatalogoItemPicker[]>([])
  const [catalogoId, setCatalogoId] = useState("")
  const [unidadesDisp, setUnidadesDisp] = useState<UnidadDisponible[]>([])
  const [loadingUnidades, setLoadingUnidades] = useState(false)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [asignando, setAsignando] = useState(false)

  useEffect(() => {
    fetch("/api/hardware").then(r => r.json()).then(data => {
      setCatalogo(Array.isArray(data) ? data : [])
    })
  }, [])

  async function onModelChange(id: string) {
    setCatalogoId(id)
    setSeleccionados(new Set())
    setUnidadesDisp([])
    if (!id) return
    setLoadingUnidades(true)
    try {
      const r = await fetch(`/api/hardware/unidades?catalogoId=${id}&estado=DISPONIBLE`)
      const data = await r.json()
      setUnidadesDisp(Array.isArray(data) ? data : [])
    } finally {
      setLoadingUnidades(false)
    }
  }

  function toggleSeleccion(id: string) {
    setSeleccionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function confirmarAsignacion() {
    if (seleccionados.size === 0) return
    setAsignando(true)
    try {
      const r = await fetch("/api/hardware/unidades", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(seleccionados),
          preProyectoId: pp.id,
          hospitalId: pp.hospital.id,
          estado: "ASIGNADO",
        }),
      })
      if (!r.ok) throw new Error()
      const asignadas: HardwareUnidad[] = await r.json()
      onUpdate({ ...pp, hardwareUnidades: [...pp.hardwareUnidades, ...asignadas] })
      cerrarPicker()
      success(`${asignadas.length} unidad${asignadas.length !== 1 ? "es" : ""} asignada${asignadas.length !== 1 ? "s" : ""}`)
    } catch {
      toastError("Error al asignar")
    } finally {
      setAsignando(false)
    }
  }

  function cerrarPicker() {
    setMostrarPicker(false)
    setCatalogoId("")
    setUnidadesDisp([])
    setSeleccionados(new Set())
  }

  async function desasignarHW(unidadId: string) {
    try {
      await fetch(`/api/hardware/unidades/${unidadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preProyectoId: null, estado: "DISPONIBLE" }),
      })
      onUpdate({ ...pp, hardwareUnidades: pp.hardwareUnidades.filter(u => u.id !== unidadId) })
      success("Hardware desasignado")
    } catch {
      toastError("Error")
    }
  }

  const byTipo = pp.hardwareUnidades.reduce<Record<string, HardwareUnidad[]>>((acc, u) => {
    const t = u.catalogo.tipo
    if (!acc[t]) acc[t] = []
    acc[t].push(u)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Materiales asignados</h3>
        <button onClick={() => setMostrarPicker(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Añadir del stock
        </button>
      </div>

      {mostrarPicker && (
        <div className="bg-white rounded-2xl border border-teal-200 p-5 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-3">Seleccionar del stock disponible</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Modelo</label>
              <select value={catalogoId} onChange={e => onModelChange(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
                <option value="">Seleccionar modelo…</option>
                {catalogo.map(c => (
                  <option key={c.id} value={c.id} disabled={c._stock.disponibles === 0}>
                    {HW_TIPO_LABEL[c.tipo] ?? c.tipo} — {c.marca} {c.modelo}
                    {c._stock.disponibles > 0 ? ` (${c._stock.disponibles} disp.)` : " — sin stock"}
                  </option>
                ))}
              </select>
            </div>

            {catalogoId && (
              loadingUnidades ? (
                <p className="text-sm text-gray-400">Cargando stock…</p>
              ) : unidadesDisp.length === 0 ? (
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-700">
                  Sin unidades disponibles para este modelo.{" "}
                  <Link href="/admin/configuracion" className="font-medium underline hover:text-amber-800">
                    Añadir stock en Configuración
                  </Link>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-600">Unidades disponibles</label>
                    <span className="text-xs text-gray-400">{seleccionados.size} seleccionada{seleccionados.size !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {unidadesDisp.map(u => (
                      <label key={u.id}
                        className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
                        style={seleccionados.has(u.id) ? { borderColor: TEAL, backgroundColor: `${TEAL}08` } : { borderColor: "#e5e7eb", backgroundColor: "#fff" }}>
                        <input type="checkbox" checked={seleccionados.has(u.id)} onChange={() => toggleSeleccion(u.id)}
                          className="w-4 h-4 rounded accent-teal-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          {u.numSerie ? (
                            <span className="text-xs font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded">S/N: {u.numSerie}</span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Sin número de serie</span>
                          )}
                          {u.notas && <p className="text-xs text-gray-400 mt-0.5">{u.notas}</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={cerrarPicker}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="button" onClick={confirmarAsignacion} disabled={asignando || seleccionados.size === 0}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: TEAL }}>
              {asignando ? "Asignando…" : `Asignar ${seleccionados.size || ""} unidad${seleccionados.size !== 1 ? "es" : ""}`}
            </button>
          </div>
        </div>
      )}

      {pp.hardwareUnidades.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-sm">Sin materiales asignados a este proyecto</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byTipo).map(([tipo, unidades]) => (
            <div key={tipo}>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                {HW_TIPO_LABEL[tipo] ?? tipo} <span className="text-gray-400 font-normal">({unidades.length})</span>
              </h4>
              <div className="space-y-2">
                {unidades.map(u => {
                  const hw = HW_ESTADO[u.estado] ?? { label: u.estado, color: "#6b7280", bg: "#f3f4f6" }
                  return (
                    <div key={u.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-100 p-3.5">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: hw.bg, color: hw.color }}>{hw.label}</span>
                          {u.numSerie && <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">S/N: {u.numSerie}</span>}
                        </div>
                        <p className="text-sm font-medium text-gray-900">{u.catalogo.marca} {u.catalogo.modelo}</p>
                        {u.notas && <p className="text-xs text-gray-400 mt-0.5">{u.notas}</p>}
                      </div>
                      <button onClick={() => desasignarHW(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors ml-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ========== TAB CONTACTOS ==========

function TabContactos({ pp, onUpdate }: { pp: PreProyecto; onUpdate: (p: PreProyecto) => void }) {
  const { success, error: toastError } = useToast()
  const [contactosHospital, setContactosHospital] = useState<Contacto[]>([])
  const [guardando, setGuardando] = useState(false)
  const linked = new Set(pp.contactos.map(c => c.contacto.id))

  useEffect(() => {
    fetch(`/api/hospitales/${pp.hospital.id}/contactos`).then(r => r.json()).then(data => {
      setContactosHospital(Array.isArray(data) ? data : [])
    })
  }, [pp.hospital.id])

  async function vincular(c: Contacto) {
    setGuardando(true)
    try {
      await fetch(`/api/pre-proyectos/${pp.id}/contactos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactoId: c.id }),
      })
      onUpdate({ ...pp, contactos: [...pp.contactos, { contacto: c }] })
      success("Contacto vinculado")
    } catch {
      toastError("Error")
    } finally {
      setGuardando(false)
    }
  }

  async function desvincular(contactoId: string) {
    try {
      await fetch(`/api/pre-proyectos/${pp.id}/contactos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactoId }),
      })
      onUpdate({ ...pp, contactos: pp.contactos.filter(c => c.contacto.id !== contactoId) })
      success("Contacto desvinculado")
    } catch {
      toastError("Error")
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Contactos vinculados al proyecto</h3>
        {pp.contactos.length === 0 ? (
          <p className="text-sm text-gray-400">Sin contactos vinculados</p>
        ) : (
          <div className="space-y-2">
            {pp.contactos.map(({ contacto: c }) => (
              <div key={c.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-100 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{c.nombre}</p>
                    {c.principal && <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">Principal</span>}
                  </div>
                  {c.cargo && <p className="text-sm text-gray-500">{c.cargo}</p>}
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    {c.email && <span>{c.email}</span>}
                    {c.telefono && <span>{c.telefono}</span>}
                  </div>
                </div>
                <button onClick={() => desvincular(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors ml-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {contactosHospital.filter(c => !linked.has(c.id)).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Contactos del hospital disponibles</h4>
          <div className="space-y-2">
            {contactosHospital.filter(c => !linked.has(c.id)).map(c => (
              <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-xl border border-gray-100 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">{c.nombre}</p>
                  {c.cargo && <p className="text-xs text-gray-400">{c.cargo}</p>}
                </div>
                <button onClick={() => vincular(c)} disabled={guardando}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium text-white disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: TEAL }}>
                  Vincular
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ========== TAB VISITAS ==========

function TabVisitas({ pp, onUpdate }: { pp: PreProyecto; onUpdate: (p: PreProyecto) => void }) {
  const router = useRouter()
  const { error: toastError } = useToast()
  const estadoColor = (e: string) => VISITA_ESTADO_COLOR[e] ?? "#6b7280"
  const [mostrarCrear, setMostrarCrear] = useState(false)
  const [tipoCrear, setTipoCrear] = useState("PROYECTOS")
  const [creando, setCreando] = useState(false)

  async function crearVisita() {
    setCreando(true)
    try {
      const r = await fetch("/api/visitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalId: pp.hospital.id, tipo: tipoCrear, preProyectoId: pp.id }),
      })
      if (!r.ok) throw new Error()
      const nueva = await r.json()
      onUpdate({ ...pp, visitas: [{ id: nueva.id, fecha: nueva.fecha, estado: nueva.estado, tipo: nueva.tipo, usuario: { nombre: "" } }, ...pp.visitas] })
      router.push(`/visitas/${nueva.id}`)
    } catch {
      toastError("Error al crear la visita")
    } finally {
      setCreando(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Visitas vinculadas</h3>
        <div className="flex items-center gap-2">
          <Link href={`/visitas?preProyectoId=${pp.id}`}
            className="text-sm text-gray-400 hover:text-teal-600 font-medium transition-colors">Ver todas</Link>
          <button onClick={() => setMostrarCrear(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl text-white transition-colors"
            style={{ backgroundColor: TEAL }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Visita
          </button>
        </div>
      </div>

      {mostrarCrear && (
        <div className="bg-white rounded-2xl border border-teal-200 p-5 shadow-sm mb-4">
          <h4 className="font-semibold text-gray-900 mb-3">Nueva visita vinculada</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo de visita</label>
              <div className="flex gap-2">
                {["PROYECTOS", "VENTAS"].map(t => (
                  <button key={t} type="button" onClick={() => setTipoCrear(t)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all"
                    style={tipoCrear === t ? { backgroundColor: TEAL, color: "#fff", borderColor: TEAL } : { backgroundColor: "#fff", color: "#374151", borderColor: "#e5e7eb" }}>
                    {t === "PROYECTOS" ? "Proyectos" : "Ventas"}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-400">Se creará en borrador vinculada a <span className="font-medium text-gray-600">{pp.hospital.nombre}</span></p>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setMostrarCrear(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={crearVisita} disabled={creando}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: TEAL }}>
              {creando ? "Creando…" : "Crear y abrir"}
            </button>
          </div>
        </div>
      )}

      {pp.visitas.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Sin visitas vinculadas</p>
          <p className="text-xs mt-1">Crea una nueva visita con el botón de arriba</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pp.visitas.map(v => (
            <Link key={v.id} href={`/visitas/${v.id}`}
              className="flex items-center justify-between bg-white rounded-xl border border-gray-100 p-4 hover:border-teal-200 transition-colors group">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                    backgroundColor: estadoColor(v.estado) + "18",
                    color: estadoColor(v.estado),
                  }}>
                    {v.estado}
                  </span>
                  <span className="text-xs text-gray-400">{v.tipo}</span>
                </div>
                <p className="text-sm font-medium text-gray-900">{fmtFecha(v.fecha)}</p>
                <p className="text-xs text-gray-400">{v.usuario.nombre}</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="text-gray-300 group-hover:text-teal-400 transition-colors">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ========== TAB RESUMEN ==========

const TIPO_H_LABEL: Record<string, string> = {
  HOSPITAL_PUBLICO: "Hospital Público", HOSPITAL_PRIVADO: "Hospital Privado",
  CLINICA_PRIVADA: "Clínica Privada", LABORATORIO: "Laboratorio",
  CENTRO_SALUD: "Centro de Salud", UNIVERSIDAD: "Universidad", OTRO: "Otro",
}

function TabResumen({ pp, onUpdate }: { pp: PreProyecto; onUpdate: (p: PreProyecto) => void }) {
  const { success, error: toastError } = useToast()
  const [shareModal, setShareModal] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [savingMapa, setSavingMapa] = useState(false)
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const mapRef = useRef<HTMLIFrameElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mapH, setMapH] = useState(560)

  useEffect(() => {
    setOrigin(window.location.origin)
    const style = document.createElement("style")
    style.id = "resumen-print-css"
    style.innerHTML = `
      @media print {
        body * { visibility: hidden !important; }
        #resumen-print-zone, #resumen-print-zone * { visibility: visible !important; }
        #resumen-print-zone { position: absolute; left: 0; top: 0; width: 100%; padding: 32px; box-sizing: border-box; }
        @page { size: A4; margin: 12mm; }
      }
    `
    document.head.appendChild(style)
    return () => { document.getElementById("resumen-print-css")?.remove() }
  }, [])

  const shareUrl = pp.shareToken && origin ? `${origin}/share/proyecto/${pp.shareToken}` : null

  async function generateShare() {
    setGenerando(true)
    try {
      const r = await fetch(`/api/pre-proyectos/${pp.id}/share`, { method: "POST" })
      if (!r.ok) throw new Error()
      const { token } = await r.json()
      onUpdate({ ...pp, shareToken: token })
      success("Enlace generado")
    } catch { toastError("Error al generar enlace") }
    finally { setGenerando(false) }
  }

  async function revokeShare() {
    setRevoking(true)
    try {
      await fetch(`/api/pre-proyectos/${pp.id}/share`, { method: "DELETE" })
      onUpdate({ ...pp, shareToken: null })
      success("Enlace revocado"); setCopied(false)
    } catch { toastError("Error") }
    finally { setRevoking(false) }
  }

  async function copyLink() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  async function saveMapaContent(html: string) {
    setSavingMapa(true)
    try {
      const r = await fetch(`/api/pre-proyectos/${pp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapaHtml: html || null }),
      })
      if (!r.ok) throw new Error()
      onUpdate({ ...pp, mapaHtml: html || null })
      success(html ? "Mapa importado" : "Mapa eliminado")
    } catch { toastError("Error al guardar mapa") }
    finally { setSavingMapa(false) }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    readFile(file)
    e.target.value = ""
  }

  function readFile(file: File) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      if (content) saveMapaContent(content)
    }
    reader.readAsText(file, "utf-8")
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = Array.from(e.dataTransfer.files).find(f => f.name.endsWith(".html") || f.name.endsWith(".htm"))
    if (file) readFile(file)
    else toastError("Solo se aceptan ficheros .html o .htm")
  }

  function printMapa() {
    if (!pp.mapaHtml) { toastError("No hay mapa importado"); return }
    const win = window.open("", "_blank", "width=1200,height=900")
    if (!win) { toastError("Permite ventanas emergentes para imprimir"); return }
    const safeHtml = pp.mapaHtml.replace(/"/g, "&quot;")
    const fecha = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
    win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${pp.titulo} — Mapa de Instalación</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff}
    .hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 24px;border-bottom:3px solid #00A99D;background:#fff;height:57px}
    .brand{font-weight:800;color:#00A99D;font-size:16px;letter-spacing:-0.3px}
    .brand em{font-style:normal;color:#F7941D}
    .meta{font-size:11px;color:#9ca3af;text-align:right;line-height:1.6}
    .meta strong{color:#374151}
    .map-frame{width:100%;border:none;display:block;height:calc(100vh - 57px)}
    .ftr{display:none}
    @media print{
      .hdr{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .ftr{display:block;position:fixed;bottom:0;left:0;right:0;padding:5px 24px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;text-align:center;background:#fff}
      @page{margin:0}
    }
  </style>
</head>
<body>
  <div class="hdr">
    <span class="brand">Palex Medical · <em>InLab</em></span>
    <div class="meta"><strong>${pp.titulo}</strong><br>${pp.hospital.nombre} · ${fecha}</div>
  </div>
  <iframe class="map-frame" srcdoc="${safeHtml}" sandbox="allow-scripts allow-same-origin"></iframe>
  <div class="ftr">Palex Medical · InLab — Confidencial — ${fecha}</div>
</body>
</html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { try { win.print() } catch { /* closed */ } }, 800)
  }

  function printInformeCompleto() {
    const win = window.open("", "_blank", "width=1050,height=900")
    if (!win) { toastError("Permite ventanas emergentes para imprimir"); return }
    const e = (s: string | null | undefined) =>
      String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    const fecha = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
    const estadoColor = ESTADO_COLOR[pp.estado]?.text ?? "#6b7280"
    const estadoBg = ESTADO_COLOR[pp.estado]?.bg ?? "#f3f4f6"
    const estadoLabel = ESTADO_LABEL[pp.estado] ?? pp.estado
    const prioLabel = PRIORIDAD[pp.prioridad]?.label ?? ""
    const prioColor = PRIORIDAD[pp.prioridad]?.color ?? ""
    const tipoH = pp.hospital.tipo ? (TIPO_H_LABEL[pp.hospital.tipo] ?? pp.hospital.tipo) : ""
    const fasesRows = pp.fases.map(f => {
      const cols: Record<string,string> = { COMPLETADO:"#16a34a", EN_PROGRESO:"#00A99D", BLOQUEADO:"#dc2626", PENDIENTE:"#9ca3af" }
      const lbls: Record<string,string> = { COMPLETADO:"Completado", EN_PROGRESO:"En progreso", BLOQUEADO:"Bloqueado", PENDIENTE:"Pendiente" }
      return `<tr><td class="cell">${e(f.nombre)}</td><td class="cell" style="color:${cols[f.estado]??'#9ca3af'};font-weight:600">${lbls[f.estado]??f.estado}</td><td class="cell tr">${fmtFecha(f.fechaReal ?? f.fechaPlan)}</td></tr>`
    }).join("")
    const hitosHTML = pp.hitos.map(h =>
      `<span class="hito ${h.completado?"hito-ok":"hito-pend"}">${h.completado?"✓":"◇"} ${e(h.titulo)} · ${fmtFecha(h.fecha)}</span>`
    ).join("")
    const hwSections = Object.entries(byTipo).map(([tipo, units]) => {
      const sub = units.reduce((s,u) => s + (u.catalogo.precio ?? 0), 0)
      const rows = units.map(u =>
        `<tr><td class="cell">${e(u.catalogo.marca)} ${e(u.catalogo.modelo)}</td><td class="cell mono">${e(u.numSerie??"—")}</td><td class="cell" style="color:${HW_ESTADO[u.estado]?.color??"#6b7280"}">${HW_ESTADO[u.estado]?.label??u.estado}</td><td class="cell tr">${u.catalogo.precio!=null?u.catalogo.precio.toLocaleString("es-ES",{style:"currency",currency:"EUR"}):"—"}</td></tr>`
      ).join("")
      return `<div class="hw-group"><p class="hw-tipo">${e(HW_TIPO_LABEL[tipo]??tipo)} (${units.length})</p><table class="tbl"><thead><tr><th>Modelo</th><th>N/S</th><th>Estado</th><th class="tr">Precio/ud</th></tr></thead><tbody>${rows}</tbody>${sub>0?`<tfoot><tr><td colspan="3" class="sub-lbl">Subtotal</td><td class="sub-val tr">${sub.toLocaleString("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0})}</td></tr></tfoot>`:""}</table></div>`
    }).join("")
    const visitasRows = pp.visitas.slice(0,8).map(v => {
      const col = v.estado==="COMPLETADA"?"#16a34a":v.estado==="BORRADOR"?"#d97706":"#6b7280"
      return `<tr><td class="cell">${fmtFecha(v.fecha)}</td><td class="cell" style="color:${col};font-weight:600">${e(v.estado)}</td><td class="cell">${e(v.tipo)}</td><td class="cell">${e(v.usuario.nombre)}</td></tr>`
    }).join("")
    const contactosHTML = pp.contactos.map(({contacto:c}) =>
      `<div class="contact"><p class="cn">${e(c.nombre)}${c.principal?` <span class="badge-p">Principal</span>`:""}</p>${c.cargo?`<p class="cm">${e(c.cargo)}</p>`:""}${c.email?`<p class="cm">${e(c.email)}</p>`:""}${c.telefono?`<p class="cm">${e(c.telefono)}</p>`:""}</div>`
    ).join("")
    const pb = `<div class="pw"><div class="pb" style="width:${pct}%;background:${pct===100?"#16a34a":"#00A99D"}"></div></div>`
    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>${e(pp.titulo)} — Informe de Proyecto</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;background:#fff;font-size:13px}
.toolbar{display:flex;align-items:center;justify-content:space-between;padding:12px 28px;background:#f8fafc;border-bottom:2px solid #e5e7eb;position:sticky;top:0;z-index:10}
.tb{font-weight:800;color:#00A99D;font-size:15px}.tb em{color:#F7941D;font-style:normal}
.bp{padding:8px 20px;background:#00A99D;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer}
.bc{padding:8px 16px;background:#f3f4f6;color:#374151;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;margin-left:8px}
.cover{min-height:100vh;display:flex;flex-direction:column;border-top:8px solid #00A99D;page-break-after:always;break-after:page}
.ctop{padding:32px 44px 0;display:flex;justify-content:space-between;align-items:center}
.cbrand{font-size:18px;font-weight:800;color:#00A99D;letter-spacing:-0.5px}.cbrand em{color:#F7941D;font-style:normal}
.cbody{flex:1;display:flex;flex-direction:column;justify-content:center;padding:40px 44px 28px}
.eye{font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#9ca3af;margin-bottom:14px}
.ctitle{font-size:38px;font-weight:800;color:#111827;line-height:1.1;letter-spacing:-0.5px;margin-bottom:8px}
.chosp{font-size:18px;font-weight:600;color:#374151;margin-bottom:4px}
.cloc{font-size:13px;color:#9ca3af;margin-bottom:24px}
.cbadges{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px}
.badge{display:inline-block;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700}
.cmeta{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:20px;background:#f8fafc;border-radius:14px;border:1px solid #e5e7eb;margin-bottom:20px}
.mi p:first-child{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:3px}
.mi p:last-child{font-size:15px;font-weight:800;color:#111827}
.pl{display:flex;justify-content:space-between;font-size:11px;color:#6b7280;margin-bottom:5px}
.pw{width:100%;height:8px;background:#e5e7eb;border-radius:99px;overflow:hidden}
.pb{height:100%;border-radius:99px}
.cfooter{padding:18px 44px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center}
.cfb{font-size:12px;font-weight:700;color:#9ca3af}.cfc{font-size:11px;color:#d1d5db;font-style:italic}
.content{padding:28px 44px;max-width:920px;margin:0 auto}
.phdr{display:none}
.sec{margin-bottom:28px}
.stitle{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#9ca3af;margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid #f3f4f6}
.kgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.kcard{background:#f8fafc;border-radius:12px;padding:14px;border-top:3px solid}
.kl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:5px}
.kv{font-size:22px;font-weight:800;line-height:1}
.ks{font-size:10px;color:#9ca3af;margin-top:3px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.card{background:#f8fafc;border-radius:12px;padding:14px}
.ri{display:flex;gap:8px;margin-bottom:5px}
.rl{font-size:11px;color:#9ca3af;width:60px;flex-shrink:0}
.rv{font-size:12px;font-weight:600;color:#374151}
.contact{margin-bottom:10px}
.cn{font-size:13px;font-weight:700;color:#111827}
.cm{font-size:11px;color:#6b7280;margin-top:1px}
.badge-p{display:inline-block;font-size:9px;background:#00A99D18;color:#00A99D;padding:1px 6px;border-radius:10px;font-weight:700;margin-left:5px}
.tbl{width:100%;border-collapse:collapse;font-size:12px}
.tbl thead th{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#9ca3af;padding:0 0 7px;text-align:left;border-bottom:1px solid #e5e7eb}
.cell{padding:7px 8px 7px 0;border-bottom:1px solid #f9fafb;vertical-align:top}
.tr{text-align:right;padding-right:0}
.mono{font-family:monospace;font-size:11px;color:#6b7280}
.sub-lbl{padding-top:7px;font-size:11px;font-weight:600;color:#6b7280}
.sub-val{padding-top:7px;font-weight:700;color:#111827;text-align:right}
.hw-group{margin-bottom:18px}
.hw-tipo{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;margin-bottom:7px}
.hw-total{margin-top:10px;padding-top:10px;border-top:2px solid #e5e7eb;display:flex;justify-content:space-between;font-size:14px;font-weight:800}
.hitos-wrap{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px}
.hito{display:inline-flex;align-items:center;gap:5px;font-size:11px;padding:4px 11px;border-radius:20px;border:1px solid}
.hito-ok{background:#f0fdf4;border-color:#bbf7d0;color:#16a34a}
.hito-pend{background:#fffbeb;border-color:#fde68a;color:#d97706}
.nt{font-size:13px;color:#374151;line-height:1.7;white-space:pre-wrap}
.pfooter{display:none}
@media print{
  .toolbar,.no-print{display:none!important}
  .cover{min-height:100vh;page-break-after:always;break-after:page}
  .phdr{display:flex!important;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:2px solid #00A99D;margin-bottom:20px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .phb{font-weight:800;color:#00A99D;font-size:12px}.phb em{color:#F7941D;font-style:normal}
  .phm{font-size:10px;color:#9ca3af;text-align:right}
  .kgrid,.cmeta{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .pfooter{display:flex!important;justify-content:space-between;padding-top:10px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;margin-top:28px}
  @page{margin:14mm 14mm 18mm;size:A4}
  @page:first{margin:0;size:A4}
}
</style></head><body>
<div class="toolbar no-print">
  <span class="tb">Palex Medical · <em>InLab</em></span>
  <div><button class="bp" onclick="window.print()">Imprimir / Guardar PDF</button><button class="bc" onclick="window.close()">Cerrar</button></div>
</div>
<div class="cover">
  <div class="ctop">
    <span class="cbrand">Palex Medical · <em>InLab</em></span>
    <span style="font-size:11px;color:#9ca3af">Informe confidencial · ${e(fecha)}</span>
  </div>
  <div class="cbody">
    <p class="eye">Informe de Proyecto</p>
    <h1 class="ctitle">${e(pp.titulo)}</h1>
    <p class="chosp">${e(pp.hospital.nombre)}</p>
    <p class="cloc">${e(pp.hospital.ciudad)}${pp.hospital.provincia?", "+e(pp.hospital.provincia):""}${tipoH?" · "+e(tipoH):""}${pp.hospital.camas?" · "+pp.hospital.camas+" camas":""}</p>
    <div class="cbadges">
      <span class="badge" style="background:${estadoBg};color:${estadoColor}">${estadoLabel}</span>
      ${pp.prioridad>0?`<span class="badge" style="background:#fff7ed;color:${e(prioColor)}">${e(prioLabel)}</span>`:""}
      ${pp.hospital.zona?`<span class="badge" style="background:#f0f9ff;color:#0369a1">Zona ${e(pp.hospital.zona.nombre)}</span>`:""}
    </div>
    <div class="cmeta">
      <div class="mi"><p>Presupuesto</p><p>${pp.presupuesto!=null?pp.presupuesto.toLocaleString("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}):"—"}</p></div>
      <div class="mi"><p>Inicio planificado</p><p>${fmtFecha(pp.fechaInicio)}</p></div>
      <div class="mi"><p>Fin planificado</p><p>${fmtFecha(pp.fechaFinPlan)}</p></div>
      ${pp.responsable?`<div class="mi"><p>Responsable</p><p>${e(pp.responsable.nombre)}</p></div>`:""}
      <div class="mi"><p>Hardware</p><p>${pp.hardwareUnidades.length} uds${totalHW>0?" · "+totalHW.toLocaleString("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}):""}</p></div>
      <div class="mi"><p>Visitas</p><p>${pp.visitas.length} (${visitasOK} completadas)</p></div>
    </div>
    <div class="pl"><span>${fasesOK} de ${pp.fases.length} fases completadas</span><span style="font-weight:700;color:${pct===100?"#16a34a":"#00A99D"}">${pct}%</span></div>
    ${pb}
  </div>
  <div class="cfooter"><span class="cfb">Palex Medical · InLab</span><span class="cfc">Documento confidencial — uso interno</span></div>
</div>
<div class="content">
  <div class="phdr"><span class="phb">Palex Medical · <em>InLab</em></span><div class="phm"><strong>${e(pp.titulo)}</strong><br>${e(fecha)}</div></div>
  <div class="sec"><p class="stitle">Indicadores del proyecto</p>
    <div class="kgrid">
      <div class="kcard" style="border-top-color:${pct===100?"#16a34a":"#00A99D"}"><p class="kl">Progreso</p><p class="kv" style="color:${pct===100?"#16a34a":"#00A99D"}">${pct}%</p><p class="ks">${fasesOK}/${pp.fases.length} fases</p></div>
      <div class="kcard" style="border-top-color:#7c3aed"><p class="kl">Hardware</p><p class="kv" style="color:#7c3aed">${pp.hardwareUnidades.length} uds</p><p class="ks">${totalHW>0?totalHW.toLocaleString("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}):"Sin precios"}</p></div>
      <div class="kcard" style="border-top-color:#0369a1"><p class="kl">Visitas</p><p class="kv" style="color:#0369a1">${pp.visitas.length}</p><p class="ks">${visitasOK} completadas</p></div>
      <div class="kcard" style="border-top-color:#F7941D"><p class="kl">Duración</p><p class="kv" style="color:#F7941D">${duracionDias?duracionDias+" d":"—"}</p><p class="ks">${duracionDias?"días planificados":"Sin fechas"}</p></div>
    </div>
  </div>
  <div class="sec two">
    <div class="card"><p class="stitle">Datos del hospital</p>
      ${tipoH?`<div class="ri"><span class="rl">Tipo</span><span class="rv">${e(tipoH)}</span></div>`:""}
      <div class="ri"><span class="rl">Ciudad</span><span class="rv">${e(pp.hospital.ciudad)}${pp.hospital.provincia?", "+e(pp.hospital.provincia):""}</span></div>
      ${pp.hospital.camas?`<div class="ri"><span class="rl">Camas</span><span class="rv">${pp.hospital.camas}</span></div>`:""}
      ${pp.hospital.direccion?`<div class="ri"><span class="rl">Dirección</span><span class="rv">${e(pp.hospital.direccion)}</span></div>`:""}
      ${pp.hospital.zona?`<div class="ri"><span class="rl">Zona</span><span class="rv">${e(pp.hospital.zona.nombre)}</span></div>`:""}
      ${pp.hospital.pais?`<div class="ri"><span class="rl">País</span><span class="rv">${e(pp.hospital.pais)}</span></div>`:""}
    </div>
    <div class="card"><p class="stitle">Contactos del proyecto</p>
      ${pp.contactos.length>0?contactosHTML:`<p style="font-size:12px;color:#9ca3af">Sin contactos vinculados</p>`}
    </div>
  </div>
  ${pp.fases.length>0?`<div class="sec"><p class="stitle">Fases del proyecto</p><table class="tbl"><thead><tr><th>Fase</th><th>Estado</th><th class="tr">Fecha</th></tr></thead><tbody>${fasesRows}</tbody></table>${hitosHTML?`<div class="hitos-wrap">${hitosHTML}</div>`:""}</div>`:""}
  ${pp.hardwareUnidades.length>0?`<div class="sec"><p class="stitle">Inventario de hardware</p>${hwSections}${totalHW>0?`<div class="hw-total"><span>Total hardware</span><span style="color:#00A99D">${totalHW.toLocaleString("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0})}</span></div>`:""}</div>`:""}
  ${pp.visitas.length>0?`<div class="sec"><p class="stitle">Visitas (${pp.visitas.length})</p><table class="tbl"><thead><tr><th>Fecha</th><th>Estado</th><th>Tipo</th><th>Técnico</th></tr></thead><tbody>${visitasRows}</tbody></table>${pp.visitas.length>8?`<p style="font-size:11px;color:#9ca3af;margin-top:7px">+${pp.visitas.length-8} visitas adicionales</p>`:""}</div>`:""}
  ${pp.descripcion||pp.notas?`<div class="sec"><p class="stitle">Notas y descripción</p>${pp.descripcion?`<div style="margin-bottom:14px"><p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:5px">Descripción</p><p class="nt">${e(pp.descripcion)}</p></div>`:""}${pp.notas?`<div><p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:5px">Notas internas</p><p class="nt">${e(pp.notas)}</p></div>`:""}</div>`:""}
  <div class="pfooter"><span>Palex Medical · InLab — Confidencial</span><span>Generado: ${e(fecha)}</span></div>
</div>
</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { try { win.print() } catch { /* closed */ } }, 600)
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(pp, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `proyecto-${pp.id}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  function exportHWCSV() {
    const rows = [
      ["Tipo", "Marca", "Modelo", "N_Serie", "Estado", "Precio_EUR"],
      ...pp.hardwareUnidades.map(u => [
        HW_TIPO_LABEL[u.catalogo.tipo] ?? u.catalogo.tipo,
        u.catalogo.marca, u.catalogo.modelo,
        u.numSerie ?? "",
        HW_ESTADO[u.estado]?.label ?? u.estado,
        u.catalogo.precio != null ? String(u.catalogo.precio) : "",
      ]),
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `hardware-${pp.id}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function handleMapLoad(e: React.SyntheticEvent<HTMLIFrameElement>) {
    try {
      const doc = e.currentTarget.contentDocument
      if (doc) setMapH(Math.max(400, Math.min(doc.documentElement.scrollHeight + 32, 8000)))
    } catch { setMapH(3000) }
  }

  const fasesOK = pp.fases.filter(f => f.estado === "COMPLETADO").length
  const pct = pp.fases.length ? Math.round((fasesOK / pp.fases.length) * 100) : 0
  const totalHW = pp.hardwareUnidades.reduce((s, u) => s + (u.catalogo.precio ?? 0), 0)
  const visitasOK = pp.visitas.filter(v => v.estado === "COMPLETADA").length
  const estadoStyle = ESTADO_COLOR[pp.estado] ?? { bg: "#f3f4f6", text: "#6b7280" }
  const genDate = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
  const byTipo = pp.hardwareUnidades.reduce<Record<string, HardwareUnidad[]>>((acc, u) => {
    const t = u.catalogo.tipo; if (!acc[t]) acc[t] = []; acc[t].push(u); return acc
  }, {})
  const duracionDias = pp.fechaInicio && pp.fechaFinPlan
    ? Math.round((new Date(pp.fechaFinPlan).getTime() - new Date(pp.fechaInicio).getTime()) / 86400000)
    : null

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6 print:hidden">
        <div>
          <h3 className="font-bold text-gray-900 text-base">Resumen del proyecto</h3>
          <p className="text-xs text-gray-400 mt-0.5">Vista 360° · {pp.hospital.nombre}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Primarios */}
          <button onClick={printInformeCompleto}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-85 shadow-sm"
            style={{ backgroundColor: TEAL }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            Informe completo
          </button>
          <button onClick={printMapa}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition-colors hover:opacity-85 shadow-sm"
            style={{ borderColor: TEAL, color: TEAL }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
            </svg>
            Mapa
          </button>
          <button onClick={() => setShareModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition-colors hover:bg-teal-50 shadow-sm"
            style={{ borderColor: TEAL, color: TEAL }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Compartir
          </button>
          {/* Separador */}
          <div className="w-px h-6 bg-gray-200 hidden sm:block" />
          {/* Secundarios */}
          <button onClick={exportJSON}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            JSON
          </button>
          {pp.hardwareUnidades.length > 0 && (
            <button onClick={exportHWCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              CSV
            </button>
          )}
          <div className="w-px h-6 bg-gray-200 hidden sm:block" />
          <button onClick={() => fileInputRef.current?.click()} disabled={savingMapa}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {savingMapa ? "Guardando…" : pp.mapaHtml ? "Reemplazar mapa" : "Importar mapa"}
          </button>
          {pp.mapaHtml && (
            <button onClick={() => saveMapaContent("")} disabled={savingMapa}
              title="Eliminar mapa"
              className="flex items-center justify-center w-9 h-9 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Printable zone */}
      <div id="resumen-print-zone" className="space-y-5">

        {/* Print header */}
        <div className="hidden print:flex items-start justify-between border-b border-gray-200 pb-5">
          <div>
            <p className="text-xl font-bold" style={{ color: TEAL }}>Palex Medical · InLab</p>
            <p className="text-sm text-gray-500 mt-0.5">Informe de Proyecto — Confidencial</p>
          </div>
          <p className="text-xs text-gray-400">Generado: {genDate}</p>
        </div>

        {/* Header card — solo impresión */}
        <div className="hidden print:block bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: estadoStyle.bg, color: estadoStyle.text }}>{ESTADO_LABEL[pp.estado]}</span>
                {pp.prioridad > 0 && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-50" style={{ color: PRIORIDAD[pp.prioridad]?.color }}>{PRIORIDAD[pp.prioridad]?.label}</span>}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{pp.titulo}</h2>
              <p className="text-gray-600">
                <span className="font-semibold text-gray-800">{pp.hospital.nombre}</span>
                {" · "}{pp.hospital.ciudad}{pp.hospital.provincia ? `, ${pp.hospital.provincia}` : ""}
                {pp.hospital.tipo && <> · <span className="text-gray-500">{TIPO_H_LABEL[pp.hospital.tipo] ?? pp.hospital.tipo}</span></>}
                {pp.hospital.camas ? ` · ${pp.hospital.camas} camas` : ""}
              </p>
              <p className="text-sm text-gray-400 mt-0.5">
                {pp.responsable && <><span className="font-medium text-gray-600">{pp.responsable.nombre}</span>{" · "}</>}
                {pp.hospital.zona && <>Zona: <span className="font-medium text-gray-600">{pp.hospital.zona.nombre}</span></>}
              </p>
            </div>
            <div className="shrink-0 text-right">
              {pp.presupuesto != null && <p className="text-2xl font-bold text-gray-900">{pp.presupuesto.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</p>}
              <p className="text-sm text-gray-400">{fmtFecha(pp.fechaInicio)} → {fmtFecha(pp.fechaFinPlan)}</p>
              {pp.fechaFinReal && <p className="text-xs font-semibold text-green-600 mt-0.5">Entregado: {fmtFecha(pp.fechaFinReal)}</p>}
            </div>
          </div>
          <div className="mt-5">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>{fasesOK} de {pp.fases.length} fases completadas</span>
              <span className="font-bold" style={{ color: pct === 100 ? "#16a34a" : TEAL }}>{pct}%</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#16a34a" : TEAL }} />
            </div>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Progreso",  val: `${pct}%`,                          sub: `${fasesOK}/${pp.fases.length} fases`,                                                       color: pct === 100 ? "#16a34a" : TEAL },
            { label: "Hardware",  val: `${pp.hardwareUnidades.length} uds`, sub: totalHW > 0 ? totalHW.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }) : "Sin precios registrados", color: "#7c3aed" },
            { label: "Visitas",   val: `${pp.visitas.length}`,              sub: `${visitasOK} completadas`,                                                                  color: "#0369a1" },
            { label: "Duración",  val: duracionDias ? `${duracionDias} d` : "—", sub: duracionDias ? "días planificados" : (pp.fechaFinReal ? "Entregado" : "Sin fechas"),    color: ORANGE },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="h-1 w-full" style={{ backgroundColor: k.color }} />
              <div className="p-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{k.label}</p>
                <p className="text-2xl font-bold leading-none" style={{ color: k.color }}>{k.val}</p>
                <p className="text-xs text-gray-400 mt-1.5">{k.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Compartir activo */}
        {pp.shareToken && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border print:hidden"
            style={{ backgroundColor: `${TEAL}08`, borderColor: `${TEAL}30` }}>
            <div className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: TEAL }} />
            <p className="text-xs text-gray-600 flex-1">Enlace público activo — cualquier persona con el enlace puede ver este resumen</p>
            <button onClick={() => setShareModal(true)} className="text-xs font-semibold shrink-0" style={{ color: TEAL }}>Gestionar</button>
          </div>
        )}

        {/* Hospital + contactos */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Datos del hospital</p>
            <div className="space-y-1.5">
              {pp.hospital.tipo && <RowInfo label="Tipo" value={TIPO_H_LABEL[pp.hospital.tipo] ?? pp.hospital.tipo} />}
              <RowInfo label="Ciudad" value={`${pp.hospital.ciudad}${pp.hospital.provincia ? `, ${pp.hospital.provincia}` : ""}`} />
              {pp.hospital.camas && <RowInfo label="Camas" value={String(pp.hospital.camas)} />}
              {pp.hospital.direccion && <RowInfo label="Dirección" value={pp.hospital.direccion} />}
              {pp.hospital.zona && <RowInfo label="Zona" value={pp.hospital.zona.nombre} />}
              {pp.hospital.pais && <RowInfo label="País" value={pp.hospital.pais} />}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Contactos del proyecto</p>
            {pp.contactos.length === 0 ? (
              <p className="text-sm text-gray-400">Sin contactos vinculados</p>
            ) : (
              <div className="space-y-2.5">
                {pp.contactos.map(({ contacto: c }) => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5" style={{ backgroundColor: TEAL }}>
                      {c.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{c.nombre}
                        {c.principal && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${TEAL}18`, color: TEAL }}>Principal</span>}
                      </p>
                      {c.cargo && <p className="text-xs text-gray-500">{c.cargo}</p>}
                      <div className="flex gap-2 mt-0.5 text-xs text-gray-400 flex-wrap">
                        {c.email && <span>{c.email}</span>}
                        {c.telefono && <span>{c.telefono}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Timeline compact */}
        {pp.fases.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Fases del proyecto</p>
            <div className="space-y-1.5">
              {pp.fases.map(f => {
                const s = FASE_ESTADO_COLOR[f.estado] ?? FASE_ESTADO_COLOR.PENDIENTE
                return (
                  <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ backgroundColor: s.bg }}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
                    <span className="flex-1 text-sm font-medium text-gray-800 truncate">{f.nombre}</span>
                    <span className="text-xs font-semibold shrink-0" style={{ color: s.text }}>
                      {f.estado === "PENDIENTE" ? "Pendiente" : f.estado === "EN_PROGRESO" ? "En progreso" : f.estado === "COMPLETADO" ? "Completado" : "Bloqueado"}
                    </span>
                    {(f.fechaReal ?? f.fechaPlan) && (
                      <span className="text-xs text-gray-400 shrink-0 hidden sm:block">{fmtFecha(f.fechaReal ?? f.fechaPlan)}</span>
                    )}
                  </div>
                )
              })}
            </div>
            {pp.hitos.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Hitos</p>
                <div className="flex flex-wrap gap-2">
                  {pp.hitos.map(h => (
                    <span key={h.id} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border"
                      style={h.completado ? { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0", color: "#16a34a" } : { backgroundColor: "#fffbeb", borderColor: "#fde68a", color: "#d97706" }}>
                      {h.completado ? "✓" : "◇"} {h.titulo} · {fmtFecha(h.fecha)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hardware table */}
        {pp.hardwareUnidades.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Inventario de hardware</p>
            <div className="space-y-5">
              {Object.entries(byTipo).map(([tipo, units]) => {
                const subtotal = units.reduce((s, u) => s + (u.catalogo.precio ?? 0), 0)
                return (
                  <div key={tipo}>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                      {HW_TIPO_LABEL[tipo] ?? tipo} <span className="font-normal text-gray-400">({units.length})</span>
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            {["Modelo", "N/S", "Estado", "Precio/ud"].map((h, i) => (
                              <th key={h} className={`text-xs font-semibold text-gray-400 pb-2 ${i === 3 ? "text-right" : "text-left pr-4"}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {units.map(u => (
                            <tr key={u.id} className="border-b border-gray-50 last:border-0">
                              <td className="py-2 pr-4 font-medium text-gray-800">{u.catalogo.marca} {u.catalogo.modelo}</td>
                              <td className="py-2 pr-4 font-mono text-xs text-gray-500">{u.numSerie ?? "—"}</td>
                              <td className="py-2 pr-4">
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                  style={u.estado === "ASIGNADO" ? { backgroundColor: `${TEAL}18`, color: TEAL } : { backgroundColor: "#f3f4f6", color: "#6b7280" }}>
                                  {HW_ESTADO[u.estado]?.label ?? u.estado}
                                </span>
                              </td>
                              <td className="py-2 text-right text-gray-600">
                                {u.catalogo.precio != null ? u.catalogo.precio.toLocaleString("es-ES", { style: "currency", currency: "EUR" }) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {subtotal > 0 && (
                          <tfoot>
                            <tr className="border-t border-gray-200">
                              <td colSpan={3} className="pt-2 text-xs font-semibold text-gray-500">Subtotal</td>
                              <td className="pt-2 text-right font-bold text-gray-800">{subtotal.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
            {totalHW > 0 && (
              <div className="mt-5 pt-4 border-t-2 border-gray-200 flex justify-between items-center">
                <span className="font-bold text-gray-700">Total hardware</span>
                <span className="text-xl font-bold" style={{ color: TEAL }}>{totalHW.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</span>
              </div>
            )}
          </div>
        )}

        {/* Visitas */}
        {pp.visitas.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Visitas ({pp.visitas.length})</p>
            <div className="space-y-2">
              {pp.visitas.slice(0, 6).map(v => (
                <div key={v.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={v.estado === "COMPLETADA" ? { backgroundColor: "#f0fdf4", color: "#16a34a" }
                           : v.estado === "BORRADOR"   ? { backgroundColor: "#fffbeb", color: "#d97706" }
                           :                             { backgroundColor: "#f3f4f6", color: "#6b7280" }}>
                      {v.estado}
                    </span>
                    <span className="text-xs text-gray-500">{v.tipo}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{fmtFecha(v.fecha)}</p>
                    <p className="text-xs text-gray-400">{v.usuario.nombre}</p>
                  </div>
                </div>
              ))}
              {pp.visitas.length > 6 && <p className="text-xs text-center text-gray-400 pt-1">+{pp.visitas.length - 6} visitas más</p>}
            </div>
          </div>
        )}

        {/* Map */}
        {pp.mapaHtml ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Map toolbar */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between print:hidden bg-gray-50/60">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TEAL }} />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Mapa de instalación</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setFullscreen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                    <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
                  </svg>
                  Pantalla completa
                </button>
                <button onClick={printMapa}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  Imprimir
                </button>
                <div className="w-px h-4 bg-gray-200" />
                <button onClick={() => fileInputRef.current?.click()} disabled={savingMapa}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all disabled:opacity-40">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  {savingMapa ? "Guardando…" : "Actualizar"}
                </button>
              </div>
            </div>
            <iframe ref={mapRef} srcDoc={pp.mapaHtml} sandbox="allow-scripts allow-same-origin"
              onLoad={handleMapLoad} className="w-full border-0 block" style={{ height: mapH }} title="Mapa de instalación" />
          </div>
        ) : (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !savingMapa && fileInputRef.current?.click()}
            className="relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer print:hidden overflow-hidden group"
            style={{ borderColor: dragOver ? TEAL : "#e5e7eb", backgroundColor: dragOver ? `${TEAL}08` : "#fafafa" }}>
            {/* Subtle grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: "radial-gradient(circle, #00A99D 1px, transparent 1px)",
              backgroundSize: "24px 24px"
            }} />
            <div className="relative flex flex-col items-center justify-center py-14 px-8 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all duration-200 shadow-sm"
                style={{ backgroundColor: dragOver ? `${TEAL}20` : "#f3f4f6" }}>
                {savingMapa ? (
                  <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={dragOver ? TEAL : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-200">
                    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                    <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
                  </svg>
                )}
              </div>
              {savingMapa ? (
                <p className="text-sm font-semibold" style={{ color: TEAL }}>Cargando mapa…</p>
              ) : dragOver ? (
                <>
                  <p className="text-sm font-bold mb-1" style={{ color: TEAL }}>Suelta el fichero aquí</p>
                  <p className="text-xs text-gray-400">Se importará automáticamente</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Importar mapa de instalación</p>
                  <p className="text-xs text-gray-400 mb-5 max-w-xs">Arrastra un fichero <span className="font-mono font-bold">.html</span> aquí, o haz clic para abrirlo desde el explorador</p>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-opacity group-hover:opacity-90"
                      style={{ backgroundColor: TEAL }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      Seleccionar fichero
                    </span>
                    <span className="text-xs text-gray-300">o arrastra aquí</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Fullscreen overlay */}
        {fullscreen && pp.mapaHtml && (
          <div className="fixed inset-0 z-50 flex flex-col print:hidden" style={{ backgroundColor: "#000" }}>
            <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ backgroundColor: "#111", borderBottom: "1px solid #222" }}>
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm" style={{ color: TEAL }}>Palex Medical · InLab</span>
                <span className="text-gray-500 text-xs">·</span>
                <span className="text-gray-300 text-xs">{pp.titulo}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={printMapa}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  Imprimir
                </button>
                <button onClick={() => setFullscreen(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
                    <path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
                  </svg>
                  Cerrar
                </button>
              </div>
            </div>
            <iframe srcDoc={pp.mapaHtml} sandbox="allow-scripts allow-same-origin"
              className="flex-1 border-0 w-full" title="Mapa pantalla completa" />
          </div>
        )}

        {/* Notas */}
        {(pp.descripcion || pp.notas) && (
          <div className="grid sm:grid-cols-2 gap-4">
            {pp.descripcion && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Descripción</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{pp.descripcion}</p>
              </div>
            )}
            {pp.notas && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Notas internas</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{pp.notas}</p>
              </div>
            )}
          </div>
        )}

        {/* Print footer */}
        <div className="hidden print:flex items-center justify-between pt-5 border-t border-gray-200 text-xs text-gray-400">
          <span>Palex Medical · InLab — Confidencial</span>
          <span>Generado: {genDate}</span>
        </div>
      </div>

      {/* Share modal */}
      {shareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-1">Compartir proyecto</h3>
            <p className="text-sm text-gray-500 mb-5">Cualquier persona con el enlace puede ver el resumen completo sin iniciar sesión.</p>
            {pp.shareToken ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input readOnly value={shareUrl ?? ""} className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-mono bg-gray-50 text-gray-600 focus:outline-none" />
                  <button onClick={copyLink} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white shrink-0 transition-colors"
                    style={{ backgroundColor: copied ? "#16a34a" : TEAL }}>
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button onClick={revokeShare} disabled={revoking}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-500 border border-red-200 hover:bg-red-50 disabled:opacity-50">
                    {revoking ? "Revocando…" : "Revocar enlace"}
                  </button>
                  <button onClick={() => setShareModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-500 text-center">
                  Sin enlace generado para este proyecto
                </div>
                <div className="flex gap-2">
                  <button onClick={generateShare} disabled={generando}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: TEAL }}>
                    {generando ? "Generando…" : "Generar enlace público"}
                  </button>
                  <button onClick={() => setShareModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden file input for map import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  )
}

function RowInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-20 shrink-0 text-sm">{label}</span>
      <span className="text-gray-700 font-medium text-sm">{value}</span>
    </div>
  )
}

