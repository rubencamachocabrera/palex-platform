"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { exportarCSV } from "@/lib/csv"
import { TEAL, ORANGE } from "@/lib/brand"

const TIPO_LABELS: Record<string, string> = {
  HOSPITAL_PUBLICO: "H. Publico",
  HOSPITAL_PRIVADO: "H. Privado",
  CLINICA_PRIVADA: "Clinica",
  LABORATORIO: "Laboratorio",
  CENTRO_SALUD: "C. Salud",
  UNIVERSIDAD: "Universidad",
  OTRO: "Otro",
}
const TIPO_LABELS_FULL: Record<string, string> = {
  HOSPITAL_PUBLICO: "Hospital Publico",
  HOSPITAL_PRIVADO: "Hospital Privado",
  CLINICA_PRIVADA: "Clinica Privada",
  LABORATORIO: "Laboratorio",
  CENTRO_SALUD: "Centro de Salud",
  UNIVERSIDAD: "Universidad",
  OTRO: "Otro",
}

interface Zona { id: string; nombre: string }
interface Hospital {
  id: string; nombre: string; ciudad: string; provincia: string | null
  tipo: string; activo: boolean; camas: number | null
  zona: { id: string; nombre: string }
  _count?: { visitas: number; contactos: number }
}

const FORM_EMPTY = {
  nombre: "", ciudad: "", provincia: "", pais: "Espana",
  tipo: "HOSPITAL_PUBLICO", camas: "", zonaId: "", activo: true,
}

export default function HospitalesAdminPage() {
  const [hospitales, setHospitales] = useState<Hospital[]>([])
  const [zonas, setZonas] = useState<Zona[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroZona, setFiltroZona] = useState("TODAS")
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...FORM_EMPTY })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [rH, rZ] = await Promise.all([fetch("/api/hospitales"), fetch("/api/zonas")])
      if (!rH.ok || !rZ.ok) throw new Error(`HTTP ${rH.status}/${rZ.status}`)
      const [dataH, dataZ] = await Promise.all([rH.json(), rZ.json()])
      setHospitales(Array.isArray(dataH) ? dataH : [])
      setZonas(Array.isArray(dataZ) ? dataZ : [])
    } catch (e) {
      console.error("Error cargando hospitales/zonas:", e)
      setError("No se pudieron cargar los datos. Comprueba la conexión.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const filtrados = hospitales.filter(h => {
    const q = busqueda.toLowerCase()
    const coincideQ = !q || h.nombre.toLowerCase().includes(q) || h.ciudad.toLowerCase().includes(q) || h.zona.nombre.toLowerCase().includes(q)
    const coincideZ = filtroZona === "TODAS" || h.zona.nombre === filtroZona
    return coincideQ && coincideZ
  })

  const zonasUnicas = Array.from(new Set(hospitales.map(h => h.zona.nombre))).sort()

  function exportar() {
    exportarCSV(filtrados.map(h => ({
      Nombre: h.nombre,
      Ciudad: h.ciudad,
      Provincia: h.provincia ?? "",
      Tipo: TIPO_LABELS_FULL[h.tipo] ?? h.tipo,
      Zona: h.zona.nombre,
      Camas: h.camas ?? "",
      Activo: h.activo ? "Si" : "No",
      Visitas: h._count?.visitas ?? 0,
      Contactos: h._count?.contactos ?? 0,
    })), "hospitales")
  }

  function abrirCrear() {
    setEditId(null)
    setForm({ ...FORM_EMPTY, zonaId: zonas[0]?.id ?? "" })
    setError("")
    setModalOpen(true)
  }

  function abrirEditar(h: Hospital) {
    setEditId(h.id)
    setForm({ nombre: h.nombre, ciudad: h.ciudad, provincia: h.provincia ?? "", pais: "Espana", tipo: h.tipo, camas: h.camas?.toString() ?? "", zonaId: h.zona.id, activo: h.activo })
    setError("")
    setModalOpen(true)
  }

  async function guardar() {
    if (!form.nombre.trim() || !form.ciudad.trim() || !form.zonaId) { setError("Nombre, ciudad y zona son obligatorios"); return }
    setGuardando(true); setError("")
    try {
      const payload = { nombre: form.nombre.trim(), ciudad: form.ciudad.trim(), provincia: form.provincia.trim() || null, pais: "Espana", tipo: form.tipo, camas: form.camas ? parseInt(form.camas) : null, zonaId: form.zonaId, activo: form.activo }
      const url = editId ? `/api/hospitales/${editId}` : "/api/hospitales"
      const method = editId ? "PATCH" : "POST"
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!r.ok) { const d = await r.json(); setError(d.error ?? "Error al guardar"); return }
      setModalOpen(false)
      await cargar()
    } finally { setGuardando(false) }
  }

  const f = (k: keyof typeof FORM_EMPTY, v: string | boolean) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div>
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hospitales</h1>
          <p className="text-sm text-gray-400 mt-0.5">{hospitales.length} hospitales registrados</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportar}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exportar CSV
          </button>
          <button
            onClick={abrirCrear}
            className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg hover:opacity-90 transition shadow-sm"
            style={{ backgroundColor: ORANGE }}
          >
            + Nuevo hospital
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, ciudad o zona…"
          className="flex-1 min-w-48 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white"
        />
        {zonasUnicas.length > 1 && (
          <select
            value={filtroZona}
            onChange={e => setFiltroZona(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="TODAS">Todas las zonas</option>
            {zonasUnicas.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: TEAL }} />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <p className="text-3xl mb-3">🏥</p>
          <p className="text-gray-500 text-sm font-medium">No hay hospitales que coincidan</p>
          {busqueda && <button onClick={() => setBusqueda("")} className="text-xs mt-2 font-medium" style={{ color: TEAL }}>Limpiar busqueda</button>}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Cabecera tabla */}
          <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-gray-50 bg-gray-50">
            <p className="col-span-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Hospital</p>
            <p className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Zona</p>
            <p className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipo</p>
            <p className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Visitas</p>
            <p className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Acciones</p>
          </div>
          <div className="divide-y divide-gray-50">
            {filtrados.map(h => (
              <div key={h.id} className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center hover:bg-gray-50 transition-colors">
                <div className="col-span-4 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800 truncate">{h.nombre}</p>
                    {!h.activo && <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full shrink-0">Inactivo</span>}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{h.ciudad}{h.provincia ? `, ${h.provincia}` : ""}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">{h.zona.nombre}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-gray-500">{TIPO_LABELS[h.tipo] ?? h.tipo}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-gray-500">{h._count?.visitas ?? 0} visitas</span>
                </div>
                <div className="col-span-2 flex gap-1.5 justify-end">
                  <Link
                    href={`/hospitales/${h.id}`}
                    className="text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    Ver
                  </Link>
                  <button
                    onClick={() => abrirEditar(h)}
                    className="text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50">
            <p className="text-xs text-gray-400">{filtrados.length} de {hospitales.length} hospitales</p>
          </div>
        </div>
      )}

      {/* Modal crear/editar */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">{editId ? "Editar hospital" : "Nuevo hospital"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-300 hover:text-gray-600 text-xl leading-none">x</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Nombre *</label>
                <input value={form.nombre} onChange={e => f("nombre", e.target.value)} placeholder="Hospital Universitario de..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Ciudad *</label>
                  <input value={form.ciudad} onChange={e => f("ciudad", e.target.value)} placeholder="Madrid"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Provincia</label>
                  <input value={form.provincia} onChange={e => f("provincia", e.target.value)} placeholder="Madrid"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Tipo</label>
                  <select value={form.tipo} onChange={e => f("tipo", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
                    {Object.entries(TIPO_LABELS_FULL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Camas</label>
                  <input type="number" value={form.camas} onChange={e => f("camas", e.target.value)} placeholder="500"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Zona *</label>
                <select value={form.zonaId} onChange={e => f("zonaId", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
                  <option value="">Seleccionar zona...</option>
                  {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                </select>
              </div>
              {editId && (
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Hospital activo</p>
                    <p className="text-xs text-gray-400">Los hospitales inactivos no aparecen en las listas</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => f("activo", !form.activo)}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                    style={{ backgroundColor: form.activo ? TEAL : "#e5e7eb" }}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.activo ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-2.5 rounded-lg">
                  <span>x</span> {error}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: ORANGE }}>
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
