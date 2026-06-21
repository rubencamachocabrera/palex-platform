"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { TEAL, TEAL_LIGHT, TEAL_DARK } from "@/lib/brand"
import { PageHeader } from "@/components/ui/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton"
import { useToast } from "@/components/Toast"
import { usePerfil } from "@/hooks/usePerfil"
import { IconPhone, IconSearch, IconX, IconPlus, IconChevronDown } from "@/components/ui/Icons"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Llamada {
  id: string
  fecha: string
  duracion: number | null
  asunto: string
  notas: string | null
  resultado: string | null
  seguimiento: boolean
  fechaSeguimiento: string | null
  creadoEn: string
  hospital: { id: string; nombre: string; ciudad: string }
  contacto: { id: string; nombre: string; cargo: string | null; telefono: string | null } | null
  usuario: { id: string; nombre: string }
}

interface Hospital {
  id: string
  nombre: string
  ciudad: string
}

interface Contacto {
  id: string
  nombre: string
  cargo: string | null
  telefono: string | null
}

// ─── Constants ───────────────────────────────────────────────────────────────

const RESULTADOS = [
  { value: "Contactado", color: TEAL, bg: `${TEAL}18`, textColor: TEAL },
  { value: "No contesta", color: "#9ca3af", bg: "#f3f4f6", textColor: "#6b7280" },
  { value: "Buzon de voz", color: "#f59e0b", bg: "#fef3c7", textColor: "#b45309" },
  { value: "Informacion enviada", color: "#3b82f6", bg: "#eff6ff", textColor: "#1d4ed8" },
  { value: "Reunion agendada", color: "#16a34a", bg: "#f0fdf4", textColor: "#15803d" },
  { value: "Otro", color: "#d1d5db", bg: "#f9fafb", textColor: "#6b7280" },
] as const

const FILTROS_FECHA = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mes" },
  { value: "todo", label: "Todo" },
] as const

function getResultadoStyle(resultado: string | null) {
  const r = RESULTADOS.find(r => r.value === resultado)
  return r ?? { color: "#d1d5db", bg: "#f9fafb", textColor: "#6b7280" }
}

function getBarColor(resultado: string | null, seguimiento: boolean) {
  if (seguimiento) return "#f59e0b"
  if (resultado === "Contactado") return TEAL
  if (resultado === "Reunion agendada") return "#16a34a"
  return "#e5e7eb"
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(min: number | null): string {
  if (!min) return ""
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return "Ahora"
  if (min < 60) return `Hace ${min}min`
  const h = Math.floor(min / 3600)
  if (h < 24) return `Hace ${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return "Ayer"
  if (d < 7) return `Hace ${d} dias`
  if (d < 30) return `Hace ${Math.floor(d / 7)} sem.`
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

function formatFechaSeguimiento(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  const dias = Math.ceil((target.getTime() - hoy.getTime()) / 86400000)
  if (dias < 0) return `Vencido (${d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })})`
  if (dias === 0) return "Hoy"
  if (dias === 1) return "Manana"
  if (dias < 7) return `En ${dias} dias`
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
}

function getDateRange(filtro: string): { desde?: string; hasta?: string } {
  const hoy = new Date()
  const yyyy = hoy.getFullYear()
  const mm = String(hoy.getMonth() + 1).padStart(2, "0")
  const dd = String(hoy.getDate()).padStart(2, "0")
  const hoyStr = `${yyyy}-${mm}-${dd}`

  switch (filtro) {
    case "hoy":
      return { desde: hoyStr, hasta: hoyStr }
    case "semana": {
      const inicio = new Date(hoy)
      inicio.setDate(hoy.getDate() - hoy.getDay() + 1)
      const iy = inicio.getFullYear()
      const im = String(inicio.getMonth() + 1).padStart(2, "0")
      const id = String(inicio.getDate()).padStart(2, "0")
      return { desde: `${iy}-${im}-${id}`, hasta: hoyStr }
    }
    case "mes":
      return { desde: `${yyyy}-${mm}-01`, hasta: hoyStr }
    default:
      return {}
  }
}

// ─── Searchable Hospital Dropdown ────────────────────────────────────────────

function HospitalDropdown({
  value, onChange, hospitales, loading,
}: {
  value: string; onChange: (id: string) => void; hospitales: Hospital[]; loading: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const filtered = query
    ? hospitales.filter(h =>
        h.nombre.toLowerCase().includes(query.toLowerCase()) ||
        h.ciudad.toLowerCase().includes(query.toLowerCase())
      )
    : hospitales

  const selected = hospitales.find(h => h.id === value)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 transition-colors cursor-pointer text-left min-h-[44px]"
      >
        <span className={selected ? "text-gray-800 dark:text-gray-200 truncate" : "text-gray-400 dark:text-gray-500"}>
          {selected ? `${selected.nombre} · ${selected.ciudad}` : "Seleccionar hospital..."}
        </span>
        <IconChevronDown size={14} className="text-gray-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar hospital..."
                autoFocus
                className="w-full pl-8 pr-3 py-2 text-sm border-none bg-gray-50 dark:bg-gray-700 rounded-lg focus:outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {loading && <p className="text-xs text-gray-400 text-center py-4">Cargando...</p>}
            {!loading && filtered.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Sin resultados</p>
            )}
            {filtered.map(h => (
              <button
                key={h.id}
                type="button"
                onClick={() => { onChange(h.id); setOpen(false); setQuery("") }}
                className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer flex items-center gap-2 ${
                  h.id === value ? "bg-teal-50 dark:bg-teal-950/30" : ""
                }`}
              >
                <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{h.nombre}</span>
                <span className="text-gray-400 text-xs shrink-0">{h.ciudad}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Contacto Dropdown ───────────────────────────────────────────────────────

function ContactoDropdown({
  value, onChange, contactos, disabled,
}: {
  value: string; onChange: (id: string) => void; contactos: Contacto[]; disabled: boolean
}) {
  const selected = contactos.find(c => c.id === value)
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] text-gray-800 dark:text-gray-200 cursor-pointer"
    >
      <option value="">Sin contacto (opcional)</option>
      {contactos.map(c => (
        <option key={c.id} value={c.id}>
          {c.nombre}{c.cargo ? ` · ${c.cargo}` : ""}
        </option>
      ))}
    </select>
  )
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, accent }: {
  label: string; value: string | number; icon: React.ReactNode; accent?: string
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: (accent ?? TEAL) + "18", color: accent ?? TEAL }}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-none">{value}</p>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">{label}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function LlamadasPage() {
  const { success, error: showError } = useToast()

  // Data
  const [llamadas, setLlamadas] = useState<Llamada[]>([])
  const [loading, setLoading] = useState(true)
  const [hospitales, setHospitales] = useState<Hospital[]>([])
  const [hospitalesLoading, setHospitalesLoading] = useState(true)
  const [contactos, setContactos] = useState<Contacto[]>([])
  const { rol: userRol } = usePerfil()

  // Filters
  const [filtroFecha, setFiltroFecha] = useState("mes")
  const [filtroHospital, setFiltroHospital] = useState("")
  const [filtroResultado, setFiltroResultado] = useState("")
  const [search, setSearch] = useState("")

  // Quick-create form
  const [formOpen, setFormOpen] = useState(true)
  const [formHospitalId, setFormHospitalId] = useState("")
  const [formContactoId, setFormContactoId] = useState("")
  const [formAsunto, setFormAsunto] = useState("")
  const [formDuracion, setFormDuracion] = useState("")
  const [formNotas, setFormNotas] = useState("")
  const [formResultado, setFormResultado] = useState("")
  const [formSeguimiento, setFormSeguimiento] = useState(false)
  const [formFechaSeguimiento, setFormFechaSeguimiento] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Expand/edit
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ asunto: string; notas: string; resultado: string; duracion: string; seguimiento: boolean; fechaSeguimiento: string }>({ asunto: "", notas: "", resultado: "", duracion: "", seguimiento: false, fechaSeguimiento: "" })
  const [saving, setSaving] = useState(false)

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ─── Load data ────────────────────────────────────────────────────────────

  const cargarLlamadas = useCallback(async () => {
    setLoading(true)
    try {
      const range = getDateRange(filtroFecha)
      const params = new URLSearchParams()
      if (range.desde) params.set("desde", range.desde)
      if (range.hasta) params.set("hasta", range.hasta)
      if (filtroHospital) params.set("hospitalId", filtroHospital)

      const r = await fetch(`/api/llamadas?${params.toString()}`)
      if (r.ok) {
        const data = await r.json()
        setLlamadas(Array.isArray(data) ? data : [])
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }, [filtroFecha, filtroHospital])

  useEffect(() => { cargarLlamadas() }, [cargarLlamadas])

  useEffect(() => {
    setHospitalesLoading(true)
    fetch("/api/hospitales")
      .then(r => r.ok ? r.json() : [])
      .then(data => setHospitales(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setHospitalesLoading(false))

  }, [])

  // Load contactos when hospital changes
  useEffect(() => {
    if (!formHospitalId) { setContactos([]); setFormContactoId(""); return }
    fetch(`/api/hospitales/${formHospitalId}/contactos`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setContactos(Array.isArray(data) ? data : []))
      .catch(() => setContactos([]))
  }, [formHospitalId])

  // ─── Submit new call ──────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formHospitalId || !formAsunto.trim()) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        hospitalId: formHospitalId,
        asunto: formAsunto.trim(),
      }
      if (formContactoId) body.contactoId = formContactoId
      if (formDuracion && parseInt(formDuracion) > 0) body.duracion = parseInt(formDuracion)
      if (formNotas.trim()) body.notas = formNotas.trim()
      if (formResultado) body.resultado = formResultado
      if (formSeguimiento) body.seguimiento = true
      if (formSeguimiento && formFechaSeguimiento) body.fechaSeguimiento = formFechaSeguimiento

      const r = await fetch("/api/llamadas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const d = await r.json()
        showError(d.error ?? "Error al registrar la llamada")
        return
      }
      const nueva = await r.json()
      setLlamadas(prev => [nueva, ...prev])
      // Reset form
      setFormAsunto("")
      setFormDuracion("")
      setFormNotas("")
      setFormResultado("")
      setFormSeguimiento(false)
      setFormFechaSeguimiento("")
      setFormContactoId("")
      success("Llamada registrada")
    } catch {
      showError("Error de conexion")
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Edit call ─────────────────────────────────────────────────────────────

  function startEdit(ll: Llamada) {
    setEditingId(ll.id)
    setEditForm({
      asunto: ll.asunto,
      notas: ll.notas ?? "",
      resultado: ll.resultado ?? "",
      duracion: ll.duracion ? String(ll.duracion) : "",
      seguimiento: ll.seguimiento,
      fechaSeguimiento: ll.fechaSeguimiento ? ll.fechaSeguimiento.split("T")[0] : "",
    })
  }

  async function saveEdit() {
    if (!editingId) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        asunto: editForm.asunto.trim(),
        notas: editForm.notas.trim() || null,
        resultado: editForm.resultado || null,
        duracion: editForm.duracion && parseInt(editForm.duracion) > 0 ? parseInt(editForm.duracion) : null,
        seguimiento: editForm.seguimiento,
        fechaSeguimiento: editForm.seguimiento && editForm.fechaSeguimiento ? editForm.fechaSeguimiento : null,
      }
      const r = await fetch(`/api/llamadas/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        showError("Error al guardar")
        return
      }
      const updated = await r.json()
      setLlamadas(prev => prev.map(ll => ll.id === editingId ? updated : ll))
      setEditingId(null)
      success("Cambios guardados")
    } catch {
      showError("Error de conexion")
    } finally {
      setSaving(false)
    }
  }

  // ─── Delete call ───────────────────────────────────────────────────────────

  async function confirmDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const r = await fetch(`/api/llamadas/${deleteId}`, { method: "DELETE" })
      if (r.ok || r.status === 204) {
        setLlamadas(prev => prev.filter(ll => ll.id !== deleteId))
        setDeleteId(null)
        setExpandedId(null)
        success("Llamada eliminada")
      } else {
        showError("Error al eliminar")
      }
    } catch {
      showError("Error de conexion")
    } finally {
      setDeleting(false)
    }
  }

  // ─── Filtered list ─────────────────────────────────────────────────────────

  const filtered = llamadas.filter(ll => {
    if (filtroResultado && ll.resultado !== filtroResultado) return false
    if (search) {
      const q = search.toLowerCase()
      const match =
        ll.asunto.toLowerCase().includes(q) ||
        (ll.notas?.toLowerCase().includes(q) ?? false) ||
        ll.hospital.nombre.toLowerCase().includes(q) ||
        ll.hospital.ciudad.toLowerCase().includes(q) ||
        (ll.contacto?.nombre.toLowerCase().includes(q) ?? false)
      if (!match) return false
    }
    return true
  })

  // ─── Stats ─────────────────────────────────────────────────────────────────

  const totalLlamadas = filtered.length
  const mediaDuracion = (() => {
    const conDuracion = filtered.filter(ll => ll.duracion != null && ll.duracion > 0)
    if (conDuracion.length === 0) return 0
    return Math.round(conDuracion.reduce((s, ll) => s + (ll.duracion ?? 0), 0) / conDuracion.length)
  })()
  const tasaContacto = (() => {
    if (filtered.length === 0) return 0
    const contactados = filtered.filter(ll => ll.resultado === "Contactado" || ll.resultado === "Reunion agendada").length
    return Math.round((contactados / filtered.length) * 100)
  })()
  const seguimientosPendientes = llamadas.filter(ll => ll.seguimiento && (!ll.fechaSeguimiento || new Date(ll.fechaSeguimiento) >= new Date(new Date().toDateString()))).length

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Registro de llamadas"
        subtitle={loading ? "Cargando..." : `${totalLlamadas} llamada${totalLlamadas !== 1 ? "s" : ""} registrada${totalLlamadas !== 1 ? "s" : ""}`}
        actions={
          <button
            onClick={() => setFormOpen(!formOpen)}
            className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2.5 rounded-xl shadow-sm hover:opacity-90 transition-all cursor-pointer min-h-[44px]"
            style={{ backgroundColor: TEAL }}
          >
            {formOpen ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
                <span className="hidden sm:inline">Ocultar</span>
              </>
            ) : (
              <>
                <IconPlus size={14} />
                <span className="hidden sm:inline">Nueva llamada</span>
              </>
            )}
          </button>
        }
      />

      {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
      <div className="stagger-grid grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="Total llamadas"
          value={loading ? "-" : totalLlamadas}
          icon={<IconPhone size={18} />}
        />
        <KpiCard
          label="Media duracion"
          value={loading ? "-" : mediaDuracion > 0 ? formatDuration(mediaDuracion) : "N/A"}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          }
        />
        <KpiCard
          label="Tasa de contacto"
          value={loading ? "-" : `${tasaContacto}%`}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          }
          accent="#16a34a"
        />
        <KpiCard
          label="Seguimientos pendientes"
          value={loading ? "-" : seguimientosPendientes}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          }
          accent="#f59e0b"
        />
      </div>

      {/* ── Quick-Create Card ────────────────────────────────────────────────── */}
      {formOpen && (
        <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${TEAL}, ${TEAL_DARK})` }} />
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: TEAL + "18", color: TEAL }}>
                <IconPhone size={14} />
              </span>
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Registrar llamada</h3>
            </div>

            {/* Row 1: Hospital + Contacto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Hospital <span className="text-red-400">*</span>
                </label>
                <HospitalDropdown
                  value={formHospitalId}
                  onChange={setFormHospitalId}
                  hospitales={hospitales}
                  loading={hospitalesLoading}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Contacto
                </label>
                <ContactoDropdown
                  value={formContactoId}
                  onChange={setFormContactoId}
                  contactos={contactos}
                  disabled={!formHospitalId}
                />
              </div>
            </div>

            {/* Row 2: Asunto + Duración */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Asunto <span className="text-red-400">*</span>
                </label>
                <input
                  value={formAsunto}
                  onChange={e => setFormAsunto(e.target.value)}
                  placeholder="Consulta disponibilidad, seguimiento propuesta..."
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-800 dark:text-gray-200 placeholder-gray-400 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Duracion
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={formDuracion}
                    onChange={e => setFormDuracion(e.target.value)}
                    placeholder="15"
                    className="w-full px-3.5 py-2.5 pr-12 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-800 dark:text-gray-200 placeholder-gray-400 min-h-[44px]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">min</span>
                </div>
              </div>
            </div>

            {/* Row 3: Notas + Resultado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Notas
                </label>
                <textarea
                  value={formNotas}
                  onChange={e => setFormNotas(e.target.value)}
                  rows={2}
                  placeholder="Detalles de la conversacion..."
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-800 dark:text-gray-200 placeholder-gray-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Resultado
                </label>
                <select
                  value={formResultado}
                  onChange={e => setFormResultado(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-800 dark:text-gray-200 min-h-[44px] cursor-pointer"
                >
                  <option value="">Sin resultado</option>
                  {RESULTADOS.map(r => (
                    <option key={r.value} value={r.value}>{r.value}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 4: Seguimiento + Submit */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer min-h-[44px]">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formSeguimiento}
                    onClick={() => setFormSeguimiento(!formSeguimiento)}
                    className={`relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                      formSeguimiento ? "" : "bg-gray-200 dark:bg-gray-700"
                    }`}
                    style={formSeguimiento ? { backgroundColor: TEAL } : undefined}
                  >
                    <span
                      className={`absolute left-0 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                        formSeguimiento ? "translate-x-[18px]" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Requiere seguimiento</span>
                </label>
                {formSeguimiento && (
                  <input
                    type="date"
                    value={formFechaSeguimiento}
                    onChange={e => setFormFechaSeguimiento(e.target.value)}
                    className="px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-800 dark:text-gray-200 min-h-[44px]"
                  />
                )}
              </div>
              <button
                type="submit"
                disabled={submitting || !formHospitalId || !formAsunto.trim()}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] w-full sm:w-auto"
                style={{ backgroundColor: TEAL }}
              >
                <IconPhone size={14} />
                {submitting ? "Registrando..." : "Registrar llamada"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Filters Bar ──────────────────────────────────────────────────────── */}
      <div className="mb-4 space-y-3">
        {/* Date pills + search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {FILTROS_FECHA.map(f => (
              <button
                key={f.value}
                onClick={() => setFiltroFecha(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap min-h-[32px] ${
                  filtroFecha === f.value
                    ? "text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                style={filtroFecha === f.value ? { backgroundColor: TEAL } : undefined}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar en asunto, notas, hospital..."
              className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-800 dark:text-gray-200 placeholder-gray-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-1"
              >
                <IconX size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Resultado pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFiltroResultado("")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              !filtroResultado
                ? "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800"
                : "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            Todos
          </button>
          {RESULTADOS.map(r => (
            <button
              key={r.value}
              onClick={() => setFiltroResultado(filtroResultado === r.value ? "" : r.value)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap"
              style={
                filtroResultado === r.value
                  ? { backgroundColor: r.color, color: "white" }
                  : { backgroundColor: r.bg, color: r.textColor }
              }
            >
              {r.value}
            </button>
          ))}
        </div>
      </div>

      {/* ── Call Log ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-4">
              <Skeleton className="w-1 h-16 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="document"
          title={search || filtroResultado ? "Sin resultados" : "Sin llamadas registradas"}
          description={search || filtroResultado ? "Prueba con otros filtros o terminos de busqueda." : "Registra tu primera llamada con el formulario de arriba."}
          action={!search && !filtroResultado ? { label: "Registrar llamada", onClick: () => { setFormOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }) } } : undefined}
        />
      ) : (
        <div className="stagger-grid space-y-2.5">
          {filtered.map(ll => {
            const isExpanded = expandedId === ll.id
            const isEditing = editingId === ll.id
            const rStyle = getResultadoStyle(ll.resultado)
            const barColor = getBarColor(ll.resultado, ll.seguimiento)

            return (
              <div
                key={ll.id}
                className={`card-hover bg-white dark:bg-gray-900 rounded-xl border transition-all overflow-hidden ${
                  isExpanded
                    ? "border-gray-200 dark:border-gray-700 shadow-md"
                    : "border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md"
                }`}
              >
                {/* Main row */}
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) return
                    setExpandedId(isExpanded ? null : ll.id)
                  }}
                  className="w-full text-left flex items-stretch gap-0 cursor-pointer"
                >
                  {/* Color bar */}
                  <div
                    className="w-1 shrink-0 rounded-l-xl"
                    style={{ backgroundColor: barColor }}
                  />

                  <div className="flex-1 flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 min-w-0">
                    {/* Hospital + contact */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{ll.hospital.nombre}</p>
                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 hidden sm:inline">{ll.hospital.ciudad}</span>
                      </div>
                      {ll.contacto && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 10.3a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.62 0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 14.92z"/>
                          </svg>
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{ll.contacto.nombre}</span>
                        </div>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{ll.asunto}</p>
                    </div>

                    {/* Right side badges */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {/* Duration badge */}
                      {ll.duracion && ll.duracion > 0 && (
                        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                          {formatDuration(ll.duracion)}
                        </span>
                      )}
                      {/* Resultado pill */}
                      {ll.resultado && (
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{ backgroundColor: rStyle.bg, color: rStyle.textColor }}
                        >
                          {ll.resultado}
                        </span>
                      )}
                      {/* Seguimiento */}
                      {ll.seguimiento && (
                        <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                          </svg>
                          {formatFechaSeguimiento(ll.fechaSeguimiento)}
                        </span>
                      )}
                      {/* Time */}
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {timeAgo(ll.fecha)}
                        {userRol === "ADMIN" && ll.usuario && (
                          <span> · {ll.usuario.nombre.split(" ")[0]}</span>
                        )}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-800">
                    {isEditing ? (
                      /* ── Edit form ── */
                      <div className="p-4 sm:p-5 space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Asunto</label>
                          <input
                            value={editForm.asunto}
                            onChange={e => setEditForm(p => ({ ...p, asunto: e.target.value }))}
                            className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-800 dark:text-gray-200 min-h-[44px]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Notas</label>
                          <textarea
                            value={editForm.notas}
                            onChange={e => setEditForm(p => ({ ...p, notas: e.target.value }))}
                            rows={3}
                            className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-800 dark:text-gray-200 resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Resultado</label>
                            <select
                              value={editForm.resultado}
                              onChange={e => setEditForm(p => ({ ...p, resultado: e.target.value }))}
                              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-800 dark:text-gray-200 min-h-[44px] cursor-pointer"
                            >
                              <option value="">Sin resultado</option>
                              {RESULTADOS.map(r => <option key={r.value} value={r.value}>{r.value}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Duracion (min)</label>
                            <input
                              type="number"
                              min="1"
                              value={editForm.duracion}
                              onChange={e => setEditForm(p => ({ ...p, duracion: e.target.value }))}
                              className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-800 dark:text-gray-200 min-h-[44px]"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={editForm.seguimiento}
                              onClick={() => setEditForm(p => ({ ...p, seguimiento: !p.seguimiento }))}
                              className={`relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                                editForm.seguimiento ? "" : "bg-gray-200 dark:bg-gray-700"
                              }`}
                              style={editForm.seguimiento ? { backgroundColor: TEAL } : undefined}
                            >
                              <span className={`absolute left-0 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${editForm.seguimiento ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                            </button>
                            <span className="text-sm text-gray-700 dark:text-gray-300">Seguimiento</span>
                          </label>
                          {editForm.seguimiento && (
                            <input
                              type="date"
                              value={editForm.fechaSeguimiento}
                              onChange={e => setEditForm(p => ({ ...p, fechaSeguimiento: e.target.value }))}
                              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-800 dark:text-gray-200"
                            />
                          )}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors min-h-[44px]"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={saveEdit}
                            disabled={saving || !editForm.asunto.trim()}
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer hover:opacity-90 disabled:opacity-50 transition-all min-h-[44px]"
                            style={{ backgroundColor: TEAL }}
                          >
                            {saving ? "Guardando..." : "Guardar cambios"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Details view ── */
                      <div className="p-4 sm:p-5">
                        {ll.notas && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Notas</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{ll.notas}</p>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mb-4">
                          <span>{new Date(ll.fecha).toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          {ll.contacto?.cargo && <span>· {ll.contacto.cargo}</span>}
                          {ll.contacto?.telefono && <span>· {ll.contacto.telefono}</span>}
                          <span>· {ll.usuario.nombre}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(ll)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors min-h-[36px]"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Editar
                          </button>
                          <Link
                            href={`/hospitales/${ll.hospital.id}`}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors min-h-[36px]"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                              <polyline points="9 22 9 12 15 12 15 22"/>
                            </svg>
                            Ver hospital
                          </Link>
                          <div className="flex-1" />
                          <button
                            onClick={() => setDeleteId(ll.id)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-colors min-h-[36px]"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 0V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/>
                            </svg>
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Delete confirmation modal ────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) setDeleteId(null) }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Eliminar llamada</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Esta accion no se puede deshacer</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 cursor-pointer transition-colors disabled:opacity-50 min-h-[44px]"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
