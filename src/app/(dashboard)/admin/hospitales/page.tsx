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

interface Zona { id: string; nombre: string }
interface Hospital {
  id: string
  nombre: string
  ciudad: string
  provincia: string | null
  tipo: string
  activo: boolean
  camas: number | null
  zona: { id: string; nombre: string }
  _count?: { visitas: number }
}

const FORM_EMPTY = {
  nombre: "", ciudad: "", provincia: "", pais: "España",
  tipo: "HOSPITAL_PUBLICO", camas: "", zonaId: "", activo: true,
}

export default function HospitalesAdminPage() {
  const [hospitales, setHospitales] = useState<Hospital[]>([])
  const [zonas, setZonas] = useState<Zona[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...FORM_EMPTY })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")

  async function cargar() {
    setLoading(true)
    const [rH, rZ] = await Promise.all([
      fetch("/api/hospitales"),
      fetch("/api/zonas"),
    ])
    const [dataH, dataZ] = await Promise.all([rH.json(), rZ.json()])
    setHospitales(dataH)
    setZonas(dataZ)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const filtrados = hospitales.filter(h =>
    h.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    h.ciudad.toLowerCase().includes(busqueda.toLowerCase()) ||
    h.zona.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  function abrirCrear() {
    setEditId(null)
    setForm({ ...FORM_EMPTY, zonaId: zonas[0]?.id ?? "" })
    setError("")
    setModalOpen(true)
  }

  function abrirEditar(h: Hospital) {
    setEditId(h.id)
    setForm({
      nombre: h.nombre,
      ciudad: h.ciudad,
      provincia: h.provincia ?? "",
      pais: "España",
      tipo: h.tipo,
      camas: h.camas?.toString() ?? "",
      zonaId: h.zona.id,
      activo: h.activo,
    })
    setError("")
    setModalOpen(true)
  }

  async function guardar() {
    if (!form.nombre.trim() || !form.ciudad.trim() || !form.zonaId) {
      setError("Nombre, ciudad y zona son obligatorios"); return
    }
    setGuardando(true); setError("")
    try {
      const payload = {
        nombre: form.nombre.trim(),
        ciudad: form.ciudad.trim(),
        provincia: form.provincia.trim() || null,
        pais: form.pais,
        tipo: form.tipo,
        camas: form.camas ? parseInt(form.camas) : null,
        zonaId: form.zonaId,
        activo: form.activo,
      }
      const url = editId ? `/api/hospitales/${editId}` : "/api/hospitales"
      const method = editId ? "PATCH" : "POST"
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!r.ok) { const d = await r.json(); setError(d.error ?? "Error al guardar"); return }
      setModalOpen(false)
      await cargar()
    } finally { setGuardando(false) }
  }

  const f = (k: keyof typeof FORM_EMPTY, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Hospitales</h1>
        <button
          onClick={abrirCrear}
          className="text-sm font-medium text-white px-4 py-2 rounded-lg shrink-0"
          style={{ backgroundColor: TEAL }}
        >
          + Nuevo hospital
        </button>
      </div>

      {/* Buscador */}
      <div className="mb-4">
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, ciudad o zona…"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent bg-white"
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">No hay hospitales que coincidan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filtrados.map(h => (
              <div key={h.id} className="flex items-center gap-3 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800">{h.nombre}</p>
                    {!h.activo && (
                      <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Inactivo</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {h.ciudad}{h.provincia ? `, ${h.provincia}` : ""} · {h.zona.nombre} · {TIPO_LABELS[h.tipo] ?? h.tipo}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link
                    href={`/dashboard/hospitales/${h.id}`}
                    className="text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    Ver
                  </Link>
                  <button
                    onClick={() => abrirEditar(h)}
                    className="text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal crear/editar */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                {editId ? "Editar hospital" : "Nuevo hospital"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Nombre *</label>
                <input value={form.nombre} onChange={e => f("nombre", e.target.value)}
                  placeholder="Hospital Universitario de…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Ciudad *</label>
                  <input value={form.ciudad} onChange={e => f("ciudad", e.target.value)}
                    placeholder="Madrid"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Provincia</label>
                  <input value={form.provincia} onChange={e => f("provincia", e.target.value)}
                    placeholder="Madrid"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Tipo</label>
                  <select value={form.tipo} onChange={e => f("tipo", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent bg-white">
                    {Object.entries(TIPO_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Camas</label>
                  <input type="number" value={form.camas} onChange={e => f("camas", e.target.value)}
                    placeholder="500"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Zona *</label>
                <select value={form.zonaId} onChange={e => f("zonaId", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent bg-white">
                  <option value="">Seleccionar zona…</option>
                  {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                </select>
              </div>

              {editId && (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-gray-500">Activo</label>
                  <button
                    type="button"
                    onClick={() => f("activo", !form.activo)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.activo ? "bg-teal-500" : "bg-gray-200"}`}
                    style={form.activo ? { backgroundColor: TEAL } : {}}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.activo ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              )}

              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60"
                style={{ backgroundColor: TEAL }}>
                {guardando ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
