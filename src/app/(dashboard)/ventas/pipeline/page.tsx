"use client"

import { useEffect, useState, useCallback } from "react"

const TEAL = "#00A99D"

// ─── Tipos ────────────────────────────────────────────────

interface Oportunidad {
  id: string
  titulo: string
  etapa: string
  valorEstimado: number | null
  probabilidad: number | null
  fechaCierre: string | null
  productos: string[]
  notas: string | null
  motivoPerdida: string | null
  creadoEn: string
  hospital: { id: string; nombre: string; ciudad: string; zona?: { nombre: string } }
  usuario: { id: string; nombre: string }
}

interface Hospital {
  id: string
  nombre: string
  ciudad: string
}

// ─── Constantes ───────────────────────────────────────────

const ETAPAS = ["IDENTIFICADO", "PRIMERA_VISITA", "PROPUESTA", "NEGOCIACION", "GANADO", "PERDIDO"] as const
type Etapa = typeof ETAPAS[number]

const ETAPA_LABEL: Record<Etapa, string> = {
  IDENTIFICADO: "Identificado",
  PRIMERA_VISITA: "Primera visita",
  PROPUESTA: "Propuesta",
  NEGOCIACION: "Negociación",
  GANADO: "Ganado",
  PERDIDO: "Perdido",
}

const ETAPA_COLOR: Record<Etapa, string> = {
  IDENTIFICADO: "bg-gray-100 text-gray-600",
  PRIMERA_VISITA: "bg-blue-50 text-blue-600",
  PROPUESTA: "bg-amber-50 text-amber-600",
  NEGOCIACION: "bg-purple-50 text-purple-700",
  GANADO: "bg-green-50 text-green-700",
  PERDIDO: "bg-red-50 text-red-500",
}

const PROB_DEFECTO: Record<Etapa, number> = {
  IDENTIFICADO: 10,
  PRIMERA_VISITA: 25,
  PROPUESTA: 50,
  NEGOCIACION: 75,
  GANADO: 100,
  PERDIDO: 0,
}

const PROB_BAR_COLOR: Record<Etapa, string> = {
  IDENTIFICADO: "#9ca3af",
  PRIMERA_VISITA: "#3b82f6",
  PROPUESTA: "#f59e0b",
  NEGOCIACION: "#a855f7",
  GANADO: "#22c55e",
  PERDIDO: "#ef4444",
}

const PRODUCTOS_LISTA = [
  "Sistema BEXEN",
  "Tubos Vacutainer",
  "Centrífugas",
  "Racks de muestras",
  "Software LIS",
  "Etiquetadoras",
  "Neveras transporte",
  "Formación",
  "Mantenimiento",
  "Otro",
]

// ─── Helpers ──────────────────────────────────────────────

function fmtEuros(n: number | null | undefined): string {
  if (n == null) return "—"
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n)
}

function valorPonderado(op: Oportunidad): number {
  const val = op.valorEstimado ?? 0
  const prob = op.probabilidad ?? PROB_DEFECTO[op.etapa as Etapa] ?? 0
  return (val * prob) / 100
}

// ─── Estado del formulario ────────────────────────────────

interface FormState {
  hospitalId: string
  titulo: string
  etapa: Etapa
  valorEstimado: string
  probabilidad: string
  fechaCierre: string
  productos: string[]
  notas: string
  motivoPerdida: string
}

const FORM_VACIO: FormState = {
  hospitalId: "",
  titulo: "",
  etapa: "IDENTIFICADO",
  valorEstimado: "",
  probabilidad: "",
  fechaCierre: "",
  productos: [],
  notas: "",
  motivoPerdida: "",
}

// ─── Componente principal ─────────────────────────────────

export default function PipelinePage() {
  const [rol, setRol] = useState("")
  const esAdmin = rol === "ADMIN"

  const [ops, setOps] = useState<Oportunidad[]>([])
  const [hospitales, setHospitales] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEtapa, setFiltroEtapa] = useState<Etapa | "TODOS">("TODOS")
  const [busqueda, setBusqueda] = useState("")

  // Panel lateral
  const [panelOp, setPanelOp] = useState<Oportunidad | null>(null)

  // Modal crear/editar
  const [modalOpen, setModalOpen] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    const res = await fetch("/api/oportunidades")
    const data = await res.json()
    setOps(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => {
    cargar()
    fetch("/api/perfil").then(r => r.ok ? r.json() : null).then(d => { if (d?.rol) setRol(d.rol) }).catch(() => {})
    fetch("/api/hospitales").then(r => r.json()).then(d => setHospitales(Array.isArray(d) ? d : []))
  }, [cargar])

  // ── KPIs ──
  const opsActivas = ops.filter(o => o.etapa !== "PERDIDO")
  const totalPipeline = opsActivas.reduce((s, o) => s + (o.valorEstimado ?? 0), 0)
  const totalPonderado = opsActivas.reduce((s, o) => s + valorPonderado(o), 0)
  const ganadas = ops.filter(o => o.etapa === "GANADO")
  const totalGanado = ganadas.reduce((s, o) => s + (o.valorEstimado ?? 0), 0)

  // ── Filtros ──
  const filtradas = ops.filter(o => {
    const coincideEtapa = filtroEtapa === "TODOS" || o.etapa === filtroEtapa
    const coincideBusq = busqueda === "" ||
      o.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      o.hospital.nombre.toLowerCase().includes(busqueda.toLowerCase())
    return coincideEtapa && coincideBusq
  })

  // ── CRUD ──
  function abrirCrear() {
    setEditandoId(null)
    setForm(FORM_VACIO)
    setModalOpen(true)
  }

  function abrirEditar(op: Oportunidad) {
    setEditandoId(op.id)
    setForm({
      hospitalId: op.hospital.id,
      titulo: op.titulo,
      etapa: op.etapa as Etapa,
      valorEstimado: op.valorEstimado?.toString() ?? "",
      probabilidad: op.probabilidad?.toString() ?? "",
      fechaCierre: op.fechaCierre ? op.fechaCierre.split("T")[0] : "",
      productos: op.productos ?? [],
      notas: op.notas ?? "",
      motivoPerdida: op.motivoPerdida ?? "",
    })
    setModalOpen(true)
  }

  async function guardarOportunidad() {
    if (!form.titulo.trim() || !form.hospitalId) return
    setGuardando(true)
    const body = {
      hospitalId: form.hospitalId,
      titulo: form.titulo.trim(),
      etapa: form.etapa,
      valorEstimado: form.valorEstimado ? parseFloat(form.valorEstimado) : null,
      probabilidad: form.probabilidad ? parseInt(form.probabilidad) : null,
      fechaCierre: form.fechaCierre || null,
      productos: form.productos,
      notas: form.notas.trim() || null,
      motivoPerdida: form.etapa === "PERDIDO" ? (form.motivoPerdida.trim() || null) : null,
    }
    const url = editandoId ? `/api/oportunidades/${editandoId}` : "/api/oportunidades"
    const method = editandoId ? "PATCH" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    if (res.ok) {
      await cargar()
      setModalOpen(false)
      // Si estamos editando la que está en el panel, refresca el panel
      if (panelOp && editandoId === panelOp.id) {
        const updated = await fetch(`/api/oportunidades`).then(r => r.json())
        const found = (updated as Oportunidad[]).find(o => o.id === editandoId)
        if (found) setPanelOp(found)
      }
    }
    setGuardando(false)
  }

  async function cambiarEtapa(id: string, etapa: Etapa) {
    await fetch(`/api/oportunidades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa }),
    })
    await cargar()
    if (panelOp?.id === id) setPanelOp(prev => prev ? { ...prev, etapa } : null)
  }

  async function eliminarOportunidad(id: string) {
    if (!confirm("¿Eliminar esta oportunidad?")) return
    await fetch(`/api/oportunidades/${id}`, { method: "DELETE" })
    setPanelOp(null)
    await cargar()
  }

  function toggleProducto(p: string) {
    setForm(f => ({
      ...f,
      productos: f.productos.includes(p) ? f.productos.filter(x => x !== p) : [...f.productos, p],
    }))
  }

  // ─────────────────────────────────────────────────────────

  return (
    <div className="flex gap-6 h-full">

      {/* ── Columna principal ── */}
      <div className="flex-1 min-w-0">

        {/* Cabecera */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Pipeline de ventas</h1>
            <p className="text-sm text-gray-400 mt-0.5">{ops.length} oportunidad{ops.length !== 1 ? "es" : ""} en total</p>
          </div>
          {(rol === "VENTAS" || esAdmin) && (
            <button
              onClick={abrirCrear}
              className="flex items-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-lg shadow-sm hover:opacity-90 transition"
              style={{ backgroundColor: TEAL }}
            >
              <span className="text-base leading-none">+</span> Nueva oportunidad
            </button>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Pipeline total", value: fmtEuros(totalPipeline), sub: "valor bruto activo" },
            { label: "Valor ponderado", value: fmtEuros(totalPonderado), sub: "ajustado por probabilidad" },
            { label: "Oportunidades activas", value: opsActivas.length.toString(), sub: "sin perdidas" },
            { label: "Ganadas", value: fmtEuros(totalGanado), sub: `${ganadas.length} contrato${ganadas.length !== 1 ? "s" : ""}` },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">{kpi.label}</p>
              <p className="text-lg font-bold text-gray-800">{kpi.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="search"
            placeholder="Buscar oportunidad o hospital…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-56 focus:outline-none focus:ring-1 focus:border-transparent"
            style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
          />
          {(["TODOS", ...ETAPAS] as const).map(e => {
            const activo = filtroEtapa === e
            return (
              <button
                key={e}
                onClick={() => setFiltroEtapa(e as typeof filtroEtapa)}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                style={activo
                  ? { backgroundColor: TEAL, color: "white" }
                  : { backgroundColor: "white", color: "#6b7280", border: "1px solid #e5e7eb" }}
              >
                {e === "TODOS" ? "Todas" : ETAPA_LABEL[e as Etapa]}
              </button>
            )
          })}
        </div>

        {/* Lista */}
        {loading ? (
          <p className="text-sm text-gray-400">Cargando…</p>
        ) : filtradas.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-3xl mb-2">📊</p>
            <p className="text-gray-500 text-sm font-medium">No hay oportunidades{filtroEtapa !== "TODOS" ? ` en "${ETAPA_LABEL[filtroEtapa as Etapa]}"` : ""}</p>
            {filtroEtapa === "TODOS" && rol !== "PROYECTOS" && (
              <button
                onClick={abrirCrear}
                className="mt-3 text-sm font-medium"
                style={{ color: TEAL }}
              >
                Añadir la primera →
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {filtradas.map(op => {
              const prob = op.probabilidad ?? PROB_DEFECTO[op.etapa as Etapa] ?? 0
              const activa = panelOp?.id === op.id
              return (
                <button
                  key={op.id}
                  onClick={() => setPanelOp(activa ? null : op)}
                  className="w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                  style={activa ? { backgroundColor: "#f0fafa" } : {}}
                >
                  {/* Icono etapa */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                    style={{ backgroundColor: `${PROB_BAR_COLOR[op.etapa as Etapa]}20`, color: PROB_BAR_COLOR[op.etapa as Etapa] }}
                  >
                    {op.etapa === "GANADO" ? "✓" : op.etapa === "PERDIDO" ? "✗" : "◎"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800 truncate">{op.titulo}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${ETAPA_COLOR[op.etapa as Etapa]}`}>
                        {ETAPA_LABEL[op.etapa as Etapa]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {op.hospital.nombre} · {op.hospital.ciudad}
                      {op.hospital.zona ? ` · ${op.hospital.zona.nombre}` : ""}
                      {esAdmin ? ` · ${op.usuario.nombre}` : ""}
                    </p>
                    {/* Barra de probabilidad */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${prob}%`, backgroundColor: PROB_BAR_COLOR[op.etapa as Etapa] }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{prob}%</span>
                    </div>
                  </div>

                  {/* Valor */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-800">{fmtEuros(op.valorEstimado)}</p>
                    {op.valorEstimado && (
                      <p className="text-xs text-gray-400">pond. {fmtEuros(valorPonderado(op))}</p>
                    )}
                  </div>

                  <span className="text-gray-300 text-sm">›</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Panel lateral de detalle ── */}
      {panelOp && (
        <aside className="w-80 shrink-0 bg-white rounded-xl border border-gray-200 p-5 self-start sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0 pr-2">
              <h2 className="text-base font-bold text-gray-800 leading-tight">{panelOp.titulo}</h2>
              <p className="text-xs text-gray-400 mt-1">{panelOp.hospital.nombre} · {panelOp.hospital.ciudad}</p>
            </div>
            <button onClick={() => setPanelOp(null)} className="text-gray-300 hover:text-gray-500 shrink-0 text-xl leading-none">×</button>
          </div>

          {/* Badge etapa actual */}
          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-4 ${ETAPA_COLOR[panelOp.etapa as Etapa]}`}>
            {ETAPA_LABEL[panelOp.etapa as Etapa]}
          </span>

          {/* Cambio rápido de etapa */}
          {(rol === "VENTAS" || esAdmin) && panelOp.etapa !== "GANADO" && panelOp.etapa !== "PERDIDO" && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Avanzar etapa</p>
              <div className="flex flex-wrap gap-1.5">
                {ETAPAS.filter(e => e !== panelOp.etapa).map(e => (
                  <button
                    key={e}
                    onClick={() => cambiarEtapa(panelOp.id, e)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-400 transition-colors"
                  >
                    {ETAPA_LABEL[e]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Valor estimado</span>
              <span className="font-semibold text-gray-800">{fmtEuros(panelOp.valorEstimado)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Probabilidad</span>
              <span className="font-semibold text-gray-800">
                {panelOp.probabilidad ?? PROB_DEFECTO[panelOp.etapa as Etapa]}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Valor ponderado</span>
              <span className="font-semibold" style={{ color: TEAL }}>{fmtEuros(valorPonderado(panelOp))}</span>
            </div>
            {panelOp.fechaCierre && (
              <div className="flex justify-between">
                <span className="text-gray-400">Fecha cierre</span>
                <span className="font-semibold text-gray-800">
                  {new Date(panelOp.fechaCierre).toLocaleDateString("es-ES")}
                </span>
              </div>
            )}
            {esAdmin && (
              <div className="flex justify-between">
                <span className="text-gray-400">Responsable</span>
                <span className="font-semibold text-gray-800">{panelOp.usuario.nombre}</span>
              </div>
            )}
          </div>

          {/* Productos */}
          {panelOp.productos.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Productos de interés</p>
              <div className="flex flex-wrap gap-1.5">
                {panelOp.productos.map(p => (
                  <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{p}</span>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          {panelOp.notas && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500 mb-1">Notas</p>
              <p className="text-sm text-gray-600 leading-relaxed">{panelOp.notas}</p>
            </div>
          )}

          {/* Motivo pérdida */}
          {panelOp.motivoPerdida && (
            <div className="mt-4 bg-red-50 rounded-lg p-3">
              <p className="text-xs font-medium text-red-500 mb-1">Motivo pérdida</p>
              <p className="text-sm text-red-700">{panelOp.motivoPerdida}</p>
            </div>
          )}

          {/* Acciones */}
          {(rol === "VENTAS" || esAdmin) && (
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => { abrirEditar(panelOp); }}
                className="flex-1 text-sm font-medium text-white py-2 rounded-lg hover:opacity-90 transition"
                style={{ backgroundColor: TEAL }}
              >
                Editar
              </button>
              <button
                onClick={() => eliminarOportunidad(panelOp.id)}
                className="px-3 py-2 text-sm font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition"
              >
                Eliminar
              </button>
            </div>
          )}
        </aside>
      )}

      {/* ── Modal crear / editar ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">
                {editandoId ? "Editar oportunidad" : "Nueva oportunidad"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-300 hover:text-gray-500 text-xl leading-none">×</button>
            </div>

            <div className="px-6 py-5 space-y-4">

              {/* Hospital */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Hospital *</label>
                <select
                  value={form.hospitalId}
                  onChange={e => setForm(f => ({ ...f, hospitalId: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none"
                >
                  <option value="">Selecciona un hospital…</option>
                  {hospitales.map(h => (
                    <option key={h.id} value={h.id}>{h.nombre} — {h.ciudad}</option>
                  ))}
                </select>
              </div>

              {/* Título */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Título *</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ej. Implantación sistema preanalítico planta 3"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>

              {/* Etapa */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Etapa *</label>
                <div className="grid grid-cols-3 gap-2">
                  {ETAPAS.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, etapa: e, probabilidad: f.probabilidad || PROB_DEFECTO[e].toString() }))}
                      className={`text-xs py-2 px-2 rounded-lg border font-medium transition-all ${
                        form.etapa === e ? "border-transparent text-white" : "border-gray-200 text-gray-600"
                      }`}
                      style={form.etapa === e ? { backgroundColor: PROB_BAR_COLOR[e] } : {}}
                    >
                      {ETAPA_LABEL[e]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Valor + Probabilidad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Valor estimado (€)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.valorEstimado}
                    onChange={e => setForm(f => ({ ...f, valorEstimado: e.target.value }))}
                    placeholder="0"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Probabilidad (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.probabilidad || PROB_DEFECTO[form.etapa]}
                    onChange={e => setForm(f => ({ ...f, probabilidad: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none"
                  />
                </div>
              </div>

              {/* Fecha cierre */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Fecha estimada de cierre</label>
                <input
                  type="date"
                  value={form.fechaCierre}
                  onChange={e => setForm(f => ({ ...f, fechaCierre: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>

              {/* Productos */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Productos de interés</label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCTOS_LISTA.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => toggleProducto(p)}
                      className="text-xs px-2.5 py-1 rounded-full border font-medium transition-all"
                      style={form.productos.includes(p)
                        ? { backgroundColor: TEAL, color: "white", borderColor: TEAL }
                        : { borderColor: "#e5e7eb", color: "#6b7280" }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Motivo pérdida */}
              {form.etapa === "PERDIDO" && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Motivo de pérdida</label>
                  <textarea
                    value={form.motivoPerdida}
                    onChange={e => setForm(f => ({ ...f, motivoPerdida: e.target.value }))}
                    placeholder="¿Por qué se perdió esta oportunidad?"
                    rows={2}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none resize-none"
                  />
                </div>
              )}

              {/* Notas */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notas</label>
                <textarea
                  value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  placeholder="Observaciones, contexto, próximos pasos…"
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 pb-5">
              <button
                onClick={() => setModalOpen(false)}
                className="text-sm font-medium text-gray-500 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={guardarOportunidad}
                disabled={guardando || !form.titulo.trim() || !form.hospitalId}
                className="text-sm font-medium text-white px-5 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                style={{ backgroundColor: TEAL }}
              >
                {guardando ? "Guardando…" : editandoId ? "Guardar cambios" : "Crear oportunidad"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
