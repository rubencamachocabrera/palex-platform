"use client"

import { useEffect, useRef, useState } from "react"
import { useToast } from "@/components/Toast"
import { TEAL, ORANGE } from "@/lib/brand"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Zona { id: string; nombre: string }
interface Usuario {
  id: string; nombre: string; email: string
  rol: string; activo: boolean; creadoEn: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = ["ADMIN", "VENTAS", "PROYECTOS", "TECNICO"] as const
type Rol = typeof ROLES[number]

interface RolConfig { label: string; dot: string; bg: string; text: string }

const ROL_CONFIG: Record<Rol, RolConfig> = {
  ADMIN:     { label: "Admin",     dot: "#6366f1", bg: "#eef2ff", text: "#4338ca" },
  VENTAS:    { label: "Ventas",    dot: ORANGE,    bg: "#fff7ed", text: "#c2410c" },
  PROYECTOS: { label: "Proyectos", dot: TEAL,      bg: "#f0fdfa", text: "#0f766e" },
  TECNICO:   { label: "Técnico",   dot: "#0ea5e9", bg: "#f0f9ff", text: "#0369a1" },
}

const INPUT = "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:border-transparent bg-white dark:bg-gray-800 transition-shadow"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avatarColor(nombre: string): string {
  const colors = ["#0d9488","#0891b2","#7c3aed","#db2777","#ea580c","#65a30d","#2563eb","#9333ea"]
  let h = 0
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) & 0xffff
  return colors[h % colors.length]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

function isRol(v: string): v is Rol {
  return ROLES.includes(v as Rol)
}

// ─── Icons ────────────────────────────────────────────────────────────────────

interface IconProps { className?: string; style?: React.CSSProperties }

function IconPlus({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
    </svg>
  )
}

function IconSearch({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M9 3a6 6 0 100 12A6 6 0 009 3zm-7 6a7 7 0 1112.452 4.391l3.328 3.329a1 1 0 01-1.414 1.414l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
    </svg>
  )
}

function IconX({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  )
}

function IconPencil({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  )
}

function IconMapPin({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
    </svg>
  )
}

function IconTrash({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  )
}

function IconUsers({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
    </svg>
  )
}

function IconUserCheck({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM8 12.5A6.5 6.5 0 001.5 19H10a6.5 6.5 0 00-2-4.583V12.5z" />
      <path fillRule="evenodd" d="M14 10a3 3 0 110 6 3 3 0 010-6zm-1.293 3.293a1 1 0 011.414 0l1 1a1 1 0 01-1.414 1.414l-1-1a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  )
}

function IconUserX({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M11 6a3 3 0 11-6 0 3 3 0 016 0zM2.5 19a6.5 6.5 0 0113 0H2.5z" />
      <path fillRule="evenodd" d="M13.707 12.293a1 1 0 00-1.414 1.414L13.586 15l-1.293 1.293a1 1 0 101.414 1.414L15 16.414l1.293 1.293a1 1 0 001.414-1.414L16.414 15l1.293-1.293a1 1 0 00-1.414-1.414L15 13.586l-1.293-1.293z" clipRule="evenodd" />
    </svg>
  )
}

function IconShield({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  )
}

function IconSpinner({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="grid grid-cols-12 items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 min-w-[640px]">
      <div className="col-span-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="animate-pulse h-3 bg-gray-100 rounded w-3/4" />
          <div className="animate-pulse h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
      <div className="col-span-2"><div className="animate-pulse h-3 bg-gray-100 rounded w-20" /></div>
      <div className="col-span-2"><div className="animate-pulse h-3 bg-gray-100 rounded w-10" /></div>
      <div className="col-span-2"><div className="animate-pulse h-3 bg-gray-100 rounded w-20" /></div>
      <div className="col-span-2 flex gap-1.5">
        <div className="w-7 h-7 rounded-lg bg-gray-100 animate-pulse" />
        <div className="w-7 h-7 rounded-lg bg-gray-100 animate-pulse" />
        <div className="w-7 h-7 rounded-lg bg-gray-100 animate-pulse" />
      </div>
    </div>
  )
}

interface RolPillProps { rol: string; size?: "sm" | "md" }
function RolPill({ rol, size = "sm" }: RolPillProps) {
  const cfg = isRol(rol) ? ROL_CONFIG[rol] : null
  if (!cfg) return <span className="text-xs text-gray-400">{rol}</span>
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs"}`}
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const { success, error: toastError } = useToast()

  // Data state
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [zonas, setZonas] = useState<Zona[]>([])
  const [loading, setLoading] = useState(true)

  // Filter state
  const [busqueda, setBusqueda] = useState("")
  const [rolFiltro, setRolFiltro] = useState<Rol | "TODOS">("TODOS")

  // Modal nuevo usuario
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "VENTAS" as Rol })
  const [guardando, setGuardando] = useState(false)
  const [formError, setFormError] = useState("")
  const nombreInputRef = useRef<HTMLInputElement>(null)

  // Modal editar usuario
  const [editModal, setEditModal] = useState<Usuario | null>(null)
  const [editForm, setEditForm] = useState({ nombre: "", email: "", rol: "VENTAS" as Rol })
  const [guardandoEdit, setGuardandoEdit] = useState(false)
  const [resetingOnboarding, setResetingOnboarding] = useState(false)
  const editNombreRef = useRef<HTMLInputElement>(null)

  // Modal zonas
  const [zonaModal, setZonaModal] = useState<Usuario | null>(null)
  const [zonasSeleccionadas, setZonasSeleccionadas] = useState<string[]>([])
  const [guardandoZonas, setGuardandoZonas] = useState(false)

  // ── Data loading ────────────────────────────────────────────────────────────

  async function cargar() {
    const [u, z] = await Promise.all([
      fetch("/api/usuarios").then(r => r.json()),
      fetch("/api/zonas").then(r => r.json()),
    ])
    setUsuarios(Array.isArray(u) ? u : [])
    setZonas(Array.isArray(z) ? z : [])
    setLoading(false)
  }

  useEffect(() => { void cargar() }, [])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (mostrarForm) { setMostrarForm(false); setFormError("") }
        if (editModal) setEditModal(null)
        if (zonaModal) setZonaModal(null)
      }
      if (e.key === "Enter" && editModal && !guardandoEdit) {
        void guardarEdit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [mostrarForm, editModal, zonaModal, guardandoEdit])

  // Focus management
  useEffect(() => {
    if (mostrarForm) setTimeout(() => nombreInputRef.current?.focus(), 50)
  }, [mostrarForm])

  useEffect(() => {
    if (editModal) setTimeout(() => editNombreRef.current?.focus(), 50)
  }, [editModal])

  // ── Filtering ───────────────────────────────────────────────────────────────

  const usuariosFiltrados = usuarios.filter(u => {
    const matchBusqueda = busqueda === "" ||
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email.toLowerCase().includes(busqueda.toLowerCase())
    const matchRol = rolFiltro === "TODOS" || u.rol === rolFiltro
    return matchBusqueda && matchRol
  })

  // ── KPI calculations ────────────────────────────────────────────────────────

  const totalUsuarios = usuarios.length
  const totalActivos  = usuarios.filter(u => u.activo).length
  const totalInactivos = usuarios.filter(u => !u.activo).length
  const totalAdmins   = usuarios.filter(u => u.rol === "ADMIN").length

  // ── Business logic ──────────────────────────────────────────────────────────

  async function crearUsuario(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setFormError("")
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const data = await res.json() as { error?: string }
      setFormError(data.error ?? "Error al crear usuario")
      setGuardando(false)
      return
    }
    setForm({ nombre: "", email: "", password: "", rol: "VENTAS" })
    setMostrarForm(false)
    setFormError("")
    success("Usuario creado correctamente")
    await cargar()
    setGuardando(false)
  }

  async function toggleActivo(id: string, activo: boolean) {
    // optimistic: flip in-place so the list never reorders
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, activo: !activo } : u))
    const r = await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !activo }),
    })
    if (!r.ok) {
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, activo } : u))
      toastError("Error al cambiar el estado del usuario")
    }
  }

  function abrirEdit(u: Usuario) {
    setEditModal(u)
    setEditForm({ nombre: u.nombre, email: u.email, rol: isRol(u.rol) ? u.rol : "VENTAS" })
  }

  async function guardarEdit() {
    if (!editModal) return
    setGuardandoEdit(true)
    const r = await fetch(`/api/usuarios/${editModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: editForm.nombre.trim(), email: editForm.email.trim(), rol: editForm.rol }),
    })
    setGuardandoEdit(false)
    if (r.ok) {
      setEditModal(null)
      success("Usuario actualizado")
      await cargar()
    } else {
      const d = await r.json() as { error?: string }
      toastError(d.error ?? "Error al guardar")
    }
  }

  async function resetOnboarding() {
    if (!editModal) return
    setResetingOnboarding(true)
    const r = await fetch(`/api/usuarios/${editModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboardingCompletado: false }),
    })
    setResetingOnboarding(false)
    if (r.ok) {
      success("Onboarding reiniciado para " + editModal.nombre)
    } else {
      toastError("Error al reiniciar onboarding")
    }
  }

  async function eliminarUsuario(u: Usuario) {
    if (!confirm(`¿Eliminar a ${u.nombre}? Esta acción no se puede deshacer.`)) return
    const r = await fetch(`/api/usuarios/${u.id}`, { method: "DELETE" })
    if (r.ok) {
      success("Usuario eliminado")
      await cargar()
    } else {
      const d = await r.json() as { error?: string }
      toastError(d.error ?? "Error al eliminar")
    }
  }

  async function abrirZonas(u: Usuario) {
    setZonaModal(u)
    const res = await fetch(`/api/usuarios/${u.id}`)
    const data = await res.json() as { zonas?: string[] }
    setZonasSeleccionadas(Array.isArray(data.zonas) ? data.zonas : [])
  }

  async function guardarZonas() {
    if (!zonaModal) return
    setGuardandoZonas(true)
    await fetch(`/api/usuarios/${zonaModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zonas: zonasSeleccionadas }),
    })
    setGuardandoZonas(false)
    setZonaModal(null)
    success("Zonas asignadas correctamente")
    await cargar()
  }

  function toggleZona(zonaId: string) {
    setZonasSeleccionadas(prev =>
      prev.includes(zonaId) ? prev.filter(z => z !== zonaId) : [...prev, zonaId]
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Usuarios del sistema</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {loading ? "Cargando..." : `${totalUsuarios} usuario${totalUsuarios !== 1 ? "s" : ""} registrado${totalUsuarios !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => { setMostrarForm(true); setFormError("") }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 min-h-[44px] shrink-0"
          style={{ backgroundColor: ORANGE }}
        >
          <IconPlus className="w-4 h-4" />
          Nuevo usuario
        </button>
      </div>

      {/* ── KPI chips ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total */}
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#f0fdfa" }}>
            <IconUsers className="w-5 h-5" style={{ color: TEAL }} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium leading-none mb-0.5">Total</p>
            <p className="text-xl font-bold leading-none" style={{ color: TEAL }}>{loading ? "—" : totalUsuarios}</p>
          </div>
        </div>
        {/* Activos */}
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#f0fdf4" }}>
            <IconUserCheck className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium leading-none mb-0.5">Activos</p>
            <p className="text-xl font-bold text-green-600 leading-none">{loading ? "—" : totalActivos}</p>
          </div>
        </div>
        {/* Inactivos */}
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gray-50">
            <IconUserX className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium leading-none mb-0.5">Inactivos</p>
            <p className="text-xl font-bold text-gray-400 leading-none">{loading ? "—" : totalInactivos}</p>
          </div>
        </div>
        {/* Admins */}
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#eef2ff" }}>
            <IconShield className="w-5 h-5" style={{ color: "#6366f1" }} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium leading-none mb-0.5">Admins</p>
            <p className="text-xl font-bold leading-none" style={{ color: "#6366f1" }}>{loading ? "—" : totalAdmins}</p>
          </div>
        </div>
      </div>

      {/* ── Filter row ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar usuario..."
            className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-shadow min-h-[44px]"
            style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Limpiar búsqueda"
            >
              <IconX className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Role pills */}
        <div className="flex flex-wrap gap-2 items-center">
          {(["TODOS", ...ROLES] as const).map(rol => {
            const isActive = rolFiltro === rol
            const count = rol === "TODOS" ? totalUsuarios : usuarios.filter(u => u.rol === rol).length
            const cfg = rol !== "TODOS" && isRol(rol) ? ROL_CONFIG[rol] : null
            return (
              <button
                key={rol}
                onClick={() => setRolFiltro(rol)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all min-h-[36px]"
                style={
                  isActive
                    ? cfg
                      ? { backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.dot + "60" }
                      : { backgroundColor: TEAL, color: "#fff", borderColor: TEAL }
                    : { backgroundColor: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }
                }
              >
                {rol === "TODOS" ? "Todos" : cfg?.label ?? rol}
                <span
                  className="inline-flex items-center justify-center rounded-full text-xs font-bold w-4 h-4 leading-none"
                  style={
                    isActive
                      ? cfg
                        ? { backgroundColor: cfg.dot + "25", color: cfg.text }
                        : { backgroundColor: "rgba(255,255,255,0.3)", color: "#fff" }
                      : { backgroundColor: "#f3f4f6", color: "#6b7280" }
                  }
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden overflow-x-auto">

        {/* Table header */}
        <div className="grid grid-cols-12 items-center gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50/60 min-w-[640px]">
          <div className="col-span-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Usuario</div>
          <div className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Rol</div>
          <div className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</div>
          <div className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Creado</div>
          <div className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Acciones</div>
        </div>

        {/* Skeleton / rows / empty */}
        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-50">
              <IconUsers className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400 font-medium">
              {busqueda || rolFiltro !== "TODOS" ? "Ningún usuario coincide con los filtros" : "No hay usuarios registrados"}
            </p>
            {(busqueda || rolFiltro !== "TODOS") && (
              <button
                onClick={() => { setBusqueda(""); setRolFiltro("TODOS") }}
                className="text-xs font-semibold underline underline-offset-2"
                style={{ color: TEAL }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          usuariosFiltrados.map((u, idx) => {
            const color = avatarColor(u.nombre)
            const initials = u.nombre.trim().charAt(0).toUpperCase()
            return (
              <div
                key={u.id}
                className="grid grid-cols-12 items-center gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors border-b border-gray-50 last:border-0 min-w-[640px]"
                style={idx % 2 === 0 ? {} : { backgroundColor: "rgba(249,250,251,0.4)" }}
              >
                {/* Col: Usuario */}
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold select-none"
                      style={{ backgroundColor: color }}
                    >
                      {initials}
                    </div>
                    {/* Status dot */}
                    <span
                      className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white"
                      style={{ backgroundColor: u.activo ? "#22c55e" : "#d1d5db" }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{u.nombre}</p>
                    <p className="text-xs text-gray-400 truncate leading-tight mt-0.5">{u.email}</p>
                  </div>
                </div>

                {/* Col: Rol */}
                <div className="col-span-2">
                  <RolPill rol={u.rol} />
                </div>

                {/* Col: Estado (toggle switch) */}
                <div className="col-span-2">
                  <button
                    onClick={() => toggleActivo(u.id, u.activo)}
                    className="relative inline-flex items-center rounded-full transition-colors shrink-0"
                    style={{ width: 36, height: 20, backgroundColor: u.activo ? TEAL : "#e5e7eb", padding: 3 }}
                    aria-label={u.activo ? "Desactivar usuario" : "Activar usuario"}
                    title={u.activo ? "Activo — clic para desactivar" : "Inactivo — clic para activar"}
                  >
                    <span
                      className="inline-block rounded-full bg-white shadow-sm transition-transform"
                      style={{ width: 14, height: 14, transform: u.activo ? "translateX(16px)" : "translateX(0)" }}
                    />
                  </button>
                </div>

                {/* Col: Creado */}
                <div className="col-span-2">
                  <span className="text-xs text-gray-400">{formatDate(u.creadoEn)}</span>
                </div>

                {/* Col: Acciones */}
                <div className="col-span-2 flex items-center gap-1.5">
                  <button
                    onClick={() => abrirEdit(u)}
                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors"
                    aria-label={`Editar ${u.nombre}`}
                    title="Editar usuario"
                  >
                    <IconPencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => abrirZonas(u)}
                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors"
                    aria-label={`Gestionar zonas de ${u.nombre}`}
                    title="Gestionar zonas"
                  >
                    <IconMapPin className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => eliminarUsuario(u)}
                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
                    aria-label={`Eliminar ${u.nombre}`}
                    title="Eliminar usuario"
                  >
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })
        )}

        {/* Footer */}
        {!loading && usuariosFiltrados.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/40">
            <p className="text-xs text-gray-400">
              Mostrando <span className="font-semibold text-gray-600">{usuariosFiltrados.length}</span> de <span className="font-semibold text-gray-600">{totalUsuarios}</span> usuarios
            </p>
          </div>
        )}
      </div>

      {/* ── Modal: Nuevo usuario ── */}
      {mostrarForm && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) { setMostrarForm(false); setFormError("") } }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#fff7ed" }}>
                  <IconPlus className="w-5 h-5" style={{ color: ORANGE }} />
                </div>
                <h2 className="text-base font-bold text-gray-900">Nuevo usuario</h2>
              </div>
              <button
                onClick={() => { setMostrarForm(false); setFormError("") }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Cerrar"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={crearUsuario} className="px-6 py-5 space-y-5">
              {/* Datos de acceso */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos de acceso</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                    <input
                      ref={nombreInputRef}
                      required
                      value={form.nombre}
                      onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                      className={INPUT}
                      style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
                      placeholder="Nombre completo"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className={INPUT}
                      style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
                      placeholder="usuario@palex.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña</label>
                    <input
                      required
                      type="password"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className={INPUT}
                      style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
                      placeholder="Mínimo 8 caracteres"
                      minLength={8}
                    />
                  </div>
                </div>
              </div>

              {/* Rol inicial */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Rol inicial</p>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(r => {
                    const cfg = ROL_CONFIG[r]
                    const isSelected = form.rol === r
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, rol: r }))}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all min-h-[44px]"
                        style={
                          isSelected
                            ? { backgroundColor: cfg.bg, borderColor: cfg.dot + "80", color: cfg.text }
                            : { backgroundColor: "#fff", borderColor: "#e5e7eb", color: "#6b7280" }
                        }
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: isSelected ? cfg.dot : "#d1d5db" }}
                        />
                        <span className="text-sm font-semibold">{cfg.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Error */}
              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600"
                >
                  <IconX className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                  {formError}
                </div>
              )}

              {/* Footer */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setMostrarForm(false); setFormError("") }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90 inline-flex items-center justify-center gap-2 min-h-[44px]"
                  style={{ backgroundColor: ORANGE }}
                >
                  {guardando ? (
                    <>
                      <IconSpinner className="w-4 h-4 animate-spin" />
                      Creando...
                    </>
                  ) : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Editar usuario ── */}
      {editModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setEditModal(null) }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: avatarColor(editModal.nombre) }}
                >
                  {editModal.nombre.trim().charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 leading-tight">Editar usuario</h2>
                  <p className="text-xs text-gray-400 leading-tight">{editModal.email}</p>
                </div>
              </div>
              <button
                onClick={() => setEditModal(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Cerrar"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                <input
                  ref={editNombreRef}
                  value={editForm.nombre}
                  onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))}
                  className={INPUT}
                  style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  className={INPUT}
                  style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Rol</p>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(r => {
                    const cfg = ROL_CONFIG[r]
                    const isSelected = editForm.rol === r
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setEditForm(f => ({ ...f, rol: r }))}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all min-h-[44px]"
                        style={
                          isSelected
                            ? { backgroundColor: cfg.bg, borderColor: cfg.dot + "80", color: cfg.text }
                            : { backgroundColor: "#fff", borderColor: "#e5e7eb", color: "#6b7280" }
                        }
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: isSelected ? cfg.dot : "#d1d5db" }}
                        />
                        <span className="text-sm font-semibold">{cfg.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Reiniciar onboarding */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Onboarding</p>
                    <p className="text-xs text-gray-400 mt-0.5">Reiniciar el tour de bienvenida</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void resetOnboarding()}
                    disabled={resetingOnboarding}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors min-h-[36px] disabled:opacity-60"
                  >
                    {resetingOnboarding ? (
                      <IconSpinner className="w-3 h-3 animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                    )}
                    Reiniciar
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setEditModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => void guardarEdit()}
                  disabled={guardandoEdit || !editForm.nombre.trim() || !editForm.email.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90 inline-flex items-center justify-center gap-2 min-h-[44px]"
                  style={{ backgroundColor: TEAL }}
                >
                  {guardandoEdit ? (
                    <>
                      <IconSpinner className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Gestionar zonas ── */}
      {zonaModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setZonaModal(null) }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#f0fdfa" }}>
                  <IconMapPin className="w-5 h-5" style={{ color: TEAL }} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 leading-tight">Gestionar zonas</h2>
                  <p className="text-xs text-gray-400 leading-tight">{zonaModal.nombre}</p>
                </div>
              </div>
              <button
                onClick={() => setZonaModal(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Cerrar"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5">
              {zonas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <IconMapPin className="w-8 h-8 text-gray-200" />
                  <p className="text-sm text-gray-400 text-center">Sin zonas disponibles</p>
                  <p className="text-xs text-gray-300 text-center">Crea zonas primero desde el panel de zonas</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 mb-5 min-h-[80px]">
                  {zonas.map(z => {
                    const isSelected = zonasSeleccionadas.includes(z.id)
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => toggleZona(z.id)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium transition-all min-h-[40px]"
                        style={
                          isSelected
                            ? { backgroundColor: TEAL, borderColor: TEAL, color: "#fff" }
                            : { backgroundColor: "#fff", borderColor: "#e5e7eb", color: "#6b7280" }
                        }
                      >
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : ORANGE }}
                        >
                          {z.nombre.charAt(0).toUpperCase()}
                        </span>
                        {z.nombre}
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setZonaModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => void guardarZonas()}
                  disabled={guardandoZonas}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity hover:opacity-90 inline-flex items-center justify-center gap-2 min-h-[44px]"
                  style={{ backgroundColor: ORANGE }}
                >
                  {guardandoZonas ? (
                    <>
                      <IconSpinner className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : "Guardar zonas"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
