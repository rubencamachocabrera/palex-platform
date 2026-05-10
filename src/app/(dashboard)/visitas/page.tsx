"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

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
  id: string
  estado: string
  tipo: string
  fecha: string
  hospital: { id: string; nombre: string; ciudad: string }
}

export default function MisVisitasPage() {
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("TODOS")

  useEffect(() => {
    fetch("/api/visitas")
      .then(r => r.json())
      .then(data => { setVisitas(data); setLoading(false) })
  }, [])

  const filtradas = visitas.filter(v => filtro === "TODOS" || v.estado === filtro)

  const btnClass = (active: boolean) =>
    `text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
      active ? "text-white" : "text-gray-500 bg-white border border-gray-200 hover:border-gray-300"
    }`

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 mb-1">Mis visitas</h1>
      <p className="text-sm text-gray-400 mb-5">{visitas.length} visita{visitas.length !== 1 ? "s" : ""} en total</p>

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
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : filtradas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-2xl mb-2">📋</p>
          <p className="text-gray-500 text-sm font-medium">
            {filtro === "TODOS" ? "No tienes visitas registradas" : `No hay visitas en estado "${ESTADO_LABEL[filtro]}"`}
          </p>
          {filtro === "TODOS" && (
            <>
              <p className="text-gray-400 text-xs mt-1">Accede a un hospital para registrar tu primera visita.</p>
              <Link
                href="/hospitales"
                className="mt-3 inline-block text-sm font-medium"
                style={{ color: TEAL }}
              >
                Ver mis hospitales →
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filtradas.map(v => (
              <Link
                key={v.id}
                href={`/visitas/${v.id}`}
                className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors active:bg-gray-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{v.hospital.nombre}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {v.hospital.ciudad} · {new Date(v.fecha).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${ESTADO_COLOR[v.estado]}`}>
                    {ESTADO_LABEL[v.estado]}
                  </span>
                  <span className="text-gray-300 text-sm">›</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
