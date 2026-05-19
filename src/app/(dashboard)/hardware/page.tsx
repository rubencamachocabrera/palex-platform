"use client"

import { useEffect, useState, useCallback } from "react"
import { useToast } from "@/components/Toast"
import { TEAL, ORANGE } from "@/lib/brand"

const HW_TIPO_LABEL: Record<string, string> = {
  BC_ROBOT: "BC Robo", ZEBRA_MC: "Zebra MC", ZEBRA_PRINTER: "Zebra Printer",
  LECTOR_BARRAS: "Lector Barras", SERVIDOR: "Servidor", SWITCH_RED: "Switch Red",
  TABLET: "Tablet", OTRO: "Otro",
}
const HW_ESTADO: Record<string, { label: string; color: string; bg: string }> = {
  DISPONIBLE:      { label: "Disponible",    color: "#16a34a", bg: "#f0fdf4" },
  ASIGNADO:        { label: "Asignado",      color: TEAL,      bg: `${TEAL}18` },
  EN_MANTENIMIENTO:{ label: "Mantenimiento", color: "#d97706", bg: "#fef3c7" },
  RETIRADO:        { label: "Retirado",      color: "#6b7280", bg: "#f3f4f6" },
  BAJA:            { label: "Baja",          color: "#dc2626", bg: "#fef2f2" },
}

interface HardwareCatalogo { id: string; tipo: string; marca: string; modelo: string }
interface HardwareUnidad {
  id: string; numSerie: string | null; estado: string; notas: string | null
  creadoEn: string; fechaCompra: string | null; fechaGarantia: string | null
  catalogo: HardwareCatalogo
  hospital: { id: string; nombre: string; ciudad: string } | null
  preProyecto: { id: string; titulo: string } | null
}
interface PreProyectoBasico { id: string; titulo: string; hospital: { nombre: string } }

function fmtFecha(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

function IconSearch() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}

// ---- Modal dotación por proyecto ----

function ModalDotacion({
  onClose,
  onDone,
}: {
  onClose: () => void
  onDone: () => void
}) {
  const { success, error: toastError } = useToast()
  const [proyectos, setProyectos] = useState<PreProyectoBasico[]>([])
  const [catalogo, setCatalogo] = useState<HardwareCatalogo[]>([])
  const [proyectoId, setProyectoId] = useState("")
  const [cantidades, setCantidades] = useState<Record<string, number>>({})
  const [guardando, setGuardando] = useState(false)
  const [paso, setPaso] = useState<1 | 2>(1)

  useEffect(() => {
    Promise.all([
      fetch("/api/pre-proyectos").then(r => r.json()),
      fetch("/api/hardware").then(r => r.json()),
    ]).then(([pp, hw]) => {
      setProyectos(Array.isArray(pp) ? pp : [])
      setCatalogo(Array.isArray(hw) ? hw.filter((h: HardwareCatalogo & { activo: boolean }) => h.activo) : [])
    })
  }, [])

  async function crear() {
    const lineas = Object.entries(cantidades).filter(([, n]) => n > 0)
    if (!proyectoId || lineas.length === 0) {
      toastError("Selecciona un proyecto y al menos un dispositivo")
      return
    }
    setGuardando(true)
    try {
      const promises = lineas.flatMap(([catalogoId, cantidad]) =>
        Array.from({ length: cantidad }, () =>
          fetch("/api/hardware/unidades", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ catalogoId, preProyectoId: proyectoId, estado: "ASIGNADO" }),
          })
        )
      )
      await Promise.all(promises)
      const total = lineas.reduce((s, [, n]) => s + n, 0)
      success(`${total} unidad${total !== 1 ? "es" : ""} creada${total !== 1 ? "s" : ""} y asignada${total !== 1 ? "s" : ""}`)
      onDone()
    } catch {
      toastError("Error al crear las unidades")
    } finally {
      setGuardando(false)
    }
  }

  const proyectoSeleccionado = proyectos.find(p => p.id === proyectoId)
  const totalUnidades = Object.values(cantidades).reduce((s, n) => s + (n || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Dotación de hardware por proyecto</h2>
            <p className="text-sm text-gray-500 mt-0.5">Asigna unidades de hardware a un pre-proyecto</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Paso 1: Seleccionar proyecto */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs mr-2" style={{ backgroundColor: TEAL }}>1</span>
              Seleccionar pre-proyecto
            </label>
            <select
              value={proyectoId}
              onChange={e => { setProyectoId(e.target.value); setPaso(2) }}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
            >
              <option value="">Seleccionar proyecto…</option>
              {proyectos.map(p => (
                <option key={p.id} value={p.id}>{p.titulo} — {p.hospital.nombre}</option>
              ))}
            </select>
          </div>

          {/* Paso 2: Cantidades */}
          {paso === 2 && proyectoId && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs mr-2" style={{ backgroundColor: TEAL }}>2</span>
                Unidades por tipo de dispositivo
                {proyectoSeleccionado && <span className="ml-2 text-xs font-normal text-gray-500">— {proyectoSeleccionado.titulo}</span>}
              </label>

              {catalogo.length === 0 ? (
                <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4">
                  No hay modelos en el catálogo. Añádelos desde Admin → Configuración.
                </p>
              ) : (
                <div className="space-y-2">
                  {/* Agrupar por tipo */}
                  {Object.entries(HW_TIPO_LABEL).map(([tipo, tipoLabel]) => {
                    const modelos = catalogo.filter(c => c.tipo === tipo)
                    if (modelos.length === 0) return null
                    return (
                      <div key={tipo} className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">{tipoLabel}</p>
                        <div className="space-y-2">
                          {modelos.map(modelo => (
                            <div key={modelo.id} className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800">{modelo.marca} {modelo.modelo}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setCantidades(p => ({ ...p, [modelo.id]: Math.max(0, (p[modelo.id] || 0) - 1) }))}
                                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors font-bold"
                                >-</button>
                                <input
                                  type="number"
                                  min="0"
                                  value={cantidades[modelo.id] || 0}
                                  onChange={e => setCantidades(p => ({ ...p, [modelo.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                  className="w-14 text-center border border-gray-200 rounded-lg py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400"
                                />
                                <button
                                  type="button"
                                  onClick={() => setCantidades(p => ({ ...p, [modelo.id]: (p[modelo.id] || 0) + 1 }))}
                                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors font-bold"
                                >+</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {totalUnidades > 0 && (
                <div className="mt-4 p-3 rounded-xl text-sm font-medium text-center" style={{ backgroundColor: `${TEAL}12`, color: TEAL }}>
                  Se crearán {totalUnidades} unidad{totalUnidades !== 1 ? "es" : ""} asignada{totalUnidades !== 1 ? "s" : ""} al proyecto
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={crear}
            disabled={guardando || !proyectoId || totalUnidades === 0}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40"
            style={{ backgroundColor: TEAL }}
          >
            {guardando ? "Creando…" : `Crear ${totalUnidades > 0 ? totalUnidades + " unidades" : "dotación"}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- página principal ----

export default function HardwarePage() {
  const [unidades, setUnidades] = useState<HardwareUnidad[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [mostrarDotacion, setMostrarDotacion] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (filtroTipo) params.set("tipo", filtroTipo)
    if (filtroEstado) params.set("estado", filtroEstado)
    const r = await fetch(`/api/hardware/unidades?${params}`)
    if (r.ok) setUnidades(await r.json())
    setLoading(false)
  }, [q, filtroTipo, filtroEstado])

  useEffect(() => { cargar() }, [cargar])

  const total       = unidades.length
  const disponibles = unidades.filter(u => u.estado === "DISPONIBLE").length
  const asignados   = unidades.filter(u => u.estado === "ASIGNADO").length
  const mantenimiento = unidades.filter(u => u.estado === "EN_MANTENIMIENTO").length

  const byTipo = unidades.reduce<Record<string, number>>((acc, u) => {
    acc[u.catalogo.tipo] = (acc[u.catalogo.tipo] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario de Materiales</h1>
          <p className="text-sm text-gray-500 mt-0.5">Trazabilidad global de todos los dispositivos</p>
        </div>
        <button
          onClick={() => setMostrarDotacion(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 shrink-0"
          style={{ backgroundColor: TEAL }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Añadir dotación
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total unidades", value: total },
          { label: "Disponibles",    value: disponibles,   color: "#16a34a" },
          { label: "Asignados",      value: asignados,     color: TEAL },
          { label: "Mantenimiento",  value: mantenimiento, color: ORANGE },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-sm text-gray-500">{k.label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: k.color ?? "#111827" }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Resumen por tipo */}
      {Object.keys(byTipo).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribución por tipo</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byTipo).sort((a, b) => b[1] - a[1]).map(([tipo, count]) => (
              <div key={tipo}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm cursor-pointer border transition-colors"
                style={{
                  backgroundColor: filtroTipo === tipo ? `${TEAL}18` : "#f9fafb",
                  borderColor: filtroTipo === tipo ? TEAL : "#e5e7eb",
                  color: filtroTipo === tipo ? TEAL : "#374151",
                }}
                onClick={() => setFiltroTipo(filtroTipo === tipo ? "" : tipo)}
              >
                <span className="font-medium">{HW_TIPO_LABEL[tipo] ?? tipo}</span>
                <span className="bg-white rounded-full px-1.5 py-0.5 text-xs font-bold" style={{ color: TEAL }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><IconSearch /></span>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar por modelo, marca o nº serie…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
          <option value="">Todos los tipos</option>
          {Object.entries(HW_TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
          <option value="">Todos los estados</option>
          {Object.entries(HW_ESTADO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : unidades.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${TEAL}18` }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
              <rect x="9" y="9" width="6" height="6"/>
              <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Sin dispositivos</h3>
          <p className="text-sm text-gray-500">Usa <strong>Añadir dotación</strong> para asignar hardware a un proyecto</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tipo</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Dispositivo</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Nº Serie</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Hospital</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Proyecto</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Garantía</th>
                </tr>
              </thead>
              <tbody>
                {unidades.map((u, i) => {
                  const hw = HW_ESTADO[u.estado] ?? { label: u.estado, color: "#6b7280", bg: "#f3f4f6" }
                  return (
                    <tr key={u.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                          {HW_TIPO_LABEL[u.catalogo.tipo] ?? u.catalogo.tipo}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">{u.catalogo.marca} {u.catalogo.modelo}</p>
                        {u.notas && <p className="text-xs text-gray-400 truncate max-w-[160px]">{u.notas}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        {u.numSerie
                          ? <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">{u.numSerie}</code>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: hw.bg, color: hw.color }}>
                          {hw.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {u.hospital
                          ? <div><p className="font-medium text-gray-700 text-xs">{u.hospital.nombre}</p><p className="text-xs text-gray-400">{u.hospital.ciudad}</p></div>
                          : <span className="text-gray-300 text-xs">—</span>
                        }
                      </td>
                      <td className="px-5 py-3.5">
                        {u.preProyecto
                          ? <p className="text-xs font-medium text-teal-700 truncate max-w-[160px]">{u.preProyecto.titulo}</p>
                          : <span className="text-gray-300 text-xs">—</span>
                        }
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-400">{fmtFecha(u.fechaGarantia)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
            {unidades.length} unidad{unidades.length !== 1 ? "es" : ""}
          </div>
        </div>
      )}

      {mostrarDotacion && (
        <ModalDotacion
          onClose={() => setMostrarDotacion(false)}
          onDone={() => { setMostrarDotacion(false); cargar() }}
        />
      )}
    </div>
  )
}
