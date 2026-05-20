"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import { signOut } from "next-auth/react"
import { TEAL, TEAL_LIGHT, ORANGE } from "@/lib/brand"

interface Props { nombre: string; rol: string }

const ROL_LABEL: Record<string, string> = {
  ADMIN:     "Administrador",
  VENTAS:    "Comercial",
  PROYECTOS: "Proyectos",
  TECNICO:   "Técnico",
}

// Iconos SVG (stroke 1.8, 18x18)

const Icons: Record<string, () => React.ReactElement> = {
  Dashboard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  Hospitales: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Visitas: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  Pipeline: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  Usuarios: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Zonas: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  TodasVisitas: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  Perfil: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  ),
  Logout: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Close: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Proyectos: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Modulos: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="9" height="9" rx="1"/>
      <rect x="13" y="2" width="9" height="9" rx="1"/>
      <rect x="2" y="13" width="9" height="9" rx="1"/>
      <rect x="13" y="13" width="9" height="9" rx="1"/>
    </svg>
  ),
  Mapa: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  PreProyectos: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  Hardware: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
      <rect x="9" y="9" width="6" height="6"/>
      <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
      <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
      <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
      <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
    </svg>
  ),
  Configuracion: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
}

// Estructura de navegacion

interface NavItem { href: string; label: string; icon: keyof typeof Icons }
interface NavGroup { label?: string; items: NavItem[]; crmOnly?: boolean }

const NAV_GROUPS_ADMIN: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: "Dashboard" }] },
  {
    label: "Gestión",
    items: [
      { href: "/admin/usuarios",       label: "Usuarios",          icon: "Usuarios" },
      { href: "/admin/zonas",          label: "Zonas",             icon: "Zonas" },
      { href: "/admin/hospitales",     label: "Hospitales",        icon: "Hospitales" },
      { href: "/mapa",                 label: "Mapa",              icon: "Mapa" },
      { href: "/admin/visitas",        label: "Todas las visitas", icon: "TodasVisitas" },
      { href: "/admin/configuracion",  label: "Configuración",     icon: "Configuracion" },
    ],
  },
  {
    label: "CRM",
    crmOnly: true,
    items: [
      { href: "/ventas/pipeline", label: "Pipeline", icon: "Pipeline" },
    ],
  },
  {
    label: "Proyectos",
    items: [
      { href: "/pre-proyectos", label: "Proyectos", icon: "PreProyectos" },
    ],
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
    items: [
      { href: "/ventas/pipeline", label: "Pipeline", icon: "Pipeline" },
    ],
  },
  {
    label: "Proyectos",
    items: [
      { href: "/pre-proyectos", label: "Proyectos", icon: "PreProyectos" },
    ],
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
    ],
  },
]

const NAV_GROUPS_TECNICO: NavGroup[] = [
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
    items: [{ href: "/pre-proyectos", label: "Proyectos", icon: "PreProyectos" }],
  },
]

const NAV_GROUPS: Record<string, NavGroup[]> = {
  ADMIN:     NAV_GROUPS_ADMIN,
  VENTAS:    NAV_GROUPS_VENTAS,
  PROYECTOS: NAV_GROUPS_PROYECTOS,
  TECNICO:   NAV_GROUPS_TECNICO,
}

// NavLink — soporta modo colapsado (solo icono + tooltip)

function NavLink({
  item,
  active,
  collapsed,
  badge,
  onClick,
}: {
  item: NavItem
  active: boolean
  collapsed?: boolean
  badge?: number
  onClick?: () => void
}) {
  const Icon = Icons[item.icon]
  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className="flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 group"
      style={{
        padding: collapsed ? "10px" : "10px 12px",
        justifyContent: collapsed ? "center" : undefined,
        ...(active
          ? { backgroundColor: TEAL, color: "#fff" }
          : { color: "#6b7280" }),
      }}
      onMouseEnter={e => {
        if (!active) {
          ;(e.currentTarget as HTMLAnchorElement).style.backgroundColor = TEAL_LIGHT
          ;(e.currentTarget as HTMLAnchorElement).style.color = TEAL
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          ;(e.currentTarget as HTMLAnchorElement).style.backgroundColor = ""
          ;(e.currentTarget as HTMLAnchorElement).style.color = "#6b7280"
        }
      }}
    >
      <span className="shrink-0 transition-transform duration-150 group-hover:scale-110 relative">
        <Icon />
        {collapsed && badge != null && badge > 0 && (
          <span
            className="absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white"
            style={{ backgroundColor: ORANGE }}
          />
        )}
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && badge != null && badge > 0 && (
        <span
          className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none text-white shrink-0"
          style={{ backgroundColor: ORANGE }}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
      {!collapsed && active && badge == null && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
      )}
    </Link>
  )
}

// SidebarInner — contenido compartido desktop/mobile

function SidebarInner({
  nombre,
  rol,
  collapsed,
  onClose,
}: Props & { collapsed?: boolean; onClose?: () => void }) {
  const pathname = usePathname()
  const groups = NAV_GROUPS[rol] ?? NAV_GROUPS.VENTAS
  const inicial = nombre.charAt(0).toUpperCase()
  const allHrefs = useMemo(() => groups.flatMap(g => g.items.map(i => i.href)), [groups])

  const [pipelineBadge, setPipelineBadge] = useState<number>(0)
  const [preProyectosBadge, setPreProyectosBadge] = useState<number>(0)
  const [crmActivo, setCrmActivo] = useState<boolean>(true)

  useEffect(() => {
    fetch("/api/config")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data != null) setCrmActivo(data.crmActivo) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch("/api/notificaciones")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.items) return
        const pipeline = data.items.filter((n: { tipo: string }) => n.tipo === "oportunidad_inactiva").length
        const fases = data.items.filter((n: { tipo: string }) => n.tipo === "fase_retrasada").length
        if (crmActivo && (rol === "ADMIN" || rol === "VENTAS")) setPipelineBadge(pipeline)
        setPreProyectosBadge(fases)
      })
      .catch(() => {})
  }, [rol, crmActivo])

  return (
    <aside
      className="bg-white border-r border-gray-100 flex flex-col h-full transition-all duration-200"
      style={{ width: collapsed ? 64 : 256 }}
    >
      {/* Logo */}
      <div
        className="border-b border-gray-100 flex items-center"
        style={{
          padding: collapsed ? "16px 0" : "16px 20px",
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
            <div className="flex items-center gap-2">
              <Image src="/logo-palex.png" alt="Palex Medical" width={110} height={40} priority />
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
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-50"
                aria-label="Cerrar menu"
              >
                <Icons.Close />
              </button>
            )}
          </>
        )}
      </div>

      {/* Navegacion */}
      <nav
        className="flex-1 overflow-y-auto space-y-5"
        style={{ padding: collapsed ? "12px 8px" : "12px" }}
      >
        {groups.filter(g => !g.crmOnly || crmActivo).map((group, gi) => (
          <div key={gi}>
            {group.label && !collapsed && (
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1.5">
                {group.label}
              </p>
            )}
            {group.label && collapsed && (
              <div className="border-t border-gray-100 my-2" />
            )}
            <div className="space-y-0.5">
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
                      item.href === "/ventas/pipeline" && pipelineBadge > 0 ? pipelineBadge
                      : item.href === "/pre-proyectos" && preProyectosBadge > 0 ? preProyectosBadge
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

      {/* Footer usuario */}
      {!collapsed && (
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50">
            <Link href="/perfil" onClick={onClose} className="flex items-center gap-2.5 flex-1 min-w-0 group">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 transition-opacity group-hover:opacity-80"
                style={{ backgroundColor: TEAL }}
              >
                {inicial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{nombre}</p>
                <p className="text-[10px] text-gray-400">{ROL_LABEL[rol] ?? rol}</p>
              </div>
            </Link>
            <Link
              href="/perfil"
              onClick={onClose}
              title="Mi perfil"
              className="text-gray-300 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-white"
            >
              <Icons.Perfil />
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Cerrar sesion"
              className="text-gray-300 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white"
            >
              <Icons.Logout />
            </button>
          </div>
        </div>
      )}

      {/* Footer colapsado: avatar + logout */}
      {collapsed && (
        <div className="p-2 border-t border-gray-100 flex flex-col items-center gap-1">
          <Link
            href="/perfil"
            title={nombre}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: TEAL }}
          >
            {inicial}
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Cerrar sesion"
            className="text-gray-300 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-gray-50 w-full flex justify-center"
          >
            <Icons.Logout />
          </button>
        </div>
      )}
    </aside>
  )
}

// Sidebar principal

export function Sidebar({ nombre, rol }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  // Persistir estado colapsado en localStorage
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

  // Cerrar mobile al navegar
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Bloquear scroll body con sidebar mobile abierto
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  return (
    <>
      {/* Desktop: sidebar con colapso */}
      <div className="hidden lg:flex shrink-0 h-screen sticky top-0 flex-col">
        <SidebarInner nombre={nombre} rol={rol} collapsed={collapsed} />
        {/* Boton colapsar */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          className="hidden lg:flex items-center justify-center h-8 border-t border-r border-gray-100 bg-white hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-600"
          style={{ width: collapsed ? 64 : 256, transition: "width 200ms" }}
        >
          {collapsed ? <Icons.ChevronRight /> : (
            <span className="flex items-center gap-1.5 text-xs">
              <Icons.ChevronLeft />
              <span>Colapsar</span>
            </span>
          )}
        </button>
      </div>

      {/* Mobile: overlay + sidebar */}
      {mobileOpen && (
        <>
          <div
            className="sidebar-overlay lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-40 lg:hidden flex h-full animate-in slide-in-right duration-200">
            <SidebarInner nombre={nombre} rol={rol} onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* Boton hamburger hidden (activado desde TopBar) */}
      <button
        id="sidebar-toggle"
        onClick={() => setMobileOpen(v => !v)}
        className="hidden"
        aria-label="Abrir menu"
      />
    </>
  )
}

// Hook para abrir sidebar mobile desde TopBar

export function useSidebarToggle() {
  return () => {
    const btn = document.getElementById("sidebar-toggle")
    btn?.click()
  }
}
