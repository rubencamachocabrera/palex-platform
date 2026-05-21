"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { TEAL, ORANGE } from "@/lib/brand"

const ETAPAS = ["IDENTIFICADO", "CONTACTADO", "PROPUESTA", "NEGOCIACION", "GANADO", "PERDIDO"] as const
type Etapa = typeof ETAPAS[number]

const ETAPA_LABEL: Record<Etapa, string> = {
  IDENTIFICADO: "Identificado", CONTACTADO: "Contactado", PROPUESTA: "Propuesta enviada",
  NEGOCIACION: "En negociación", GANADO: "Ganado", PERDIDO: "Perdido",
}
const ETAPA_COLOR: Record<Etapa, string> = {
  IDENTIFICADO: "#64748b", CONTACTADO: "#3b82f6", PROPUESTA: "#f97316",
  NEGOCIACION: "#8b5cf6", GANADO: "#16a34a", PERDIDO: "#dc2626",
}

interface HistorialEntry { etapaAnterior: string; etapaNueva: string; fecha: string; usuario: string }
interface Oportunidad {
  id: string; titulo: string; etapa: Etapa; valorEstimado: number | null
  probabilidad: number | null; fechaCierre: string | null; productos: string | null
  notas: string | null; motivoPerdida: string | null; historial: HistorialEntry[]
  creadoEn: string; actualizadoEn: string
  hospital: { id: string; nombre: string; ciudad: string; provincia: string | null; zona: { nombre: string } | null }
  usuario: { id: string; nombre: string }
}

function fmtFecha(d: string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

function diasDesde(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
}

export default function PipelineFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [op, setOp] = useState<Oportunidad | null>(null)
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({ titulo: "", etapa: "" as Etapa, valorEstimado: "", probabilidad: "", fechaCierre: "", productos: "", notas: "", motivoPerdida: "" })
  const [guardando, setGuardando] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [opId, setOpId] = useState<string | null>(null)

  useEffect(() => {
    params.then(p => setOpId(p.id))
  }, [params])

  useEffect(() => {
    if (!opId) return
    fetch(`/api/oportunidades/${opId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setOp(d) })
      .finally(() => setLoading(false))
  }, [opId])

  function mostrarToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  function iniciarEdicion() {
    if (!op) return
    setForm({
      titulo: op.titulo,
      etapa: op.etapa,
      valorEstimado: op.valorEstimado != null ? String(op.valorEstimado) : "",
      probabilidad: op.probabilidad != null ? String(op.probabilidad) : "",
      fechaCierre: op.fechaCierre ? op.fechaCierre.slice(0, 10) : "",
      productos: op.productos ?? "",
      notas: op.notas ?? "",
      motivoPerdida: op.motivoPerdida ?? "",
    })
    setEditando(true)
  }

  async function guardar() {
    if (!op) return
    setGuardando(true)
    const r = await fetch(`/api/oportunidades/${op.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: form.titulo,
        etapa: form.etapa,
        valorEstimado: form.valorEstimado || null,
        probabilidad: form.probabilidad || null,
        fechaCierre: form.fechaCierre || null,
        productos: form.productos || null,
        notas: form.notas || null,
        motivoPerdida: form.motivoPerdida || null,
      }),
    })
    setGuardando(false)
    if (r.ok) {
      const updated = await r.json()
      setOp(updated)
      setEditando(false)
      mostrarToast("Oportunidad actualizada")
    } else {
      mostrarToast("Error al guardar", false)
    }
  }

  async function eliminar() {
    if (!op || !confirm(`¿Eliminar "${op.titulo}"? Esta acción no se puede deshacer.`)) return
    const r = await fetch(`/api/oportunidades/${op.id}`, { method: "DELETE" })
    if (r.ok) {
      router.push("/ventas/pipeline")
    } else {
      mostrarToast("Error al eliminar", false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/4" />
        <div className="h-7 bg-gray-100 rounded w-2/3 mt-4" />
        <div className="h-36 bg-gray-100 rounded-2xl mt-4" />
      </div>
    )
  }

  if (!op) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-sm text-gray-500">Oportunidad no encontrada.</p>
        <button onClick={() => router.back()} className="mt-3 text-sm hover:underline" style={{ color: TEAL }}>
          ← Volver al pipeline
        </button>
      </div>
    )
  }

  const etapaColor = ETAPA_COLOR[op.etapa] ?? "#6b7280"
  const historial: HistorialEntry[] = Array.isArray(op.historial) ? op.historial : []

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.ok ? "bg-emerald-500" : "bg-red-500"}`}>
          {toast.msg}
        </div>
      )}

      {/* Nav */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <button onClick={() => router.push("/ventas/pipeline")} className="hover:text-gray-700 transition-colors">
          Pipeline
        </button>
        <span>›</span>
        <span className="text-gray-700 font-medium truncate">{op.titulo}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {editando ? (
              <input
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                className="text-xl font-bold text-gray-900 w-full border-b border-gray-200 pb-1 focus:outline-none focus:border-teal-400"
              />
            ) : (
              <h1 className="text-xl font-bold text-gray-900 truncate">{op.titulo}</h1>
            )}
            <p className="text-sm text-gray-500 mt-1">{op.hospital.nombre} · {op.hospital.ciudad}</p>
            {op.hospital.zona && <p className="text-xs text-gray-400 mt-0.5">Zona {op.hospital.zona.nombre}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!editando && (
              <>
                <button
                  onClick={iniciarEdicion}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={eliminar}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-100 text-red-400 hover:bg-red-50 transition-colors"
                >
                  Eliminar
                </button>
              </>
            )}
            {editando && (
              <>
                <button
                  onClick={() => setEditando(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardar}
                  disabled={guardando}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: TEAL }}
                >
                  {guardando ? "Guardando..." : "Guardar"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Etapa */}
        <div className="mt-4">
          {editando ? (
            <select
              value={form.etapa}
              onChange={e => setForm(f => ({ ...f, etapa: e.target.value as Etapa }))}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border-0 text-white focus:outline-none"
              style={{ backgroundColor: ETAPA_COLOR[form.etapa] ?? "#6b7280" }}
            >
              {ETAPAS.map(e => <option key={e} value={e} className="bg-white text-gray-800">{ETAPA_LABEL[e]}</option>)}
            </select>
          ) : (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ backgroundColor: etapaColor }}>
              {ETAPA_LABEL[op.etapa]}
            </span>
          )}
        </div>
      </div>

      {/* Datos clave */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Datos clave</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Valor estimado</p>
            {editando ? (
              <input type="number" value={form.valorEstimado} onChange={e => setForm(f => ({ ...f, valorEstimado: e.target.value }))}
                placeholder="0" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
            ) : (
              <p className="text-sm font-semibold text-gray-800">
                {op.valorEstimado != null ? op.valorEstimado.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }) : "—"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Probabilidad</p>
            {editando ? (
              <input type="number" min="0" max="100" value={form.probabilidad} onChange={e => setForm(f => ({ ...f, probabilidad: e.target.value }))}
                placeholder="%" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
            ) : (
              <p className="text-sm font-semibold text-gray-800">{op.probabilidad != null ? `${op.probabilidad}%` : "—"}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Cierre previsto</p>
            {editando ? (
              <input type="date" value={form.fechaCierre} onChange={e => setForm(f => ({ ...f, fechaCierre: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
            ) : (
              <p className="text-sm font-semibold text-gray-800">{fmtFecha(op.fechaCierre)}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Comercial</p>
            <p className="text-sm font-semibold text-gray-800">{op.usuario.nombre}</p>
          </div>
        </div>

        {/* Productos */}
        <div className="mt-4">
          <p className="text-xs text-gray-400 mb-1">Productos / Servicios</p>
          {editando ? (
            <input value={form.productos} onChange={e => setForm(f => ({ ...f, productos: e.target.value }))}
              placeholder="Describe los productos o servicios..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          ) : (
            <p className="text-sm text-gray-700">{op.productos || <span className="text-gray-400">—</span>}</p>
          )}
        </div>

        {/* Notas */}
        <div className="mt-4">
          <p className="text-xs text-gray-400 mb-1">Notas</p>
          {editando ? (
            <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              rows={3} placeholder="Notas internas..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{op.notas || <span className="text-gray-400">—</span>}</p>
          )}
        </div>

        {/* Motivo pérdida */}
        {(op.etapa === "PERDIDO" || (editando && form.etapa === "PERDIDO")) && (
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-1">Motivo de pérdida</p>
            {editando ? (
              <input value={form.motivoPerdida} onChange={e => setForm(f => ({ ...f, motivoPerdida: e.target.value }))}
                placeholder="¿Por qué se perdió esta oportunidad?"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            ) : (
              <p className="text-sm text-gray-700">{op.motivoPerdida || <span className="text-gray-400">—</span>}</p>
            )}
          </div>
        )}
      </div>

      {/* Historial de etapas */}
      {historial.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Historial de etapas</h2>
          <div className="space-y-3">
            {historial.slice().reverse().map((h, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: ETAPA_COLOR[h.etapaNueva as Etapa] ?? "#6b7280" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700">
                    <span className="font-medium">{ETAPA_LABEL[h.etapaAnterior as Etapa] ?? h.etapaAnterior}</span>
                    {" → "}
                    <span className="font-semibold" style={{ color: ETAPA_COLOR[h.etapaNueva as Etapa] ?? "#6b7280" }}>
                      {ETAPA_LABEL[h.etapaNueva as Etapa] ?? h.etapaNueva}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{h.usuario} · {fmtFecha(h.fecha)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="text-xs text-gray-400 pb-4 flex justify-between">
        <span>Creada {fmtFecha(op.creadoEn)} · hace {diasDesde(op.creadoEn)} días</span>
        <span>Actualizada {fmtFecha(op.actualizadoEn)}</span>
      </div>
    </div>
  )
}
