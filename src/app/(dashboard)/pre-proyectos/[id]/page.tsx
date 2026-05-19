"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { TEAL, ORANGE } from "@/lib/brand"
import { useToast } from "@/components/Toast"

// ---- tipos ----

interface Hospital { id: string; nombre: string; ciudad: string; provincia: string | null }
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
  tipo: string; marca: string; modelo: string
}
interface HardwareUnidad {
  id: string; numSerie: string | null; estado: string; notas: string | null
  catalogo: HardwareCatalogo
}
interface PreProyecto {
  id: string; titulo: string; descripcion: string | null; estado: string; prioridad: number
  presupuesto: number | null; fechaInicio: string | null; fechaFinPlan: string | null; fechaFinReal: string | null
  notas: string | null; creadoEn: string; editadoEn: string
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

const TABS = ["Info", "Timeline", "Materiales", "Contactos", "Visitas"] as const
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
        <Link href="/pre-proyectos" className="hover:text-teal-600 transition-colors">Pre-Proyectos</Link>
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
            {t === "Materiales" && (pp.solicitudes.length + pp.hardwareUnidades.length) > 0 && <span className="ml-1.5 text-xs opacity-60">{pp.solicitudes.length + pp.hardwareUnidades.length}</span>}
            {t === "Contactos" && pp.contactos.length > 0 && <span className="ml-1.5 text-xs opacity-60">{pp.contactos.length}</span>}
            {t === "Visitas" && pp.visitas.length > 0 && <span className="ml-1.5 text-xs opacity-60">{pp.visitas.length}</span>}
          </button>
        ))}
      </div>

      {/* Tab contenido */}
      {tab === "Info"       && <TabInfo pp={pp} onUpdate={setPp} />}
      {tab === "Timeline"   && <TabTimeline pp={pp} onUpdate={setPp} />}
      {tab === "Materiales" && <TabMateriales pp={pp} onUpdate={setPp} />}
      {tab === "Contactos"  && <TabContactos pp={pp} onUpdate={setPp} />}
      {tab === "Visitas"    && <TabVisitas pp={pp} onUpdate={setPp} />}
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

// ========== TAB MATERIALES (solicitudes + hardware) ==========

function TabMateriales({ pp, onUpdate }: { pp: PreProyecto; onUpdate: (p: PreProyecto) => void }) {
  const { success, error: toastError } = useToast()
  // Solicitudes
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({ titulo: "", fechaEntregaPlan: "", notas: "" })
  const [lineas, setLineas] = useState([{ nombre: "", referencia: "", cantidad: "1", unidad: "ud" }])
  const [guardando, setGuardando] = useState(false)
  const [expandida, setExpandida] = useState<string | null>(null)
  // Hardware
  const [catalogo, setCatalogo] = useState<(HardwareCatalogo & { id: string })[]>([])
  const [mostrarFormHW, setMostrarFormHW] = useState(false)
  const [formHW, setFormHW] = useState({ catalogoId: "", numSerie: "", notas: "" })
  const [guardandoHW, setGuardandoHW] = useState(false)

  useEffect(() => {
    fetch("/api/hardware").then(r => r.json()).then(data => {
      setCatalogo(Array.isArray(data) ? data : [])
    })
  }, [])

  function addLinea() { setLineas(p => [...p, { nombre: "", referencia: "", cantidad: "1", unidad: "ud" }]) }
  function removeLinea(i: number) { setLineas(p => p.filter((_, j) => j !== i)) }

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim()) return
    setGuardando(true)
    try {
      const r = await fetch(`/api/pre-proyectos/${pp.id}/solicitudes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, lineas: lineas.filter(l => l.nombre.trim()) }),
      })
      if (!r.ok) throw new Error()
      const nueva = await r.json()
      onUpdate({ ...pp, solicitudes: [nueva, ...pp.solicitudes] })
      setForm({ titulo: "", fechaEntregaPlan: "", notas: "" })
      setLineas([{ nombre: "", referencia: "", cantidad: "1", unidad: "ud" }])
      setMostrarForm(false)
      success("Solicitud creada")
    } catch {
      toastError("Error al crear solicitud")
    } finally {
      setGuardando(false)
    }
  }

  async function cambiarEstado(solId: string, estado: string) {
    try {
      const r = await fetch(`/api/pre-proyectos/${pp.id}/solicitudes/${solId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      })
      if (!r.ok) throw new Error()
      onUpdate({ ...pp, solicitudes: pp.solicitudes.map(s => s.id === solId ? { ...s, estado } : s) })
    } catch {
      toastError("Error")
    }
  }

  async function eliminarSol(solId: string) {
    try {
      await fetch(`/api/pre-proyectos/${pp.id}/solicitudes/${solId}`, { method: "DELETE" })
      onUpdate({ ...pp, solicitudes: pp.solicitudes.filter(s => s.id !== solId) })
      success("Solicitud eliminada")
    } catch {
      toastError("Error")
    }
  }

  async function asignarHW(e: React.FormEvent) {
    e.preventDefault()
    if (!formHW.catalogoId) return
    setGuardandoHW(true)
    try {
      const r = await fetch("/api/hardware/unidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formHW, preProyectoId: pp.id, hospitalId: pp.hospital.id, estado: "ASIGNADO" }),
      })
      if (!r.ok) throw new Error()
      const nueva = await r.json()
      onUpdate({ ...pp, hardwareUnidades: [...pp.hardwareUnidades, nueva] })
      setFormHW({ catalogoId: "", numSerie: "", notas: "" })
      setMostrarFormHW(false)
      success("Hardware asignado")
    } catch {
      toastError("Error al asignar")
    } finally {
      setGuardandoHW(false)
    }
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
    <div className="space-y-6">
      {/* ── Solicitudes de material ── */}
      <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Solicitudes de Material</h3>
        <button onClick={() => setMostrarForm(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nueva solicitud
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={crear} className="bg-white rounded-2xl border border-teal-200 p-5 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-4">Nueva solicitud de material</h4>
          <div className="space-y-3">
            <input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
              placeholder="Título de la solicitud *"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fecha entrega planificada</label>
                <input type="date" value={form.fechaEntregaPlan} onChange={e => setForm(p => ({ ...p, fechaEntregaPlan: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
            </div>
            <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={2}
              placeholder="Notas (opcional)"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />

            {/* Líneas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Líneas de material</p>
                <button type="button" onClick={addLinea} className="text-xs text-teal-600 hover:text-teal-700 font-medium">+ Añadir línea</button>
              </div>
              <div className="space-y-2">
                {lineas.map((l, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input value={l.nombre} onChange={e => setLineas(p => p.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))}
                      placeholder="Nombre del material *" className="col-span-4 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    <input value={l.referencia} onChange={e => setLineas(p => p.map((x, j) => j === i ? { ...x, referencia: e.target.value } : x))}
                      placeholder="Referencia" className="col-span-3 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    <input type="number" value={l.cantidad} min="1" onChange={e => setLineas(p => p.map((x, j) => j === i ? { ...x, cantidad: e.target.value } : x))}
                      placeholder="Cant." className="col-span-2 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    <input value={l.unidad} onChange={e => setLineas(p => p.map((x, j) => j === i ? { ...x, unidad: e.target.value } : x))}
                      placeholder="ud" className="col-span-2 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    <button type="button" onClick={() => removeLinea(i)} className="col-span-1 flex justify-center text-red-300 hover:text-red-500">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => setMostrarForm(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={guardando}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: TEAL }}>
              {guardando ? "Creando…" : "Crear solicitud"}
            </button>
          </div>
        </form>
      )}

      {pp.solicitudes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Sin solicitudes de material</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pp.solicitudes.map(sol => {
            const sInfo = SOLICITUD_ESTADO[sol.estado] ?? { label: sol.estado, color: "#6b7280", bg: "#f3f4f6" }
            const isOpen = expandida === sol.id
            const totalItems = sol.lineas.reduce((s, l) => s + l.cantidad, 0)
            return (
              <div key={sol.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: sInfo.bg, color: sInfo.color }}>
                        {sInfo.label}
                      </span>
                      <span className="text-xs text-gray-400">{fmtFecha(sol.fechaSolicitud)}</span>
                      {sol.fechaEntregaPlan && <span className="text-xs text-gray-400">→ entrega: {fmtFecha(sol.fechaEntregaPlan)}</span>}
                      {sol.fechaEntregaReal && <span className="text-xs text-green-600">entregado: {fmtFecha(sol.fechaEntregaReal)}</span>}
                    </div>
                    <h4 className="font-semibold text-gray-900">{sol.titulo}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">{sol.lineas.length} artículo{sol.lineas.length !== 1 ? "s" : ""} · {totalItems} unidades</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={sol.estado}
                      onChange={e => cambiarEstado(sol.id, e.target.value)}
                      className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none"
                    >
                      {Object.entries(SOLICITUD_ESTADO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <button onClick={() => setExpandida(isOpen ? null : sol.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transform: isOpen ? "rotate(180deg)" : "none" }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                    <button onClick={() => eliminarSol(sol.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
                {isOpen && sol.lineas.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-100">
                          <th className="text-left px-4 py-2.5 font-medium">Material</th>
                          <th className="text-left px-4 py-2.5 font-medium">Referencia</th>
                          <th className="text-right px-4 py-2.5 font-medium">Cant.</th>
                          <th className="text-right px-4 py-2.5 font-medium">Entregado</th>
                          <th className="text-left px-4 py-2.5 font-medium">Ud.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sol.lineas.map(l => (
                          <tr key={l.id} className="border-b border-gray-100 last:border-0">
                            <td className="px-4 py-2.5 font-medium text-gray-800">{l.nombre}</td>
                            <td className="px-4 py-2.5 text-gray-400">{l.referencia ?? "—"}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{l.cantidad}</td>
                            <td className="px-4 py-2.5 text-right" style={{ color: l.cantidadEntregada >= l.cantidad ? "#16a34a" : "#d97706" }}>
                              {l.cantidadEntregada}
                            </td>
                            <td className="px-4 py-2.5 text-gray-400">{l.unidad}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {sol.notas && <p className="px-4 py-2.5 text-xs text-gray-500 italic border-t border-gray-100">{sol.notas}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      </div>

      {/* ── Hardware asignado ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Hardware asignado</h3>
          <button onClick={() => setMostrarFormHW(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Asignar
          </button>
        </div>

        {mostrarFormHW && (
          <form onSubmit={asignarHW} className="bg-white rounded-2xl border border-teal-200 p-5 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-3">Asignar hardware</h4>
            <div className="space-y-3">
              <select value={formHW.catalogoId} onChange={e => setFormHW(p => ({ ...p, catalogoId: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
                <option value="">Seleccionar dispositivo…</option>
                {catalogo.map(c => (
                  <option key={c.id} value={c.id}>{HW_TIPO_LABEL[c.tipo] ?? c.tipo} — {c.marca} {c.modelo}</option>
                ))}
              </select>
              <input value={formHW.numSerie} onChange={e => setFormHW(p => ({ ...p, numSerie: e.target.value }))}
                placeholder="Número de serie (opcional)"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <input value={formHW.notas} onChange={e => setFormHW(p => ({ ...p, notas: e.target.value }))}
                placeholder="Notas (opcional)"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setMostrarFormHW(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={guardandoHW}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: TEAL }}>
                {guardandoHW ? "Asignando…" : "Asignar"}
              </button>
            </div>
          </form>
        )}

        {pp.hardwareUnidades.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">Sin hardware asignado a este proyecto</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(byTipo).map(([tipo, unidades]) => (
              <div key={tipo}>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">{HW_TIPO_LABEL[tipo] ?? tipo} <span className="text-gray-400 font-normal">({unidades.length})</span></h4>
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

