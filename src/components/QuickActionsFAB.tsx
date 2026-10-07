"use client"

import { useState, useEffect, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import { TEAL } from "@/lib/brand"
import { dispatchFabAction } from "@/hooks/useFabAction"

// ─── Actions por contexto ─────────────────────────────────────────────────────
interface Action {
  label: string
  icon: React.ReactNode
  href?: string
  onClick?: () => void
  color?: string
}

function useContextActions(pathname: string, router: ReturnType<typeof useRouter>): Action[] {
  if (pathname.startsWith("/hospitales/") && pathname.split("/").length > 2) {
    const id = pathname.split("/")[2]
    return [
      { label: "Nueva visita", icon: <IcoPlusDoc />, href: `/visitas?hospitalId=${id}` },
      { label: "Check-in", icon: <IcoCheckin />, color: TEAL, onClick: () => { dispatchFabAction("fab:checkin", { hospitalId: id }) } },
      { label: "Nueva llamada", icon: <IcoPhone />, onClick: () => { dispatchFabAction("fab:llamada", { hospitalId: id }) } },
      { label: "Nueva incidencia", icon: <IcoAlert />, href: `/incidencias?hospitalId=${id}` },
    ]
  }
  if (pathname === "/hospitales") return [
    { label: "Nuevo hospital", icon: <IcoBuilding />, onClick: () => { dispatchFabAction("fab:nuevo-hospital") } },
    { label: "Ver mapa", icon: <IcoMap />, href: "/mapa" },
  ]
  if (pathname.startsWith("/visitas")) return [
    { label: "Nueva visita", icon: <IcoPlusDoc />, onClick: () => { dispatchFabAction("fab:nueva-visita") } },
    { label: "Ver calendario", icon: <IcoCalendar />, href: "/visitas/calendario" },
  ]
  if (pathname.startsWith("/proyectos/") && pathname.split("/").length > 2) {
    return [
      { label: "Nueva tarea", icon: <IcoPlusDoc />, onClick: () => { dispatchFabAction("fab:nueva-tarea") } },
      { label: "Presentación", icon: <IcoSlides />, href: `${pathname}/presentacion` },
    ]
  }
  if (pathname === "/proyectos") return [
    { label: "Nuevo proyecto", icon: <IcoPlusDoc />, onClick: () => { dispatchFabAction("fab:nuevo-proyecto") } },
  ]
  if (pathname === "/incidencias") return [
    { label: "Nueva incidencia", icon: <IcoAlert />, onClick: () => { dispatchFabAction("fab:nueva-incidencia") } },
  ]
  if (pathname === "/llamadas") return [
    { label: "Registrar llamada", icon: <IcoPhone />, onClick: () => { dispatchFabAction("fab:nueva-llamada") } },
  ]
  if (pathname === "/hardware") return [
    { label: "Nueva unidad", icon: <IcoChip />, onClick: () => { dispatchFabAction("fab:nueva-unidad-hw") } },
  ]
  if (pathname === "/recordatorios") return [
    { label: "Nuevo recordatorio", icon: <IcoPlusDoc />, onClick: () => { dispatchFabAction("fab:nuevo-recordatorio") } },
  ]
  if (pathname === "/notas") return [
    { label: "Nueva nota", icon: <IcoPlusDoc />, onClick: () => { dispatchFabAction("fab:nueva-nota") } },
  ]
  // Rutas sin acciones específicas
  return []
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function QuickActionsFAB() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)

  const actions = useContextActions(pathname, router)

  // No mostrar si no hay acciones o en rutas de auth
  useEffect(() => {
    setOpen(false)
    setVisible(actions.length > 0)
  }, [pathname, actions.length])

  // Cerrar al pulsar Escape
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false)
  }, [])
  useEffect(() => {
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [handleKey])

  if (!visible) return null

  const handleAction = (action: Action) => {
    setOpen(false)
    if (action.href) router.push(action.href)
    else action.onClick?.()
  }

  // Si solo hay 1 acción, el FAB la ejecuta directamente
  if (actions.length === 1) {
    return (
      <button
        onClick={() => handleAction(actions[0])}
        aria-label={actions[0].label}
        title={actions[0].label}
        className="quick-fab nx-fab"
      >
        <span className="nx-fab-icon">{actions[0].icon}</span>
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      {open && <div className="nx-fab-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}

      {/* Menú de acciones: panel de cristal tipo command menu */}
      <div
        className={`nx-fab-menu${open ? " is-open" : ""}`}
        role="menu"
        aria-label="Acciones rápidas"
        aria-hidden={!open}
      >
        <p className="nx-fab-menu-title">Acciones rápidas</p>
        {actions.map((action, i) => (
          <button
            key={action.label}
            role="menuitem"
            tabIndex={open ? 0 : -1}
            onClick={() => handleAction(action)}
            className="quick-fab-action nx-fab-item"
            style={{ "--i": i } as React.CSSProperties}
          >
            <span className="nx-fab-item-icon" style={action.color ? { background: action.color } : undefined}>
              {action.icon}
            </span>
            <span className="flex-1 text-left">{action.label}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nx-fab-item-arrow" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>

      {/* Botón principal */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? "Cerrar menú de acciones" : "Abrir acciones rápidas"}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`quick-fab nx-fab${open ? " is-open" : ""}`}
      >
        <span className="nx-fab-icon nx-fab-plus"><IcoPlus /></span>
      </button>
    </>
  )
}

// ─── Iconos SVG ───────────────────────────────────────────────────────────────
const IcoPlus = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IcoPlusDoc = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
  </svg>
)
const IcoCheckin = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)
const IcoPhone = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.58 4.24 2 2 0 0 1 3.54 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
)
const IcoAlert = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)
const IcoBuilding = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const IcoMap = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
    <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
  </svg>
)
const IcoCalendar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IcoSlides = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
)
const IcoChip = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="7" y="7" width="10" height="10" rx="1"/>
    <path d="M9 7V4M12 7V4M15 7V4M9 20v-3M12 20v-3M15 20v-3M4 9h3M4 12h3M4 15h3M20 9h-3M20 12h-3M20 15h-3"/>
  </svg>
)
