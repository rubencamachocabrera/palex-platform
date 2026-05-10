"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { getSections } from "@/lib/form-schema"
import type { FormField, FormSection } from "@/lib/form-schema"

const TEAL = "#00A99D"
const TEAL_BG = "#E6F7F6"

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador", COMPLETADA: "Completada", ARCHIVADA: "Archivada",
}
const ESTADO_COLOR: Record<string, string> = {
  BORRADOR: "bg-amber-50 text-amber-600",
  COMPLETADA: "bg-green-50 text-green-600",
  ARCHIVADA: "bg-gray-100 text-gray-400",
}

interface VisitaData {
  id: string; estado: string; tipo: string; fecha: string
  datos: Record<string, unknown>
  hospital: { id: string; nombre: string; ciudad: string }
  usuario: { id: string; nombre: string }
}

// ─── Radio como pills ──────────────────────────────────────────────────────────
function RadioPills({ field, value, onChange, readOnly }: {
  field: FormField; value: unknown; onChange: (v: unknown) => void; readOnly: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {field.opts?.map(o => {
        const active = value === o
        return (
          <button
            key={o}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onChange(active ? "" : o)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border transition-all min-h-[44px] disabled:cursor-default"
            style={active
              ? { backgroundColor: TEAL, color: "#fff", borderColor: TEAL }
              : { backgroundColor: "#fff", color: "#374151", borderColor: "#e5e7eb" }}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}

// ─── Checkboxes como pills ─────────────────────────────────────────────────────
function CheckPills({ field, value, onChange, readOnly }: {
  field: FormField; value: unknown; onChange: (v: unknown) => void; readOnly: boolean
}) {
  const arr = (value as string[] | undefined) ?? []
  return (
    <div className="flex flex-wrap gap-2">
      {field.opts?.map(o => {
        const active = arr.includes(o)
        return (
          <button
            key={o}
            type="button"
            disabled={readOnly}
            onClick={() => {
              if (readOnly) return
              onChange(active ? arr.filter(x => x !== o) : [...arr, o])
            }}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border transition-all min-h-[44px] text-left disabled:cursor-default"
            style={active
              ? { backgroundColor: TEAL, color: "#fff", borderColor: TEAL }
              : { backgroundColor: "#fff", color: "#374151", borderColor: "#e5e7eb" }}
          >
            {active && <span className="mr-1.5">✓</span>}
            {o}
          </button>
        )
      })}
    </div>
  )
}

// ─── Rating con estrellas grandes ─────────────────────────────────────────────
function RatingField({ value, onChange, readOnly }: {
  value: unknown; onChange: (v: unknown) => void; readOnly: boolean
}) {
  const v = (value as number | undefined) ?? 0
  const [hover, setHover] = useState(0)
  return (
    <div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(n => {
          const filled = n <= (hover || v)
          return (
            <button
              key={n}
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && onChange(v === n ? 0 : n)}
              onMouseEnter={() => !readOnly && setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="text-3xl sm:text-4xl transition-transform hover:scale-110 disabled:cursor-default min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              {filled ? "⭐" : <span className="text-gray-200">★</span>}
            </button>
          )
        })}
      </div>
      {v > 0 && (
        <p className="text-xs text-gray-400 mt-1.5">{v} de 5 — {["", "Muy bajo", "Bajo", "Medio", "Alto", "Muy alto"][v]}</p>
      )}
    </div>
  )
}

// ─── Renderer de campo ─────────────────────────────────────────────────────────
function CampoField({ field, value, onChange, readOnly }: {
  field: FormField; value: unknown; onChange: (v: unknown) => void; readOnly: boolean
}) {
  const base = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 bg-white min-h-[44px]"

  if (field.type === "radio") return <RadioPills field={field} value={value} onChange={onChange} readOnly={readOnly} />
  if (field.type === "checks") return <CheckPills field={field} value={value} onChange={onChange} readOnly={readOnly} />
  if (field.type === "rating") return <RatingField value={value} onChange={onChange} readOnly={readOnly} />

  if (field.type === "textarea") {
    return (
      <textarea
        value={(value as string) ?? ""}
        onChange={e => onChange(e.target.value)}
        placeholder={field.ph}
        disabled={readOnly}
        rows={4}
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
        {field.opts?.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }

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

// ─── Progreso ─────────────────────────────────────────────────────────────────
function calcProgress(section: FormSection, datos: Record<string, unknown>): number {
  const total = section.fields.filter(f => f.req).length || section.fields.length
  if (total === 0) return 100
  const filled = section.fields.filter(f => {
    if (!f.req && section.fields.some(x => x.req)) return false
    const v = datos[f.id]
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === "number") return v > 0
    return v !== undefined && v !== null && v !== ""
  }).length
  return Math.round((filled / total) * 100)
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function VisitaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [visita, setVisita] = useState<VisitaData | null>(null)
  const [datos, setDatos] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [pendiente, setPendiente] = useState(false)
  const [openSection, setOpenSection] = useState<string>("s0")
  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  const [printMode, setPrintMode] = useState(false)

  const datosRef = useRef<Record<string, unknown>>({})
  const visitaRef = useRef<VisitaData | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch(`/api/visitas/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setVisita(data)
          visitaRef.current = data
          const d = typeof data.datos === "object" && data.datos !== null
            ? (data.datos as Record<string, unknown>) : {}
          setDatos(d)
          datosRef.current = d
        }
        setLoading(false)
      })
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [id])

  const guardar = useCallback(async (nuevoEstado?: string) => {
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
        setSavedAt(new Date())
        setPendiente(false)
      }
    } finally {
      setSaving(false)
    }
  }, [id])

  const guardarRef = useRef(guardar)
  useEffect(() => { guardarRef.current = guardar }, [guardar])

  function setField(fieldId: string, value: unknown) {
    setDatos(prev => {
      const next = { ...prev, [fieldId]: value }
      datosRef.current = next
      return next
    })
    setPendiente(true)
    setSavedAt(null)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => guardarRef.current(), 2000)
  }

  async function cambiarEstado(estado: string) {
    setCambiandoEstado(true)
    await guardar(estado)
    setCambiandoEstado(false)
  }

  function imprimir() {
    setPrintMode(true)
    setTimeout(() => { window.print(); setPrintMode(false) }, 100)
  }

  // Tiempo desde guardado
  function tiempoGuardado() {
    if (!savedAt) return ""
    const segs = Math.round((Date.now() - savedAt.getTime()) / 1000)
    if (segs < 5) return "ahora mismo"
    if (segs < 60) return `hace ${segs}s`
    return `hace ${Math.round(segs / 60)}min`
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: TEAL }} />
    </div>
  )

  if (!visita) return (
    <div className="text-center py-24">
      <p className="text-3xl mb-3">🔍</p>
      <p className="text-gray-500 text-sm font-medium">Visita no encontrada</p>
      <button onClick={() => router.back()} className="mt-3 text-sm font-medium" style={{ color: TEAL }}>← Volver</button>
    </div>
  )

  const tipo = visita.tipo as "PROYECTOS" | "VENTAS"
  const sections = getSections(tipo)
  const readOnly = visita.estado === "ARCHIVADA"
  const completadas = sections.filter(s => calcProgress(s, datos) === 100).length
  const progreso = sections.length ? Math.round((completadas / sections.length) * 100) : 0

  // ─── MODO IMPRESIÓN ──────────────────────────────────────────────────────────
  if (printMode) {
    return (
      <div className="print-container p-8 max-w-4xl mx-auto font-sans">
        <style>{`
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
          }
        `}</style>
        <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{visita.hospital.nombre}</h1>
            <p className="text-gray-500 mt-1">{visita.hospital.ciudad} · {new Date(visita.fecha).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}</p>
            <p className="text-gray-400 text-sm mt-0.5">Técnico: {visita.usuario.nombre} · Tipo: {tipo} · Estado: {ESTADO_LABEL[visita.estado]}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: TEAL }}>Palex</div>
            <div className="text-xs text-gray-400 mt-1">Medical</div>
          </div>
        </div>
        {sections.map(section => {
          const sectionData = section.fields.filter(f => {
            const v = datos[f.id]
            if (Array.isArray(v)) return v.length > 0
            if (typeof v === "number") return v > 0
            return v !== undefined && v !== null && v !== ""
          })
          if (sectionData.length === 0) return null
          return (
            <div key={section.id} className="mb-6">
              <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span>{section.icon}</span> {section.title}
              </h2>
              <div className="space-y-2 pl-7">
                {sectionData.map(f => {
                  const v = datos[f.id]
                  const display = Array.isArray(v) ? v.join(", ") : String(v)
                  return (
                    <div key={f.id} className="flex gap-3">
                      <span className="text-xs font-medium text-gray-500 w-48 shrink-0 pt-0.5">{f.label}:</span>
                      <span className="text-sm text-gray-800">{display}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        <div className="mt-10 pt-4 border-t border-gray-200 text-xs text-gray-400 flex justify-between">
          <span>Palex Medical — Informe de visita preproyecto</span>
          <span>Generado el {new Date().toLocaleDateString("es-ES")}</span>
        </div>
      </div>
    )
  }

  // ─── VISTA NORMAL ────────────────────────────────────────────────────────────
  return (
    <>
      {/* CSS impresión */}
      <style>{`
        @media print {
          nav, aside, header, .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
      `}</style>

      <div className="max-w-2xl mx-auto pb-32 sm:pb-8">

        {/* ─ Cabecera ─ */}
        <div className="flex items-start gap-3 mb-4 no-print">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 mt-0.5 text-2xl shrink-0 leading-none min-w-[44px] min-h-[44px] flex items-center justify-center">
            ‹
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-800 leading-tight truncate">
              {visita.hospital.nombre}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {visita.hospital.ciudad} · {new Date(visita.fecha).toLocaleDateString("es-ES")} · {tipo}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ESTADO_COLOR[visita.estado]}`}>
              {ESTADO_LABEL[visita.estado]}
            </span>
            {/* Botón imprimir */}
            <button
              onClick={imprimir}
              title="Imprimir / Guardar PDF"
              className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ─ Selector rápido de sección ─ */}
        <div className="mb-4 no-print">
          <select
            value={openSection}
            onChange={e => { setOpenSection(e.target.value); setTimeout(() => document.getElementById(`sec-${e.target.value}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50) }}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
          >
            {sections.map((s, i) => {
              const pct = calcProgress(s, datos)
              return <option key={s.id} value={s.id}>{pct === 100 ? "✓ " : `${i + 1}. `}{s.icon} {s.title} {pct > 0 && pct < 100 ? `(${pct}%)` : ""}</option>
            })}
          </select>
        </div>

        {/* ─ Progreso global ─ */}
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-4 no-print">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500">Progreso total</p>
            <p className="text-xs text-gray-400">{completadas}/{sections.length} secciones · {progreso}%</p>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progreso}%`, backgroundColor: progreso === 100 ? "#10b981" : TEAL }}
            />
          </div>
          {progreso === 100 && (
            <p className="text-xs text-green-500 font-medium mt-1.5">✓ Formulario completo</p>
          )}
        </div>

        {/* ─ Acordeón de secciones ─ */}
        <div className="space-y-2 no-print">
          {sections.map((section, idx) => {
            const pct = calcProgress(section, datos)
            const isOpen = openSection === section.id
            return (
              <div key={section.id} id={`sec-${section.id}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setOpenSection(isOpen ? "" : section.id)}
                  className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[60px]"
                >
                  <span className="text-xl sm:text-2xl shrink-0 w-8 text-center">{section.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">{section.title}</p>
                      {pct === 100 && (
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">✓ Completa</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#10b981" : TEAL }} />
                      </div>
                      <span className="text-xs text-gray-400">{pct}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-300 hidden sm:block">{idx + 1}/{sections.length}</span>
                    <span className="text-gray-300 text-xl transition-transform duration-200" style={{ transform: isOpen ? "rotate(90deg)" : "none" }}>›</span>
                  </div>
                </button>

                {/* Campos */}
                {isOpen && (
                  <div className="border-t border-gray-100 px-4 py-5 space-y-6">
                    {section.fields.map(field => (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {field.label}
                          {field.req && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        {field.hint && (
                          <p className="text-xs text-gray-400 mb-2">{field.hint}</p>
                        )}
                        <CampoField
                          field={field}
                          value={datos[field.id]}
                          onChange={v => setField(field.id, v)}
                          readOnly={readOnly}
                        />
                      </div>
                    ))}

                    {/* Navegación sección */}
                    <div className="flex justify-between pt-3 border-t border-gray-100">
                      {idx > 0 ? (
                        <button
                          onClick={() => { setOpenSection(sections[idx - 1].id); window.scrollTo({ top: 0, behavior: "smooth" }) }}
                          className="text-sm font-medium text-gray-400 hover:text-gray-700 min-h-[44px] px-2"
                        >
                          ← Anterior
                        </button>
                      ) : <span />}
                      {idx < sections.length - 1 ? (
                        <button
                          onClick={() => { setOpenSection(sections[idx + 1].id); window.scrollTo({ top: 0, behavior: "smooth" }) }}
                          className="text-sm font-medium min-h-[44px] px-2"
                          style={{ color: TEAL }}
                        >
                          Siguiente →
                        </button>
                      ) : !readOnly && visita.estado === "BORRADOR" ? (
                        <button
                          onClick={() => cambiarEstado("COMPLETADA")}
                          disabled={cambiandoEstado}
                          className="text-sm font-medium text-green-600 hover:text-green-700 disabled:opacity-50 min-h-[44px] px-2"
                        >
                          ✓ Marcar completa
                        </button>
                      ) : <span />}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {readOnly && (
          <div className="mt-4 bg-gray-50 rounded-xl border border-gray-200 px-5 py-4 text-center no-print">
            <p className="text-sm text-gray-400">Esta visita está archivada y no se puede editar.</p>
          </div>
        )}
      </div>

      {/* ─ Barra sticky inferior (móvil) ─ */}
      {!readOnly && (
        <div className="fixed bottom-0 left-0 right-0 z-40 no-print sm:hidden">
          <div className="bg-white border-t border-gray-200 px-4 py-3 safe-area-bottom">
            {/* Mini progreso */}
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progreso}%`, backgroundColor: progreso === 100 ? "#10b981" : TEAL }}
                />
              </div>
              <span className="text-xs text-gray-400 shrink-0">{progreso}%</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => guardar()}
                disabled={saving || !pendiente}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ backgroundColor: TEAL }}
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                    Guardando…
                  </span>
                ) : pendiente ? "Guardar" : savedAt ? `✓ Guardado ${tiempoGuardado()}` : "Sin cambios"}
              </button>
              {visita.estado === "BORRADOR" && !pendiente && (
                <button
                  onClick={() => cambiarEstado("COMPLETADA")}
                  disabled={cambiandoEstado}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-green-500 transition-opacity disabled:opacity-50"
                >
                  {cambiandoEstado ? "…" : "✓ Completar"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─ Barra acciones desktop ─ */}
      {!readOnly && (
        <div className="hidden sm:block fixed bottom-6 right-6 z-40 no-print">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg px-4 py-3 flex items-center gap-3">
            {/* Indicador guardado */}
            <div className="text-xs text-gray-400 min-w-0">
              {saving ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin inline-block" />
                  Guardando…
                </span>
              ) : pendiente ? (
                <span className="text-amber-500 font-medium">● Sin guardar</span>
              ) : savedAt ? (
                <span className="text-green-500 font-medium">✓ Guardado {tiempoGuardado()}</span>
              ) : (
                <span>Sin cambios</span>
              )}
            </div>
            <button
              onClick={() => guardar()}
              disabled={saving || !pendiente}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: TEAL }}
            >
              Guardar
            </button>
            {visita.estado === "BORRADOR" && (
              <button
                onClick={() => cambiarEstado("COMPLETADA")}
                disabled={cambiandoEstado || saving}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-green-500 transition-opacity disabled:opacity-50"
              >
                {cambiandoEstado ? "…" : "✓ Completar"}
              </button>
            )}
            {visita.estado === "COMPLETADA" && (
              <button
                onClick={() => cambiarEstado("BORRADOR")}
                disabled={cambiandoEstado}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 border border-gray-200 hover:border-gray-300 transition-colors disabled:opacity-50"
              >
                Reabrir
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
