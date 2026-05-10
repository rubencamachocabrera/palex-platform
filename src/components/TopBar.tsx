"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { OfflineIndicator } from "@/components/OfflineIndicator"
import { useSidebarToggle } from "@/components/Sidebar"

const TEAL = "#00A99D"

interface Resultado {
  tipo: "hospital" | "visita"
  id: string
  titulo: string
  subtitulo: string
  href: string
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

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
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

  const buscar = useCallback(async (texto: string) => {
    if (texto.trim().length < 2) { setResultados([]); setAbierto(false); return }
    setBuscando(true)
    try {
      const [rH, rV] = await Promise.all([
        fetch("/api/hospitales"),
        fetch("/api/visitas"),
      ])
      const [hospitales, visitas] = await Promise.all([
        rH.ok ? rH.json() : [],
        rV.ok ? rV.json() : [],
      ])
      const q2 = texto.toLowerCase()
      const resH: Resultado[] = (Array.isArray(hospitales) ? hospitales : [])
        .filter((h: { nombre: string; ciudad: string }) =>
          h.nombre.toLowerCase().includes(q2) || h.ciudad.toLowerCase().includes(q2))
        .slice(0, 4)
        .map((h: { id: string; nombre: string; ciudad: string; zona: { nombre: string } }) => ({
          tipo: "hospital" as const,
          id: h.id,
          titulo: h.nombre,
          subtitulo: `${h.ciudad} · ${h.zona?.nombre ?? ""}`,
          href: `/hospitales/${h.id}`,
        }))

      const resV: Resultado[] = (Array.isArray(visitas) ? visitas : [])
        .filter((v: { hospital: { nombre: string }; usuario: { nombre: string } }) =>
          v.hospital?.nombre?.toLowerCase().includes(q2) ||
          v.usuario?.nombre?.toLowerCase().includes(q2))
        .slice(0, 3)
        .map((v: { id: string; hospital: { nombre: string }; fecha: string; estado: string }) => ({
          tipo: "visita" as const,
          id: v.id,
          titulo: v.hospital?.nombre ?? "Visita",
          subtitulo: `${new Date(v.fecha).toLocaleDateString("es-ES")} · ${v.estado}`,
          href: `/visitas/${v.id}`,
        }))

      setResultados([...resH, ...resV])
      setAbierto(resH.length + resV.length > 0)
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
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
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
                  {r.tipo === "hospital" ? <HospitalIcon /> : <VisitaIcon />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.titulo}</p>
                  <p className="text-xs text-gray-400 truncate">{r.subtitulo}</p>
                </div>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={r.tipo === "hospital"
                    ? { backgroundColor: "#E6F7F6", color: TEAL }
                    : { backgroundColor: "#FEF3E5", color: "#F7941D" }
                  }
                >
                  {r.tipo === "hospital" ? "Hospital" : "Visita"}
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
