"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

const TEAL   = "#00A99D"
const ORANGE = "#F7941D"

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador", COMPLETADA: "Completada", ARCHIVADA: "Archivada",
}
const ESTADO_COLOR: Record<string, string> = {
  BORRADOR:   "bg-amber-50 text-amber-600",
  COMPLETADA: "bg-green-50 text-green-600",
  ARCHIVADA:  "bg-gray-100 text-gray-400",
}

interface Visita {
  id: string
  estado: string
  tipo: string
  fecha: string
  hospital: { id: string; nombre: string; ciudad: string }
}

function SkeletonVisita() {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 rounded-lg skeleton-shimmer" />
        <div className="h-3 w-1/3 rounded-lg skeleton-shimmer" />
      </div>
      <div className="h-6 w-20 rounded-full skeleton-shimmer shrink-0" />
    </div>
  )
}

function DocumentIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}

export default function MisVisitasPage() {
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("TODOS")

  useEffect(() => {
    fetch("/api/visitas")
      .then(r => r.json())
      .then(data => { setVisitas(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtradas = visitas.filter(v => filtro === "TODOS" || v.estado === filtro)

  const btnClass = (active: boolean) =>
    `text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
      active ? "text-white shadow-sm" : "text-gray-500 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
    }`

  return (
    <div className="animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold text-gray-800">Mis visitas</h1>
      </div>
      <p className="text-sm text-gray-400 mb-5">
        {loading ? "Cargando..." : `${visitas.length} visita${visitas.length !== 1 ? "s" : ""} en total`}
      </p>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap mb-5">
        {(["TODOS", "BORRADOR", "COMPLETADA", "ARCHIVADA"] as const).map(e => (
          <button
            key={e}
            onClick={() => setFiltro(e)}
            className={btnClass(filtro === e)}
            style={filtro === e ? { backgroundColor: TEAL } : {}}
          >
            {e === "TODOS" ? "Todas" : ESTADO_LABEL[e]}
            {!loading && e !== "TODOS" && (
              <span className="ml-1.5 opacity-60">
                {visitas.filter(v => v.estado === e).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonVisita key={i} />)}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="p-12 text-center">
            <div className="flex justify-center mb-3 opacity-40">
              <DocumentIcon />
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">
              {filtro === "TODOS" ? "No tienes visitas registradas" : `No hay visitas "${ESTADO_LABEL[filtro]}"`}
            </p>
            {filtro === "TODOS" && (
              <>
                <p className="text-gray-400 text-xs">Accede a un hospital para registrar tu primera visita.</p>
                <Link
                  href="/hospitales"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: ORANGE }}
                >
                  Ver mis hospitales
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtradas.map((v, i) => (
              <Link
                key={v.id}
                href={`/visitas/${v.id}`}
                className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors active:bg-gray-100 group animate-in fade-in duration-200"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "#F3F4F6" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-gray-900">{v.hospital.nombre}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {v.hospital.ciudad} · {new Date(v.fecha).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ESTADO_COLOR[v.estado]}`}>
                    {ESTADO_LABEL[v.estado]}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-gray-400 transition-colors">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
