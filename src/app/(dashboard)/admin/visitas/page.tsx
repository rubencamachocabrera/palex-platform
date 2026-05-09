"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

const TEAL = "#00A99D"

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador", COMPLETADA: "Completada", ARCHIVADA: "Archivada"
}
const ESTADO_COLOR: Record<string, string> = {
  BORRADOR: "bg-amber-50 text-amber-600",
  COMPLETADA: "bg-green-50 text-green-600",
  ARCHIVADA: "bg-gray-100 text-gray-400",
}

interface Visita {
  id: string
  estado: string
  tipo: string
  fecha: string
  hospital: { id: string; nombre: string; ciudad: string; zona: { nombre: string } }
  usuario: { id: string; nombre: string; rol: string }
}

export default function AdminVisitasPage() {
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState("TODOS")
  const [filtroZona, setFiltroZona] = useState("TODAS")
  const [busqueda, setBusqueda] = useState("")

  useEffect(() => {
    fetch("/api/visitas")
      .then(r => r.json())
      .then(data => { setVisitas(data); setLoading(false) })
  }, [])

  const zonas = Array.from(new Set(visitas.map(v => v.hospital.zona.nombre))).sort()

  const filtradas = visitas.filter(v => {
    if (filtroEstado !== "TODOS" && v.estado !== filtroEstado) return false
    if (filtroZona !== "TODAS" && v.hospital.zona.nombre !== filtroZona) return false
    const q = busqueda.toLowerCase()
    if (q && !v.hospital.nombre.toLowerCase().includes(q) && !v.usuario.nombre.toLowerCase().includes(q)) return false
    return true
  })

  const btnClass = (active: boolean) =>
    `text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${active ? "text-white" : "text-gray-500 bg-white border border-gray-200 hover:border-gray-300"}`

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Todas las visitas</h1>
        <span className="text-sm text-gray-400">{filtradas.length} resultados</span>
      </div>

      {/* Filtros */}
      <div className="space-y-3 mb-5">
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por hospital o técnico…"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent bg-white"
        />
        <div className="flex gap-2 flex-wrap">
          {["TODOS", "BORRADOR", "COMPLETADA", "ARCHIVADA"].map(e => (
            <button key={e}
              onClick={() => setFiltroEstado(e)}
              className={btnClass(filtroEstado === e)}
              style={filtroEstado === e ? { backgroundColor: TEAL } : {}}>
              {e === "TODOS" ? "Todos" : ESTADO_LABEL[e]}
            </button>
          ))}
        </div>
        {zonas.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFiltroZona("TODAS")}
              className={btnClass(filtroZona === "TODAS")}
              style={filtroZona === "TODAS" ? { backgroundColor: TEAL } : {}}>
              Todas las zonas
            </button>
            {zonas.map(z => (
              <button key={z}
                onClick={() => setFiltroZona(z)}
                className={btnClass(filtroZona === z)}
                style={filtroZona === z ? { backgroundColor: TEAL } : {}}>
                {z}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : filtradas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">No hay visitas que coincidan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filtradas.map(v => (
              <Link
                key={v.id}
                href={`/dashboard/visitas/${v.id}`}
                className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{v.hospital.nombre}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {v.usuario.nombre} · {v.hospital.zona.nombre} · {new Date(v.fecha).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400 hidden sm:block">{v.tipo}</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${ESTADO_COLOR[v.estado]}`}>
                    {ESTADO_LABEL[v.estado]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
