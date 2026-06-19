"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { TEAL } from "@/lib/brand"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Accion {
  id: string
  tipo: "accion" | "hospital" | "visita" | "preproyecto" | "proyecto"
  titulo: string
  subtitulo?: string
  href?: string
  icono: React.ReactNode
  onSelect?: () => void
}

// ─── Iconos inline ────────────────────────────────────────────────────────────

function IcoSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}
function IcoHospital() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}
function IcoVisita() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}
function IcoCalendar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}
function IcoDashboard() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}
function IcoPipeline() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )
}
function IcoPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}
function IcoArrow() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  )
}
function IcoPreProyecto() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  )
}
function IcoProyecto() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  )
}

// ─── Acciones rápidas (siempre visibles) ──────────────────────────────────────

const ACCIONES_BASE: Omit<Accion, "onSelect">[] = [
  { id: "dashboard",     tipo: "accion", titulo: "Ir al Dashboard",         subtitulo: "Inicio",                       href: "/dashboard",          icono: <IcoDashboard /> },
  { id: "hospitales",    tipo: "accion", titulo: "Mis Hospitales",           subtitulo: "Listado de hospitales",        href: "/hospitales",         icono: <IcoHospital /> },
  { id: "visitas",       tipo: "accion", titulo: "Mis Visitas",              subtitulo: "Listado de visitas",           href: "/visitas",            icono: <IcoVisita /> },
  { id: "calendario",    tipo: "accion", titulo: "Vista Calendario",         subtitulo: "Ver visitas en calendario",    href: "/visitas/calendario", icono: <IcoCalendar /> },
  { id: "pipeline",      tipo: "accion", titulo: "Pipeline CRM",             subtitulo: "Oportunidades y etapas",       href: "/ventas/pipeline",    icono: <IcoPipeline /> },
  { id: "pre-proyectos", tipo: "accion", titulo: "Pre-Proyectos",            subtitulo: "Gestión de pre-proyectos",     href: "/pre-proyectos",      icono: <IcoPreProyecto /> },
  { id: "proyectos",     tipo: "accion", titulo: "Proyectos",                subtitulo: "Proyectos InLab activos",      href: "/proyectos",          icono: <IcoProyecto /> },
  { id: "nueva",         tipo: "accion", titulo: "Nueva Visita",             subtitulo: "Crear formulario de visita",   href: "/visitas/nueva",      icono: <IcoPlus /> },
]

// Caché de búsqueda compartida — evita re-fetching en 60s
let searchCache: { q: string; data: { hospitales: unknown[]; visitas: unknown[]; preProyectos: unknown[]; proyectos: unknown[] }; ts: number } | null = null

// ─── CommandPalette ───────────────────────────────────────────────────────────

export function CommandPalette() {
  const [abierto, setAbierto] = useState(false)
  const [query, setQuery] = useState("")
  const [resultados, setResultados] = useState<Accion[]>([])
  const [indiceActivo, setIndiceActivo] = useState(0)
  const [cargando, setCargando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listaRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  // Abrir/cerrar
  const abrir = useCallback(() => {
    setAbierto(true)
    setQuery("")
    setIndiceActivo(0)
    setResultados(ACCIONES_BASE.map(a => ({ ...a, onSelect: () => { cerrar(); router.push(a.href!) } })))
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [router])

  const cerrar = useCallback(() => {
    setAbierto(false)
    setQuery("")
    setResultados([])
  }, [])

  // Escuchar evento palex:search y Escape
  useEffect(() => {
    const onSearch = () => abrir()
    const onEscape = () => cerrar()
    window.addEventListener("palex:search", onSearch)
    window.addEventListener("palex:escape", onEscape)
    return () => {
      window.removeEventListener("palex:search", onSearch)
      window.removeEventListener("palex:escape", onEscape)
    }
  }, [abrir, cerrar])

  // Buscar en API cuando hay query
  const buscar = useCallback(async (q: string) => {
    const q2 = q.toLowerCase()
    const accionesF = ACCIONES_BASE.filter(a =>
      a.titulo.toLowerCase().includes(q2) || (a.subtitulo ?? "").toLowerCase().includes(q2)
    ).map(a => ({ ...a, onSelect: () => { cerrar(); router.push(a.href!) } }))

    if (q.trim().length < 2) {
      setResultados(ACCIONES_BASE.map(a => ({ ...a, onSelect: () => { cerrar(); router.push(a.href!) } })))
      setIndiceActivo(0)
      return
    }
    setCargando(true)
    try {
      // Usar caché de módulo — máx 60 segundos por query
      const ahora = Date.now()
      if (!searchCache || searchCache.q !== q || ahora - searchCache.ts > 60_000) {
        const r = await fetch("/api/search?q=" + encodeURIComponent(q.trim()))
        if (r.ok) {
          const data = await r.json()
          searchCache = { q, data, ts: ahora }
        }
      }
      const { hospitales = [], visitas = [], preProyectos = [], proyectos = [] } = searchCache?.data ?? {}

      const hospsF: Accion[] = (hospitales as { id: string; nombre: string; ciudad: string; zona?: { nombre: string } }[])
        .slice(0, 5)
        .map(h => ({
          id: "h-" + h.id,
          tipo: "hospital" as const,
          titulo: h.nombre,
          subtitulo: h.ciudad + (h.zona ? " · " + h.zona.nombre : ""),
          href: "/hospitales/" + h.id,
          icono: <IcoHospital />,
          onSelect: () => { cerrar(); router.push("/hospitales/" + h.id) },
        }))

      const visitasF: Accion[] = (visitas as { id: string; titulo?: string | null; hospital?: { nombre: string }; fecha: string; estado: string }[])
        .slice(0, 4)
        .map(v => ({
          id: "v-" + v.id,
          tipo: "visita" as const,
          titulo: v.titulo || v.hospital?.nombre || "Visita",
          subtitulo: (v.titulo ? (v.hospital?.nombre ?? "") + " · " : "") + new Date(v.fecha).toLocaleDateString("es-ES") + " · " + v.estado,
          href: "/visitas/" + v.id,
          icono: <IcoVisita />,
          onSelect: () => { cerrar(); router.push("/visitas/" + v.id) },
        }))

      const ppF: Accion[] = (preProyectos as { id: string; titulo: string; estado: string; hospital: { nombre: string; ciudad: string } }[])
        .slice(0, 4)
        .map(p => ({
          id: "pp-" + p.id,
          tipo: "preproyecto" as const,
          titulo: p.titulo,
          subtitulo: p.hospital?.nombre + (p.hospital?.ciudad ? " · " + p.hospital.ciudad : "") + " · " + p.estado,
          href: "/pre-proyectos/" + p.id,
          icono: <IcoPreProyecto />,
          onSelect: () => { cerrar(); router.push("/pre-proyectos/" + p.id) },
        }))

      const prF: Accion[] = (proyectos as { id: string; nombre: string; hospital: { nombre: string; ciudad: string } }[])
        .slice(0, 3)
        .map(p => ({
          id: "pr-" + p.id,
          tipo: "proyecto" as const,
          titulo: p.nombre,
          subtitulo: p.hospital?.nombre + (p.hospital?.ciudad ? " · " + p.hospital.ciudad : ""),
          href: "/proyectos/" + p.id,
          icono: <IcoProyecto />,
          onSelect: () => { cerrar(); router.push("/proyectos/" + p.id) },
        }))

      setResultados([...accionesF, ...hospsF, ...visitasF, ...ppF, ...prF])
      setIndiceActivo(0)
    } catch {
      // silenciar error de red
    } finally {
      setCargando(false)
    }
  }, [cerrar, router])

  useEffect(() => {
    if (!abierto) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => buscar(query), 250)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, abierto, buscar])

  // Scroll al item activo
  useEffect(() => {
    const item = listaRef.current?.children[indiceActivo] as HTMLElement | undefined
    item?.scrollIntoView({ block: "nearest" })
  }, [indiceActivo])

  // Teclado: flechas + Enter + Escape
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setIndiceActivo(i => Math.min(i + 1, resultados.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setIndiceActivo(i => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      resultados[indiceActivo]?.onSelect?.()
    } else if (e.key === "Escape") {
      cerrar()
    }
  }

  // Agrupar resultados para headers
  const grupos: { label: string; items: Accion[] }[] = []
  const acciones    = resultados.filter(r => r.tipo === "accion")
  const hosps       = resultados.filter(r => r.tipo === "hospital")
  const visits      = resultados.filter(r => r.tipo === "visita")
  const preproys    = resultados.filter(r => r.tipo === "preproyecto")
  const proys       = resultados.filter(r => r.tipo === "proyecto")
  if (acciones.length)  grupos.push({ label: "Acciones rápidas", items: acciones })
  if (hosps.length)     grupos.push({ label: "Hospitales",        items: hosps })
  if (visits.length)    grupos.push({ label: "Visitas",           items: visits })
  if (preproys.length)  grupos.push({ label: "Pre-Proyectos",     items: preproys })
  if (proys.length)     grupos.push({ label: "Proyectos InLab",   items: proys })

  const TIPO_COLOR: Record<string, { bg: string; color: string }> = {
    accion:      { bg: "#F0F9FF", color: "#0EA5E9" },
    hospital:    { bg: "#E6F7F6", color: "#00A99D" },
    visita:      { bg: "#FEF3E5", color: "#F7941D" },
    preproyecto: { bg: "#EEF2FF", color: "#4F46E5" },
    proyecto:    { bg: "#EFF6FF", color: "#2563EB" },
  }
  const TIPO_LABEL: Record<string, string> = {
    accion: "Acción", hospital: "Hospital", visita: "Visita",
    preproyecto: "Pre-proyecto", proyecto: "Proyecto",
  }

  let itemIdx = -1

  if (!abierto) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={cerrar}
        aria-hidden
      />

      {/* Panel */}
      <div
        className="fixed left-1/2 top-[15%] z-50 w-full max-w-xl -translate-x-1/2 rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden"
        role="dialog"
        aria-modal
        aria-label="Búsqueda global"
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <span className="text-gray-300 shrink-0"><IcoSearch /></span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar hospitales, visitas, proyectos, páginas..."
            className="flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent outline-none"
          />
          {cargando && (
            <div
              className="w-4 h-4 border-2 border-gray-200 rounded-full animate-spin shrink-0"
              style={{ borderTopColor: TEAL }}
            />
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-400 text-[10px] font-mono shrink-0">
            ESC
          </kbd>
        </div>

        {/* Resultados */}
        <div ref={listaRef} className="max-h-[360px] overflow-y-auto py-2">
          {resultados.length === 0 && query.length >= 2 && !cargando && (
            <div className="py-10 text-center text-sm text-gray-400">
              Sin resultados para &ldquo;{query}&rdquo;
            </div>
          )}

          {grupos.map(grupo => (
            <div key={grupo.label}>
              <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {grupo.label}
              </p>
              {grupo.items.map(item => {
                itemIdx++
                const idx = itemIdx
                const activo = idx === indiceActivo
                const tc = TIPO_COLOR[item.tipo]
                return (
                  <button
                    key={item.id}
                    onClick={() => item.onSelect?.()}
                    onMouseEnter={() => setIndiceActivo(idx)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{ backgroundColor: activo ? "#F9FAFB" : "transparent" }}
                  >
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: tc.bg, color: tc.color }}
                    >
                      {item.icono}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.titulo}</p>
                      {item.subtitulo && (
                        <p className="text-xs text-gray-400 truncate">{item.subtitulo}</p>
                      )}
                    </div>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                      style={{ backgroundColor: tc.bg, color: tc.color }}
                    >
                      {TIPO_LABEL[item.tipo]}
                    </span>
                    {activo && (
                      <span className="text-gray-300 shrink-0"><IcoArrow /></span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 bg-gray-50/60">
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-500 font-mono text-[10px]">↑↓</kbd>
            navegar
          </span>
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-500 font-mono text-[10px]">↵</kbd>
            abrir
          </span>
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-500 font-mono text-[10px]">ESC</kbd>
            cerrar
          </span>
        </div>
      </div>
    </>
  )
}
