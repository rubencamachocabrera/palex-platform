"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cerrarSesion } from "@/lib/actions/auth"

interface Props { nombre: string; rol: string }

const TEAL = "#00A99D"
const TEAL_LIGHT = "#E6F7F6"

const ROL_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  VENTAS: "Ventas",
  PROYECTOS: "Proyectos",
}

interface NavItem { href: string; label: string }
interface NavGroup { label?: string; items: NavItem[] }

const NAV_GROUPS: Record<string, NavGroup[]> = {
  ADMIN: [
    { items: [{ href: "/dashboard", label: "Dashboard" }] },
    {
      label: "Gestion",
      items: [
        { href: "/admin/usuarios",   label: "Usuarios" },
        { href: "/admin/zonas",      label: "Zonas" },
        { href: "/admin/hospitales", label: "Hospitales" },
        { href: "/admin/visitas",    label: "Todas las visitas" },
      ],
    },
    {
      label: "CRM",
      items: [{ href: "/ventas/pipeline", label: "Pipeline" }],
    },
  ],
  PROYECTOS: [
    { items: [{ href: "/dashboard", label: "Dashboard" }] },
    {
      label: "Mi trabajo",
      items: [
        { href: "/hospitales", label: "Mis hospitales" },
        { href: "/visitas",    label: "Mis visitas" },
      ],
    },
  ],
  VENTAS: [
    { items: [{ href: "/dashboard", label: "Dashboard" }] },
    {
      label: "Mi trabajo",
      items: [
        { href: "/hospitales",      label: "Mis hospitales" },
        { href: "/visitas",         label: "Mis visitas" },
      ],
    },
    {
      label: "CRM",
      items: [{ href: "/ventas/pipeline", label: "Pipeline" }],
    },
  ],
}

export function Sidebar({ nombre, rol }: Props) {
  const pathname = usePathname()
  const groups = NAV_GROUPS[rol] ?? NAV_GROUPS.VENTAS
  const inicial = nombre.charAt(0).toUpperCase()

  return (
    <aside className="w-60 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0 shrink-0">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <Image src="/logo-palex.png" alt="Palex Medical" width={120} height={44} priority />
      </div>

      {/* Navegacion */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {groups.map((group, gi) => (
          <div key={gi} className="mb-5">
            {group.label && (
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1.5">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-100"
                    style={active
                      ? { backgroundColor: TEAL, color: "#fff" }
                      : { color: "#6b7280" }
                    }
                    onMouseEnter={e => {
                      if (!active) (e.currentTarget as HTMLAnchorElement).style.backgroundColor = TEAL_LIGHT
                    }}
                    onMouseLeave={e => {
                      if (!active) (e.currentTarget as HTMLAnchorElement).style.backgroundColor = ""
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: active ? "rgba(255,255,255,0.7)" : "#e5e7eb" }}
                    />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer — usuario, perfil y logout */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 group">
          {/* Avatar + nombre → va al perfil */}
          <Link href="/perfil" className="flex items-center gap-2.5 flex-1 min-w-0">
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

          {/* Icono perfil */}
          <Link
            href="/perfil"
            title="Mi perfil"
            className="text-gray-300 hover:text-gray-600 transition-colors p-1 rounded shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </Link>

          {/* Logout */}
          <form action={cerrarSesion}>
            <button
              type="submit"
              title="Cerrar sesion"
              className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </form>
        </div>
      </div>

    </aside>
  )
}
