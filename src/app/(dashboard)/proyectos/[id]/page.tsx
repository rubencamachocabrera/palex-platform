"use client"

import { useEffect, useState, useCallback, useRef, Fragment, useMemo } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { TEAL, ORANGE } from "@/lib/brand"
import { useToast } from "@/components/Toast"
import { usePerfil } from "@/hooks/usePerfil"
import { TagSelector } from "@/components/TagSelector"
import { ComentariosPanel } from "@/components/ComentariosPanel"
import QRCode from "qrcode"
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core"

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
interface EntradaTimeline {
  id: string; tipo: "EVENTO" | "COMENTARIO" | "CITA"
  titulo: string; contenido: string | null
  fechaEntrada: string; fechaCita: string | null; personaCita: string | null
  lugarCita: string | null; motivoCita: string | null; importanciaCita: number | null
  autor: string; creadoEn: string
}
interface Tarea {
  id: string; parentId: string | null
  titulo: string; descripcion: string | null
  estado: "PENDIENTE" | "EN_PROGRESO" | "COMPLETADA" | "CANCELADA"
  prioridad: "BAJA" | "MEDIA" | "ALTA" | "CRITICA"
  asignadoA: string | null
  asignadoAId: string | null
  asignado: { id: string; nombre: string } | null
  fechaVencimiento: string | null; fechaCompletada: string | null
  orden: number; creadoEn: string
}
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
interface Adjunto {
  id: string; nombre: string; tipo: string; tamano: number; creadoPor: string; creadoEn: string
}
interface ProyectoRef { id: string; nombre: string }
interface ModuloInfo { id: string; nombre: string }
interface ProyectoModuloItem { modulo: ModuloInfo; estado: string; proyectoId: string; moduloId: string }
interface Proyecto {
  id: string; titulo: string; descripcion: string | null; estado: string; prioridad: number
  presupuesto: number | null; fechaInicio: string | null; fechaFinPlan: string | null; fechaFinReal: string | null
  notas: string | null; mapaHtml?: string | null; shareToken?: string | null
  proyectoId?: string | null; refContrato?: string | null; refConcurso?: string | null
  creadoEn: string; editadoEn: string
  hospital: Hospital; responsable: Responsable | null
  fases: Fase[]; hitos: Hito[]; solicitudes: Solicitud[]
  contactos: ContactoPivot[]; visitas: Visita[]; hardwareUnidades: HardwareUnidad[]
  entradas: EntradaTimeline[]; tareas: Tarea[]
  adjuntos?: { id: string }[]
  modulos?: ProyectoModuloItem[]
  tags?: { tag: { id: string; nombre: string; color: string } }[]
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

// ─── Comentarios embebidos en Info ───────────────────────────────────────────

function ComentariosInInfo({ ppId }: { ppId: string }) {
  const { perfil } = usePerfil()
  if (!perfil) return null
  const userInfo = { id: perfil.id, rol: perfil.rol }
  return (
    <ComentariosPanel
      endpoint={`/api/proyectos/${ppId}/comentarios`}
      usuarioId={userInfo.id}
      esAdmin={userInfo.rol === "ADMIN"}
    />
  )
}

// ---- tabs ----

const TABS = ["Cockpit", "Info", "Tareas", "Timeline", "Materiales", "Contactos", "Visitas", "Módulos", "Adjuntos", "Resumen"] as const
type Tab = typeof TABS[number]

// ========== COMPONENTE PRINCIPAL ==========

export default function ProyectoDetalle() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const [pp, setPp] = useState<Proyecto | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      const t = new URLSearchParams(window.location.search).get("tab")
      if (t && (TABS as readonly string[]).includes(t)) return t as Tab
    }
    return "Info"
  })

  function changeTab(t: Tab) {
    setTab(t)
    // No router.replace — causaba re-render/recarga al cambiar de tab
  }

  const [creandoV, setCreandoV] = useState(false)
  const [showNuevaVisitaModal, setShowNuevaVisitaModal] = useState(false)
  const [tituloVisitaModal, setTituloVisitaModal] = useState("")
  const [fechaVisitaModal, setFechaVisitaModal] = useState("")
  const [plantillasVisita, setPlantillasVisita] = useState<{ id: string; nombre: string }[]>([])
  const [plantillaVisitaId, setPlantillaVisitaId] = useState("")

  function abrirNuevaVisitaModal() {
    if (!pp) return
    const hoy = new Date().toISOString().split("T")[0]
    setFechaVisitaModal(hoy)
    setTituloVisitaModal(`Visita ${pp.hospital.nombre} — ${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}`)
    setPlantillaVisitaId("")
    setShowNuevaVisitaModal(true)
    if (plantillasVisita.length === 0) {
      fetch("/api/plantillas").then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setPlantillasVisita(d) }).catch(() => {})
    }
  }

  async function crearVisitaRapida() {
    if (!pp) return
    setCreandoV(true)
    try {
      let datos = {}
      if (plantillaVisitaId) {
        const pl = await fetch(`/api/plantillas/${plantillaVisitaId}`).then(r => r.ok ? r.json() : null).catch(() => null)
        if (pl?.datos) datos = pl.datos
      }
      const r = await fetch("/api/visitas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalId: pp.hospital.id, tipo: "PROYECTOS", proyectoId: pp.id, titulo: tituloVisitaModal || null, fecha: fechaVisitaModal || undefined, datos }),
      })
      if (r.ok) { const v = await r.json(); router.push(`/visitas/${v.id}`) }
    } finally { setCreandoV(false) }
  }

  const cargar = useCallback(async () => {
    const r = await fetch(`/api/proyectos/${params.id}`)
    if (r.status === 404) { router.push("/proyectos"); return }
    if (r.ok) setPp(await r.json())
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  useEffect(() => { cargar() }, [cargar])

  if (loading) return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="h-10 bg-gray-100 rounded-xl animate-pulse w-1/2" />
      <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
    </div>
  )
  if (!pp) return null

  const fasesCompletadas = pp.fases.filter(f => f.estado === "COMPLETADO").length
  const pct = pp.fases.length ? Math.round((fasesCompletadas / pp.fases.length) * 100) : 0
  const efDetalle = (() => {
    if (pp.estado === "PAUSADO" || pp.estado === "CANCELADO") return pp.estado
    if (!pp.fases.length) return "NUEVO"
    if (pp.fases.every(f => f.estado === "COMPLETADO")) return "COMPLETADO"
    if (pp.fases.some(f => f.estado === "EN_PROGRESO" || f.estado === "COMPLETADO")) return "EN_CURSO"
    return "NUEVO"
  })()
  const estadoStyle = ESTADO_COLOR[efDetalle] ?? { bg: "#f3f4f6", text: "#6b7280" }
  const isRetrasadoHeader = pp.fechaFinPlan && new Date(pp.fechaFinPlan) < new Date()
    && !["COMPLETADO", "CANCELADO"].includes(efDetalle)

  return (
    <div className="p-6 max-w-5xl mx-auto overflow-x-hidden">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/proyectos" className="hover:text-teal-600 transition-colors">Proyectos</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate max-w-xs">{pp.titulo}</span>
      </nav>

      {/* Header card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: estadoStyle.bg, color: estadoStyle.text }}>
                {ESTADO_LABEL[efDetalle]}
              </span>
              {pp.prioridad > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-50" style={{ color: PRIORIDAD[pp.prioridad]?.color }}>
                  {PRIORIDAD[pp.prioridad]?.label}
                </span>
              )}
              {isRetrasadoHeader && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600">Retrasado</span>
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
            {pp.refContrato && (
              <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                </svg>
                Ref: <span className="text-gray-700 font-medium font-mono">{pp.refContrato}</span>
              </p>
            )}
            <div className="mt-2">
              <TagSelector
                entityType="PROYECTO"
                entityId={pp.id}
                tagIds={(pp.tags ?? []).map(t => t.tag.id)}
                onUpdate={ids => setPp(prev => prev ? { ...prev, tags: ids.map(id => ({ tag: { id, nombre: "", color: "" } })) } : prev)}
              />
            </div>
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
        {/* Acciones rápidas */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 flex-wrap">
          <button
            onClick={abrirNuevaVisitaModal}
            disabled={creandoV}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: TEAL }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="6.5" y1="1" x2="6.5" y2="12"/><line x1="1" y1="6.5" x2="12" y2="6.5"/>
            </svg>
            {creandoV ? "Creando visita…" : "Nueva visita"}
          </button>
          <button
            onClick={() => changeTab("Visitas")}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {pp.visitas.length} visita{pp.visitas.length !== 1 ? "s" : ""} →
          </button>
          <Link
            href={`/hospitales/${pp.hospital.id}?from=proyecto&pid=${pp.id}`}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Ver hospital →
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => changeTab(t)}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
            style={tab === t ? { backgroundColor: "white", color: TEAL, boxShadow: "0 1px 4px rgba(0,0,0,.08)" } : { color: "#6b7280" }}
          >
            {t}
            {t === "Tareas" && (pp.tareas?.length ?? 0) > 0 && <span className="ml-1.5 text-xs opacity-60">{pp.tareas.length}</span>}
            {t === "Timeline" && <span className="ml-1.5 text-xs opacity-60">{pp.fases.length + pp.hitos.length + (pp.entradas?.length ?? 0)}</span>}
            {t === "Materiales" && pp.hardwareUnidades.length > 0 && <span className="ml-1.5 text-xs opacity-60">{pp.hardwareUnidades.length}</span>}
            {t === "Contactos" && pp.contactos.length > 0 && <span className="ml-1.5 text-xs opacity-60">{pp.contactos.length}</span>}
            {t === "Visitas" && pp.visitas.length > 0 && <span className="ml-1.5 text-xs opacity-60">{pp.visitas.length}</span>}
            {t === "Adjuntos" && (pp.adjuntos?.length ?? 0) > 0 && <span className="ml-1.5 text-xs opacity-60">{pp.adjuntos!.length}</span>}
            {t === "Resumen" && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${TEAL}20`, color: TEAL }}>360°</span>}
          </button>
        ))}
      </div>

      {/* Tab contenido */}
      {tab === "Cockpit"    && <TabCockpit pp={pp} onChangeTab={changeTab} />}
      {tab === "Info"       && <TabInfo pp={pp} onUpdate={setPp} />}
      {tab === "Tareas"     && <TabTareas pp={pp} onUpdate={setPp} />}
      {tab === "Timeline"   && <TabTimeline pp={pp} onUpdate={setPp} />}
      {tab === "Materiales" && <TabMateriales pp={pp} onUpdate={setPp} />}
      {tab === "Contactos"  && <TabContactos pp={pp} onUpdate={setPp} />}
      {tab === "Visitas"    && <TabVisitas pp={pp} onUpdate={setPp} />}
      {tab === "Módulos"   && <TabModulos pp={pp} onUpdate={setPp} />}
      {tab === "Adjuntos"      && <TabAdjuntos pp={pp} onUpdate={setPp} />}
      {tab === "Resumen"       && <TabResumen pp={pp} onUpdate={setPp} />}

      {/* ── MODAL: Nueva visita ── */}
      {showNuevaVisitaModal && pp && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowNuevaVisitaModal(false) }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md" style={{ borderTop: `3px solid ${TEAL}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="text-sm font-bold text-gray-900">Nueva visita</p>
                <p className="text-xs text-gray-400 mt-0.5">{pp.hospital.nombre} · {pp.titulo}</p>
              </div>
              <button onClick={() => setShowNuevaVisitaModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nombre de la visita</label>
                <input value={tituloVisitaModal} onChange={e => setTituloVisitaModal(e.target.value)}
                  placeholder="Se genera automáticamente" autoFocus
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Fecha</label>
                <input type="date" value={fechaVisitaModal} onChange={e => setFechaVisitaModal(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              {plantillasVisita.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Plantilla (opcional)</label>
                  <select value={plantillaVisitaId} onChange={e => setPlantillaVisitaId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer">
                    <option value="">Sin plantilla — formulario en blanco</option>
                    {plantillasVisita.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  {plantillaVisitaId && (
                    <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: TEAL }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      El formulario se abrirá pre-rellenado
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setShowNuevaVisitaModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">Cancelar</button>
              <button onClick={crearVisitaRapida} disabled={creandoV}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 cursor-pointer hover:opacity-90 transition-opacity"
                style={{ backgroundColor: TEAL }}>
                {creandoV ? "Creando…" : "Crear visita"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ========== TAB INFO ==========

function TabInfo({ pp, onUpdate }: { pp: Proyecto; onUpdate: (p: Proyecto) => void }) {
  const { success, error: toastError } = useToast()
  const [form, setForm] = useState({
    titulo: pp.titulo, descripcion: pp.descripcion ?? "", estado: pp.estado,
    prioridad: String(pp.prioridad), presupuesto: pp.presupuesto != null ? String(pp.presupuesto) : "",
    fechaInicio: fmtFechaInput(pp.fechaInicio), fechaFinPlan: fmtFechaInput(pp.fechaFinPlan),
    fechaFinReal: fmtFechaInput(pp.fechaFinReal), notas: pp.notas ?? "",
    proyectoId: pp.proyectoId ?? "", refContrato: pp.refContrato ?? "",
  })
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    try {
      const r = await fetch(`/api/proyectos/${pp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          prioridad: parseInt(form.prioridad),
          presupuesto: form.presupuesto ? parseFloat(form.presupuesto) : null,
          refContrato: form.refContrato.trim() || null,
        }),
      })
      if (!r.ok) throw new Error()
      success("Guardado correctamente")
      onUpdate({ ...pp, ...form, prioridad: parseInt(form.prioridad), presupuesto: form.presupuesto ? parseFloat(form.presupuesto) : null, refContrato: form.refContrato.trim() || null })
    } catch {
      toastError("Error al guardar")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
    <form onSubmit={guardar} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-5">
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Referencia de contrato</label>
          <input
            value={form.refContrato}
            onChange={e => setForm(p => ({ ...p, refContrato: e.target.value }))}
            placeholder="Ej. EXP-2025-0042, Contrato 456/2025…"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <p className="text-xs text-gray-400 mt-1">Número de expediente, licitación o referencia del contrato asociado</p>
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

    {/* ── Comentarios integrados en Info ── */}
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-gray-100" />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Comentarios del equipo
        </span>
        <div className="h-px flex-1 bg-gray-100" />
      </div>
      <ComentariosInInfo ppId={pp.id} />
    </div>
    </>
  )
}

// ========== TAB TIMELINE ==========

// ========== GANTT ==========

function GanttFases({ pp }: { pp: Proyecto }) {
  const now = new Date()
  const dateCandidates: Date[] = []
  if (pp.fechaInicio) dateCandidates.push(new Date(pp.fechaInicio))
  if (pp.fechaFinPlan) dateCandidates.push(new Date(pp.fechaFinPlan))
  pp.fases.forEach(f => {
    if (f.fechaPlan) dateCandidates.push(new Date(f.fechaPlan))
    if (f.fechaReal) dateCandidates.push(new Date(f.fechaReal))
  })
  pp.hitos.forEach(h => dateCandidates.push(new Date(h.fecha)))

  if (dateCandidates.length === 0) {
    return <p className="text-sm text-gray-400 py-10 text-center">Añade fechas a las fases para ver el Gantt</p>
  }

  const earliest = new Date(Math.min(...dateCandidates.map(d => d.getTime())))
  const latest = new Date(Math.max(...dateCandidates.map(d => d.getTime())))
  const rangeStart = new Date(earliest.getTime() - 7 * 86400000)
  const rangeEnd = new Date(Math.max(latest.getTime(), now.getTime()) + 14 * 86400000)
  const totalMs = rangeEnd.getTime() - rangeStart.getTime()

  const LABEL_W = 148
  const ROW_H = 38
  const BAR_MARGIN = 10
  const BAR_H = ROW_H - BAR_MARGIN * 2
  const VB_W = 700
  const chartW = VB_W - LABEL_W

  const xOf = (d: Date) => LABEL_W + ((d.getTime() - rangeStart.getTime()) / totalMs) * chartW
  const todayX = xOf(now)

  const faseColor = (estado: string) => {
    if (estado === "COMPLETADO") return "#16a34a"
    if (estado === "EN_PROGRESO") return TEAL
    if (estado === "BLOQUEADO") return "#dc2626"
    return "#9ca3af"
  }

  const faseRows = pp.fases.map((f, i) => {
    const endDate = f.fechaPlan ? new Date(f.fechaPlan) : null
    const startDate = pp.fases[i - 1]?.fechaPlan
      ? new Date(pp.fases[i - 1].fechaPlan!)
      : pp.fechaInicio
        ? new Date(pp.fechaInicio)
        : endDate ? new Date(endDate.getTime() - 21 * 86400000) : null
    return { fase: f, startDate, endDate }
  })

  const ticks: { xv: number; label: string }[] = []
  const cur = new Date(rangeStart); cur.setDate(1)
  while (cur <= rangeEnd) {
    ticks.push({ xv: xOf(cur), label: cur.toLocaleDateString("es-ES", { month: "short", year: "numeric" }) })
    cur.setMonth(cur.getMonth() + 1)
  }

  const hitoYOffset = pp.fases.length * ROW_H + 28
  const totalH = hitoYOffset + (pp.hitos.length > 0 ? pp.hitos.length * ROW_H + 4 : 0) + 8

  return (
    <div className="overflow-x-auto pb-2">
      <svg viewBox={`0 0 ${VB_W} ${totalH}`} className="w-full" style={{ minWidth: 480, height: totalH }}>
        <defs>
          <pattern id="hatch-overdue" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(220,38,38,0.35)" strokeWidth={3}/>
          </pattern>
        </defs>

        {/* Grid lines + month labels */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={t.xv} y1={16} x2={t.xv} y2={totalH - 4} stroke="#f3f4f6" strokeWidth={1}/>
            {t.xv >= LABEL_W && <text x={t.xv + 3} y={14} fontSize={9} fill="#d1d5db" fontWeight="600">{t.label}</text>}
          </g>
        ))}

        {/* Fase rows */}
        {faseRows.map((row, i) => {
          const y = 20 + i * ROW_H
          const color = faseColor(row.fase.estado)
          const x1 = row.startDate ? Math.max(xOf(row.startDate), LABEL_W) : LABEL_W
          const x2 = row.endDate ? xOf(row.endDate) : Math.min(todayX, VB_W - 4)
          const bw = Math.max(6, x2 - x1)
          const overdue = row.endDate && row.fase.estado !== "COMPLETADO" && row.endDate < now
          return (
            <g key={row.fase.id}>
              <text x={LABEL_W - 6} y={y + ROW_H / 2 + 4} textAnchor="end" fontSize={11}
                fill="#374151" fontWeight={row.fase.estado === "EN_PROGRESO" ? "700" : "400"}>
                {row.fase.nombre.length > 16 ? row.fase.nombre.slice(0, 16) + "…" : row.fase.nombre}
              </text>
              <rect x={LABEL_W} y={y + BAR_MARGIN} width={chartW - 4} height={BAR_H} rx={3} fill="#f9fafb"/>
              {(row.startDate || row.endDate) && (
                <rect x={x1} y={y + BAR_MARGIN} width={bw} height={BAR_H} rx={3} fill={color} fillOpacity={0.78}/>
              )}
              {overdue && <rect x={x1} y={y + BAR_MARGIN} width={bw} height={BAR_H} rx={3} fill="url(#hatch-overdue)"/>}
              {row.fase.fechaReal && (
                <line x1={xOf(new Date(row.fase.fechaReal))} y1={y + BAR_MARGIN - 2}
                  x2={xOf(new Date(row.fase.fechaReal))} y2={y + ROW_H - BAR_MARGIN + 2}
                  stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round"/>
              )}
              {row.endDate && xOf(row.endDate) < VB_W - 18 && (
                <text x={Math.min(xOf(row.endDate) + 4, VB_W - 28)} y={y + ROW_H / 2 + 4}
                  fontSize={9} fill={overdue ? "#dc2626" : "#9ca3af"}>
                  {row.endDate.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                </text>
              )}
            </g>
          )
        })}

        {/* Hitos section */}
        {pp.hitos.length > 0 && (
          <>
            <line x1={LABEL_W} y1={hitoYOffset - 6} x2={VB_W - 4} y2={hitoYOffset - 6} stroke="#f3f4f6" strokeWidth={1}/>
            <text x={LABEL_W - 6} y={hitoYOffset + 10} textAnchor="end" fontSize={9} fill="#9ca3af" fontWeight="700">HITOS</text>
            {pp.hitos.map((h, i) => {
              const y = hitoYOffset + 16 + i * ROW_H
              const hx = xOf(new Date(h.fecha))
              const lateH = !h.completado && new Date(h.fecha) < now
              return (
                <g key={h.id}>
                  <text x={LABEL_W - 6} y={y + ROW_H / 2 + 4} textAnchor="end" fontSize={11} fill="#374151">
                    {h.titulo.length > 16 ? h.titulo.slice(0, 16) + "…" : h.titulo}
                  </text>
                  <rect x={LABEL_W} y={y + BAR_MARGIN} width={chartW - 4} height={BAR_H} rx={3} fill="#f9fafb"/>
                  <polygon
                    points={`${hx},${y + BAR_MARGIN - 2} ${hx + 7},${y + ROW_H / 2} ${hx},${y + ROW_H - BAR_MARGIN + 2} ${hx - 7},${y + ROW_H / 2}`}
                    fill={h.completado ? "#16a34a" : lateH ? "#dc2626" : "#d97706"} opacity={0.85}/>
                  <text x={hx + 10} y={y + ROW_H / 2 + 4} fontSize={9} fill={lateH ? "#dc2626" : "#9ca3af"}>
                    {new Date(h.fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                  </text>
                </g>
              )
            })}
          </>
        )}

        {/* Today line */}
        {todayX >= LABEL_W && todayX <= VB_W && (
          <>
            <line x1={todayX} y1={16} x2={todayX} y2={totalH - 4} stroke="#f97316" strokeWidth={1.5} strokeDasharray="4,3"/>
            <text x={todayX} y={13} textAnchor="middle" fontSize={9} fill="#f97316" fontWeight="700">Hoy</text>
          </>
        )}
      </svg>

      <div className="flex flex-wrap gap-3 mt-1 px-2 text-xs text-gray-400">
        {[{ color: "#9ca3af", label: "Pendiente" }, { color: TEAL, label: "En progreso" }, { color: "#16a34a", label: "Completado" }, { color: "#dc2626", label: "Bloqueado" }].map(item => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block shrink-0" style={{ backgroundColor: item.color, opacity: 0.78 }}/>
            {item.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-0.5 h-3 rounded-full bg-orange-400 shrink-0"/>Hoy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-0.5 h-3 rounded-full bg-green-600 shrink-0"/>Fecha real
        </span>
      </div>
    </div>
  )
}

// ========== TAB TIMELINE ==========

function TabTimeline({ pp, onUpdate }: { pp: Proyecto; onUpdate: (p: Proyecto) => void }) {
  const { success, error: toastError } = useToast()

  const [viewMode, setViewMode] = useState<"lista" | "gantt">("lista")
  const [editFaseId, setEditFaseId] = useState<string | null>(null)
  const [fasePatch, setFasePatch] = useState({ estado: "", fechaPlan: "", fechaReal: "", notas: "" })
  const [guardando, setGuardando] = useState(false)
  const [addTipo, setAddTipo] = useState<"EVENTO" | "COMENTARIO" | "CITA" | "HITO" | null>(null)
  const [addForm, setAddForm] = useState({ titulo: "", contenido: "", fechaCita: "", horaCita: "", personaCita: "", fechaEntrada: "", lugarCita: "", motivoCita: "", importanciaCita: "" })
  const [hitoForm, setHitoForm] = useState({ titulo: "", descripcion: "", fecha: "" })
  const [editEntradaId, setEditEntradaId] = useState<string | null>(null)
  const [editEntradaForm, setEditEntradaForm] = useState({ titulo: "", contenido: "", fechaEntrada: "", fechaCita: "", horaCita: "", personaCita: "", lugarCita: "", motivoCita: "", importanciaCita: "" })
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set())
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())

  function toggleCollapse(id: string) {
    setCollapsedItems(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function toggleMonth(month: string) {
    setCollapsedMonths(prev => { const n = new Set(prev); n.has(month) ? n.delete(month) : n.add(month); return n })
  }

  const [editHitoId, setEditHitoId] = useState<string | null>(null)
  const [editHitoForm, setEditHitoForm] = useState({ titulo: "", descripcion: "", fecha: "", fechaReal: "" })

  function abrirEditFase(f: Fase) {
    setEditFaseId(f.id)
    setFasePatch({ estado: f.estado, fechaPlan: fmtFechaInput(f.fechaPlan), fechaReal: fmtFechaInput(f.fechaReal), notas: f.notas ?? "" })
  }

  async function guardarFase(faseId: string) {
    setGuardando(true)
    try {
      const r = await fetch(`/api/proyectos/${pp.id}/fases/${faseId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fasePatch),
      })
      if (!r.ok) throw new Error()
      const updated = await r.json()
      let updatedFases = pp.fases.map(f => f.id === faseId ? { ...f, ...updated } : f)
      if (fasePatch.estado === "COMPLETADO") {
        const currentFase = pp.fases.find(f => f.id === faseId)
        if (currentFase) {
          const nextFase = pp.fases.find(f => f.orden === currentFase.orden + 1 && f.estado === "BLOQUEADO")
          if (nextFase) {
            try {
              const r2 = await fetch(`/api/proyectos/${pp.id}/fases/${nextFase.id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estado: "PENDIENTE" }),
              })
              if (r2.ok) {
                const updatedNext = await r2.json()
                updatedFases = updatedFases.map(f => f.id === nextFase.id ? { ...f, ...updatedNext } : f)
              }
            } catch { /* silencioso */ }
          }
        }
      }
      onUpdate({ ...pp, fases: updatedFases })
      setEditFaseId(null); success("Fase actualizada")
    } catch { toastError("Error al guardar fase") }
    finally { setGuardando(false) }
  }

  async function toggleHito(hito: Hito) {
    try {
      const r = await fetch(`/api/proyectos/${pp.id}/hitos/${hito.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completado: !hito.completado }),
      })
      if (!r.ok) throw new Error()
      onUpdate({ ...pp, hitos: pp.hitos.map(h => h.id === hito.id ? { ...h, completado: !h.completado } : h) })
    } catch { toastError("Error") }
  }

  async function eliminarHito(hitoId: string) {
    try {
      await fetch(`/api/proyectos/${pp.id}/hitos/${hitoId}`, { method: "DELETE" })
      onUpdate({ ...pp, hitos: pp.hitos.filter(h => h.id !== hitoId) })
      success("Hito eliminado")
    } catch { toastError("Error") }
  }

  async function crearHito() {
    if (!hitoForm.titulo || !hitoForm.fecha) return
    setGuardando(true)
    try {
      const r = await fetch(`/api/proyectos/${pp.id}/hitos`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(hitoForm),
      })
      if (!r.ok) throw new Error()
      const nuevo = await r.json()
      onUpdate({ ...pp, hitos: [...pp.hitos, nuevo].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()) })
      setHitoForm({ titulo: "", descripcion: "", fecha: "" }); setAddTipo(null); success("Hito añadido")
    } catch { toastError("Error al crear hito") }
    finally { setGuardando(false) }
  }

  async function crearEntrada() {
    if (!addTipo || addTipo === "HITO") return
    if (addTipo === "CITA" && !addForm.fechaCita) { toastError("La cita necesita una fecha"); return }
    if (addTipo === "COMENTARIO" && !addForm.contenido.trim()) { toastError("El comentario no puede estar vacío"); return }
    if ((addTipo === "EVENTO" || addTipo === "CITA") && !addForm.titulo.trim()) { toastError("El título es obligatorio"); return }
    setGuardando(true)
    try {
      const fechaCitaStr = addForm.fechaCita ? `${addForm.fechaCita}T${addForm.horaCita || "09:00"}:00` : null
      const r = await fetch(`/api/proyectos/${pp.id}/entradas`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: addTipo,
          titulo: addTipo === "COMENTARIO" ? (addForm.titulo || "Nota") : addForm.titulo,
          contenido: addForm.contenido || null,
          fechaCita: fechaCitaStr,
          personaCita: addForm.personaCita || null,
          lugarCita: addTipo === "CITA" ? (addForm.lugarCita || null) : null,
          motivoCita: addTipo === "CITA" ? (addForm.motivoCita || null) : null,
          importanciaCita: addTipo === "CITA" ? (addForm.importanciaCita ? Number(addForm.importanciaCita) : null) : null,
          fechaEntrada: (addTipo === "EVENTO" || addTipo === "COMENTARIO") ? (addForm.fechaEntrada || null) : null,
        }),
      })
      if (!r.ok) throw new Error()
      const nueva = await r.json()
      onUpdate({ ...pp, entradas: [...(pp.entradas ?? []), nueva] })
      setAddForm({ titulo: "", contenido: "", fechaCita: "", horaCita: "", personaCita: "", fechaEntrada: "", lugarCita: "", motivoCita: "", importanciaCita: "" }); setAddTipo(null)
      success(addTipo === "CITA" ? "Cita creada" : addTipo === "EVENTO" ? "Evento registrado" : "Nota añadida")
    } catch { toastError("Error al guardar") }
    finally { setGuardando(false) }
  }

  async function eliminarEntrada(entradaId: string) {
    try {
      await fetch(`/api/proyectos/${pp.id}/entradas/${entradaId}`, { method: "DELETE" })
      onUpdate({ ...pp, entradas: (pp.entradas ?? []).filter(e => e.id !== entradaId) })
      success("Eliminado")
    } catch { toastError("Error") }
  }

  function abrirEditHito(h: Hito) {
    setEditHitoId(h.id)
    setEditHitoForm({
      titulo: h.titulo,
      descripcion: h.descripcion ?? "",
      fecha: fmtFechaInput(h.fecha),
      fechaReal: fmtFechaInput(h.fechaReal),
    })
    setAddTipo(null)
  }

  async function guardarHito(hitoId: string) {
    if (!editHitoForm.titulo.trim() || !editHitoForm.fecha) { toastError("Título y fecha son obligatorios"); return }
    setGuardando(true)
    try {
      const r = await fetch(`/api/proyectos/${pp.id}/hitos/${hitoId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: editHitoForm.titulo.trim(),
          descripcion: editHitoForm.descripcion || null,
          fecha: editHitoForm.fecha,
          fechaReal: editHitoForm.fechaReal || null,
        }),
      })
      if (!r.ok) throw new Error()
      const updated = await r.json()
      onUpdate({ ...pp, hitos: pp.hitos.map(h => h.id === hitoId ? { ...h, ...updated } : h) })
      setEditHitoId(null)
      success("Hito actualizado")
    } catch { toastError("Error al guardar") }
    finally { setGuardando(false) }
  }

  function abrirEditEntrada(e: EntradaTimeline) {
    setEditEntradaId(e.id)
    const fechaCitaBase = e.fechaCita ? new Date(e.fechaCita) : null
    setEditEntradaForm({
      titulo: e.titulo === "Nota" ? "" : e.titulo,
      contenido: e.contenido ?? "",
      fechaEntrada: e.tipo !== "CITA" ? fmtFechaInput(e.fechaEntrada) : "",
      fechaCita: fechaCitaBase ? fmtFechaInput(e.fechaCita) : "",
      horaCita: fechaCitaBase ? fechaCitaBase.toTimeString().slice(0, 5) : "",
      personaCita: e.personaCita ?? "",
      lugarCita: e.lugarCita ?? "",
      motivoCita: e.motivoCita ?? "",
      importanciaCita: e.importanciaCita ? String(e.importanciaCita) : "",
    })
    setAddTipo(null)
  }

  async function guardarEntrada(entradaId: string, tipo: string) {
    setGuardando(true)
    try {
      const body: Record<string, unknown> = {
        titulo: editEntradaForm.titulo || (tipo === "COMENTARIO" ? "Nota" : ""),
        contenido: editEntradaForm.contenido || null,
      }
      if (tipo === "CITA") {
        body.fechaCita = editEntradaForm.fechaCita
          ? `${editEntradaForm.fechaCita}T${editEntradaForm.horaCita || "09:00"}:00`
          : null
        body.personaCita = editEntradaForm.personaCita || null
        body.lugarCita = editEntradaForm.lugarCita || null
        body.motivoCita = editEntradaForm.motivoCita || null
        body.importanciaCita = editEntradaForm.importanciaCita ? Number(editEntradaForm.importanciaCita) : null
      } else {
        body.fechaEntrada = editEntradaForm.fechaEntrada || null
      }
      const r = await fetch(`/api/proyectos/${pp.id}/entradas/${entradaId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      if (!r.ok) throw new Error()
      const updated = await r.json()
      onUpdate({ ...pp, entradas: (pp.entradas ?? []).map(e => e.id === entradaId ? { ...e, ...updated } : e) })
      setEditEntradaId(null)
      success("Guardado")
    } catch { toastError("Error al guardar") }
    finally { setGuardando(false) }
  }

  const now = Date.now()

  type MergedItem =
    | { kind: "fase"; data: Fase; sortKey: number }
    | { kind: "hito"; data: Hito; sortKey: number }
    | { kind: "entrada"; data: EntradaTimeline; sortKey: number }

  const merged: MergedItem[] = [
    ...pp.fases.map(f => ({ kind: "fase" as const, data: f, sortKey: f.fechaPlan ? new Date(f.fechaPlan).getTime() : Infinity })),
    ...pp.hitos.map(h => ({ kind: "hito" as const, data: h, sortKey: new Date(h.fecha).getTime() })),
    ...(pp.entradas ?? []).map(e => ({
      kind: "entrada" as const, data: e,
      sortKey: e.tipo === "CITA" && e.fechaCita ? new Date(e.fechaCita).getTime() : new Date(e.fechaEntrada).getTime(),
    })),
  ].sort((a, b) => a.sortKey - b.sortKey)

  const citasFuturas = (pp.entradas ?? [])
    .filter(e => e.tipo === "CITA" && e.fechaCita && new Date(e.fechaCita).getTime() > now)
    .sort((a, b) => new Date(a.fechaCita!).getTime() - new Date(b.fechaCita!).getTime())

  type RenderItem =
    | { rType: "header"; month: string; rKey: string }
    | { rType: "item"; item: MergedItem; rKey: string }

  const renderList: RenderItem[] = []
  let lastMonth = ""
  for (const item of merged) {
    const d = new Date(isFinite(item.sortKey) ? item.sortKey : now)
    const month = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
    if (month !== lastMonth) {
      renderList.push({ rType: "header", month, rKey: `hdr-${month}` })
      lastMonth = month
    }
    renderList.push({ rType: "item", item, rKey: `${item.kind}-${item.data.id}` })
  }

  // Compute status for each month header: 'warning' | 'ok' | 'empty'
  const monthStatus = new Map<string, "warning" | "ok" | "empty">()
  {
    let mKey = ""
    let hasItems = false
    let hasIssues = false
    const flush = () => { if (mKey) monthStatus.set(mKey, hasIssues ? "warning" : hasItems ? "ok" : "empty") }
    for (const ri of renderList) {
      if (ri.rType === "header") { flush(); mKey = ri.month; hasItems = false; hasIssues = false }
      else {
        hasItems = true
        const { item } = ri
        if (item.kind === "fase") {
          if (item.data.estado === "BLOQUEADO") hasIssues = true
          else if (item.data.fechaPlan && new Date(item.data.fechaPlan).getTime() < now && item.data.estado !== "COMPLETADO") hasIssues = true
        } else if (item.kind === "hito") {
          if (!item.data.completado && new Date(item.data.fecha).getTime() < now) hasIssues = true
        }
      }
    }
    flush()
  }

  const ADD_BTNS = [
    { tipo: "EVENTO" as const, label: "Evento", color: "#f97316" },
    { tipo: "COMENTARIO" as const, label: "Nota", color: "#6b7280" },
    { tipo: "CITA" as const, label: "Cita", color: "#3b82f6" },
    { tipo: "HITO" as const, label: "Hito", color: ORANGE },
  ]

  return (
    <div className="space-y-4">
      {/* Barra de añadir + toggle de vista */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-gray-700 mr-1">Añadir</span>
        {ADD_BTNS.map(({ tipo, label, color }) => (
          <button
            key={tipo}
            onClick={() => setAddTipo(addTipo === tipo ? null : tipo)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              addTipo === tipo ? "text-white" : "bg-white text-gray-700 border-gray-200"
            }`}
            style={addTipo === tipo
              ? { backgroundColor: color, borderColor: color }
              : undefined}
          >
            {tipo === "EVENTO" && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            )}
            {tipo === "COMENTARIO" && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            )}
            {tipo === "CITA" && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            )}
            {tipo === "HITO" && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            )}
            {label}
          </button>
        ))}
        <div className="ml-auto flex gap-1 p-0.5 bg-gray-100 rounded-xl">
          {(["lista", "gantt"] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={viewMode === mode ? { backgroundColor: "white", color: TEAL, boxShadow: "0 1px 4px rgba(0,0,0,.08)" } : { color: "#9ca3af" }}>
              {mode === "lista" ? "Lista" : "Gantt"}
            </button>
          ))}
        </div>
      </div>

      {/* Gantt view */}
      {viewMode === "gantt" && <GanttFases pp={pp} />}

      {/* Formulario: Evento, Comentario o Cita */}
      {addTipo && addTipo !== "HITO" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-800">
            {addTipo === "EVENTO" ? "Registrar evento" : addTipo === "COMENTARIO" ? "Añadir nota" : "Nueva cita"}
          </p>
          {(addTipo === "EVENTO" || addTipo === "CITA") && (
            <input value={addForm.titulo} onChange={e => setAddForm(p => ({ ...p, titulo: e.target.value }))}
              placeholder={addTipo === "EVENTO" ? "¿Qué ha ocurrido?" : "Título de la reunión"}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          )}
          {addTipo === "CITA" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha *</label>
                  <input type="date" value={addForm.fechaCita} onChange={e => setAddForm(p => ({ ...p, fechaCita: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Hora</label>
                  <input type="time" value={addForm.horaCita} onChange={e => setAddForm(p => ({ ...p, horaCita: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
              </div>
              <input value={addForm.personaCita} onChange={e => setAddForm(p => ({ ...p, personaCita: e.target.value }))}
                placeholder="Con quién (persona, cargo…)"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              {/* Lugar */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Tipo de reunión</label>
                <div className="flex flex-wrap gap-2">
                  {[{ v: "PRESENCIAL", l: "Presencial", dot: "#6b7280" }, { v: "TEAMS", l: "Teams", dot: "#7c3aed" }, { v: "ZOOM", l: "Zoom", dot: "#2563eb" }, { v: "GOOGLE_MEET", l: "Meet", dot: "#16a34a" }].map(opt => (
                    <button key={opt.v} type="button"
                      onClick={() => setAddForm(p => ({ ...p, lugarCita: p.lugarCita === opt.v ? "" : opt.v }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                        addForm.lugarCita === opt.v ? "text-white" : "bg-white text-gray-700 border-gray-200"
                      }`}
                      style={addForm.lugarCita === opt.v ? { backgroundColor: "#3b82f6", borderColor: "#3b82f6" } : undefined}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: addForm.lugarCita === opt.v ? "white" : opt.dot }} />
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
              {/* Motivo */}
              <input value={addForm.motivoCita} onChange={e => setAddForm(p => ({ ...p, motivoCita: e.target.value }))}
                placeholder="Motivo de la cita (opcional)"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              {/* Importancia */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 shrink-0">Importancia:</span>
                {[{ v: "1", l: "Normal", bg: "#f3f4f6", col: "#374151" }, { v: "2", l: "Importante", bg: "#fff7ed", col: "#f97316" }, { v: "3", l: "Crítica", bg: "#fef2f2", col: "#dc2626" }].map(opt => (
                  <button key={opt.v} type="button"
                    onClick={() => setAddForm(p => ({ ...p, importanciaCita: p.importanciaCita === opt.v ? "" : opt.v }))}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                    style={addForm.importanciaCita === opt.v ? { backgroundColor: opt.col, color: "white", borderColor: opt.col } : { backgroundColor: opt.bg, color: opt.col, borderColor: "#e5e7eb" }}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </>
          )}
          {(addTipo === "EVENTO" || addTipo === "COMENTARIO") && (
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500 shrink-0">
                {addTipo === "EVENTO" ? "Fecha del evento" : "Fecha de la nota"}
              </label>
              <input type="date" value={addForm.fechaEntrada}
                onChange={e => setAddForm(p => ({ ...p, fechaEntrada: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              {addForm.fechaEntrada && (
                <button type="button" onClick={() => setAddForm(p => ({ ...p, fechaEntrada: "" }))}
                  className="text-xs text-gray-400 hover:text-gray-600 underline">
                  hoy
                </button>
              )}
            </div>
          )}
          <textarea value={addForm.contenido} onChange={e => setAddForm(p => ({ ...p, contenido: e.target.value }))}
            placeholder={addTipo === "COMENTARIO" ? "Escribe tu nota o comentario…" : "Notas adicionales (opcional)"}
            rows={addTipo === "COMENTARIO" ? 3 : 2}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
          <div className="flex gap-2">
            <button onClick={() => setAddTipo(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={crearEntrada} disabled={guardando}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: TEAL }}>
              {guardando ? "…" : addTipo === "EVENTO" ? "Registrar" : addTipo === "COMENTARIO" ? "Añadir" : "Crear cita"}
            </button>
          </div>
        </div>
      )}

      {/* Formulario: Hito */}
      {addTipo === "HITO" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-800">Nuevo hito</p>
          <input value={hitoForm.titulo} onChange={e => setHitoForm(p => ({ ...p, titulo: e.target.value }))}
            placeholder="Título del hito"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          <input value={hitoForm.descripcion} onChange={e => setHitoForm(p => ({ ...p, descripcion: e.target.value }))}
            placeholder="Descripción (opcional)"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          <input type="date" value={hitoForm.fecha} onChange={e => setHitoForm(p => ({ ...p, fecha: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          <div className="flex gap-2">
            <button onClick={() => setAddTipo(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={crearHito} disabled={guardando}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: TEAL }}>
              {guardando ? "…" : "Añadir hito"}
            </button>
          </div>
        </div>
      )}

      {viewMode === "lista" && <>

      {/* Próximas citas */}
      {citasFuturas.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-widest">Próximas citas</p>
          {citasFuturas.slice(0, 4).map(c => {
            const dias = Math.ceil((new Date(c.fechaCita!).getTime() - now) / 86400000)
            return (
              <div key={c.id} className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-blue-900 leading-tight">{c.titulo}</p>
                  <div className="flex flex-wrap items-center gap-x-2 mt-0.5 text-xs text-blue-500">
                    <span>{new Date(c.fechaCita!).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    {c.personaCita && <span>· Con: {c.personaCita}</span>}
                  </div>
                  {c.contenido && <p className="text-xs text-blue-600 mt-0.5 line-clamp-1">{c.contenido}</p>}
                </div>
                <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 whitespace-nowrap">
                  {dias <= 0 ? "Hoy" : dias === 1 ? "Mañana" : `En ${dias}d`}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Timeline principal */}
      {renderList.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Timeline vacío. Usa los botones de arriba para añadir eventos, notas o citas.
        </div>
      ) : (
        <div className="relative pl-8">
          <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-gray-100" />
          {(() => {
            let currentMonth = ""
            return renderList.map(ri => {
            if (ri.rType === "header") {
              currentMonth = ri.month
              const st = monthStatus.get(ri.month) ?? "empty"
              const dotColor = st === "warning" ? "#dc2626" : st === "ok" ? "#16a34a" : "#d1d5db"
              const collapsed = collapsedMonths.has(ri.month)
              return (
                <div key={ri.rKey}
                  className="relative -ml-8 flex items-center gap-2 my-4 cursor-pointer select-none group"
                  onClick={() => toggleMonth(ri.month)}
                >
                  <span className="w-2 h-2 rounded-full shrink-0 transition-colors" style={{ backgroundColor: dotColor }} />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest capitalize group-hover:text-gray-600 transition-colors">{ri.month}</span>
                  <div className="flex-1 h-px bg-gray-100 ml-1" />
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className="shrink-0 transition-transform duration-150"
                    style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              )
            }

            if (collapsedMonths.has(currentMonth)) return null

            const { item } = ri

            if (item.kind === "fase") {
              const f = item.data
              const s = FASE_ESTADO_COLOR[f.estado] ?? FASE_ESTADO_COLOR.PENDIENTE
              const editing = editFaseId === f.id
              return (
                <div key={ri.rKey} className="relative mb-3">
                  <div className="absolute -left-[22px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm z-10"
                    style={{ backgroundColor: s.dot }} />
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: s.bg, color: s.text }}>
                            {f.estado === "PENDIENTE" ? "Pendiente" : f.estado === "EN_PROGRESO" ? "En progreso" : f.estado === "COMPLETADO" ? "Completado" : "Bloqueado"}
                          </span>
                          <span className="text-xs text-gray-400">Fase {f.orden}</span>
                          {f.fechaPlan && !editing && (
                            <span className="text-xs text-gray-400">{fmtFecha(f.fechaPlan)}</span>
                          )}
                        </div>
                        <h4 className="font-semibold text-gray-900 mt-1">{f.nombre}</h4>
                        {!editing && f.estado === "BLOQUEADO" && (() => {
                          const prevFase = pp.fases.find(p => p.orden === f.orden - 1)
                          return prevFase && prevFase.estado !== "COMPLETADO" ? (
                            <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                              </svg>
                              <span>Esperando: {prevFase.nombre}</span>
                            </div>
                          ) : null
                        })()}
                        {!editing && !collapsedItems.has(f.id) && f.fechaReal && (
                          <span className="text-xs text-green-600">Real: {fmtFecha(f.fechaReal)}</span>
                        )}
                        {!editing && !collapsedItems.has(f.id) && f.notas && <p className="text-xs text-gray-500 mt-1 italic">{f.notas}</p>}
                      </div>
                      {!editing && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => abrirEditFase(f)}
                            className="text-gray-300 hover:text-teal-600 p-1 rounded-lg hover:bg-gray-50 transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button onClick={() => toggleCollapse(f.id)}
                            className="p-1 rounded-lg hover:bg-gray-50 transition-colors text-gray-300 hover:text-gray-500">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                              style={{ transform: collapsedItems.has(f.id) ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                              <polyline points="6 9 12 15 18 9"/>
                            </svg>
                          </button>
                        </div>
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
            }

            if (item.kind === "hito") {
              const h = item.data
              const editingHito = editHitoId === h.id
              return (
                <div key={ri.rKey} className="relative mb-3">
                  <div className="absolute -left-[24px] top-3.5 w-4 h-4 rotate-45 border-2 border-white shadow-sm z-10 rounded-sm"
                    style={{ backgroundColor: editingHito ? "#00A99D" : h.completado ? "#16a34a" : ORANGE }} />
                  <div className={`rounded-2xl border p-4 ${editingHito ? "bg-teal-50 border-teal-200" : "bg-amber-50 border-amber-100"}`}>
                    {editingHito ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wide">Hito</span>
                          <span className="text-[10px] text-teal-600 font-semibold">Editando</span>
                        </div>
                        <input
                          autoFocus
                          value={editHitoForm.titulo}
                          onChange={e => setEditHitoForm(p => ({ ...p, titulo: e.target.value }))}
                          onKeyDown={e => { if (e.key === "Escape") setEditHitoId(null) }}
                          placeholder="Título del hito"
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                        />
                        <input
                          value={editHitoForm.descripcion}
                          onChange={e => setEditHitoForm(p => ({ ...p, descripcion: e.target.value }))}
                          placeholder="Descripción (opcional)"
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Fecha planificada *</label>
                            <input type="date" value={editHitoForm.fecha}
                              onChange={e => setEditHitoForm(p => ({ ...p, fecha: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Fecha real</label>
                            <input type="date" value={editHitoForm.fechaReal}
                              onChange={e => setEditHitoForm(p => ({ ...p, fechaReal: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => guardarHito(h.id)} disabled={guardando}
                            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                            style={{ backgroundColor: "#00A99D" }}>
                            {guardando ? "Guardando…" : "Guardar"}
                          </button>
                          <button onClick={() => setEditHitoId(null)}
                            className="px-4 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-teal-100 transition-colors">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between gap-3 cursor-pointer select-none" onClick={() => toggleCollapse(h.id)}>
                          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Hito</span>
                            <span className="text-xs text-gray-400">{fmtFecha(h.fecha)}</span>
                            {h.completado && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Completado</span>}
                            <span className="font-semibold text-gray-900 text-sm truncate">{h.titulo}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          <button onClick={() => toggleHito(h)} title={h.completado ? "Marcar pendiente" : "Marcar completado"}
                            className="p-1.5 rounded-lg hover:bg-amber-100 transition-colors text-amber-600">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </button>
                          <button onClick={() => abrirEditHito(h)} title="Editar hito"
                            className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors text-gray-300 hover:text-blue-500">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button onClick={() => eliminarHito(h.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-red-400">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            className="transition-transform duration-200" style={{ transform: collapsedItems.has(h.id) ? "rotate(-90deg)" : "rotate(0deg)" }}>
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </div>
                      </div>
                      {!collapsedItems.has(h.id) && (
                        <div className="mt-2 pt-2 border-t border-amber-100 space-y-0.5">
                          {h.descripcion && <p className="text-xs text-gray-500">{h.descripcion}</p>}
                          {h.fechaReal && !h.completado && <p className="text-xs text-gray-400">Fecha real: {fmtFecha(h.fechaReal)}</p>}
                          {h.completado && h.fechaReal && <p className="text-xs text-green-600">Completado el {fmtFecha(h.fechaReal)}</p>}
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                </div>
              )
            }

            if (item.kind === "entrada") {
              const e = item.data
              const isFutureCita = e.tipo === "CITA" && e.fechaCita && new Date(e.fechaCita).getTime() > now
              const cardStyle: Record<string, { bg: string; border: string; dotColor: string; labelColor: string; label: string }> = {
                EVENTO:     { bg: "bg-orange-50",  border: "border-orange-100", dotColor: "#f97316", labelColor: "text-orange-600", label: "Evento" },
                COMENTARIO: { bg: "bg-gray-50",    border: "border-gray-200",   dotColor: "#9ca3af", labelColor: "text-gray-500",   label: "Nota" },
                CITA:       { bg: isFutureCita ? "bg-blue-50"  : "bg-slate-50",
                               border: isFutureCita ? "border-blue-100" : "border-slate-200",
                               dotColor: isFutureCita ? "#3b82f6" : "#94a3b8",
                               labelColor: isFutureCita ? "text-blue-600" : "text-slate-500", label: "Cita" },
              }
              const cs = cardStyle[e.tipo] ?? cardStyle.COMENTARIO
              const fechaDisplay = e.tipo === "CITA" && e.fechaCita
                ? new Date(e.fechaCita).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                : new Date(e.fechaEntrada).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
              const editing = editEntradaId === e.id
              return (
                <div key={ri.rKey} className="relative mb-3">
                  <div className="absolute -left-[22px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm z-10"
                    style={{ backgroundColor: editing ? "#00A99D" : cs.dotColor }} />
                  <div className={`rounded-2xl border p-4 ${cs.bg} ${editing ? "border-teal-300" : cs.border}`}>
                    {editing ? (
                      /* ── Modo edición ── */
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wide ${cs.labelColor}`}>{cs.label}</span>
                          <span className="text-[10px] text-teal-600 font-semibold">Editando</span>
                        </div>
                        {(e.tipo === "EVENTO" || e.tipo === "CITA") && (
                          <input
                            autoFocus
                            value={editEntradaForm.titulo}
                            onChange={ev => setEditEntradaForm(p => ({ ...p, titulo: ev.target.value }))}
                            placeholder={e.tipo === "EVENTO" ? "¿Qué ocurrió?" : "Título de la reunión"}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                          />
                        )}
                        {e.tipo === "CITA" && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Fecha *</label>
                                <input type="date" value={editEntradaForm.fechaCita}
                                  onChange={ev => setEditEntradaForm(p => ({ ...p, fechaCita: ev.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Hora</label>
                                <input type="time" value={editEntradaForm.horaCita}
                                  onChange={ev => setEditEntradaForm(p => ({ ...p, horaCita: ev.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                              </div>
                            </div>
                            <input value={editEntradaForm.personaCita}
                              onChange={ev => setEditEntradaForm(p => ({ ...p, personaCita: ev.target.value }))}
                              placeholder="Con quién (persona, cargo…)"
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                            <div>
                              <label className="block text-xs text-gray-500 mb-1.5">Tipo de reunión</label>
                              <div className="flex flex-wrap gap-2">
                                {[{ v: "PRESENCIAL", l: "Presencial" }, { v: "TEAMS", l: "Teams" }, { v: "ZOOM", l: "Zoom" }, { v: "GOOGLE_MEET", l: "Meet" }].map(opt => (
                                  <button key={opt.v} type="button"
                                    onClick={() => setEditEntradaForm(p => ({ ...p, lugarCita: p.lugarCita === opt.v ? "" : opt.v }))}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                      editEntradaForm.lugarCita === opt.v ? "text-white" : "bg-white text-gray-700 border-gray-200"
                                    }`}
                                    style={editEntradaForm.lugarCita === opt.v ? { backgroundColor: "#3b82f6", borderColor: "#3b82f6" } : undefined}>
                                    {opt.l}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <input value={editEntradaForm.motivoCita}
                              onChange={ev => setEditEntradaForm(p => ({ ...p, motivoCita: ev.target.value }))}
                              placeholder="Motivo de la cita (opcional)"
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-gray-500 shrink-0">Importancia:</span>
                              {[{ v: "1", l: "Normal", col: "#374151" }, { v: "2", l: "Importante", col: "#f97316" }, { v: "3", l: "Crítica", col: "#dc2626" }].map(opt => (
                                <button key={opt.v} type="button"
                                  onClick={() => setEditEntradaForm(p => ({ ...p, importanciaCita: p.importanciaCita === opt.v ? "" : opt.v }))}
                                  className="px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all"
                                  style={editEntradaForm.importanciaCita === opt.v ? { backgroundColor: opt.col, color: "white", borderColor: opt.col } : { backgroundColor: "white", color: opt.col, borderColor: "#e5e7eb" }}>
                                  {opt.l}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                        {(e.tipo === "EVENTO" || e.tipo === "COMENTARIO") && (
                          <div className="flex items-center gap-3">
                            <label className="text-xs text-gray-500 shrink-0">
                              {e.tipo === "EVENTO" ? "Fecha del evento" : "Fecha de la nota"}
                            </label>
                            <input type="date" value={editEntradaForm.fechaEntrada}
                              onChange={ev => setEditEntradaForm(p => ({ ...p, fechaEntrada: ev.target.value }))}
                              className="px-3 py-1.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                          </div>
                        )}
                        <textarea
                          value={editEntradaForm.contenido}
                          onChange={ev => setEditEntradaForm(p => ({ ...p, contenido: ev.target.value }))}
                          placeholder={e.tipo === "COMENTARIO" ? "Escribe tu nota…" : "Notas adicionales (opcional)"}
                          rows={e.tipo === "COMENTARIO" ? 3 : 2}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white resize-none"
                          {...(e.tipo === "COMENTARIO" ? { autoFocus: true } : {})}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => guardarEntrada(e.id, e.tipo)} disabled={guardando}
                            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-opacity"
                            style={{ backgroundColor: "#00A99D" }}>
                            {guardando ? "Guardando…" : "Guardar"}
                          </button>
                          <button onClick={() => setEditEntradaId(null)}
                            className="px-4 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-white/60 transition-colors">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Modo lectura ── */
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className={`text-[10px] font-bold uppercase tracking-wide ${cs.labelColor}`}>{cs.label}</span>
                            <span className="text-xs text-gray-400">{fechaDisplay}</span>
                            {isFutureCita && (() => {
                              const dias = Math.ceil((new Date(e.fechaCita!).getTime() - now) / 86400000)
                              return (
                                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                                  {dias <= 0 ? "Hoy" : dias === 1 ? "Mañana" : `En ${dias}d`}
                                </span>
                              )
                            })()}
                          </div>
                          {e.titulo && e.titulo !== "Nota" && (
                            <h4 className="font-semibold text-gray-900 text-sm leading-tight">{e.titulo}</h4>
                          )}
                          {e.contenido && (
                            <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap">{e.contenido}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400 flex-wrap">
                            {e.personaCita && (
                              <span>Con: <span className="font-medium text-gray-600">{e.personaCita}</span></span>
                            )}
                            {e.lugarCita && (
                              <span className="px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: "#dbeafe", color: "#1d4ed8" }}>
                                {e.lugarCita === "PRESENCIAL" ? "Presencial" : e.lugarCita === "TEAMS" ? "Teams" : e.lugarCita === "ZOOM" ? "Zoom" : "Meet"}
                              </span>
                            )}
                            {e.motivoCita && <span className="text-gray-500 italic">{e.motivoCita}</span>}
                            {(e.importanciaCita ?? 0) >= 2 && (
                              <span className="px-2 py-0.5 rounded-full font-bold"
                                style={e.importanciaCita === 3 ? { backgroundColor: "#fef2f2", color: "#dc2626" } : { backgroundColor: "#fff7ed", color: "#f97316" }}>
                                {e.importanciaCita === 3 ? "Crítica" : "Importante"}
                              </span>
                            )}
                            <span>— {e.autor}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => abrirEditEntrada(e)}
                            className="p-1.5 rounded-lg hover:bg-white/70 transition-colors text-gray-300 hover:text-blue-500"
                            title="Editar">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button onClick={() => eliminarEntrada(e.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-300 hover:text-red-400"
                            title="Eliminar">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            }

            return null
          })
          })()}
        </div>
      )}

      </>}
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

function TabMateriales({ pp, onUpdate }: { pp: Proyecto; onUpdate: (p: Proyecto) => void }) {
  const { success, error: toastError } = useToast()
  const [mostrarPicker, setMostrarPicker] = useState(false)
  const [catalogo, setCatalogo] = useState<CatalogoItemPicker[]>([])
  const [catalogoId, setCatalogoId] = useState("")
  const [unidadesDisp, setUnidadesDisp] = useState<UnidadDisponible[]>([])
  const [loadingUnidades, setLoadingUnidades] = useState(false)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [asignando, setAsignando] = useState(false)
  const [modoGestion, setModoGestion] = useState(false)
  const [selDesasign, setSelDesasign] = useState<Set<string>>(new Set())

  function toggleDesasign(id: string) {
    setSelDesasign(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function desasignarSeleccionados() {
    if (selDesasign.size === 0) return
    setAsignando(true)
    try {
      await Promise.all(
        Array.from(selDesasign).map(id =>
          fetch(`/api/hardware/unidades/${id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ proyectoId: null, estado: "DISPONIBLE" }),
          })
        )
      )
      const ids = selDesasign
      onUpdate({ ...pp, hardwareUnidades: pp.hardwareUnidades.filter(u => !ids.has(u.id)) })
      setSelDesasign(new Set()); setModoGestion(false)
      success(`${ids.size} unidad${ids.size !== 1 ? "es" : ""} desasignada${ids.size !== 1 ? "s" : ""}`)
    } catch {
      toastError("Error al desasignar")
    } finally {
      setAsignando(false)
    }
  }

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
          proyectoId: pp.id,
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
        body: JSON.stringify({ proyectoId: null, estado: "DISPONIBLE" }),
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
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-gray-900">Materiales asignados</h3>
        <div className="flex items-center gap-2">
          {pp.hardwareUnidades.length > 0 && (
            <button onClick={() => { setModoGestion(g => !g); setSelDesasign(new Set()) }}
              className="px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors"
              style={modoGestion
                ? { backgroundColor: "#fef2f2", borderColor: "#fecaca", color: "#dc2626" }
                : { borderColor: "#e5e7eb", color: "#6b7280" }}>
              {modoGestion ? "Cancelar" : "Gestionar"}
            </button>
          )}
          <button onClick={() => setMostrarPicker(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Añadir
          </button>
        </div>
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
                  const seleccionadoDesasign = selDesasign.has(u.id)
                  return (
                    <div key={u.id}
                      className="flex items-center justify-between bg-white rounded-xl border p-3.5 transition-colors"
                      style={{ borderColor: seleccionadoDesasign ? "#fca5a5" : "#f3f4f6", backgroundColor: seleccionadoDesasign ? "#fff5f5" : "white" }}>
                      {modoGestion && (
                        <input type="checkbox" checked={seleccionadoDesasign} onChange={() => toggleDesasign(u.id)}
                          className="w-4 h-4 rounded mr-3 shrink-0 accent-red-500" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: hw.bg, color: hw.color }}>{hw.label}</span>
                          {u.numSerie && <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">S/N: {u.numSerie}</span>}
                        </div>
                        <p className="text-sm font-medium text-gray-900">{u.catalogo.marca} {u.catalogo.modelo}</p>
                        {u.notas && <p className="text-xs text-gray-400 mt-0.5">{u.notas}</p>}
                      </div>
                      {!modoGestion && (
                      <button onClick={() => desasignarHW(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors ml-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk desasign bar */}
      {modoGestion && (
        <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <span className="text-sm text-red-600">
            {selDesasign.size === 0 ? "Selecciona unidades para desasignar" : `${selDesasign.size} unidad${selDesasign.size !== 1 ? "es" : ""} seleccionada${selDesasign.size !== 1 ? "s" : ""}`}
          </span>
          <button onClick={desasignarSeleccionados} disabled={asignando || selDesasign.size === 0}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: "#dc2626" }}>
            {asignando ? "Desasignando…" : "Desasignar"}
          </button>
        </div>
      )}

      {/* Solicitudes de material */}
      {pp.solicitudes.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3">Solicitudes de material <span className="text-xs font-normal text-gray-400">({pp.solicitudes.length})</span></h3>
          <div className="space-y-2">
            {pp.solicitudes.map(sol => (
              <SolicitudRow key={sol.id} sol={sol} ppId={pp.id} onEstadoChange={(id, estado) =>
                onUpdate({ ...pp, solicitudes: pp.solicitudes.map(s => s.id === id ? { ...s, estado } : s) })
              }/>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SolicitudRow({ sol, ppId, onEstadoChange }: {
  sol: Solicitud; ppId: string; onEstadoChange: (id: string, estado: string) => void
}) {
  const { success, error: toastError } = useToast()
  const [saving, setSaving] = useState(false)

  async function cambiarEstado(nuevoEstado: string) {
    setSaving(true)
    try {
      const r = await fetch(`/api/proyectos/${ppId}/solicitudes/${sol.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      if (!r.ok) throw new Error()
      onEstadoChange(sol.id, nuevoEstado)
      success("Estado actualizado")
    } catch { toastError("Error al actualizar") }
    finally { setSaving(false) }
  }

  const est = SOLICITUD_ESTADO[sol.estado] ?? { label: sol.estado, color: "#6b7280", bg: "#f3f4f6" }
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{sol.titulo}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(sol.fechaSolicitud).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
            {sol.lineas.length > 0 && ` · ${sol.lineas.length} línea${sol.lineas.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <select
          value={sol.estado}
          onChange={e => cambiarEstado(e.target.value)}
          disabled={saving}
          className="text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-400 shrink-0 border-0 appearance-none"
          style={{ backgroundColor: est.bg, color: est.color, minWidth: "fit-content" }}>
          {Object.entries(SOLICITUD_ESTADO).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ========== TAB CONTACTOS ==========

const CONTACTO_FORM_EMPTY = { nombre: "", cargo: "", email: "", telefono: "" }

function TabContactos({ pp, onUpdate }: { pp: Proyecto; onUpdate: (p: Proyecto) => void }) {
  const { success, error: toastError } = useToast()
  const [contactosHospital, setContactosHospital] = useState<Contacto[]>([])
  const [guardando, setGuardando] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(CONTACTO_FORM_EMPTY)
  const linked = new Set(pp.contactos.map(c => c.contacto.id))

  useEffect(() => {
    fetch(`/api/hospitales/${pp.hospital.id}/contactos`).then(r => r.json()).then(data => {
      setContactosHospital(Array.isArray(data) ? data : [])
    })
  }, [pp.hospital.id])

  async function vincular(c: Contacto) {
    setGuardando(true)
    try {
      await fetch(`/api/proyectos/${pp.id}/contactos`, {
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
      await fetch(`/api/proyectos/${pp.id}/contactos`, {
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

  async function setPrincipal(contactoId: string, isPrincipal: boolean) {
    try {
      const r = await fetch(`/api/hospitales/${pp.hospital.id}/contactos/${contactoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ principal: isPrincipal }),
      })
      if (!r.ok) throw new Error()
      onUpdate({
        ...pp,
        contactos: pp.contactos.map(({ contacto: c }) => ({
          contacto: { ...c, principal: c.id === contactoId ? isPrincipal : (isPrincipal ? false : c.principal) },
        })),
      })
      success(isPrincipal ? "Marcado como principal" : "Principal eliminado")
    } catch { toastError("Error") }
  }

  async function crearYVincular(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) return
    setGuardando(true)
    try {
      // 1. Crear el contacto en el hospital
      const r1 = await fetch(`/api/hospitales/${pp.hospital.id}/contactos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          cargo: form.cargo.trim() || null,
          email: form.email.trim() || null,
          telefono: form.telefono.trim() || null,
        }),
      })
      if (!r1.ok) { const d = await r1.json(); throw new Error(d.error ?? "Error al crear contacto") }
      const nuevoContacto: Contacto = await r1.json()

      // 2. Vincular al proyecto
      await fetch(`/api/proyectos/${pp.id}/contactos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactoId: nuevoContacto.id }),
      })

      setContactosHospital(prev => [...prev, nuevoContacto])
      onUpdate({ ...pp, contactos: [...pp.contactos, { contacto: nuevoContacto }] })
      setForm(CONTACTO_FORM_EMPTY)
      setMostrarForm(false)
      success("Contacto creado y vinculado")
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Error")
    } finally {
      setGuardando(false)
    }
  }

  const disponibles = contactosHospital.filter(c => !linked.has(c.id))

  return (
    <div className="space-y-5">
      {/* Contactos vinculados */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">
            Contactos del proyecto
            {pp.contactos.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">{pp.contactos.length}</span>
            )}
          </h3>
          <button
            onClick={() => setMostrarForm(v => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: TEAL }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {mostrarForm ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}
            </svg>
            {mostrarForm ? "Cancelar" : "Nuevo contacto"}
          </button>
        </div>

        {/* Formulario crear contacto */}
        {mostrarForm && (
          <form onSubmit={crearYVincular} className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Crear y vincular contacto</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <input
                  required
                  value={form.nombre}
                  onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Nombre *"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                />
              </div>
              <input
                value={form.cargo}
                onChange={e => setForm(p => ({ ...p, cargo: e.target.value }))}
                placeholder="Cargo"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              />
              <input
                value={form.telefono}
                onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                placeholder="Teléfono"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              />
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="Email"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white sm:col-span-2"
              />
            </div>
            <button
              type="submit"
              disabled={guardando || !form.nombre.trim()}
              className="w-full py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ backgroundColor: TEAL }}
            >
              {guardando ? "Guardando…" : "Crear y vincular"}
            </button>
          </form>
        )}

        {/* Lista vinculados */}
        {pp.contactos.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Sin contactos vinculados. Crea uno nuevo o vincula uno del hospital.</p>
        ) : (
          <div className="space-y-2">
            {pp.contactos.map(({ contacto: c }) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-4 bg-gray-50">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 text-sm">{c.nombre}</p>
                    {c.principal && <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-semibold">Principal</span>}
                  </div>
                  {c.cargo && <p className="text-xs text-gray-500 mt-0.5">{c.cargo}</p>}
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    {c.email && <a href={`mailto:${c.email}`} className="hover:text-teal-600 transition-colors">{c.email}</a>}
                    {c.telefono && <a href={`tel:${c.telefono}`} className="hover:text-teal-600 transition-colors">{c.telefono}</a>}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  <button
                    onClick={() => setPrincipal(c.id, !c.principal)}
                    title={c.principal ? "Quitar principal" : "Marcar como principal"}
                    className={`p-1.5 rounded-lg transition-colors ${c.principal ? "text-amber-400 hover:text-amber-600" : "text-gray-200 hover:text-amber-400"}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={c.principal ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => desvincular(c.id)}
                    title="Desvincular"
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contactos del hospital disponibles para vincular */}
      {disponibles.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Otros contactos del hospital
            <span className="ml-1.5 text-gray-400 font-normal">— vincular directamente</span>
          </h4>
          <div className="space-y-2">
            {disponibles.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-xl border border-gray-100 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">{c.nombre}</p>
                  {c.cargo && <p className="text-xs text-gray-400">{c.cargo}</p>}
                </div>
                <button
                  onClick={() => vincular(c)}
                  disabled={guardando}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: TEAL }}
                >
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

function TabVisitas({ pp, onUpdate }: { pp: Proyecto; onUpdate: (p: Proyecto) => void }) {
  const router = useRouter()
  const { error: toastError } = useToast()
  const estadoColor = (e: string) => VISITA_ESTADO_COLOR[e] ?? "#6b7280"
  const [mostrarCrear, setMostrarCrear] = useState(false)
  const [tipoCrear, setTipoCrear] = useState("PROYECTOS")
  const [creando, setCreando] = useState(false)
  const [filtroVisita, setFiltroVisita] = useState("TODAS")

  const visitasFiltradas = filtroVisita === "TODAS"
    ? pp.visitas
    : pp.visitas.filter(v => v.estado === filtroVisita)

  async function crearVisita() {
    setCreando(true)
    try {
      const r = await fetch("/api/visitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalId: pp.hospital.id, tipo: tipoCrear, proyectoId: pp.id }),
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
          <Link href={`/visitas?proyectoId=${pp.id}`}
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

      {/* Filtros de estado */}
      {pp.visitas.length > 0 && (
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {(["TODAS", "BORRADOR", "COMPLETADA", "ARCHIVADA"] as const).map(e => {
            const color = e === "TODAS" ? "#6b7280" : (VISITA_ESTADO_COLOR[e] ?? "#6b7280")
            const active = filtroVisita === e
            const count = e === "TODAS" ? pp.visitas.length : pp.visitas.filter(v => v.estado === e).length
            if (e !== "TODAS" && count === 0) return null
            return (
              <button key={e} onClick={() => setFiltroVisita(e)}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                style={active
                  ? { backgroundColor: color + "18", borderColor: color, color }
                  : { backgroundColor: "#f9fafb", borderColor: "#e5e7eb", color: "#9ca3af" }}>
                {e === "TODAS" ? "Todas" : e === "BORRADOR" ? "Borrador" : e === "COMPLETADA" ? "Completada" : "Archivada"}
                <span className="ml-1 opacity-70">{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {mostrarCrear && (
        <div className="bg-white rounded-2xl border border-teal-200 p-5 shadow-sm mb-4">
          <h4 className="font-semibold text-gray-900 mb-3">Nueva visita vinculada</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo de visita</label>
              <div className="flex gap-2">
                {["PROYECTOS", "VENTAS"].map(t => (
                  <button key={t} type="button" onClick={() => setTipoCrear(t)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      tipoCrear === t ? "text-white" : "bg-white text-gray-700 border-gray-200"
                    }`}
                    style={tipoCrear === t ? { backgroundColor: TEAL, borderColor: TEAL } : undefined}>
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
      ) : visitasFiltradas.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-sm">Sin visitas con estado <span className="font-medium">{filtroVisita.toLowerCase()}</span></p>
        </div>
      ) : (
        <div className="space-y-2">
          {visitasFiltradas.map(v => (
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

// ========== TAB MÓDULOS INLAB ==========

type EstadoModulo = "PENDIENTE" | "EN_INSTALACION" | "INSTALADO" | "FORMACION" | "VALIDADO"

const ESTADO_MODULO_LABEL: Record<EstadoModulo, string> = {
  PENDIENTE: "Pendiente", EN_INSTALACION: "En instalación",
  INSTALADO: "Instalado", FORMACION: "Formación", VALIDADO: "Validado",
}
const ESTADO_MODULO_COLOR: Record<EstadoModulo, string> = {
  PENDIENTE: "bg-gray-100 text-gray-500", EN_INSTALACION: "bg-blue-50 text-blue-600",
  INSTALADO: "bg-teal-50 text-teal-600", FORMACION: "bg-amber-50 text-amber-600",
  VALIDADO: "bg-emerald-50 text-emerald-600",
}

function TabModulos({ pp, onUpdate }: { pp: Proyecto; onUpdate: (p: Proyecto) => void }) {
  const toast = useToast()
  const [editando, setEditando] = useState(false)
  const [todosModulos, setTodosModulos] = useState<ModuloInfo[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const modulos = pp.modulos ?? []

  useEffect(() => {
    fetch("/api/modulos-inlab").then(r => r.ok ? r.json() : []).then(d => {
      if (Array.isArray(d)) setTodosModulos(d.filter((m: { activo: boolean }) => m.activo))
    })
  }, [])

  function startEdit() {
    setSelectedIds(modulos.map(m => m.modulo.id))
    setEditando(true)
  }

  function toggleModulo(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function guardar() {
    setSaving(true)
    const r = await fetch(`/api/proyectos/${pp.id}/modulos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduloIds: selectedIds }),
    })
    if (r.ok) {
      const data = await r.json()
      onUpdate({ ...pp, modulos: data })
      toast.success("Módulos actualizados")
      setEditando(false)
    } else {
      toast.error("Error al guardar módulos")
    }
    setSaving(false)
  }

  async function cambiarEstado(moduloId: string, estado: EstadoModulo) {
    const r = await fetch(`/api/proyectos/${pp.id}/modulos/${moduloId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    })
    if (r.ok) {
      const updated = await r.json()
      onUpdate({
        ...pp,
        modulos: modulos.map(m => m.modulo.id === moduloId ? { ...m, estado: updated.estado } : m),
      })
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Módulos INLAB</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {(editando ? selectedIds.length : modulos.length)} módulo{(editando ? selectedIds.length : modulos.length) !== 1 ? "s" : ""} asignado{(editando ? selectedIds.length : modulos.length) !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editando ? (
            <>
              <button onClick={() => setEditando(false)}
                className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving}
                className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: TEAL }}>
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </>
          ) : (
            <button onClick={startEdit}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Editar
            </button>
          )}
        </div>
      </div>

      {editando ? (
        <div className="space-y-2.5">
          {todosModulos.map(m => (
            <label key={m.id} className="flex items-center gap-3 cursor-pointer group p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <input type="checkbox" className="rounded w-4 h-4 cursor-pointer"
                style={{ accentColor: TEAL }}
                checked={selectedIds.includes(m.id)}
                onChange={() => toggleModulo(m.id)} />
              <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">{m.nombre}</span>
            </label>
          ))}
          {todosModulos.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No hay módulos INLAB configurados.</p>
          )}
        </div>
      ) : modulos.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No hay módulos asignados.{" "}
          <button onClick={startEdit} className="underline cursor-pointer" style={{ color: TEAL }}>Añadir módulos</button>
        </p>
      ) : (
        <div className="space-y-2">
          {modulos.map(pm => (
            <div key={pm.modulo.id} className="flex items-center gap-3 px-3 py-2 rounded-xl border border-gray-100 dark:border-gray-800 min-h-[52px]">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: TEAL }} />
              <span className="text-sm text-gray-800 dark:text-gray-200 flex-1 min-w-0">{pm.modulo.nombre}</span>
              <select value={pm.estado}
                onChange={e => cambiarEstado(pm.modulo.id, e.target.value as EstadoModulo)}
                className={`text-xs font-semibold px-2.5 py-2.5 rounded-lg border-0 cursor-pointer focus:outline-none focus:ring-2 shrink-0 min-h-[44px] min-w-[130px] ${ESTADO_MODULO_COLOR[pm.estado as EstadoModulo] ?? ""}`}
                style={{ ["--tw-ring-color" as string]: TEAL }}>
                {(Object.keys(ESTADO_MODULO_LABEL) as EstadoModulo[]).map(e => (
                  <option key={e} value={e}>{ESTADO_MODULO_LABEL[e]}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ========== TAB ADJUNTOS ==========

function TabAdjuntos({ pp, onUpdate }: { pp: Proyecto; onUpdate: (p: Proyecto) => void }) {
  const { success, error: toastError } = useToast()
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([])
  const [loadingAdj, setLoadingAdj] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/proyectos/${pp.id}/adjuntos`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setAdjuntos(d) })
      .finally(() => setLoadingAdj(false))
  }, [pp.id])

  async function subir(file: File) {
    if (file.size > 10 * 1024 * 1024) { toastError("El archivo no puede superar 10 MB"); return }
    setSubiendo(true)
    try {
      const fd = new FormData(); fd.append("file", file)
      const r = await fetch(`/api/proyectos/${pp.id}/adjuntos`, { method: "POST", body: fd })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? "Error") }
      const nuevo: Adjunto = await r.json()
      setAdjuntos(prev => [nuevo, ...prev])
      onUpdate({ ...pp, adjuntos: [{ id: nuevo.id }, ...(pp.adjuntos ?? [])] })
      success("Archivo adjuntado")
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : "Error al subir")
    } finally {
      setSubiendo(false)
    }
  }

  async function eliminar(adjuntoId: string) {
    try {
      await fetch(`/api/proyectos/${pp.id}/adjuntos/${adjuntoId}`, { method: "DELETE" })
      setAdjuntos(prev => prev.filter(a => a.id !== adjuntoId))
      onUpdate({ ...pp, adjuntos: (pp.adjuntos ?? []).filter(a => a.id !== adjuntoId) })
      success("Eliminado")
    } catch { toastError("Error") }
  }

  function fmtTamano(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function colorTipo(tipo: string) {
    if (tipo.includes("pdf")) return { bg: "#fef2f2", color: "#dc2626", label: "PDF" }
    if (tipo.includes("image")) return { bg: "#f0fdf4", color: "#16a34a", label: "IMG" }
    if (tipo.includes("word") || tipo.includes("document")) return { bg: "#eff6ff", color: "#2563eb", label: "DOC" }
    if (tipo.includes("excel") || tipo.includes("spreadsheet") || tipo.includes("csv")) return { bg: "#f0fdf4", color: "#16a34a", label: "XLS" }
    if (tipo.includes("zip") || tipo.includes("compressed")) return { bg: "#fef3c7", color: "#d97706", label: "ZIP" }
    return { bg: "#f3f4f6", color: "#6b7280", label: "FILE" }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{adjuntos.length} archivo{adjuntos.length !== 1 ? "s" : ""} adjunto{adjuntos.length !== 1 ? "s" : ""}</p>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" className="hidden" multiple
            onChange={e => { Array.from(e.target.files ?? []).forEach(subir); e.target.value = "" }} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={subiendo}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ backgroundColor: TEAL }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
            {subiendo ? "Subiendo…" : "Subir archivo"}
          </button>
        </div>
      </div>

      {/* Drop hint */}
      {!loadingAdj && adjuntos.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-teal-300 hover:bg-teal-50/30 transition-all"
          onClick={() => fileRef.current?.click()}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: `${TEAL}18`, color: TEAL }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">Haz clic para adjuntar archivos</p>
          <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, imágenes… hasta 10 MB cada uno</p>
        </div>
      )}

      {/* Lista de adjuntos */}
      {loadingAdj ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {adjuntos.map(adj => {
            const ct = colorTipo(adj.tipo)
            return (
              <div key={adj.id} className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 hover:border-gray-200 transition-colors group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-bold" style={{ backgroundColor: ct.bg, color: ct.color }}>
                  {ct.label}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{adj.nombre}</p>
                  <p className="text-xs text-gray-400">{fmtTamano(adj.tamano)} · {adj.creadoPor} · {new Date(adj.creadoEn).toLocaleDateString("es-ES")}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`/api/proyectos/${pp.id}/adjuntos/${adj.id}`}
                    download={adj.nombre}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                    title="Descargar"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  </a>
                  <button onClick={() => eliminar(adj.id)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Eliminar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ========== TAB COCKPIT ==========

function TabCockpit({ pp, onChangeTab }: { pp: Proyecto; onChangeTab: (t: Tab) => void }) {
  const now = new Date()

  const tareasRaiz = (pp.tareas ?? []).filter(t => !t.parentId)
  const totalFases  = pp.fases.length
  const fasesOk     = pp.fases.filter(f => f.estado === "COMPLETADO").length
  const pctFases    = totalFases  > 0 ? Math.round((fasesOk  / totalFases)  * 100) : 0
  const totalTareas = tareasRaiz.length
  const tareasOk    = tareasRaiz.filter(t => t.estado === "COMPLETADA").length
  const pctTareas   = totalTareas > 0 ? Math.round((tareasOk / totalTareas) * 100) : 0
  const totalHitos  = pp.hitos.length
  const hitosOk     = pp.hitos.filter(h => h.completado).length
  const pctHitos    = totalHitos  > 0 ? Math.round((hitosOk  / totalHitos)  * 100) : 0
  const pctOverall  = Math.round(pctFases * 0.5 + pctTareas * 0.3 + pctHitos * 0.2)

  const diasPlan        = pp.fechaFinPlan ? Math.ceil((new Date(pp.fechaFinPlan).getTime() - now.getTime()) / 86400000) : null
  const diasDesdeInicio = pp.fechaInicio  ? Math.floor((now.getTime() - new Date(pp.fechaInicio).getTime()) / 86400000) : null
  const tareasVencidas  = tareasRaiz.filter(t => !["COMPLETADA","CANCELADA"].includes(t.estado) && t.fechaVencimiento && new Date(t.fechaVencimiento) < now).length
  const fasesRetrasadas = pp.fases.filter(f => f.estado !== "COMPLETADO" && f.fechaPlan && new Date(f.fechaPlan) < now).length
  const hitosVencidos   = pp.hitos.filter(h => !h.completado && new Date(h.fecha) < now).length

  const health: "ok"|"riesgo"|"retrasado" =
    pp.estado === "COMPLETADO"                                                     ? "ok"        :
    fasesRetrasadas > 0 || hitosVencidos > 0 || (diasPlan !== null && diasPlan < 0) ? "retrasado" :
    tareasVencidas > 0  || (diasPlan !== null && diasPlan <= 7)                     ? "riesgo"    : "ok"

  const HM = {
    ok:        { label: "En plazo",  color: "#16a34a", dot: "#16a34a" },
    riesgo:    { label: "En riesgo", color: "#d97706", dot: "#f59e0b" },
    retrasado: { label: "Retrasado", color: "#dc2626", dot: "#ef4444" },
  }[health]

  const hwValor = pp.hardwareUnidades.reduce((s, u) => s + (u.catalogo.precio ?? 0), 0)

  type CA = { label: string; sub: string; dias: number; color: string; tipo: "fase"|"tarea"|"hito" }
  const ca: CA[] = [
    ...pp.fases.filter(f => f.estado !== "COMPLETADO" && f.fechaPlan).map(f => {
      const d = Math.ceil((new Date(f.fechaPlan!).getTime() - now.getTime()) / 86400000)
      return { label: f.nombre, sub: "Fase", dias: d, color: d < 0 ? "#dc2626" : d <= 3 ? "#d97706" : TEAL, tipo: "fase" as const }
    }),
    ...tareasRaiz.filter(t => !["COMPLETADA","CANCELADA"].includes(t.estado) && t.fechaVencimiento).map(t => {
      const d = Math.ceil((new Date(t.fechaVencimiento!).getTime() - now.getTime()) / 86400000)
      return { label: t.titulo, sub: "Tarea", dias: d, color: d < 0 ? "#dc2626" : d <= 3 ? "#d97706" : "#6b7280", tipo: "tarea" as const }
    }),
    ...pp.hitos.filter(h => !h.completado).map(h => {
      const d = Math.ceil((new Date(h.fecha).getTime() - now.getTime()) / 86400000)
      return { label: h.titulo, sub: "Hito", dias: d, color: d < 0 ? "#dc2626" : d <= 7 ? "#d97706" : "#6b7280", tipo: "hito" as const }
    }),
  ].sort((a, b) => a.dias - b.dias).slice(0, 6)

  function PBar({ value, color, label, sub }: { value: number; color: string; label: string; sub: string }) {
    return (
      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-semibold text-gray-700">{label}</span>
          <span className="text-gray-400">{sub}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: color }} />
          </div>
          <span className="text-xs font-bold w-8 text-right" style={{ color }}>{value}%</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── KPIs row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Health + ring */}
        <div className="sm:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 flex items-center gap-4"
          style={{ borderTop: `3px solid ${HM.color}` }}>
          <div className="relative shrink-0 w-20 h-20">
            <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
              <circle cx="40" cy="40" r="32" fill="none" stroke="#f3f4f6" strokeWidth="8"/>
              <circle cx="40" cy="40" r="32" fill="none" stroke={HM.color} strokeWidth="8"
                strokeLinecap="round" strokeDasharray={`${(pctOverall / 100) * 201} 201`}/>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-gray-900">{pctOverall}%</span>
              <span className="text-[9px] text-gray-400">avance</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: HM.dot }} />
              <span className="text-base font-bold" style={{ color: HM.color }}>{HM.label}</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              {health === "ok" && diasPlan !== null && diasPlan > 0 ? `Faltan ${diasPlan} días para el cierre planificado.` : ""}
              {health === "riesgo" ? `${tareasVencidas > 0 ? `${tareasVencidas} tarea${tareasVencidas>1?"s":""} vencida${tareasVencidas>1?"s":""}` : `${diasPlan}d hasta el cierre`}.` : ""}
              {health === "retrasado" ? `${fasesRetrasadas > 0 ? `${fasesRetrasadas} fase${fasesRetrasadas>1?"s":""} atrasada${fasesRetrasadas>1?"s":""}` : ""}${hitosVencidos > 0 ? ` · ${hitosVencidos} hito${hitosVencidos>1?"s":""} sin completar` : ""}` : ""}
              {health === "ok" && (diasPlan === null || diasPlan <= 0) ? "Proyecto al día." : ""}
            </p>
          </div>
        </div>

        {/* Tiempo */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Tiempo</p>
          {diasPlan !== null ? (
            <>
              <p className="text-2xl font-bold" style={{ color: diasPlan < 0 ? "#dc2626" : diasPlan <= 7 ? "#d97706" : "#111827" }}>
                {Math.abs(diasPlan)}d
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">{diasPlan < 0 ? "de retraso" : "hasta fin plan"}</p>
            </>
          ) : <p className="text-sm text-gray-300 mt-2">Sin fecha fin</p>}
          {diasDesdeInicio !== null && <p className="text-[10px] text-gray-300 mt-1">{diasDesdeInicio}d en curso</p>}
        </div>

        {/* Hardware */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Hardware</p>
          <p className="text-2xl font-bold text-gray-900">{pp.hardwareUnidades.length}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {hwValor > 0 ? hwValor.toLocaleString("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}) : "unidades asignadas"}
          </p>
          {pp.presupuesto && hwValor > 0 && (
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{
                width: `${Math.min(100,(hwValor/pp.presupuesto)*100)}%`,
                backgroundColor: hwValor > pp.presupuesto ? "#dc2626" : TEAL
              }}/>
            </div>
          )}
        </div>
      </div>

      {/* ── Progress bars ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Avance por sección</p>
        <PBar value={pctFases}  label="Fases"  sub={`${fasesOk}/${totalFases} completadas`}   color={pctFases>=70?"#16a34a":pctFases>=40?TEAL:"#9ca3af"}/>
        <PBar value={pctTareas} label="Tareas" sub={`${tareasOk}/${totalTareas} completadas`} color={pctTareas>=70?"#16a34a":pctTareas>=40?TEAL:"#9ca3af"}/>
        <PBar value={pctHitos}  label="Hitos"  sub={`${hitosOk}/${totalHitos} completados`}   color={pctHitos>=70?"#16a34a":pctHitos>=40?"#f59e0b":"#9ca3af"}/>
      </div>

      {/* ── Ruta crítica ── */}
      {ca.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-50">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            <span className="text-sm font-bold text-gray-800">Ruta crítica — próximas acciones</span>
          </div>
          <div className="divide-y divide-gray-50">
            {ca.map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0"
                  style={{
                    backgroundColor: a.tipo === "fase" ? `${TEAL}18` : a.tipo === "hito" ? "#fef3c7" : "#f3f4f6",
                    color: a.tipo === "fase" ? TEAL : a.tipo === "hito" ? "#d97706" : "#6b7280",
                  }}>
                  {a.sub}
                </span>
                <span className="flex-1 text-sm text-gray-700 font-medium truncate">{a.label}</span>
                <span className="text-xs font-bold shrink-0" style={{ color: a.color }}>
                  {a.dias === 0 ? "Hoy" : a.dias < 0 ? `${Math.abs(a.dias)}d vencido` : `${a.dias}d`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Equipo + Visitas ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Equipo del proyecto</p>
          <div className="space-y-2.5">
            {pp.responsable && (
              <div className="flex items-center gap-2.5 text-xs">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: TEAL }}>
                  {pp.responsable.nombre.charAt(0).toUpperCase()}
                </span>
                <div><p className="font-semibold text-gray-800">{pp.responsable.nombre}</p><p className="text-gray-400">Responsable</p></div>
              </div>
            )}
            {pp.contactos.slice(0,3).map(({contacto: c}) => (
              <div key={c.id} className="flex items-center gap-2.5 text-xs">
                <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold shrink-0">
                  {c.nombre.charAt(0).toUpperCase()}
                </span>
                <div><p className="font-semibold text-gray-800">{c.nombre}</p><p className="text-gray-400">{c.cargo ?? "Contacto"}</p></div>
              </div>
            ))}
            {pp.contactos.length === 0 && !pp.responsable && <p className="text-sm text-gray-300">Sin equipo asignado</p>}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Últimas visitas</p>
            {pp.visitas.length > 0 && (
              <button onClick={() => onChangeTab("Visitas")} className="text-xs font-semibold hover:underline" style={{ color: TEAL }}>
                Ver todas ({pp.visitas.length}) →
              </button>
            )}
          </div>
          {pp.visitas.length === 0
            ? <p className="text-sm text-gray-300">Sin visitas registradas</p>
            : <div className="space-y-1.5">
              {pp.visitas.slice(0,5).map(v => (
                <Link key={v.id} href={`/visitas/${v.id}`} className="flex items-center gap-2 text-xs hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: VISITA_ESTADO_COLOR[v.estado] ?? "#9ca3af" }}/>
                  <span className="text-gray-600 flex-1">{new Date(v.fecha).toLocaleDateString("es-ES",{day:"2-digit",month:"short",year:"2-digit"})}</span>
                  <span className="text-gray-400 truncate max-w-[80px]">{v.usuario.nombre}</span>
                </Link>
              ))}
              {pp.visitas.length > 5 && <p className="text-[10px] text-gray-300 text-center">+{pp.visitas.length-5} más</p>}
            </div>
          }
        </div>
      </div>
    </div>
  )
}

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


// ========== TAB RESUMEN ==========

const TIPO_H_LABEL: Record<string, string> = {
  HOSPITAL_PUBLICO: "Hospital Público", HOSPITAL_PRIVADO: "Hospital Privado",
  CLINICA_PRIVADA: "Clínica Privada", LABORATORIO: "Laboratorio",
  CENTRO_SALUD: "Centro de Salud", UNIVERSIDAD: "Universidad", OTRO: "Otro",
}

function TabComentarios({ pp }: { pp: Proyecto }) {
  const { perfil } = usePerfil()

  if (!perfil) return <div className="py-10 text-center text-sm text-gray-400">Cargando…</div>
  const userInfo = { id: perfil.id, rol: perfil.rol }

  return (
    <div className="max-w-2xl">
      <ComentariosPanel
        endpoint={`/api/proyectos/${pp.id}/comentarios`}
        usuarioId={userInfo.id}
        esAdmin={userInfo.rol === "ADMIN"}
      />
    </div>
  )
}

function TabResumen({ pp, onUpdate }: { pp: Proyecto; onUpdate: (p: Proyecto) => void }) {
  const { success, error: toastError } = useToast()
  const [shareModal, setShareModal] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [savingMapa, setSavingMapa] = useState(false)
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [mapaExpanded, setMapaExpanded] = useState(() => Boolean(pp.mapaHtml))
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

  useEffect(() => {
    if (shareUrl) {
      QRCode.toDataURL(shareUrl, { width: 220, margin: 2, color: { dark: "#111827", light: "#ffffff" } })
        .then(setQrDataUrl).catch(() => setQrDataUrl(null))
    } else {
      setQrDataUrl(null)
    }
  }, [shareUrl])

  async function generateShare() {
    setGenerando(true)
    try {
      const r = await fetch(`/api/proyectos/${pp.id}/share`, { method: "POST" })
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
      await fetch(`/api/proyectos/${pp.id}/share`, { method: "DELETE" })
      onUpdate({ ...pp, shareToken: null })
      success("Enlace revocado"); setCopied(false)
    } catch { toastError("Error") }
    finally { setRevoking(false) }
  }

  async function copyLink() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      // Fallback para HTTP o contextos sin permisos de clipboard
      const ta = document.createElement("textarea")
      ta.value = shareUrl; ta.style.position = "fixed"; ta.style.opacity = "0"
      document.body.appendChild(ta); ta.select()
      document.execCommand("copy"); document.body.removeChild(ta)
    }
    setCopied(true); setTimeout(() => setCopied(false), 2500)
  }

  async function saveMapaContent(html: string) {
    setSavingMapa(true)
    try {
      const r = await fetch(`/api/proyectos/${pp.id}`, {
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
    const win = window.open("", "_blank", "width=1280,height=960")
    if (!win) { toastError("Permite ventanas emergentes para imprimir"); return }
    const fecha = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
    const esc = (s: string) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    // Inyectamos toolbar y CSS directamente en el HTML de Leaflet — sin iframe.
    // Sin iframe no hay rasterización: el mapa se renderiza como HTML nativo en el PDF.
    const toolbar = `<div id="__ptb" style="position:fixed;top:0;left:0;right:0;height:52px;background:#fff;border-bottom:2px solid #00A99D;display:flex;align-items:center;gap:12px;padding:0 20px;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.1)"><span style="font-weight:800;color:#00A99D;font-size:14px;white-space:nowrap">Palex·<span style="color:#F7941D">InLab</span></span><span style="flex:1;font-size:12px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(pp.titulo)} &middot; ${esc(pp.hospital.nombre)} &middot; ${fecha}</span><span id="__pst" style="font-size:11px;color:#9ca3af;white-space:nowrap">Cargando tiles&hellip;</span><button id="__pbp" disabled onclick="window.print()" style="padding:7px 18px;background:#00A99D;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:not-allowed;opacity:.5;white-space:nowrap">Imprimir &mdash; PDF</button><button onclick="window.close()" style="padding:7px 14px;background:#f3f4f6;color:#374151;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">Cerrar</button></div>`
    const printHead = [
      "<style>",
      "@media print{",
      "#__ptb{display:none!important}",
      "@page{margin:0;size:A3 landscape}",
      "html,body{margin:0!important;padding:0!important;overflow:visible!important}",
      "*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}",
      "}",
      "</style>",
      "<scr" + "ipt>",
      "window.addEventListener('load',function(){",
      "setTimeout(function(){",
      "var b=document.getElementById('__pbp'),s=document.getElementById('__pst');",
      "if(b){b.disabled=false;b.style.opacity='1';b.style.cursor='pointer';}",
      "if(s){s.textContent='Listo — puedes imprimir';}",
      "},2500);",
      "});",
      "</scr" + "ipt>",
    ].join("")
    let html = pp.mapaHtml
    if (html.includes("</head>")) {
      html = html.replace("</head>", printHead + "\n</head>")
    } else {
      html = "<head>" + printHead + "</head>" + html
    }
    if (/<body[^>]*>/i.test(html)) {
      html = html.replace(/<body([^>]*)>/i, (m: string) => m + toolbar)
    } else {
      html = toolbar + html
    }
    win.document.write(html)
    win.document.close()
    win.focus()
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
.map-page{display:none;padding:28px 44px;flex-direction:column;min-height:100vh}
@media print{
  .toolbar,.no-print{display:none!important}
  .cover{min-height:100vh;page-break-after:always;break-after:page}
  .phdr{display:flex!important;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:2px solid #00A99D;margin-bottom:20px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .phb{font-weight:800;color:#00A99D;font-size:12px}.phb em{color:#F7941D;font-style:normal}
  .phm{font-size:10px;color:#9ca3af;text-align:right}
  .kgrid,.cmeta{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .pfooter{display:flex!important;justify-content:space-between;padding-top:10px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;margin-top:28px}
  .map-page{display:flex!important;break-before:page;page-break-before:always}
  .map-page #mpf{height:calc(100vh - 100px)!important;min-height:0!important}
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
${pp.mapaHtml ? `<div class="map-page">
  <div class="phdr"><span class="phb">Palex Medical · <em>InLab</em></span><div class="phm"><strong>${e(pp.titulo)}</strong><br>Mapa de instalación · ${e(fecha)}</div></div>
  <p class="stitle" style="margin-bottom:12px">Mapa de instalación — ${e(pp.hospital.nombre)}</p>
  <iframe id="mpf" style="width:100%;flex:1;border:none;display:block;min-height:500px"></iframe>
  <div class="pfooter" style="margin-top:10px"><span>Palex Medical · InLab — Confidencial</span><span>Generado: ${e(fecha)}</span></div>
</div>
<script>(function(){var el=document.getElementById('mpf');el.addEventListener('load',function(){setTimeout(function(){try{window.print();}catch(e){}},2000);});el.srcdoc=${JSON.stringify(pp.mapaHtml).replace(/</g,"\\u003c").replace(/>/g,"\\u003e")};})();<\/script>` : `<script>setTimeout(function(){try{window.print();}catch(e){}},500);<\/script>`}
</body></html>`)
    win.document.close()
    win.focus()
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
          <button onClick={() => window.open(`/api/proyectos/${pp.id}/excel`)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <path d="M8 13h3l1 3 2-6 1 3h3"/>
            </svg>
            Excel
          </button>
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

        {/* Print header (solo impresión) */}
        <div className="hidden print:flex items-start justify-between border-b border-gray-200 pb-5">
          <div>
            <p className="text-xl font-bold" style={{ color: TEAL }}>Palex Medical · InLab</p>
            <p className="text-sm text-gray-500 mt-0.5">Informe de Proyecto — Confidencial</p>
          </div>
          <p className="text-xs text-gray-400">Generado: {genDate}</p>
        </div>

        {/* ── Hero card — visible en pantalla ─────────────────────── */}
        {(() => {
          const isRetrasado = pp.fechaFinPlan && new Date(pp.fechaFinPlan) < new Date()
            && pp.estado !== "COMPLETADO" && pp.estado !== "CANCELADO"
          return (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden print:hidden">
              {/* Gradient accent bar */}
              <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${TEAL} 0%, ${ORANGE} 100%)` }} />
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                  {/* Left: identity */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2.5">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: estadoStyle.bg, color: estadoStyle.text }}>
                        {ESTADO_LABEL[pp.estado]}
                      </span>
                      {pp.prioridad > 0 && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-50" style={{ color: PRIORIDAD[pp.prioridad]?.color }}>
                          {PRIORIDAD[pp.prioridad]?.label}
                        </span>
                      )}
                      {isRetrasado && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600">Retrasado</span>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-2">{pp.titulo}</h2>

                    {/* Hospital row */}
                    <div className="flex items-center gap-2 flex-wrap text-sm mb-3">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                      <span className="font-semibold text-gray-800">{pp.hospital.nombre}</span>
                      {pp.hospital.tipo && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                          {TIPO_H_LABEL[pp.hospital.tipo] ?? pp.hospital.tipo}
                        </span>
                      )}
                      <span className="text-gray-400 text-xs">
                        {pp.hospital.ciudad}{pp.hospital.provincia ? `, ${pp.hospital.provincia}` : ""}
                        {pp.hospital.pais && pp.hospital.pais !== "España" ? ` · ${pp.hospital.pais}` : ""}
                      </span>
                      {pp.hospital.camas && (
                        <span className="text-gray-400 text-xs">{pp.hospital.camas} camas</span>
                      )}
                    </div>

                    {/* Meta chips */}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      {pp.responsable && (
                        <span className="flex items-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                          </svg>
                          {pp.responsable.nombre}
                        </span>
                      )}
                      {pp.hospital.zona && (
                        <span className="flex items-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                          </svg>
                          Zona {pp.hospital.zona.nombre}
                        </span>
                      )}
                      {pp.hospital.direccion && (
                        <span className="flex items-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                          </svg>
                          {pp.hospital.direccion}
                        </span>
                      )}
                      {(pp.fechaInicio || pp.fechaFinPlan) && (
                        <span className="flex items-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          {fmtFecha(pp.fechaInicio)} → {fmtFecha(pp.fechaFinPlan)}
                          {duracionDias ? <span className="text-gray-400"> · {duracionDias} días</span> : null}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: budget */}
                  {pp.presupuesto != null && (
                    <div className="shrink-0 lg:text-right bg-gray-50 rounded-2xl px-5 py-4 border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Presupuesto</p>
                      <p className="text-3xl font-bold tabular-nums" style={{ color: TEAL }}>
                        {pp.presupuesto.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                      </p>
                      {pp.fechaFinReal && (
                        <p className="text-xs font-semibold text-green-600 mt-2 flex items-center gap-1 justify-end">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Entregado: {fmtFecha(pp.fechaFinReal)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {pp.fases.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-gray-50">
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span className="font-medium">{fasesOK} de {pp.fases.length} fases completadas</span>
                      <span className="font-bold" style={{ color: pct === 100 ? "#16a34a" : TEAL }}>{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#16a34a" : TEAL }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* Header card — solo impresión */}
        <div className="hidden print:block bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
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

        {/* ── KPI cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Progreso",  val: `${pct}%`,                          sub: `${fasesOK}/${pp.fases.length} fases`,                                                       color: pct === 100 ? "#16a34a" : TEAL },
            { label: "Hardware",  val: `${pp.hardwareUnidades.length} uds`, sub: totalHW > 0 ? totalHW.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }) : "Sin precios registrados", color: "#7c3aed" },
            { label: "Visitas",   val: `${pp.visitas.length}`,              sub: `${visitasOK} completadas`,                                                                  color: "#0369a1" },
            { label: "Duración",  val: duracionDias ? `${duracionDias} d` : "—", sub: duracionDias ? "días planificados" : (pp.fechaFinReal ? "Entregado" : "Sin fechas"),    color: ORANGE },
          ].map(k => (
            <div key={k.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="h-1 w-full" style={{ backgroundColor: k.color }} />
              <div className="p-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{k.label}</p>
                <p className="text-2xl font-bold leading-none" style={{ color: k.color }}>{k.val}</p>
                <p className="text-xs text-gray-400 mt-1.5">{k.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Share banner ──────────────────────────────────────────── */}
        {pp.shareToken && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border print:hidden"
            style={{ backgroundColor: `${TEAL}08`, borderColor: `${TEAL}30` }}>
            <div className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: TEAL }} />
            <p className="text-xs text-gray-600 flex-1">Enlace público activo — cualquier persona con el enlace puede ver este resumen</p>
            <button onClick={() => setShareModal(true)} className="text-xs font-semibold shrink-0" style={{ color: TEAL }}>Gestionar</button>
          </div>
        )}

        {/* ── MAPA (ahora arriba, pieza clave) ─────────────────────── */}

        {/* Map */}
        {pp.mapaHtml ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            {/* Map toolbar */}
            <div
              className={`px-5 py-3 flex items-center justify-between print:hidden bg-gray-50/60 transition-colors ${mapaExpanded ? "border-b border-gray-100" : ""}`}>
              <button
                onClick={() => setMapaExpanded(v => !v)}
                className="flex items-center gap-2 group min-w-0">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TEAL }} />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Mapa de instalación</p>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  className="shrink-0 ml-0.5 transition-transform duration-200"
                  style={{ transform: mapaExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              <div className="flex items-center gap-1.5">
                {mapaExpanded && (
                  <>
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
                  </>
                )}
                <button onClick={() => fileInputRef.current?.click()} disabled={savingMapa}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all disabled:opacity-40">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  {savingMapa ? "Guardando…" : "Actualizar"}
                </button>
              </div>
            </div>
            {mapaExpanded && (
              <iframe ref={mapRef} srcDoc={pp.mapaHtml} sandbox="allow-scripts"
                onLoad={handleMapLoad} className="w-full border-0 block" style={{ height: mapH }} title="Mapa de instalación" />
            )}
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
            <iframe srcDoc={pp.mapaHtml} sandbox="allow-scripts"
              className="flex-1 border-0 w-full" title="Mapa pantalla completa" />
          </div>
        )}

        {/* ── Hospital (enriquecido) + Contactos ───────────────────── */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Hospital card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between" style={{ backgroundColor: `${TEAL}06` }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${TEAL}18` }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{pp.hospital.nombre}</p>
                  {pp.hospital.tipo && (
                    <span className="text-[10px] font-bold text-blue-600">{TIPO_H_LABEL[pp.hospital.tipo] ?? pp.hospital.tipo}</span>
                  )}
                </div>
              </div>
              <Link href={`/hospitales/${pp.hospital.id}?from=proyecto&pid=${pp.id}`}
                className="text-xs font-semibold shrink-0 flex items-center gap-1 hover:opacity-70 transition-opacity"
                style={{ color: TEAL }}>
                Ver
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
            </div>
            <div className="p-5 grid grid-cols-2 gap-x-4 gap-y-2.5">
              {[
                { label: "Ciudad", value: `${pp.hospital.ciudad}${pp.hospital.provincia ? `, ${pp.hospital.provincia}` : ""}` },
                pp.hospital.camas ? { label: "Camas", value: `${pp.hospital.camas}` } : null,
                pp.hospital.zona ? { label: "Zona", value: pp.hospital.zona.nombre } : null,
                pp.hospital.pais ? { label: "País", value: pp.hospital.pais } : null,
                pp.hospital.tipo ? { label: "Tipo", value: TIPO_H_LABEL[pp.hospital.tipo] ?? pp.hospital.tipo } : null,
              ].filter(Boolean).map((row) => row && (
                <div key={row.label}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{row.label}</p>
                  <p className="text-sm font-semibold text-gray-700">{row.value}</p>
                </div>
              ))}
              {pp.hospital.direccion && (
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Dirección</p>
                  <p className="text-sm font-semibold text-gray-700">{pp.hospital.direccion}</p>
                </div>
              )}
              {/* Mini stats del proyecto para este hospital */}
              <div className="col-span-2 mt-1 pt-3 border-t border-gray-50 grid grid-cols-3 gap-2">
                {[
                  { label: "Visitas", value: pp.visitas.length },
                  { label: "Contactos", value: pp.contactos.length },
                  { label: "Hardware", value: pp.hardwareUnidades.length },
                ].map(s => (
                  <div key={s.label} className="text-center rounded-xl py-2" style={{ backgroundColor: `${TEAL}08` }}>
                    <p className="text-base font-bold" style={{ color: TEAL }}>{s.value}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contactos */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2.5" style={{ backgroundColor: "#f8fafc" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-purple-50">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-800">Contactos del proyecto</p>
              {pp.contactos.length > 0 && (
                <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">{pp.contactos.length}</span>
              )}
            </div>
            <div className="p-5">
              {pp.contactos.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <svg className="mx-auto mb-2 opacity-30" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  </svg>
                  <p className="text-sm">Sin contactos vinculados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pp.contactos.map(({ contacto: c }) => (
                    <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: TEAL }}>
                        {c.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">
                          {c.nombre}
                          {c.principal && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${TEAL}18`, color: TEAL }}>Principal</span>}
                        </p>
                        {c.cargo && <p className="text-xs text-gray-500 mt-0.5">{c.cargo}</p>}
                        <div className="flex gap-2 mt-0.5 text-xs text-gray-400 flex-wrap">
                          {c.email && <span className="truncate">{c.email}</span>}
                          {c.telefono && <span>{c.telefono}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Hardware table ────────────────────────────────────────── */}
        {pp.hardwareUnidades.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2.5" style={{ backgroundColor: "#faf5ff" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-purple-100">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-800">Inventario de hardware</p>
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-600">{pp.hardwareUnidades.length} uds</span>
              {totalHW > 0 && <span className="text-sm font-bold" style={{ color: "#7c3aed" }}>{totalHW.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</span>}
            </div>
            <div className="p-6 space-y-5">
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
              <div className="mx-6 mb-5 pt-4 border-t-2 border-gray-200 flex justify-between items-center">
                <span className="font-bold text-gray-700">Total hardware</span>
                <span className="text-xl font-bold" style={{ color: "#7c3aed" }}>{totalHW.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Visitas ───────────────────────────────────────────────── */}
        {pp.visitas.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2.5" style={{ backgroundColor: "#f0f9ff" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-blue-100">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-800">Visitas del proyecto</p>
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">{pp.visitas.length}</span>
              <span className="text-xs text-gray-400">{visitasOK} completadas</span>
            </div>
            <div className="p-5 space-y-2">
              {pp.visitas.slice(0, 6).map(v => (
                <div key={v.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
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

        {/* ── FASES (al final, como solicitado) ─────────────────────── */}
        {pp.fases.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2.5" style={{ backgroundColor: `${TEAL}06` }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${TEAL}18` }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-800">Fases del proyecto</p>
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${TEAL}18`, color: TEAL }}>
                {fasesOK}/{pp.fases.length} completadas
              </span>
            </div>
            <div className="p-5 space-y-1.5">
              {pp.fases.map((f, idx) => {
                const s = FASE_ESTADO_COLOR[f.estado] ?? FASE_ESTADO_COLOR.PENDIENTE
                return (
                  <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ backgroundColor: s.bg }}>
                    <span className="text-[10px] font-bold text-gray-300 w-5 shrink-0 text-right tabular-nums">{idx + 1}</span>
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
              <div className="px-5 pb-5 pt-0">
                <div className="pt-4 border-t border-gray-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Hitos</p>
                  <div className="flex flex-wrap gap-2">
                    {pp.hitos.map(h => (
                      <span key={h.id} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border"
                        style={h.completado ? { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0", color: "#16a34a" } : { backgroundColor: "#fffbeb", borderColor: "#fde68a", color: "#d97706" }}>
                        {h.completado ? "✓" : "◇"} {h.titulo} · {fmtFecha(h.fecha)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Notas ─────────────────────────────────────────────────── */}
        {(pp.descripcion || pp.notas) && (
          <div className="grid sm:grid-cols-2 gap-4">
            {pp.descripcion && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Descripción</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{pp.descripcion}</p>
              </div>
            )}
            {pp.notas && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={e => { if (e.target === e.currentTarget) setShareModal(false) }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Compartir proyecto</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Cualquier persona con el enlace puede ver el resumen sin iniciar sesión</p>
                </div>
                <button onClick={() => setShareModal(false)} className="text-gray-300 hover:text-gray-500 transition-colors p-1 -mt-1 -mr-1">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {pp.shareToken ? (
                <div className="space-y-4">
                  {/* Status pill */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: `${TEAL}10` }}>
                    <div className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: TEAL }} />
                    <span className="text-xs font-semibold" style={{ color: TEAL }}>Enlace activo</span>
                    <span className="text-xs text-gray-400 ml-auto">Se puede acceder sin login</span>
                  </div>

                  {/* URL box */}
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Enlace público</p>
                    <p className="text-xs font-mono text-gray-600 break-all leading-relaxed">{shareUrl}</p>
                  </div>

                  {/* QR Code */}
                  {qrDataUrl && (
                    <div className="flex flex-col items-center gap-3 py-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest self-start">Código QR</p>
                      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                        <img src={qrDataUrl} alt="QR del proyecto" width={180} height={180} className="block" />
                      </div>
                      <a href={qrDataUrl} download={`qr-${pp.id}.png`}
                        className="text-xs font-semibold underline" style={{ color: TEAL }}>
                        Descargar QR
                      </a>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={copyLink}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                      style={{ backgroundColor: copied ? "#16a34a" : TEAL }}>
                      {copied ? (
                        <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copiado</>
                      ) : (
                        <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar enlace</>
                      )}
                    </button>
                    <a href={shareUrl ?? "#"} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors hover:bg-teal-50"
                      style={{ borderColor: TEAL, color: TEAL }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                      Abrir enlace
                    </a>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <button onClick={revokeShare} disabled={revoking}
                      className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 border border-red-100 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors">
                      {revoking ? "Revocando…" : "Revocar enlace público"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Empty state */}
                  <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Sin enlace generado</p>
                    <p className="text-xs text-gray-400">Genera un enlace único para compartir este proyecto con cualquier persona</p>
                  </div>
                  <button onClick={generateShare} disabled={generando}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                    style={{ backgroundColor: TEAL }}>
                    {generando ? (
                      <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Generando enlace…</>
                    ) : (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Generar enlace público</>
                    )}
                  </button>
                </div>
              )}
            </div>
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00A99D" strokeWidth="2" strokeLinecap="round">
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
        style={{ "--tw-ring-color": "#00A99D" } as React.CSSProperties}
      />
      <div className="flex flex-wrap gap-2">
        <select value={prioridad} onChange={e => onChange("prioridad", e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
          <option value="BAJA">Baja</option>
          <option value="MEDIA">Media</option>
          <option value="ALTA">Alta</option>
          <option value="CRITICA">Crítica</option>
        </select>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-400">Vence:</label>
          <input type="date" value={fechaVencimiento} onChange={e => onChange("fechaVencimiento", e.target.value)}
            className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none bg-white" />
        </div>
        <select value={asignadoAId} onChange={e => onChange("asignadoAId", e.target.value)}
          className="flex-1 min-w-28 px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
          <option value="">Sin asignar</option>
          {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={onSubmit} disabled={guardando}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "#00A99D" }}>
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

function TabTareas({ pp, onUpdate }: { pp: Proyecto; onUpdate: (p: Proyecto) => void }) {
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
            <span className="font-semibold" style={{ color: pct === 100 ? "#16a34a" : "#00A99D" }}>{pct}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#16a34a" : "#00A99D" }} />
          </div>
        </div>
        <button
          onClick={() => openAdd("ROOT")}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity active:opacity-80"
          style={{ backgroundColor: "#00A99D" }}
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
                : { backgroundColor: "#E6F7F6", color: "#00A99D", borderColor: "#00A99D" }
              : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}>
            {label}{count > 0 ? ` · ${count}` : ""}
          </button>
        ))}
      </div>

      {/* ──────── KANBAN VIEW ──────── */}
      {vistaKanban && (
        <DndContext sensors={kSensors} onDragEnd={handleKanbanDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-3 min-h-[300px]">
            {([
              { estado: "PENDIENTE",   label: "Pendiente",   color: "#9ca3af", bg: "#f9fafb" },
              { estado: "EN_PROGRESO", label: "En progreso", color: "#00A99D", bg: "#E6F7F6" },
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

      {/* ──────── LIST VIEW ──────── */}
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
              style={{ borderColor: editId === tarea.id ? "#00A99D" : retrasada ? "#fca5a5" : "#f3f4f6" }}>

              {/* Modo edición */}
              {editId === tarea.id ? (
                <div className="p-4 space-y-2.5">
                  <input
                    autoFocus
                    value={editForm.titulo}
                    onChange={e => setEditForm(p => ({ ...p, titulo: e.target.value }))}
                    onKeyDown={e => { if (e.key === "Enter") guardarEdit(tarea.id); if (e.key === "Escape") setEditId(null) }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white"
                    style={{ "--tw-ring-color": "#00A99D" } as React.CSSProperties}
                  />
                  <div className="flex flex-wrap gap-2">
                    <select value={editForm.prioridad} onChange={e => setEditForm(p => ({ ...p, prioridad: e.target.value }))}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
                      <option value="BAJA">Baja</option><option value="MEDIA">Media</option>
                      <option value="ALTA">Alta</option><option value="CRITICA">Crítica</option>
                    </select>
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-gray-400">Vence:</label>
                      <input type="date" value={editForm.fechaVencimiento}
                        onChange={e => setEditForm(p => ({ ...p, fechaVencimiento: e.target.value }))}
                        className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none bg-white" />
                    </div>
                    <select value={editForm.asignadoAId}
                      onChange={e => setEditForm(p => ({ ...p, asignadoAId: e.target.value }))}
                      className="flex-1 min-w-28 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none bg-white">
                      <option value="">Sin asignar</option>
                      {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => guardarEdit(tarea.id)} disabled={guardando}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: "#00A99D" }}>
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
                  {/* Badge prioridad (solo alta/crítica) */}
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
                  {/* Añadir subtarea */}
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
                          style={{ width: `${subs.length ? Math.round(subComp / subs.length * 100) : 0}%`, backgroundColor: "#00A99D" }} />
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
                              style={{ "--tw-ring-color": "#00A99D" } as React.CSSProperties}
                            />
                            <div className="flex flex-wrap gap-2">
                              <select value={editForm.prioridad} onChange={e => setEditForm(p => ({ ...p, prioridad: e.target.value }))}
                                className="px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
                                <option value="BAJA">Baja</option><option value="MEDIA">Media</option>
                                <option value="ALTA">Alta</option><option value="CRITICA">Crítica</option>
                              </select>
                              <input type="date" value={editForm.fechaVencimiento}
                                onChange={e => setEditForm(p => ({ ...p, fechaVencimiento: e.target.value }))}
                                className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none bg-white" />
                              <select value={editForm.asignadoAId}
                                onChange={e => setEditForm(p => ({ ...p, asignadoAId: e.target.value }))}
                                className="flex-1 min-w-24 px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none bg-white">
                                <option value="">Sin asignar</option>
                                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => guardarEdit(sub.id)} disabled={guardando}
                                className="px-3 py-1 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                                style={{ backgroundColor: "#00A99D" }}>
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

