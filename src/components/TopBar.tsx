"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { OfflineIndicator } from "@/components/OfflineIndicator"
import { useSidebarToggle } from "@/components/Sidebar"
import { useTheme } from "@/components/ThemeProvider"
import { TEAL } from "@/lib/brand"

interface Resultado {
  tipo: "hospital" | "visita" | "proyecto"
  id: string
  titulo: string
  subtitulo: string
  href: string
}

interface Notificacion {
  tipo: "oportunidad_inactiva" | "visita_borrador" | "fase_retrasada" | "proyecto_por_vencer" | "tarea_retrasada" | "mencion" | "recordatorio"
  id: string
  titulo: string
  href: string
  mensaje: string
}

// ─── Iconos SVG inline ────────────────────────────────────────────────────────

function HospitalIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function VisitaIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}

function ProyectoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}

// ─── Dismissed notifications — localStorage persistence ──────────────────────

const DISMISS_KEY = "palex_notifs_dismissed"
const DISMISS_TTL = 14 * 24 * 60 * 60 * 1000 // 14 días

function getDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return new Set()
    const map: Record<string, number> = JSON.parse(raw)
    const now = Date.now()
    const active: Record<string, number> = {}
    for (const [k, ts] of Object.entries(map)) {
      if (now - ts < DISMISS_TTL) active[k] = ts
    }
    if (Object.keys(active).length !== Object.keys(map).length) {
      localStorage.setItem(DISMISS_KEY, JSON.stringify(active))
    }
    return new Set(Object.keys(active))
  } catch { return new Set() }
}

function addDismissed(keys: string[]) {
  if (typeof window === "undefined") return
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    const map: Record<string, number> = raw ? JSON.parse(raw) : {}
    const now = Date.now()
    for (const k of keys) map[k] = now
    localStorage.setItem(DISMISS_KEY, JSON.stringify(map))
  } catch {}
}

function nKey(n: Notificacion) { return `${n.tipo}:${n.id}` }

// ─── TopBar ────────────────────────────────────────────────────────────────────

export function TopBar() {
  const [q, setQ] = useState("")
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()
  const toggleSidebar = useSidebarToggle()

  const [notifs, setNotifs] = useState<Notificacion[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const { theme, toggleTheme } = useTheme()

  const buscar = useCallback(async (texto: string) => {
    if (texto.trim().length < 2) { setResultados([]); setAbierto(false); return }
    setBuscando(true)
    try {
      const r = await fetch("/api/search?q=" + encodeURIComponent(texto.trim()))
      if (!r.ok) return
      const { hospitales = [], visitas = [], proyectos = [] } = await r.json()

      const resH: Resultado[] = hospitales.map((h: { id: string; nombre: string; ciudad: string; zona?: { nombre: string } }) => ({
        tipo: "hospital" as const,
        id: h.id,
        titulo: h.nombre,
        subtitulo: h.ciudad + (h.zona ? " · " + h.zona.nombre : ""),
        href: "/hospitales/" + h.id,
      }))

      const resV: Resultado[] = visitas.map((v: { id: string; hospital: { nombre: string }; fecha: string; estado: string }) => ({
        tipo: "visita" as const,
        id: v.id,
        titulo: v.hospital?.nombre ?? "Visita",
        subtitulo: new Date(v.fecha).toLocaleDateString("es-ES") + " · " + v.estado,
        href: "/visitas/" + v.id,
      }))

      const resPP: Resultado[] = proyectos.map((p: { id: string; titulo: string; estado: string; hospital: { nombre: string; ciudad: string } }) => ({
        tipo: "proyecto" as const,
        id: p.id,
        titulo: p.titulo,
        subtitulo: p.hospital?.nombre + (p.hospital?.ciudad ? " · " + p.hospital.ciudad : "") + " · " + p.estado,
        href: "/proyectos/" + p.id,
      }))

      const todos = [...resH, ...resV, ...resPP]
      setResultados(todos)
      setAbierto(todos.length > 0)
    } catch (e) {
      console.error("Error en busqueda:", e)
    } finally {
      setBuscando(false)
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => buscar(q), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [q, buscar])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Atajo "/" para enfocar búsqueda (cuando no se está escribiendo en otro input)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return
      const active = document.activeElement
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) return
      e.preventDefault()
      inputRef.current?.focus()
      inputRef.current?.select()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [])

  useEffect(() => {
    function fetchNotifs() {
      fetch("/api/notificaciones")
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.items) {
            const dismissed = getDismissed()
            setNotifs((d.items as Notificacion[]).filter(n => !dismissed.has(nKey(n))))
          }
        })
        .catch(() => {})
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 3 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  function dismissOne(n: Notificacion) {
    addDismissed([nKey(n)])
    setNotifs(prev => prev.filter(x => nKey(x) !== nKey(n)))
  }

  function dismissAll() {
    addDismissed(notifs.map(nKey))
    setNotifs([])
    setNotifOpen(false)
  }

  function navegar(href: string) {
    setQ("")
    setAbierto(false)
    router.push(href)
  }

  return (
    <div className="h-14 bg-white border-b border-gray-100 flex items-center px-4 sm:px-6 gap-3 shrink-0 dark:bg-[#1e293b] dark:border-[rgba(255,255,255,0.07)]">

      {/* Hamburger — solo mobile */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden text-gray-500 hover:text-gray-800 p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
        aria-label="Abrir menu"
      >
        <MenuIcon />
      </button>

      {/* Buscador */}
      <div ref={wrapRef} className="flex-1 max-w-sm relative">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            onFocus={() => { if (resultados.length > 0) setAbierto(true) }}
            placeholder="Buscar hospitales, visitas..."
            className="w-full pl-9 pr-14 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-colors dark:bg-[#243147] dark:border-[rgba(255,255,255,0.1)] dark:text-slate-200 dark:placeholder-slate-500 dark:focus:bg-[#1e293b]"
            style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
          />
          {!q && !buscando && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 pointer-events-none select-none">
              <kbd className="text-[10px] font-medium text-gray-300 bg-gray-100 dark:bg-[#334155] dark:text-slate-500 px-1.5 py-0.5 rounded">/</kbd>
            </div>
          )}
          {buscando && (
            <div
              className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-gray-200 rounded-full animate-spin"
              style={{ borderTopColor: TEAL }}
            />
          )}
        </div>

        {/* Dropdown resultados */}
        {abierto && resultados.length > 0 && (
          <div className="slide-down absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[rgba(255,255,255,0.09)] shadow-lg overflow-hidden z-50">
            {resultados.map(r => (
              <button
                key={`${r.tipo}-${r.id}`}
                onClick={() => navegar(r.href)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
              >
                <span className="shrink-0 text-gray-400">
                  {r.tipo === "hospital" ? <HospitalIcon />
                   : r.tipo === "visita" ? <VisitaIcon />
                   : <ProyectoIcon />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.titulo}</p>
                  <p className="text-xs text-gray-400 truncate">{r.subtitulo}</p>
                </div>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={
                    r.tipo === "hospital"    ? { backgroundColor: "#E6F7F6", color: TEAL }
                    : r.tipo === "visita"    ? { backgroundColor: "#FEF3E5", color: "#F7941D" }
                    : { backgroundColor: "#EEF2FF", color: "#4F46E5" }
                  }
                >
                  {r.tipo === "hospital" ? "Hospital"
                   : r.tipo === "visita" ? "Visita"
                   
                   : "Proyecto"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Separador */}
      <div className="flex-1" />

      {/* Indicador offline */}
      <OfflineIndicator />

      {/* Toggle tema claro / oscuro */}
      <button
        onClick={toggleTheme}
        title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors shrink-0"
        aria-label="Cambiar tema"
      >
        {/* Sol */}
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          className="absolute inset-0 m-auto transition-all duration-300"
          style={{ opacity: theme === "dark" ? 1 : 0, transform: theme === "dark" ? "rotate(0deg) scale(1)" : "rotate(90deg) scale(0.5)" }}
        >
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        {/* Luna */}
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          className="transition-all duration-300"
          style={{ opacity: theme === "light" ? 1 : 0, transform: theme === "light" ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0.5)" }}
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>

      {/* Campana de notificaciones */}
      <div ref={notifRef} className="relative">
        <button
          onClick={() => setNotifOpen(o => !o)}
          className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Notificaciones"
        >
          <BellIcon />
          {notifs.length > 0 && (
            <span className="pop-in badge-pulse absolute top-1 right-1 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: "#ef4444" }}>
              {notifs.length > 9 ? "9+" : notifs.length}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="slide-down absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-[384px] bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-[rgba(255,255,255,0.09)] shadow-xl overflow-hidden z-50">
            {/* Cabecera */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[rgba(255,255,255,0.07)]">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-gray-900 dark:text-slate-200">Notificaciones</p>
                {notifs.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500">
                    {notifs.length}
                  </span>
                )}
              </div>
              {notifs.length > 0 && (
                <button
                  onClick={dismissAll}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-50"
                  title="Borrar todas las notificaciones"
                >
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  Borrar todo
                </button>
              )}
            </div>

            {/* Estado vacío */}
            {notifs.length === 0 && (
              <div className="px-5 py-10 text-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "#E6F7F6" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700">Todo al día</p>
                <p className="text-xs text-gray-400 mt-1">Sin alertas pendientes</p>
              </div>
            )}

            {/* Lista */}
            {notifs.length > 0 && (
              <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
                {notifs.map(n => {
                  const styles: Record<string, { bg: string; icon: React.ReactNode }> = {
                    fase_retrasada: {
                      bg: "bg-red-50 text-red-500",
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                      ),
                    },
                    proyecto_por_vencer: {
                      bg: "bg-orange-50 text-orange-500",
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                      ),
                    },
                    oportunidad_inactiva: {
                      bg: "bg-amber-50 text-amber-500",
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                        </svg>
                      ),
                    },
                    visita_borrador: {
                      bg: "bg-blue-50 text-blue-500",
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
                        </svg>
                      ),
                    },
                    tarea_retrasada: {
                      bg: "bg-purple-50 text-purple-500",
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 11 12 14 22 4"/>
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                      ),
                    },
                    mencion: {
                      bg: "bg-teal-50 text-teal-500",
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>
                        </svg>
                      ),
                    },
                    recordatorio: {
                      bg: "bg-teal-50 text-teal-500",
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                      ),
                    },
                  }
                  const s = styles[n.tipo] ?? styles.visita_borrador
                  return (
                    <div key={`${n.tipo}-${n.id}`} className="flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.04)] transition-colors group border-b border-gray-50 dark:border-[rgba(255,255,255,0.04)] last:border-0">
                      {/* Icono tipo */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${s.bg}`}>
                        {s.icon}
                      </div>

                      {/* Texto — clicar navega y descarta */}
                      <Link
                        href={n.href}
                        onClick={() => { dismissOne(n); setNotifOpen(false) }}
                        className="flex-1 min-w-0 group/link"
                      >
                        <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 leading-tight group-hover/link:text-teal-700 dark:group-hover/link:text-teal-400 transition-colors">
                          {n.titulo}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 leading-snug">{n.mensaje}</p>
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium mt-1 opacity-0 group-hover/link:opacity-100 transition-opacity" style={{ color: TEAL }}>
                          Ir al detalle
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </span>
                      </Link>

                      {/* X — descarta sin navegar */}
                      <button
                        onClick={() => dismissOne(n)}
                        className="shrink-0 mt-0.5 w-6 h-6 rounded-md flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.08)] transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="Descartar notificación"
                        title="Descartar"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Acceso rapido hospitales */}
      <a
        href="/hospitales"
        className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <HospitalIcon />
        <span>Hospitales</span>
      </a>

    </div>
  )
}
