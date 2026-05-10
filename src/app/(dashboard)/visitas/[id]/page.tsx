"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { getSections } from "@/lib/form-schema"
import type { FormField, FormSection } from "@/lib/form-schema"
import { comprimirImagen } from "@/lib/img-compress"

const TEAL = "#00A99D"
const TEAL_DARK = "#007A72"

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador", COMPLETADA: "Completada", ARCHIVADA: "Archivada",
}
const ESTADO_COLOR: Record<string, string> = {
  BORRADOR: "bg-amber-50 text-amber-600",
  COMPLETADA: "bg-green-50 text-green-600",
  ARCHIVADA: "bg-gray-100 text-gray-400",
}

interface Foto { id: string; name: string; data: string; caption: string }
type FotosMap = Record<string, Foto[]>

interface VisitaData {
  id: string; estado: string; tipo: string; fecha: string
  datos: Record<string, unknown>
  hospital: { id: string; nombre: string; ciudad: string; provincia?: string | null }
  usuario: { id: string; nombre: string }
}

// ─── Compresión + upload fotos ────────────────────────────────────────────────
function FotosSeccion({ sectionId, fotos, onChange, readOnly }: {
  sectionId: string
  fotos: Foto[]
  onChange: (fotos: Foto[]) => void
  readOnly: boolean
}) {
  const [subiendo, setSubiendo] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setSubiendo(true)
    const nuevas: Foto[] = []
    for (const file of Array.from(files)) {
      try {
        const data = await comprimirImagen(file)
        nuevas.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: file.name, data, caption: "" })
      } catch (e) { console.error("Error comprimiendo foto:", e) }
    }
    onChange([...fotos, ...nuevas])
    setSubiendo(false)
  }

  function updateCaption(id: string, caption: string) {
    onChange(fotos.map(f => f.id === id ? { ...f, caption } : f))
  }

  function eliminar(id: string) {
    onChange(fotos.filter(f => f.id !== id))
  }

  return (
    <div className="mt-6 pt-5 border-t border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
          <span>📷</span> Fotos de esta sección
          {fotos.length > 0 && <span className="normal-case font-medium text-gray-400">({fotos.length})</span>}
        </p>
        {!readOnly && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-dashed transition-colors disabled:opacity-50"
            style={{ borderColor: TEAL, color: TEAL }}
          >
            {subiendo ? (
              <><span className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin inline-block" style={{ borderColor: TEAL, borderTopColor: "transparent" }} /> Subiendo…</>
            ) : (
              <><span className="text-sm">+</span> Añadir foto</>
            )}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {fotos.length === 0 && !readOnly && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-gray-300 transition-colors"
        >
          <p className="text-2xl mb-1">📷</p>
          <p className="text-xs text-gray-400">Toca para añadir fotos de esta sección</p>
          <p className="text-xs text-gray-300 mt-0.5">Cámara o galería · Se comprimen automáticamente</p>
        </button>
      )}

      {fotos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {fotos.map(foto => (
            <div key={foto.id} className="relative group">
              <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={foto.data} alt={foto.caption || foto.name} className="w-full h-full object-cover" />
              </div>
              {!readOnly && (
                <button
                  onClick={() => eliminar(foto.id)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              )}
              <input
                type="text"
                value={foto.caption}
                onChange={e => updateCaption(foto.id, e.target.value)}
                placeholder="Descripción…"
                disabled={readOnly}
                className="mt-1.5 w-full text-xs border-0 bg-transparent text-gray-500 placeholder-gray-300 focus:outline-none"
              />
            </div>
          ))}
          {!readOnly && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="aspect-video border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center hover:border-gray-300 transition-colors"
            >
              <span className="text-2xl text-gray-300">+</span>
              <span className="text-xs text-gray-300 mt-1">Añadir</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Radio pills ───────────────────────────────────────────────────────────────
function RadioPills({ field, value, onChange, readOnly }: {
  field: FormField; value: unknown; onChange: (v: unknown) => void; readOnly: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {field.opts?.map(o => {
        const active = value === o
        return (
          <button key={o} type="button" disabled={readOnly}
            onClick={() => !readOnly && onChange(active ? "" : o)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border transition-all min-h-[44px] disabled:cursor-default"
            style={active ? { backgroundColor: TEAL, color: "#fff", borderColor: TEAL }
              : { backgroundColor: "#fff", color: "#374151", borderColor: "#e5e7eb" }}
          >{o}</button>
        )
      })}
    </div>
  )
}

// ─── Checkbox pills ────────────────────────────────────────────────────────────
function CheckPills({ field, value, onChange, readOnly }: {
  field: FormField; value: unknown; onChange: (v: unknown) => void; readOnly: boolean
}) {
  const arr = (value as string[] | undefined) ?? []
  return (
    <div className="flex flex-wrap gap-2">
      {field.opts?.map(o => {
        const active = arr.includes(o)
        return (
          <button key={o} type="button" disabled={readOnly}
            onClick={() => { if (!readOnly) onChange(active ? arr.filter(x => x !== o) : [...arr, o]) }}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border transition-all min-h-[44px] text-left disabled:cursor-default"
            style={active ? { backgroundColor: TEAL, color: "#fff", borderColor: TEAL }
              : { backgroundColor: "#fff", color: "#374151", borderColor: "#e5e7eb" }}
          >{active && <span className="mr-1.5">✓</span>}{o}</button>
        )
      })}
    </div>
  )
}

// ─── Rating ────────────────────────────────────────────────────────────────────
function RatingField({ value, onChange, readOnly }: {
  value: unknown; onChange: (v: unknown) => void; readOnly: boolean
}) {
  const v = (value as number | undefined) ?? 0
  const [hover, setHover] = useState(0)
  const labels = ["", "Muy bajo", "Bajo", "Medio", "Alto", "Muy alto"]
  return (
    <div>
      <div className="flex gap-2">
        {[1,2,3,4,5].map(n => (
          <button key={n} type="button" disabled={readOnly}
            onClick={() => !readOnly && onChange(v === n ? 0 : n)}
            onMouseEnter={() => !readOnly && setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="text-3xl sm:text-4xl transition-transform hover:scale-110 disabled:cursor-default min-w-[44px] min-h-[44px] flex items-center justify-center"
          >{n <= (hover || v) ? "⭐" : <span className="text-gray-200">★</span>}</button>
        ))}
      </div>
      {v > 0 && <p className="text-xs text-gray-400 mt-1.5">{v}/5 — {labels[v]}</p>}
    </div>
  )
}

// ─── Campo genérico ────────────────────────────────────────────────────────────
function CampoField({ field, value, onChange, readOnly }: {
  field: FormField; value: unknown; onChange: (v: unknown) => void; readOnly: boolean
}) {
  const base = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 bg-white min-h-[44px]"
  if (field.type === "radio") return <RadioPills field={field} value={value} onChange={onChange} readOnly={readOnly} />
  if (field.type === "checks") return <CheckPills field={field} value={value} onChange={onChange} readOnly={readOnly} />
  if (field.type === "rating") return <RatingField value={value} onChange={onChange} readOnly={readOnly} />
  if (field.type === "textarea") return (
    <textarea value={(value as string) ?? ""} onChange={e => onChange(e.target.value)}
      placeholder={field.ph} disabled={readOnly} rows={4} className={`${base} resize-none`} />
  )
  if (field.type === "select") return (
    <select value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} disabled={readOnly} className={base}>
      <option value="">— Seleccionar —</option>
      {field.opts?.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
  return (
    <input type={field.type} value={(value as string) ?? ""} onChange={e => onChange(e.target.value)}
      placeholder={field.ph} disabled={readOnly} className={base} />
  )
}

// ─── Progreso ──────────────────────────────────────────────────────────────────
function calcProgress(section: FormSection, datos: Record<string, unknown>): number {
  const reqFields = section.fields.filter(f => f.req)
  const toCheck = reqFields.length > 0 ? reqFields : section.fields
  if (toCheck.length === 0) return 100
  const filled = toCheck.filter(f => {
    const v = datos[f.id]
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === "number") return v > 0
    return v !== undefined && v !== null && v !== ""
  }).length
  return Math.round((filled / toCheck.length) * 100)
}

// ─── Export JSON ───────────────────────────────────────────────────────────────
function exportarJSON(visita: VisitaData, datos: Record<string, unknown>, sections: FormSection[]) {
  const payload = {
    exportado: new Date().toISOString(),
    version: "1.0",
    visita: {
      id: visita.id,
      hospital: visita.hospital.nombre,
      ciudad: visita.hospital.ciudad,
      fecha: visita.fecha,
      tipo: visita.tipo,
      estado: visita.estado,
      tecnico: visita.usuario.nombre,
    },
    secciones: sections.map(s => ({
      id: s.id,
      titulo: s.title,
      campos: s.fields.reduce<Record<string, unknown>>((acc, f) => {
        const v = datos[f.id]
        if (v !== undefined && v !== null && v !== "") acc[f.label] = v
        return acc
      }, {}),
      fotos: ((datos.fotos as FotosMap)?.[s.id] ?? []).map(f => ({
        nombre: f.name,
        caption: f.caption,
        // Incluimos data para que el fichero sea autocontenido
        data: f.data,
      })),
    })),
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  const fecha = new Date(visita.fecha).toISOString().slice(0, 10)
  a.href = url
  a.download = `visita-${visita.hospital.nombre.replace(/\s+/g, "-").toLowerCase()}-${fecha}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── VISTA IMPRESIÓN ───────────────────────────────────────────────────────────
function PrintView({ visita, datos, sections }: {
  visita: VisitaData; datos: Record<string, unknown>; sections: FormSection[]
}) {
  const fotos = (datos.fotos as FotosMap) ?? {}
  const completadas = sections.filter(s => calcProgress(s, datos) === 100).length
  const progreso = sections.length ? Math.round((completadas / sections.length) * 100) : 0
  const fechaLarga = new Date(visita.fecha).toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
  const fechaCorta = new Date().toLocaleDateString("es-ES")

  return (
    <div className="print-doc">
      <style>{`
        @page { margin: 20mm 15mm; }
        @media print {
          body, html { margin: 0; padding: 0; background: white !important; }
          .no-print { display: none !important; }
          .print-doc { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; }
          .cover-page { page-break-after: always; min-height: 100vh; display: flex; flex-direction: column; }
          .section-block { page-break-inside: avoid; margin-bottom: 24px; }
          .section-block-large { page-break-before: auto; }
          .foto-grid { page-break-inside: avoid; }
          .page-footer { position: fixed; bottom: 0; left: 0; right: 0; font-size: 9px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding: 6px 15mm; display: flex; justify-content: space-between; }
        }
        @media screen {
          .print-doc { max-width: 800px; margin: 0 auto; padding: 20px; background: white; }
          .cover-page { min-height: 90vh; border-bottom: 3px solid #e5e7eb; margin-bottom: 40px; padding-bottom: 40px; }
        }
      `}</style>

      {/* ── PORTADA ── */}
      <div className="cover-page" style={{ display: "flex", flexDirection: "column" }}>
        {/* Header branding */}
        <div style={{ backgroundColor: TEAL, color: "white", padding: "32px 40px", borderRadius: "0 0 24px 24px", marginBottom: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Palex Medical</div>
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Soluciones Preanalíticas</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 11, opacity: 0.7 }}>
              <div>Informe de visita</div>
              <div style={{ fontWeight: 600 }}>{visita.tipo}</div>
            </div>
          </div>
        </div>

        {/* Contenido portada */}
        <div style={{ padding: "48px 40px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ borderLeft: `5px solid ${TEAL}`, paddingLeft: 24, marginBottom: 40 }}>
            <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Hospital / Centro</div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "#111", margin: 0, lineHeight: 1.1 }}>{visita.hospital.nombre}</h1>
            <p style={{ fontSize: 16, color: "#6b7280", marginTop: 8 }}>
              {visita.hospital.ciudad}{visita.hospital.provincia ? `, ${visita.hospital.provincia}` : ""}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 40 }}>
            {[
              { label: "Fecha de visita", value: fechaLarga },
              { label: "Técnico Palex", value: visita.usuario.nombre },
              { label: "Tipo de visita", value: visita.tipo },
              { label: "Estado", value: ESTADO_LABEL[visita.estado] },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#f9fafb", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Barra de progreso */}
          <div style={{ background: "#f3f4f6", borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Completitud del formulario</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: progreso === 100 ? "#10b981" : TEAL }}>{progreso}%</span>
            </div>
            <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progreso}%`, backgroundColor: progreso === 100 ? "#10b981" : TEAL, borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
              {completadas} de {sections.length} secciones completas
            </div>
          </div>
        </div>

        {/* Footer portada */}
        <div style={{ padding: "20px 40px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9ca3af" }}>
          <span>Documento confidencial — Uso interno Palex Medical</span>
          <span>Generado el {fechaCorta}</span>
        </div>
      </div>

      {/* ── SECCIONES ── */}
      {sections.map((section, idx) => {
        const camposRellenos = section.fields.filter(f => {
          const v = datos[f.id]
          if (Array.isArray(v)) return v.length > 0
          if (typeof v === "number") return v > 0
          return v !== undefined && v !== null && v !== ""
        })
        const fotosSeccion = fotos[section.id] ?? []
        if (camposRellenos.length === 0 && fotosSeccion.length === 0) return null

        return (
          <div key={section.id} className="section-block" style={{ marginBottom: 32, pageBreakInside: idx > 3 ? "auto" : "avoid" }}>
            {/* Header sección */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 10, borderBottom: `2px solid ${TEAL}` }}>
              <span style={{ fontSize: 20 }}>{section.icon}</span>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: 0 }}>{section.title}</h2>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "#9ca3af" }}>{idx + 1}/{sections.length}</span>
            </div>

            {/* Campos */}
            {camposRellenos.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {camposRellenos.map((f, fi) => {
                  const v = datos[f.id]
                  const display = Array.isArray(v) ? (v as string[]).join(" · ") : String(v)
                  return (
                    <div key={f.id} style={{
                      display: "flex", gap: 16, padding: "10px 12px",
                      background: fi % 2 === 0 ? "#f9fafb" : "white",
                      borderRadius: fi === 0 ? "8px 8px 0 0" : fi === camposRellenos.length - 1 ? "0 0 8px 8px" : "0",
                    }}>
                      <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, width: 200, flexShrink: 0, paddingTop: 1 }}>{f.label}</span>
                      <span style={{ fontSize: 12, color: "#111", flex: 1 }}>{display}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Fotos de la sección */}
            {fotosSeccion.length > 0 && (
              <div className="foto-grid" style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
                  Fotografías ({fotosSeccion.length})
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {fotosSeccion.map(foto => (
                    <div key={foto.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={foto.data} alt={foto.caption || foto.name}
                        style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }}
                      />
                      {foto.caption && (
                        <p style={{ fontSize: 10, color: "#6b7280", marginTop: 4, fontStyle: "italic" }}>{foto.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Footer fijo en impresión */}
      <div className="page-footer">
        <span>Palex Medical · Informe de visita preproyecto · {visita.hospital.nombre}</span>
        <span>Generado el {fechaCorta}</span>
      </div>
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
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
  const [showPrint, setShowPrint] = useState(false)

  const datosRef = useRef<Record<string, unknown>>({})
  const visitaRef = useRef<VisitaData | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch(`/api/visitas/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setVisita(data); visitaRef.current = data
          const d = typeof data.datos === "object" && data.datos !== null ? (data.datos as Record<string, unknown>) : {}
          setDatos(d); datosRef.current = d
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
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      if (r.ok) {
        const updated = await r.json()
        setVisita(v => { const next = v ? { ...v, estado: updated.estado } : v; visitaRef.current = next; return next })
        setSavedAt(new Date()); setPendiente(false)
      }
    } finally { setSaving(false) }
  }, [id])

  const guardarRef = useRef(guardar)
  useEffect(() => { guardarRef.current = guardar }, [guardar])

  function setField(fieldId: string, value: unknown) {
    setDatos(prev => { const next = { ...prev, [fieldId]: value }; datosRef.current = next; return next })
    setPendiente(true); setSavedAt(null)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => guardarRef.current(), 2000)
  }

  function setFotos(sectionId: string, fotos: Foto[]) {
    setDatos(prev => {
      const fotosMap = ((prev.fotos as FotosMap) ?? {})
      const next = { ...prev, fotos: { ...fotosMap, [sectionId]: fotos } }
      datosRef.current = next
      return next
    })
    setPendiente(true); setSavedAt(null)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => guardarRef.current(), 2000)
  }

  async function cambiarEstado(estado: string) {
    setCambiandoEstado(true); await guardar(estado); setCambiandoEstado(false)
  }

  function tiempoGuardado() {
    if (!savedAt) return ""
    const s = Math.round((Date.now() - savedAt.getTime()) / 1000)
    return s < 5 ? "ahora mismo" : s < 60 ? `hace ${s}s` : `hace ${Math.round(s / 60)}min`
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: TEAL }} />
    </div>
  )

  if (!visita) return (
    <div className="text-center py-24">
      <p className="text-3xl mb-3">🔍</p>
      <p className="text-gray-500 text-sm">Visita no encontrada</p>
      <button onClick={() => router.back()} className="mt-3 text-sm font-medium" style={{ color: TEAL }}>← Volver</button>
    </div>
  )

  const tipo = visita.tipo as "PROYECTOS" | "VENTAS"
  const sections = getSections(tipo)
  const readOnly = visita.estado === "ARCHIVADA"
  const completadas = sections.filter(s => calcProgress(s, datos) === 100).length
  const progreso = sections.length ? Math.round((completadas / sections.length) * 100) : 0
  const fotosMap = (datos.fotos as FotosMap) ?? {}
  const totalFotos = Object.values(fotosMap).reduce((acc, arr) => acc + arr.length, 0)

  // ─ Vista impresión ─
  if (showPrint) {
    return (
      <>
        <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
          <button onClick={() => setShowPrint(false)} className="text-sm text-gray-500 hover:text-gray-700 font-medium">← Volver</button>
          <span className="text-sm text-gray-400">Vista previa de impresión</span>
          <div className="ml-auto flex gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: TEAL }}
            >
              🖨 Imprimir / Guardar PDF
            </button>
          </div>
        </div>
        <div className="pt-16">
          <PrintView visita={visita} datos={datos} sections={sections} />
        </div>
        <style>{`@media print { .no-print { display: none !important; } }`}</style>
      </>
    )
  }

  return (
    <>
      <div className="max-w-2xl mx-auto pb-32 sm:pb-8">

        {/* ─ Cabecera ─ */}
        <div className="flex items-start gap-2 mb-4">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-2xl shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center">‹</button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-800 leading-tight truncate">{visita.hospital.nombre}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {visita.hospital.ciudad} · {new Date(visita.fecha).toLocaleDateString("es-ES")} · {tipo}
              {totalFotos > 0 && <span className="ml-2">· 📷 {totalFotos} fotos</span>}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${ESTADO_COLOR[visita.estado]}`}>
              {ESTADO_LABEL[visita.estado]}
            </span>
            {/* Imprimir */}
            <button onClick={() => setShowPrint(true)} title="Vista previa PDF"
              className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
              </svg>
            </button>
            {/* Exportar */}
            <button onClick={() => exportarJSON(visita, datos, sections)} title="Exportar a fichero JSON"
              className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ─ Selector sección ─ */}
        <div className="mb-4">
          <select value={openSection}
            onChange={e => { setOpenSection(e.target.value); setTimeout(() => document.getElementById(`sec-${e.target.value}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50) }}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
          >
            {sections.map((s, i) => {
              const pct = calcProgress(s, datos)
              const nFotos = (fotosMap[s.id] ?? []).length
              return (
                <option key={s.id} value={s.id}>
                  {pct === 100 ? "✓ " : `${i + 1}. `}{s.icon} {s.title}
                  {nFotos > 0 ? ` 📷${nFotos}` : ""}
                  {pct > 0 && pct < 100 ? ` (${pct}%)` : ""}
                </option>
              )
            })}
          </select>
        </div>

        {/* ─ Progreso global ─ */}
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500">Progreso total</p>
            <p className="text-xs text-gray-400">{completadas}/{sections.length} secciones · {progreso}% · 📷 {totalFotos} fotos</p>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progreso}%`, backgroundColor: progreso === 100 ? "#10b981" : TEAL }} />
          </div>
        </div>

        {/* ─ Acordeón secciones ─ */}
        <div className="space-y-2">
          {sections.map((section, idx) => {
            const pct = calcProgress(section, datos)
            const isOpen = openSection === section.id
            const nFotos = (fotosMap[section.id] ?? []).length

            return (
              <div key={section.id} id={`sec-${section.id}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button onClick={() => setOpenSection(isOpen ? "" : section.id)}
                  className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[60px]">
                  <span className="text-xl sm:text-2xl shrink-0 w-8 text-center">{section.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">{section.title}</p>
                      {pct === 100 && <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">✓</span>}
                      {nFotos > 0 && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">📷 {nFotos}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#10b981" : TEAL }} />
                      </div>
                      <span className="text-xs text-gray-400">{pct}%</span>
                    </div>
                  </div>
                  <span className="text-gray-300 text-xl transition-transform duration-200 shrink-0"
                    style={{ transform: isOpen ? "rotate(90deg)" : "none" }}>›</span>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 px-4 py-5 space-y-6">
                    {section.fields.map(field => (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {field.label}{field.req && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        {field.hint && <p className="text-xs text-gray-400 mb-2">{field.hint}</p>}
                        <CampoField field={field} value={datos[field.id]} onChange={v => setField(field.id, v)} readOnly={readOnly} />
                      </div>
                    ))}

                    {/* Fotos de esta sección */}
                    <FotosSeccion
                      sectionId={section.id}
                      fotos={fotosMap[section.id] ?? []}
                      onChange={fotos => setFotos(section.id, fotos)}
                      readOnly={readOnly}
                    />

                    {/* Navegación */}
                    <div className="flex justify-between pt-3 border-t border-gray-100">
                      {idx > 0 ? (
                        <button onClick={() => { setOpenSection(sections[idx - 1].id); window.scrollTo({ top: 0, behavior: "smooth" }) }}
                          className="text-sm font-medium text-gray-400 hover:text-gray-700 min-h-[44px] px-2">← Anterior</button>
                      ) : <span />}
                      {idx < sections.length - 1 ? (
                        <button onClick={() => { setOpenSection(sections[idx + 1].id); window.scrollTo({ top: 0, behavior: "smooth" }) }}
                          className="text-sm font-medium min-h-[44px] px-2" style={{ color: TEAL }}>Siguiente →</button>
                      ) : !readOnly && visita.estado === "BORRADOR" ? (
                        <button onClick={() => cambiarEstado("COMPLETADA")} disabled={cambiandoEstado}
                          className="text-sm font-medium text-green-600 disabled:opacity-50 min-h-[44px] px-2">✓ Marcar completa</button>
                      ) : <span />}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {readOnly && (
          <div className="mt-4 bg-gray-50 rounded-xl border border-gray-200 px-5 py-4 text-center">
            <p className="text-sm text-gray-400">Esta visita está archivada.</p>
          </div>
        )}
      </div>

      {/* ─ Barra sticky móvil ─ */}
      {!readOnly && (
        <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden">
          <div className="bg-white border-t border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${progreso}%`, backgroundColor: progreso === 100 ? "#10b981" : TEAL }} />
              </div>
              <span className="text-xs text-gray-400 shrink-0">{progreso}%</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => guardar()} disabled={saving || !pendiente}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: TEAL }}>
                {saving ? "Guardando…" : pendiente ? "Guardar" : savedAt ? `✓ ${tiempoGuardado()}` : "Sin cambios"}
              </button>
              {visita.estado === "BORRADOR" && !pendiente && (
                <button onClick={() => cambiarEstado("COMPLETADA")} disabled={cambiandoEstado}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-green-500 disabled:opacity-50">
                  {cambiandoEstado ? "…" : "✓ Completar"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─ Barra flotante desktop ─ */}
      {!readOnly && (
        <div className="hidden sm:block fixed bottom-6 right-6 z-40">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg px-4 py-3 flex items-center gap-3">
            <div className="text-xs text-gray-400">
              {saving ? <span className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin inline-block" />Guardando…</span>
                : pendiente ? <span className="text-amber-500 font-medium">● Sin guardar</span>
                : savedAt ? <span className="text-green-500 font-medium">✓ Guardado {tiempoGuardado()}</span>
                : <span>Sin cambios</span>}
            </div>
            <button onClick={() => guardar()} disabled={saving || !pendiente}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: TEAL }}>Guardar</button>
            {visita.estado === "BORRADOR" && (
              <button onClick={() => cambiarEstado("COMPLETADA")} disabled={cambiandoEstado || saving}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-green-500 disabled:opacity-50">
                {cambiandoEstado ? "…" : "✓ Completar"}
              </button>
            )}
            {visita.estado === "COMPLETADA" && (
              <button onClick={() => cambiarEstado("BORRADOR")} disabled={cambiandoEstado}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 border border-gray-200 hover:border-gray-300 disabled:opacity-50">
                Reabrir
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
