"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/components/Toast"
import { TEAL } from "@/lib/brand"

const ROL_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  ADMIN:     { label: "Administrador", bg: "#eef2ff", text: "#4338ca" },
  VENTAS:    { label: "Ventas",        bg: "#fff7ed", text: "#c2410c" },
  PROYECTOS: { label: "Proyectos",     bg: "#f0fdfa", text: "#0f766e" },
  TECNICO:   { label: "Técnico",       bg: "#f0f9ff", text: "#0369a1" },
}

function avatarColor(nombre: string): string {
  const colors = ["#0d9488","#0891b2","#7c3aed","#db2777","#ea580c","#65a30d","#2563eb","#9333ea"]
  let h = 0; for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) & 0xffff
  return colors[h % colors.length]
}

interface PerfilData { id: string; nombre: string; email: string; rol: string; creadoEn: string; calendarToken?: string }
interface ConfigApp { id: number; crmActivo: boolean }

// ── Icons ──────────────────────────────────────────────────────────────────────
function IconUser() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
  )
}
function IconLock() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
    </svg>
  )
}
function IconCog() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  )
}
function IconEye({ off }: { off?: boolean }) {
  return off ? (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
    </svg>
  ) : (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
  )
}
function IconSpinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
function IconCalendar() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
function IconClipboard() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  )
}
function IconCheck() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function IconBell() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
function IconCheckCircleSm() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
function IconAlertCircle() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

const INPUT = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"

// ── Section card ───────────────────────────────────────────────────────────────
function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#f0fdfa", color: TEAL }}>
          {icon}
        </div>
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="px-6 py-5">
        {children}
      </div>
    </div>
  )
}

export default function PerfilPage() {
  const { success, error: toastError } = useToast()
  const [perfil, setPerfil] = useState<PerfilData | null>(null)
  const [nombre, setNombre] = useState("")
  const [pwActual, setPwActual] = useState("")
  const [pwNueva, setPwNueva] = useState("")
  const [pwConfirm, setPwConfirm] = useState("")
  const [showPwActual, setShowPwActual] = useState(false)
  const [showPwNueva, setShowPwNueva] = useState(false)
  const [guardandoNombre, setGuardandoNombre] = useState(false)
  const [guardandoPw, setGuardandoPw] = useState(false)
  const [config, setConfig] = useState<ConfigApp | null>(null)
  const [togglingCrm, setTogglingCrm] = useState(false)
  const [calendarCopiado, setCalendarCopiado] = useState(false)
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">("unsupported")

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPerm(Notification.permission)
    }
  }, [])

  async function requestNotifPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return
    try {
      const result = await Notification.requestPermission()
      setNotifPerm(result)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetch("/api/perfil")
      .then(r => r.json())
      .then((d: PerfilData) => {
        setPerfil(d)
        setNombre(d.nombre ?? "")
        if (d.rol === "ADMIN") {
          fetch("/api/config").then(r => r.ok ? r.json() : null).then(c => { if (c) setConfig(c) }).catch(() => {})
        }
      })
      .catch(() => {})
  }, [])

  async function guardarNombre(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    setGuardandoNombre(true)
    const r = await fetch("/api/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombre.trim() }),
    })
    const d = await r.json()
    setGuardandoNombre(false)
    if (r.ok) {
      setPerfil(p => p ? { ...p, nombre: d.nombre } : p)
      success("Nombre actualizado correctamente")
    } else {
      toastError(d.error ?? "Error al guardar")
    }
  }

  async function cambiarPassword(e: React.FormEvent) {
    e.preventDefault()
    if (pwNueva !== pwConfirm) { toastError("Las contraseñas no coinciden"); return }
    if (pwNueva.length < 8) { toastError("La contraseña debe tener al menos 8 caracteres"); return }
    setGuardandoPw(true)
    const r = await fetch("/api/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passwordActual: pwActual, passwordNueva: pwNueva }),
    })
    const d = await r.json()
    setGuardandoPw(false)
    if (r.ok) {
      setPwActual(""); setPwNueva(""); setPwConfirm("")
      success("Contraseña actualizada correctamente")
    } else {
      toastError(d.error ?? "Error al cambiar contraseña")
    }
  }

  async function toggleCrm() {
    if (!config) return
    setTogglingCrm(true)
    try {
      const r = await fetch("/api/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crmActivo: !config.crmActivo }),
      })
      if (!r.ok) { toastError("Error al guardar configuración"); return }
      const updated: ConfigApp = await r.json()
      setConfig(updated)
      success(updated.crmActivo ? "Módulo CRM activado" : "Módulo CRM desactivado")
    } catch {
      toastError("Error de conexión")
    } finally {
      setTogglingCrm(false)
    }
  }

  const calendarUrl = perfil?.calendarToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/calendario/ical?uid=${perfil.id}&token=${perfil.calendarToken}`
    : ""

  async function copiarCalendarUrl() {
    if (!calendarUrl) return
    try {
      await navigator.clipboard.writeText(calendarUrl)
      setCalendarCopiado(true)
      success("URL copiada al portapapeles")
      setTimeout(() => setCalendarCopiado(false), 2000)
    } catch {
      toastError("No se pudo copiar la URL")
    }
  }

  const inicial = (perfil?.nombre ?? "U").charAt(0).toUpperCase()
  const avatarBg = perfil ? avatarColor(perfil.nombre) : TEAL
  const rolCfg = ROL_CONFIG[perfil?.rol ?? ""] ?? null
  const creadoLabel = perfil?.creadoEn
    ? new Date(perfil.creadoEn).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })
    : "—"

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* ── Identity card ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white select-none"
              style={{ backgroundColor: avatarBg }}
            >
              {inicial}
            </div>
            {/* Online dot */}
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {perfil?.nombre ?? <span className="w-32 h-5 inline-block rounded skeleton-shimmer" />}
            </h1>
            <p className="text-sm text-gray-500 truncate mt-0.5">{perfil?.email ?? "—"}</p>
            <div className="flex items-center gap-2 mt-2">
              {rolCfg && (
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: rolCfg.bg, color: rolCfg.text }}
                >
                  {rolCfg.label}
                </span>
              )}
            </div>
          </div>

          {/* Member since */}
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Miembro desde</p>
            <p className="text-sm font-medium text-gray-600">{creadoLabel}</p>
          </div>
        </div>
      </div>

      {/* ── Nombre ── */}
      <SectionCard icon={<IconUser />} title="Nombre de usuario">
        <form onSubmit={guardarNombre} className="flex gap-3">
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Tu nombre completo"
            className={INPUT}
            style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
          />
          <button
            type="submit"
            disabled={guardandoNombre || !nombre.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50 hover:opacity-90 shrink-0 min-h-[44px]"
            style={{ backgroundColor: TEAL }}
          >
            {guardandoNombre ? <><IconSpinner /> Guardando...</> : "Guardar"}
          </button>
        </form>
      </SectionCard>

      {/* ── Contraseña ── */}
      <SectionCard icon={<IconLock />} title="Cambiar contraseña">
        <form onSubmit={cambiarPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Contraseña actual</label>
            <div className="relative">
              <input
                type={showPwActual ? "text" : "password"}
                value={pwActual}
                onChange={e => setPwActual(e.target.value)}
                className={INPUT + " pr-10"}
                style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
                required
                placeholder="Tu contraseña actual"
              />
              <button
                type="button"
                onClick={() => setShowPwActual(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPwActual ? "Ocultar contraseña" : "Ver contraseña"}
              >
                <IconEye off={showPwActual} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Nueva contraseña</label>
            <div className="relative">
              <input
                type={showPwNueva ? "text" : "password"}
                value={pwNueva}
                onChange={e => setPwNueva(e.target.value)}
                className={INPUT + " pr-10"}
                style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPwNueva(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPwNueva ? "Ocultar contraseña" : "Ver contraseña"}
              >
                <IconEye off={showPwNueva} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirmar nueva contraseña</label>
            <input
              type="password"
              value={pwConfirm}
              onChange={e => setPwConfirm(e.target.value)}
              className={INPUT}
              style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
              required
              placeholder="Repite la nueva contraseña"
            />
          </div>
          <button
            type="submit"
            disabled={guardandoPw || !pwActual || !pwNueva || !pwConfirm}
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50 hover:opacity-90 min-h-[44px]"
            style={{ backgroundColor: TEAL }}
          >
            {guardandoPw ? <><IconSpinner /> Actualizando...</> : "Cambiar contraseña"}
          </button>
        </form>
      </SectionCard>

      {/* ── Sincronizar calendario ── */}
      {perfil?.calendarToken && (
        <SectionCard icon={<IconCalendar />} title="Sincronizar calendario">
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Copia esta URL y añadela en Google Calendar, Outlook o Apple Calendar para sincronizar tus visitas, recordatorios e hitos.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={calendarUrl}
                className={INPUT + " text-xs font-mono dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"}
                style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                onClick={copiarCalendarUrl}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 shrink-0 min-h-[44px]"
                style={{ backgroundColor: calendarCopiado ? "#059669" : TEAL }}
              >
                {calendarCopiado ? <><IconCheck /> Copiado</> : <><IconClipboard /> Copiar</>}
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Esta URL es privada. No la compartas con otras personas.
            </p>
          </div>
        </SectionCard>
      )}

      {/* ── Notificaciones del navegador ── */}
      <SectionCard icon={<IconBell />} title="Notificaciones del navegador">
        {notifPerm === "unsupported" ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-400">
              <IconAlertCircle />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tu navegador no soporta notificaciones de escritorio.
            </p>
          </div>
        ) : notifPerm === "granted" ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#f0fdfa", color: TEAL }}>
              <IconCheckCircleSm />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Notificaciones activas</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Recibiras alertas de tareas, visitas pendientes y menciones.
              </p>
            </div>
          </div>
        ) : notifPerm === "denied" ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-red-50 dark:bg-red-950 text-red-500">
              <IconAlertCircle />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Notificaciones bloqueadas</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Habilita las notificaciones desde la configuracion del sitio en tu navegador.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Notificaciones desactivadas</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Activa las notificaciones para recibir alertas de tareas, menciones y recordatorios.
              </p>
            </div>
            <button
              onClick={requestNotifPermission}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 shrink-0 min-h-[44px]"
              style={{ backgroundColor: TEAL }}
            >
              Activar
            </button>
          </div>
        )}
      </SectionCard>

      {/* ── Config sistema — solo ADMIN ── */}
      {perfil?.rol === "ADMIN" && config !== null && (
        <SectionCard icon={<IconCog />} title="Configuración del sistema">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Módulo CRM / Pipeline de ventas</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {config.crmActivo
                  ? "Activo — visible en dashboard y menú lateral"
                  : "Inactivo — oculto del dashboard y menú lateral"}
              </p>
            </div>
            <button
              onClick={toggleCrm}
              disabled={togglingCrm}
              aria-label={config.crmActivo ? "Desactivar CRM" : "Activar CRM"}
              className="flex items-center gap-2.5 shrink-0 disabled:opacity-50"
            >
              <span className="text-xs font-semibold text-gray-500 hidden sm:inline">
                {config.crmActivo ? "Activo" : "Inactivo"}
              </span>
              <span
                className="relative inline-flex items-center rounded-full transition-colors duration-200"
                style={{ width: 44, height: 24, backgroundColor: config.crmActivo ? TEAL : "#d1d5db", padding: 3 }}
              >
                <span
                  className="inline-block rounded-full bg-white shadow-sm transition-transform duration-200"
                  style={{ width: 18, height: 18, transform: config.crmActivo ? "translateX(20px)" : "translateX(0)" }}
                />
              </span>
            </button>
          </div>
        </SectionCard>
      )}

    </div>
  )
}
