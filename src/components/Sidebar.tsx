"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import { signOut } from "next-auth/react"
import { TEAL, ORANGE } from "@/lib/brand"

interface Props { nombre: string; rol: string }

const ROL_LABEL: Record<string, string> = {
  ADMIN:     "Administrador",
  VENTAS:    "Comercial",
  PROYECTOS: "Proyectos",
  TECNICO:   "Técnico",
}

// ─── Paleta dark ──────────────────────────────────────────────────────────────
const BG   = "#1e3a5c"
const BD   = "rgba(255,255,255,0.13)"
const MUTE = "#8db2ce"
const HTXT = "#d2e8f5"
const HBG  = "rgba(255,255,255,0.11)"
const ABG  = "rgba(0,169,157,0.25)"
const ATXT = "#2dd4bf"
const CARD = "#254c78"

// ─── Iconos SVG ───────────────────────────────────────────────────────────────
const Icons: Record<string, () => React.ReactElement> = {
  Dashboard: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  Hospitales: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Visitas: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  Pipeline: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  Usuarios: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Zonas: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  TodasVisitas: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  Perfil: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  ),
  Logout: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Close: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  PreProyectos: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  Hardware: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
      <rect x="9" y="9" width="6" height="6"/>
      <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
      <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
      <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
      <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
    </svg>
  ),
  Mapa: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Configuracion: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  Datos: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
      <line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
}

// ─── Nav data ─────────────────────────────────────────────────────────────────
interface NavItem  { href: string; label: string; icon: keyof typeof Icons }
interface NavGroup { label?: string; items: NavItem[]; crmOnly?: boolean }

const NAV_GROUPS_ADMIN: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: "Dashboard" }] },
  {
    label: "Gestión",
    items: [
      { href: "/admin/equipo",         label: "Equipo",            icon: "Usuarios" },
      { href: "/admin/usuarios",      label: "Usuarios",          icon: "Usuarios" },
      { href: "/admin/zonas",         label: "Zonas",             icon: "Zonas" },
      { href: "/admin/hospitales",    label: "Hospitales",        icon: "Hospitales" },
      { href: "/mapa",                label: "Mapa",              icon: "Mapa" },
      { href: "/admin/visitas",       label: "Todas las visitas", icon: "TodasVisitas" },
      { href: "/hardware",            label: "Hardware",          icon: "Hardware" },
      { href: "/admin/configuracion", label: "Configuración",     icon: "Configuracion" },
    ],
  },
  {
    label: "CRM",
    crmOnly: true,
    items: [{ href: "/ventas/pipeline", label: "Pipeline", icon: "Pipeline" }],
  },
  {
    label: "Proyectos",
    items: [{ href: "/pre-proyectos", label: "Proyectos", icon: "PreProyectos" }],
  },
  {
    label: "Analítica",
    items: [{ href: "/datos", label: "Explotación de datos", icon: "Datos" }],
  },
]

const NAV_GROUPS_VENTAS: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: "Dashboard" }] },
  {
    label: "Mi trabajo",
    items: [
      { href: "/hospitales",         label: "Mis hospitales", icon: "Hospitales" },
      { href: "/visitas",            label: "Mis visitas",    icon: "Visitas" },
      { href: "/visitas/calendario", label: "Calendario",     icon: "Calendar" },
      { href: "/mapa",               label: "Mapa",           icon: "Mapa" },
    ],
  },
  {
    label: "CRM",
    crmOnly: true,
    items: [{ href: "/ventas/pipeline", label: "Pipeline", icon: "Pipeline" }],
  },
  {
    label: "Proyectos",
    items: [{ href: "/pre-proyectos", label: "Proyectos", icon: "PreProyectos" }],
  },
  {
    label: "Analítica",
    items: [{ href: "/datos", label: "Explotación de datos", icon: "Datos" }],
  },
]

const NAV_GROUPS_PROYECTOS: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: "Dashboard" }] },
  {
    label: "Mi trabajo",
    items: [
      { href: "/hospitales",         label: "Mis hospitales", icon: "Hospitales" },
      { href: "/visitas",            label: "Mis visitas",    icon: "Visitas" },
      { href: "/visitas/calendario", label: "Calendario",     icon: "Calendar" },
      { href: "/mapa",               label: "Mapa",           icon: "Mapa" },
    ],
  },
  {
    label: "Proyectos",
    items: [
      { href: "/pre-proyectos", label: "Proyectos", icon: "PreProyectos" },
      { href: "/hardware",      label: "Hardware",  icon: "Hardware" },
    ],
  },
  {
    label: "Analítica",
    items: [{ href: "/datos", label: "Explotación de datos", icon: "Datos" }],
  },
]

const NAV_GROUPS_TECNICO: NavGroup[] = NAV_GROUPS_PROYECTOS

const NAV_GROUPS: Record<string, NavGroup[]> = {
  ADMIN:     NAV_GROUPS_ADMIN,
  VENTAS:    NAV_GROUPS_VENTAS,
  PROYECTOS: NAV_GROUPS_PROYECTOS,
  TECNICO:   NAV_GROUPS_TECNICO,
}

// ─── NavLink ──────────────────────────────────────────────────────────────────
function NavLink({
  item, active, collapsed, badge, onClick,
}: {
  item: NavItem; active: boolean; collapsed?: boolean; badge?: number; onClick?: () => void
}) {
  const [hover, setHover] = useState(false)
  const Icon = Icons[item.icon]

  const bg    = active ? ABG  : hover ? HBG  : "transparent"
  const color = active ? ATXT : hover ? HTXT : MUTE

  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className="relative flex items-center rounded-lg text-sm font-medium transition-colors duration-150 overflow-hidden"
      style={{
        gap: collapsed ? 0 : 10,
        padding: collapsed ? "9px 0" : "9px 11px",
        justifyContent: collapsed ? "center" : undefined,
        backgroundColor: bg,
        color,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Barra de acento izquierda */}
      <span
        className="absolute left-0 inset-y-1.5 w-[3px] rounded-full transition-all duration-150"
        style={{ backgroundColor: active ? TEAL : "transparent", opacity: active ? 1 : 0 }}
      />

      {/* Icono */}
      <span className="relative shrink-0 flex items-center justify-center" style={{ marginLeft: active && !collapsed ? 3 : 0 }}>
        <Icon />
        {/* Punto badge (modo colapsado) — usa opacidad, nunca sale del DOM */}
        {badge != null && badge > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 w-[7px] h-[7px] rounded-full border-2 transition-opacity duration-200"
            style={{ backgroundColor: ORANGE, borderColor: BG, opacity: collapsed ? 1 : 0, pointerEvents: "none" }}
          />
        )}
      </span>

      {/* Label — siempre en el DOM, visibilidad por opacidad */}
      <span
        className="flex-1 truncate transition-opacity duration-150 select-none"
        style={{ opacity: collapsed ? 0 : 1, pointerEvents: collapsed ? "none" : "auto" }}
        aria-hidden={collapsed}
      >
        {item.label}
      </span>

      {/* Badge pill (modo expandido) */}
      {badge != null && badge > 0 && (
        <span
          className="ml-auto shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none text-white transition-opacity duration-150"
          style={{ backgroundColor: ORANGE, opacity: collapsed ? 0 : 1, pointerEvents: collapsed ? "none" : "auto" }}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  )
}

// ─── SidebarInner ─────────────────────────────────────────────────────────────
function SidebarInner({
  nombre, rol, collapsed, onClose,
}: Props & { collapsed?: boolean; onClose?: () => void }) {
  const pathname = usePathname()
  const groups   = NAV_GROUPS[rol] ?? NAV_GROUPS.VENTAS
  const inicial  = nombre.charAt(0).toUpperCase()
  const allHrefs = useMemo(() => groups.flatMap(g => g.items.map(i => i.href)), [groups])

  const [pipelineBadge,    setPipelineBadge]    = useState(0)
  const [preProyectosBadge, setPreProyectosBadge] = useState(0)
  // Inicializa desde localStorage para evitar el flash del CRM en cada navegación
  const [crmActivo, setCrmActivo] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    try { return localStorage.getItem("palex_crm_activo") === "true" }
    catch { return false }
  })

  useEffect(() => {
    fetch("/api/config")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d != null) {
          setCrmActivo(d.crmActivo)
          try { localStorage.setItem("palex_crm_activo", String(d.crmActivo)) } catch { /* */ }
        }
      })
      .catch(() => {})
  // Re-fetch cuando cambia la ruta — así al volver de /admin/configuracion
  // el sidebar refleja el nuevo valor de crmActivo sin necesidad de reload
  }, [pathname])

  useEffect(() => {
    fetch("/api/notificaciones")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.items) return
        const pipeline = data.items.filter((n: { tipo: string }) => n.tipo === "oportunidad_inactiva").length
        const fases    = data.items.filter((n: { tipo: string }) => n.tipo === "fase_retrasada").length
        if (crmActivo && (rol === "ADMIN" || rol === "VENTAS")) setPipelineBadge(pipeline)
        setPreProyectosBadge(fases)
      })
      .catch(() => {})
  }, [rol, crmActivo])

  return (
    <aside
      className="flex flex-col h-full"
      style={{
        backgroundColor: BG,
        borderRight: `1px solid ${BD}`,
        width: collapsed ? 64 : 256,
        transition: "width 220ms cubic-bezier(.4,0,.2,1)",
        overflow: "hidden",    // ← FIX: clips ocultos durante la transición de ancho
        minWidth: collapsed ? 64 : 256,
      }}
    >

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center shrink-0"
        style={{
          borderBottom: `1px solid ${BD}`,
          padding: collapsed ? "14px 0" : "14px 16px",
          justifyContent: collapsed ? "center" : "space-between",
          minHeight: 64,
        }}
      >
        {collapsed ? (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: TEAL }}
            title="Palex Medical"
          >
            P
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <div className="bg-white rounded-lg px-2 py-1 flex items-center">
                <Image src="/logo-palex.png" alt="Palex Medical" width={96} height={32} priority />
              </div>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase"
                style={{ backgroundColor: ORANGE, color: "white" }}
              >
                InLab
              </span>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="transition-colors p-1.5 rounded-lg"
                style={{ color: MUTE }}
                aria-label="Cerrar menú"
                onMouseEnter={e => (e.currentTarget.style.color = HTXT)}
                onMouseLeave={e => (e.currentTarget.style.color = MUTE)}
              >
                <Icons.Close />
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Navegación ───────────────────────────────────────────────────── */}
      <nav
        className="flex-1 space-y-4"
        style={{ padding: collapsed ? "10px 6px" : "10px 8px", overflowY: "auto", overflowX: "hidden" }}
      >
        {groups.filter(g => !g.crmOnly || crmActivo).map((group, gi) => (
          <div key={gi}>
            {/* Label de grupo — siempre en DOM, opacidad */}
            {group.label && (
              <p
                className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-1 transition-opacity duration-150 select-none"
                style={{
                  color: MUTE,
                  opacity: collapsed ? 0 : 1,
                  height: collapsed ? 0 : "auto",
                  overflow: "hidden",
                  pointerEvents: "none",
                }}
              >
                {group.label}
              </p>
            )}
            {group.label && collapsed && (
              <div className="mx-1 mb-2" style={{ borderTop: `1px solid ${BD}` }} />
            )}
            <div className="stagger-nav space-y-0.5">
              {group.items.map(item => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                   pathname.startsWith(item.href + "/") &&
                   !allHrefs.some((h: string) => h !== item.href && pathname.startsWith(h)))
                return (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={active}
                    collapsed={collapsed}
                    badge={
                      item.href === "/ventas/pipeline"  && pipelineBadge     > 0 ? pipelineBadge
                      : item.href === "/pre-proyectos"  && preProyectosBadge > 0 ? preProyectosBadge
                      : undefined
                    }
                    onClick={onClose}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer usuario (unified — sin swap DOM) ──────────────────────── */}
      <div
        className="shrink-0"
        style={{ borderTop: `1px solid ${BD}`, padding: collapsed ? "8px 6px" : "8px" }}
      >
        <div
          className="flex items-center rounded-xl transition-all duration-200"
          style={{
            gap: collapsed ? 0 : 8,
            padding: collapsed ? "6px 0" : "8px 10px",
            justifyContent: collapsed ? "center" : undefined,
            backgroundColor: collapsed ? "transparent" : CARD,
          }}
        >
          {/* Avatar */}
          <Link
            href="/perfil"
            onClick={onClose}
            title={collapsed ? nombre : undefined}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ring-2 ring-offset-2 transition-opacity hover:opacity-80"
            style={{ backgroundColor: TEAL, outline: `2px solid ${TEAL}60`, outlineOffset: 2 }}
          >
            {inicial}
          </Link>

          {/* Nombre + rol — se ocultan en collapsed via opacidad */}
          <div
            className="flex-1 min-w-0 overflow-hidden transition-opacity duration-150"
            style={{ opacity: collapsed ? 0 : 1, pointerEvents: collapsed ? "none" : "auto" }}
            aria-hidden={collapsed}
          >
            <p className="text-xs font-semibold truncate" style={{ color: HTXT }}>{nombre}</p>
            <p className="text-[10px]" style={{ color: MUTE }}>{ROL_LABEL[rol] ?? rol}</p>
          </div>

          {/* Acciones — se ocultan en collapsed via opacidad */}
          <div
            className="flex items-center gap-0.5 shrink-0 transition-opacity duration-150"
            style={{ opacity: collapsed ? 0 : 1, pointerEvents: collapsed ? "none" : "auto" }}
            aria-hidden={collapsed}
          >
            <Link
              href="/perfil"
              onClick={onClose}
              title="Mi perfil"
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: MUTE }}
              onMouseEnter={e => (e.currentTarget.style.color = HTXT)}
              onMouseLeave={e => (e.currentTarget.style.color = MUTE)}
            >
              <Icons.Perfil />
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Cerrar sesión"
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: MUTE }}
              onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.backgroundColor = "rgba(248,113,113,0.1)" }}
              onMouseLeave={e => { e.currentTarget.style.color = MUTE; e.currentTarget.style.backgroundColor = "transparent" }}
            >
              <Icons.Logout />
            </button>
          </div>
        </div>

        {/* Logout solo icono en collapsed */}
        <div
          className="flex justify-center mt-1 transition-opacity duration-150"
          style={{ opacity: collapsed ? 1 : 0, pointerEvents: collapsed ? "auto" : "none" }}
          aria-hidden={!collapsed}
        >
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Cerrar sesión"
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: MUTE }}
            onMouseEnter={e => { e.currentTarget.style.color = "#f87171" }}
            onMouseLeave={e => { e.currentTarget.style.color = MUTE }}
          >
            <Icons.Logout />
          </button>
        </div>
      </div>

    </aside>
  )
}

// ─── Sidebar principal ────────────────────────────────────────────────────────
export function Sidebar({ nombre, rol }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed,  setCollapsed]  = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const stored = localStorage.getItem("sidebar_collapsed")
    if (stored === "true") setCollapsed(true)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed(v => {
      localStorage.setItem("sidebar_collapsed", String(!v))
      return !v
    })
  }

  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:flex shrink-0 h-screen sticky top-0 flex-col">
        <SidebarInner nombre={nombre} rol={rol} collapsed={collapsed} />

        {/* Botón colapsar */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          className="hidden lg:flex items-center justify-center h-9 shrink-0 transition-colors"
          style={{
            width: collapsed ? 64 : 256,
            transition: "width 220ms cubic-bezier(.4,0,.2,1), background-color 150ms",
            backgroundColor: BG,
            borderTop: `1px solid ${BD}`,
            color: MUTE,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = HTXT; e.currentTarget.style.backgroundColor = HBG }}
          onMouseLeave={e => { e.currentTarget.style.color = MUTE; e.currentTarget.style.backgroundColor = BG }}
        >
          {collapsed ? (
            <Icons.ChevronRight />
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <Icons.ChevronLeft />
              <span style={{ opacity: collapsed ? 0 : 1, transition: "opacity 150ms" }}>Colapsar</span>
            </span>
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div className="sidebar-overlay lg:hidden" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-40 lg:hidden flex h-full animate-in slide-in-from-left duration-200">
            <SidebarInner nombre={nombre} rol={rol} onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* Trigger hamburger (activado desde TopBar) */}
      <button
        id="sidebar-toggle"
        onClick={() => setMobileOpen(v => !v)}
        className="hidden"
        aria-label="Abrir menú"
      />
    </>
  )
}

// ─── Hook para abrir desde TopBar ─────────────────────────────────────────────
export function useSidebarToggle() {
  return () => {
    const btn = document.getElementById("sidebar-toggle")
    btn?.click()
  }
}
