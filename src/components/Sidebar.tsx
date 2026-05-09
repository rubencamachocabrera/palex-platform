"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

interface Props {
  nombre: string
  rol: string
}

const TEAL = "#00A99D"

export function Sidebar({ nombre, rol }: Props) {
  const pathname = usePathname()

  const navItems = [
    { href: "/dashboard", label: "Inicio" },
    ...(rol === "ADMIN"
      ? [{ href: "/dashboard/admin/usuarios", label: "Usuarios" }]
      : []),
  ]

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <Image src="/logo-palex.png" alt="Palex Medical" width={140} height={52} priority />
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className="block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={
                active
                  ? { backgroundColor: TEAL, color: "#fff" }
                  : { color: "#4B5563" }
              }
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Usuario + logout */}
      <div className="p-4 border-t border-gray-100 space-y-3">
        <div>
          <p className="text-sm font-semibold text-gray-800 truncate">{nombre}</p>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: TEAL }}
          >
            {rol}
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          Cerrar sesión →
        </button>
      </div>
    </aside>
  )
}
