"use client"

import { useEffect, useState, useRef, useCallback, useMemo, useReducer } from "react"
import { useParams, useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { getSections } from "@/lib/form-schema"
import type { FormField } from "@/lib/form-schema"
import { TodoChecklist } from "@/components/visitas/TodoChecklist"
import type { TodoItem } from "@/components/visitas/TodoChecklist"
import type { AudioNota } from "@/components/visitas/VoiceNotes"
import { useOfflineSync } from "@/hooks/useOfflineSync"
import { usePerfil } from "@/hooks/usePerfil"
import { useModalA11y } from "@/hooks/useModalA11y"
import { AnalisisPanel } from "@/components/visitas/AnalisisPanel"
import { calcularScore } from "@/lib/visita-analysis"

import {
  formReducer, initialFormState, ESTADO_LABEL, ESTADO_COLOR,
} from "./types"
import type {
  VisitaData, Foto, FotosMap, ProyectoItem, ContactoItem,
} from "./types"
import { shouldShowField, validateField, calcProgress, exportarJSON } from "./helpers"
import { SECTION_ICON } from "./_components/SectionIcon"
import { FotosSeccion } from "./_components/FotosSeccion"
import { CampoField } from "./_components/CampoField"
import { SaveIndicator } from "./_components/SaveIndicator"
import { SectionNav } from "./_components/SectionNav"

const VoiceNotes = dynamic(() => import("@/components/visitas/VoiceNotes").then(m => ({ default: m.VoiceNotes })), { ssr: false })
const ComentariosPanel = dynamic(() => import("@/components/ComentariosPanel").then(m => ({ default: m.ComentariosPanel })), { ssr: false })
const SignaturePad = dynamic(() => import("@/components/visitas/SignaturePad").then(m => ({ default: m.SignaturePad })), { ssr: false })

// Dynamic import — PrintView sólo se carga cuando el usuario pulsa "Imprimir"
const PrintView = dynamic(() => import("@/components/visitas/PrintView"), {
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-500 rounded-full animate-spin" />
        <span className="text-sm">Preparando documento...</span>
      </div>
    </div>
  ),
  ssr: false,
})

// Dynamic import — VistaResumen sólo se carga cuando el usuario abre la vista 360°
const VistaResumen = dynamic(() => import("./_components/VistaResumen").then(m => ({ default: m.VistaResumen })), { ssr: false })


import { TagSelector } from "@/components/TagSelector"
import { TEAL } from "@/lib/brand"
import {
  IconCamera, IconArrowLeft, IconArrowRight, IconChevronRight,
  IconCheck, IconSearch, IconPrint, IconDownload, IconMenu, IconX,
  IconClipboard, IconPenLine,
} from "@/components/ui/Icons"

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function VisitaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [formState, dispatch] = useReducer(formReducer, initialFormState)
  const { visita, datos, loading, saving, savedAt, pendiente, saveError, cambiandoEstado } = formState

  const [openSection, setOpenSection] = useState<string>("s0")
  const [showPrint, setShowPrint] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [navOpen, setNavOpen] = useState(false)
  const [proyectos, setProyectos] = useState<ProyectoItem[]>([])
  const [vinculandoPP, setVinculandoPP] = useState(false)
  const [contactos, setContactos] = useState<ContactoItem[]>([])
  const [vinculandoContacto, setVinculandoContacto] = useState(false)
  const { rol: userRol, perfil } = usePerfil()
  const userId = perfil?.id ?? ""
  const userName = perfil?.nombre ?? ""
  const [mostrarGuardarPlantilla, setMostrarGuardarPlantilla] = useState(false)
  const modalPlantillaRef = useModalA11y(mostrarGuardarPlantilla, () => setMostrarGuardarPlantilla(false))
  const [nombrePlantilla, setNombrePlantilla] = useState("")
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false)
  const [showGaleria, setShowGaleria] = useState(false)

  const [sectionToast, setSectionToast] = useState<string | null>(null)
  const [vistaResumen, setVistaResumen] = useState(false)

  const datosRef = useRef<Record<string, unknown>>({})
  const visitaRef = useRef<VisitaData | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevCompletadasRef = useRef(0)
  const headerRef = useRef<HTMLDivElement>(null)

  const handleSyncSuccess = useCallback(() => {
    dispatch({ type: "SYNC_SUCCESS" })
  }, [])

  const { online, loadDraft, syncToServer } = useOfflineSync({
    visitaId: id,
    hospitalNombre: visitaRef.current?.hospital.nombre ?? "",
    datos,
    onSyncSuccess: handleSyncSuccess,
  })

  const tipo = (visita?.tipo ?? "PROYECTOS") as "PROYECTOS" | "VENTAS"
  const sections = useMemo(() => getSections(tipo), [tipo])

  useEffect(() => {
    fetch(`/api/visitas/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(async data => {
        if (data) {
          visitaRef.current = data
          const d = typeof data.datos === "object" && data.datos !== null ? (data.datos as Record<string, unknown>) : {}
          const localDraft = await loadDraft()
          const resolved = localDraft && Object.keys(localDraft).length > Object.keys(d).length ? localDraft : d
          datosRef.current = resolved
          dispatch({ type: "LOADED", visita: data, datos: resolved })
          // Cargar proyectos, contactos y rol usuario
          fetch(`/api/proyectos?hospitalId=${data.hospital.id}`)
            .then(r => r.ok ? r.json() : [])
            .then(pps => { if (Array.isArray(pps)) setProyectos(pps.map((p: { id: string; titulo: string; estado: string; fases: { estado: string }[] }) => ({ id: p.id, titulo: p.titulo, estado: p.estado, fases: p.fases ?? [] }))) })
            .catch(() => {})
          fetch(`/api/hospitales/${data.hospital.id}/contactos`)
            .then(r => r.ok ? r.json() : [])
            .then(cs => { if (Array.isArray(cs)) setContactos(cs.map((c: { id: string; nombre: string; cargo: string | null }) => ({ id: c.id, nombre: c.nombre, cargo: c.cargo }))) })
            .catch(() => {})
        }
        if (!data) dispatch({ type: "NOT_FOUND" })
      })
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // ── Edición colaborativa — polling cada 4s + presencia ──────────────────────
  const lastEditadoRef = useRef<string>("")
  const [colabUsers, setColabUsers] = useState<string[]>([])
  const [colabToast, setColabToast] = useState<string | null>(null)

  useEffect(() => {
    if (!visita) return
    lastEditadoRef.current = visita.editadoEn ?? ""
  }, [visita?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!visita || !online) return
    const sendHeartbeat = async () => {
      try {
        const r = await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entityType: "visita", entityId: id }),
          signal: AbortSignal.timeout(5000),
        })
        if (r.ok) {
          const data = await r.json()
          if (Array.isArray(data.activeUsers)) setColabUsers(data.activeUsers)
        }
      } catch { /* skip */ }
    }
    sendHeartbeat()
    const heartbeatInterval = setInterval(sendHeartbeat, 15000)
    return () => {
      clearInterval(heartbeatInterval)
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "visita", entityId: id, action: "leave" }),
      }).catch(() => {})
    }
  }, [visita?.id, online, id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!visita || !online) return
    const pollInterval = setInterval(async () => {
      if (saving) return
      try {
        const r = await fetch(`/api/visitas/${id}?fields=datos,editadoEn,usuario`, { signal: AbortSignal.timeout(5000) })
        if (!r.ok) return
        const remote = await r.json()
        const remoteEditado = remote.editadoEn ?? ""
        if (remoteEditado && remoteEditado > lastEditadoRef.current && !pendiente) {
          const remoteDatos = typeof remote.datos === "object" && remote.datos !== null ? (remote.datos as Record<string, unknown>) : {}
          const remoteUser = remote.usuario?.nombre ?? "Otro usuario"
          if (remoteUser !== userName && userName) {
            setColabToast(`${remoteUser} ha actualizado el formulario`)
            setTimeout(() => setColabToast(null), 4000)
          }
          datosRef.current = remoteDatos
          dispatch({ type: "SET_DATOS_REMOTE", datos: remoteDatos })
          lastEditadoRef.current = remoteEditado
        }
      } catch { /* timeout or network error — skip */ }
    }, 10000)
    return () => clearInterval(pollInterval)
  }, [visita?.id, online, saving, pendiente, id, userName]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Ocultar header al hacer scroll abajo, mostrar al subir ──────────────────
  useEffect(() => {
    const main = document.getElementById("main-content")
    if (!main) return
    let lastY = 0
    let ticking = false
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = (main as HTMLElement).scrollTop
        const header = headerRef.current
        if (header) {
          if (y > lastY && y > 60) {
            // Bajando — ocultar
            header.style.transform = "translateY(-110%)"
            header.style.opacity = "0"
            header.style.pointerEvents = "none"
          } else {
            // Subiendo o en la cima — mostrar
            header.style.transform = "translateY(0)"
            header.style.opacity = "1"
            header.style.pointerEvents = ""
          }
        }
        lastY = y <= 0 ? 0 : y
        ticking = false
      })
    }
    main.addEventListener("scroll", onScroll, { passive: true })
    return () => main.removeEventListener("scroll", onScroll)
  }, [])

  const guardar = useCallback(async (nuevoEstado?: string) => {
    if (!visitaRef.current) return
    const body: Record<string, unknown> = { datos: datosRef.current }
    if (nuevoEstado) body.estado = nuevoEstado
    if (!online) { await syncToServer(body); return }
    dispatch({ type: "SAVE_START" })
    try {
      const r = await fetch(`/api/visitas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      })
      if (r.ok) {
        const updated = await r.json()
        const updates = { estado: updated.estado, editadoEn: updated.editadoEn }
        visitaRef.current = visitaRef.current ? { ...visitaRef.current, ...updates } : visitaRef.current
        if (updated.editadoEn) lastEditadoRef.current = updated.editadoEn
        dispatch({ type: "SAVE_SUCCESS", updates })
      } else {
        dispatch({ type: "SAVE_ERROR" })
      }
    } catch {
      dispatch({ type: "SAVE_ERROR" })
    }
  }, [id, online, syncToServer])

  const guardarRef = useRef(guardar)
  useEffect(() => { guardarRef.current = guardar }, [guardar])

  function setField(fieldId: string, value: unknown) {
    datosRef.current = { ...datosRef.current, [fieldId]: value }
    dispatch({ type: "SET_FIELD", fieldId, value })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => guardarRef.current(), 2000)
    if (fieldErrors[fieldId]) setFieldErrors(prev => { const n = { ...prev }; delete n[fieldId]; return n })
  }

  // Validación en blur — solo para campos req visibles
  function handleBlur(field: FormField) {
    if (!field.req) return
    const err = validateField(field, datosRef.current[field.id])
    if (err) setFieldErrors(prev => ({ ...prev, [field.id]: err }))
    else setFieldErrors(prev => { const n = { ...prev }; delete n[field.id]; return n })
  }

  const setFotos = useCallback((sectionId: string, fotos: Foto[]) => {
    const fotosMap = ((datosRef.current.fotos as FotosMap) ?? {})
    const newDatos = { ...datosRef.current, fotos: { ...fotosMap, [sectionId]: fotos } }
    datosRef.current = newDatos
    dispatch({ type: "SET_DATOS", datos: newDatos })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => guardarRef.current(), 2000)
  }, [])

  function setTodos(todos: TodoItem[]) {
    const newDatos = { ...datosRef.current, todos }
    datosRef.current = newDatos
    dispatch({ type: "SET_DATOS", datos: newDatos })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => guardarRef.current(), 2000)
  }

  function setAudioNotas(audioNotas: AudioNota[]) {
    const newDatos = { ...datosRef.current, audioNotas }
    datosRef.current = newDatos
    dispatch({ type: "SET_DATOS", datos: newDatos })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => guardarRef.current(), 2000)
  }

  function setNotasLibres(notasLibres: string) {
    const newDatos = { ...datosRef.current, notasLibres }
    datosRef.current = newDatos
    dispatch({ type: "SET_DATOS", datos: newDatos })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => guardarRef.current(), 2000)
  }

  function setFirma(key: "firma_cliente" | "firma_tecnico", dataUrl: string) {
    const newDatos = { ...datosRef.current, [key]: dataUrl }
    datosRef.current = newDatos
    dispatch({ type: "SET_DATOS", datos: newDatos })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => guardarRef.current(), 2000)
  }

  const vincularProyecto = useCallback(async (proyectoId: string | null) => {
    if (!visitaRef.current) return
    setVinculandoPP(true)
    try {
      const r = await fetch(`/api/visitas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proyectoId }),
      })
      if (r.ok) {
        const updated = await r.json()
        dispatch({ type: "SET_VISITA", updates: { proyectoId: updated.proyectoId, proyecto: updated.proyecto ?? null } })
      }
    } catch { /* silencioso */ } finally {
      setVinculandoPP(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const vincularContacto = useCallback(async (contactoPrincipalId: string | null) => {
    if (!visitaRef.current) return
    setVinculandoContacto(true)
    try {
      const r = await fetch(`/api/visitas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactoPrincipalId }),
      })
      if (r.ok) {
        const updated = await r.json()
        dispatch({ type: "SET_VISITA", updates: { contactoPrincipalId: updated.contactoPrincipalId, contactoPrincipal: updated.contactoPrincipal ?? null } })
      }
    } catch { /* silencioso */ } finally {
      setVinculandoContacto(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function guardarComoPlantilla() {
    if (!nombrePlantilla.trim() || !visita) return
    setGuardandoPlantilla(true)
    try {
      const r = await fetch("/api/plantillas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombrePlantilla.trim(),
          tipo: visita.tipo,
          datos: datosRef.current,
        }),
      })
      if (r.ok) {
        setMostrarGuardarPlantilla(false)
        setNombrePlantilla("")
      }
    } finally {
      setGuardandoPlantilla(false)
    }
  }

  const cambiarEstado = useCallback(async (estado: string) => {
    dispatch({ type: "SET_CAMBIANDO_ESTADO", value: true }); await guardar(estado); dispatch({ type: "SET_CAMBIANDO_ESTADO", value: false })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Navega a sección y hace scroll
  function goToSection(sectionId: string) {
    setOpenSection(sectionId)
    setNavOpen(false)
    setTimeout(() => {
      document.getElementById(`sec-${sectionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 50)
  }

  // Derived values
  const readOnly = visita?.estado === "ARCHIVADA"
  const completadas = sections.filter(s => calcProgress(s, datos) === 100).length
  const progreso = sections.length ? Math.round((completadas / sections.length) * 100) : 0
  const fotosMap = (datos.fotos as FotosMap) ?? {}
  const totalFotos = Object.values(fotosMap).reduce((acc, arr) => acc + arr.length, 0)
  const { score, scoreColor, scoreLabel } = useMemo(
    () => visita ? calcularScore(datos) : { score: 0, scoreColor: "#16a34a", scoreLabel: "Bajo" },
    [datos, visita]
  )

  // Toast cuando una sección recién se completa
  useEffect(() => {
    if (!visita || completadas <= prevCompletadasRef.current) { prevCompletadasRef.current = completadas; return }
    prevCompletadasRef.current = completadas
    const seccion = sections.find(s => calcProgress(s, datos) === 100 && s.id === openSection)
    if (seccion) {
      setSectionToast(seccion.title)
      setTimeout(() => setSectionToast(null), 2200)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completadas])

  // ─ Loading ─
  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: TEAL }} />
    </div>
  )

  // ─ Not found ─
  if (!visita) return (
    <div className="text-center py-24">
      <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 mb-4">
        <IconSearch size={24} className="text-gray-400" />
      </span>
      <p className="text-gray-700 font-semibold">Visita no encontrada</p>
      <p className="text-gray-400 text-sm mt-1">No existe o no tienes acceso a esta visita.</p>
      <button onClick={() => router.back()} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: TEAL }}>
        <IconArrowLeft size={14} /> Volver
      </button>
    </div>
  )

  // ─ Vista de impresión ─
  if (showPrint) {
    return (
      <>
        <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
          <button onClick={() => setShowPrint(false)} className="text-sm text-gray-500 hover:text-gray-700 font-medium">← Volver</button>
          <span className="text-sm text-gray-400">Vista previa de impresión</span>
          <div className="ml-auto flex gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: TEAL }}
            >
              <IconPrint size={15} /> Imprimir / Guardar PDF
            </button>
          </div>
        </div>
        <div className="pt-16">
          <PrintView visita={visita} datos={datos} sections={sections} />
        </div>
        <style>{`@media print { .no-print { display: none !important; } }`}</style>
      </>
    )
  }

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          HEADER FIJO — Hospital · Progreso · Acciones
          (sticky top-0 funciona porque globals.css ya no usa transform en pageIn)
      ══════════════════════════════════════════════════════════════════════════ */}
      <div ref={headerRef} className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 mb-5"
        style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid #f0f0f0", boxShadow: "0 1px 8px rgba(0,0,0,0.04)", transition: "transform 220ms ease, opacity 220ms ease" }}>

        {/* ── Fila 1: Contexto + acciones ── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-2 flex items-center gap-3">

          {/* Menú secciones mobile */}
          <button type="button" onClick={() => setNavOpen(o => !o)} title="Ver secciones"
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer lg:hidden">
            <IconMenu size={15} />
          </button>

          {/* Título + Hospital + estado */}
          <div className="flex-1 min-w-0">
            {readOnly ? (
              visita.titulo && <p className="text-[13px] font-semibold text-gray-800 truncate mb-0.5">{visita.titulo}</p>
            ) : (
              <input
                value={visita.titulo ?? ""}
                onChange={e => dispatch({ type: "SET_VISITA", updates: { titulo: e.target.value } })}
                onBlur={e => {
                  const val = e.target.value.trim() || null
                  if (val !== (visitaRef.current?.titulo ?? null)) {
                    fetch(`/api/visitas/${visita.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ titulo: val ?? "" }) })
                      .then(r => r.ok ? r.json() : null)
                      .then(d => { if (d) { dispatch({ type: "SET_VISITA", updates: { titulo: d.titulo } }); if (visitaRef.current) visitaRef.current.titulo = d.titulo } })
                  }
                }}
                placeholder="Nombre de la visita (opcional)"
                className="w-full text-[13px] font-semibold text-gray-800 bg-transparent border-none outline-none placeholder:text-gray-300 placeholder:font-normal truncate mb-0.5 p-0 focus:ring-0"
              />
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-gray-900 truncate max-w-[200px] sm:max-w-xs">
                {visita.hospital.nombre}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                visita.estado === "COMPLETADA" ? "bg-green-50 text-green-700" :
                visita.estado === "ARCHIVADA"  ? "bg-gray-100 text-gray-500"  :
                "bg-amber-50 text-amber-700"
              }`}>
                {visita.estado === "COMPLETADA" ? "Completada" : visita.estado === "ARCHIVADA" ? "Archivada" : "Borrador"}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5 hidden sm:block">
              {visita.hospital.ciudad}
              {visita.tipo === "VENTAS" ? " · Visita comercial" : " · Visita técnica"}
            </p>
            <div className="mt-1">
              <TagSelector
                entityType="VISITA"
                entityId={visita.id}
                tagIds={(visita.tags ?? []).map(t => t.tag.id)}
                onUpdate={ids => dispatch({ type: "SET_VISITA", updates: { tags: ids.map(id => ({ tag: { id, nombre: "", color: "" } })) } })}
                readOnly={readOnly}
              />
            </div>
          </div>

          {/* Colaboradores activos */}
          {colabUsers.length > 0 && (
            <div className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg border border-blue-200 bg-blue-50" title={`Editando también: ${colabUsers.join(", ")}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-medium text-blue-600 max-w-[60px] sm:max-w-[80px] truncate">{colabUsers[0]}</span>
              {colabUsers.length > 1 && <span className="text-[10px] text-blue-400">+{colabUsers.length - 1}</span>}
            </div>
          )}

          {/* Auto-save */}
          <div className="text-xs shrink-0 hidden sm:block">
            <SaveIndicator saving={saving} pendiente={pendiente} savedAt={savedAt} error={saveError} />
          </div>

          {/* Score */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-xl border cursor-default"
            style={{ borderColor: `${scoreColor}40`, backgroundColor: `${scoreColor}0c` }}
            title={`Complejidad de instalación: ${score}/100`}>
            <span className="text-sm font-bold tabular-nums" style={{ color: scoreColor }}>{score}</span>
            <span className="text-[10px] font-medium" style={{ color: scoreColor, opacity: 0.75 }}>{scoreLabel}</span>
          </div>

          {/* Offline badge */}
          {!online && (
            <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
              Offline
            </span>
          )}

          {/* Botones de acción */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => setVistaResumen(true)} title="Vista resumen 360°"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-[36px]"
              style={vistaResumen
                ? { backgroundColor: `${TEAL}15`, color: TEAL, border: `1px solid ${TEAL}30` }
                : { color: "#6b7280", border: "1px solid #e5e7eb", backgroundColor: "transparent" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <span className="hidden sm:inline">Resumen</span>
            </button>
            {userRol === "ADMIN" && (
              <button onClick={() => { setNombrePlantilla(""); setMostrarGuardarPlantilla(true) }}
                title="Guardar como plantilla"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors cursor-pointer min-h-[36px] border border-gray-200">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                <span className="hidden md:inline">Plantilla</span>
              </button>
            )}
            <button onClick={() => setShowPrint(true)} title="PDF / Imprimir"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors cursor-pointer min-h-[36px] border border-gray-200">
              <IconPrint size={14} />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button onClick={() => exportarJSON(visita, datos, sections)} title="Exportar datos"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors cursor-pointer min-h-[36px] border border-gray-200">
              <IconDownload size={14} />
              <span className="hidden md:inline">Exportar</span>
            </button>
          </div>
        </div>

        {/* ── Fila 2: Progreso ── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-2.5">
          {/* Barra global */}
          <div className="flex items-center gap-3 mb-1.5">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progreso}%`, backgroundColor: progreso === 100 ? "#10b981" : TEAL }} />
            </div>
            <span className="text-[11px] font-semibold tabular-nums shrink-0"
              style={{ color: progreso === 100 ? "#10b981" : "#6b7280" }}>
              {completadas}/{sections.length} secciones
              {progreso === 100 && <span className="ml-1">✓</span>}
            </span>
          </div>
          {/* Mapa de segmentos — cada sección es un botón clickable */}
          <div className="flex gap-[3px]">
            {sections.map((s, i) => {
              const pct = calcProgress(s, datos)
              const isAct = openSection === s.id
              return (
                <button key={s.id} type="button" title={`${i + 1}. ${s.title} — ${pct}%`}
                  onClick={() => goToSection(s.id)}
                  className="flex-1 rounded-full transition-all duration-200 cursor-pointer hover:scale-y-150 origin-bottom"
                  style={{
                    height: isAct ? 5 : 3,
                    backgroundColor: pct === 100 ? "#10b981" : isAct ? TEAL : pct > 0 ? `${TEAL}55` : "#e5e7eb",
                  }} />
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          Overlay de navegación mobile
      ══════════════════════════════════════════════════════════════════════════ */}
      {navOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={() => setNavOpen(false)}
          />
          <div className="fixed top-0 left-0 bottom-0 z-40 w-72 bg-white shadow-xl flex flex-col lg:hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Secciones</p>
              <button onClick={() => setNavOpen(false)} aria-label="Cerrar navegación" className="text-gray-400 hover:text-gray-700 p-1">
                <IconX size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <SectionNav
                sections={sections}
                datos={datos}
                openSection={openSection}
                onSelect={goToSection}
                fotosMap={fotosMap}
              />
            </div>
            {/* Resumen de progreso en el panel */}
            <div className="px-4 py-3 border-t border-gray-100">
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>{completadas} de {sections.length} secciones</span>
                <span>{progreso}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${progreso}%`, backgroundColor: progreso === 100 ? "#10b981" : TEAL }} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          Layout principal: sidebar nav (lg) + contenido
      ══════════════════════════════════════════════════════════════════════════ */}
      <div className="max-w-5xl mx-auto lg:grid lg:grid-cols-[220px_1fr] lg:gap-5 lg:items-start pb-32 lg:pb-8">

        {/* ─── Sidebar navegación desktop ─────────────────────────────────── */}
        <aside className="hidden lg:block sticky top-16">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Secciones</p>
            </div>
            <div className="p-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              <SectionNav
                sections={sections}
                datos={datos}
                openSection={openSection}
                onSelect={goToSection}
                fotosMap={fotosMap}
              />
            </div>
          </div>
        </aside>

        {/* ─── Contenido principal ────────────────────────────────────────── */}
        <div className="min-w-0">

          {/* Context strip */}
          <div className="mb-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-start gap-3">
            <button
              onClick={() => router.back()}
              className="shrink-0 mt-0.5 w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <IconArrowLeft size={16} />
            </button>
            {/* Avatar hospital */}
            <div
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white select-none"
              style={{ backgroundColor: (() => { const c=["#0d9488","#0891b2","#7c3aed","#db2777","#ea580c","#65a30d","#2563eb","#9333ea"]; let h=0; for(let i=0;i<visita.hospital.nombre.length;i++) h=(h*31+visita.hospital.nombre.charCodeAt(i))&0xffff; return c[h%c.length] })() }}
            >
              {visita.hospital.nombre.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-gray-900 leading-tight truncate">{visita.hospital.nombre}</h1>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLOR[visita.estado]}`}>
                  {ESTADO_LABEL[visita.estado]}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {visita.hospital.ciudad}
                </span>
                <span className="opacity-40">·</span>
                <span>{new Date(visita.fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}</span>
                <span className="opacity-40">·</span>
                <span className="capitalize">{tipo.toLowerCase()}</span>
                <span className="opacity-40">·</span>
                <span className="flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  {visita.usuario.nombre}
                </span>
                {totalFotos > 0 && (
                  <><span className="opacity-40">·</span><span className="flex items-center gap-1"><IconCamera size={10} /> {totalFotos} fotos</span></>
                )}
              </p>
            </div>
            {/* Score badge */}
            <div
              className="hidden sm:flex shrink-0 flex-col items-center justify-center w-12 h-12 rounded-xl border-2 cursor-default"
              style={{ color: scoreColor, borderColor: `${scoreColor}60`, backgroundColor: `${scoreColor}10` }}
              title={`Complejidad de instalación: ${score}/100`}
            >
              <span className="text-base font-bold leading-none">{score}</span>
              <span className="text-[9px] font-medium opacity-75 mt-0.5">{scoreLabel}</span>
            </div>
          </div>

          {/* Vincular proyecto (pre-proyecto) */}
          <div className="mb-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                </svg>
              </span>
              <span className="text-xs font-semibold text-gray-600">Proyecto</span>
            </div>
            {visita.proyecto ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border min-h-[32px]"
                style={{ backgroundColor: `${TEAL}10`, borderColor: `${TEAL}30`, color: TEAL }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 11l3 3L22 4"/></svg>
                {visita.proyecto.titulo}
                {!readOnly && (
                  <button onClick={() => vincularProyecto(null)} disabled={vinculandoPP}
                    className="ml-1 opacity-50 hover:opacity-100 hover:text-red-500 transition-all"
                    title="Desvincular proyecto">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </span>
            ) : proyectos.length > 0 ? (
              <select
                disabled={readOnly || vinculandoPP}
                onChange={e => e.target.value && vincularProyecto(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-300 disabled:opacity-50 min-h-[32px] flex-1 max-w-xs"
                defaultValue=""
              >
                <option value="">Sin proyecto asociado</option>
                {proyectos.map(pp => {
                  const fasOk = pp.fases.filter(f => f.estado === "COMPLETADA").length
                  return (
                    <option key={pp.id} value={pp.id}>
                      {pp.titulo} — {fasOk}/{pp.fases.length} fases
                    </option>
                  )
                })}
              </select>
            ) : (
              <span className="text-xs text-gray-400 italic">
                {readOnly ? "Sin proyecto asociado" : "No hay proyectos creados para este hospital"}
              </span>
            )}
          </div>

          {/* Vincular contacto principal */}
          {(contactos.length > 0 || visita.contactoPrincipal) && (
            <div className="mb-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 shrink-0">
                <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <span className="text-xs font-semibold text-gray-600">Contacto</span>
              </div>
              {visita.contactoPrincipal ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 min-h-[32px]">
                  {visita.contactoPrincipal.nombre}
                  {visita.contactoPrincipal.cargo && <span className="opacity-60">· {visita.contactoPrincipal.cargo}</span>}
                  {!readOnly && (
                    <button onClick={() => vincularContacto(null)} disabled={vinculandoContacto}
                      className="ml-1 opacity-50 hover:opacity-100 hover:text-red-500 transition-all"
                      title="Desvincular contacto">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </span>
              ) : (
                <select
                  disabled={readOnly || vinculandoContacto}
                  onChange={e => e.target.value && vincularContacto(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-300 disabled:opacity-50 min-h-[32px] flex-1 max-w-xs"
                  defaultValue=""
                >
                  <option value="">Sin contacto principal</option>
                  {contactos.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}{c.cargo ? ` — ${c.cargo}` : ""}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Galería de fotos */}
          {totalFotos > 0 && (
            <div className="mb-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowGaleria(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors min-h-[48px]"
              >
                <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 shrink-0">
                  <IconCamera size={14} className="text-gray-500" />
                </span>
                <span className="text-sm font-semibold text-gray-700 flex-1 text-left">Galería de fotos</span>
                <span className="text-xs text-gray-400 mr-1">{totalFotos}</span>
                <span className="text-gray-400 shrink-0 transition-transform" style={{ transform: showGaleria ? "rotate(90deg)" : "none", display: "inline-flex" }}>
                  <IconChevronRight size={14} />
                </span>
              </button>
              {showGaleria && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  {sections.filter(s => (fotosMap[s.id] ?? []).length > 0).map(s => (
                    <div key={s.id}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{s.title}</p>
                      <div className="flex flex-wrap gap-2">
                        {(fotosMap[s.id] ?? []).map(foto => (
                          <div key={foto.id} className="relative group w-20 h-20 shrink-0">
                            <img
                              src={foto.data}
                              alt={foto.caption || foto.name}
                              className="w-full h-full object-cover rounded-lg border border-gray-200"
                            />
                            {foto.caption && (
                              <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                                <p className="text-white text-[10px] leading-tight line-clamp-3">{foto.caption}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Acordeón secciones */}
          <div className="space-y-2">
            {sections.map((section, idx) => {
              const pct = calcProgress(section, datos)
              const isOpen = openSection === section.id
              const nFotos = (fotosMap[section.id] ?? []).length
              // Campos visibles (respetando showIf)
              const visibleFields = section.fields.filter(f => shouldShowField(f, datos))

              return (
                <div key={section.id} id={`sec-${section.id}`}
                  className="bg-white rounded-2xl overflow-hidden transition-all duration-200"
                  style={{
                    border: isOpen ? `1.5px solid ${TEAL}40` : "1.5px solid #f0f0f0",
                    boxShadow: isOpen ? `0 4px 20px ${TEAL}12, 0 1px 4px rgba(0,0,0,0.04)` : "0 1px 4px rgba(0,0,0,0.04)",
                  }}>
                  <button onClick={() => setOpenSection(isOpen ? "" : section.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50/60 active:bg-gray-100/60 transition-colors min-h-[60px] cursor-pointer">
                    {/* Badge numérico + icono */}
                    <div className="shrink-0 flex flex-col items-center gap-0.5">
                      <span className="text-[9px] font-bold tabular-nums" style={{ color: isOpen ? TEAL : pct === 100 ? "#10b981" : "#d1d5db" }}>{idx + 1}</span>
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
                        pct === 100 ? "bg-green-50 text-green-600" : isOpen ? "text-white" : "bg-gray-100 text-gray-400"
                      }`} style={isOpen && pct < 100 ? { backgroundColor: TEAL } : {}}>
                        {SECTION_ICON[section.icon] ?? <IconClipboard size={18} />}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold" style={{ color: isOpen ? "#111827" : "#374151" }}>{section.title}</p>
                        {pct === 100 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full">
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            Completa
                          </span>
                        )}
                        {nFotos > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                            <IconCamera size={9} /> {nFotos}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="h-1 w-28 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#10b981" : isOpen ? TEAL : `${TEAL}80` }} />
                        </div>
                        <span className="text-[11px] tabular-nums font-medium" style={{ color: pct === 100 ? "#10b981" : "#9ca3af" }}>{pct}%</span>
                      </div>
                    </div>
                    <span className="transition-transform duration-200 shrink-0"
                      style={{ transform: isOpen ? "rotate(90deg)" : "none", color: isOpen ? TEAL : "#d1d5db" }}>
                      <IconChevronRight size={16} />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 px-4 py-5 space-y-6">
                      {visibleFields.map(field => {
                        // Sub-cabecera de bloque — separador visual dentro de la sección
                        if (field.type === 'subheader') {
                          return (
                            <div key={field.id} className="flex items-center gap-3 !mt-8 !mb-0 first:!mt-0">
                              <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: TEAL }}>
                                {field.label}
                              </span>
                              <div className="flex-1 h-px bg-teal-100" />
                            </div>
                          )
                        }
                        const err = fieldErrors[field.id]
                        return (
                          <div key={field.id}>
                            <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-2">
                              {field.label}
                              {field.req && <span className="text-red-400 ml-1">*</span>}
                            </label>
                            {field.hint && (
                              <p className="text-xs text-gray-400 mb-2.5 flex items-start gap-1.5">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 text-gray-300">
                                  <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                                </svg>
                                {field.hint}
                              </p>
                            )}
                            <CampoField
                              field={field}
                              value={datos[field.id]}
                              onChange={v => setField(field.id, v)}
                              onBlur={() => handleBlur(field)}
                              error={err}
                              readOnly={readOnly}
                            />
                            {/* Error inline */}
                            {err && (
                              <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                                {err}
                              </p>
                            )}
                          </div>
                        )
                      })}

                      {/* Fotos de esta sección */}
                      <FotosSeccion
                        sectionId={section.id}
                        fotos={fotosMap[section.id] ?? []}
                        onChange={fotos => setFotos(section.id, fotos)}
                        readOnly={readOnly}
                      />

                      {/* Navegación anterior / siguiente */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-2">
                        {idx > 0 ? (
                          <button onClick={() => goToSection(sections[idx - 1].id)}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-700 min-h-[44px] px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                            <IconArrowLeft size={14} /> Anterior
                          </button>
                        ) : <span />}
                        {idx < sections.length - 1 ? (
                          <button onClick={() => goToSection(sections[idx + 1].id)}
                            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-xl text-white min-h-[44px] transition-opacity hover:opacity-90 cursor-pointer"
                            style={{ backgroundColor: TEAL }}>
                            Siguiente <IconArrowRight size={14} />
                          </button>
                        ) : !readOnly && visita.estado === "BORRADOR" ? (
                          <button onClick={() => cambiarEstado("COMPLETADA")} disabled={cambiandoEstado}
                            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-xl text-white bg-green-500 min-h-[44px] disabled:opacity-50 hover:bg-green-600 transition-colors cursor-pointer">
                            {cambiandoEstado
                              ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                              : <IconCheck size={14} />}
                            {cambiandoEstado ? "Completando…" : "Completar visita"}
                          </button>
                        ) : <span />}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* TO-DO */}
          <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-5">
              <TodoChecklist
                items={(datos.todos as TodoItem[]) ?? []}
                onChange={setTodos}
                readOnly={readOnly}
              />
            </div>
          </div>

          {/* Notas libres */}
          <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                  <IconPenLine size={14} />
                </span>
                <h3 className="text-sm font-semibold text-gray-700">Notas libres</h3>
              </div>
              <textarea
                value={(datos.notasLibres as string) ?? ""}
                onChange={e => setNotasLibres(e.target.value)}
                disabled={readOnly}
                rows={5}
                placeholder="Escribe aqui cualquier observacion, comentario o informacion adicional de la visita..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 bg-white resize-none placeholder-gray-300"
                style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Notas de voz */}
          <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-5">
              <VoiceNotes
                notas={(datos.audioNotas as AudioNota[]) ?? []}
                onChange={setAudioNotas}
                readOnly={readOnly}
              />
            </div>
          </div>

          {/* Panel de análisis */}
          <div className="mt-4">
            <AnalisisPanel datos={datos} hospitalId={visita.hospital.id} />
          </div>

          {/* Firmas */}
          <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${TEAL}15` }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                    <path d="m15 5 4 4"/>
                  </svg>
                </span>
                <h3 className="text-sm font-semibold text-gray-700">Firmas</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SignaturePad
                  label="Firma del cliente"
                  initialValue={(datos.firma_cliente as string) || undefined}
                  onSave={dataUrl => setFirma("firma_cliente", dataUrl)}
                />
                <SignaturePad
                  label="Firma del tecnico InLab"
                  initialValue={(datos.firma_tecnico as string) || undefined}
                  onSave={dataUrl => setFirma("firma_tecnico", dataUrl)}
                />
              </div>
            </div>
          </div>

          {/* Comentarios del equipo */}
          {visita && userId && (
            <div className="mt-4">
              <ComentariosPanel
                endpoint={`/api/visitas/${visita.id}/comentarios`}
                usuarioId={userId}
                esAdmin={userRol === "ADMIN"}
              />
            </div>
          )}

          {readOnly && (
            <div className="mt-4 bg-gray-50 rounded-xl border border-gray-200 px-5 py-4 text-center">
              <p className="text-sm text-gray-400">Esta visita esta archivada.</p>
            </div>
          )}
        </div>
      </div>


      {/* Barra sticky mobile (guardar + completar) */}
      {!readOnly && (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
          <div className="bg-white border-t border-gray-200 px-4 py-3 safe-area-bottom">
            <div className="flex gap-2">
              <button onClick={() => guardar()} disabled={saving || !pendiente}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: TEAL }}>
                {saving ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Guardando...</>
                ) : pendiente ? "Guardar cambios" : savedAt ? (
                  <><IconCheck size={14} /> Guardado</>
                ) : "Sin cambios"}
              </button>
              {visita.estado === "BORRADOR" && !pendiente && (
                <button onClick={() => cambiarEstado("COMPLETADA")} disabled={cambiandoEstado}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-green-500 disabled:opacity-50 flex items-center justify-center gap-2">
                  {cambiandoEstado ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <IconCheck size={14} />}
                  {cambiandoEstado ? "Completando..." : "Completar visita"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barra flotante desktop */}
      {!readOnly && (
        <div className="hidden lg:block fixed bottom-6 right-6 z-40">
          <div className="flex items-center gap-2 bg-white rounded-2xl px-3 py-2.5"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.07)" }}>

            {/* Progreso mini */}
            <div className="flex items-center gap-2 pr-2 border-r border-gray-100">
              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progreso}%`, backgroundColor: progreso === 100 ? "#10b981" : TEAL }} />
              </div>
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: progreso === 100 ? "#10b981" : "#9ca3af" }}>
                {progreso}%
              </span>
            </div>

            {!online && (
              <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                Offline
              </span>
            )}

            {/* Guardar */}
            <button onClick={() => guardar()} disabled={saving || !pendiente}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:cursor-default"
              style={{
                backgroundColor: saving ? `${TEAL}20` : pendiente ? TEAL : "#f3f4f6",
                color: saving ? TEAL : pendiente ? "white" : "#9ca3af",
              }}>
              {saving
                ? <><span className="w-3 h-3 border-2 border-current/40 border-t-current rounded-full animate-spin" /> Guardando…</>
                : pendiente
                ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Guardar</>
                : savedAt
                ? <><IconCheck size={13} /> Guardado</>
                : "Sin cambios"}
            </button>

            {/* Completar */}
            {visita.estado === "BORRADOR" && !pendiente && (
              <button onClick={() => cambiarEstado("COMPLETADA")} disabled={cambiandoEstado}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:bg-green-600 disabled:opacity-60 cursor-pointer"
                style={{ backgroundColor: "#10b981" }}>
                {cambiandoEstado
                  ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <IconCheck size={13} />}
                {cambiandoEstado ? "Completando…" : "Completar visita"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Vista resumen overlay */}
      {vistaResumen && (
        <VistaResumen
          visita={visita}
          datos={datos}
          sections={sections}
          fotosMap={fotosMap}
          score={score}
          scoreColor={scoreColor}
          scoreLabel={scoreLabel}
          completadas={completadas}
          progreso={progreso}
          onClose={() => setVistaResumen(false)}
          onGoToSection={goToSection}
          onSetField={setField}
        />
      )}

      {/* Toast sección completada */}
      {sectionToast && (
        <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap">
          <div className="flex items-center gap-2 bg-gray-900/95 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-2xl">
            <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
            <span>«{sectionToast}» completada</span>
          </div>
        </div>
      )}

      {/* Toast colaboración */}
      {colabToast && (
        <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2 bg-blue-600/95 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-2xl">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>{colabToast}</span>
          </div>
        </div>
      )}

      {/* Modal guardar como plantilla */}
      {mostrarGuardarPlantilla && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div ref={modalPlantillaRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="titulo-guardar-plantilla" className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
                <h2 id="titulo-guardar-plantilla" className="text-base font-bold text-gray-900">Guardar como plantilla</h2>
              </div>
              <button onClick={() => setMostrarGuardarPlantilla(false)} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500">Los datos actuales del formulario se guardarán como plantilla. Los usuarios podrán seleccionarla al crear nuevas visitas.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de la plantilla *</label>
                <input
                  autoFocus
                  value={nombrePlantilla}
                  onChange={e => setNombrePlantilla(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && guardarComoPlantilla()}
                  placeholder="Ej: Implantación BC Robo estándar"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setMostrarGuardarPlantilla(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={guardarComoPlantilla}
                  disabled={guardandoPlantilla || !nombrePlantilla.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
                  style={{ backgroundColor: TEAL }}
                >
                  {guardandoPlantilla ? "Guardando…" : "Guardar plantilla"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
