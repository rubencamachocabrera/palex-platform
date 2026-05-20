"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { OfflineIndicator } from "@/components/OfflineIndicator"
import { useSidebarToggle } from "@/components/Sidebar"
import { TEAL } from "@/lib/brand"

interface Resultado {
  tipo: "hospital" | "visita" | "preproyecto" | "proyecto"
  id: string
  titulo: string
  subtitulo: string
  href: string
}

interface Notificacion {
  tipo: "oportunidad_inactiva" | "visita_borrador" | "fase_retrasada" | "proyecto_por_vencer"
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

function PreProyectoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
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

  const buscar = useCallback(async (texto: string) => {
    if (texto.trim().length < 2) { setResultados([]); setAbierto(false); return }
    setBuscando(true)
    try {
      const r = await fetch("/api/search?q=" + encodeURIComponent(texto.trim()))
      if (!r.ok) return
      const { hospitales = [], visitas = [], preProyectos = [], proyectos = [] } = await r.json()

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

      const resPP: Resultado[] = preProyectos.map((p: { id: string; titulo: string; estado: string; hospital: { nombre: string; ciudad: string } }) => ({
        tipo: "preproyecto" as const,
        id: p.id,
        titulo: p.titulo,
        subtitulo: p.hospital?.nombre + (p.hospital?.ciudad ? " · " + p.hospital.ciudad : "") + " · " + p.estado,
        href: "/pre-proyectos/" + p.id,
      }))

      const resPR: Resultado[] = proyectos.map((p: { id: string; nombre: string; hospital: { nombre: string; ciudad: string } }) => ({
        tipo: "proyecto" as const,
        id: p.id,
        titulo: p.nombre,
        subtitulo: p.hospital?.nombre + (p.hospital?.ciudad ? " · " + p.hospital.ciudad : ""),
        href: "/proyectos/" + p.id,
      }))

      const todos = [...resH, ...resV, ...resPP, ...resPR]
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

  useEffect(() => {
    fetch("/api/notificaciones")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.items) setNotifs(d.items) })
      .catch(() => {})
  }, [])

  function navegar(href: string) {
    setQ("")
    setAbierto(false)
    router.push(href)
  }

  return (
    <div className="h-14 bg-white border-b border-gray-100 flex items-center px-4 sm:px-6 gap-3 shrink-0">

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
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-colors"
            style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
          />
          {buscando && (
            <div
              className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-gray-200 rounded-full animate-spin"
              style={{ borderTopColor: TEAL }}
            />
          )}
        </div>

        {/* Dropdown resultados */}
        {abierto && resultados.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-50 animate-in scale-in duration-150">
            {resultados.map(r => (
              <button
                key={`${r.tipo}-${r.id}`}
                onClick={() => navegar(r.href)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
              >
                <span className="shrink-0 text-gray-400">
                  {r.tipo === "hospital" ? <HospitalIcon />
                   : r.tipo === "visita" ? <VisitaIcon />
                   : r.tipo === "preproyecto" ? <PreProyectoIcon />
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
                    : r.tipo === "preproyecto" ? { backgroundColor: "#EEF2FF", color: "#4F46E5" }
                    : { backgroundColor: "#EFF6FF", color: "#2563EB" }
                  }
                >
                  {r.tipo === "hospital" ? "Hospital"
                   : r.tipo === "visita" ? "Visita"
                   : r.tipo === "preproyecto" ? "Pre-proyecto"
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

      {/* Campana de notificaciones */}
      <div ref={notifRef} className="relative">
        <button
          onClick={() => setNotifOpen(o => !o)}
          className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Notificaciones"
        >
          <BellIcon />
          {notifs.length > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: "#ef4444" }}>
              {notifs.length > 9 ? "9+" : notifs.length}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-900">Centro de alertas</p>
              {notifs.length > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-500">
                  {notifs.length} {notifs.length === 1 ? "alerta" : "alertas"}
                </span>
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
                  }
                  const s = styles[n.tipo] ?? styles.visita_borrador
                  return (
                    <Link
                      key={`${n.tipo}-${n.id}`}
                      href={n.href}
                      onClick={() => setNotifOpen(false)}
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${s.bg}`}>
                        {s.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{n.titulo}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.mensaje}</p>
                      </div>
                      <svg className="shrink-0 mt-2 text-gray-300 group-hover:text-gray-500 transition-colors" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </Link>
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
