"use client"

import { useEffect, useState } from "react"

const TEAL = "#00A99D"

interface Zona {
  id: string
  nombre: string
  descripcion: string | null
  activo: boolean
  _count?: { hospitales: number; usuarios: number }
}

export default function ZonasPage() {
  const [zonas, setZonas] = useState<Zona[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Zona | null>(null)
  const [form, setForm] = useState({ nombre: "", descripcion: "" })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")

  async function cargar() {
    setLoading(true)
    const r = await fetch("/api/zonas")
    const data = await r.json()
    setZonas(data)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  function abrirCrear() {
    setEditando(null)
    setForm({ nombre: "", descripcion: "" })
    setError("")
    setModalOpen(true)
  }

  function abrirEditar(z: Zona) {
    setEditando(z)
    setForm({ nombre: z.nombre, descripcion: z.descripcion ?? "" })
    setError("")
    setModalOpen(true)
  }

  async function guardar() {
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return }
    setGuardando(true)
    setError("")
    try {
      const url = editando ? `/api/zonas/${editando.id}` : "/api/zonas"
      const method = editando ? "PATCH" : "POST"
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null }),
      })
      if (!r.ok) { const d = await r.json(); setError(d.error ?? "Error al guardar"); return }
      setModalOpen(false)
      await cargar()
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(z: Zona) {
    if (!confirm(`¿Eliminar la zona "${z.nombre}"? Esta acción no se puede deshacer.`)) return
    await fetch(`/api/zonas/${z.id}`, { method: "DELETE" })
    await cargar()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Zonas</h1>
        <button
          onClick={abrirCrear}
          className="text-sm font-medium text-white px-4 py-2 rounded-lg"
          style={{ backgroundColor: TEAL }}
        >
          + Nueva zona
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : zonas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">No hay zonas creadas aún.</p>
          <button onClick={abrirCrear} className="mt-3 text-sm font-medium" style={{ color: TEAL }}>
            Crear primera zona →
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {zonas.map(z => (
              <div key={z.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: TEAL }}>
                  {z.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{z.nombre}</p>
                  {z.descripcion && <p className="text-xs text-gray-400 truncate">{z.descripcion}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {z._count?.hospitales ?? 0} hospitales · {z._count?.usuarios ?? 0} usuarios
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => abrirEditar(z)}
                    className="text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                    Editar
                  </button>
                  <button onClick={() => eliminar(z)}
                    className="text-xs text-red-400 hover:text-red-600 px-3 py-1.5 rounded-lg border border-red-100 hover:border-red-200 transition-colors">
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal crear/editar */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-5">
              {editando ? "Editar zona" : "Nueva zona"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Nombre *</label>
                <input
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Zona Norte"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Descripción (opcional)</label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Provincias, comunidades o descripción de la zona..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60"
                style={{ backgroundColor: TEAL }}
              >
                {guardando ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
