"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { TEAL, ORANGE } from "@/lib/brand"
import { usePerfil } from "@/hooks/usePerfil"
import {
  IconArrowLeft, IconMail, IconPhone, IconPlus, IconX,
} from "@/components/ui/Icons"
import { EmptyState } from "@/components/ui/EmptyState"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fechaRel(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return "Hoy"; if (d === 1) return "Ayer"
  if (d < 7) return `Hace ${d} días`
  if (d < 30) return `Hace ${Math.floor(d/7)} sem.`
  if (d < 365) return `Hace ${Math.floor(d/30)} mes${Math.floor(d/30)>1?"es":""}`
  return `Hace ${Math.floor(d/365)} año${Math.floor(d/365)>1?"s":""}`
}
function avColor(s: string) {
  const cs = ["#0d9488","#0891b2","#7c3aed","#db2777","#ea580c","#65a30d","#2563eb"]
  let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h)
  return cs[Math.abs(h) % cs.length]
}
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<string, string> = {
  HOSPITAL_PUBLICO: "Hospital Público",
  HOSPITAL_PRIVADO: "Hospital Privado",
  CLINICA_PRIVADA:  "Clínica Privada",
  LABORATORIO:      "Laboratorio",
  CENTRO_SALUD:     "Centro de Salud",
  UNIVERSIDAD:      "Universidad",
  OTRO:             "Otro",
}
const TIPO_DESCRIPCION: Record<string, string> = {
  HOSPITAL_PUBLICO: "Centro hospitalario de titularidad pública, financiado por el sistema nacional de salud.",
  HOSPITAL_PRIVADO: "Hospital de gestión privada, generalmente con seguro médico o pago directo.",
  CLINICA_PRIVADA:  "Centro médico privado especializado en atención ambulatoria o cirugía menor.",
  LABORATORIO:      "Laboratorio de análisis clínicos, diagnóstico o investigación biomédica.",
  CENTRO_SALUD:     "Centro de atención primaria del sistema público de salud.",
  UNIVERSIDAD:      "Hospital universitario con actividad docente e investigadora.",
  OTRO:             "Otro tipo de centro sanitario o entidad relacionada.",
}
const TIPO_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  HOSPITAL_PUBLICO: { bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6" },
  HOSPITAL_PRIVADO: { bg: "#f5f3ff", text: "#6d28d9", dot: "#8b5cf6" },
  CLINICA_PRIVADA:  { bg: "#eef2ff", text: "#4338ca", dot: "#6366f1" },
  LABORATORIO:      { bg: "#fffbeb", text: "#b45309", dot: "#f59e0b" },
  CENTRO_SALUD:     { bg: "#f0fdf4", text: "#15803d", dot: "#22c55e" },
  UNIVERSIDAD:      { bg: "#fff7ed", text: "#c2410c", dot: "#f97316" },
  OTRO:             { bg: "#f9fafb", text: "#6b7280", dot: "#9ca3af" },
}
const ESTADO_COLOR: Record<string, string> = {
  BORRADOR: "#f59e0b", COMPLETADA: "#16a34a", ARCHIVADA: "#9ca3af",
}
const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador", COMPLETADA: "Completada", ARCHIVADA: "Archivada",
}
const TIMELINE_COLOR: Record<string, string> = {
  visita: TEAL, oportunidad: "#9333ea", etapa: "#f59e0b",
  preproyecto: "#6366f1", fase: "#10b981", hito: "#f97316",
  material: "#06b6d4", contacto: "#9ca3af",
}
const PROY_ESTADO_LABEL: Record<string, string> = {
  NUEVO: "Nuevo", EN_CURSO: "En curso", PAUSADO: "Pausado",
  COMPLETADO: "Completado", CANCELADO: "Cancelado",
}
const PROY_ESTADO_COLOR: Record<string, { bg: string; text: string }> = {
  NUEVO:      { bg: "#f0f9ff", text: "#0369a1" },
  EN_CURSO:   { bg: `${TEAL}18`, text: TEAL },
  PAUSADO:    { bg: "#fef3c7", text: "#d97706" },
  COMPLETADO: { bg: "#f0fdf4", text: "#16a34a" },
  CANCELADO:  { bg: "#fef2f2", text: "#dc2626" },
}
const TIMELINE_FILTROS = [
  { value: "todos", label: "Todos" },
  { value: "visitas", label: "Visitas" },
  { value: "oportunidades", label: "Oportunidades" },
  { value: "proyectos", label: "Proyectos" },
  { value: "fases", label: "Fases e hitos" },
  { value: "material", label: "Material" },
] as const
type TimelineFiltro = typeof TIMELINE_FILTROS[number]["value"]
const CONTACTO_EMPTY = { nombre: "", cargo: "", email: "", telefono: "", principal: false }

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Contacto {
  id: string; nombre: string; cargo: string | null
  email: string | null; telefono: string | null; principal: boolean
}
interface Visita {
  id: string; estado: string; tipo: string; fecha: string
  usuario: { id: string; nombre: string; rol: string }
}
interface TimelineEvento {
  id: string; tipo: string; titulo: string; descripcion: string; fecha: string; href?: string
}
interface CentroGrupo {
  id: string; nombre: string; ciudad: string; tipo: string
  _count: { visitas: number; proyectos: number }
}
interface Hospital {
  id: string; nombre: string; ciudad: string; provincia: string | null
  pais: string; tipo: string; camas: number | null; direccion: string | null
  activo: boolean; zona: { id: string; nombre: string }
  latitud?: number | null; longitud?: number | null
  grupoId?: string | null
  grupo?: { id: string; nombre: string } | null
  centros?: CentroGrupo[]
  score?: number
  contactos: Contacto[]; visitas: Visita[]
}

interface FaseResumen { id: string; tipo: string; estado: string; orden: number }
interface Proyecto {
  id: string; titulo: string; estado: string; prioridad: number
  fechaInicio: string | null; fechaFinPlan: string | null; creadoEn: string
  responsable: { id: string; nombre: string } | null
  fases: FaseResumen[]
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function HospitalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromProyecto = searchParams.get("from") === "proyecto" ? searchParams.get("pid") : null

  const [hospital, setHospital] = useState<Hospital | null>(null)
  const { rol: userRol } = usePerfil()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"actividad" | "timeline" | "informacion" | "proyectos" | "llamadas">("actividad")
  const [timeline, setTimeline] = useState<TimelineEvento[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineFilter, setTimelineFilter] = useState<TimelineFiltro>("todos")
  const [showNuevaVisita, setShowNuevaVisita] = useState(false)
  const [creandoVisita, setCreandoVisita] = useState(false)
  const [tituloVisita, setTituloVisita] = useState("")
  const [fechaVisita, setFechaVisita] = useState("")
  const [plantillas, setPlantillas] = useState<{ id: string; nombre: string }[]>([])
  const [plantillaId, setPlantillaId] = useState("")
  const [eliminarVisitaId, setEliminarVisitaId] = useState<string | null>(null)
  const [eliminandoVisita, setEliminandoVisita] = useState(false)

  // Proyectos tab
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [proyectosLoaded, setProyectosLoaded] = useState(false)
  const [proyectosLoading, setProyectosLoading] = useState(false)
  // Nuevo proyecto modal
  const [showNuevoProyecto, setShowNuevoProyecto] = useState(false)
  const [formProyecto, setFormProyecto] = useState({ titulo: "", descripcion: "" })
  const [guardandoProyecto, setGuardandoProyecto] = useState(false)
  const [errorProyecto, setErrorProyecto] = useState("")

  // Contacto modal
  const [contactoModal, setContactoModal] = useState(false)
  const [editContacto, setEditContacto] = useState<Contacto | null>(null)
  const [formC, setFormC] = useState({ ...CONTACTO_EMPTY })
  const [guardandoC, setGuardandoC] = useState(false)
  const [errorC, setErrorC] = useState("")

  // Grupo hospitalario
  const [showAddCentro, setShowAddCentro] = useState(false)
  const [candidatosCentro, setCandidatosCentro] = useState<{ id: string; nombre: string; ciudad: string }[]>([])
  const [buscandoCandidatos, setBuscandoCandidatos] = useState(false)
  const [addingCentro, setAddingCentro] = useState<string | null>(null)

  // QR
  const [showQR, setShowQR] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  // Llamada rápida
  const [showLlamada, setShowLlamada] = useState(false)
  const [llamadaForm, setLlamadaForm] = useState({ motivo: "", resultado: "", contactoId: "", duracion: "", notas: "", seguimiento: false, fechaSeguimiento: "" })
  const [registrandoLlamada, setRegistrandoLlamada] = useState(false)

  // Llamadas tab
  const [llamadasList, setLlamadasList] = useState<{ id: string; fecha: string; asunto: string; duracion: number | null; resultado: string | null; seguimiento: boolean; fechaSeguimiento: string | null; contacto: { nombre: string } | null; usuario: { nombre: string } }[]>([])
  const [llamadasLoaded, setLlamadasLoaded] = useState(false)
  const [llamadasLoading, setLlamadasLoading] = useState(false)

  const isAdmin = userRol === "ADMIN"

  async function cargar() {
    try {
      const rH = await fetch(`/api/hospitales/${id}`)
      if (rH.ok) setHospital(await rH.json())
    } catch (e) { console.error("[cargar hospital]", e) }
    finally { setLoading(false) }
  }
  useEffect(() => { cargar() }, [id])

  function abrirNuevaVisita() {
    const hoy = new Date().toISOString().split("T")[0]
    setFechaVisita(hoy)
    setTituloVisita(hospital ? `Visita ${hospital.nombre} — ${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}` : "")
    setPlantillaId("")
    setShowNuevaVisita(true)
    if (plantillas.length === 0) {
      fetch("/api/plantillas").then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setPlantillas(d) }).catch(() => {})
    }
  }

  async function crearVisita() {
    setCreandoVisita(true)
    const tipo = userRol === "VENTAS" ? "VENTAS" : "PROYECTOS"
    let datos = {}
    if (plantillaId) {
      const pl = await fetch(`/api/plantillas/${plantillaId}`).then(r => r.ok ? r.json() : null).catch(() => null)
      if (pl?.datos) datos = pl.datos
    }
    const r = await fetch("/api/visitas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hospitalId: id, tipo, titulo: tituloVisita || null, fecha: fechaVisita || undefined, datos }),
    })
    if (r.ok) { const v = await r.json(); router.push(`/visitas/${v.id}`) }
    else setCreandoVisita(false)
  }

  async function confirmarEliminarVisita() {
    if (!eliminarVisitaId) return
    setEliminandoVisita(true)
    try {
      const r = await fetch(`/api/visitas/${eliminarVisitaId}`, { method: "DELETE" })
      if (r.ok && hospital) {
        hospital.visitas = hospital.visitas.filter(v => v.id !== eliminarVisitaId)
        setHospital({ ...hospital })
        setEliminarVisitaId(null)
      }
    } finally { setEliminandoVisita(false) }
  }

  function abrirCrearContacto() { setEditContacto(null); setFormC({ ...CONTACTO_EMPTY }); setErrorC(""); setContactoModal(true) }
  function abrirEditarContacto(c: Contacto) {
    setEditContacto(c)
    setFormC({ nombre: c.nombre, cargo: c.cargo ?? "", email: c.email ?? "", telefono: c.telefono ?? "", principal: c.principal })
    setErrorC(""); setContactoModal(true)
  }
  async function guardarContacto() {
    if (!formC.nombre.trim()) { setErrorC("El nombre es obligatorio"); return }
    setGuardandoC(true); setErrorC("")
    const url = editContacto ? `/api/contactos/${editContacto.id}` : `/api/hospitales/${id}/contactos`
    const r = await fetch(url, { method: editContacto ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: formC.nombre, cargo: formC.cargo || null, email: formC.email || null, telefono: formC.telefono || null, principal: formC.principal }),
    })
    if (!r.ok) { const d = await r.json(); setErrorC(d.error ?? "Error al guardar"); setGuardandoC(false); return }
    setContactoModal(false); setGuardandoC(false); await cargar()
  }
  async function eliminarContacto(contactoId: string, nombre: string) {
    if (!confirm(`Eliminar el contacto "${nombre}"?`)) return
    await fetch(`/api/contactos/${contactoId}`, { method: "DELETE" }); await cargar()
  }

  async function cargarCandidatosCentro() {
    if (buscandoCandidatos) return
    setBuscandoCandidatos(true)
    try {
      const r = await fetch("/api/hospitales")
      if (r.ok) {
        const all = await r.json()
        if (Array.isArray(all)) {
          // Filter: not this hospital, not already a center (no grupoId), not already in this group
          const centroIds = new Set(hospital?.centros?.map(c => c.id) ?? [])
          const candidates = all.filter((h: { id: string; grupoId?: string | null }) =>
            h.id !== id && !h.grupoId && !centroIds.has(h.id)
          )
          setCandidatosCentro(candidates.map((h: { id: string; nombre: string; ciudad: string }) => ({ id: h.id, nombre: h.nombre, ciudad: h.ciudad })))
        }
      }
    } catch (e) { console.error("[cargarCandidatosCentro]", e) }
    finally { setBuscandoCandidatos(false) }
  }

  async function addCentroToGroup(centroId: string) {
    setAddingCentro(centroId)
    try {
      const r = await fetch(`/api/hospitales/${centroId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grupoId: id }),
      })
      if (r.ok) {
        await cargar()
        setCandidatosCentro(prev => prev.filter(c => c.id !== centroId))
      }
    } catch (e) { console.error("[addCentroToGroup]", e) }
    finally { setAddingCentro(null) }
  }

  async function removeCentroFromGroup(centroId: string) {
    if (!confirm("Quitar este centro del grupo?")) return
    try {
      const r = await fetch(`/api/hospitales/${centroId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grupoId: null }),
      })
      if (r.ok) await cargar()
    } catch (e) { console.error("[removeCentroFromGroup]", e) }
  }

  async function cargarTimeline() {
    if (timeline.length > 0) return
    setTimelineLoading(true)
    fetch(`/api/hospitales/${id}/timeline`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setTimeline(d) })
      .finally(() => setTimelineLoading(false))
  }

  async function cargarProyectos() {
    if (proyectosLoaded) return
    setProyectosLoading(true)
    fetch(`/api/proyectos?hospitalId=${id}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setProyectos(d) })
      .finally(() => { setProyectosLoading(false); setProyectosLoaded(true) })
  }

  async function crearProyecto(e: React.FormEvent) {
    e.preventDefault()
    if (!formProyecto.titulo.trim()) { setErrorProyecto("El título es obligatorio"); return }
    setGuardandoProyecto(true); setErrorProyecto("")
    const r = await fetch("/api/proyectos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: formProyecto.titulo.trim(), descripcion: formProyecto.descripcion.trim() || null, hospitalId: id }),
    })
    if (!r.ok) {
      const d = await r.json()
      setErrorProyecto(d.error ?? "Error al crear el proyecto")
      setGuardandoProyecto(false)
      return
    }
    const nuevo = await r.json()
    setShowNuevoProyecto(false)
    setFormProyecto({ titulo: "", descripcion: "" })
    setGuardandoProyecto(false)
    router.push(`/proyectos/${nuevo.id}`)
  }

  async function cargarLlamadas() {
    if (llamadasLoaded) return
    setLlamadasLoading(true)
    try {
      const r = await fetch(`/api/llamadas?hospitalId=${id}`)
      if (r.ok) {
        const data = await r.json()
        setLlamadasList(Array.isArray(data) ? data.slice(0, 10) : [])
      }
    } catch { /* silent */ }
    setLlamadasLoaded(true)
    setLlamadasLoading(false)
  }

  function changeTab(t: typeof tab) {
    setTab(t)
    if (t === "timeline") cargarTimeline()
    if (t === "proyectos") cargarProyectos()
    if (t === "llamadas") cargarLlamadas()
  }

  const filteredTimeline = timelineFilter === "todos" ? timeline : timeline.filter(ev => {
    switch (timelineFilter) {
      case "visitas": return ev.tipo === "visita"
      case "oportunidades": return ev.tipo === "oportunidad" || ev.tipo === "etapa"
      case "proyectos": return ev.tipo === "proyecto" || ev.tipo === "preproyecto"
      case "fases": return ev.tipo === "fase" || ev.tipo === "hito"
      case "material": return ev.tipo === "material"
      default: return true
    }
  })

  async function registrarLlamada(e: React.FormEvent) {
    e.preventDefault()
    if (!llamadaForm.motivo.trim()) return
    setRegistrandoLlamada(true)
    try {
      const body: Record<string, unknown> = {
        hospitalId: id,
        asunto: llamadaForm.motivo.trim(),
      }
      if (llamadaForm.resultado) body.resultado = llamadaForm.resultado
      if (llamadaForm.duracion.trim() && parseInt(llamadaForm.duracion) > 0) body.duracion = parseInt(llamadaForm.duracion)
      if (llamadaForm.contactoId) body.contactoId = llamadaForm.contactoId
      if (llamadaForm.notas.trim()) body.notas = llamadaForm.notas.trim()
      if (llamadaForm.seguimiento) {
        body.seguimiento = true
        if (llamadaForm.fechaSeguimiento) body.fechaSeguimiento = llamadaForm.fechaSeguimiento
      }
      const r = await fetch("/api/llamadas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (r.ok) {
        setShowLlamada(false)
        setLlamadaForm({ motivo: "", resultado: "", contactoId: "", duracion: "", notas: "", seguimiento: false, fechaSeguimiento: "" })
        setLlamadasLoaded(false)
        if (tab === "llamadas") cargarLlamadas()
      }
    } catch (e) { console.error(e) } finally { setRegistrandoLlamada(false) }
  }

  useEffect(() => {
    if (!showQR || !hospital || !qrCanvasRef.current) return
    const partes = [hospital.nombre, hospital.ciudad + (hospital.provincia ? `, ${hospital.provincia}` : ""), hospital.pais, TIPO_LABELS[hospital.tipo] ?? hospital.tipo, hospital.camas ? `${hospital.camas} camas` : "", hospital.direccion ?? ""].filter(Boolean)
    import("qrcode").then(QRCode => { QRCode.toCanvas(qrCanvasRef.current!, partes.join("\n"), { width: 240, margin: 2, color: { dark: "#111827", light: "#ffffff" } }) })
  }, [showQR, hospital])

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg skeleton-shimmer shrink-0" />
        <div className="flex-1 space-y-2"><div className="h-6 w-1/2 rounded-lg skeleton-shimmer" /><div className="h-3 w-1/3 rounded-lg skeleton-shimmer" /></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      <div className="lg:grid lg:grid-cols-3 gap-6 space-y-4 lg:space-y-0">
        <div className="lg:col-span-2 h-96 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    </div>
  )
  if (!hospital) return (
    <div className="max-w-6xl mx-auto py-20">
      <EmptyState icon="search" title="Hospital no encontrado" description="El hospital que buscas no existe o no tienes acceso." action={{ label: "Volver a hospitales", href: "/hospitales" }} />
    </div>
  )

  // ─── Computed ──────────────────────────────────────────────────────────────
  const tipoCol = TIPO_COLOR[hospital.tipo] ?? TIPO_COLOR.OTRO
  const ultimaVisita = hospital.visitas[0]?.fecha ?? null
  const hasCoords = hospital.latitud != null && hospital.longitud != null
  const osmUrl = hasCoords ? `https://www.openstreetmap.org/?mlat=${hospital.latitud}&mlon=${hospital.longitud}#map=16/${hospital.latitud}/${hospital.longitud}` : null
  const osmEmbed = hasCoords ? `https://www.openstreetmap.org/export/embed.html?bbox=${(hospital.longitud! - 0.012).toFixed(5)},${(hospital.latitud! - 0.008).toFixed(5)},${(hospital.longitud! + 0.012).toFixed(5)},${(hospital.latitud! + 0.008).toFixed(5)}&layer=mapnik&marker=${hospital.latitud},${hospital.longitud}` : null

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* ── HERO HEADER ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Franja de color del tipo */}
        <div className="h-1.5 w-full" style={{ backgroundColor: tipoCol.dot }} />

        {/* Banner: pertenece a un grupo */}
        {hospital.grupo && (
          <div className="px-5 py-2.5 flex items-center gap-2.5 border-b border-teal-100 dark:border-teal-900"
            style={{ backgroundColor: TEAL + "0a" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Pertenece al grupo{" "}
              <Link href={`/hospitales/${hospital.grupo.id}`} className="font-semibold hover:underline" style={{ color: TEAL }}>
                {hospital.grupo.nombre}
              </Link>
            </p>
          </div>
        )}

        <div className="px-6 py-5">
          {/* Breadcrumb + acciones */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <button onClick={() => fromProyecto ? router.push(`/proyectos/${fromProyecto}`) : router.back()} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors cursor-pointer group">
              <IconArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">{fromProyecto ? "Volver al proyecto" : "Hospitales"}</span>
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowLlamada(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-600 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 10.3a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.62 0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 14.92z"/>
                </svg>
                <span className="hidden sm:inline">Llamada</span>
              </button>
              <button onClick={() => setShowQR(true)}
                className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
                title="Ver QR del hospital">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                  <path d="M14 14h1v1h-1z M17 14h1v1h-1z M14 17h1v1h-1z M17 17h3v3h-3z"/>
                </svg>
              </button>
              <button onClick={abrirNuevaVisita} disabled={creandoVisita}
                className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-xl shadow-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60"
                style={{ backgroundColor: TEAL }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {creandoVisita ? "Creando…" : "Nueva visita"}
              </button>
            </div>
          </div>

          {/* Hospital info */}
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0 shadow-sm"
              style={{ backgroundColor: tipoCol.dot }}>
              {hospital.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-gray-900 leading-tight">{hospital.nombre}</h1>
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: tipoCol.bg, color: tipoCol.text }}>
                  {TIPO_LABELS[hospital.tipo] ?? hospital.tipo}
                </span>
                {!hospital.activo && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-500">Inactivo</span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {hospital.ciudad}{hospital.provincia ? `, ${hospital.provincia}` : ""}{" · "}
                <span className="font-medium text-gray-600">{hospital.zona.nombre}</span>
                {hospital.pais && hospital.pais !== "España" && hospital.pais !== "Espana" && (
                  <span className="ml-1 text-gray-400">· {hospital.pais === "Espana" ? "España" : hospital.pais}</span>
                )}
              </p>
              {hospital.direccion && (
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 14 8 14s8-8.75 8-14a8 8 0 0 0-8-8z"/></svg>
                  {hospital.direccion}
                </p>
              )}
            </div>
            {hospital.score !== undefined && hospital.score > 0 && (
              <div className="shrink-0 text-center">
                <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center border-2"
                  style={{ borderColor: hospital.score >= 80 ? "#16a34a" : hospital.score >= 50 ? TEAL : "#f59e0b", backgroundColor: hospital.score >= 80 ? "#f0fdf4" : hospital.score >= 50 ? `${TEAL}10` : "#fef3c7" }}>
                  <span className="text-sm font-black" style={{ color: hospital.score >= 80 ? "#16a34a" : hospital.score >= 50 ? TEAL : "#f59e0b" }}>{hospital.score}</span>
                </div>
                <p className="text-[9px] text-gray-400 mt-0.5">score</p>
              </div>
            )}
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-gray-50">
            {[
              { label: "Visitas",    value: hospital.visitas.length, color: TEAL,    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
              { label: "Contactos", value: hospital.contactos.length, color: "#6366f1", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
              { label: "Camas",     value: hospital.camas ?? "—", color: "#f59e0b", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><line x1="12" y1="4" x2="12" y2="10"/></svg> },
              { label: "Última visita", value: ultimaVisita ? fechaRel(ultimaVisita) : "Sin visitas", color: "#16a34a", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
            ].map(k => (
              <div key={k.label} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3.5 py-3">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${k.color}18`, color: k.color }}>{k.icon}</span>
                <div className="min-w-0">
                  <p className="text-base font-bold text-gray-900 leading-none truncate">{k.value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{k.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY: main + sidebar ── */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-5 lg:space-y-0">

        {/* ── MAIN CONTENT (2/3) ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {([
              { k: "actividad",    label: "Actividad", badge: hospital.contactos.length + hospital.visitas.length },
              { k: "llamadas",     label: "Llamadas",  badge: llamadasLoaded ? llamadasList.length : null },
              { k: "proyectos",    label: "Proyectos", badge: proyectosLoaded ? proyectos.length : null },
              { k: "timeline",     label: "Timeline", badge: null },
              { k: "informacion",  label: "Info", badge: null },
            ] as { k: typeof tab; label: string; badge: number | null }[]).map(t => (
              <button key={t.k} onClick={() => changeTab(t.k)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap"
                style={tab === t.k ? { backgroundColor: "white", color: TEAL, boxShadow: "0 1px 4px rgba(0,0,0,.08)" } : { color: "#6b7280" }}>
                {t.label}
                {t.badge !== null && t.badge > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: tab === t.k ? `${TEAL}18` : "#e5e7eb", color: tab === t.k ? TEAL : "#9ca3af" }}>{t.badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tab: Actividad (contactos + visitas) ── */}
          {tab === "actividad" && (
            <div className="space-y-5">

              {/* Contactos */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-bold text-gray-800">
                    Contactos
                    {hospital.contactos.length > 0 && <span className="ml-2 text-xs font-semibold text-gray-400">({hospital.contactos.length})</span>}
                  </h2>
                  <button onClick={abrirCrearContacto}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl text-white cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: TEAL }}>
                    <IconPlus size={12} /> Añadir contacto
                  </button>
                </div>
                {hospital.contactos.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-600">Sin contactos registrados</p>
                    <p className="text-xs text-gray-400 mt-1">Añade el primer contacto de este centro.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {hospital.contactos.map(c => (
                      <div key={c.id} className="flex items-start gap-3.5 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                          style={{ backgroundColor: c.principal ? TEAL : avColor(c.nombre) }}>
                          {c.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900">{c.nombre}</p>
                            {c.principal && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: TEAL }}>Principal</span>
                            )}
                          </div>
                          {c.cargo && <p className="text-xs text-gray-400 mt-0.5">{c.cargo}</p>}
                          <div className="flex flex-wrap gap-3 mt-2">
                            {c.email && (
                              <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-teal-600 transition-colors">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                <span className="truncate max-w-[160px]">{c.email}</span>
                              </a>
                            )}
                            {c.telefono && (
                              <a href={`tel:${c.telefono}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-teal-600 transition-colors">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 10.3a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.62 0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 14.92z"/></svg>
                                {c.telefono}
                              </a>
                            )}
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => abrirEditarContacto(c)} className="text-xs text-gray-400 hover:text-gray-700 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors">Editar</button>
                            <button onClick={() => eliminarContacto(c.id, c.nombre)} className="text-xs text-red-400 hover:text-red-600 px-2.5 py-1.5 rounded-lg border border-red-100 cursor-pointer transition-colors">Eliminar</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Visitas recientes */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-bold text-gray-800">
                    Historial de visitas
                    {hospital.visitas.length > 0 && <span className="ml-2 text-xs font-semibold text-gray-400">({hospital.visitas.length})</span>}
                  </h2>
                  <button onClick={abrirNuevaVisita} disabled={creandoVisita}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border cursor-pointer transition-colors disabled:opacity-50"
                    style={{ borderColor: TEAL, color: TEAL }}>
                    <IconPlus size={12} /> {creandoVisita ? "Creando…" : "Nueva visita"}
                  </button>
                </div>
                {hospital.visitas.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm font-semibold text-gray-600">Sin visitas registradas</p>
                    <p className="text-xs text-gray-400 mt-1">Crea la primera visita a este hospital.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {hospital.visitas.slice(0, 15).map(v => {
                      const estColor = ESTADO_COLOR[v.estado] ?? "#9ca3af"
                      return (
                        <Link key={v.id} href={`/visitas/${v.id}`}
                          className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors group">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: estColor }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: estColor + "18", color: estColor }}>
                                {ESTADO_LABEL[v.estado] ?? v.estado}
                              </span>
                              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{v.tipo}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{v.usuario.nombre}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-semibold text-gray-700">{fmtFecha(v.fecha)}</p>
                            <p className="text-[10px] text-gray-400">{fechaRel(v.fecha)}</p>
                          </div>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEliminarVisitaId(v.id) }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all shrink-0"
                            title="Eliminar visita"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" className="group-hover:stroke-gray-400 transition-colors shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
                        </Link>
                      )
                    })}
                    {hospital.visitas.length > 15 && (
                      <div className="px-5 py-3 text-center">
                        <p className="text-xs text-gray-400">+{hospital.visitas.length - 15} visitas más</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Llamadas ── */}
          {tab === "llamadas" && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-gray-800">
                <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  Llamadas
                  {llamadasList.length > 0 && <span className="ml-2 text-xs font-semibold text-gray-400">({llamadasList.length})</span>}
                </h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowLlamada(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl text-white cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: TEAL }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Registrar
                  </button>
                  <Link href={`/llamadas`}
                    className="text-xs font-medium hover:underline transition-colors"
                    style={{ color: TEAL }}>
                    Ver todas
                  </Link>
                </div>
              </div>
              {llamadasLoading ? (
                <div className="p-5 space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl skeleton-shimmer" />)}
                </div>
              ) : llamadasList.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 10.3a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.62 0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 14.92z"/>
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Sin llamadas registradas</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Las llamadas a este centro apareceran aqui.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {llamadasList.map(ll => {
                    const rColor = ll.resultado === "Contactado" ? TEAL : ll.resultado === "Reunion agendada" ? "#16a34a" : ll.resultado === "No contesta" ? "#9ca3af" : ll.resultado === "Buzon de voz" ? "#f59e0b" : ll.resultado === "Informacion enviada" ? "#3b82f6" : "#d1d5db"
                    return (
                      <div key={ll.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: ll.seguimiento ? "#f59e0b" : rColor }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{ll.asunto}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {ll.contacto && <span className="text-xs text-gray-400 truncate">{ll.contacto.nombre}</span>}
                            <span className="text-xs text-gray-300 dark:text-gray-600">
                              {new Date(ll.fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {ll.duracion && ll.duracion > 0 && (
                            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">{ll.duracion} min</span>
                          )}
                          {ll.resultado && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: rColor }}>{ll.resultado}</span>
                          )}
                          {ll.seguimiento && (
                            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                              Seguimiento
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Proyectos ── */}
          {tab === "proyectos" && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <h2 className="text-sm font-bold text-gray-800">
                  Proyectos
                  {proyectos.length > 0 && <span className="ml-2 text-xs font-semibold text-gray-400">({proyectos.length})</span>}
                </h2>
                <button onClick={() => { setFormProyecto({ titulo: "", descripcion: "" }); setErrorProyecto(""); setShowNuevoProyecto(true) }}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl text-white cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: TEAL }}>
                  <IconPlus size={12} /> Nuevo proyecto
                </button>
              </div>
              {proyectosLoading ? (
                <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
              ) : proyectos.length === 0 ? (
                <div className="px-5 py-14 text-center">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-600">Sin proyectos activos</p>
                  <p className="text-xs text-gray-400 mt-1">Crea el primer proyecto para este hospital.</p>
                  <button onClick={() => { setFormProyecto({ titulo: "", descripcion: "" }); setErrorProyecto(""); setShowNuevoProyecto(true) }}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: TEAL }}>
                    <IconPlus size={12} /> Crear proyecto
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {proyectos.map(p => {
                    const fasFin = p.fases.filter(f => f.estado === "COMPLETADO").length
                    const fasTot = p.fases.length
                    const pct = fasTot > 0 ? Math.round((fasFin / fasTot) * 100) : 0
                    const est = PROY_ESTADO_COLOR[p.estado] ?? { bg: "#f3f4f6", text: "#6b7280" }
                    const retrasado = p.fechaFinPlan && new Date(p.fechaFinPlan) < new Date()
                      && p.estado !== "COMPLETADO" && p.estado !== "CANCELADO"
                    return (
                      <Link key={p.id} href={`/proyectos/${p.id}`}
                        className="block px-5 py-4 hover:bg-gray-50/50 transition-colors group">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: est.bg, color: est.text }}>
                                {PROY_ESTADO_LABEL[p.estado] ?? p.estado}
                              </span>
                              {retrasado && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Retrasado</span>}
                            </div>
                            <p className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-teal-700 transition-colors line-clamp-1">{p.titulo}</p>
                            {p.responsable && <p className="text-xs text-gray-400 mt-0.5">{p.responsable.nombre}</p>}
                            {fasTot > 0 && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] text-gray-400">{fasFin}/{fasTot} fases</span>
                                  <span className="text-[10px] font-semibold" style={{ color: pct === 100 ? "#16a34a" : TEAL }}>{pct}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#16a34a" : TEAL }} />
                                </div>
                              </div>
                            )}
                            {p.fechaInicio && (
                              <p className="text-[10px] text-gray-400 mt-1.5">Inicio: {fmtFecha(p.fechaInicio)}{p.fechaFinPlan ? ` · Fin: ${fmtFecha(p.fechaFinPlan)}` : ""}</p>
                            )}
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" className="group-hover:stroke-gray-400 transition-colors shrink-0 mt-1"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Timeline ── */}
          {tab === "timeline" && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="text-sm font-bold text-gray-800 mb-3">Actividad completa del centro</h2>
                <div className="flex gap-1.5 flex-wrap">
                  {TIMELINE_FILTROS.map(f => (
                    <button key={f.value} onClick={() => setTimelineFilter(f.value)}
                      className="px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all"
                      style={timelineFilter === f.value
                        ? { backgroundColor: TEAL, color: "white" }
                        : { backgroundColor: "#f3f4f6", color: "#6b7280" }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {timelineLoading ? (
                <div className="p-5 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
              ) : filteredTimeline.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <p className="text-sm text-gray-400">{timeline.length === 0 ? "Sin actividad registrada" : "Sin resultados para este filtro"}</p>
                </div>
              ) : (
                <div className="relative px-5 py-4">
                  <div className="absolute left-8 top-4 bottom-4 w-px bg-gray-100" />
                  <div className="space-y-4">
                    {filteredTimeline.map(ev => (
                      <div key={ev.id} className="flex gap-4 items-start">
                        <div className="w-3 h-3 rounded-full shrink-0 mt-1.5 border-2 border-white shadow-sm z-10"
                          style={{ backgroundColor: TIMELINE_COLOR[ev.tipo] ?? "#9ca3af" }} />
                        <div className="flex-1 min-w-0 bg-gray-50 rounded-xl px-3.5 py-3 hover:bg-gray-100/60 transition-colors">
                          {ev.href
                            ? <Link href={ev.href} className="text-sm font-semibold text-gray-800 hover:text-teal-600 transition-colors block truncate">{ev.titulo}</Link>
                            : <p className="text-sm font-semibold text-gray-800 truncate">{ev.titulo}</p>}
                          {ev.descripcion && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{ev.descripcion}</p>}
                          <p className="text-[10px] text-gray-400 mt-1">{fechaRel(ev.fecha)} · {fmtFecha(ev.fecha)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Información ── */}
          {tab === "informacion" && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="text-sm font-bold text-gray-800">Datos del centro</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {[
                    { label: "Tipo",          value: TIPO_LABELS[hospital.tipo] ?? hospital.tipo },
                    { label: "Zona",          value: hospital.zona.nombre },
                    { label: "Ciudad",        value: hospital.ciudad },
                    { label: "Provincia",     value: hospital.provincia ?? "—" },
                    { label: "País",          value: hospital.pais === "Espana" ? "España" : (hospital.pais || "España") },
                    { label: "Camas",         value: hospital.camas?.toLocaleString("es-ES") ?? "—" },
                    { label: "Dirección",     value: hospital.direccion ?? "—" },
                    { label: "Estado",        value: hospital.activo ? "Activo" : "Inactivo" },
                    ...(hasCoords ? [{ label: "Coordenadas", value: `${hospital.latitud?.toFixed(5)}, ${hospital.longitud?.toFixed(5)}` }] : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between px-5 py-3.5">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
                      <span className="text-sm text-gray-700 text-right max-w-[60%] truncate">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {hospital.tipo && TIPO_DESCRIPCION[hospital.tipo] && (
                <div className="bg-gray-50 rounded-2xl border border-gray-100 px-5 py-4 flex items-start gap-3">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={tipoCol.dot} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  <div>
                    <p className="text-xs font-bold mb-0.5" style={{ color: tipoCol.text }}>{TIPO_LABELS[hospital.tipo]}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{TIPO_DESCRIPCION[hospital.tipo]}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SIDEBAR (1/3) ── */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">

          {/* Mapa */}
          {osmEmbed && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <iframe
                src={osmEmbed}
                width="100%" height="180"
                className="border-0 w-full"
                title={`Mapa de ${hospital.nombre}`}
                loading="lazy"
              />
              <div className="px-4 py-2.5 flex items-center justify-between">
                <span className="text-[10px] text-gray-400">© OpenStreetMap contributors</span>
                <a href={osmUrl!} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors"
                  style={{ color: TEAL }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Abrir en mapa
                </a>
              </div>
            </div>
          )}

          {/* Info rápida */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-3.5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Resumen del centro</p>
            <div className="space-y-2.5">
              {[
                { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, label: hospital.ciudad + (hospital.provincia ? `, ${hospital.provincia}` : "") },
                { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, label: hospital.zona.nombre },
                ...(hospital.camas ? [{ icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><line x1="12" y1="4" x2="12" y2="10"/></svg>, label: `${hospital.camas.toLocaleString("es-ES")} camas` }] : []),
                ...(hospital.direccion ? [{ icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/></svg>, label: hospital.direccion }] : []),
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-gray-600">
                  <span className="text-gray-400 shrink-0 mt-0.5">{item.icon}</span>
                  <span className="leading-relaxed">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Grupo hospitalario ── */}
          {/* Case 1: Hospital IS a group head (has centros, no grupoId) */}
          {hospital.centros && hospital.centros.length > 0 && !hospital.grupoId && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
              style={{ borderLeft: `3px solid ${TEAL}` }}>
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                  </svg>
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Grupo hospitalario</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: TEAL + "18", color: TEAL }}>
                    {hospital.centros.length}
                  </span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => { setShowAddCentro(true); cargarCandidatosCentro() }}
                    className="text-[10px] font-semibold px-2 py-1 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ color: TEAL, backgroundColor: TEAL + "10" }}>
                    + Centro
                  </button>
                )}
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {hospital.centros.map(c => {
                  const cTipo = TIPO_COLOR[c.tipo] ?? TIPO_COLOR.OTRO
                  return (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: cTipo.bg, color: cTipo.text }}>
                        {c.nombre.charAt(0).toUpperCase()}
                      </div>
                      <Link href={`/hospitales/${c.id}`} className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate hover:underline">{c.nombre}</p>
                        <p className="text-[10px] text-gray-400 truncate">{c.ciudad}</p>
                      </Link>
                      <div className="text-right shrink-0 space-y-0.5">
                        <span className="text-[10px] font-medium text-gray-400 block">{c._count.visitas}v · {c._count.proyectos}p</span>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: cTipo.bg, color: cTipo.text }}>
                          {TIPO_LABELS[c.tipo] ?? c.tipo}
                        </span>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => removeCentroFromGroup(c.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-500 transition-all shrink-0"
                          title="Quitar del grupo">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Case 2: Hospital IS a center (has grupoId) — show siblings */}
          {hospital.grupo && (
            (() => {
              // We need to fetch siblings from the grupo page, but for now we show a reference to the parent
              return (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4"
                  style={{ borderLeft: `3px solid ${TEAL}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Grupo hospitalario</p>
                  </div>
                  <Link href={`/hospitales/${hospital.grupo.id}`}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: TEAL }}>
                      {hospital.grupo.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{hospital.grupo.nombre}</p>
                      <p className="text-[10px] text-gray-400">Hospital cabecera del grupo</p>
                    </div>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" className="shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
                  </Link>
                </div>
              )
            })()
          )}

          {/* Acciones rápidas */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Acciones</p>
            <div className="space-y-2">
              <button onClick={abrirNuevaVisita} disabled={creandoVisita}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60"
                style={{ backgroundColor: TEAL }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {creandoVisita ? "Creando visita…" : "Nueva visita"}
              </button>
              <button onClick={() => { setFormProyecto({ titulo: "", descripcion: "" }); setErrorProyecto(""); setShowNuevoProyecto(true) }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#6366f1" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nuevo proyecto
              </button>
              <button onClick={() => setShowLlamada(true)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 10.3a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.62 0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 14.92z"/></svg>
                Registrar llamada
              </button>
              <button onClick={abrirCrearContacto}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/><line x1="20" y1="8" x2="20" y2="14"/></svg>
                Añadir contacto
              </button>
              <button onClick={() => setShowQR(true)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
                Ver código QR
              </button>
              {osmUrl && (
                <a href={osmUrl} target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 14 8 14s8-8.75 8-14a8 8 0 0 0-8-8z"/></svg>
                  Ver en OpenStreetMap
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: Nueva visita ── */}
      {showNuevaVisita && hospital && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) setShowNuevaVisita(false) }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md my-auto" style={{ borderTop: `3px solid ${TEAL}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Nueva visita</h2>
                <p className="text-xs text-gray-400 mt-0.5">{hospital.nombre}</p>
              </div>
              <button onClick={() => setShowNuevaVisita(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"><IconX size={15} /></button>
            </div>
            <div className="px-5 py-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nombre de la visita</label>
                <input value={tituloVisita} onChange={e => setTituloVisita(e.target.value)}
                  placeholder="Se genera automáticamente"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Fecha</label>
                <input type="date" value={fechaVisita} onChange={e => setFechaVisita(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              {plantillas.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Plantilla (opcional)</label>
                  <select value={plantillaId} onChange={e => setPlantillaId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer">
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
            <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setShowNuevaVisita(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">Cancelar</button>
              <button onClick={crearVisita} disabled={creandoVisita}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 cursor-pointer hover:opacity-90 transition-opacity"
                style={{ backgroundColor: TEAL }}>
                {creandoVisita ? "Creando…" : "Crear visita"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Llamada rápida ── */}
      {showLlamada && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={e => { if (e.target === e.currentTarget) setShowLlamada(false) }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md my-auto" style={{ borderTop: `3px solid ${TEAL}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div><h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Registrar llamada</h2><p className="text-xs text-gray-400 mt-0.5">{hospital.nombre}</p></div>
              <button onClick={() => setShowLlamada(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 cursor-pointer"><IconX size={15} /></button>
            </div>
            <form onSubmit={registrarLlamada} className="px-5 py-4 space-y-3.5 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Asunto <span className="text-red-400">*</span></label>
                <input value={llamadaForm.motivo} onChange={e => setLlamadaForm(p => ({ ...p, motivo: e.target.value }))} required placeholder="Consulta disponibilidad, seguimiento propuesta..." autoFocus
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-800 dark:text-gray-200 min-h-[44px]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Contacto</label>
                  <select value={llamadaForm.contactoId} onChange={e => setLlamadaForm(p => ({ ...p, contactoId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-800 dark:text-gray-200 min-h-[44px]">
                    <option value="">Sin especificar</option>
                    {hospital.contactos.map((c: Contacto) => <option key={c.id} value={c.id}>{c.nombre}{c.cargo ? ` — ${c.cargo}` : ""}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Duración (min)</label>
                  <input type="number" min="1" value={llamadaForm.duracion} onChange={e => setLlamadaForm(p => ({ ...p, duracion: e.target.value }))} placeholder="15"
                    className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-800 dark:text-gray-200 min-h-[44px]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Resultado</label>
                <select value={llamadaForm.resultado} onChange={e => setLlamadaForm(p => ({ ...p, resultado: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-800 dark:text-gray-200 min-h-[44px]">
                  <option value="">Sin resultado</option>
                  <option value="Contactado">Contactado</option>
                  <option value="No contesta">No contesta</option>
                  <option value="Buzon de voz">Buzón de voz</option>
                  <option value="Informacion enviada">Información enviada</option>
                  <option value="Reunion agendada">Reunión agendada</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Notas</label>
                <textarea value={llamadaForm.notas} onChange={e => setLlamadaForm(p => ({ ...p, notas: e.target.value }))} rows={2} placeholder="Qué se acordó, observaciones..."
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-800 dark:text-gray-200 resize-none" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer min-h-[44px]">
                  <button type="button" role="switch" aria-checked={llamadaForm.seguimiento}
                    onClick={() => setLlamadaForm(p => ({ ...p, seguimiento: !p.seguimiento }))}
                    className={`relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 ${llamadaForm.seguimiento ? "" : "bg-gray-200 dark:bg-gray-700"}`}
                    style={llamadaForm.seguimiento ? { backgroundColor: TEAL } : undefined}>
                    <span className={`absolute left-0 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${llamadaForm.seguimiento ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                  </button>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Seguimiento</span>
                </label>
                {llamadaForm.seguimiento && (
                  <input type="date" value={llamadaForm.fechaSeguimiento} onChange={e => setLlamadaForm(p => ({ ...p, fechaSeguimiento: e.target.value }))}
                    className="px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-800 dark:text-gray-200 min-h-[44px]" />
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowLlamada(false)} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">Cancelar</button>
                <button type="submit" disabled={registrandoLlamada || !llamadaForm.motivo.trim()} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 cursor-pointer hover:opacity-90" style={{ backgroundColor: TEAL }}>{registrandoLlamada ? "Guardando…" : "Registrar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: QR ── */}
      {showQR && hospital && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) setShowQR(false) }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 flex flex-col items-center gap-4 max-w-xs w-full">
            <div className="flex items-center justify-between w-full">
              <p className="font-semibold text-gray-800 text-sm">QR del hospital</p>
              <button onClick={() => setShowQR(false)} aria-label="Cerrar QR" className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"><IconX size={16} /></button>
            </div>
            <canvas ref={qrCanvasRef} className="rounded-xl" />
            <p className="text-xs text-gray-500 text-center leading-relaxed">{hospital.nombre}<br/>{hospital.ciudad}</p>
            <button onClick={() => {
              const canvas = qrCanvasRef.current
              if (!canvas) return
              const link = document.createElement("a")
              link.download = `qr-${hospital.nombre.replace(/\s+/g, "-").toLowerCase()}.png`
              link.href = canvas.toDataURL("image/png")
              link.click()
            }} className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer hover:opacity-90" style={{ backgroundColor: TEAL }}>
              Descargar PNG
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: Nuevo proyecto ── */}
      {showNuevoProyecto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md my-auto" style={{ borderTop: `3px solid #6366f1` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Nuevo proyecto</h2>
                <p className="text-xs text-gray-400 mt-0.5">{hospital!.nombre}</p>
              </div>
              <button onClick={() => setShowNuevoProyecto(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"><IconX size={15} /></button>
            </div>
            <form onSubmit={crearProyecto} className="px-5 py-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Título del proyecto <span className="text-red-400">*</span></label>
                <input value={formProyecto.titulo} onChange={e => setFormProyecto(p => ({ ...p, titulo: e.target.value }))} required autoFocus placeholder="Ej: Proyecto preanalítica 2026" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Descripción (opcional)</label>
                <textarea value={formProyecto.descripcion} onChange={e => setFormProyecto(p => ({ ...p, descripcion: e.target.value }))} rows={2} placeholder="Breve descripción del alcance…" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
              </div>
              {errorProyecto && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{errorProyecto}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowNuevoProyecto(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">Cancelar</button>
                <button type="submit" disabled={guardandoProyecto || !formProyecto.titulo.trim()} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 cursor-pointer hover:opacity-90" style={{ backgroundColor: "#6366f1" }}>
                  {guardandoProyecto ? "Creando…" : "Crear proyecto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Eliminar visita ── */}
      {eliminarVisitaId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-red-600">Eliminar visita</h2>
              <p className="text-xs text-gray-500 mt-1">Esta acción no se puede deshacer. La visita y todos sus datos asociados se eliminarán permanentemente.</p>
            </div>
            <div className="flex gap-2 px-5 py-4">
              <button onClick={() => setEliminarVisitaId(null)} disabled={eliminandoVisita}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">Cancelar</button>
              <button onClick={confirmarEliminarVisita} disabled={eliminandoVisita}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 cursor-pointer transition-colors">
                {eliminandoVisita ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Añadir centro al grupo ── */}
      {showAddCentro && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowAddCentro(false) }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" style={{ borderTop: `3px solid ${TEAL}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Añadir centro al grupo</h2>
                <p className="text-xs text-gray-400 mt-0.5">{hospital.nombre}</p>
              </div>
              <button onClick={() => setShowAddCentro(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 cursor-pointer"><IconX size={15} /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-3">
              {buscandoCandidatos ? (
                <div className="py-10 text-center">
                  <div className="w-6 h-6 border-2 border-gray-200 border-t-teal-500 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-gray-400">Cargando hospitales...</p>
                </div>
              ) : candidatosCentro.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Sin hospitales disponibles</p>
                  <p className="text-xs text-gray-400 mt-1">Todos los hospitales ya pertenecen a un grupo o son este mismo.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {candidatosCentro.map(c => (
                    <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{c.nombre}</p>
                        <p className="text-xs text-gray-400">{c.ciudad}</p>
                      </div>
                      <button
                        onClick={() => addCentroToGroup(c.id)}
                        disabled={addingCentro === c.id}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
                        style={{ backgroundColor: TEAL }}>
                        {addingCentro === c.id ? "..." : "Añadir"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Contacto ── */}
      {contactoModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md my-auto" style={{ borderTop: `3px solid ${TEAL}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">{editContacto ? "Editar contacto" : "Nuevo contacto"}</h2>
              <button onClick={() => setContactoModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"><IconX size={15} /></button>
            </div>
            <div className="px-5 py-4 space-y-3.5">
              <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nombre <span className="text-red-400">*</span></label>
                <input value={formC.nombre} onChange={e => setFormC(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre completo" autoFocus className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" /></div>
              <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Cargo</label>
                <input value={formC.cargo} onChange={e => setFormC(p => ({ ...p, cargo: e.target.value }))} placeholder="Director de Laboratorio…" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                  <input type="email" value={formC.email} onChange={e => setFormC(p => ({ ...p, email: e.target.value }))} placeholder="email@hospital.es" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" /></div>
                <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Teléfono</label>
                  <input type="tel" value={formC.telefono} onChange={e => setFormC(p => ({ ...p, telefono: e.target.value }))} placeholder="+34 600 000 000" className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" /></div>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={formC.principal} onChange={e => setFormC(p => ({ ...p, principal: e.target.checked }))} className="rounded" />
                <span className="text-sm text-gray-700 font-medium">Contacto principal</span>
              </label>
              {errorC && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{errorC}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setContactoModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">Cancelar</button>
                <button onClick={guardarContacto} disabled={guardandoC} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 cursor-pointer hover:opacity-90" style={{ backgroundColor: TEAL }}>{guardandoC ? "Guardando…" : editContacto ? "Guardar cambios" : "Crear contacto"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
