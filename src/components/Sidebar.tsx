"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

interface Props { nombre: string; rol: string }

const TEAL = "#00A99D"

const NAV: Record<string, { href: string; label: string; icon: string }[]> = {
  ADMIN: [
    { href: "/dashboard",                   label: "Dashboard",   icon: "📊" },
    { href: "/dashboard/admin/usuarios",    label: "Usuarios",    icon: "👥" },
    { href: "/dashboard/admin/zonas",       label: "Zonas",       icon: "🗺" },
    { href: "/dashboard/admin/hospitales",  label: "Hospitales",  icon: "🏥" },
    { href: "/dashboard/admin/visitas",     label: "Todas las visitas", icon: "📋" },
  ],
  PROYECTOS: [
    { href: "/dashboard",              label: "Dashboard",   icon: "📊" },
    { href: "/dashboard/hospitales",   label: "Mis hospitales", icon: "🏥" },
    { href: "/dashboard/visitas",      label: "Mis visitas",    icon: "📋" },
  ],
  VENTAS: [
    { href: "/dashboard",              label: "Dashboard",   icon: "📊" },
    { href: "/dashboard/hospitales",   label: "Mis hospitales", icon: "🏥" },
    { href: "/dashboard/visitas",      label: "Mis visitas",    icon: "📋" },
  ],
}

export function Sidebar({ nombre, rol }: Props) {
  const pathname = usePathname()
  const items = NAV[rol] ?? NAV.VENTAS

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 shrink-0">
      <div className="px-5 py-4 border-b border-gray-100">
        <Image src="/logo-palex.png" alt="Palex" width={130} height={48} priority />
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {items.map(item => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={active ? { backgroundColor: TEAL, color: "#fff" } : { color: "#4B5563" }}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 space-y-2">
        <div>
          <p className="text-sm font-semibold text-gray-800 truncate">{nombre}</p>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: TEAL }}>
            {rol}
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
        >
          Cerrar sesión →
        </button>
      </div>
    </aside>
  )
}
