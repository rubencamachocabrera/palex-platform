"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useParams, useRouter } from "next/navigation"
import { TEAL } from "@/lib/brand"
import { useToast } from "@/components/Toast"
import { TagSelector } from "@/components/TagSelector"
import { PLANTILLAS_PROYECTO } from "@/lib/project-templates"
import {
  type Proyecto, type Tab,
  TABS, ESTADO_LABEL, ESTADO_COLOR, PRIORIDAD, fmtFecha,
} from "./types"

const TabCockpit = dynamic(() => import("./tabs/TabCockpit").then(m => ({ default: m.TabCockpit })))
const TabInfo = dynamic(() => import("./tabs/TabInfo").then(m => ({ default: m.TabInfo })))
const TabTareas = dynamic(() => import("./tabs/TabTareas").then(m => ({ default: m.TabTareas })))
const TabTimeline = dynamic(() => import("./tabs/TabTimeline").then(m => ({ default: m.TabTimeline })))
const TabMateriales = dynamic(() => import("./tabs/TabMateriales").then(m => ({ default: m.TabMateriales })))
const TabContactos = dynamic(() => import("./tabs/TabContactos").then(m => ({ default: m.TabContactos })))
const TabVisitas = dynamic(() => import("./tabs/TabVisitas").then(m => ({ default: m.TabVisitas })))
const TabModulos = dynamic(() => import("./tabs/TabModulos").then(m => ({ default: m.TabModulos })))
const TabAdjuntos = dynamic(() => import("./tabs/TabAdjuntos").then(m => ({ default: m.TabAdjuntos })))
const TabResumen = dynamic(() => import("./tabs/TabResumen").then(m => ({ default: m.TabResumen })))

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
  }

  const [creandoV, setCreandoV] = useState(false)
  const [showNuevaVisitaModal, setShowNuevaVisitaModal] = useState(false)
  const [tituloVisitaModal, setTituloVisitaModal] = useState("")
  const [fechaVisitaModal, setFechaVisitaModal] = useState("")
  const [plantillasVisita, setPlantillasVisita] = useState<{ id: string; nombre: string }[]>([])
  const [plantillaVisitaId, setPlantillaVisitaId] = useState("")

  const [showPlantillaModal, setShowPlantillaModal] = useState(false)
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<string | null>(null)
  const [aplicandoPlantilla, setAplicandoPlantilla] = useState(false)

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

  async function aplicarPlantilla() {
    if (!plantillaSeleccionada || !pp) return
    setAplicandoPlantilla(true)
    try {
      const r = await fetch(`/api/proyectos/${pp.id}/aplicar-plantilla`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plantillaId: plantillaSeleccionada }),
      })
      if (!r.ok) throw new Error()
      const { fases, tareas, hitos } = await r.json()
      success(`Plantilla aplicada: ${fases} fases, ${tareas} tareas y ${hitos} hitos creados`)
      setShowPlantillaModal(false)
      setPlantillaSeleccionada(null)
      await cargar()
    } catch {
      toastError("Error al aplicar la plantilla")
    } finally {
      setAplicandoPlantilla(false)
    }
  }

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
          {pp.fases.length === 0 && (
            <button
              onClick={() => { setShowPlantillaModal(true); setPlantillaSeleccionada(null) }}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border-2 border-dashed hover:opacity-80 transition-opacity ml-auto"
              style={{ borderColor: TEAL, color: TEAL }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
              </svg>
              Aplicar plantilla
            </button>
          )}
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
      {tab === "Adjuntos"   && <TabAdjuntos pp={pp} onUpdate={setPp} />}
      {tab === "Resumen"    && <TabResumen pp={pp} onUpdate={setPp} />}

      {/* ── MODAL: Nueva visita ── */}
      {showNuevaVisitaModal && pp && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) setShowNuevaVisitaModal(false) }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md my-auto" style={{ borderTop: `3px solid ${TEAL}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Nueva visita</p>
                <p className="text-xs text-gray-400 mt-0.5">{pp.hospital.nombre} · {pp.titulo}</p>
              </div>
              <button onClick={() => setShowNuevaVisitaModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 cursor-pointer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Nombre de la visita</label>
                <input value={tituloVisitaModal} onChange={e => setTituloVisitaModal(e.target.value)}
                  placeholder="Se genera automáticamente" autoFocus
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Fecha</label>
                <input type="date" value={fechaVisitaModal} onChange={e => setFechaVisitaModal(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              {plantillasVisita.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Plantilla (opcional)</label>
                  <select value={plantillaVisitaId} onChange={e => setPlantillaVisitaId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer">
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
            <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => setShowNuevaVisitaModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">Cancelar</button>
              <button onClick={crearVisitaRapida} disabled={creandoV}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 cursor-pointer hover:opacity-90 transition-opacity"
                style={{ backgroundColor: TEAL }}>
                {creandoV ? "Creando…" : "Crear visita"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Aplicar plantilla ── */}
      {showPlantillaModal && pp && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) setShowPlantillaModal(false) }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl my-auto" style={{ borderTop: `3px solid ${TEAL}` }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Plantillas de proyecto</p>
                <p className="text-xs text-gray-400 mt-0.5">Selecciona una plantilla para auto-crear fases, tareas e hitos</p>
              </div>
              <button onClick={() => setShowPlantillaModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 cursor-pointer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-6 py-5 grid sm:grid-cols-2 gap-3">
              {PLANTILLAS_PROYECTO.map(pl => (
                <button
                  key={pl.id}
                  onClick={() => setPlantillaSeleccionada(pl.id)}
                  className="text-left p-4 rounded-xl border-2 transition-all cursor-pointer"
                  style={{
                    borderColor: plantillaSeleccionada === pl.id ? TEAL : "#e5e7eb",
                    backgroundColor: plantillaSeleccionada === pl.id ? `${TEAL}08` : "transparent",
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{pl.nombre}</span>
                    {plantillaSeleccionada === pl.id && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">{pl.descripcion}</p>
                  <div className="flex items-center gap-3 text-[11px] font-medium">
                    <span className="flex items-center gap-1 text-gray-500">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                      {pl.fases.length} fases
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                      {pl.tareas.length} tareas
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      {pl.hitos.length} hito{pl.hitos.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {pp.fases.length > 0 && (
              <div className="mx-6 mb-3 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Este proyecto ya tiene {pp.fases.length} fases. La plantilla añadirá nuevas fases, tareas e hitos sin eliminar los existentes.
              </div>
            )}
            <div className="flex gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => setShowPlantillaModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">Cancelar</button>
              <button onClick={aplicarPlantilla} disabled={!plantillaSeleccionada || aplicandoPlantilla}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 cursor-pointer hover:opacity-90 transition-opacity"
                style={{ backgroundColor: TEAL }}>
                {aplicandoPlantilla ? "Aplicando…" : "Aplicar plantilla"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
