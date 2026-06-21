"use client"

import { useEffect, useState } from "react"
import { TEAL, ORANGE } from "@/lib/brand"
import { usePerfil } from "@/hooks/usePerfil"
import type { Hospital, PeriodoKey, TabKey } from "./_lib/types"
import { PERIODOS } from "./_lib/types"
import { TabDashboard }    from "./_components/TabDashboard"
import { TabAnalitica }    from "./_components/TabAnalitica"
import { TabIncidencias }  from "./_components/TabIncidencias"
import { TabIA }           from "./_components/TabIA"
import { TabExplorador }   from "./_components/TabExplorador"
import { TabAlertas }      from "./_components/TabAlertas"
import { TabCorrelaciones } from "./_components/TabCorrelaciones"
import { TabIndicadores }  from "./_components/TabIndicadores"

// ─── Definición de tabs ────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string; labelShort: string; color: string; icon: string }[] = [
  { key: "dashboard",    label: "Dashboard ejecutivo",    labelShort: "Dashboard",    color: TEAL,      icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
  { key: "analitica",    label: "Analítica operacional",  labelShort: "Analítica",    color: "#6366f1",  icon: "M22 12h-4l-3 9L9 3l-3 9H2" },
  { key: "incidencias",  label: "Gestión de incidencias", labelShort: "Incidencias",  color: "#ef4444",  icon: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" },
  { key: "ia",           label: "IA & Predicción",        labelShort: "IA",           color: "#8b5cf6",  icon: "M12 2a10 10 0 1 0 10 10H12V2zM12 12l-5 5M12 12l5-5" },
  { key: "explorador",   label: "Explorador de datos",    labelShort: "Explorador",   color: "#0891b2",  icon: "M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" },
  { key: "alertas",      label: "Sistema de alertas",     labelShort: "Alertas",      color: "#f59e0b",  icon: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" },
  { key: "correlaciones",label: "Correlaciones",          labelShort: "Correlaciones",color: "#ec4899",  icon: "M2 20l4-8 4 4 4-6 4 10" },
  { key: "indicadores",  label: "Indicadores avanzados",  labelShort: "Indicadores",  color: "#10b981",  icon: "M7 16V4m10 12V8M17 16v-2M7 16v-2M12 16V11" },
]

// ─── Componente principal ──────────────────────────────────────────────────────

export default function DatosPage() {
  const [tab, setTab]           = useState<TabKey>("dashboard")
  const [hospitalId, setHospitalId] = useState("")
  const [hospitales, setHospitales] = useState<Hospital[]>([])
  const [periodo, setPeriodo]   = useState<PeriodoKey>("12m")
  const { rol: userRol, isLoading: perfilLoading } = usePerfil()
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch("/api/hospitales").then(r => r.ok ? r.json() : [])
      .then(hosp => {
        if (Array.isArray(hosp) && hosp.length > 0) {
          const sorted = hosp.sort((a: Hospital, b: Hospital) => a.nombre.localeCompare(b.nombre))
          setHospitales(sorted)
          setHospitalId(sorted[0].id)
        }
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [])

  const activeTab = TABS.find(t => t.key === tab)!

  // Control de acceso
  if (!loading && !perfilLoading && userRol && userRol !== "ADMIN" && userRol !== "VENTAS") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
          </svg>
        </div>
        <p className="text-gray-500 font-semibold">Acceso restringido</p>
        <p className="text-sm text-gray-400 mt-1">Módulo disponible para ADMIN y VENTAS.</p>
      </div>
    )
  }

  const tabProps = { hospitalId, periodo, hospitales }

  return (
    <div className="max-w-7xl mx-auto space-y-0 pb-10">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">Explotación de datos</h1>
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
          <p className="text-sm text-gray-400">InLab Palex · Gestión Sanitaria Sur de Córdoba · Plataforma BI avanzada</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Exportar */}
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 1 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Excel
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 1 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            PDF
          </button>

          {/* Selector hospital */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            {loading ? (
              <div className="w-32 h-4 bg-gray-200 rounded animate-pulse" />
            ) : (
              <select value={hospitalId} onChange={e => setHospitalId(e.target.value)}
                className="text-sm font-semibold text-gray-800 bg-transparent focus:outline-none cursor-pointer max-w-[220px]">
                {hospitales.map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}
              </select>
            )}
          </div>

          {/* Período */}
          <div className="flex bg-gray-100 p-0.5 rounded-xl">
            {PERIODOS.map(p => (
              <button key={p.k} onClick={() => setPeriodo(p.k)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                style={periodo === p.k
                  ? { backgroundColor: "white", color: TEAL, boxShadow: "0 1px 4px rgba(0,0,0,.08)" }
                  : { color: "#6b7280" }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab navigation ───────────────────────────────────────────────────── */}
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
                  {/* Active indicator */}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{ backgroundColor: t.color }} />
                  )}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="shrink-0">
                    <path d={t.icon} />
                  </svg>
                  <span className="hidden sm:block">{t.labelShort}</span>
                  {/* Hover underline */}
                  {!isActive && (
                    <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-t-full bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Contenido de la tab activa ───────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse" />
        </div>
      ) : (
        <>
          {tab === "dashboard"    && <TabDashboard    {...tabProps} />}
          {tab === "analitica"    && <TabAnalitica    {...tabProps} />}
          {tab === "incidencias"  && <TabIncidencias  {...tabProps} />}
          {tab === "ia"           && <TabIA           {...tabProps} />}
          {tab === "explorador"   && <TabExplorador   {...tabProps} />}
          {tab === "alertas"      && <TabAlertas      {...tabProps} />}
          {tab === "correlaciones"&& <TabCorrelaciones {...tabProps} />}
          {tab === "indicadores"  && <TabIndicadores  {...tabProps} />}
        </>
      )}

      {/* ── Footer disclaimer ────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mt-6">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>Vista de demostración.</strong> Datos ficticios generados con patrones estacionales reales de Andalucía. La arquitectura de datos (types.ts + data-service.ts) está preparada para conectarse directamente a la API de InLab Palex sin modificar los componentes de interfaz.
        </p>
      </div>
    </div>
  )
}
