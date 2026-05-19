"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/components/Toast"
import { TEAL, ORANGE } from "@/lib/brand"

// ---- tipos ----

interface Config { id: number; crmActivo: boolean }
interface StockResumen { total: number; disponibles: number; asignados: number }
interface UnidadStock {
  id: string; numSerie: string | null; estado: string; notas: string | null
  fechaCompra: string | null; fechaGarantia: string | null
  preProyecto: { id: string; titulo: string } | null
}
interface CatalogoItem {
  id: string; tipo: string; marca: string; modelo: string
  descripcion: string | null; precio: number | null; fichaUrl: string | null
  activo: boolean; _stock?: StockResumen
}
interface ModuloItem { id: string; nombre: string; activo: boolean; _count?: { proyectos: number } }

// ---- constantes ----

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

// ---- subcomponentes ----

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ backgroundColor: checked ? TEAL : "#d1d5db" } as React.CSSProperties}
    >
      <span
        className="pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out"
        style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  )
}

function ModuleCard({
  title, description, activo, onToggle, saving, icon,
}: {
  title: string; description: string; activo: boolean
  onToggle: (v: boolean) => void; saving: boolean; icon: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-start gap-5 shadow-sm">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: activo ? `${TEAL}18` : "#f3f4f6" }}>
        <span style={{ color: activo ? TEAL : "#9ca3af" }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{description}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm font-medium" style={{ color: activo ? TEAL : "#9ca3af" }}>
              {activo ? "Activo" : "Inactivo"}
            </span>
            <ToggleSwitch checked={activo} onChange={onToggle} disabled={saving} />
          </div>
        </div>
        <div className="mt-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: activo ? `${TEAL}18` : "#fef3c714", color: activo ? TEAL : ORANGE }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activo ? TEAL : ORANGE }} />
            {activo ? "Visible en la aplicación" : "Oculto para todos los usuarios"}
          </span>
        </div>
      </div>
    </div>
  )
}

// ---- sección catálogo hardware ----

const FORM_EMPTY = { tipo: "BC_ROBOT", marca: "", modelo: "", descripcion: "", precio: "", fichaUrl: "" }

function CatalogoHardware() {
  const { success, error: toastError } = useToast()
  const [items, setItems] = useState<CatalogoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState("")
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({ ...FORM_EMPTY })
  const [guardando, setGuardando] = useState(false)
  // Expand: unidades del modelo
  const [expandido, setExpandido] = useState<string | null>(null)
  const [unidadesCache, setUnidadesCache] = useState<Record<string, UnidadStock[]>>({})
  const [loadingUnidades, setLoadingUnidades] = useState<string | null>(null)
  // Stock form por modelo
  const [stockForm, setStockForm] = useState<{ catalogoId: string; series: { numSerie: string; notas: string }[] } | null>(null)
  const [guardandoStock, setGuardandoStock] = useState(false)

  const cargar = async () => {
    setLoading(true)
    const params = new URLSearchParams({ activo: "false" })
    if (filtroTipo) params.set("tipo", filtroTipo)
    const r = await fetch(`/api/hardware?${params}`)
    if (r.ok) setItems(await r.json())
    setLoading(false)
  }

  useEffect(() => { cargar() }, [filtroTipo]) // eslint-disable-line react-hooks/exhaustive-deps

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
      setItems(prev => [...prev, { ...nuevo, _stock: { total: 0, disponibles: 0, asignados: 0 } }])
      setForm({ ...FORM_EMPTY })
      setMostrarForm(false)
      success("Modelo creado")
    } catch {
      toastError("Error al crear el modelo")
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo(item: CatalogoItem) {
    const r = await fetch(`/api/hardware/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !item.activo }),
    })
    if (r.ok) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, activo: !i.activo } : i))
      success(item.activo ? "Desactivado" : "Activado")
    }
  }

  async function añadirStock(e: React.FormEvent) {
    e.preventDefault()
    if (!stockForm) return
    const series = stockForm.series.filter(s => s.numSerie.trim() || stockForm.series.length === 1)
    setGuardandoStock(true)
    try {
      const payload = series.map(s => ({
        catalogoId: stockForm.catalogoId,
        numSerie: s.numSerie.trim() || null,
        notas: s.notas.trim() || null,
        estado: "DISPONIBLE",
      }))
      const r = await fetch("/api/hardware/unidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!r.ok) throw new Error()
      const nuevas: UnidadStock[] = await r.json()
      setUnidadesCache(prev => ({ ...prev, [stockForm.catalogoId]: [...(prev[stockForm.catalogoId] ?? []), ...nuevas] }))
      setItems(prev => prev.map(i => i.id === stockForm.catalogoId
        ? { ...i, _stock: { ...(i._stock ?? { total: 0, disponibles: 0, asignados: 0 }), total: (i._stock?.total ?? 0) + nuevas.length, disponibles: (i._stock?.disponibles ?? 0) + nuevas.length } }
        : i
      ))
      setStockForm(null)
      success(`${nuevas.length} unidad${nuevas.length !== 1 ? "es" : ""} añadida${nuevas.length !== 1 ? "s" : ""} al stock`)
    } catch {
      toastError("Error al añadir al stock")
    } finally {
      setGuardandoStock(false)
    }
  }

  const HW_ESTADO_COLOR: Record<string, string> = {
    DISPONIBLE: "bg-green-50 text-green-700",
    ASIGNADO: `text-white`,
    EN_MANTENIMIENTO: "bg-amber-50 text-amber-700",
    RETIRADO: "bg-gray-100 text-gray-500",
    BAJA: "bg-red-50 text-red-600",
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Catálogo de Materiales</h2>
          <p className="text-sm text-gray-500 mt-0.5">Modelos, precios y stock disponible</p>
        </div>
        <button onClick={() => setMostrarForm(v => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ backgroundColor: TEAL }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo modelo
        </button>
      </div>

      {/* Formulario nuevo modelo */}
      {mostrarForm && (
        <form onSubmit={crear} className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Añadir modelo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
              <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
                {HW_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Marca *</label>
              <input value={form.marca} onChange={e => setForm(p => ({ ...p, marca: e.target.value }))}
                placeholder="Ej: Zebra, Honeywell…"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Modelo *</label>
              <input value={form.modelo} onChange={e => setForm(p => ({ ...p, modelo: e.target.value }))}
                placeholder="Ej: MC3300, ZD421…"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Precio unitario (€)</label>
              <input type="number" step="0.01" min="0" value={form.precio} onChange={e => setForm(p => ({ ...p, precio: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">URL ficha de producto</label>
              <input type="url" value={form.fichaUrl} onChange={e => setForm(p => ({ ...p, fichaUrl: e.target.value }))}
                placeholder="https://…"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
            <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              placeholder="Notas opcionales…"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setMostrarForm(false)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
            <button type="submit" disabled={guardando}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
              style={{ backgroundColor: TEAL }}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      )}

      {/* Filtro tipo */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[{ value: "", label: "Todos" }, ...HW_TIPOS].map(t => (
          <button key={t.value}
            onClick={() => setFiltroTipo(t.value === filtroTipo ? "" : t.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors"
            style={{
              backgroundColor: filtroTipo === t.value ? `${TEAL}18` : "#f9fafb",
              borderColor: filtroTipo === t.value ? TEAL : "#e5e7eb",
              color: filtroTipo === t.value ? TEAL : "#374151",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-sm text-gray-400">Sin modelos. Crea el primero con el botón superior.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
          {items.map(item => {
            const stock = item._stock ?? { total: 0, disponibles: 0, asignados: 0 }
            const isOpen = expandido === item.id
            const unidades = unidadesCache[item.id] ?? []
            return (
              <div key={item.id}>
                {/* Fila principal */}
                <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg shrink-0">
                    {HW_TIPO_LABEL[item.tipo] ?? item.tipo}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 text-sm">{item.marca} {item.modelo}</p>
                      {item.precio != null && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {item.precio.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                        </span>
                      )}
                      {item.fichaUrl && (
                        <a href={item.fichaUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs font-medium transition-colors hover:opacity-70"
                          style={{ color: TEAL }}>
                          Ficha
                        </a>
                      )}
                    </div>
                    {item.descripcion && <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">{item.descripcion}</p>}
                  </div>
                  {/* Stock resumen */}
                  <div className="flex items-center gap-3 shrink-0 text-xs">
                    <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">{stock.disponibles} disp.</span>
                    <span className="text-gray-400">{stock.total} total</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.activo ? `${TEAL}18` : "#f3f4f6", color: item.activo ? TEAL : "#9ca3af" }}>
                    {item.activo ? "Activo" : "Inactivo"}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleActivo(item)}
                      className="text-xs text-gray-400 hover:text-gray-700 underline transition-colors px-1">
                      {item.activo ? "Desactivar" : "Activar"}
                    </button>
                    <button onClick={() => toggleExpandido(item.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      title={isOpen ? "Cerrar stock" : "Ver stock"}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Panel expandido — stock */}
                {isOpen && (
                  <div className="bg-gray-50 border-t border-gray-100 px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Unidades en stock — {stock.disponibles} disponibles · {stock.asignados} asignadas · {stock.total} total
                      </p>
                      <button
                        onClick={() => setStockForm(stockForm?.catalogoId === item.id ? null : { catalogoId: item.id, series: [{ numSerie: "", notas: "" }] })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
                        style={{ backgroundColor: TEAL }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Añadir al stock
                      </button>
                    </div>

                    {/* Form añadir al stock */}
                    {stockForm?.catalogoId === item.id && (
                      <form onSubmit={añadirStock} className="bg-white border border-teal-100 rounded-xl p-4 mb-3 space-y-3">
                        <p className="text-xs font-semibold text-gray-700">Añadir unidades al stock</p>
                        <div className="space-y-2">
                          {stockForm.series.map((s, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}</span>
                              <input value={s.numSerie}
                                onChange={e => setStockForm(p => p ? { ...p, series: p.series.map((x, j) => j === i ? { ...x, numSerie: e.target.value } : x) } : p)}
                                placeholder="Nº serie (opcional)"
                                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-400" />
                              <input value={s.notas}
                                onChange={e => setStockForm(p => p ? { ...p, series: p.series.map((x, j) => j === i ? { ...x, notas: e.target.value } : x) } : p)}
                                placeholder="Notas"
                                className="w-28 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-400" />
                              {stockForm.series.length > 1 && (
                                <button type="button"
                                  onClick={() => setStockForm(p => p ? { ...p, series: p.series.filter((_, j) => j !== i) } : p)}
                                  className="p-1 rounded text-red-300 hover:text-red-500 shrink-0">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button type="button"
                          onClick={() => setStockForm(p => p ? { ...p, series: [...p.series, { numSerie: "", notas: "" }] } : p)}
                          className="text-xs font-medium transition-colors hover:opacity-80" style={{ color: TEAL }}>
                          + Añadir fila
                        </button>
                        <div className="flex gap-2 pt-1">
                          <button type="button" onClick={() => setStockForm(null)}
                            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
                          <button type="submit" disabled={guardandoStock}
                            className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                            style={{ backgroundColor: TEAL }}>
                            {guardandoStock ? "Guardando…" : `Añadir ${stockForm.series.length} ud.`}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Tabla de unidades */}
                    {loadingUnidades === item.id ? (
                      <div className="space-y-1">{[1, 2].map(i => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
                    ) : unidades.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">Sin unidades en stock. Añade la primera arriba.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-400 border-b border-gray-200">
                              <th className="text-left pb-2 font-medium">Nº serie</th>
                              <th className="text-left pb-2 font-medium">Estado</th>
                              <th className="text-left pb-2 font-medium">Proyecto</th>
                              <th className="text-left pb-2 font-medium">Garantía</th>
                              <th className="text-left pb-2 font-medium">Notas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {unidades.map(u => (
                              <tr key={u.id} className="border-b border-gray-100 last:border-0">
                                <td className="py-2 pr-3">
                                  {u.numSerie
                                    ? <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{u.numSerie}</code>
                                    : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="py-2 pr-3">
                                  <span className={`px-2 py-0.5 rounded-full font-semibold ${HW_ESTADO_COLOR[u.estado] ?? "bg-gray-100 text-gray-500"}`}
                                    style={u.estado === "ASIGNADO" ? { backgroundColor: `${TEAL}18`, color: TEAL } : {}}>
                                    {u.estado === "DISPONIBLE" ? "Disponible" : u.estado === "ASIGNADO" ? "Asignado" : u.estado}
                                  </span>
                                </td>
                                <td className="py-2 pr-3 text-gray-500">
                                  {(u as unknown as { preProyecto?: { titulo: string } }).preProyecto?.titulo ?? <span className="text-gray-300">—</span>}
                                </td>
                                <td className="py-2 pr-3 text-gray-400">
                                  {u.fechaGarantia ? new Date(u.fechaGarantia).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                                </td>
                                <td className="py-2 text-gray-400 max-w-[120px] truncate">{u.notas ?? "—"}</td>
                              </tr>
                            ))}
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
    </div>
  )
}

// ---- sección plantillas ----

function PlantillasSection() {
  const { success, error: toastError } = useToast()
  const [items, setItems] = useState<{ id: string; nombre: string; descripcion: string | null; tipo: string; activa: boolean; creadoEn: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState("")

  useEffect(() => {
    fetch("/api/plantillas?tipo=all")
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setItems(d) })
      .finally(() => setLoading(false))
  }, [])

  async function toggleActiva(item: { id: string; activa: boolean }) {
    const r = await fetch(`/api/plantillas/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa: !item.activa }),
    })
    if (r.ok) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, activa: !i.activa } : i))
      success(!item.activa ? "Plantilla activada" : "Plantilla desactivada")
    }
  }

  async function renombrar(id: string) {
    if (!editNombre.trim()) return
    const r = await fetch(`/api/plantillas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: editNombre.trim() }),
    })
    if (r.ok) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, nombre: editNombre.trim() } : i))
      setEditId(null)
      success("Plantilla renombrada")
    } else {
      toastError("Error al renombrar")
    }
  }

  async function eliminar(id: string) {
    const r = await fetch(`/api/plantillas/${id}`, { method: "DELETE" })
    if (r.ok) {
      setItems(prev => prev.filter(i => i.id !== id))
      success("Plantilla eliminada")
    } else {
      toastError("Error al eliminar")
    }
  }

  const TIPO_LABEL: Record<string, string> = { PROYECTOS: "Proyectos", VENTAS: "Ventas" }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Plantillas de visita</h2>
          <p className="text-sm text-gray-500 mt-0.5">Guardadas desde el formulario de visita con el botón marcador</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400 bg-gray-50 rounded-2xl">
          <p>Sin plantillas guardadas.</p>
          <p className="text-xs mt-1">Abre una visita y usa el icono de marcador en la barra de acciones para guardar una.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tipo</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} className={`border-b border-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                  <td className="px-4 py-3">
                    {editId === item.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={editNombre}
                          onChange={e => setEditNombre(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") renombrar(item.id); if (e.key === "Escape") setEditId(null) }}
                          className="flex-1 px-2 py-1 border border-teal-300 rounded-lg text-sm focus:outline-none"
                        />
                        <button onClick={() => renombrar(item.id)} className="text-xs font-semibold px-2 py-1 rounded-lg text-white" style={{ backgroundColor: TEAL }}>OK</button>
                        <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditId(item.id); setEditNombre(item.nombre) }}
                        className="text-left font-medium text-gray-900 hover:text-teal-700 transition-colors"
                      >
                        {item.nombre}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {TIPO_LABEL[item.tipo] ?? item.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: item.activa ? `${TEAL}18` : "#f3f4f6", color: item.activa ? TEAL : "#9ca3af" }}>
                      {item.activa ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => toggleActiva(item)} className="text-xs text-gray-400 hover:text-gray-700 underline transition-colors">
                        {item.activa ? "Desactivar" : "Activar"}
                      </button>
                      <button onClick={() => eliminar(item.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---- Módulos InLab ----

function ModulosInlabSection() {
  const { success, error: toastError } = useToast()
  const [items, setItems] = useState<ModuloItem[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevoNombre, setNuevoNombre] = useState("")
  const [creando, setCreando] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState("")

  useEffect(() => {
    fetch("/api/modulos-inlab?admin=1")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setItems(d) })
      .finally(() => setLoading(false))
  }, [])

  async function crear() {
    if (!nuevoNombre.trim()) return
    setCreando(true)
    try {
      const r = await fetch("/api/modulos-inlab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevoNombre.trim() }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? "Error"); }
      const nuevo = await r.json()
      setItems(prev => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setNuevoNombre("")
      success("Módulo creado")
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : "Error al crear")
    } finally {
      setCreando(false)
    }
  }

  async function toggleActivo(item: ModuloItem) {
    const r = await fetch(`/api/modulos-inlab/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !item.activo }),
    })
    if (r.ok) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, activo: !item.activo } : i))
      success(item.activo ? "Módulo desactivado" : "Módulo activado")
    } else {
      toastError("Error al actualizar")
    }
  }

  async function renombrar(id: string) {
    if (!editNombre.trim()) return
    const r = await fetch(`/api/modulos-inlab/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: editNombre.trim() }),
    })
    if (r.ok) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, nombre: editNombre.trim() } : i))
      setEditId(null)
      success("Renombrado")
    } else {
      const d = await r.json()
      toastError(d.error ?? "Error")
    }
  }

  async function eliminar(id: string) {
    const r = await fetch(`/api/modulos-inlab/${id}`, { method: "DELETE" })
    if (r.status === 204) {
      setItems(prev => prev.filter(i => i.id !== id))
      success("Módulo eliminado")
    } else {
      const d = await r.json()
      toastError(d.error ?? "No se puede eliminar")
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Módulos InLab</h2>
          <p className="text-sm text-gray-500 mt-0.5">Módulos disponibles para asignar a proyectos</p>
        </div>
      </div>

      {/* Formulario nuevo módulo */}
      <div className="flex gap-2 mb-4">
        <input
          value={nuevoNombre}
          onChange={e => setNuevoNombre(e.target.value)}
          onKeyDown={e => e.key === "Enter" && crear()}
          placeholder="Nombre del módulo (ej: ALMACÉN, DISPENSACIÓN…)"
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
        <button
          onClick={crear}
          disabled={creando || !nuevoNombre.trim()}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90 shrink-0"
          style={{ backgroundColor: TEAL }}
        >
          {creando ? "Creando…" : "Añadir"}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400 bg-gray-50 rounded-2xl">
          Sin módulos. Añade el primero arriba.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Proyectos</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} className={`border-b border-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                  <td className="px-4 py-3">
                    {editId === item.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={editNombre}
                          onChange={e => setEditNombre(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") renombrar(item.id); if (e.key === "Escape") setEditId(null) }}
                          className="flex-1 px-2 py-1 border border-teal-300 rounded-lg text-sm focus:outline-none"
                        />
                        <button onClick={() => renombrar(item.id)} className="text-xs font-semibold px-2 py-1 rounded-lg text-white" style={{ backgroundColor: TEAL }}>OK</button>
                        <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditId(item.id); setEditNombre(item.nombre) }}
                        className="text-left font-medium text-gray-900 hover:text-teal-700 transition-colors"
                      >
                        {item.nombre}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: item.activo ? `${TEAL}18` : "#f3f4f6", color: item.activo ? TEAL : "#9ca3af" }}>
                      {item.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">
                    {item._count?.proyectos ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => toggleActivo(item)} className="text-xs text-gray-400 hover:text-gray-700 underline transition-colors">
                        {item.activo ? "Desactivar" : "Activar"}
                      </button>
                      <button onClick={() => eliminar(item.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---- página principal ----

export default function ConfiguracionPage() {
  const { success, error: toastError } = useToast()
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/config")
      .then(r => r.json())
      .then(setConfig)
      .finally(() => setLoading(false))
  }, [])

  async function toggleCRM(valor: boolean) {
    if (!config) return
    setSaving(true)
    try {
      const r = await fetch("/api/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crmActivo: valor }),
      })
      if (!r.ok) throw new Error()
      setConfig(prev => prev ? { ...prev, crmActivo: valor } : prev)
      success(valor ? "CRM activado correctamente" : "CRM desactivado correctamente")
    } catch {
      toastError("Error al guardar la configuración")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      {/* Módulos */}
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-500 mt-1 text-sm">Módulos y catálogos de la plataforma.</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-4">
            <ModuleCard
              title="Módulo CRM — Pipeline de Ventas"
              description="Pipeline Kanban, oportunidades comerciales y mapa de cobertura. Visible para roles ADMIN y VENTAS."
              activo={config?.crmActivo ?? true}
              onToggle={toggleCRM}
              saving={saving}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
                  <line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              }
            />
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-sm text-gray-500">
              <p className="font-medium text-gray-700 mb-1">Sobre los módulos</p>
              <p>Los módulos desactivados dejan de aparecer en la barra lateral y sus rutas redirigen al dashboard. Los datos no se eliminan.</p>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Catálogo Hardware */}
      <CatalogoHardware />

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Plantillas de visita */}
      <PlantillasSection />

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Módulos InLab */}
      <ModulosInlabSection />
    </div>
  )
}
