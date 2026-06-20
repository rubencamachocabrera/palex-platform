"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { TEAL } from "@/lib/brand"
import { useSidebarToggle } from "@/components/Sidebar"

interface NavTab {
  href: string | null
  label: string
  icon: (active: boolean) => React.ReactNode
}

const tabs: NavTab[] = [
  {
    href: "/dashboard",
    label: "Inicio",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/visitas",
    label: "Visitas",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    href: "/hospitales",
    label: "Hospitales",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/proyectos",
    label: "Proyectos",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    href: null, // "Mas" — opens sidebar
    label: "Mas",
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    ),
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const toggleSidebar = useSidebarToggle()

  return (
    <nav
      className="bottom-nav-container fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-gray-200/60 dark:border-gray-700/60"
      style={{
        backdropFilter: "blur(16px) saturate(180%)",
        WebkitBackdropFilter: "blur(16px) saturate(180%)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <style>{`
        .bottom-nav-container { background-color: rgba(255,255,255,0.82); }
        .dark .bottom-nav-container { background-color: rgba(15, 23, 42, 0.85); }
      `}</style>
      <div className="flex items-center justify-around px-1" style={{ height: 56 }}>
        {tabs.map((tab) => {
          const isMore = tab.href === null
          const active = !isMore && pathname !== null && (
            pathname === tab.href ||
            (tab.href !== "/dashboard" && pathname.startsWith(tab.href + "/"))
          )

          if (isMore) {
            return (
              <button
                key="mas"
                onClick={toggleSidebar}
                className="flex flex-col items-center justify-center gap-0.5 transition-colors duration-150"
                style={{ minWidth: 56, minHeight: 44, color: "#9ca3af" }}
                aria-label="Abrir menu"
              >
                {tab.icon(false)}
                <span className="text-[10px] font-medium leading-tight">
                  {tab.label}
                </span>
              </button>
            )
          }

          return (
            <Link
              key={tab.href}
              href={tab.href!}
              className="flex flex-col items-center justify-center gap-0.5 transition-all duration-150"
              style={{
                minWidth: 56,
                minHeight: 44,
                color: active ? TEAL : "#9ca3af",
                transform: active ? "scale(1.05)" : "scale(1)",
              }}
              aria-current={active ? "page" : undefined}
            >
              {tab.icon(active)}
              <span
                className="text-[10px] font-medium leading-tight transition-colors duration-150"
                style={{ color: active ? TEAL : "#9ca3af" }}
              >
                {tab.label}
              </span>
              {/* Active dot indicator */}
              {active && (
                <span
                  className="absolute -bottom-0.5 w-1 h-1 rounded-full"
                  style={{ backgroundColor: TEAL }}
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
