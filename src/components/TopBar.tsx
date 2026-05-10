"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"

const TEAL = "#00A99D"

interface Resultado {
  tipo: "hospital" | "visita"
  id: string
  titulo: string
  subtitulo: string
  href: string
}

export function TopBar() {
  const [q, setQ] = useState("")
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

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
          subtitulo: `Visita · ${new Date(v.fecha).toLocaleDateString("es-ES")} · ${v.estado}`,
          href: `/visitas/${v.id}`,
        }))

      setResultados([...resH, ...resV])
      setAbierto(resH.length + resV.length > 0)
    } catch (e) {
      console.error("Error en búsqueda:", e)
    } finally {
      setBuscando(false)
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => buscar(q), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [q, buscar])

  // Cerrar al hacer click fuera
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
    <div className="h-14 bg-white border-b border-gray-100 flex items-center px-4 sm:px-8 gap-4 shrink-0">
      {/* Buscador */}
      <div ref={wrapRef} className="flex-1 max-w-md relative">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"
            width="15" height="15" viewBox="0 0 24 24" fill="none"
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
            placeholder="Buscar hospitales, visitas…"
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
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-50">
            {resultados.map(r => (
              <button
                key={`${r.tipo}-${r.id}`}
                onClick={() => navegar(r.href)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-lg shrink-0">
                  {r.tipo === "hospital" ? "🏥" : "📋"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.titulo}</p>
                  <p className="text-xs text-gray-400 truncate">{r.subtitulo}</p>
                </div>
                <span className="text-xs text-gray-300 shrink-0">
                  {r.tipo === "hospital" ? "Hospital" : "Visita"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Acceso rápido — nueva visita */}
      <a
        href="/hospitales"
        className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
      >
        <span>🏥</span> Hospitales
      </a>
    </div>
  )
}
