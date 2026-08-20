"use client"

import { useEffect, useState, useCallback, useRef, type ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { TEAL, TEAL_LIGHT, ORANGE } from "@/lib/brand"
import { useToast } from "@/components/Toast"
import { usePerfil } from "@/hooks/usePerfil"
import { useModalA11y } from "@/hooks/useModalA11y"
import { Skeleton } from "@/components/ui/Skeleton"
import { comprimirImagen } from "@/lib/img-compress"
import {
  IconArrowLeft, IconClipboardList, IconPhoneIncoming, IconPhoneOutgoing,
  IconSend, IconInbox, IconZap, IconWrench, IconTerminal,
  IconMessageCircle, IconRefreshCw, IconUserCheck, IconClock,
  IconEyeOff, IconFileExport, IconAlertTriangle, IconPhone, IconMail,
  IconCamera, IconEdit, IconX, IconChevronDown, IconMonitorShare,
  IconUsers, IconBuilding,
} from "@/components/ui/Icons"

interface Evento {
  id: string
  tipo: string
  descripcion: string
  duracion: number | null
  privado: boolean
  metadatos: unknown
  fotos: string[] | null
  realizadoPorNombres: string[] | null
  editadoPor: string | null
  editadoEn: string | null
  creadoEn: string
  autor: { id: string; nombre: string }
}

interface UsuarioBasico { id: string; nombre: string }

interface RespuestaRapida {
  id: string; texto: string; categoria: string | null
}

interface Incidencia {
  id: string; codigo: string; titulo: string; descripcion: string
  tipo: "HARDWARE" | "SOFTWARE"; categoria: string
  prioridad: string; estado: string; equipoResponsable: string
  slaHoras: number | null; resolucion: string | null
  slaPausadoEn: string | null; slaPausadoMs: number
  creadoEn: string; actualizadoEn: string
  fechaResolucion: string | null; fechaCierre: string | null
  hospital: { id: string; nombre: string; ciudad: string; provincia: string | null }
  contacto: { id: string; nombre: string; cargo: string | null; email: string | null; telefono: string | null } | null
  coasignadosIds: { id: string; nombre: string }[] | null
  reportadoPor: { id: string; nombre: string }
  asignadoA: { id: string; nombre: string } | null
  hardwareUnidad: { id: string; numSerie: string | null; estado: string; catalogo: { id: string; marca: string; modelo: string; referenciaPalex: string | null } } | null
  eventos: Evento[]
}

const ESTADOS = [
  { value: "ABIERTA", label: "Abierta", color: "#ef4444", bg: "#fef2f2" },
  { value: "EN_PROGRESO", label: "En progreso", color: "#f59e0b", bg: "#fffbeb" },
  { value: "PENDIENTE_CLIENTE", label: "Pendiente cliente", color: "#8b5cf6", bg: "#f5f3ff" },
  { value: "PENDIENTE_PROVEEDOR", label: "Pendiente proveedor", color: "#6366f1", bg: "#eef2ff" },
  { value: "RESUELTA", label: "Resuelta", color: "#10b981", bg: "#ecfdf5" },
  { value: "CERRADA", label: "Cerrada", color: "#6b7280", bg: "#f3f4f6" },
]

const PRIORIDADES: Record<string, { label: string; color: string; bg: string }> = {
  CRITICA: { label: "Crítica", color: "#dc2626", bg: "#fef2f2" },
  ALTA: { label: "Alta", color: "#f97316", bg: "#fff7ed" },
  MEDIA: { label: "Media", color: "#f59e0b", bg: "#fffbeb" },
  BAJA: { label: "Baja", color: TEAL, bg: TEAL_LIGHT },
}

const CATEGORIAS: Record<string, string> = {
  BC_ROBO: "BC Robo", ZEBRA_MC: "Zebra MC", ZEBRA_IMPRESORA: "Zebra Impresora",
  READER_RFID: "Reader RFID", GATEWAY_BT: "Gateway BT", MINI_PC: "Mini-PC",
  NEVERA: "Nevera", PANTALLA: "Pantalla", TOTEM: "Tótem", INLAB: "InLab", OTRO: "Otro",
}

const EQUIPOS: Record<string, string> = {
  SERVICIO_TECNICO: "Servicio Técnico", APLICACIONES: "Aplicaciones",
  COMERCIAL: "Comercial", MARKETING: "Marketing", PROYECTOS: "Proyectos",
}

interface TipoEventoDef {
  value: string
  label: string
  icon: (props: { size?: number; className?: string }) => ReactNode
  color: string
}

const TIPOS_EVENTO: TipoEventoDef[] = [
  { value: "NOTA", label: "Nota interna", icon: IconClipboardList, color: "#6b7280" },
  { value: "LLAMADA_ENTRANTE", label: "Llamada entrante", icon: IconPhoneIncoming, color: "#10b981" },
  { value: "LLAMADA_SALIENTE", label: "Llamada saliente", icon: IconPhoneOutgoing, color: "#3b82f6" },
  { value: "SOPORTE_REMOTO", label: "Soporte remoto", icon: IconMonitorShare, color: "#7c3aed" },
  { value: "EMAIL_ENVIADO", label: "Email enviado", icon: IconSend, color: "#8b5cf6" },
  { value: "EMAIL_RECIBIDO", label: "Email recibido", icon: IconInbox, color: "#6366f1" },
  { value: "REUNION_INTERNA", label: "Reunión interna", icon: IconUsers, color: "#0284c7" },
  { value: "REUNION_CLIENTE", label: "Reunión cliente", icon: IconBuilding, color: "#d97706" },
  { value: "ESCALADO", label: "Escalado", icon: IconZap, color: "#ef4444" },
  { value: "RESPUESTA_TECNICA", label: "Resp. técnica", icon: IconWrench, color: TEAL },
  { value: "RESPUESTA_APLICACIONES", label: "Resp. aplicaciones", icon: IconTerminal, color: "#0ea5e9" },
  { value: "COMUNICACION_CLIENTE", label: "Com. cliente", icon: IconMessageCircle, color: ORANGE },
]

const TIPOS_EVENTO_AUTO: TipoEventoDef[] = [
  { value: "CAMBIO_ESTADO", label: "Cambio estado", icon: IconRefreshCw, color: "#9ca3af" },
  { value: "CAMBIO_ASIGNACION", label: "Cambio asignación", icon: IconUserCheck, color: "#9ca3af" },
]

const ALL_TIPOS = [...TIPOS_EVENTO, ...TIPOS_EVENTO_AUTO]

function getEstadoStyle(estado: string) {
  return ESTADOS.find(e => e.value === estado) ?? { label: estado, color: "#6b7280", bg: "#f3f4f6" }
}

function getEventoInfo(tipo: string): TipoEventoDef {
  return ALL_TIPOS.find(t => t.value === tipo) ?? { label: tipo, icon: IconClipboardList, color: "#6b7280", value: tipo }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function dateGroupLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.floor((today.getTime() - target.getTime()) / 86400000)
  if (diff === 0) return "Hoy"
  if (diff === 1) return "Ayer"
  if (diff < 7) return `Hace ${diff} días`
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
}

function slaInfo(inc: Incidencia) {
  const { creadoEn, slaHoras, estado, slaPausadoEn, slaPausadoMs, fechaResolucion } = inc
  if (!slaHoras) return { label: "Sin SLA", color: "#9ca3af", pct: 0, paused: false }
  const endTime = fechaResolucion ? new Date(fechaResolucion).getTime() : Date.now()
  let totalPausedMs = slaPausadoMs || 0
  if (slaPausadoEn) totalPausedMs += endTime - new Date(slaPausadoEn).getTime()
  const effectiveMs = endTime - new Date(creadoEn).getTime() - totalPausedMs
  const elapsed = effectiveMs / 3600000
  const remaining = Math.max(0, slaHoras - elapsed)
  const pct = Math.min(100, (elapsed / slaHoras) * 100)
  const paused = !!slaPausadoEn && !["RESUELTA", "CERRADA"].includes(estado)
  if (["RESUELTA", "CERRADA"].includes(estado)) {
    const ok = elapsed <= slaHoras
    return { label: ok ? `Cumplido (${Math.round(elapsed)}h)` : `Excedido (${Math.round(elapsed)}h)`, color: ok ? "#10b981" : "#ef4444", pct: ok ? pct : 100, paused: false }
  }
  if (remaining <= 0) return { label: `Vencido hace ${Math.round(elapsed - slaHoras)}h`, color: "#ef4444", pct: 100, paused }
  if (pct > 75) return { label: `${Math.round(remaining)}h restantes`, color: "#f59e0b", pct, paused }
  return { label: `${Math.round(remaining)}h restantes`, color: "#10b981", pct, paused }
}

function groupEventsByDate(eventos: Evento[]): { label: string; events: Evento[] }[] {
  const groups: { label: string; events: Evento[] }[] = []
  for (const ev of eventos) {
    const label = dateGroupLabel(ev.creadoEn)
    const last = groups[groups.length - 1]
    if (last && last.label === label) {
      last.events.push(ev)
    } else {
      groups.push({ label, events: [ev] })
    }
  }
  return groups
}

export default function IncidenciaDetallePage() {
  const params = useParams()
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const { perfil, rol } = usePerfil()
  const id = params.id as string

  const [inc, setInc] = useState<Incidencia | null>(null)
  const [loading, setLoading] = useState(true)

  const [eventoTipo, setEventoTipo] = useState("NOTA")
  const [eventoDesc, setEventoDesc] = useState("")
  const [eventoDuracion, setEventoDuracion] = useState("")
  const [eventoPrivado, setEventoPrivado] = useState(false)
  const [eventoFecha, setEventoFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [eventoHora, setEventoHora] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  })
  const [enviandoEvento, setEnviandoEvento] = useState(false)

  const [eventoFotos, setEventoFotos] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [respuestasRapidas, setRespuestasRapidas] = useState<RespuestaRapida[]>([])
  const [showRespuestas, setShowRespuestas] = useState(false)
  const [editandoEventoId, setEditandoEventoId] = useState<string | null>(null)
  const [lightboxImg, setLightboxImg] = useState<string | null>(null)

  const [realizadoPorNombres, setRealizadoPorNombres] = useState<string[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioBasico[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const lightboxA11yRef = useModalA11y(!!lightboxImg, () => setLightboxImg(null))
  const deleteA11yRef = useModalA11y(showDeleteConfirm, () => setShowDeleteConfirm(false))
  const [editandoPrioridad, setEditandoPrioridad] = useState(false)
  const [editandoEquipo, setEditandoEquipo] = useState(false)

  // Estado del formulario de edición completo de evento
  const [editEvento, setEditEvento] = useState({
    tipo: "NOTA", descripcion: "", duracion: "", fecha: "", hora: "", privado: false,
    realizadoPorNombres: [] as string[],
  })

  const [editandoResolucion, setEditandoResolucion] = useState(false)
  const [resolucionText, setResolucionText] = useState("")
  const [saving, setSaving] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Relaciones entre incidencias
  interface Relacion {
    id: string; tipo: string; creadoEn: string; creadoPor: string; direccion: "origen" | "destino"
    incidencia: { id: string; codigo: string; titulo: string; estado: string; prioridad: string }
  }
  const [relaciones, setRelaciones] = useState<Relacion[]>([])
  const [relacionTipo, setRelacionTipo] = useState<"DUPLICADA" | "RELACIONADA" | "CAUSA_RAIZ">("RELACIONADA")
  const [relacionQ, setRelacionQ] = useState("")
  const [relacionSugerencias, setRelacionSugerencias] = useState<{ id: string; codigo: string; titulo: string }[]>([])
  const [relacionSeleccionada, setRelacionSeleccionada] = useState<{ id: string; codigo: string; titulo: string } | null>(null)
  const [vinculando, setVinculando] = useState(false)

  useEffect(() => {
    const main = document.getElementById("main-content")
    if (!main) return
    const check = () => setScrolled(main.scrollTop > 60)
    main.addEventListener("scroll", check, { passive: true })
    return () => main.removeEventListener("scroll", check)
  }, [])

  const fetchInc = useCallback(async () => {
    const r = await fetch(`/api/incidencias/${id}`)
    if (r.ok) {
      const data = await r.json()
      setInc(data)
      setResolucionText(data.resolucion ?? "")
    } else {
      toastError("Incidencia no encontrada")
      router.push("/incidencias")
    }
    setLoading(false)
  }, [id, router, toastError])

  useEffect(() => { fetchInc() }, [fetchInc])

  useEffect(() => {
    fetch("/api/incidencias/respuestas-rapidas").then(r => r.ok ? r.json() : []).then(d => {
      if (Array.isArray(d)) setRespuestasRapidas(d)
    }).catch(() => {})
    fetch("/api/usuarios").then(r => r.ok ? r.json() : []).then(d => {
      if (Array.isArray(d)) setUsuarios(d)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    fetch(`/api/incidencias/${id}/relaciones`).then(r => r.ok ? r.json() : []).then(d => {
      if (Array.isArray(d)) setRelaciones(d)
    }).catch(() => {})
  }, [id])

  useEffect(() => {
    const q = relacionQ.trim()
    if (q.length < 2) { setRelacionSugerencias([]); return }
    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      fetch(`/api/incidencias?q=${encodeURIComponent(q)}&limit=5`, { signal: ctrl.signal })
        .then(r => r.ok ? r.json() : [])
        .then(d => {
          if (Array.isArray(d)) setRelacionSugerencias(d.map((i: { id: string; codigo: string; titulo: string }) => ({ id: i.id, codigo: i.codigo, titulo: i.titulo })))
        })
        .catch(() => {})
    }, 300)
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [relacionQ])

  async function agregarRelacion() {
    if (!relacionSeleccionada) return
    setVinculando(true)
    try {
      const r = await fetch(`/api/incidencias/${id}/relaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: relacionTipo, relacionadaId: relacionSeleccionada.id }),
      })
      if (r.ok) {
        const nueva = await r.json()
        setRelaciones(prev => [nueva, ...prev])
        setRelacionSeleccionada(null)
        setRelacionQ("")
        success("Incidencia vinculada")
      } else {
        const err = await r.json()
        toastError(err.error ?? "Error al vincular")
      }
    } catch { toastError("Error al vincular") }
    finally { setVinculando(false) }
  }

  async function eliminarRelacion(relacionId: string) {
    const r = await fetch(`/api/incidencias/${id}/relaciones?relacionId=${relacionId}`, { method: "DELETE" })
    if (r.ok) {
      setRelaciones(prev => prev.filter(rel => rel.id !== relacionId))
      success("Relación eliminada")
    } else {
      toastError("Error al eliminar relación")
    }
  }

  async function cambiarEstado(nuevoEstado: string) {
    setSaving(true)
    const body: Record<string, unknown> = { estado: nuevoEstado }
    if (nuevoEstado === "RESUELTA" && resolucionText.trim()) {
      body.resolucion = resolucionText.trim()
    }
    const r = await fetch(`/api/incidencias/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (r.ok) {
      success("Estado actualizado")
      fetchInc()
    } else {
      toastError("Error al actualizar")
    }
    setSaving(false)
  }

  async function guardarResolucion() {
    setSaving(true)
    const r = await fetch(`/api/incidencias/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolucion: resolucionText.trim() }),
    })
    if (r.ok) {
      success("Resolución guardada")
      setEditandoResolucion(false)
      fetchInc()
    } else {
      toastError("Error al guardar")
    }
    setSaving(false)
  }

  async function enviarEvento() {
    if (!eventoDesc.trim()) { toastError("Escribe una descripción"); return }
    setEnviandoEvento(true)
    const body: Record<string, unknown> = {
      tipo: eventoTipo,
      descripcion: eventoDesc.trim(),
      privado: eventoPrivado,
    }
    if (eventoDuracion) body.duracion = parseInt(eventoDuracion)
    // Siempre enviar fecha+hora exacta para registro retroactivo preciso
    const fechaHoraStr = `${eventoFecha}T${eventoHora}:00`
    body.fecha = new Date(fechaHoraStr).toISOString()
    if (eventoFotos.length > 0) body.fotos = eventoFotos
    if (realizadoPorNombres.length > 0) body.realizadoPorNombres = realizadoPorNombres

    const r = await fetch(`/api/incidencias/${id}/eventos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (r.ok) {
      const now = new Date()
      setEventoDesc("")
      setEventoDuracion("")
      setEventoTipo("NOTA")
      setEventoPrivado(false)
      setEventoFecha(now.toISOString().slice(0, 10))
      setEventoHora(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`)
      setEventoFotos([])
      setRealizadoPorNombres([])
      success("Evento registrado")
      fetchInc()
    } else {
      toastError("Error al registrar evento")
    }
    setEnviandoEvento(false)
  }

  async function eliminarIncidencia() {
    setDeleting(true)
    const r = await fetch(`/api/incidencias/${id}`, { method: "DELETE" })
    if (r.ok) {
      success("Incidencia eliminada")
      router.push("/incidencias")
    } else {
      const d = await r.json().catch(() => ({}))
      toastError(d.error ?? "Error al eliminar")
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  async function cambiarPrioridad(nuevaPrioridad: string) {
    setSaving(true)
    const r = await fetch(`/api/incidencias/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prioridad: nuevaPrioridad }),
    })
    if (r.ok) { success("Prioridad actualizada"); fetchInc() } else { toastError("Error al actualizar") }
    setSaving(false)
    setEditandoPrioridad(false)
  }

  async function cambiarEquipo(nuevoEquipo: string) {
    setSaving(true)
    const r = await fetch(`/api/incidencias/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipoResponsable: nuevoEquipo }),
    })
    if (r.ok) { success("Equipo actualizado"); fetchInc() } else { toastError("Error al actualizar") }
    setSaving(false)
    setEditandoEquipo(false)
  }

  async function handleFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    const max = 5 - eventoFotos.length
    const arr = Array.from(files).slice(0, max)
    for (const file of arr) {
      const compressed = await comprimirImagen(file)
      setEventoFotos(prev => [...prev, compressed])
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function iniciarEdicionEvento(ev: Evento) {
    const d = new Date(ev.creadoEn)
    setEditandoEventoId(ev.id)
    setEditEvento({
      tipo: ev.tipo,
      descripcion: ev.descripcion,
      duracion: ev.duracion != null ? String(ev.duracion) : "",
      fecha: d.toISOString().slice(0, 10),
      hora: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
      privado: ev.privado,
      realizadoPorNombres: Array.isArray(ev.realizadoPorNombres) ? ev.realizadoPorNombres : [],
    })
  }

  async function guardarEdicionEvento(eventoId: string) {
    if (!editEvento.descripcion.trim()) { toastError("La descripción es obligatoria"); return }
    const body: Record<string, unknown> = {
      tipo: editEvento.tipo,
      descripcion: editEvento.descripcion.trim(),
      privado: editEvento.privado,
      realizadoPorNombres: editEvento.realizadoPorNombres,
    }
    if (editEvento.duracion !== "") body.duracion = parseInt(editEvento.duracion) || 0
    if (editEvento.fecha && editEvento.hora) {
      body.fecha = new Date(`${editEvento.fecha}T${editEvento.hora}:00`).toISOString()
    }
    const r = await fetch(`/api/incidencias/${id}/eventos/${eventoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (r.ok) {
      setEditandoEventoId(null)
      success("Evento actualizado")
      fetchInc()
    } else {
      toastError("Error al actualizar")
    }
  }

  function exportarPDF() {
    if (!inc) return
    const est = getEstadoStyle(inc.estado)
    const pri = PRIORIDADES[inc.prioridad] ?? { label: inc.prioridad, color: "#6b7280" }
    const sla = slaInfo(inc)

    const tiempoTotal = inc.eventos.reduce((acc, ev) => acc + (ev.duracion ?? 0), 0)
    const fmtMinPdf = (min: number) => {
      if (!min || min <= 0) return "—"
      const h = Math.floor(min / 60); const m = min % 60
      if (h === 0) return `${m}min`; if (m === 0) return `${h}h`; return `${h}h ${m}min`
    }

    const eventosHTML = inc.eventos.map(ev => {
      const info = getEventoInfo(ev.tipo)
      const realizadoPor = Array.isArray(ev.realizadoPorNombres) && ev.realizadoPorNombres.length > 0
        ? ev.realizadoPorNombres.map(n => esc(n)).join(", ")
        : esc(ev.autor.nombre)
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b">${formatDate(ev.creadoEn)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9"><span style="font-size:11px;font-weight:600;color:${info.color};background:${info.color}15;padding:2px 8px;border-radius:10px">${esc(info.label)}</span></td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155">${esc(ev.descripcion)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b">${realizadoPor}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;font-weight:600;color:#0284c7;text-align:center">${fmtMinPdf(ev.duracion ?? 0)}</td>
      </tr>`
    }).join("")

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(inc.codigo)} — ${esc(inc.titulo)}</title>
    <style>@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:900px;margin:40px auto;color:#1e293b;padding:0 20px">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid ${TEAL};padding-bottom:16px;margin-bottom:24px">
        <div>
          <h1 style="margin:0;font-size:22px;color:#0f172a">${esc(inc.titulo)}</h1>
          <p style="margin:4px 0 0;font-size:13px;color:#64748b;font-family:monospace">${esc(inc.codigo)} · ${esc(inc.hospital.nombre)} · ${esc(inc.hospital.ciudad)}</p>
        </div>
        <div style="text-align:right">
          <span style="font-size:12px;font-weight:700;color:${est.color};background:${est.bg};padding:4px 12px;border-radius:12px">${est.label}</span>
          <span style="font-size:12px;font-weight:700;color:${pri.color};background:${pri.bg || '#f3f4f6'};padding:4px 12px;border-radius:12px;margin-left:6px">${pri.label}</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px">
        ${[
          ["Tipo", inc.tipo === "HARDWARE" ? "Hardware" : "Software"],
          ["Categoría", CATEGORIAS[inc.categoria] ?? inc.categoria],
          ["Equipo", EQUIPOS[inc.equipoResponsable]],
          ["Reportada por", esc(inc.reportadoPor.nombre)],
          ["Asignada a", esc([inc.asignadoA?.nombre, ...(Array.isArray(inc.coasignadosIds) ? inc.coasignadosIds.map(c => c.nombre) : [])].filter(Boolean).join(", ") || "Sin asignar")],
          ["Creada", formatDate(inc.creadoEn)],
          ["SLA", `${inc.slaHoras ?? 0}h — ${sla.label}`],
          ["Tiempo total dedicado", fmtMinPdf(tiempoTotal)],
          ...(inc.fechaResolucion ? [["Resuelta", formatDate(inc.fechaResolucion)]] : []),
          ...(inc.contacto ? [["Contacto", esc(inc.contacto.nombre) + (inc.contacto.cargo ? ` (${esc(inc.contacto.cargo)})` : "")]] : []),
          ...(inc.hardwareUnidad ? [["Hardware", `${esc(inc.hardwareUnidad.catalogo.marca)} ${esc(inc.hardwareUnidad.catalogo.modelo)}${inc.hardwareUnidad.numSerie ? ` — SN: ${esc(inc.hardwareUnidad.numSerie)}` : ""}`]] : []),
        ].map(([k, v]) => `<div style="background:${k === "Tiempo total dedicado" ? "#eff6ff" : "#f8fafc"};padding:10px 14px;border-radius:8px${k === "Tiempo total dedicado" ? ";border:1px solid #bfdbfe" : ""}"><span style="font-size:11px;text-transform:uppercase;color:${k === "Tiempo total dedicado" ? "#1d4ed8" : "#94a3b8"};font-weight:700">${k}</span><p style="margin:4px 0 0;font-size:13px;font-weight:${k === "Tiempo total dedicado" ? "700" : "500"};color:${k === "Tiempo total dedicado" ? "#1e40af" : "inherit"}">${v}</p></div>`).join("")}
      </div>
      <p style="font-size:14px;white-space:pre-wrap;color:#475569;margin-bottom:24px;line-height:1.6">${esc(inc.descripcion)}</p>
      ${inc.resolucion ? `<div style="background:#ecfdf5;border-left:3px solid #10b981;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:24px"><p style="font-size:11px;text-transform:uppercase;color:#059669;font-weight:700;margin:0 0 4px">Resolución</p><p style="font-size:13px;color:#065f46;margin:0;white-space:pre-wrap">${esc(inc.resolucion)}</p></div>` : ""}
      <h2 style="font-size:14px;text-transform:uppercase;color:#94a3b8;letter-spacing:1px;margin-bottom:12px">Historial de eventos (${inc.eventos.length})</h2>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <thead><tr style="background:#f8fafc">
          <th scope="col" style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;font-weight:700;border-bottom:2px solid #e2e8f0">Fecha</th>
          <th scope="col" style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;font-weight:700;border-bottom:2px solid #e2e8f0">Tipo</th>
          <th scope="col" style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;font-weight:700;border-bottom:2px solid #e2e8f0">Descripción</th>
          <th scope="col" style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;font-weight:700;border-bottom:2px solid #e2e8f0">Autor</th>
          <th scope="col" style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#64748b;font-weight:700;border-bottom:2px solid #e2e8f0">Duración</th>
        </tr></thead>
        <tbody>${eventosHTML}</tbody>
      </table>
      <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:32px">${inc.eventos.length} eventos · Tiempo total dedicado: <strong style="color:#1d4ed8">${fmtMinPdf(tiempoTotal)}</strong> · Informe generado el ${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} — Palex Medical</p>
    </body></html>`

    const w = window.open("", "_blank")
    if (w) { w.document.write(html); w.document.close(); w.print() }
  }

  if (loading) return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-5 w-24" /><Skeleton className="h-5 w-32" /><Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-7 w-80 mb-2" /><Skeleton className="h-4 w-full mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
  if (!inc) return null

  const est = getEstadoStyle(inc.estado)
  const pri = PRIORIDADES[inc.prioridad] ?? { label: inc.prioridad, color: "#6b7280", bg: "#f3f4f6" }
  const sla = slaInfo(inc)
  const isOpen = !["RESUELTA", "CERRADA"].includes(inc.estado)
  const eventGroups = groupEventsByDate(inc.eventos)

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">

      {/* Sticky mini-header — glassmorphism, aparece al hacer scroll */}
      <div className={`sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden transition-all duration-200 ${
        scrolled ? "max-h-14 border-b border-gray-200/60 dark:border-gray-800/60 shadow-sm" : "max-h-0"
      }`}>
        <div className="px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-2.5 backdrop-blur-md bg-white/90 dark:bg-[#0f172a]/92">
          <button onClick={() => router.push("/incidencias")}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shrink-0 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
            <IconArrowLeft size={14} />
          </button>
          <div className="h-3.5 w-px bg-gray-200 dark:bg-gray-700 shrink-0" />
          <span className="text-[11px] font-mono font-bold text-gray-400 shrink-0">{inc.codigo}</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white truncate flex-1">{inc.titulo}</span>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: est.bg, color: est.color }}>{est.label}</span>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 hidden sm:inline-flex" style={{ backgroundColor: pri.bg, color: pri.color }}>{pri.label}</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.push("/incidencias")} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors group">
          <IconArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden sm:inline">Incidencias</span>
        </button>
        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
        <span className="text-sm font-mono font-bold text-gray-400">{inc.codigo}</span>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: est.bg, color: est.color }}>{est.label}</span>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: pri.bg, color: pri.color }}>{pri.label}</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={exportarPDF} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" title="Exportar informe">
            <IconFileExport size={14} />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          {rol === "ADMIN" && (
            <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" title="Eliminar incidencia">
              <IconX size={14} />
              <span className="hidden sm:inline">Eliminar</span>
            </button>
          )}
        </div>
      </div>

      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{inc.titulo}</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap mb-6">{inc.descripcion}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info + Actions */}
        <div className="lg:col-span-1 space-y-4">
          {/* Details card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Detalles</h3>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Hospital</span>
              <Link href={`/hospitales/${inc.hospital.id}?from=incidencia&iid=${id}`} className="font-medium hover:underline" style={{ color: TEAL }}>{inc.hospital.nombre}</Link>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tipo</span>
              <span className="font-medium text-gray-900 dark:text-white">{inc.tipo === "HARDWARE" ? "Hardware" : "Software"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Categoría</span>
              <span className="font-medium text-gray-900 dark:text-white">{CATEGORIAS[inc.categoria] ?? inc.categoria}</span>
            </div>
            {/* Prioridad editable inline */}
            <div className="flex items-start justify-between text-sm gap-2">
              <span className="text-gray-500 shrink-0">Prioridad</span>
              {editandoPrioridad ? (
                <div className="flex flex-wrap gap-1 justify-end">
                  {Object.entries(PRIORIDADES).map(([k, p]) => (
                    <button key={k} onClick={() => cambiarPrioridad(k)} disabled={saving}
                      className="px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all disabled:opacity-50"
                      style={inc.prioridad === k
                        ? { backgroundColor: p.bg, color: p.color, borderColor: p.color }
                        : { borderColor: "#e5e7eb", color: "#9ca3af" }}>
                      {p.label}
                    </button>
                  ))}
                  <button onClick={() => setEditandoPrioridad(false)} className="text-[11px] text-gray-400 hover:text-gray-600 px-1">✕</button>
                </div>
              ) : (
                <button onClick={() => setEditandoPrioridad(true)} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: pri.bg, color: pri.color }}>{pri.label}</span>
                </button>
              )}
            </div>
            {/* Equipo editable inline */}
            <div className="flex items-start justify-between text-sm gap-2">
              <span className="text-gray-500 shrink-0">Equipo</span>
              {editandoEquipo ? (
                <div className="flex flex-wrap gap-1 justify-end">
                  {Object.entries(EQUIPOS).map(([k, label]) => {
                    const eq = [
                      { value: "SERVICIO_TECNICO", color: TEAL },
                      { value: "APLICACIONES", color: "#8b5cf6" },
                      { value: "COMERCIAL", color: ORANGE },
                      { value: "MARKETING", color: "#ec4899" },
                      { value: "PROYECTOS", color: "#3b82f6" },
                    ].find(e => e.value === k)
                    const color = eq?.color ?? "#6b7280"
                    return (
                      <button key={k} onClick={() => cambiarEquipo(k)} disabled={saving}
                        className="px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all disabled:opacity-50"
                        style={inc.equipoResponsable === k
                          ? { backgroundColor: `${color}15`, color, borderColor: color }
                          : { borderColor: "#e5e7eb", color: "#9ca3af" }}>
                        {label}
                      </button>
                    )
                  })}
                  <button onClick={() => setEditandoEquipo(false)} className="text-[11px] text-gray-400 hover:text-gray-600 px-1">✕</button>
                </div>
              ) : (
                <button onClick={() => setEditandoEquipo(true)} className="font-medium text-gray-900 dark:text-white hover:underline text-right">{EQUIPOS[inc.equipoResponsable]}</button>
              )}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Reportada por</span>
              <span className="font-medium text-gray-900 dark:text-white">{inc.reportadoPor.nombre}</span>
            </div>
            <div className="flex justify-between text-sm gap-3">
              <span className="text-gray-500 shrink-0">Asignada a</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {inc.asignadoA ? (
                  <>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${TEAL}12`, color: TEAL }}>{inc.asignadoA.nombre}</span>
                    {Array.isArray(inc.coasignadosIds) && inc.coasignadosIds.map(c => (
                      <span key={c.id} className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{c.nombre}</span>
                    ))}
                  </>
                ) : (
                  <span className="font-medium text-gray-400 italic">Sin asignar</span>
                )}
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Creada</span>
              <span className="text-gray-700 dark:text-gray-300">{formatDate(inc.creadoEn)}</span>
            </div>
            {inc.fechaResolucion && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Resuelta</span>
                <span className="text-gray-700 dark:text-gray-300">{formatDate(inc.fechaResolucion)}</span>
              </div>
            )}
            {(() => {
              const total = inc.eventos.reduce((acc, ev) => acc + (ev.duracion ?? 0), 0)
              if (total <= 0) return null
              const h = Math.floor(total / 60); const m = total % 60
              const label = h === 0 ? `${m}min` : m === 0 ? `${h}h` : `${h}h ${m}min`
              return (
                <div className="flex justify-between text-sm pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500 flex items-center gap-1.5"><IconClock size={13} /> Tiempo dedicado</span>
                  <span className="font-bold" style={{ color: "#1d4ed8" }}>{label}</span>
                </div>
              )
            })()}

            {/* Contact */}
            {inc.contacto && (
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contacto</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{inc.contacto.nombre}</p>
                {inc.contacto.cargo && <p className="text-xs text-gray-500 mt-0.5">{inc.contacto.cargo}</p>}
                <div className="flex items-center gap-3 mt-2">
                  {inc.contacto.email && (
                    <a href={`mailto:${inc.contacto.email}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                      <IconMail size={12} /> {inc.contacto.email}
                    </a>
                  )}
                  {inc.contacto.telefono && (
                    <a href={`tel:${inc.contacto.telefono}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                      <IconPhone size={12} /> {inc.contacto.telefono}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Hardware */}
            {inc.hardwareUnidad && (
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Hardware afectado</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${ORANGE}15` }}>
                    <IconWrench size={14} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {inc.hardwareUnidad.catalogo.marca} {inc.hardwareUnidad.catalogo.modelo}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {inc.hardwareUnidad.numSerie && `SN: ${inc.hardwareUnidad.numSerie}`}
                      {inc.hardwareUnidad.numSerie && inc.hardwareUnidad.catalogo.referenciaPalex && " · "}
                      {inc.hardwareUnidad.catalogo.referenciaPalex && `Ref: ${inc.hardwareUnidad.catalogo.referenciaPalex}`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SLA */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">SLA</h3>
              {sla.paused && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 animate-pulse">
                  PAUSADO
                </span>
              )}
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold" style={{ color: sla.color }}>{sla.label}</span>
              <span className="text-xs text-gray-400">{inc.slaHoras ?? 0}h objetivo</span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${sla.paused ? "opacity-50" : ""}`} style={{ width: `${Math.min(100, sla.pct)}%`, backgroundColor: sla.color }} />
            </div>
            {sla.paused && (
              <p className="text-[11px] text-purple-500 dark:text-purple-400 mt-2">
                El reloj SLA se detiene mientras la incidencia está pendiente de terceros
              </p>
            )}
          </div>

          {/* State actions */}
          {isOpen && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cambiar estado</h3>
              <div className="flex flex-wrap gap-2">
                {ESTADOS.filter(e => e.value !== inc.estado && e.value !== "CERRADA").map(e => (
                  <button key={e.value} onClick={() => cambiarEstado(e.value)} disabled={saving}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:shadow-sm disabled:opacity-50"
                    style={{ borderColor: e.color, color: e.color }}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resolution */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Resolución</h3>
              {!editandoResolucion && (
                <button onClick={() => setEditandoResolucion(true)} className="text-xs font-medium hover:underline" style={{ color: TEAL }}>
                  {inc.resolucion ? "Editar" : "Añadir"}
                </button>
              )}
            </div>
            {editandoResolucion ? (
              <div className="space-y-2">
                <textarea value={resolucionText} onChange={e => setResolucionText(e.target.value)}
                  rows={3} placeholder="Describe cómo se resolvió la incidencia..."
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditandoResolucion(false)} className="text-xs text-gray-500 px-3 py-1.5">Cancelar</button>
                  <button onClick={guardarResolucion} disabled={saving}
                    className="text-xs font-semibold px-4 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                    Guardar
                  </button>
                </div>
              </div>
            ) : inc.resolucion ? (
              <div className="rounded-xl p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
                <p className="text-sm text-emerald-800 dark:text-emerald-200 whitespace-pre-wrap">{inc.resolucion}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Sin resolución registrada</p>
            )}
          </div>

          {/* Close button */}
          {inc.estado === "RESUELTA" && (
            <button onClick={() => cambiarEstado("CERRADA")} disabled={saving}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#6b7280" }}>
              Cerrar incidencia
            </button>
          )}

          {/* Incidencias relacionadas */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Relacionadas</h3>

            {relaciones.length > 0 ? (
              <div className="space-y-2 mb-4">
                {relaciones.map(rel => {
                  const TIPO_LABEL: Record<string, { label: string; color: string }> = {
                    DUPLICADA:  { label: "Duplicada",  color: "#f59e0b" },
                    RELACIONADA:{ label: "Relacionada",color: "#6366f1" },
                    CAUSA_RAIZ: { label: "Causa raíz", color: "#ef4444" },
                  }
                  const tl = TIPO_LABEL[rel.tipo] ?? { label: rel.tipo, color: "#6b7280" }
                  const est = getEstadoStyle(rel.incidencia.estado)
                  return (
                    <div key={rel.id} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${tl.color}15`, color: tl.color }}>{tl.label}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: est.bg, color: est.color }}>{est.label}</span>
                        </div>
                        <Link href={`/incidencias/${rel.incidencia.id}`} className="text-xs font-semibold hover:underline text-gray-900 dark:text-white block truncate" style={{ color: TEAL }}>
                          {rel.incidencia.codigo} — {rel.incidencia.titulo}
                        </Link>
                        <p className="text-[10px] text-gray-400 mt-0.5">por {rel.creadoPor}</p>
                      </div>
                      <button onClick={() => eliminarRelacion(rel.id)} className="shrink-0 text-gray-300 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20" aria-label="Eliminar relación">
                        <IconX size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-4">Sin incidencias vinculadas</p>
            )}

            {/* Añadir relación */}
            <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="relative">
                <input
                  value={relacionSeleccionada ? `${relacionSeleccionada.codigo} — ${relacionSeleccionada.titulo}` : relacionQ}
                  onChange={e => { setRelacionSeleccionada(null); setRelacionQ(e.target.value) }}
                  placeholder="Buscar por código o título…"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-1"
                  style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
                />
                {relacionSugerencias.length > 0 && !relacionSeleccionada && (
                  <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                    {relacionSugerencias.filter(s => s.id !== id).map(s => (
                      <button key={s.id} onClick={() => { setRelacionSeleccionada(s); setRelacionSugerencias([]) }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors">
                        <span className="font-mono font-bold text-gray-500">{s.codigo}</span>
                        <span className="text-gray-700 dark:text-gray-200 ml-1.5 truncate">{s.titulo}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <select value={relacionTipo} onChange={e => setRelacionTipo(e.target.value as typeof relacionTipo)}
                  className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-2 text-xs bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1"
                  style={{ "--tw-ring-color": TEAL } as React.CSSProperties}>
                  <option value="RELACIONADA">Relacionada</option>
                  <option value="DUPLICADA">Duplicada</option>
                  <option value="CAUSA_RAIZ">Causa raíz</option>
                </select>
                <button onClick={agregarRelacion} disabled={vinculando || !relacionSeleccionada}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-40 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: TEAL }}>
                  {vinculando ? "…" : "Vincular"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Timeline + Event form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Add event */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Registrar evento</h3>
            <div className="space-y-3">
              {/* Event type grid with SVG icons */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {TIPOS_EVENTO.map(t => {
                  const Icon = t.icon
                  const active = eventoTipo === t.value
                  return (
                    <button key={t.value} onClick={() => setEventoTipo(t.value)}
                      className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[11px] font-medium border transition-all"
                      style={active
                        ? { borderColor: t.color, color: t.color, backgroundColor: `${t.color}10`, boxShadow: `0 0 0 1px ${t.color}30` }
                        : { borderColor: "transparent", color: "#9ca3af", backgroundColor: "transparent" }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={active ? { backgroundColor: `${t.color}18` } : { backgroundColor: "#f1f5f9" }}>
                        <Icon size={15} />
                      </div>
                      <span className="text-center leading-tight">{t.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Textarea + respuestas rápidas */}
              <div className="relative">
                <textarea value={eventoDesc} onChange={e => setEventoDesc(e.target.value)}
                  rows={2} placeholder="Describe lo ocurrido..."
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none pr-10" />
                {respuestasRapidas.length > 0 && (
                  <div className="absolute right-2 top-2">
                    <button onClick={() => setShowRespuestas(p => !p)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Respuestas rápidas">
                      <IconChevronDown size={14} />
                    </button>
                    {showRespuestas && (
                      <div className="absolute right-0 top-8 w-72 max-h-48 overflow-y-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg z-20">
                        {respuestasRapidas.map(rr => (
                          <button key={rr.id} onClick={() => { setEventoDesc(rr.texto); setShowRespuestas(false) }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors">
                            {rr.categoria && <span className="text-[10px] font-bold text-gray-400 uppercase">{rr.categoria} · </span>}
                            {rr.texto.length > 80 ? rr.texto.slice(0, 80) + "…" : rr.texto}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Fotos preview + upload */}
              {eventoFotos.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {eventoFotos.map((foto, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group">
                      <img src={foto} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setEventoFotos(prev => prev.filter((_, idx) => idx !== i))}
                        aria-label="Quitar foto"
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <IconX size={14} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Realizado por — multi-selección con pills */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 shrink-0">Realizado por</span>
                  <select value="" onChange={e => { if (e.target.value && !realizadoPorNombres.includes(e.target.value)) setRealizadoPorNombres(p => [...p, e.target.value]) }}
                    className="flex-1 px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-400">
                    <option value="">{realizadoPorNombres.length === 0 ? "— añadir persona..." : "Añadir otra persona..."}</option>
                    {usuarios.filter(u => !realizadoPorNombres.includes(u.nombre)).map(u => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}
                  </select>
                </div>
                {realizadoPorNombres.length > 0 && (
                  <div className="flex flex-wrap gap-1 pl-[88px]">
                    {realizadoPorNombres.map(nombre => (
                      <span key={nombre} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                        {nombre}
                        <button onClick={() => setRealizadoPorNombres(p => p.filter(n => n !== nombre))} aria-label={`Quitar a ${nombre}`} className="hover:text-red-500 transition-colors">
                          <IconX size={9} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Fecha + Hora */}
                <div className="flex items-center gap-1.5">
                  <IconClock size={14} className="text-gray-400" />
                  <input type="date" value={eventoFecha} onChange={e => setEventoFecha(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <input type="time" value={eventoHora} onChange={e => setEventoHora(e.target.value)}
                    className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400 w-20" />
                </div>

                {/* Duración */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">Tiempo</span>
                  <input type="number" value={eventoDuracion} onChange={e => setEventoDuracion(e.target.value)}
                    min="0" max="9999" placeholder="—"
                    className="w-16 px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <span className="text-xs text-gray-400">min</span>
                </div>

                {/* Fotos */}
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFotos} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={eventoFotos.length >= 5}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-40"
                  style={{ borderColor: "#e5e7eb", color: "#9ca3af" }}>
                  <IconCamera size={13} />
                  {eventoFotos.length > 0 ? `${eventoFotos.length}/5` : "Fotos"}
                </button>

                {/* Privado toggle */}
                <button onClick={() => setEventoPrivado(p => !p)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all"
                  style={eventoPrivado
                    ? { borderColor: ORANGE, color: ORANGE, backgroundColor: `${ORANGE}10` }
                    : { borderColor: "#e5e7eb", color: "#9ca3af" }}>
                  <IconEyeOff size={13} />
                  Privado
                </button>

                <button onClick={enviarEvento} disabled={enviandoEvento || !eventoDesc.trim()}
                  className="ml-auto px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: TEAL }}>
                  {enviandoEvento ? "Enviando..." : "Registrar"}
                </button>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Historial ({inc.eventos.length} eventos)
              </h3>
            </div>

            {inc.eventos.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                  <IconAlertTriangle size={20} className="text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-sm text-gray-400">Sin eventos registrados</p>
              </div>
            ) : (
              <div className="space-y-6">
                {eventGroups.map((group, gi) => {
                  const dayMinutes = group.events.reduce((sum, e) => sum + (e.duracion ?? 0), 0)
                  return (
                  <div key={gi}>
                    {/* Date group header */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{group.label}</span>
                      <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                      {dayMinutes > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                          <IconClock size={9} />
                          {dayMinutes >= 60 ? `${Math.floor(dayMinutes / 60)}h${dayMinutes % 60 > 0 ? ` ${dayMinutes % 60}m` : ""}` : `${dayMinutes}min`}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-300 dark:text-gray-600">{group.events.length}</span>
                    </div>

                    {/* Events in this group */}
                    <div className="relative ml-4">
                      {/* Vertical line */}
                      <div className="absolute left-[13px] top-3 bottom-3 w-[2px] bg-gradient-to-b from-gray-200 via-gray-200 to-transparent dark:from-gray-700 dark:via-gray-700" />

                      <div className="space-y-2">
                        {group.events.map((ev) => {
                          const info = getEventoInfo(ev.tipo)
                          const Icon = info.icon
                          const isAuto = ["CAMBIO_ESTADO", "CAMBIO_ASIGNACION"].includes(ev.tipo)
                          const canEdit = !isAuto && (ev.autor.id === perfil?.id || rol === "ADMIN")
                          const isEditing = editandoEventoId === ev.id
                          const fotos = Array.isArray(ev.fotos) ? ev.fotos as string[] : []

                          if (isAuto) return (
                            <div key={ev.id} className="relative pl-10 py-0.5 flex items-center gap-2">
                              <div className="absolute left-0 w-7 h-7 rounded-full flex items-center justify-center z-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                <span style={{ color: "#9ca3af" }}><Icon size={11} /></span>
                              </div>
                              <p className="text-xs text-gray-400 italic flex-1 leading-relaxed">{ev.descripcion}</p>
                              <span className="text-[10px] text-gray-300 dark:text-gray-600 shrink-0">{formatTime(ev.creadoEn)}</span>
                            </div>
                          )

                          return (
                            <div key={ev.id} className="relative pl-10 group/ev">
                              {/* Icon node */}
                              <div className="absolute left-0 top-2.5 w-7 h-7 rounded-lg flex items-center justify-center z-10 shadow-sm transition-transform group-hover/ev:scale-110"
                                style={{ backgroundColor: `${info.color}15`, border: `2px solid ${info.color}30` }}>
                                <span style={{ color: info.color }}><Icon size={13} /></span>
                              </div>

                              {/* Event card */}
                              <div className="rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 p-3.5 transition-all group-hover/ev:shadow-sm">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: `${info.color}12`, color: info.color }}>
                                    {info.label}
                                  </span>
                                  {ev.privado && (
                                    <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                      style={{ backgroundColor: `${ORANGE}15`, color: ORANGE }}>
                                      <IconEyeOff size={10} /> Privado
                                    </span>
                                  )}
                                  {ev.duracion != null && ev.duracion > 0 && (
                                    <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                      <IconClock size={9} />
                                      {ev.duracion >= 60
                                        ? `${Math.floor(ev.duracion / 60)}h${ev.duracion % 60 > 0 ? ` ${ev.duracion % 60}min` : ""}`
                                        : `${ev.duracion} min`}
                                    </span>
                                  )}
                                  {ev.editadoEn && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800" title={`Editado por ${ev.editadoPor} el ${formatDate(ev.editadoEn)}`}>
                                      <IconEdit size={8} /> editado
                                    </span>
                                  )}
                                  <span className="text-[11px] text-gray-400 ml-auto">{formatTime(ev.creadoEn)}</span>
                                  {canEdit && !isEditing && (
                                    <button onClick={() => iniciarEdicionEvento(ev)}
                                      className="opacity-0 group-hover/ev:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                      title="Editar evento">
                                      <IconEdit size={12} className="text-gray-400" />
                                    </button>
                                  )}
                                </div>

                                {isEditing ? (
                                  /* Formulario de edición completo */
                                  <div className="space-y-3 pt-1">
                                    {/* Tipo */}
                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                                      {TIPOS_EVENTO.map(t => {
                                        const TIcon = t.icon
                                        const active = editEvento.tipo === t.value
                                        return (
                                          <button key={t.value} onClick={() => setEditEvento(p => ({ ...p, tipo: t.value }))}
                                            className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all"
                                            style={active
                                              ? { borderColor: t.color, color: t.color, backgroundColor: `${t.color}10` }
                                              : { borderColor: "transparent", color: "#9ca3af" }}>
                                            <div className="w-5 h-5 rounded flex items-center justify-center"
                                              style={active ? { backgroundColor: `${t.color}18` } : { backgroundColor: "#f1f5f9" }}>
                                              <TIcon size={11} />
                                            </div>
                                            <span className="text-center leading-tight">{t.label}</span>
                                          </button>
                                        )
                                      })}
                                    </div>
                                    {/* Descripción */}
                                    <textarea value={editEvento.descripcion} onChange={e => setEditEvento(p => ({ ...p, descripcion: e.target.value }))}
                                      rows={2} placeholder="Descripción..."
                                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
                                    {/* Realizado por (multi) */}
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-gray-400 shrink-0">Realizado por</span>
                                        <select value="" onChange={e => { if (e.target.value && !editEvento.realizadoPorNombres.includes(e.target.value)) setEditEvento(p => ({ ...p, realizadoPorNombres: [...p.realizadoPorNombres, e.target.value] })) }}
                                          className="flex-1 px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-[11px] bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400">
                                          <option value="">Añadir persona...</option>
                                          {usuarios.filter(u => !editEvento.realizadoPorNombres.includes(u.nombre)).map(u => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}
                                        </select>
                                      </div>
                                      {editEvento.realizadoPorNombres.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {editEvento.realizadoPorNombres.map(n => (
                                            <span key={n} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                                              {n}
                                              <button onClick={() => setEditEvento(p => ({ ...p, realizadoPorNombres: p.realizadoPorNombres.filter(x => x !== n) }))} aria-label={`Quitar a ${n}`} className="hover:text-red-500"><IconX size={9} /></button>
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    {/* Fecha + Hora + Duración + Privado */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <div className="flex items-center gap-1">
                                        <IconClock size={12} className="text-gray-400" />
                                        <input type="date" value={editEvento.fecha} onChange={e => setEditEvento(p => ({ ...p, fecha: e.target.value }))}
                                          className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-[11px] bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400" />
                                        <input type="time" value={editEvento.hora} onChange={e => setEditEvento(p => ({ ...p, hora: e.target.value }))}
                                          className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-[11px] bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400 w-[72px]" />
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <input type="number" value={editEvento.duracion} onChange={e => setEditEvento(p => ({ ...p, duracion: e.target.value }))}
                                          min="0" max="9999" placeholder="—"
                                          className="w-14 px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-[11px] bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400" />
                                        <span className="text-[11px] text-gray-400">min</span>
                                      </div>
                                      <button onClick={() => setEditEvento(p => ({ ...p, privado: !p.privado }))}
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border transition-all"
                                        style={editEvento.privado
                                          ? { borderColor: ORANGE, color: ORANGE, backgroundColor: `${ORANGE}10` }
                                          : { borderColor: "#e5e7eb", color: "#9ca3af" }}>
                                        <IconEyeOff size={11} /> Privado
                                      </button>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <button onClick={() => setEditandoEventoId(null)} className="text-xs text-gray-500 px-3 py-1.5">Cancelar</button>
                                      <button onClick={() => guardarEdicionEvento(ev.id)}
                                        className="text-xs font-semibold px-4 py-1.5 rounded-lg text-white" style={{ backgroundColor: TEAL }}>
                                        Guardar cambios
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className={`text-sm whitespace-pre-wrap ${isAuto ? "text-gray-500 dark:text-gray-400 italic" : "text-gray-800 dark:text-gray-200"}`}>
                                    {ev.descripcion}
                                  </p>
                                )}
                                {!isEditing && fotos.length > 0 && (
                                  <div className="flex gap-2 mt-2 flex-wrap">
                                    {fotos.map((foto, fi) => (
                                      <button key={fi} onClick={() => setLightboxImg(foto)} className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:ring-2 hover:ring-teal-400 transition-all">
                                        <img src={foto} alt="" className="w-full h-full object-cover" />
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {!isEditing && (
                                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <p className="text-[11px] text-gray-400">Registrado por {ev.autor.nombre}</p>
                                    {Array.isArray(ev.realizadoPorNombres) && ev.realizadoPorNombres.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {ev.realizadoPorNombres.map(n => (
                                          <span key={n} className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400">
                                            {n}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div ref={lightboxA11yRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Vista ampliada de foto"
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 outline-none" onClick={() => setLightboxImg(null)}>
          <button onClick={() => setLightboxImg(null)} aria-label="Cerrar" className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
            <IconX size={24} />
          </button>
          <img src={lightboxImg} alt="" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowDeleteConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div ref={deleteA11yRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="delete-inc-titulo"
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 outline-none" onClick={e => e.stopPropagation()}>
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center bg-red-100 dark:bg-red-950/40">
                <IconAlertTriangle size={22} className="text-red-500" />
              </div>
              <h2 id="delete-inc-titulo" className="text-base font-bold text-gray-900 dark:text-white text-center mb-1">¿Eliminar incidencia?</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-1">
                <span className="font-mono font-semibold">{inc.codigo}</span> — {inc.titulo}
              </p>
              <p className="text-xs text-gray-400 text-center mb-6">Esta acción es irreversible y eliminará todos sus eventos.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Cancelar
                </button>
                <button onClick={eliminarIncidencia} disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors">
                  {deleting ? "Eliminando..." : "Sí, eliminar"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
