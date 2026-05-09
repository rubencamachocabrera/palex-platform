"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { getSections } from "@/lib/form-schema"
import type { FormField, FormSection } from "@/lib/form-schema"

const TEAL = "#00A99D"

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador", COMPLETADA: "Completada", ARCHIVADA: "Archivada",
}
const ESTADO_COLOR: Record<string, string> = {
  BORRADOR: "bg-amber-50 text-amber-600",
  COMPLETADA: "bg-green-50 text-green-600",
  ARCHIVADA: "bg-gray-100 text-gray-400",
}

interface VisitaData {
  id: string
  estado: string
  tipo: string
  fecha: string
  datos: Record<string, unknown>
  hospital: { id: string; nombre: string; ciudad: string }
  usuario: { id: string; nombre: string }
}

// ─── Renderer de campo ───────────────────────────────────────────────────────

function CampoField({
  field, value, onChange, readOnly,
}: {
  field: FormField
  value: unknown
  onChange: (v: unknown) => void
  readOnly: boolean
}) {
  const base =
    "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 bg-white"

  if (field.type === "textarea") {
    return (
      <textarea
        value={(value as string) ?? ""}
        onChange={e => onChange(e.target.value)}
        placeholder={field.ph}
        disabled={readOnly}
        rows={3}
        className={`${base} resize-none`}
      />
    )
  }

  if (field.type === "select") {
    return (
      <select
        value={(value as string) ?? ""}
        onChange={e => onChange(e.target.value)}
        disabled={readOnly}
        className={base}
      >
        <option value="">— Seleccionar —</option>
        {field.opts?.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    )
  }

  if (field.type === "radio") {
    return (
      <div className="flex flex-col gap-2.5">
        {field.opts?.map(o => (
          <label key={o} className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="radio"
              name={field.id}
              value={o}
              checked={value === o}
              onChange={() => onChange(o)}
              disabled={readOnly}
              className="w-4 h-4"
              style={{ accentColor: TEAL }}
            />
            <span className="text-sm text-gray-700">{o}</span>
          </label>
        ))}
      </div>
    )
  }

  if (field.type === "checks") {
    const arr = (value as string[] | undefined) ?? []
    return (
      <div className="flex flex-col gap-2.5">
        {field.opts?.map(o => (
          <label key={o} className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={arr.includes(o)}
              onChange={e => {
                if (e.target.checked) onChange([...arr, o])
                else onChange(arr.filter(x => x !== o))
              }}
              disabled={readOnly}
              className="w-4 h-4 rounded"
              style={{ accentColor: TEAL }}
            />
            <span className="text-sm text-gray-700">{o}</span>
          </label>
        ))}
      </div>
    )
  }

  if (field.type === "rating") {
    const v = (value as number | undefined) ?? 0
    return (
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => !readOnly && onChange(v === n ? 0 : n)}
            disabled={readOnly}
            className="text-2xl leading-none transition-transform hover:scale-110 disabled:cursor-default"
          >
            {n <= v ? "⭐" : "☆"}
          </button>
        ))}
        {v > 0 && <span className="text-xs text-gray-400 self-center ml-1">{v}/5</span>}
      </div>
    )
  }

  // text, number, date, month, time, email, tel
  return (
    <input
      type={field.type}
      value={(value as string) ?? ""}
      onChange={e => onChange(e.target.value)}
      placeholder={field.ph}
      disabled={readOnly}
      className={base}
    />
  )
}

// ─── Progreso de sección ──────────────────────────────────────────────────────

function calcProgress(section: FormSection, datos: Record<string, unknown>): number {
  const total = section.fields.length
  if (total === 0) return 0
  const filled = section.fields.filter(f => {
    const v = datos[f.id]
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === "number") return v > 0
    return v !== undefined && v !== null && v !== ""
  }).length
  return Math.round((filled / total) * 100)
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function VisitaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [visita, setVisita] = useState<VisitaData | null>(null)
  const [datos, setDatos] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMs, setSavedMs] = useState<number | null>(null)
  const [openSection, setOpenSection] = useState<string>("s0")
  const [cambiandoEstado, setCambiandoEstado] = useState(false)

  // Refs para auto-guardado sin closures obsoletos
  const datosRef = useRef<Record<string, unknown>>({})
  const visitaRef = useRef<VisitaData | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch(`/api/visitas/${id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data) {
          setVisita(data)
          visitaRef.current = data
          const d =
            typeof data.datos === "object" && data.datos !== null
              ? (data.datos as Record<string, unknown>)
              : {}
          setDatos(d)
          datosRef.current = d
        }
        setLoading(false)
      })
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [id])

  // ─ Guardar ──────────────────────────────────────────────────────────────────
  async function guardar(nuevoEstado?: string) {
    if (!visitaRef.current) return
    setSaving(true)
    const body: Record<string, unknown> = { datos: datosRef.current }
    if (nuevoEstado) body.estado = nuevoEstado
    try {
      const r = await fetch(`/api/visitas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (r.ok) {
        const updated = await r.json()
        setVisita(v => {
          const next = v ? { ...v, estado: updated.estado } : v
          visitaRef.current = next
          return next
        })
        setSavedMs(Date.now())
      }
    } finally {
      setSaving(false)
    }
  }

  const guardarRef = useRef(guardar)
  useEffect(() => { guardarRef.current = guardar })

  // ─ Actualizar campo ──────────────────────────────────────────────────────────
  function setField(fieldId: string, value: unknown) {
    setDatos(prev => {
      const next = { ...prev, [fieldId]: value }
      datosRef.current = next
      return next
    })
    setSavedMs(null)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => guardarRef.current(), 2500)
  }

  // ─ Cambiar estado ────────────────────────────────────────────────────────────
  async function cambiarEstado(estado: string) {
    setCambiandoEstado(true)
    await guardar(estado)
    setCambiandoEstado(false)
  }

  // ─ Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-gray-400">Cargando visita…</p>
      </div>
    )
  }

  if (!visita) {
    return (
      <div className="text-center py-24">
        <p className="text-2xl mb-2">🔍</p>
        <p className="text-gray-500 text-sm font-medium">Visita no encontrada</p>
        <button
          onClick={() => router.back()}
          className="mt-3 text-sm font-medium"
          style={{ color: TEAL }}
        >
          ← Volver
        </button>
      </div>
    )
  }

  const tipo = visita.tipo as "PROYECTOS" | "VENTAS"
  const sections = getSections(tipo)
  const readOnly = visita.estado === "ARCHIVADA"
  const completadas = sections.filter(s => calcProgress(s, datos) === 100).length
  const progreso = sections.length ? Math.round((completadas / sections.length) * 100) : 0

  const hasCambios = savedMs === null

  return (
    <div className="max-w-2xl mx-auto">
      {/* ─ Cabecera ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 mb-5">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-600 mt-0.5 text-xl shrink-0 leading-none"
        >
          ‹
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-800 leading-tight truncate">
            {visita.hospital.nombre}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {visita.hospital.ciudad} · {new Date(visita.fecha).toLocaleDateString("es-ES")} · {tipo}
          </p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${ESTADO_COLOR[visita.estado]}`}>
          {ESTADO_LABEL[visita.estado]}
        </span>
      </div>

      {/* ─ Barra de acciones ─────────────────────────────────────────────────── */}
      {!readOnly && (
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-4 flex items-center gap-3">
          <button
            onClick={() => guardar()}
            disabled={saving || !hasCambios}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: TEAL }}
          >
            {saving ? "Guardando…" : hasCambios ? "Guardar borrador" : "✓ Guardado"}
          </button>

          {visita.estado === "BORRADOR" && (
            <button
              onClick={() => cambiarEstado("COMPLETADA")}
              disabled={cambiandoEstado || saving}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-green-500 transition-opacity disabled:opacity-50"
            >
              {cambiandoEstado ? "…" : "Marcar completa"}
            </button>
          )}

          {visita.estado === "COMPLETADA" && (
            <button
              onClick={() => cambiarEstado("BORRADOR")}
              disabled={cambiandoEstado || saving}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 border border-gray-200 hover:border-gray-300 transition-colors disabled:opacity-50"
            >
              Reabrir
            </button>
          )}
        </div>
      )}

      {/* ─ Progreso global ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-500">Progreso total</p>
          <p className="text-xs text-gray-400">{completadas} / {sections.length} secciones completas</p>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progreso}%`,
              backgroundColor: progreso === 100 ? "#10b981" : TEAL,
            }}
          />
        </div>
      </div>

      {/* ─ Acordeón de secciones ─────────────────────────────────────────────── */}
      <div className="space-y-2 pb-8">
        {sections.map(section => {
          const pct = calcProgress(section, datos)
          const isOpen = openSection === section.id

          return (
            <div
              key={section.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Header sección */}
              <button
                onClick={() => setOpenSection(isOpen ? "" : section.id)}
                className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-xl shrink-0">{section.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{section.title}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="h-1 w-20 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: pct === 100 ? "#10b981" : TEAL,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{pct}%</span>
                    {pct === 100 && <span className="text-xs text-green-500">✓</span>}
                  </div>
                </div>
                <span
                  className="text-gray-300 text-lg transition-transform duration-200 shrink-0"
                  style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
                >
                  ›
                </span>
              </button>

              {/* Campos */}
              {isOpen && (
                <div className="border-t border-gray-100 px-4 py-5 space-y-5">
                  {section.fields.map(field => (
                    <div key={field.id}>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        {field.label}
                        {field.req && <span className="text-red-400 ml-0.5">*</span>}
                      </label>
                      {field.hint && (
                        <p className="text-xs text-gray-400 mb-1.5">{field.hint}</p>
                      )}
                      <CampoField
                        field={field}
                        value={datos[field.id]}
                        onChange={v => setField(field.id, v)}
                        readOnly={readOnly}
                      />
                    </div>
                  ))}

                  {/* Navegación entre secciones */}
                  <div className="flex justify-between pt-2 border-t border-gray-100">
                    {sections.findIndex(s => s.id === section.id) > 0 ? (
                      <button
                        onClick={() => {
                          const idx = sections.findIndex(s => s.id === section.id)
                          setOpenSection(sections[idx - 1].id)
                          window.scrollTo({ top: 0, behavior: "smooth" })
                        }}
                        className="text-xs font-medium text-gray-400 hover:text-gray-700"
                      >
                        ← Anterior
                      </button>
                    ) : <span />}

                    {sections.findIndex(s => s.id === section.id) < sections.length - 1 ? (
                      <button
                        onClick={() => {
                          const idx = sections.findIndex(s => s.id === section.id)
                          setOpenSection(sections[idx + 1].id)
                          window.scrollTo({ top: 0, behavior: "smooth" })
                        }}
                        className="text-xs font-medium"
                        style={{ color: TEAL }}
                      >
                        Siguiente →
                      </button>
                    ) : (
                      !readOnly && visita.estado === "BORRADOR" && (
                        <button
                          onClick={() => cambiarEstado("COMPLETADA")}
                          disabled={cambiandoEstado}
                          className="text-xs font-medium text-green-600 hover:text-green-700 disabled:opacity-50"
                        >
                          ✓ Marcar como completa
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ─ Info de sólo lectura ───────────────────────────────────────────────── */}
      {readOnly && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 px-5 py-4 text-center">
          <p className="text-sm text-gray-400">Esta visita está archivada y no se puede editar.</p>
        </div>
      )}
    </div>
  )
}
