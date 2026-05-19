"use client"

import { useEffect, useState, useCallback } from "react"
import { useToast } from "@/components/Toast"
import { TEAL } from "@/lib/brand"

const HW_TIPOS = [
  { value: "BC_ROBOT",      label: "BC Robo" },
  { value: "ZEBRA_MC",      label: "Zebra MC (Handheld)" },
  { value: "ZEBRA_PRINTER", label: "Zebra Printer" },
  { value: "LECTOR_BARRAS", label: "Lector Barras" },
  { value: "SERVIDOR",      label: "Servidor" },
  { value: "SWITCH_RED",    label: "Switch de Red" },
  { value: "TABLET",        label: "Tablet" },
  { value: "OTRO",          label: "Otro" },
]
const HW_TIPO_LABEL: Record<string, string> = Object.fromEntries(HW_TIPOS.map(t => [t.value, t.label]))

interface CatalogoItem {
  id: string; tipo: string; marca: string; modelo: string
  descripcion: string | null; activo: boolean; creadoEn: string
  _count: { unidades: number }
}

interface UnidadForm { catalogoId: string; numSerie: string; fechaCompra: string; fechaGarantia: string; notas: string }

function fmtFecha(s: string) {
  return new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

export default function AdminHardwarePage() {
  const { success, error: toastError } = useToast()
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState("")
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({ tipo: "BC_ROBOT", marca: "", modelo: "", descripcion: "" })
  const [guardando, setGuardando] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ tipo: "", marca: "", modelo: "", descripcion: "" })

  // Modal añadir unidades
  const [unidadModal, setUnidadModal] = useState<CatalogoItem | null>(null)
  const [unidadForm, setUnidadForm] = useState<UnidadForm>({ catalogoId: "", numSerie: "", fechaCompra: "", fechaGarantia: "", notas: "" })
  const [guardandoUnidad, setGuardandoUnidad] = useState(false)
  const [unidadesCatalogo, setUnidadesCatalogo] = useState<{ id: string; numSerie: string | null; estado: string; hospital: { nombre: string } | null; preProyecto: { titulo: string } | null }[]>([])

  const cargar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ activo: "true" })
    if (filtroTipo) params.set("tipo", filtroTipo)
    const r = await fetch(`/api/hardware?${params}`)
    if (r.ok) setCatalogo(await r.json())
    setLoading(false)
  }, [filtroTipo])

  useEffect(() => { cargar() }, [cargar])

  async function crearItem(e: React.FormEvent) {
    e.preventDefault()
    if (!form.marca.trim() || !form.modelo.trim()) return
    setGuardando(true)
    try {
      const r = await fetch("/api/hardware", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!r.ok) throw new Error()
      await cargar()
      setForm({ tipo: "BC_ROBOT", marca: "", modelo: "", descripcion: "" })
      setMostrarForm(false)
      success("Item creado en catálogo")
    } catch {
      toastError("Error al crear")
    } finally {
      setGuardando(false)
    }
  }

  async function guardarEdit(id: string) {
    setGuardando(true)
    try {
      await fetch(`/api/hardware/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      await cargar()
      setEditId(null)
      success("Actualizado")
    } catch {
      toastError("Error")
    } finally {
      setGuardando(false)
    }
  }

  async function desactivar(id: string) {
    try {
      await fetch(`/api/hardware/${id}`, { method: "DELETE" })
      await cargar()
      success("Item desactivado")
    } catch {
      toastError("Error")
    }
  }

  async function abrirUnidades(item: CatalogoItem) {
    setUnidadModal(item)
    setUnidadForm({ catalogoId: item.id, numSerie: "", fechaCompra: "", fechaGarantia: "", notas: "" })
    const r = await fetch(`/api/hardware/${item.id}`)
    if (r.ok) {
      const data = await r.json()
      setUnidadesCatalogo(data.unidades ?? [])
    }
  }

  async function crearUnidad(e: React.FormEvent) {
    e.preventDefault()
    setGuardandoUnidad(true)
    try {
      const r = await fetch("/api/hardware/unidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(unidadForm),
      })
      if (!r.ok) throw new Error()
      const nueva = await r.json()
      setUnidadesCatalogo(p => [nueva, ...p])
      setUnidadForm(p => ({ ...p, numSerie: "", fechaCompra: "", fechaGarantia: "", notas: "" }))
      await cargar()
      success("Unidad añadida")
    } catch {
      toastError("Error al añadir")
    } finally {
      setGuardandoUnidad(false)
    }
  }

  async function eliminarUnidad(id: string) {
    try {
      await fetch(`/api/hardware/unidades/${id}`, { method: "DELETE" })
      setUnidadesCatalogo(p => p.filter(u => u.id !== id))
      await cargar()
      success("Unidad eliminada")
    } catch {
      toastError("Error")
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo de Materiales</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona los modelos de dispositivos disponibles</p>
        </div>
        <button onClick={() => setMostrarForm(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-all"
          style={{ backgroundColor: TEAL }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo modelo
        </button>
      </div>

      {/* Filtro tipo */}
      <div className="flex gap-2 flex-wrap mb-5">
        <button onClick={() => setFiltroTipo("")}
          className="px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors"
          style={{ backgroundColor: !filtroTipo ? `${TEAL}18` : "white", borderColor: !filtroTipo ? TEAL : "#e5e7eb", color: !filtroTipo ? TEAL : "#6b7280" }}>
          Todos
        </button>
        {HW_TIPOS.map(t => (
          <button key={t.value} onClick={() => setFiltroTipo(filtroTipo === t.value ? "" : t.value)}
            className="px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors"
            style={{ backgroundColor: filtroTipo === t.value ? `${TEAL}18` : "white", borderColor: filtroTipo === t.value ? TEAL : "#e5e7eb", color: filtroTipo === t.value ? TEAL : "#6b7280" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Form nuevo */}
      {mostrarForm && (
        <form onSubmit={crearItem} className="bg-white rounded-2xl border border-teal-200 p-5 shadow-sm mb-5">
          <h3 className="font-semibold text-gray-900 mb-4">Nuevo modelo en catálogo</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo *</label>
              <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
                {HW_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Marca *</label>
              <input value={form.marca} onChange={e => setForm(p => ({ ...p, marca: e.target.value }))} placeholder="Ej: Zebra, Honeywell…"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Modelo *</label>
              <input value={form.modelo} onChange={e => setForm(p => ({ ...p, modelo: e.target.value }))} placeholder="Ej: TC73, ZD621…"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción</label>
              <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción opcional"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => setMostrarForm(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={guardando}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: TEAL }}>
              {guardando ? "Guardando…" : "Crear modelo"}
            </button>
          </div>
        </form>
      )}

      {/* Lista catálogo */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : catalogo.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><p className="text-sm">Sin modelos en catálogo</p></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {catalogo.map((item, i) => (
            <div key={item.id} className={`p-4 ${i !== 0 ? "border-t border-gray-100" : ""}`}>
              {editId === item.id ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  <select value={editForm.tipo} onChange={e => setEditForm(p => ({ ...p, tipo: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
                    {HW_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <input value={editForm.marca} onChange={e => setEditForm(p => ({ ...p, marca: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <input value={editForm.modelo} onChange={e => setEditForm(p => ({ ...p, modelo: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <input value={editForm.descripcion} onChange={e => setEditForm(p => ({ ...p, descripcion: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <div className="flex gap-2 sm:col-span-2">
                    <button onClick={() => setEditId(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                    <button onClick={() => guardarEdit(item.id)} disabled={guardando}
                      className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: TEAL }}>Guardar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">{HW_TIPO_LABEL[item.tipo] ?? item.tipo}</span>
                      <span className="font-semibold text-gray-900">{item.marca} {item.modelo}</span>
                      {item.descripcion && <span className="text-sm text-gray-400">{item.descripcion}</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{item._count.unidades} unidad{item._count.unidades !== 1 ? "es" : ""} registrada{item._count.unidades !== 1 ? "s" : ""} · añadido {fmtFecha(item.creadoEn)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => abrirUnidades(item)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">
                      Unidades ({item._count.unidades})
                    </button>
                    <button onClick={() => { setEditId(item.id); setEditForm({ tipo: item.tipo, marca: item.marca, modelo: item.modelo, descripcion: item.descripcion ?? "" }) }}
                      className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button onClick={() => desactivar(item.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal unidades */}
      {unidadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Unidades — {unidadModal.marca} {unidadModal.modelo}</h2>
                <p className="text-sm text-gray-400 mt-0.5">{HW_TIPO_LABEL[unidadModal.tipo] ?? unidadModal.tipo}</p>
              </div>
              <button onClick={() => setUnidadModal(null)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              {/* Form nueva unidad */}
              <form onSubmit={crearUnidad} className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Añadir unidad</p>
                <div className="grid grid-cols-2 gap-3">
                  <input value={unidadForm.numSerie} onChange={e => setUnidadForm(p => ({ ...p, numSerie: e.target.value }))}
                    placeholder="Nº serie (opcional)"
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                  <input value={unidadForm.notas} onChange={e => setUnidadForm(p => ({ ...p, notas: e.target.value }))}
                    placeholder="Notas"
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fecha compra</label>
                    <input type="date" value={unidadForm.fechaCompra} onChange={e => setUnidadForm(p => ({ ...p, fechaCompra: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fecha garantía</label>
                    <input type="date" value={unidadForm.fechaGarantia} onChange={e => setUnidadForm(p => ({ ...p, fechaGarantia: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                  </div>
                </div>
                <button type="submit" disabled={guardandoUnidad}
                  className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: TEAL }}>
                  {guardandoUnidad ? "Añadiendo…" : "Añadir unidad"}
                </button>
              </form>
              {/* Lista unidades */}
              {unidadesCatalogo.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Sin unidades registradas</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left py-2 font-medium">Nº Serie</th>
                      <th className="text-left py-2 font-medium">Estado</th>
                      <th className="text-left py-2 font-medium">Hospital</th>
                      <th className="text-left py-2 font-medium">Proyecto</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {unidadesCatalogo.map(u => (
                      <tr key={u.id} className="border-b border-gray-50">
                        <td className="py-2.5">
                          {u.numSerie ? <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{u.numSerie}</code> : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="py-2.5"><span className="text-xs text-gray-600">{u.estado}</span></td>
                        <td className="py-2.5 text-xs text-gray-500">{u.hospital?.nombre ?? "—"}</td>
                        <td className="py-2.5 text-xs text-gray-500 max-w-[120px] truncate">{u.preProyecto?.titulo ?? "—"}</td>
                        <td className="py-2.5 text-right">
                          <button onClick={() => eliminarUnidad(u.id)}
                            className="p-1 rounded hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
