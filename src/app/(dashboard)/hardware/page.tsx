"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { TEAL, ORANGE } from "@/lib/brand"
import { exportarCSV } from "@/lib/csv"
import { useToast } from "@/components/Toast"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface HardwareCatalogo {
  id: string; tipo: string; marca: string; modelo: string
  descripcion: string | null; precio: number | null; fichaUrl: string | null
  activo: boolean
  _stock?: { total: number; disponibles: number; asignados: number }
}
interface HardwareUnidad {
  id: string; numSerie: string | null; estado: string; notas: string | null
  creadoEn: string; fechaCompra: string | null; fechaGarantia: string | null
  catalogo: HardwareCatalogo
  hospital: { id: string; nombre: string; ciudad: string } | null
  preProyecto: { id: string; titulo: string } | null
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const HW_TIPOS = [
  { value: "BC_ROBOT",      label: "BC Robot" },
  { value: "ZEBRA_MC",      label: "Zebra MC" },
  { value: "ZEBRA_PRINTER", label: "Zebra Printer" },
  { value: "LECTOR_BARRAS", label: "Lector Barras" },
  { value: "SERVIDOR",      label: "Servidor" },
  { value: "SWITCH_RED",    label: "Switch Red" },
  { value: "TABLET",        label: "Tablet" },
  { value: "OTRO",          label: "Otro" },
]
const HW_TIPO_LABEL: Record<string, string> = Object.fromEntries(HW_TIPOS.map(t => [t.value, t.label]))

const HW_ESTADO: Record<string, { label: string; color: string; bg: string }> = {
  DISPONIBLE:       { label: "Disponible",    color: "#16a34a", bg: "#f0fdf4" },
  ASIGNADO:         { label: "Asignado",      color: TEAL,      bg: `${TEAL}18` },
  EN_MANTENIMIENTO: { label: "Mantenimiento", color: "#d97706", bg: "#fef3c7" },
  RETIRADO:         { label: "Retirado",      color: "#6b7280", bg: "#f3f4f6" },
  BAJA:             { label: "Baja",          color: "#dc2626", bg: "#fef2f2" },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtFecha(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}
function diasHasta(s: string | null) {
  if (!s) return null
  return Math.ceil((new Date(s).getTime() - Date.now()) / 86400000)
}

// ─── Iconos ───────────────────────────────────────────────────────────────────

function IcoPlus() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function IcoEdit() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function IcoTrash() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg> }
function IcoChevron({ open }: { open: boolean }) { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }}><polyline points="6 9 12 15 18 9"/></svg> }
function IcoDownload() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
function IcoSearch() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function IcoWarning() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> }

// ─── Shared input class ───────────────────────────────────────────────────────
const INPUT = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
const LABEL = "block text-xs font-medium text-gray-600 mb-1"

// ─── Tab: Resumen ─────────────────────────────────────────────────────────────

function ResumenTab({ unidades, catalogo, onTabChange }: {
  unidades: HardwareUnidad[]
  catalogo: HardwareCatalogo[]
  onTabChange: (t: string) => void
}) {
  const total        = unidades.length
  const disponibles  = unidades.filter(u => u.estado === "DISPONIBLE").length
  const asignados    = unidades.filter(u => u.estado === "ASIGNADO").length
  const mantenimiento = unidades.filter(u => u.estado === "EN_MANTENIMIENTO").length
  const baja         = unidades.filter(u => u.estado === "BAJA").length

  const byTipo = unidades.reduce<Record<string, number>>((acc, u) => {
    acc[u.catalogo.tipo] = (acc[u.catalogo.tipo] ?? 0) + 1
    return acc
  }, {})
  const maxTipo = Math.max(...Object.values(byTipo), 1)

  const garantiaProxima = unidades
    .filter(u => u.fechaGarantia && (diasHasta(u.fechaGarantia) ?? 999) <= 90 && (diasHasta(u.fechaGarantia) ?? 999) >= 0)
    .sort((a, b) => new Date(a.fechaGarantia!).getTime() - new Date(b.fechaGarantia!).getTime())
    .slice(0, 5)

  const kpis = [
    { label: "Total unidades",  value: total,         color: "#111827",  bg: "#f9fafb" },
    { label: "Disponibles",     value: disponibles,   color: "#16a34a",  bg: "#f0fdf4" },
    { label: "Asignados",       value: asignados,     color: TEAL,       bg: `${TEAL}10` },
    { label: "Mantenimiento",   value: mantenimiento, color: "#d97706",  bg: "#fef3c7" },
    { label: "Baja",            value: baja,          color: "#dc2626",  bg: "#fef2f2" },
  ]

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="stagger-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="card-hover bg-white rounded-2xl border border-gray-100 p-5 shadow-sm" style={{ borderTop: `3px solid ${k.color}` }}>
            <p className="text-3xl font-bold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs font-medium text-gray-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Distribución por tipo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribución por tipo</h3>
          {Object.keys(byTipo).length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(byTipo).sort((a, b) => b[1] - a[1]).map(([tipo, count]) => (
                <div key={tipo} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-28 shrink-0 truncate">{HW_TIPO_LABEL[tipo] ?? tipo}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, (count / maxTipo) * 100)}%`, backgroundColor: TEAL }} />
                  </div>
                  <span className="text-xs font-bold text-gray-700 w-5 text-right shrink-0">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertas de garantía */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Garantías próximas a vencer</h3>
            {garantiaProxima.length > 0 && (
              <button onClick={() => onTabChange("alertas")} className="text-xs font-medium hover:underline" style={{ color: TEAL }}>
                Ver todas
              </button>
            )}
          </div>
          {garantiaProxima.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: `${TEAL}18` }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">Sin vencimientos próximos</p>
              <p className="text-xs text-gray-400 mt-0.5">Ninguna garantía vence en 90 días</p>
            </div>
          ) : (
            <div className="space-y-2">
              {garantiaProxima.map(u => {
                const dias = diasHasta(u.fechaGarantia)!
                const urgente = dias <= 30
                return (
                  <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ backgroundColor: urgente ? "#fef2f2" : "#fef3c7" }}>
                    <span style={{ color: urgente ? "#dc2626" : "#d97706" }}><IcoWarning /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{u.catalogo.marca} {u.catalogo.modelo}</p>
                      <p className="text-xs text-gray-500">{u.numSerie ? `S/N: ${u.numSerie}` : "Sin nº serie"} · {u.hospital?.nombre ?? u.preProyecto?.titulo ?? "—"}</p>
                    </div>
                    <span className="text-xs font-bold shrink-0" style={{ color: urgente ? "#dc2626" : "#d97706" }}>
                      {dias === 0 ? "Hoy" : `${dias}d`}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Catálogo resumen */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Catálogo de modelos</h3>
          <button onClick={() => onTabChange("catalogo")} className="text-xs font-medium hover:underline" style={{ color: TEAL }}>
            Gestionar catálogo
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {catalogo.slice(0, 8).map(c => (
            <div key={c.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50 hover:border-teal-200 transition-colors">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{HW_TIPO_LABEL[c.tipo] ?? c.tipo}</span>
              <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{c.marca} {c.modelo}</p>
              <div className="flex items-center gap-2 mt-1.5 text-xs">
                <span className="text-green-700 font-medium">{c._stock?.disponibles ?? 0} disp.</span>
                <span className="text-gray-400">{c._stock?.total ?? 0} total</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Modal edición de unidad ──────────────────────────────────────────────────

function EditUnidadModal({ unidad, onClose, onSaved }: {
  unidad: HardwareUnidad
  onClose: () => void
  onSaved: (u: HardwareUnidad) => void
}) {
  const { success, error: toastError } = useToast()
  const [form, setForm] = useState({
    numSerie: unidad.numSerie ?? "",
    estado: unidad.estado,
    notas: unidad.notas ?? "",
    fechaCompra: unidad.fechaCompra ? unidad.fechaCompra.slice(0, 10) : "",
    fechaGarantia: unidad.fechaGarantia ? unidad.fechaGarantia.slice(0, 10) : "",
  })
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    try {
      const r = await fetch(`/api/hardware/unidades/${unidad.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numSerie: form.numSerie || null,
          estado: form.estado,
          notas: form.notas || null,
          fechaCompra: form.fechaCompra || null,
          fechaGarantia: form.fechaGarantia || null,
        }),
      })
      if (!r.ok) throw new Error()
      const updated = await r.json()
      onSaved({ ...unidad, ...updated })
      success("Unidad actualizada")
      onClose()
    } catch {
      toastError("Error al guardar")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-150">
      <div className="slide-up bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Editar unidad</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={guardar} className="p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">{unidad.catalogo.marca} {unidad.catalogo.modelo} · {HW_TIPO_LABEL[unidad.catalogo.tipo]}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={LABEL}>Nº de serie</label>
              <input value={form.numSerie} onChange={e => setForm(p => ({ ...p, numSerie: e.target.value }))}
                placeholder="S/N opcional" className={INPUT + " font-mono"} />
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Estado</label>
              <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))} className={INPUT}>
                {Object.entries(HW_ESTADO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Fecha de compra</label>
              <input type="date" value={form.fechaCompra} onChange={e => setForm(p => ({ ...p, fechaCompra: e.target.value }))} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Fin de garantía</label>
              <input type="date" value={form.fechaGarantia} onChange={e => setForm(p => ({ ...p, fechaGarantia: e.target.value }))} className={INPUT} />
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Notas</label>
              <textarea rows={2} value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                placeholder="Observaciones…" className={INPUT + " resize-none"} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: TEAL }}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Tab: Inventario ──────────────────────────────────────────────────────────

function InventarioTab({ unidades, onUpdated, onDeleted, esAdmin }: {
  unidades: HardwareUnidad[]
  onUpdated: (u: HardwareUnidad) => void
  onDeleted: (id: string) => void
  esAdmin: boolean
}) {
  const { success, error: toastError } = useToast()
  const [q, setQ] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [editando, setEditando] = useState<HardwareUnidad | null>(null)

  const filtradas = unidades.filter(u => {
    const matchQ = !q || [u.numSerie, u.catalogo.marca, u.catalogo.modelo, u.notas, u.hospital?.nombre, u.preProyecto?.titulo]
      .some(s => s?.toLowerCase().includes(q.toLowerCase()))
    const matchTipo = !filtroTipo || u.catalogo.tipo === filtroTipo
    const matchEstado = !filtroEstado || u.estado === filtroEstado
    return matchQ && matchTipo && matchEstado
  })

  async function cambiarEstado(u: HardwareUnidad, nuevoEstado: string) {
    const r = await fetch(`/api/hardware/unidades/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    })
    if (r.ok) {
      onUpdated({ ...u, estado: nuevoEstado })
      success("Estado actualizado")
    } else {
      toastError("Error al actualizar")
    }
  }

  async function eliminar(u: HardwareUnidad) {
    if (!confirm(`¿Eliminar ${u.catalogo.marca} ${u.catalogo.modelo}${u.numSerie ? ` (${u.numSerie})` : ""}? Esta acción no se puede deshacer.`)) return
    const r = await fetch(`/api/hardware/unidades/${u.id}`, { method: "DELETE" })
    if (r.ok) {
      onDeleted(u.id)
      success("Unidad eliminada")
    } else {
      toastError("Error al eliminar")
    }
  }

  function exportar() {
    exportarCSV(filtradas.map(u => ({
      Tipo: HW_TIPO_LABEL[u.catalogo.tipo] ?? u.catalogo.tipo,
      Marca: u.catalogo.marca,
      Modelo: u.catalogo.modelo,
      "Nº Serie": u.numSerie ?? "",
      Estado: HW_ESTADO[u.estado]?.label ?? u.estado,
      Hospital: u.hospital?.nombre ?? "",
      Ciudad: u.hospital?.ciudad ?? "",
      Proyecto: u.preProyecto?.titulo ?? "",
      "Fecha Compra": u.fechaCompra ? fmtFecha(u.fechaCompra) : "",
      "Fin Garantía": u.fechaGarantia ? fmtFecha(u.fechaGarantia) : "",
      Notas: u.notas ?? "",
    })), "hardware_inventario")
  }

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><IcoSearch /></span>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar por modelo, marca, nº serie, hospital…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
          <option value="">Todos los tipos</option>
          {HW_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
          <option value="">Todos los estados</option>
          {Object.entries(HW_ESTADO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={exportar}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shrink-0">
          <IcoDownload />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Tabla */}
      {filtradas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <p className="text-sm text-gray-400">{unidades.length === 0 ? "Sin unidades registradas" : "Sin resultados para los filtros actuales"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Tipo</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Dispositivo</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Nº Serie</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Estado</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Hospital / Proyecto</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Garantía</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((u, i) => {
                  const hw = HW_ESTADO[u.estado] ?? { label: u.estado, color: "#6b7280", bg: "#f3f4f6" }
                  const dias = diasHasta(u.fechaGarantia)
                  const garantiaAlerta = dias !== null && dias <= 30
                  return (
                    <tr key={u.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i % 2 !== 0 ? "bg-gray-50/20" : ""}`}>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                          {HW_TIPO_LABEL[u.catalogo.tipo] ?? u.catalogo.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-gray-900">{u.catalogo.marca} {u.catalogo.modelo}</p>
                        {u.notas && <p className="text-xs text-gray-400 truncate max-w-[160px]">{u.notas}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        {u.numSerie
                          ? <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">{u.numSerie}</code>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <select
                          value={u.estado}
                          onChange={e => cambiarEstado(u, e.target.value)}
                          className="text-xs font-bold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400"
                          style={{ backgroundColor: hw.bg, color: hw.color }}
                        >
                          {Object.entries(HW_ESTADO).map(([k, v]) => (
                            <option key={k} value={k} className="bg-white text-gray-800">{v.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3.5">
                        {u.hospital
                          ? <div><p className="text-xs font-medium text-gray-700">{u.hospital.nombre}</p><p className="text-xs text-gray-400">{u.hospital.ciudad}</p></div>
                          : u.preProyecto
                          ? <Link href={`/pre-proyectos/${u.preProyecto.id}`} className="text-xs font-medium hover:underline" style={{ color: TEAL }}>{u.preProyecto.titulo}</Link>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {u.fechaGarantia
                          ? <span className={`text-xs font-medium ${garantiaAlerta ? "text-red-600" : "text-gray-500"}`}>
                              {fmtFecha(u.fechaGarantia)}
                              {garantiaAlerta && <span className="ml-1 text-red-500">⚠</span>}
                            </span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => setEditando(u)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                            title="Editar"><IcoEdit /></button>
                          {esAdmin && (
                            <button onClick={() => eliminar(u)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Eliminar"><IcoTrash /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            {filtradas.length} unidad{filtradas.length !== 1 ? "es" : ""}
            {filtradas.length !== unidades.length && ` (de ${unidades.length} en total)`}
          </div>
        </div>
      )}

      {editando && (
        <EditUnidadModal
          unidad={editando}
          onClose={() => setEditando(null)}
          onSaved={u => { onUpdated(u); setEditando(null) }}
        />
      )}
    </div>
  )
}

// ─── Tab: Catálogo ────────────────────────────────────────────────────────────

const FORM_EMPTY = { tipo: "BC_ROBOT", marca: "", modelo: "", descripcion: "", precio: "", fichaUrl: "" }

function CatalogoTab({ catalogo, setCatalogo, esAdmin }: {
  catalogo: HardwareCatalogo[]
  setCatalogo: React.Dispatch<React.SetStateAction<HardwareCatalogo[]>>
  esAdmin: boolean
}) {
  const { success, error: toastError } = useToast()
  const [filtroTipo, setFiltroTipo] = useState("")
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({ ...FORM_EMPTY })
  const [guardando, setGuardando] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [unidadesCache, setUnidadesCache] = useState<Record<string, HardwareUnidad[]>>({})
  const [loadingUnidades, setLoadingUnidades] = useState<string | null>(null)
  const [stockForm, setStockForm] = useState<{ catalogoId: string; series: { numSerie: string; notas: string; fechaCompra: string; fechaGarantia: string }[] } | null>(null)
  const [guardandoStock, setGuardandoStock] = useState(false)
  const [editItem, setEditItem] = useState<HardwareCatalogo | null>(null)
  const [editForm, setEditForm] = useState({ tipo: "", marca: "", modelo: "", descripcion: "", precio: "", fichaUrl: "" })
  const [guardandoEdit, setGuardandoEdit] = useState(false)

  const filtrados = filtroTipo ? catalogo.filter(c => c.tipo === filtroTipo) : catalogo

  async function toggleExpandido(id: string) {
    if (expandido === id) { setExpandido(null); return }
    setExpandido(id)
    if (unidadesCache[id]) return
    setLoadingUnidades(id)
    const r = await fetch(`/api/hardware/${id}`)
    if (r.ok) {
      const data = await r.json()
      setUnidadesCache(prev => ({ ...prev, [id]: data.unidades ?? [] }))
    }
    setLoadingUnidades(null)
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    if (!form.marca.trim() || !form.modelo.trim()) { toastError("Marca y modelo son obligatorios"); return }
    setGuardando(true)
    try {
      const r = await fetch("/api/hardware", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!r.ok) throw new Error()
      const nuevo = await r.json()
      setCatalogo(prev => [...prev, { ...nuevo, _stock: { total: 0, disponibles: 0, asignados: 0 } }])
      setForm({ ...FORM_EMPTY })
      setMostrarForm(false)
      success("Modelo creado")
    } catch {
      toastError("Error al crear el modelo")
    } finally {
      setGuardando(false)
    }
  }

  function abrirEditar(item: HardwareCatalogo) {
    setEditItem(item)
    setEditForm({
      tipo: item.tipo, marca: item.marca, modelo: item.modelo,
      descripcion: item.descripcion ?? "", precio: item.precio != null ? String(item.precio) : "",
      fichaUrl: item.fichaUrl ?? "",
    })
  }

  async function guardarEditar(e: React.FormEvent) {
    e.preventDefault()
    if (!editItem) return
    setGuardandoEdit(true)
    try {
      const r = await fetch(`/api/hardware/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, precio: editForm.precio || null }),
      })
      if (!r.ok) throw new Error()
      const updated = await r.json()
      setCatalogo(prev => prev.map(c => c.id === editItem.id ? { ...c, ...updated } : c))
      setEditItem(null)
      success("Modelo actualizado")
    } catch {
      toastError("Error al actualizar")
    } finally {
      setGuardandoEdit(false)
    }
  }

  async function toggleActivo(item: HardwareCatalogo) {
    const r = await fetch(`/api/hardware/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !item.activo }),
    })
    if (r.ok) {
      setCatalogo(prev => prev.map(c => c.id === item.id ? { ...c, activo: !c.activo } : c))
      success(item.activo ? "Desactivado" : "Activado")
    }
  }

  async function añadirStock(e: React.FormEvent) {
    e.preventDefault()
    if (!stockForm) return
    setGuardandoStock(true)
    try {
      const payload = stockForm.series
        .filter(s => stockForm.series.length === 1 || s.numSerie.trim())
        .map(s => ({
          catalogoId: stockForm.catalogoId,
          numSerie: s.numSerie.trim() || null,
          notas: s.notas.trim() || null,
          fechaCompra: s.fechaCompra || null,
          fechaGarantia: s.fechaGarantia || null,
          estado: "DISPONIBLE",
        }))
      const r = await fetch("/api/hardware/unidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!r.ok) throw new Error()
      const nuevas: HardwareUnidad[] = await r.json()
      setUnidadesCache(prev => ({ ...prev, [stockForm.catalogoId]: [...(prev[stockForm.catalogoId] ?? []), ...nuevas] }))
      setCatalogo(prev => prev.map(c => c.id === stockForm.catalogoId
        ? { ...c, _stock: { total: (c._stock?.total ?? 0) + nuevas.length, disponibles: (c._stock?.disponibles ?? 0) + nuevas.length, asignados: c._stock?.asignados ?? 0 } }
        : c))
      setStockForm(null)
      success(`${nuevas.length} unidad${nuevas.length !== 1 ? "es" : ""} añadida${nuevas.length !== 1 ? "s" : ""}`)
    } catch {
      toastError("Error al añadir al stock")
    } finally {
      setGuardandoStock(false)
    }
  }

  const emptyStockRow = { numSerie: "", notas: "", fechaCompra: "", fechaGarantia: "" }

  return (
    <div>
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {[{ value: "", label: "Todos" }, ...HW_TIPOS].map(t => (
            <button key={t.value}
              onClick={() => setFiltroTipo(t.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors"
              style={{ backgroundColor: filtroTipo === t.value ? `${TEAL}18` : "#f9fafb", borderColor: filtroTipo === t.value ? TEAL : "#e5e7eb", color: filtroTipo === t.value ? TEAL : "#374151" }}>
              {t.label}
            </button>
          ))}
        </div>
        {esAdmin && (
          <button onClick={() => setMostrarForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shrink-0 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: TEAL }}>
            <IcoPlus />
            Nuevo modelo
          </button>
        )}
      </div>

      {/* Form nuevo modelo */}
      {mostrarForm && (
        <form onSubmit={crear} className="slide-down bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Añadir modelo al catálogo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className={LABEL}>Tipo *</label>
              <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} className={INPUT}>
                {HW_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div><label className={LABEL}>Marca *</label>
              <input value={form.marca} onChange={e => setForm(p => ({ ...p, marca: e.target.value }))} placeholder="Ej: Zebra…" className={INPUT} /></div>
            <div><label className={LABEL}>Modelo *</label>
              <input value={form.modelo} onChange={e => setForm(p => ({ ...p, modelo: e.target.value }))} placeholder="Ej: MC3300…" className={INPUT} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className={LABEL}>Precio unitario (€)</label>
              <input type="number" step="0.01" min="0" value={form.precio} onChange={e => setForm(p => ({ ...p, precio: e.target.value }))} placeholder="0.00" className={INPUT} /></div>
            <div><label className={LABEL}>URL ficha técnica</label>
              <input type="url" value={form.fichaUrl} onChange={e => setForm(p => ({ ...p, fichaUrl: e.target.value }))} placeholder="https://…" className={INPUT} /></div>
            <div><label className={LABEL}>Descripción</label>
              <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Opcional…" className={INPUT} /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setMostrarForm(false)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
            <button type="submit" disabled={guardando}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: TEAL }}>{guardando ? "Guardando…" : "Guardar modelo"}</button>
          </div>
        </form>
      )}

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="text-center py-10 text-sm text-gray-400 bg-white rounded-2xl border border-gray-100">
          {catalogo.length === 0 ? "Sin modelos en el catálogo. Crea el primero arriba." : "Sin modelos para el tipo seleccionado."}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {filtrados.map(item => {
            const stock = item._stock ?? { total: 0, disponibles: 0, asignados: 0 }
            const isOpen = expandido === item.id
            const unidades = unidadesCache[item.id] ?? []
            return (
              <div key={item.id}>
                <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg shrink-0">
                    {HW_TIPO_LABEL[item.tipo] ?? item.tipo}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{item.marca} {item.modelo}</p>
                      {item.precio != null && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {item.precio.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                        </span>
                      )}
                      {item.fichaUrl && (
                        <a href={item.fichaUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs font-medium transition-colors hover:opacity-70" style={{ color: TEAL }}>
                          Ver ficha
                        </a>
                      )}
                    </div>
                    {item.descripcion && <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">{item.descripcion}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">{stock.disponibles} disp.</span>
                    <span className="text-gray-400">{stock.total} total</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.activo ? `${TEAL}18` : "#f3f4f6", color: item.activo ? TEAL : "#9ca3af" }}>
                    {item.activo ? "Activo" : "Inactivo"}
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {esAdmin && (
                      <>
                        <button onClick={() => abrirEditar(item)} title="Editar modelo"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"><IcoEdit /></button>
                        <button onClick={() => toggleActivo(item)} title={item.activo ? "Desactivar" : "Activar"}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xs font-medium px-2">
                          {item.activo ? "Desact." : "Activar"}
                        </button>
                      </>
                    )}
                    <button onClick={() => toggleExpandido(item.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      title={isOpen ? "Cerrar" : "Ver stock"}>
                      <IcoChevron open={isOpen} />
                    </button>
                  </div>
                </div>

                {/* Panel de stock */}
                {isOpen && (
                  <div className="bg-gray-50 border-t border-gray-100 px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        {stock.disponibles} disponibles · {stock.asignados} asignadas · {stock.total} total
                      </p>
                      <button
                        onClick={() => setStockForm(stockForm?.catalogoId === item.id ? null : { catalogoId: item.id, series: [{ ...emptyStockRow }] })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: TEAL }}>
                        <IcoPlus />
                        Añadir al stock
                      </button>
                    </div>

                    {stockForm?.catalogoId === item.id && (
                      <form onSubmit={añadirStock} className="slide-down bg-white border border-teal-100 rounded-xl p-4 mb-3 space-y-3">
                        <p className="text-xs font-semibold text-gray-700">Nueva entrada de stock</p>
                        <div className="space-y-2">
                          {stockForm.series.map((s, i) => (
                            <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                              <div>
                                {i === 0 && <label className={LABEL}>Nº serie</label>}
                                <input value={s.numSerie}
                                  onChange={e => setStockForm(p => p ? { ...p, series: p.series.map((x, j) => j === i ? { ...x, numSerie: e.target.value } : x) } : p)}
                                  placeholder="Opcional" className={INPUT + " font-mono text-xs"} />
                              </div>
                              <div>
                                {i === 0 && <label className={LABEL}>Fecha compra</label>}
                                <input type="date" value={s.fechaCompra}
                                  onChange={e => setStockForm(p => p ? { ...p, series: p.series.map((x, j) => j === i ? { ...x, fechaCompra: e.target.value } : x) } : p)}
                                  className={INPUT + " text-xs"} />
                              </div>
                              <div>
                                {i === 0 && <label className={LABEL}>Fin garantía</label>}
                                <input type="date" value={s.fechaGarantia}
                                  onChange={e => setStockForm(p => p ? { ...p, series: p.series.map((x, j) => j === i ? { ...x, fechaGarantia: e.target.value } : x) } : p)}
                                  className={INPUT + " text-xs"} />
                              </div>
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  {i === 0 && <label className={LABEL}>Notas</label>}
                                  <input value={s.notas}
                                    onChange={e => setStockForm(p => p ? { ...p, series: p.series.map((x, j) => j === i ? { ...x, notas: e.target.value } : x) } : p)}
                                    placeholder="—" className={INPUT + " text-xs"} />
                                </div>
                                {stockForm.series.length > 1 && (
                                  <button type="button"
                                    onClick={() => setStockForm(p => p ? { ...p, series: p.series.filter((_, j) => j !== i) } : p)}
                                    className="mb-0 p-2 rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50 self-end transition-colors"><IcoTrash /></button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <button type="button"
                          onClick={() => setStockForm(p => p ? { ...p, series: [...p.series, { ...emptyStockRow }] } : p)}
                          className="text-xs font-medium transition-colors hover:opacity-80" style={{ color: TEAL }}>
                          + Añadir fila
                        </button>
                        <div className="flex gap-2 pt-1">
                          <button type="button" onClick={() => setStockForm(null)}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
                          <button type="submit" disabled={guardandoStock}
                            className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50 hover:opacity-90"
                            style={{ backgroundColor: TEAL }}>
                            {guardandoStock ? "Guardando…" : `Añadir ${stockForm.series.length} ud.`}
                          </button>
                        </div>
                      </form>
                    )}

                    {loadingUnidades === item.id ? (
                      <div className="space-y-1">{[1, 2].map(i => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
                    ) : unidades.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">Sin unidades en stock.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-400 border-b border-gray-200">
                              <th className="text-left pb-2 font-medium">Nº serie</th>
                              <th className="text-left pb-2 font-medium">Estado</th>
                              <th className="text-left pb-2 font-medium">Asignado a</th>
                              <th className="text-left pb-2 font-medium">Garantía</th>
                              <th className="text-left pb-2 font-medium">Notas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {unidades.map(u => {
                              const es = HW_ESTADO[u.estado] ?? { label: u.estado, color: "#6b7280", bg: "#f3f4f6" }
                              return (
                                <tr key={u.id} className="border-b border-gray-100 last:border-0 hover:bg-white/50">
                                  <td className="py-2 pr-3">
                                    {u.numSerie
                                      ? <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{u.numSerie}</code>
                                      : <span className="text-gray-300">—</span>}
                                  </td>
                                  <td className="py-2 pr-3">
                                    <span className="px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: es.bg, color: es.color }}>{es.label}</span>
                                  </td>
                                  <td className="py-2 pr-3 text-gray-500">
                                    {u.preProyecto
                                      ? <Link href={`/pre-proyectos/${u.preProyecto.id}`} className="hover:underline" style={{ color: TEAL }}>{u.preProyecto.titulo}</Link>
                                      : u.hospital?.nombre ?? <span className="text-gray-300">—</span>}
                                  </td>
                                  <td className="py-2 pr-3 text-gray-400">{fmtFecha(u.fechaGarantia)}</td>
                                  <td className="py-2 text-gray-400 max-w-[120px] truncate">{u.notas ?? "—"}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal editar modelo */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-150">
          <div className="slide-up bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Editar modelo</h2>
              <button onClick={() => setEditItem(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={guardarEditar} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div><label className={LABEL}>Tipo</label>
                  <select value={editForm.tipo} onChange={e => setEditForm(p => ({ ...p, tipo: e.target.value }))} className={INPUT}>
                    {HW_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div><label className={LABEL}>Marca</label>
                  <input value={editForm.marca} onChange={e => setEditForm(p => ({ ...p, marca: e.target.value }))} className={INPUT} /></div>
                <div><label className={LABEL}>Modelo</label>
                  <input value={editForm.modelo} onChange={e => setEditForm(p => ({ ...p, modelo: e.target.value }))} className={INPUT} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LABEL}>Precio (€)</label>
                  <input type="number" step="0.01" value={editForm.precio} onChange={e => setEditForm(p => ({ ...p, precio: e.target.value }))} placeholder="0.00" className={INPUT} /></div>
                <div><label className={LABEL}>URL ficha</label>
                  <input type="url" value={editForm.fichaUrl} onChange={e => setEditForm(p => ({ ...p, fichaUrl: e.target.value }))} placeholder="https://…" className={INPUT} /></div>
              </div>
              <div><label className={LABEL}>Descripción</label>
                <input value={editForm.descripcion} onChange={e => setEditForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Opcional…" className={INPUT} /></div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditItem(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={guardandoEdit}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90"
                  style={{ backgroundColor: TEAL }}>{guardandoEdit ? "Guardando…" : "Guardar cambios"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Alertas ─────────────────────────────────────────────────────────────

function AlertasTab({ unidades, onUpdated }: {
  unidades: HardwareUnidad[]
  onUpdated: (u: HardwareUnidad) => void
}) {
  const { success, error: toastError } = useToast()

  const garantia30 = unidades.filter(u => { const d = diasHasta(u.fechaGarantia); return d !== null && d >= 0 && d <= 30 })
  const garantia90 = unidades.filter(u => { const d = diasHasta(u.fechaGarantia); return d !== null && d > 30 && d <= 90 })
  const mantenimiento = unidades.filter(u => u.estado === "EN_MANTENIMIENTO")
  const baja = unidades.filter(u => u.estado === "BAJA")
  const huerfanos = unidades.filter(u => u.estado === "ASIGNADO" && !u.preProyecto && !u.hospital)

  async function cambiarEstado(u: HardwareUnidad, nuevoEstado: string) {
    const r = await fetch(`/api/hardware/unidades/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    })
    if (r.ok) { onUpdated({ ...u, estado: nuevoEstado }); success("Estado actualizado") }
    else toastError("Error al actualizar")
  }

  const total = garantia30.length + garantia90.length + mantenimiento.length + baja.length + huerfanos.length

  if (total === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: `${TEAL}18` }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <p className="text-base font-semibold text-gray-800">Sin alertas activas</p>
        <p className="text-sm text-gray-400 mt-1">Todo el inventario está en orden</p>
      </div>
    )
  }

  function SeccionAlertas({ titulo, items, color, bg, accion }: {
    titulo: string; items: HardwareUnidad[]; color: string; bg: string; accion?: string
  }) {
    if (items.length === 0) return null
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100" style={{ borderLeft: `3px solid ${color}` }}>
          <span style={{ color }}><IcoWarning /></span>
          <h3 className="text-sm font-semibold text-gray-800">{titulo}</h3>
          <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: bg, color }}>{items.length}</span>
        </div>
        <div className="divide-y divide-gray-50">
          {items.sort((a, b) => (diasHasta(a.fechaGarantia) ?? 999) - (diasHasta(b.fechaGarantia) ?? 999)).map(u => {
            const dias = diasHasta(u.fechaGarantia)
            return (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{u.catalogo.marca} {u.catalogo.modelo}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                    {u.numSerie && <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{u.numSerie}</code>}
                    <span>{HW_TIPO_LABEL[u.catalogo.tipo]}</span>
                    {(u.hospital || u.preProyecto) && <span>· {u.hospital?.nombre ?? u.preProyecto?.titulo}</span>}
                  </div>
                </div>
                {dias !== null && (
                  <span className="text-xs font-bold shrink-0" style={{ color }}>
                    {dias === 0 ? "Vence hoy" : `${dias}d`}
                  </span>
                )}
                {u.fechaGarantia && (
                  <span className="text-xs text-gray-400 shrink-0">{fmtFecha(u.fechaGarantia)}</span>
                )}
                {accion && (
                  <select
                    value={u.estado}
                    onChange={e => cambiarEstado(u, e.target.value)}
                    className="text-xs font-bold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 shrink-0"
                    style={{ backgroundColor: HW_ESTADO[u.estado]?.bg ?? "#f3f4f6", color: HW_ESTADO[u.estado]?.color ?? "#6b7280" }}
                  >
                    {Object.entries(HW_ESTADO).map(([k, v]) => <option key={k} value={k} className="bg-white text-gray-800">{v.label}</option>)}
                  </select>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SeccionAlertas titulo="Garantía vence en menos de 30 días" items={garantia30} color="#dc2626" bg="#fef2f2" accion="estado" />
      <SeccionAlertas titulo="Garantía vence en 30–90 días" items={garantia90} color="#d97706" bg="#fef3c7" accion="estado" />
      <SeccionAlertas titulo="En mantenimiento" items={mantenimiento} color="#d97706" bg="#fef3c7" accion="estado" />
      <SeccionAlertas titulo="Dados de baja" items={baja} color="#6b7280" bg="#f3f4f6" accion="estado" />
      <SeccionAlertas titulo="Asignados sin destino registrado" items={huerfanos} color={TEAL} bg={`${TEAL}18`} accion="estado" />
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const TABS = [
  { id: "resumen",    label: "Resumen" },
  { id: "inventario", label: "Inventario" },
  { id: "catalogo",   label: "Catálogo" },
  { id: "alertas",    label: "Alertas" },
]

export default function HardwarePage() {
  const [tab, setTab] = useState("resumen")
  const [rol, setRol] = useState("")
  const [unidades, setUnidades] = useState<HardwareUnidad[]>([])
  const [catalogo, setCatalogo] = useState<HardwareCatalogo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/perfil").then(r => r.ok ? r.json() : null).then(d => { if (d?.role) setRol(d.role) }).catch(() => {})
  }, [])

  const cargar = useCallback(async () => {
    setLoading(true)
    const [ru, rc] = await Promise.all([
      fetch("/api/hardware/unidades").then(r => r.ok ? r.json() : []),
      fetch("/api/hardware?activo=false").then(r => r.ok ? r.json() : []),
    ])
    if (Array.isArray(ru)) setUnidades(ru)
    if (Array.isArray(rc)) setCatalogo(rc)
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const esAdmin = rol === "ADMIN"

  const alertasCount = loading ? 0 : unidades.filter(u => {
    const dias = diasHasta(u.fechaGarantia)
    return (dias !== null && dias >= 0 && dias <= 90) || u.estado === "EN_MANTENIMIENTO" || u.estado === "BAJA"
  }).length

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hardware & Materiales</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión completa del inventario de dispositivos</p>
        </div>
        <button onClick={cargar} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="relative px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === t.id
              ? { backgroundColor: "white", color: TEAL, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
              : { color: "#6b7280" }}>
            {t.label}
            {t.id === "alertas" && alertasCount > 0 && (
              <span className="pop-in absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                style={{ backgroundColor: "#ef4444" }}>
                {alertasCount > 9 ? "9+" : alertasCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="space-y-4">
          <div className="stagger-grid grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
          <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      ) : (
        <div className="slide-down">
          {tab === "resumen" && (
            <ResumenTab unidades={unidades} catalogo={catalogo} onTabChange={setTab} />
          )}
          {tab === "inventario" && (
            <InventarioTab
              unidades={unidades}
              onUpdated={u => setUnidades(prev => prev.map(x => x.id === u.id ? u : x))}
              onDeleted={id => setUnidades(prev => prev.filter(x => x.id !== id))}
              esAdmin={esAdmin}
            />
          )}
          {tab === "catalogo" && (
            <CatalogoTab catalogo={catalogo} setCatalogo={setCatalogo} esAdmin={esAdmin} />
          )}
          {tab === "alertas" && (
            <AlertasTab
              unidades={unidades}
              onUpdated={u => setUnidades(prev => prev.map(x => x.id === u.id ? u : x))}
            />
          )}
        </div>
      )}
    </div>
  )
}
