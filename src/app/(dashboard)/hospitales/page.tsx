"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

const TEAL = "#00A99D"

const TIPO_LABELS: Record<string, string> = {
  HOSPITAL_PUBLICO: "Hospital Público",
  HOSPITAL_PRIVADO: "Hospital Privado",
  CLINICA_PRIVADA: "Clínica Privada",
  LABORATORIO: "Laboratorio",
  CENTRO_SALUD: "Centro de Salud",
  UNIVERSIDAD: "Universidad",
  OTRO: "Otro",
}

interface Hospital {
  id: string
  nombre: string
  ciudad: string
  provincia: string | null
  tipo: string
  camas: number | null
  zona: { id: string; nombre: string }
  _count: { visitas: number; contactos: number }
}

export default function HospitalesPage() {
  const [hospitales, setHospitales] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")

  useEffect(() => {
    fetch("/api/hospitales")
      .then(r => r.json())
      .then(data => { setHospitales(data); setLoading(false) })
  }, [])

  const filtrados = hospitales.filter(h =>
    h.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    h.ciudad.toLowerCase().includes(busqueda.toLowerCase())
  )

  // Agrupar por zona
  const porZona = filtrados.reduce<Record<string, Hospital[]>>((acc, h) => {
    const zona = h.zona.nombre
    if (!acc[zona]) acc[zona] = []
    acc[zona].push(h)
    return acc
  }, {})

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 mb-1">Mis hospitales</h1>
      <p className="text-sm text-gray-400 mb-5">{hospitales.length} centros en tu zona</p>

      <div className="mb-5">
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o ciudad…"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent bg-white"
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-2xl mb-2">🏥</p>
          <p className="text-gray-500 text-sm font-medium">No hay hospitales asignados</p>
          <p className="text-gray-400 text-xs mt-1">
            Contacta con el administrador para que te asigne una zona.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(porZona).map(([zona, lista]) => (
            <div key={zona}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{zona}</span>
                <span className="text-xs text-gray-300">({lista.length})</span>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {lista.map(h => (
                    <Link
                      key={h.id}
                      href={`/hospitales/${h.id}`}
                      className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors active:bg-gray-100"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 bg-teal-50">
                        🏥
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{h.nombre}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {h.ciudad}{h.provincia ? `, ${h.provincia}` : ""}
                          {h.camas ? ` · ${h.camas} camas` : ""}
                        </p>
                        <p className="text-xs text-gray-300 mt-0.5">{TIPO_LABELS[h.tipo] ?? h.tipo}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400">{h._count.visitas} visitas</p>
                        <span className="text-gray-300 text-sm">›</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
