"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { signOut } from "next-auth/react"
import { TEAL, TEAL_LIGHT, ORANGE } from "@/lib/brand"

interface Props { nombre: string; rol: string }

const ROL_LABEL: Record<string, string> = {
  ADMIN:     "Administrador",
  VENTAS:    "Comercial",
  PROYECTOS: "Proyectos",
}

// ─── SVG Icons (stroke 1.8, 18x18) ───────────────────────────────────────────

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
}

// ─── Estructura de navegacion ─────────────────────────────────────────────────

interface NavItem { href: string; label: string; icon: keyof typeof Icons }
interface NavGroup { label?: string; items: NavItem[] }

const NAV_GROUPS: Record<string, NavGroup[]> = {
  ADMIN: [
    { items: [{ href: "/dashboard",        label: "Dashboard",         icon: "Dashboard" }] },
    {
      label: "Gestion",
      items: [
        { href: "/admin/usuarios",   label: "Usuarios",          icon: "Usuarios" },
        { href: "/admin/zonas",      label: "Zonas",             icon: "Zonas" },
        { href: "/admin/hospitales", label: "Hospitales",        icon: "Hospitales" },
        { href: "/admin/visitas",    label: "Todas las visitas", icon: "TodasVisitas" },
      ],
    },
    {
      label: "CRM",
      items: [{ href: "/ventas/pipeline", label: "Pipeline", icon: "Pipeline" }],
    },
  ],
  PROYECTOS: [
    { items: [{ href: "/dashboard", label: "Dashboard", icon: "Dashboard" }] },
    {
      label: "Mi trabajo",
      items: [
        { href: "/hospitales", label: "Mis hospitales", icon: "Hospitales" },
        { href: "/visitas",    label: "Mis visitas",    icon: "Visitas" },
      ],
    },
  ],
  VENTAS: [
    { items: [{ href: "/dashboard", label: "Dashboard", icon: "Dashboard" }] },
    {
      label: "Mi trabajo",
      items: [
        { href: "/hospitales",      label: "Mis hospitales", icon: "Hospitales" },
        { href: "/visitas",         label: "Mis visitas",    icon: "Visitas" },
      ],
    },
    {
      label: "CRM",
      items: [{ href: "/ventas/pipeline", label: "Pipeline", icon: "Pipeline" }],
    },
  ],
}

// ─── Componente NavLink ───────────────────────────────────────────────────────

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  const Icon = Icons[item.icon]
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group"
      style={active
        ? { backgroundColor: TEAL, color: "#fff" }
        : { color: "#6b7280" }
      }
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLAnchorElement).style.backgroundColor = TEAL_LIGHT
        if (!active) (e.currentTarget as HTMLAnchorElement).style.color = TEAL
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLAnchorElement).style.backgroundColor = ""
          ;(e.currentTarget as HTMLAnchorElement).style.color = "#6b7280"
        }
      }}
    >
      <span className="shrink-0 transition-transform duration-150 group-hover:scale-110">
        <Icon />
      </span>
      <span className="truncate">{item.label}</span>
      {active && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
      )}
    </Link>
  )
}

// ─── Sidebar interior ─────────────────────────────────────────────────────────

function SidebarInner({ nombre, rol, onClose }: Props & { onClose?: () => void }) {
  const pathname = usePathname()
  const groups = NAV_GROUPS[rol] ?? NAV_GROUPS.VENTAS
  const inicial = nombre.charAt(0).toUpperCase()

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-full">

      {/* Logo + close mobile */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
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
      </div>

      {/* Navegacion */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-5">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1.5">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href))
                return (
                  <NavLink key={item.href} item={item} active={active} onClick={onClose} />
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer — usuario */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50">
          {/* Avatar + nombre */}
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

          {/* Perfil */}
          <Link
            href="/perfil"
            onClick={onClose}
            title="Mi perfil"
            className="text-gray-300 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-white"
          >
            <Icons.Perfil />
          </Link>

          {/* Logout */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Cerrar sesion"
            className="text-gray-300 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white"
          >
            <Icons.Logout />
          </button>
        </div>
      </div>
    </aside>
  )
}

// ─── Sidebar principal (desktop fijo + mobile overlay) ────────────────────────

export function Sidebar({ nombre, rol }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Cerrar al cambiar de ruta en mobile
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Bloquear scroll body cuando sidebar mobile esta abierto
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  return (
    <>
      {/* Desktop: sidebar fijo */}
      <div className="hidden lg:flex shrink-0 h-screen sticky top-0">
        <SidebarInner nombre={nombre} rol={rol} />
      </div>

      {/* Mobile: overlay + sidebar deslizante */}
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

      {/* Boton hamburger — solo en mobile, se exporta via contexto al TopBar */}
      <button
        id="sidebar-toggle"
        onClick={() => setMobileOpen(v => !v)}
        className="hidden"
        aria-label="Abrir menu"
      />
    </>
  )
}

// ─── Hook para abrir sidebar mobile desde TopBar ───────────────────────────────

export function useSidebarToggle() {
  return () => {
    const btn = document.getElementById("sidebar-toggle")
    btn?.click()
  }
}
