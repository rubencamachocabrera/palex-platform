"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { exportarCSV } from "@/lib/csv"

const TEAL = "#00A99D"

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador", COMPLETADA: "Completada", ARCHIVADA: "Archivada",
}
const ESTADO_COLOR: Record<string, string> = {
  BORRADOR: "bg-amber-50 text-amber-600",
  COMPLETADA: "bg-green-50 text-green-600",
  ARCHIVADA: "bg-gray-100 text-gray-400",
}

interface Visita {
  id: string; estado: string; tipo: string; fecha: string
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
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => { setVisitas(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(e => { console.error("Error cargando visitas:", e); setLoading(false) })
  }, [])

  const zonas = Array.from(new Set(visitas.map(v => v.hospital.zona.nombre))).sort()

  const filtradas = visitas.filter(v => {
    if (filtroEstado !== "TODOS" && v.estado !== filtroEstado) return false
    if (filtroZona !== "TODAS" && v.hospital.zona.nombre !== filtroZona) return false
    const q = busqueda.toLowerCase()
    if (q && !v.hospital.nombre.toLowerCase().includes(q) && !v.usuario.nombre.toLowerCase().includes(q)) return false
    return true
  })

  function exportar() {
    exportarCSV(filtradas.map(v => ({
      Hospital: v.hospital.nombre,
      Ciudad: v.hospital.ciudad,
      Zona: v.hospital.zona.nombre,
      Tecnico: v.usuario.nombre,
      Rol: v.usuario.rol,
      Tipo: v.tipo,
      Estado: ESTADO_LABEL[v.estado] ?? v.estado,
      Fecha: new Date(v.fecha).toLocaleDateString("es-ES"),
    })), "visitas")
  }

  const btnFiltro = (active: boolean) =>
    `text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${active ? "text-white" : "text-gray-500 bg-white border border-gray-200 hover:border-gray-300"}`

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Todas las visitas</h1>
          <p className="text-sm text-gray-400 mt-0.5">{filtradas.length} resultados</p>
        </div>
        <button
          onClick={exportar}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Exportar CSV
        </button>
      </div>

      <div className="space-y-3 mb-5">
        <input
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por hospital o tecnico..."
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white"
        />
        <div className="flex gap-2 flex-wrap">
          {["TODOS", "BORRADOR", "COMPLETADA", "ARCHIVADA"].map(e => (
            <button key={e} onClick={() => setFiltroEstado(e)}
              className={btnFiltro(filtroEstado === e)}
              style={filtroEstado === e ? { backgroundColor: TEAL } : {}}>
              {e === "TODOS" ? "Todos los estados" : ESTADO_LABEL[e]}
            </button>
          ))}
        </div>
        {zonas.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {["TODAS", ...zonas].map(z => (
              <button key={z} onClick={() => setFiltroZona(z)}
                className={btnFiltro(filtroZona === z)}
                style={filtroZona === z ? { backgroundColor: TEAL } : {}}>
                {z === "TODAS" ? "Todas las zonas" : z}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: TEAL }} />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No hay visitas que coincidan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filtradas.map(v => (
              <Link key={v.id} href={`/visitas/${v.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{v.hospital.nombre}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {v.usuario.nombre} · {v.hospital.zona.nombre} · {new Date(v.fecha).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-300 hidden sm:block">{v.tipo}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLOR[v.estado]}`}>
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
