"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { TEAL, TEAL_LIGHT, ORANGE } from "@/lib/brand"
import { PageHeader } from "@/components/ui/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton"
import { useToast } from "@/components/Toast"
import { usePerfil } from "@/hooks/usePerfil"
import {
  IconSearch, IconPlus, IconX, IconChevronDown, IconFileExport,
  IconAlertTriangle, IconClock, IconArrowRight, IconWrench,
} from "@/components/ui/Icons"

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

interface Incidencia {
  id: string; codigo: string; titulo: string
  tipo: "HARDWARE" | "SOFTWARE"; categoria: string
  prioridad: "BAJA" | "MEDIA" | "ALTA" | "CRITICA"
  estado: string; equipoResponsable: string
  slaHoras: number | null
  creadoEn: string; actualizadoEn: string
  fechaResolucion: string | null; fechaCierre: string | null
  hospital: { id: string; nombre: string; ciudad: string }
  contacto: { id: string; nombre: string; cargo: string | null } | null
  reportadoPor: { id: string; nombre: string }
  asignadoA: { id: string; nombre: string } | null
  hardwareUnidad: { id: string; numSerie: string | null; catalogo: { marca: string; modelo: string } } | null
  _count: { eventos: number }
  tiempoTotalMinutos: number
}

interface IncidenciaDetalle extends Incidencia {
  descripcion: string; resolucion: string | null
  coasignadosIds: { id: string; nombre: string }[] | null
  slaPausadoEn: string | null; slaPausadoMs: number
  eventos: {
    id: string; tipo: string; descripcion: string; duracion: number | null
    privado: boolean; creadoEn: string; realizadoPorNombres: string[] | null
    autor: { id: string; nombre: string }
  }[]
}

interface Hospital { id: string; nombre: string; ciudad: string }
interface Usuario { id: string; nombre: string }

const ESTADOS = [
  { value: "ABIERTA", label: "Abierta", color: "#ef4444", bg: "#fef2f2" },
  { value: "EN_PROGRESO", label: "En progreso", color: "#f59e0b", bg: "#fffbeb" },
  { value: "PENDIENTE_CLIENTE", label: "Pend. cliente", color: "#8b5cf6", bg: "#f5f3ff" },
  { value: "PENDIENTE_PROVEEDOR", label: "Pend. proveedor", color: "#6366f1", bg: "#eef2ff" },
  { value: "RESUELTA", label: "Resuelta", color: "#10b981", bg: "#ecfdf5" },
  { value: "CERRADA", label: "Cerrada", color: "#6b7280", bg: "#f3f4f6" },
]

const PRIORIDADES = [
  { value: "CRITICA", label: "Crítica", color: "#dc2626", bg: "#fef2f2" },
  { value: "ALTA", label: "Alta", color: "#f97316", bg: "#fff7ed" },
  { value: "MEDIA", label: "Media", color: "#f59e0b", bg: "#fffbeb" },
  { value: "BAJA", label: "Baja", color: TEAL, bg: TEAL_LIGHT },
]

const CATEGORIAS: Record<string, string> = {
  BC_ROBO: "BC Robo", ZEBRA_MC: "Zebra MC", ZEBRA_IMPRESORA: "Zebra Impresora",
  READER_RFID: "Reader RFID", GATEWAY_BT: "Gateway BT", MINI_PC: "Mini-PC",
  NEVERA: "Nevera", PANTALLA: "Pantalla", TOTEM: "Tótem", INLAB: "InLab", OTRO: "Otro",
}

const EQUIPOS = [
  { value: "SERVICIO_TECNICO", label: "Servicio Técnico", color: TEAL },
  { value: "APLICACIONES", label: "Aplicaciones", color: "#8b5cf6" },
  { value: "COMERCIAL", label: "Comercial", color: ORANGE },
  { value: "MARKETING", label: "Marketing", color: "#ec4899" },
  { value: "PROYECTOS", label: "Proyectos", color: "#3b82f6" },
] as const

const EQUIPOS_MAP: Record<string, string> = {
  SERVICIO_TECNICO: "Servicio Técnico", APLICACIONES: "Aplicaciones",
  COMERCIAL: "Comercial", MARKETING: "Marketing", PROYECTOS: "Proyectos",
}

const TIPO_EVENTO_LABEL: Record<string, string> = {
  NOTA: "Nota", LLAMADA_ENTRANTE: "Llamada ent.", LLAMADA_SALIENTE: "Llamada sal.",
  EMAIL_ENVIADO: "Email env.", EMAIL_RECIBIDO: "Email rec.", CAMBIO_ESTADO: "Cambio estado",
  CAMBIO_ASIGNACION: "Reasignación", ESCALADO: "Escalado", RESPUESTA_TECNICA: "Resp. técnica",
  RESPUESTA_APLICACIONES: "Resp. aplic.", COMUNICACION_CLIENTE: "Com. cliente",
  SOPORTE_REMOTO: "Soporte remoto", REUNION_INTERNA: "Reunión int.", REUNION_CLIENTE: "Reunión cli.",
}

function getEstadoStyle(estado: string) {
  return ESTADOS.find(e => e.value === estado) ?? { label: estado, color: "#6b7280", bg: "#f3f4f6" }
}

function getPrioridadStyle(prioridad: string) {
  return PRIORIDADES.find(p => p.value === prioridad) ?? { label: prioridad, color: "#6b7280", bg: "#f3f4f6" }
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return "Ahora"
  if (min < 60) return `Hace ${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Hace ${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return "Ayer"
  if (d < 7) return `Hace ${d} días`
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
}

function slaDetail(creadoEn: string, slaHoras: number | null, estado: string, now: number) {
  if (["RESUELTA", "CERRADA"].includes(estado)) {
    return { label: "Cumplido", color: "#10b981", pct: 0, remaining: null }
  }
  if (!slaHoras) return { label: "Sin SLA", color: "#9ca3af", pct: 0, remaining: null }
  const elapsedH = (now - new Date(creadoEn).getTime()) / 3600000
  const pct = elapsedH / slaHoras
  const remainingH = slaHoras - elapsedH
  const absMs = Math.abs(remainingH) * 3600000
  const h = Math.floor(absMs / 3600000)
  const m = Math.floor((absMs % 3600000) / 60000)
  const timeStr = h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m}min`
  if (pct > 1) return { label: "Vencido", color: "#ef4444", pct: 1, remaining: `Vencida hace ${timeStr}` }
  if (pct > 0.75) return { label: "En riesgo", color: "#f59e0b", pct, remaining: `${timeStr} restantes` }
  return { label: "En plazo", color: "#10b981", pct, remaining: `${timeStr} restantes` }
}

function fmtMin(min: number): string {
  if (!min || min <= 0) return "—"
  const h = Math.floor(min / 60); const m = min % 60
  if (h === 0) return `${m}min`; if (m === 0) return `${h}h`; return `${h}h ${m}min`
}

export default function IncidenciasPage() {
  const { success, error: toastError } = useToast()
  const { rol } = usePerfil()

  const [items, setItems] = useState<Incidencia[]>([])
  const [loading, setLoading] = useState(true)
  const [totales, setTotales] = useState({ abiertas: 0, enProgreso: 0, pendientes: 0, resueltas: 0, total: 0, criticasAbiertas: 0 })
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroPrioridad, setFiltroPrioridad] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("")
  const [filtroEquipo, setFiltroEquipo] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [vistaTabla, setVistaTabla] = useState(false)

  // Filtros guardados
  const [filtrosGuardados, setFiltrosGuardados] = useState<{ id: string; nombre: string; filtros: Record<string, string> }[]>([])
  const [showFiltrosDropdown, setShowFiltrosDropdown] = useState(false)
  const [showGuardarFiltro, setShowGuardarFiltro] = useState(false)
  const [nombreNuevoFiltro, setNombreNuevoFiltro] = useState("")
  const [guardandoFiltro, setGuardandoFiltro] = useState(false)
  const filtrosDropdownRef = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(() => Date.now())

  // Drawer
  const [drawerIncId, setDrawerIncId] = useState<string | null>(null)
  const [drawerInc, setDrawerInc] = useState<IncidenciaDetalle | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)

  // Inline dropdowns (estado, prioridad, asignado)
  const [inlineDropdown, setInlineDropdown] = useState<{ id: string; field: "estado" | "prioridad" | "asignado" } | null>(null)

  // Grouped view
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const toggleGroup = (key: string) => setCollapsedGroups(prev => {
    const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next
  })

  // Sort
  const [sortBy, setSortBy] = useState<"fecha" | "sla" | "hospital" | "titulo">("fecha")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  // Create modal
  const [showModal, setShowModal] = useState(false)
  const [hospitales, setHospitales] = useState<Hospital[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [form, setForm] = useState({
    titulo: "", descripcion: "", tipo: "HARDWARE" as "HARDWARE" | "SOFTWARE",
    categoria: "BC_ROBO", prioridad: "MEDIA", equipoResponsable: "SERVICIO_TECNICO",
    hospitalId: "", contactoId: "", slaHoras: "48", hardwareUnidadId: "",
  })
  const [asignadosIds, setAsignadosIds] = useState<string[]>([])
  const [hospitalSearch, setHospitalSearch] = useState("")
  const [hospitalSearchOpen, setHospitalSearchOpen] = useState(false)
  const hospitalSearchRef = useRef<HTMLDivElement>(null)
  const [contactos, setContactos] = useState<{ id: string; nombre: string; cargo: string | null }[]>([])
  const [hwUnidades, setHwUnidades] = useState<{ id: string; numSerie: string | null; catalogo: { marca: string; modelo: string } }[]>([])
  const [creando, setCreando] = useState(false)

  // Export modal
  const [showExport, setShowExport] = useState(false)
  const [exportDesde, setExportDesde] = useState("")
  const [exportHasta, setExportHasta] = useState("")
  const [exportHospitalId, setExportHospitalId] = useState("")
  const [exportEstado, setExportEstado] = useState("")

  // SLA ticker — update every 60s
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])

  // Ref to always access current sortedItems in keyboard handler without stale closure
  const sortedItemsRef = useRef<Incidencia[]>([])

  // Click-outside closes inline dropdowns
  useEffect(() => {
    if (!inlineDropdown) return
    const close = () => setInlineDropdown(null)
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [!!inlineDropdown])

  // Hospital combobox click-outside
  useEffect(() => {
    if (!hospitalSearchOpen) return
    const handler = (e: MouseEvent) => {
      if (hospitalSearchRef.current && !hospitalSearchRef.current.contains(e.target as Node)) {
        setHospitalSearchOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [hospitalSearchOpen])

  // Fetch drawer detail
  useEffect(() => {
    if (!drawerIncId) { setDrawerInc(null); return }
    setDrawerLoading(true)
    fetch(`/api/incidencias/${drawerIncId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setDrawerInc(d); setDrawerLoading(false) })
      .catch(() => setDrawerLoading(false))
  }, [drawerIncId])

  const fetchTotales = useCallback(async () => {
    const r = await fetch("/api/incidencias?limit=500")
    if (r.ok) {
      const data: Incidencia[] = await r.json()
      if (Array.isArray(data)) {
        setTotales({
          abiertas: data.filter(i => i.estado === "ABIERTA").length,
          enProgreso: data.filter(i => i.estado === "EN_PROGRESO").length,
          pendientes: data.filter(i => i.estado.startsWith("PENDIENTE")).length,
          resueltas: data.filter(i => ["RESUELTA", "CERRADA"].includes(i.estado)).length,
          total: data.length,
          criticasAbiertas: data.filter(i => i.prioridad === "CRITICA" && !["RESUELTA", "CERRADA"].includes(i.estado)).length,
        })
      }
    }
  }, [])

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams()
    if (filtroEstado) params.set("estado", filtroEstado)
    if (filtroPrioridad) params.set("prioridad", filtroPrioridad)
    if (filtroTipo) params.set("tipo", filtroTipo)
    if (filtroEquipo) params.set("equipo", filtroEquipo)
    if (busqueda.trim()) params.set("q", busqueda.trim())
    const r = await fetch(`/api/incidencias?${params}`)
    if (r.ok) {
      const data = await r.json()
      setItems(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }, [filtroEstado, filtroPrioridad, filtroTipo, filtroEquipo, busqueda])

  useEffect(() => { fetchTotales() }, [fetchTotales])
  useEffect(() => { fetchItems() }, [fetchItems])

  const cargarFiltrosGuardados = useCallback(() => {
    fetch("/api/filtros-guardados?entidad=incidencias")
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setFiltrosGuardados(d) })
      .catch(() => {})
  }, [])

  useEffect(() => { cargarFiltrosGuardados() }, [cargarFiltrosGuardados])

  useEffect(() => {
    if (!showFiltrosDropdown) return
    const handler = (e: MouseEvent) => {
      if (filtrosDropdownRef.current && !filtrosDropdownRef.current.contains(e.target as Node)) {
        setShowFiltrosDropdown(false); setShowGuardarFiltro(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showFiltrosDropdown])

  function aplicarFiltroGuardado(f: { filtros: Record<string, string> }) {
    setFiltroEstado(f.filtros.estado ?? "")
    setFiltroPrioridad(f.filtros.prioridad ?? "")
    setFiltroTipo(f.filtros.tipo ?? "")
    setFiltroEquipo(f.filtros.equipo ?? "")
    setShowFiltrosDropdown(false)
  }

  async function guardarFiltroActual() {
    if (!nombreNuevoFiltro.trim()) return
    setGuardandoFiltro(true)
    try {
      const filtrosActuales: Record<string, string> = {}
      if (filtroEstado) filtrosActuales.estado = filtroEstado
      if (filtroPrioridad) filtrosActuales.prioridad = filtroPrioridad
      if (filtroTipo) filtrosActuales.tipo = filtroTipo
      if (filtroEquipo) filtrosActuales.equipo = filtroEquipo
      const r = await fetch("/api/filtros-guardados", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entidad: "incidencias", nombre: nombreNuevoFiltro.trim(), filtros: filtrosActuales }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? "Error") }
      success("Filtro guardado")
      setNombreNuevoFiltro(""); setShowGuardarFiltro(false)
      cargarFiltrosGuardados()
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : "Error al guardar el filtro")
    } finally {
      setGuardandoFiltro(false)
    }
  }

  async function borrarFiltroGuardado(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await fetch(`/api/filtros-guardados/${id}`, { method: "DELETE" })
      setFiltrosGuardados(prev => prev.filter(f => f.id !== id))
    } catch { toastError("Error al borrar") }
  }

  // Keyboard shortcuts: N=nueva, R=refresh, ↑↓=navegar drawer, Esc=cerrar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(tag) || (e.target as HTMLElement).isContentEditable
      if (e.key === "Escape") {
        if (inlineDropdown) { setInlineDropdown(null); return }
        if (showModal) { setShowModal(false); return }
        if (showExport) { setShowExport(false); return }
        if (drawerIncId) { setDrawerIncId(null); return }
        return
      }
      if (isTyping) return
      if (e.key === "n" || e.key === "N") {
        if (!showModal && !drawerIncId) { setShowModal(true); e.preventDefault() }
        return
      }
      if (e.key === "r" || e.key === "R") {
        fetchItems(); fetchTotales(); e.preventDefault()
        return
      }
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && drawerIncId) {
        const list = sortedItemsRef.current
        const idx = list.findIndex(i => i.id === drawerIncId)
        if (e.key === "ArrowDown" && idx < list.length - 1) setDrawerIncId(list[idx + 1].id)
        if (e.key === "ArrowUp" && idx > 0) setDrawerIncId(list[idx - 1].id)
        e.preventDefault()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [inlineDropdown, drawerIncId, showModal, showExport, fetchItems, fetchTotales])

  // Fetch users eagerly — needed for quick-assign in list
  useEffect(() => {
    fetch("/api/usuarios").then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setUsuarios(d) })
  }, [])

  useEffect(() => {
    if (!showModal) return
    fetch("/api/hospitales?limit=500").then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setHospitales(d) })
  }, [showModal])

  useEffect(() => {
    if (!form.hospitalId) { setContactos([]); setHwUnidades([]); return }
    fetch(`/api/hospitales/${form.hospitalId}/contactos`).then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setContactos(d) })
    fetch(`/api/hardware/unidades?hospitalId=${form.hospitalId}`).then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setHwUnidades(d) })
  }, [form.hospitalId])

  async function patchInline(id: string, data: { estado?: string; prioridad?: string; asignadoAId?: string | null }) {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i
      const p = { ...i } as Incidencia
      if (data.estado) p.estado = data.estado
      if (data.prioridad) p.prioridad = data.prioridad as Incidencia["prioridad"]
      if ("asignadoAId" in data) {
        const u = data.asignadoAId ? usuarios.find(u => u.id === data.asignadoAId) ?? null : null
        p.asignadoA = u ? { id: u.id, nombre: u.nombre } : null
      }
      return p
    }))
    if (drawerInc?.id === id) setDrawerInc(prev => prev ? { ...prev, ...data } as IncidenciaDetalle : null)
    setInlineDropdown(null)
    const r = await fetch(`/api/incidencias/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!r.ok) {
      toastError("Error al actualizar")
      fetchItems()
    } else {
      fetchTotales()
    }
  }

  async function crear() {
    if (!form.titulo.trim() || !form.hospitalId || !form.descripcion.trim()) {
      toastError("Completa los campos obligatorios"); return
    }
    setCreando(true)
    try {
      const body: Record<string, unknown> = {
        titulo: form.titulo.trim(), descripcion: form.descripcion.trim(),
        tipo: form.tipo, categoria: form.categoria, prioridad: form.prioridad,
        equipoResponsable: form.equipoResponsable, hospitalId: form.hospitalId,
        slaHoras: parseInt(form.slaHoras) || 48,
      }
      if (form.contactoId) body.contactoId = form.contactoId
      if (form.hardwareUnidadId) body.hardwareUnidadId = form.hardwareUnidadId
      if (asignadosIds.length > 0) {
        body.asignadoAId = asignadosIds[0]
        if (asignadosIds.length > 1) body.coasignadosIds = asignadosIds.slice(1)
      }
      const r = await fetch("/api/incidencias", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? "Error") }
      const creada = await r.json()
      setShowModal(false)
      setForm({ titulo: "", descripcion: "", tipo: "HARDWARE", categoria: "BC_ROBO", prioridad: "MEDIA", equipoResponsable: "SERVICIO_TECNICO", hospitalId: "", contactoId: "", slaHoras: "48", hardwareUnidadId: "" })
      setAsignadosIds([]); setHospitalSearch("")
      if (creada?.recurrencia) {
        success(`Incidencia creada — posible recurrencia de ${creada.recurrencia.codigo}, vinculada automáticamente`)
      } else {
        success("Incidencia creada correctamente")
      }
      fetchItems(); fetchTotales()
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : "Error al crear")
    } finally { setCreando(false) }
  }

  function exportarInforme() {
    const params = new URLSearchParams()
    if (exportEstado) params.set("estado", exportEstado)
    if (exportHospitalId) params.set("hospitalId", exportHospitalId)
    if (exportDesde) params.set("desde", exportDesde)
    if (exportHasta) params.set("hasta", exportHasta)
    fetch(`/api/incidencias?${params}&limit=500`).then(r => r.ok ? r.json() : []).then((data: Incidencia[]) => {
      if (!Array.isArray(data) || data.length === 0) { toastError("No hay incidencias con esos filtros"); return }
      const hospitalName = esc(exportHospitalId ? hospitales.find(h => h.id === exportHospitalId)?.nombre ?? "" : "Todos")
      const rangoStr = [exportDesde, exportHasta].filter(Boolean).join(" — ") || "Todas las fechas"
      const kpiAbiertas = data.filter(i => i.estado === "ABIERTA").length
      const kpiProgreso = data.filter(i => i.estado === "EN_PROGRESO").length
      const kpiPendientes = data.filter(i => i.estado.startsWith("PENDIENTE")).length
      const kpiResueltas = data.filter(i => ["RESUELTA", "CERRADA"].includes(i.estado)).length
      const kpiHW = data.filter(i => i.tipo === "HARDWARE").length
      const kpiSW = data.filter(i => i.tipo === "SOFTWARE").length
      const kpiTiempoTotal = data.reduce((acc, i) => acc + (i.tiempoTotalMinutos ?? 0), 0)
      const slaLbl = (i: Incidencia) => slaDetail(i.creadoEn, i.slaHoras, i.estado, Date.now()).label
      const rows = data.map(i => {
        const est = getEstadoStyle(i.estado); const sla = slaLbl(i); const tiempo = fmtMin(i.tiempoTotalMinutos ?? 0)
        return `<tr>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;font-family:monospace;color:#64748b">${esc(i.codigo)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px">${esc(i.titulo)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px">${esc(i.hospital.nombre)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9"><span style="font-size:11px;font-weight:600;color:${est.color};background:${est.bg};padding:2px 8px;border-radius:10px">${est.label}</span></td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px">${i.tipo === "HARDWARE" ? "HW" : "SW"} · ${esc(CATEGORIAS[i.categoria] ?? i.categoria)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px">${esc(EQUIPOS_MAP[i.equipoResponsable] ?? i.equipoResponsable)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:center;font-weight:600">${esc(sla)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#64748b">${new Date(i.creadoEn).toLocaleDateString("es-ES")}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px">${esc(i.asignadoA?.nombre ?? "—")}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;font-weight:600;color:#0284c7;text-align:right">${esc(tiempo)}</td>
        </tr>`
      }).join("")
      const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Informe Incidencias — Palex</title>
      <style>@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:15mm}}</style></head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:1200px;margin:30px auto;color:#1e293b;padding:0 20px">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid ${TEAL};padding-bottom:14px;margin-bottom:20px">
          <div><h1 style="margin:0;font-size:20px;color:#0f172a">Informe de Incidencias</h1>
          <p style="margin:4px 0 0;font-size:12px;color:#64748b">Hospital: ${hospitalName} · Periodo: ${rangoStr}</p></div>
          <div style="text-align:right">
            <p style="margin:0;font-size:11px;color:#94a3b8">Generado: ${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</p>
            <p style="margin:2px 0 0;font-size:13px;font-weight:700;color:${TEAL}">Palex Medical</p>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:10px;margin-bottom:24px">
          ${[
            { l: "Total", v: data.length, c: "#0f172a" },
            { l: "Abiertas", v: kpiAbiertas, c: "#ef4444" },
            { l: "En progreso", v: kpiProgreso, c: "#f59e0b" },
            { l: "Pendientes", v: kpiPendientes, c: "#8b5cf6" },
            { l: "Resueltas", v: kpiResueltas, c: "#10b981" },
            { l: "HW / SW", v: kpiHW + " / " + kpiSW, c: "#3b82f6" },
            { l: "Tiempo total", v: fmtMin(kpiTiempoTotal), c: "#0284c7" },
          ].map(k => `<div style="background:#f8fafc;padding:10px 12px;border-radius:8px;text-align:center"><p style="margin:0;font-size:10px;text-transform:uppercase;color:#94a3b8;font-weight:700">${k.l}</p><p style="margin:4px 0 0;font-size:18px;font-weight:800;color:${k.c}">${k.v}</p></div>`).join("")}
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
          <thead><tr style="background:#f8fafc">
            ${["Código","Título","Hospital","Estado","Tipo","Equipo","SLA","Fecha","Asignado","Tiempo"].map(h => `<th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;border-bottom:2px solid #e2e8f0">${h}</th>`).join("")}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="text-align:center;font-size:10px;color:#94a3b8;margin-top:32px">${data.length} incidencias · Tiempo total dedicado: ${fmtMin(kpiTiempoTotal)} · Informe generado automáticamente — Palex Medical</p>
      </body></html>`
      const w = window.open("", "_blank")
      if (w) { w.document.write(html); w.document.close(); w.print() }
      setShowExport(false)
    })
  }

  function toggleSort(field: "fecha" | "sla" | "hospital" | "titulo") {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortBy(field); setSortDir(field === "fecha" ? "desc" : "asc") }
  }

  const sortedItems = [...items].sort((a, b) => {
    let cmp = 0
    if (sortBy === "fecha") cmp = new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime()
    else if (sortBy === "hospital") cmp = a.hospital.nombre.localeCompare(b.hospital.nombre, "es")
    else if (sortBy === "titulo") cmp = a.titulo.localeCompare(b.titulo, "es")
    else if (sortBy === "sla") {
      const slaScore = (inc: Incidencia) => {
        if (["RESUELTA", "CERRADA"].includes(inc.estado)) return 9999
        if (!inc.slaHoras) return 9998
        return (now - new Date(inc.creadoEn).getTime()) / (inc.slaHoras * 3600000)
      }
      cmp = slaScore(a) - slaScore(b)
    }
    return sortDir === "asc" ? cmp : -cmp
  })
  sortedItemsRef.current = sortedItems

  const hwCategorias = ["BC_ROBO", "ZEBRA_MC", "ZEBRA_IMPRESORA", "READER_RFID", "GATEWAY_BT", "MINI_PC", "NEVERA", "PANTALLA", "TOTEM"]
  const swCategorias = ["INLAB", "OTRO"]

  const KPI_FILTRO: Record<string, string> = {
    "Abiertas": "ABIERTA", "En progreso": "EN_PROGRESO",
    "Pendientes": "PENDIENTE", "Resueltas": "RESUELTA_CERRADA",
  }

  function InlineDropdown({ inc, field }: { inc: Incidencia; field: "estado" | "prioridad" }) {
    const open = inlineDropdown?.id === inc.id && inlineDropdown.field === field
    const options = field === "estado" ? ESTADOS : PRIORIDADES
    const current = field === "estado" ? getEstadoStyle(inc.estado) : getPrioridadStyle(inc.prioridad)
    return (
      <div className="relative" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setInlineDropdown(open ? null : { id: inc.id, field })}
          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity"
          style={{ backgroundColor: current.bg, color: current.color }}>
          {current.label}
          <IconChevronDown size={10} />
        </button>
        {open && (
          <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 min-w-[160px] py-1" onClick={e => e.stopPropagation()}>
            {options.map(o => (
              <button key={o.value} onClick={() => patchInline(inc.id, field === "estado" ? { estado: o.value } : { prioridad: o.value })}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: o.color }} />
                <span style={{ color: o.color }} className="font-semibold">{o.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  function Highlight({ text, term }: { text: string; term: string }) {
    if (!term.trim()) return <>{text}</>
    const escaped = term.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const parts = text.split(new RegExp(`(${escaped})`, "gi"))
    return (
      <>
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <mark key={i} className="bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 rounded-sm not-italic px-0.5">
              {part}
            </mark>
          ) : part
        )}
      </>
    )
  }

  function QuickAssign({ inc }: { inc: Incidencia }) {
    const open = inlineDropdown?.id === inc.id && inlineDropdown.field === "asignado"
    return (
      <div className="relative" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setInlineDropdown(open ? null : { id: inc.id, field: "asignado" })}
          className="flex items-center gap-1 text-xs font-medium hover:opacity-70 transition-opacity cursor-pointer"
          style={{ color: inc.asignadoA ? TEAL : "#9ca3af" }}>
          {inc.asignadoA ? `→ ${inc.asignadoA.nombre}` : "Sin asignar"}
          <IconChevronDown size={9} />
        </button>
        {open && (
          <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 min-w-[180px] max-h-52 overflow-y-auto py-1">
            <button onClick={() => patchInline(inc.id, { asignadoAId: null })}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
              Sin asignar
            </button>
            <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
            {usuarios.map(u => (
              <button key={u.id} onClick={() => patchInline(inc.id, { asignadoAId: u.id })}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ backgroundColor: TEAL }}>{u.nombre.charAt(0).toUpperCase()}</span>
                <span className={`truncate ${inc.asignadoA?.id === u.id ? "font-bold" : "text-gray-700 dark:text-gray-300"}`}
                  style={inc.asignadoA?.id === u.id ? { color: TEAL } : undefined}>{u.nombre}</span>
                {inc.asignadoA?.id === u.id && (
                  <svg className="ml-auto shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Incidencias"
        subtitle="Gestión de incidencias de hardware y software"
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="hidden sm:flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button onClick={() => setVistaTabla(false)} title="Vista cards"
                className={`px-3 py-2 transition-colors ${!vistaTabla ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
              <button onClick={() => setVistaTabla(true)} title="Vista tabla"
                className={`px-3 py-2 transition-colors ${vistaTabla ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
              </button>
            </div>
            <Link href="/incidencias/calendario"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span className="hidden sm:inline">Calendario</span>
            </Link>
            <Link href="/incidencias/stats"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              <span className="hidden sm:inline">Métricas</span>
            </Link>
            <button
              onClick={() => { if (hospitales.length === 0) fetch("/api/hospitales?limit=500").then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setHospitales(d) }); setShowExport(true) }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <IconFileExport size={16} /><span className="hidden sm:inline">Informe</span>
            </button>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: TEAL }}>
              <IconPlus size={16} /><span className="hidden sm:inline">Nueva incidencia</span>
            </button>
          </div>
        }
      />

      {/* Banner alertas críticas */}
      {totales.criticasAbiertas > 0 && (
        <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
            <IconAlertTriangle size={16} className="text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-red-700 dark:text-red-400">
              {totales.criticasAbiertas === 1 ? "1 incidencia crítica sin resolver" : `${totales.criticasAbiertas} incidencias críticas sin resolver`}
            </p>
            <p className="text-xs text-red-500">Requieren atención inmediata</p>
          </div>
          <button onClick={() => { setFiltroEstado(""); setFiltroPrioridad("CRITICA") }}
            className="shrink-0 text-xs font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer">
            Ver críticas →
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Abiertas", value: totales.abiertas, color: "#ef4444", bg: "#fef2f2", darkBg: "dark:bg-red-950/20", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
          { label: "En progreso", value: totales.enProgreso, color: "#f59e0b", bg: "#fffbeb", darkBg: "dark:bg-amber-950/20", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
          { label: "Pendientes", value: totales.pendientes, color: "#8b5cf6", bg: "#f5f3ff", darkBg: "dark:bg-violet-950/20", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg> },
          { label: "Resueltas", value: totales.resueltas, color: "#10b981", bg: "#ecfdf5", darkBg: "dark:bg-emerald-950/20", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
        ].map(kpi => {
          const filtroValor = KPI_FILTRO[kpi.label]
          const activo = filtroEstado === filtroValor
          return (
            <button key={kpi.label} onClick={() => setFiltroEstado(activo ? "" : filtroValor)}
              className={`rounded-2xl p-4 shadow-sm text-left transition-all hover:shadow-md border-2 ${activo ? "" : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"} ${kpi.darkBg} cursor-pointer`}
              style={activo ? { backgroundColor: kpi.bg, borderColor: kpi.color } : { borderColor: "transparent" }}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: activo ? kpi.color : undefined }}>{kpi.label}</p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>{kpi.icon}</div>
              </div>
              <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
              {totales.total > 0 && (
                <div className="mt-2 w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(2, (kpi.value / totales.total) * 100)}%`, backgroundColor: kpi.color }} />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por código, título, descripción..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white dark:bg-gray-900 dark:text-white" />
          {busqueda && (
            <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <IconX size={14} />
            </button>
          )}
        </div>
        <select value={filtroPrioridad} onChange={e => setFiltroPrioridad(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 dark:text-white focus:outline-none cursor-pointer">
          <option value="">Todas las prioridades</option>
          {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 dark:text-white focus:outline-none cursor-pointer">
          <option value="">HW + SW</option>
          <option value="HARDWARE">Hardware</option>
          <option value="SOFTWARE">Software</option>
        </select>
        <select value={filtroEquipo} onChange={e => setFiltroEquipo(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 dark:text-white focus:outline-none cursor-pointer">
          <option value="">Todos los equipos</option>
          {EQUIPOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <select
          value={`${sortBy}_${sortDir}`}
          onChange={e => {
            const [f, d] = e.target.value.split("_") as ["fecha" | "sla" | "hospital" | "titulo", "asc" | "desc"]
            setSortBy(f); setSortDir(d)
          }}
          className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 dark:text-white focus:outline-none cursor-pointer">
          <option value="fecha_desc">↓ Más recientes</option>
          <option value="fecha_asc">↑ Más antiguas</option>
          <option value="sla_desc">↓ SLA más urgente</option>
          <option value="sla_asc">↑ SLA más holgado</option>
          <option value="hospital_asc">↑ Hospital A–Z</option>
          <option value="hospital_desc">↓ Hospital Z–A</option>
          <option value="titulo_asc">↑ Título A–Z</option>
        </select>

        {/* Filtros guardados */}
        <div className="relative" ref={filtrosDropdownRef}>
          <button
            onClick={() => setShowFiltrosDropdown(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filtros guardados
            {filtrosGuardados.length > 0 && <span className="text-xs opacity-60">({filtrosGuardados.length})</span>}
            <IconChevronDown size={12} />
          </button>
          {showFiltrosDropdown && (
            <div className="absolute right-0 mt-1.5 w-72 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg z-30 overflow-hidden">
              <div className="max-h-56 overflow-y-auto">
                {filtrosGuardados.length === 0 ? (
                  <p className="text-xs text-gray-400 px-3 py-3 text-center">Sin filtros guardados</p>
                ) : (
                  filtrosGuardados.map(f => (
                    <button
                      key={f.id}
                      onClick={() => aplicarFiltroGuardado(f)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      <span className="truncate text-gray-700 dark:text-gray-200">{f.nombre}</span>
                      <span onClick={e => borrarFiltroGuardado(f.id, e)} className="text-gray-300 hover:text-red-500 shrink-0 p-0.5">
                        <IconX size={12} />
                      </span>
                    </button>
                  ))
                )}
              </div>
              <div className="border-t border-gray-100 dark:border-gray-800 p-2">
                {showGuardarFiltro ? (
                  <div className="flex gap-1.5">
                    <input
                      value={nombreNuevoFiltro}
                      onChange={e => setNombreNuevoFiltro(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") guardarFiltroActual() }}
                      placeholder="Nombre del filtro"
                      autoFocus
                      className="flex-1 min-w-0 px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <button onClick={guardarFiltroActual} disabled={!nombreNuevoFiltro.trim() || guardandoFiltro}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40 cursor-pointer"
                      style={{ backgroundColor: TEAL }}>
                      Guardar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowGuardarFiltro(true)}
                    disabled={!(filtroEstado || filtroPrioridad || filtroTipo || filtroEquipo)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 hover:opacity-80 transition-opacity cursor-pointer"
                    style={{ color: TEAL }}
                  >
                    <IconPlus size={12} />
                    Guardar filtro actual
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard shortcuts hint — desktop only */}
      <div className="hidden lg:flex items-center gap-4 mb-3 text-[11px] text-gray-400">
        {([
          { key: "N", label: "Nueva" },
          { key: "R", label: "Actualizar" },
          { key: "↑↓", label: "Navegar" },
          { key: "Esc", label: "Cerrar" },
        ] as { key: string; label: string }[]).map(s => (
          <span key={s.key} className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 font-mono text-[10px] font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 leading-none">{s.key}</kbd>
            <span>{s.label}</span>
          </span>
        ))}
      </div>

      {/* Active filter chips */}
      {(filtroEstado || filtroPrioridad || filtroTipo || filtroEquipo) && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-gray-400">Filtros activos:</span>
          {filtroEstado && (() => {
            const CHIP: Record<string, { label: string; color: string }> = {
              PENDIENTE: { label: "Pendientes", color: "#8b5cf6" },
              RESUELTA_CERRADA: { label: "Resueltas y cerradas", color: "#10b981" },
            }
            const chip = CHIP[filtroEstado] ?? { label: getEstadoStyle(filtroEstado).label, color: getEstadoStyle(filtroEstado).color }
            return (
              <button onClick={() => setFiltroEstado("")} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                style={{ borderColor: chip.color, color: chip.color }}>
                {chip.label} <IconX size={11} />
              </button>
            )
          })()}
          {filtroPrioridad && (
            <button onClick={() => setFiltroPrioridad("")} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              style={{ borderColor: getPrioridadStyle(filtroPrioridad).color, color: getPrioridadStyle(filtroPrioridad).color }}>
              {getPrioridadStyle(filtroPrioridad).label} <IconX size={11} />
            </button>
          )}
          {filtroTipo && (
            <button onClick={() => setFiltroTipo("")} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
              {filtroTipo === "HARDWARE" ? "Hardware" : "Software"} <IconX size={11} />
            </button>
          )}
          {filtroEquipo && (() => {
            const eq = EQUIPOS.find(e => e.value === filtroEquipo)
            return eq ? (
              <button onClick={() => setFiltroEquipo("")} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                style={{ borderColor: eq.color, color: eq.color }}>
                {eq.label} <IconX size={11} />
              </button>
            ) : null
          })()}
          <button onClick={() => { setFiltroEstado(""); setFiltroPrioridad(""); setFiltroTipo(""); setFiltroEquipo("") }}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline ml-1 cursor-pointer">
            Limpiar todos
          </button>
        </div>
      )}

      {/* List / Table */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}</div>
      ) : items.length === 0 ? (
        <EmptyState title="Sin incidencias" description="No hay incidencias registradas con estos filtros."
          icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>} />
      ) : vistaTabla ? (
        /* ── TABLE VIEW ── */
        <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/40">
                <th className="w-1.5 p-0" />
                {([
                  { label: "Código", field: "fecha" as const },
                  { label: "Título", field: "titulo" as const },
                  { label: "Hospital", field: "hospital" as const },
                  { label: "Estado" },
                  { label: "Prioridad" },
                  { label: "SLA", field: "sla" as const },
                  { label: "Asignado" },
                  { label: "" },
                ] as { label: string; field?: "fecha" | "sla" | "hospital" | "titulo" }[]).map(h => (
                  <th key={h.label}
                    onClick={h.field ? () => toggleSort(h.field!) : undefined}
                    className={`px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider transition-colors select-none ${
                      h.field ? "cursor-pointer hover:text-gray-700 dark:hover:text-gray-200" : ""
                    } ${h.field && sortBy === h.field ? "text-teal-600 dark:text-teal-400" : "text-gray-400"}`}>
                    <span className="flex items-center gap-1">
                      {h.label}
                      {h.field && (
                        <span className="text-[10px]">
                          {sortBy === h.field ? (sortDir === "asc" ? "↑" : "↓") : <span className="opacity-30">↕</span>}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRIORIDADES.map(p => {
                const group = sortedItems.filter(i => i.prioridad === p.value)
                if (group.length === 0) return null
                const collapsed = collapsedGroups.has(p.value)
                return (
                  <>
                    <tr key={`grp-${p.value}`} style={{ backgroundColor: `${p.color}08` }}>
                      <td colSpan={9} className="px-4 py-2 border-y border-gray-100 dark:border-gray-800">
                        <button onClick={() => toggleGroup(p.value)} className="flex items-center gap-2 cursor-pointer">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: p.color }}>{p.label}</span>
                          <span className="text-[11px] text-gray-400">{group.length} incidencia{group.length !== 1 ? "s" : ""}</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" className={`transition-transform duration-150 ${collapsed ? "-rotate-90" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                      </td>
                    </tr>
                    {!collapsed && group.map(inc => {
                      const sla = slaDetail(inc.creadoEn, inc.slaHoras, inc.estado, now)
                      const pri = getPrioridadStyle(inc.prioridad)
                      const recentActivity = (now - new Date(inc.actualizadoEn).getTime()) < 7200000
                      return (
                        <tr key={inc.id} onClick={() => setDrawerIncId(inc.id)}
                          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group border-b border-gray-50 dark:border-gray-800">
                          <td className="p-0 w-1.5">
                            <div className="w-1.5 min-h-[52px] rounded-r-sm" style={{ backgroundColor: pri.color }} />
                          </td>
                          <td className="px-3 py-3.5 font-mono text-xs text-gray-400 font-bold whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              {recentActivity && (
                                <span className="relative flex h-2 w-2 shrink-0" title="Actividad reciente (últimas 2h)">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                </span>
                              )}
                              <Highlight text={inc.codigo} term={busqueda} />
                            </span>
                          </td>
                          <td className="px-3 py-3.5 max-w-[260px]">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1"><Highlight text={inc.titulo} term={busqueda} /></span>
                            <span className="block text-xs text-gray-400 mt-0.5">
                              {inc._count.eventos} evento{inc._count.eventos !== 1 ? "s" : ""}
                              {inc.tiempoTotalMinutos > 0 && <span className="text-blue-500 font-semibold ml-1">· {fmtMin(inc.tiempoTotalMinutos)}</span>}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap max-w-[160px] truncate">{inc.hospital.nombre}</td>
                          <td className="px-3 py-3.5"><InlineDropdown inc={inc} field="estado" /></td>
                          <td className="px-3 py-3.5"><InlineDropdown inc={inc} field="prioridad" /></td>
                          <td className="px-3 py-3.5 min-w-[110px]">
                            <span className="text-xs font-semibold block" style={{ color: sla.color }}>{sla.label}</span>
                            {sla.remaining && <span className="text-[10px] text-gray-400 block mt-0.5">{sla.remaining}</span>}
                          </td>
                          <td className="px-3 py-3.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <QuickAssign inc={inc} />
                          </td>
                          <td className="px-2 py-3.5">
                            <span className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 group-hover:text-gray-500 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors">
                              <IconArrowRight size={14} />
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── CARD VIEW ── */
        <div className="space-y-1">
          {PRIORIDADES.map(p => {
            const group = sortedItems.filter(i => i.prioridad === p.value)
            if (group.length === 0) return null
            const collapsed = collapsedGroups.has(p.value)
            return (
              <div key={p.value} className="mb-1">
                {/* Group header */}
                <button onClick={() => toggleGroup(p.value)}
                  className="flex items-center gap-2 w-full py-2 px-1 mb-2 cursor-pointer group/hdr">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform group-hover/hdr:scale-110" style={{ backgroundColor: p.color }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: p.color }}>{p.label}</span>
                  <span className="text-xs font-semibold text-gray-400 tabular-nums">{group.length}</span>
                  <div className="flex-1 h-px ml-1" style={{ backgroundColor: `${p.color}25` }} />
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round"
                    className={`transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {/* Group cards */}
                {!collapsed && (
                  <div className="space-y-2">
                    {group.map(inc => {
                      const est = getEstadoStyle(inc.estado)
                      const pri = getPrioridadStyle(inc.prioridad)
                      const sla = slaDetail(inc.creadoEn, inc.slaHoras, inc.estado, now)
                      const recentActivity = (now - new Date(inc.actualizadoEn).getTime()) < 7200000
                      return (
                        <div key={inc.id} onClick={() => setDrawerIncId(inc.id)}
                          className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-all hover:border-gray-200 dark:hover:border-gray-700 cursor-pointer group">
                          {recentActivity && (
                            <span className="absolute top-3.5 right-3.5 flex h-2.5 w-2.5" title="Actividad reciente (últimas 2h)">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                            </span>
                          )}
                          <div className="flex items-start gap-3">
                            <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: pri.color }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-xs font-mono font-bold text-gray-400"><Highlight text={inc.codigo} term={busqueda} /></span>
                                <InlineDropdown inc={inc} field="estado" />
                                <InlineDropdown inc={inc} field="prioridad" />
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                  {inc.tipo === "HARDWARE" ? "HW" : "SW"} · {CATEGORIAS[inc.categoria] ?? inc.categoria}
                                </span>
                                {inc.slaHoras && !["RESUELTA", "CERRADA"].includes(inc.estado) && (
                                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: `${sla.color}15`, color: sla.color }}>
                                    <IconClock size={9} />
                                    {sla.remaining ?? sla.label}
                                  </span>
                                )}
                                {["RESUELTA", "CERRADA"].includes(inc.estado) && (
                                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "#10b98115", color: "#10b981" }}>SLA cumplido</span>
                                )}
                              </div>
                              <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate"><Highlight text={inc.titulo} term={busqueda} /></h3>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                                <span>{inc.hospital.nombre}</span>
                                <span>·</span>
                                <span>{EQUIPOS_MAP[inc.equipoResponsable] ?? inc.equipoResponsable}</span>
                                <span>·</span><QuickAssign inc={inc} />
                                {inc.hardwareUnidad && <><span>·</span><span>{inc.hardwareUnidad.catalogo.marca} {inc.hardwareUnidad.catalogo.modelo}{inc.hardwareUnidad.numSerie ? ` (${inc.hardwareUnidad.numSerie})` : ""}</span></>}
                                {inc.tiempoTotalMinutos > 0 && <span className="font-semibold" style={{ color: "#0284c7" }}>{fmtMin(inc.tiempoTotalMinutos)}</span>}
                                <span className="ml-auto shrink-0 text-gray-400">{timeAgo(inc.creadoEn)}</span>
                                {inc._count.eventos > 0 && <span className="text-gray-400">{inc._count.eventos} ev.</span>}
                              </div>
                              {inc.slaHoras && !["RESUELTA", "CERRADA"].includes(inc.estado) && (
                                <div className="mt-2.5 h-0.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, sla.pct * 100)}%`, backgroundColor: sla.color }} />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── DRAWER ── */}
      {drawerIncId && (
        <>
          <div className="fixed inset-0 bg-black/20 dark:bg-black/50 z-40 backdrop-blur-[2px]"
            onClick={() => setDrawerIncId(null)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[560px] bg-white dark:bg-gray-900 shadow-2xl flex flex-col"
            style={{ animation: "slideInRight 0.2s ease-out" }}>
            <style>{`@keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

            {/* Drawer header */}
            <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex-1 min-w-0">
                {drawerLoading ? (
                  <div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-5 w-4/5" /></div>
                ) : drawerInc ? (
                  <>
                    <span className="text-xs font-mono font-bold text-gray-400">{drawerInc.codigo}</span>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white mt-0.5 leading-snug">{drawerInc.titulo}</h2>
                  </>
                ) : null}
              </div>
              <button onClick={() => setDrawerIncId(null)}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                <IconX size={18} />
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {drawerLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
              ) : drawerInc ? (
                <>
                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: getEstadoStyle(drawerInc.estado).bg, color: getEstadoStyle(drawerInc.estado).color }}>
                      {getEstadoStyle(drawerInc.estado).label}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: getPrioridadStyle(drawerInc.prioridad).bg, color: getPrioridadStyle(drawerInc.prioridad).color }}>
                      {getPrioridadStyle(drawerInc.prioridad).label}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {drawerInc.tipo === "HARDWARE" ? "HW" : "SW"} · {CATEGORIAS[drawerInc.categoria] ?? drawerInc.categoria}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {EQUIPOS_MAP[drawerInc.equipoResponsable]}
                    </span>
                  </div>

                  {/* Metadata grid */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {[
                      ["Hospital", drawerInc.hospital.nombre],
                      ["Asignado", drawerInc.asignadoA?.nombre ?? "Sin asignar"],
                      ["SLA configurado", drawerInc.slaHoras ? `${drawerInc.slaHoras}h` : "Sin SLA"],
                      ["Creada", timeAgo(drawerInc.creadoEn)],
                      ...(drawerInc.tiempoTotalMinutos > 0 ? [["Tiempo dedicado", fmtMin(drawerInc.tiempoTotalMinutos)]] : []),
                      ...(drawerInc.fechaResolucion ? [["Resuelta", timeAgo(drawerInc.fechaResolucion)]] : []),
                    ].map(([k, v]) => (
                      <div key={k}>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{k}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* SLA bar */}
                  {drawerInc.slaHoras && !["RESUELTA", "CERRADA"].includes(drawerInc.estado) && (() => {
                    const sla = slaDetail(drawerInc.creadoEn, drawerInc.slaHoras, drawerInc.estado, now)
                    return (
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold flex items-center gap-1" style={{ color: sla.color }}>
                            <IconClock size={11} /> {sla.label}
                          </span>
                          {sla.remaining && <span className="text-xs text-gray-400">{sla.remaining}</span>}
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, sla.pct * 100)}%`, backgroundColor: sla.color }} />
                        </div>
                      </div>
                    )
                  })()}

                  {/* Description */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Descripción</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{drawerInc.descripcion}</p>
                  </div>

                  {/* Resolution */}
                  {drawerInc.resolucion && (
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-4 border border-green-100 dark:border-green-900/50">
                      <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1.5">Resolución</p>
                      <p className="text-sm text-green-800 dark:text-green-300 leading-relaxed whitespace-pre-wrap">{drawerInc.resolucion}</p>
                    </div>
                  )}

                  {/* Last events */}
                  {drawerInc.eventos.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Últimas actividades</p>
                      <div className="space-y-3">
                        {drawerInc.eventos.slice(0, 5).map(ev => (
                          <div key={ev.id} className="flex gap-3">
                            <div className="w-0.5 self-stretch rounded-full shrink-0 bg-gray-200 dark:bg-gray-700 mt-1" />
                            <div className="flex-1 min-w-0 pb-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                  {TIPO_EVENTO_LABEL[ev.tipo] ?? ev.tipo}
                                </span>
                                <span className="text-[10px] text-gray-400">{timeAgo(ev.creadoEn)}</span>
                                {ev.duracion && ev.duracion > 0 && (
                                  <span className="text-[10px] font-bold ml-auto" style={{ color: "#0284c7" }}>{fmtMin(ev.duracion)}</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{ev.descripcion}</p>
                              {Array.isArray(ev.realizadoPorNombres) && ev.realizadoPorNombres.length > 0 && (
                                <p className="text-[10px] text-gray-400 mt-0.5">{ev.realizadoPorNombres.join(", ")}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No se pudo cargar la incidencia</p>
              )}
            </div>

            {/* Drawer footer */}
            {drawerInc && (
              <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                <Link href={`/incidencias/${drawerInc.id}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: TEAL }}>
                  Ver detalle completo <IconArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </>
      )}

      {/* Create Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] px-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[calc(100vh-2rem)] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nueva incidencia</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"><IconX size={18} /></button>
              </div>
              <div className="px-6 py-4 space-y-4">
                {/* Hospital */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Hospital *</label>
                  {form.hospitalId ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 border border-teal-300 dark:border-teal-700 rounded-xl bg-teal-50 dark:bg-teal-950/30">
                      <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                        {hospitales.find(h => h.id === form.hospitalId)?.nombre} — {hospitales.find(h => h.id === form.hospitalId)?.ciudad}
                      </span>
                      <button onClick={() => { setForm(f => ({ ...f, hospitalId: "", contactoId: "", hardwareUnidadId: "" })); setHospitalSearch("") }}
                        className="text-gray-400 hover:text-gray-600 shrink-0 cursor-pointer"><IconX size={14} /></button>
                    </div>
                  ) : (
                    <div className="relative" ref={hospitalSearchRef}>
                      <input value={hospitalSearch} onChange={e => { setHospitalSearch(e.target.value); setHospitalSearchOpen(true) }}
                        onFocus={() => setHospitalSearchOpen(true)} placeholder="Buscar hospital..."
                        className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400" />
                      {hospitalSearchOpen && (
                        <div className="absolute z-30 w-full mt-1 max-h-52 overflow-y-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
                          {hospitales.filter(h => !hospitalSearch || h.nombre.toLowerCase().includes(hospitalSearch.toLowerCase()) || h.ciudad.toLowerCase().includes(hospitalSearch.toLowerCase())).slice(0, 20).map(h => (
                            <button key={h.id} onClick={() => { setForm(f => ({ ...f, hospitalId: h.id, contactoId: "", hardwareUnidadId: "" })); setHospitalSearch(""); setHospitalSearchOpen(false) }}
                              className="w-full text-left px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors cursor-pointer">
                              <span className="font-medium">{h.nombre}</span><span className="text-gray-400 ml-2 text-xs">{h.ciudad}</span>
                            </button>
                          ))}
                          {hospitales.filter(h => !hospitalSearch || h.nombre.toLowerCase().includes(hospitalSearch.toLowerCase()) || h.ciudad.toLowerCase().includes(hospitalSearch.toLowerCase())).length === 0 && (
                            <p className="px-3 py-3 text-sm text-gray-400 text-center">Sin resultados</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* Title */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Título *</label>
                  <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                    placeholder="Descripción breve del problema..."
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                {/* Type + Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Tipo *</label>
                    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                      {(["HARDWARE", "SOFTWARE"] as const).map(t => (
                        <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t, categoria: t === "HARDWARE" ? "BC_ROBO" : "INLAB" }))}
                          className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${form.tipo === t ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500"}`}>
                          {t === "HARDWARE" ? "Hardware" : "Software"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Categoría *</label>
                    <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none">
                      {(form.tipo === "HARDWARE" ? hwCategorias : swCategorias).map(c => <option key={c} value={c}>{CATEGORIAS[c]}</option>)}
                    </select>
                  </div>
                </div>
                {/* Priority */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Prioridad</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {PRIORIDADES.map(p => (
                      <button key={p.value} onClick={() => setForm(f => ({ ...f, prioridad: p.value }))}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer"
                        style={form.prioridad === p.value ? { backgroundColor: p.bg, color: p.color, borderColor: p.color } : { borderColor: "#e5e7eb", color: "#9ca3af" }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Team */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Equipo responsable</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {EQUIPOS.map(e => (
                      <button key={e.value} onClick={() => setForm(f => ({ ...f, equipoResponsable: e.value }))}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer"
                        style={form.equipoResponsable === e.value ? { backgroundColor: `${e.color}15`, color: e.color, borderColor: e.color } : { borderColor: "#e5e7eb", color: "#9ca3af" }}>
                        {e.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Descripción *</label>
                  <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                    rows={3} placeholder="Describe el problema en detalle..."
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
                </div>
                {/* Contacto */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Contacto hospital</label>
                  <select value={form.contactoId} onChange={e => setForm(f => ({ ...f, contactoId: e.target.value }))}
                    disabled={!form.hospitalId}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none disabled:opacity-50">
                    <option value="">Sin contacto</option>
                    {contactos.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.cargo ? ` — ${c.cargo}` : ""}</option>)}
                  </select>
                </div>
                {/* Assign multi */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">Asignar a</label>
                  {asignadosIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {asignadosIds.map((uid, idx) => {
                        const u = usuarios.find(u => u.id === uid)
                        return (
                          <span key={uid} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border"
                            style={idx === 0 ? { backgroundColor: `${TEAL}12`, color: TEAL, borderColor: `${TEAL}40` } : { backgroundColor: "#f1f5f9", color: "#64748b", borderColor: "#e2e8f0" }}>
                            {idx === 0 && <span className="text-[9px] font-bold opacity-60">PRINCIPAL</span>}
                            {u?.nombre ?? uid}
                            <button onClick={() => setAsignadosIds(prev => prev.filter(id => id !== uid))} className="hover:text-red-500 transition-colors cursor-pointer"><IconX size={10} /></button>
                          </span>
                        )
                      })}
                    </div>
                  )}
                  <select value="" onChange={e => { if (e.target.value && !asignadosIds.includes(e.target.value)) setAsignadosIds(prev => [...prev, e.target.value]) }}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400">
                    <option value="">{asignadosIds.length === 0 ? "Seleccionar persona..." : "Añadir otra persona..."}</option>
                    {usuarios.filter(u => !asignadosIds.includes(u.id)).map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
                </div>
                {/* Hardware unit */}
                {form.tipo === "HARDWARE" && form.hospitalId && hwUnidades.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Unidad de hardware afectada</label>
                    <select value={form.hardwareUnidadId} onChange={e => setForm(f => ({ ...f, hardwareUnidadId: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none">
                      <option value="">No especificada</option>
                      {hwUnidades.map(u => <option key={u.id} value={u.id}>{u.catalogo.marca} {u.catalogo.modelo}{u.numSerie ? ` — SN: ${u.numSerie}` : ""}</option>)}
                    </select>
                  </div>
                )}
                {/* SLA */}
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 shrink-0">SLA (horas)</label>
                  <input type="number" value={form.slaHoras} onChange={e => setForm(f => ({ ...f, slaHoras: e.target.value }))}
                    min="1" max="9999"
                    className="w-24 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none" />
                </div>
              </div>
              <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-4 flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800 transition-colors cursor-pointer">Cancelar</button>
                <button onClick={crear} disabled={creando || !form.titulo.trim() || !form.hospitalId || !form.descripcion.trim()}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90 cursor-pointer"
                  style={{ backgroundColor: TEAL }}>
                  {creando ? "Creando..." : "Crear incidencia"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Export Modal */}
      {showExport && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowExport(false)} />
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Exportar informe</h2>
                <button onClick={() => setShowExport(false)} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"><IconX size={18} /></button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Hospital</label>
                  <select value={exportHospitalId} onChange={e => setExportHospitalId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400">
                    <option value="">Todos los hospitales</option>
                    {hospitales.map(h => <option key={h.id} value={h.id}>{h.nombre} — {h.ciudad}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Desde</label>
                    <input type="date" value={exportDesde} onChange={e => setExportDesde(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Hasta</label>
                    <input type="date" value={exportHasta} onChange={e => setExportHasta(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Estado</label>
                  <select value={exportEstado} onChange={e => setExportEstado(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none">
                    <option value="">Todos los estados</option>
                    {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                <button onClick={() => setShowExport(false)} className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800 transition-colors cursor-pointer">Cancelar</button>
                <button onClick={exportarInforme}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
                  style={{ backgroundColor: TEAL }}>
                  <IconFileExport size={15} /> Generar informe
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
