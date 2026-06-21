"use client"

import { useState } from "react"
import { TEAL, ORANGE } from "@/lib/brand"
import { usePerfil } from "@/hooks/usePerfil"
import type { TabKeyTransporte } from "./_lib/types"
import { TabDashboard }   from "./_components/TabDashboard"
import { TabMapa }        from "./_components/TabMapa"
import { TabTendencias }  from "./_components/TabTendencias"
import { TabFlota }       from "./_components/TabFlota"
import { TabIncidencias } from "./_components/TabIncidencias"
import { TabAlertas }     from "./_components/TabAlertas"

const TABS: { key: TabKeyTransporte; label: string; labelShort: string; color: string; icon: string }[] = [
  { key: "dashboard",   label: "Dashboard ejecutivo",   labelShort: "Dashboard",   color: TEAL,     icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
  { key: "mapa",        label: "Mapa de rutas",         labelShort: "Mapa",        color: "#3b82f6", icon: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
  { key: "tendencias",  label: "Tendencias",            labelShort: "Tendencias",  color: "#6366f1", icon: "M22 12h-4l-3 9L9 3l-3 9H2" },
  { key: "flota",       label: "Flota de neveras",      labelShort: "Flota",       color: "#10b981", icon: "M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" },
  { key: "incidencias", label: "Incidencias",           labelShort: "Incidencias", color: "#ef4444", icon: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" },
  { key: "alertas",     label: "Alertas",               labelShort: "Alertas",     color: ORANGE,    icon: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" },
]

export default function TransportePage() {
  const [tab, setTab] = useState<TabKeyTransporte>("dashboard")
  const { rol: userRol, isLoading: loading } = usePerfil()

  const activeTab = TABS.find(t => t.key === tab)!

  // Control de acceso
  if (!loading && userRol && userRol !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
          </svg>
        </div>
        <p className="text-gray-500 font-semibold">Acceso restringido</p>
        <p className="text-sm text-gray-400 mt-1">Módulo disponible para ADMIN.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-0 pb-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">Transporte de muestras</h1>
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border"
              style={{ color: ORANGE, borderColor: `${ORANGE}50`, backgroundColor: `${ORANGE}0c` }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
              Vista demo
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${activeTab.color}15`, color: activeTab.color }}>
              {activeTab.labelShort}
            </span>
          </div>
          <p className="text-sm text-gray-400">Cadena de frío · rutas, neveras y temperatura en tiempo real (Sur de Córdoba)</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
        <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <div className="flex min-w-max">
            {TABS.map((t, i) => {
              const isActive = tab === t.key
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className="relative flex items-center gap-2 px-4 py-3.5 text-[11px] font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap group"
                  style={{
                    color: isActive ? t.color : "#6b7280",
                    backgroundColor: isActive ? `${t.color}08` : "transparent",
                    borderRight: i < TABS.length - 1 ? "1px solid #f3f4f6" : "none",
                    minHeight: 52,
                  }}>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{ backgroundColor: t.color }} />
                  )}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d={t.icon} />
                  </svg>
                  <span className="hidden sm:block">{t.labelShort}</span>
                  {!isActive && (
                    <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-t-full bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Contenido */}
      {tab === "dashboard"   && <TabDashboard />}
      {tab === "mapa"        && <TabMapa />}
      {tab === "tendencias"  && <TabTendencias />}
      {tab === "flota"       && <TabFlota />}
      {tab === "incidencias" && <TabIncidencias />}
      {tab === "alertas"     && <TabAlertas />}

      {/* Footer disclaimer */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mt-6">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>Vista de demostración.</strong> Datos ficticios de rutas, neveras y temperatura generados con patrones realistas.
          La arquitectura de datos (types.ts + data-service.ts) está preparada para conectarse a la sincronización read-only
          con el sistema de termografía cuando esté disponible, sin modificar los componentes de interfaz.
        </p>
      </div>
    </div>
  )
}
