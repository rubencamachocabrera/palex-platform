"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { getSections } from "@/lib/form-schema"
import type { FormField, FormSection } from "@/lib/form-schema"
import { comprimirImagen } from "@/lib/img-compress"
import { TodoChecklist } from "@/components/visitas/TodoChecklist"
import type { TodoItem } from "@/components/visitas/TodoChecklist"
import type { AudioNota } from "@/components/visitas/VoiceNotes"
import { useOfflineSync } from "@/hooks/useOfflineSync"
import { AnalisisPanel } from "@/components/visitas/AnalisisPanel"
import { calcularScore } from "@/lib/visita-analysis"

const VoiceNotes = dynamic(() => import("@/components/visitas/VoiceNotes").then(m => ({ default: m.VoiceNotes })), { ssr: false })
const ComentariosPanel = dynamic(() => import("@/components/ComentariosPanel").then(m => ({ default: m.ComentariosPanel })), { ssr: false })

// Dynamic import — PrintView sólo se carga cuando el usuario pulsa "Imprimir"
const PrintView = dynamic(() => import("@/components/visitas/PrintView"), {
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-teal-500 rounded-full animate-spin" />
        <span className="text-sm">Preparando documento...</span>
      </div>
    </div>
  ),
  ssr: false,
})


import { TEAL, TEAL_DARK } from "@/lib/brand"
import {
  IconHospital, IconUsers, IconCalendar, IconAlertTriangle, IconMonitor,
  IconServer, IconPrinter, IconCpu, IconTag, IconAlertCircle, IconLock,
  IconAward, IconBriefcase, IconPenLine, IconDroplet, IconClipboard,
  IconCamera, IconStar, IconArrowLeft, IconArrowRight, IconChevronRight,
  IconCheck, IconSearch, IconPrint, IconDownload, IconMenu, IconX, IconTrash,
  IconThermometer,
} from "@/components/ui/Icons"

// Mapa de iconos SVG para cada sección del formulario
const SECTION_ICON: Record<string, React.ReactNode> = {
  hospital:       <IconHospital size={18} />,
  droplet:        <IconDroplet size={18} />,
  users:          <IconUsers size={18} />,
  calendar:       <IconCalendar size={18} />,
  "alert-triangle": <IconAlertTriangle size={18} />,
  monitor:        <IconMonitor size={18} />,
  server:         <IconServer size={18} />,
  printer:        <IconPrinter size={18} />,
  cpu:            <IconCpu size={18} />,
  tag:            <IconTag size={18} />,
  "alert-circle": <IconAlertCircle size={18} />,
  lock:           <IconLock size={18} />,
  award:          <IconAward size={18} />,
  "pen-line":     <IconPenLine size={18} />,
  briefcase:      <IconBriefcase size={18} />,
  thermometer:    <IconThermometer size={18} />,
}

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

interface ProyectoItem { id: string; titulo: string; estado: string; fases: { estado: string }[] }
interface ContactoItem { id: string; nombre: string; cargo: string | null }

interface VisitaData {
  id: string; titulo?: string | null; estado: string; tipo: string; fecha: string; editadoEn?: string
  proyectoId?: string | null
  proyecto?: ProyectoItem | null
  contactoPrincipalId?: string | null
  contactoPrincipal?: ContactoItem | null
  datos: Record<string, unknown>
  hospital: { id: string; nombre: string; ciudad: string; provincia?: string | null }
  usuario: { id: string; nombre: string }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Evalúa si un campo debe mostrarse dado el estado actual del formulario
function shouldShowField(field: FormField, datos: Record<string, unknown>): boolean {
  if (!field.showIf) return true
  const val = datos[field.showIf.field]
  return field.showIf.values.includes(val as string)
}

// Valida un campo requerido y devuelve el mensaje de error (o "")
function validateField(field: FormField, value: unknown): string {
  if (!field.req) return ""
  if (Array.isArray(value) && value.length === 0) return "Este campo es obligatorio"
  if (typeof value === "number" && value === 0) return "Este campo es obligatorio"
  if (!value) return "Este campo es obligatorio"
  return ""
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
          <span className="text-gray-400"><IconCamera size={14} /></span> Fotos de esta sección
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
              <><IconCamera size={13} /> Añadir foto</>
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
          className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-teal-100 hover:border-teal-300 transition-colors group"
        >
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 group-hover:bg-teal-50 transition-colors mb-2">
            <IconCamera size={20} className="text-gray-400 group-hover:text-teal-500 transition-colors" />
          </span>
          <p className="text-xs font-medium text-gray-500">Añadir fotos de esta sección</p>
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
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/90 border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                >
                  <IconTrash size={12} />
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
              className="aspect-video border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center hover:border-teal-300 hover:bg-teal-50 transition-colors group"
            >
              <IconCamera size={20} className="text-gray-300 group-hover:text-teal-400 transition-colors" />
              <span className="text-xs text-gray-300 mt-1.5 group-hover:text-teal-400 transition-colors">Añadir</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Radio pills ───────────────────────────────────────────────────────────────
function RadioPills({ field, value, onChange, onBlur, readOnly }: {
  field: FormField; value: unknown; onChange: (v: unknown) => void
  onBlur?: () => void; readOnly: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2" onBlur={onBlur}>
      {field.opts?.map(o => {
        const active = value === o
        return (
          <button key={o} type="button" disabled={readOnly}
            onClick={() => { if (!readOnly) { onChange(active ? "" : o); onBlur?.() } }}
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
function CheckPills({ field, value, onChange, onBlur, readOnly }: {
  field: FormField; value: unknown; onChange: (v: unknown) => void
  onBlur?: () => void; readOnly: boolean
}) {
  const arr = (value as string[] | undefined) ?? []
  return (
    <div className="flex flex-wrap gap-2">
      {field.opts?.map(o => {
        const active = arr.includes(o)
        return (
          <button key={o} type="button" disabled={readOnly}
            onClick={() => {
              if (!readOnly) { onChange(active ? arr.filter(x => x !== o) : [...arr, o]); onBlur?.() }
            }}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border transition-all min-h-[44px] text-left disabled:cursor-default"
            style={active ? { backgroundColor: TEAL, color: "#fff", borderColor: TEAL }
              : { backgroundColor: "#fff", color: "#374151", borderColor: "#e5e7eb" }}
          >
            {active && <IconCheck size={13} className="shrink-0" />}
            {o}
          </button>
        )
      })}
    </div>
  )
}

// ─── Rating ────────────────────────────────────────────────────────────────────
function RatingField({ value, onChange, onBlur, readOnly }: {
  value: unknown; onChange: (v: unknown) => void; onBlur?: () => void; readOnly: boolean
}) {
  const v = (value as number | undefined) ?? 0
  const [hover, setHover] = useState(0)
  const labels = ["", "Muy bajo", "Bajo", "Medio", "Alto", "Muy alto"]
  const active = hover || v
  return (
    <div>
      <div className="flex gap-1.5">
        {[1,2,3,4,5].map(n => (
          <button key={n} type="button" disabled={readOnly}
            onClick={() => { if (!readOnly) { onChange(v === n ? 0 : n); onBlur?.() } }}
            onMouseEnter={() => !readOnly && setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110 disabled:cursor-default min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ color: n <= active ? "#F59E0B" : "#e5e7eb" }}
          >
            <IconStar size={28} filled={n <= active} />
          </button>
        ))}
      </div>
      {v > 0 && (
        <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
          <span className="font-semibold text-amber-500">{v}/5</span> — {labels[v]}
        </p>
      )}
    </div>
  )
}

// ─── Campo genérico ────────────────────────────────────────────────────────────
function CampoField({ field, value, onChange, onBlur, error, readOnly }: {
  field: FormField; value: unknown; onChange: (v: unknown) => void
  onBlur?: () => void; error?: string; readOnly: boolean
}) {
  const base = [
    "w-full border rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent",
    "disabled:bg-gray-50 disabled:text-gray-500 bg-white min-h-[44px] transition-colors",
    error ? "border-red-300 focus:ring-red-300" : "border-gray-200 focus:ring-teal-300",
  ].join(" ")

  if (field.type === "radio") return <RadioPills field={field} value={value} onChange={onChange} onBlur={onBlur} readOnly={readOnly} />
  if (field.type === "checks") return <CheckPills field={field} value={value} onChange={onChange} onBlur={onBlur} readOnly={readOnly} />
  if (field.type === "rating") return <RatingField value={value} onChange={onChange} onBlur={onBlur} readOnly={readOnly} />
  if (field.type === "textarea") return (
    <textarea value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} onBlur={onBlur}
      placeholder={field.ph} disabled={readOnly} rows={4} className={`${base} resize-none`} />
  )
  if (field.type === "select") return (
    <select value={(value as string) ?? ""} onChange={e => { onChange(e.target.value); onBlur?.() }} disabled={readOnly} className={base}>
      <option value="">— Seleccionar —</option>
      {field.opts?.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
  return (
    <input type={field.type} value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} onBlur={onBlur}
      placeholder={field.ph} disabled={readOnly} className={base} />
  )
}

// ─── Progreso ──────────────────────────────────────────────────────────────────
function calcProgress(section: FormSection, datos: Record<string, unknown>): number {
  // Solo contar campos visibles (respetando showIf), excluir subheaders
  const visibleFields = section.fields.filter(f => f.type !== 'subheader' && shouldShowField(f, datos))
  const reqFields = visibleFields.filter(f => f.req)
  const toCheck = reqFields.length > 0 ? reqFields : visibleFields
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
        data: f.data,
      })),
    })),
    pendientes: ((datos.todos as TodoItem[]) ?? []).map(t => ({
      texto: t.text,
      hecho: t.done,
    })),
    notasDeVoz: ((datos.audioNotas as AudioNota[]) ?? []).map(n => ({
      duracion: n.duration,
      transcripcion: n.transcripcion ?? null,
      creado: new Date(n.createdAt).toISOString(),
      audio: n.blob,
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

// ─── Icono de guardado estilo Google Docs ─────────────────────────────────────
function SaveIndicator({ saving, pendiente, savedAt, error }: {
  saving: boolean; pendiente: boolean; savedAt: Date | null; error: boolean
}) {
  const [, tick] = useState(0)

  // Re-renderiza cada 15s para actualizar el tiempo relativo
  useEffect(() => {
    if (!savedAt) return
    const t = setInterval(() => tick(n => n + 1), 15_000)
    return () => clearInterval(t)
  }, [savedAt])

  function tiempoRelativo() {
    if (!savedAt) return ""
    const s = Math.round((Date.now() - savedAt.getTime()) / 1000)
    if (s < 5)  return "ahora mismo"
    if (s < 60) return `hace ${s}s`
    const m = Math.round(s / 60)
    return m === 1 ? "hace 1 min" : `hace ${m} min`
  }

  if (saving) return (
    <span className="flex items-center gap-1.5 text-gray-400">
      <span className="w-3 h-3 border border-gray-300 border-t-gray-500 rounded-full animate-spin inline-block" />
      <span className="hidden sm:inline">Guardando</span>
    </span>
  )
  if (error) return (
    <span className="flex items-center gap-1 text-red-500 font-medium">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span className="hidden sm:inline">Error al guardar</span>
      <span className="sm:hidden">Error</span>
    </span>
  )
  if (pendiente) return <span className="text-amber-500 font-medium">Sin guardar</span>
  if (savedAt) return (
    <span className="flex items-center gap-1 text-green-500 font-medium">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <span className="hidden sm:inline">Guardado {tiempoRelativo()}</span>
      <span className="sm:hidden">Guardado</span>
    </span>
  )
  return <span className="text-gray-300">Sin cambios</span>
}

// ─── Navegación lateral de secciones ─────────────────────────────────────────
function SectionNav({ sections, datos, openSection, onSelect, fotosMap }: {
  sections: FormSection[]
  datos: Record<string, unknown>
  openSection: string
  onSelect: (id: string) => void
  fotosMap: FotosMap
}) {
  return (
    <nav className="space-y-0.5">
      {sections.map((s, i) => {
        const pct = calcProgress(s, datos)
        const isActive = openSection === s.id
        const nFotos = (fotosMap[s.id] ?? []).length
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all text-sm"
            style={isActive
              ? { backgroundColor: "#E6F7F6", color: TEAL_DARK }
              : { color: "#6b7280" }}
          >
            {/* Mini progress ring */}
            <span className="shrink-0 relative w-5 h-5">
              <svg width="20" height="20" viewBox="0 0 20 20" className="rotate-[-90deg]">
                <circle cx="10" cy="10" r="8" fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
                <circle cx="10" cy="10" r="8" fill="none"
                  stroke={pct === 100 ? "#10b981" : isActive ? TEAL : "#d1d5db"}
                  strokeWidth="2.5"
                  strokeDasharray={`${(pct / 100) * 50.27} 50.27`}
                  strokeLinecap="round"
                />
              </svg>
              {pct === 100 && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
              )}
            </span>
            <span className="flex-1 min-w-0 truncate font-medium text-xs leading-tight">
              <span className="mr-1 opacity-60">{i + 1}.</span>
              {s.title}
            </span>
            {nFotos > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-gray-300 shrink-0">
                <IconCamera size={11} />{nFotos}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}

// ─── Vista Resumen ────────────────────────────────────────────────────────────
function fmtResumenValue(type: string, value: unknown): string {
  if (value === undefined || value === null || value === "") return ""
  if (Array.isArray(value)) return value.join(", ")
  if (type === "rating") return `${value}/5 ★`
  if (type === "date") {
    try { return new Date(value as string).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) }
    catch { return String(value) }
  }
  const s = String(value)
  return s.length > 90 ? s.slice(0, 90) + "…" : s
}

// ─── Inline Field Editor ──────────────────────────────────────────────────────
function InlineFieldEditor({ field, value, onChange }: {
  field: FormField
  value: unknown
  onChange: (v: unknown) => void
}) {
  const base = "text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 bg-gray-50 transition-colors"
  const ringStyle = { "--tw-ring-color": TEAL } as React.CSSProperties

  if (field.type === "subheader") {
    return (
      <div className="flex items-center gap-2 mt-1 mb-0.5 col-span-full">
        <span className="text-[9px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: TEAL }}>
          {field.label}
        </span>
        <div className="flex-1 h-px bg-teal-100" />
      </div>
    )
  }

  if (field.type === "radio" && field.opts) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {field.opts.map(opt => (
          <button key={opt} type="button"
            onClick={() => onChange(value === opt ? "" : opt)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              value === opt ? "text-white font-medium border-transparent" : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
            }`}
            style={value === opt ? { backgroundColor: TEAL, borderColor: TEAL } : {}}
          >{opt}</button>
        ))}
      </div>
    )
  }

  if (field.type === "checks" && field.opts) {
    const arr = Array.isArray(value) ? (value as string[]) : []
    return (
      <div className="flex flex-wrap gap-1.5">
        {field.opts.map(opt => {
          const on = arr.includes(opt)
          return (
            <button key={opt} type="button"
              onClick={() => onChange(on ? arr.filter((x: string) => x !== opt) : [...arr, opt])}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                on ? "text-white font-medium border-transparent" : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
              }`}
              style={on ? { backgroundColor: TEAL, borderColor: TEAL } : {}}
            >{opt}</button>
          )
        })}
      </div>
    )
  }

  if (field.type === "select" && field.opts) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {field.opts.map(opt => (
          <button key={opt} type="button"
            onClick={() => onChange(value === opt ? "" : opt)}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
              value === opt ? "text-white font-medium border-transparent" : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
            }`}
            style={value === opt ? { backgroundColor: TEAL, borderColor: TEAL } : {}}
          >{opt}</button>
        ))}
      </div>
    )
  }

  if (field.type === "rating") {
    const num = typeof value === "number" ? value : 0
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button key={star} type="button"
            onClick={() => onChange(star === num ? 0 : star)}
            className="w-6 h-6 flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            <svg width="16" height="16" viewBox="0 0 24 24"
              fill={star <= num ? "#fbbf24" : "none"} stroke={star <= num ? "#fbbf24" : "#d1d5db"} strokeWidth="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
        ))}
      </div>
    )
  }

  if (field.type === "textarea") {
    return (
      <textarea className={`${base} resize-none`} style={ringStyle} rows={3}
        value={typeof value === "string" ? value : ""}
        placeholder={field.ph ?? ""}
        onChange={e => onChange(e.target.value)}
      />
    )
  }

  const inputType = field.type === "number" ? "number"
    : field.type === "date" ? "date" : field.type === "month" ? "month"
    : field.type === "time" ? "time" : field.type === "email" ? "email"
    : field.type === "tel" ? "tel" : "text"

  return (
    <input type={inputType} className={base} style={ringStyle}
      value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
      placeholder={field.ph ?? ""}
      onChange={e => onChange(field.type === "number"
        ? (e.target.value === "" ? "" : Number(e.target.value))
        : e.target.value)}
    />
  )
}

function VistaResumen({
  visita, datos, sections, fotosMap, score, scoreColor, scoreLabel,
  completadas, progreso, onClose, onGoToSection, onSetField,
}: {
  visita: VisitaData
  datos: Record<string, unknown>
  sections: FormSection[]
  fotosMap: FotosMap
  score: number; scoreColor: string; scoreLabel: string
  completadas: number; progreso: number
  onClose: () => void
  onGoToSection: (id: string) => void
  onSetField: (fieldId: string, value: unknown) => void
}) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const totalFotos = Object.values(fotosMap).reduce((a, b) => a + b.length, 0)
  const todos = (datos.todos as TodoItem[]) ?? []
  const todosHechos = todos.filter(t => t.done).length
  const allFotosSample = sections
    .flatMap(s => (fotosMap[s.id] ?? []).map(f => ({ ...f, seccion: s.title })))
    .slice(0, 12)

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors min-h-[36px] px-1"
          >
            <IconArrowLeft size={15} /> Volver al formulario
          </button>
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-sm font-semibold text-gray-800 truncate hidden sm:block">{visita.hospital.nombre}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${ESTADO_COLOR[visita.estado]}`}>
            {ESTADO_LABEL[visita.estado]}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-16">

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Completado",    value: `${progreso}%`,           color: progreso === 100 ? "#10b981" : TEAL },
            { label: "Secciones",     value: `${completadas}/${sections.length}`, color: "#374151" },
            { label: "Fotos",         value: String(totalFotos),        color: "#374151" },
            { label: scoreLabel + " complejidad", value: String(score), color: scoreColor },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 text-center shadow-sm">
              <div className="text-2xl font-bold tabular-nums leading-none mb-1" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-xs text-gray-400">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Progreso global */}
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span className="font-medium">Progreso global</span>
            <span className="tabular-nums">{progreso}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progreso}%`, backgroundColor: progreso === 100 ? "#10b981" : TEAL }} />
          </div>
          <div className="flex gap-1 mt-2.5">
            {sections.map(s => {
              const pct = calcProgress(s, datos)
              return (
                <button
                  key={s.id}
                  onClick={() => { onClose(); setTimeout(() => onGoToSection(s.id), 50) }}
                  title={`${s.title} — ${pct}%`}
                  className="flex-1 h-1.5 rounded-full transition-colors hover:opacity-70"
                  style={{ backgroundColor: pct === 100 ? "#10b981" : pct > 0 ? `${TEAL}80` : "#e5e7eb" }}
                />
              )
            })}
          </div>
        </div>

        {/* Grid de secciones */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          {sections.map((section, i) => {
            const pct = calcProgress(section, datos)
            const nFotos = (fotosMap[section.id] ?? []).length
            const filledFields = section.fields
              .filter(f => shouldShowField(f, datos) && fmtResumenValue(f.type, datos[f.id]))
              .map(f => ({ label: f.label, value: fmtResumenValue(f.type, datos[f.id]) }))

            return (
              <div key={section.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
                {/* Header tarjeta — click para editar inline */}
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                  className="flex items-center gap-2.5 px-3.5 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors w-full text-left"
                >
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    pct === 100 ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
                  }`}>
                    {SECTION_ICON[section.icon] ?? <IconClipboard size={14} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">
                      <span className="text-gray-300 mr-1 font-normal">{i + 1}.</span>{section.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {nFotos > 0 && (
                      <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                        <IconCamera size={10} />{nFotos}
                      </span>
                    )}
                    <span className={`text-xs font-bold tabular-nums ${pct === 100 ? "text-green-500" : pct > 0 ? "text-amber-500" : "text-gray-300"}`}>
                      {pct}%
                    </span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      className="text-gray-300 shrink-0 transition-transform duration-200"
                      style={{ transform: expandedSection === section.id ? "rotate(180deg)" : "rotate(0deg)" }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </button>

                {/* Campos rellenos — vista resumida */}
                {expandedSection !== section.id && (
                  <div className="px-3.5 py-3 flex-1 space-y-1.5">
                    {filledFields.length > 0 ? (
                      <>
                        {filledFields.slice(0, 5).map(f => (
                          <div key={f.label} className="flex gap-2 text-xs leading-tight">
                            <span className="text-gray-400 shrink-0 truncate" style={{ maxWidth: "45%" }}>{f.label}</span>
                            <span className="text-gray-700 font-medium flex-1 min-w-0 truncate">{f.value}</span>
                          </div>
                        ))}
                        {filledFields.length > 5 && (
                          <p className="text-xs text-gray-300 pt-0.5">+{filledFields.length - 5} campos más</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-gray-300 italic">Sin datos aún</p>
                    )}
                  </div>
                )}

                {/* Formulario inline — edición rápida */}
                {expandedSection === section.id && (
                  <div className="px-3.5 py-3 flex-1 space-y-3 max-h-80 overflow-y-auto">
                    {section.fields
                      .filter(f => shouldShowField(f, datos))
                      .map(field => {
                        if (field.type === 'subheader') {
                          return <InlineFieldEditor key={field.id} field={field} value={undefined} onChange={() => {}} />
                        }
                        return (
                          <div key={field.id}>
                            <label className="text-[11px] font-medium text-gray-500 mb-1 block">
                              {field.label}{field.req && <span className="text-red-400 ml-0.5">*</span>}
                            </label>
                            <InlineFieldEditor
                              field={field}
                              value={datos[field.id]}
                              onChange={v => onSetField(field.id, v)}
                            />
                          </div>
                        )
                      })}
                  </div>
                )}

                {/* Footer tarjeta */}
                <button
                  onClick={() => { onClose(); setTimeout(() => onGoToSection(section.id), 50) }}
                  className="flex items-center gap-1 px-3.5 py-2 text-xs border-t border-gray-50 text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                >
                  <IconArrowRight size={11} /> Ir a esta sección
                </button>
              </div>
            )
          })}
        </div>

        {/* Pendientes */}
        {todos.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              </span>
              <p className="text-xs font-semibold text-gray-700">Pendientes</p>
              <span className="ml-auto text-xs text-gray-400">{todosHechos}/{todos.length} hechos</span>
            </div>
            <div className="space-y-1.5">
              {todos.map(t => (
                <div key={t.id} className="flex items-center gap-2 text-xs">
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    t.done ? "bg-green-500 border-green-500" : "border-gray-300"
                  }`}>
                    {t.done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                  </span>
                  <span className={t.done ? "line-through text-gray-300" : "text-gray-700"}>{t.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Galería */}
        {totalFotos > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                <IconCamera size={13} />
              </span>
              <p className="text-xs font-semibold text-gray-700">Galería de fotos</p>
              <span className="ml-auto text-xs text-gray-400">{totalFotos} fotos</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {allFotosSample.map(foto => (
                <div key={foto.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={foto.data} alt={foto.caption || foto.name} className="w-full h-full object-cover" />
                  {foto.caption && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                      <p className="text-white text-[9px] leading-tight line-clamp-2">{foto.caption}</p>
                    </div>
                  )}
                </div>
              ))}
              {totalFotos > 12 && (
                <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400 font-medium">
                  +{totalFotos - 12}
                </div>
              )}
            </div>
          </div>
        )}
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [navOpen, setNavOpen] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [proyectos, setProyectos] = useState<ProyectoItem[]>([])
  const [vinculandoPP, setVinculandoPP] = useState(false)
  const [contactos, setContactos] = useState<ContactoItem[]>([])
  const [vinculandoContacto, setVinculandoContacto] = useState(false)
  const [userRol, setUserRol] = useState("")
  const [userId, setUserId] = useState("")
  const [userName, setUserName] = useState("")
  const [mostrarGuardarPlantilla, setMostrarGuardarPlantilla] = useState(false)
  const [nombrePlantilla, setNombrePlantilla] = useState("")
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false)
  const [showGaleria, setShowGaleria] = useState(false)

  const [sectionToast, setSectionToast] = useState<string | null>(null)
  const [vistaResumen, setVistaResumen] = useState(false)

  const datosRef = useRef<Record<string, unknown>>({})
  const visitaRef = useRef<VisitaData | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevCompletadasRef = useRef(0)
  const headerRef = useRef<HTMLDivElement>(null)

  const handleSyncSuccess = useCallback(() => {
    setSavedAt(new Date()); setPendiente(false)
  }, [])

  const { online, loadDraft, syncToServer } = useOfflineSync({
    visitaId: id,
    hospitalNombre: visitaRef.current?.hospital.nombre ?? "",
    datos,
    onSyncSuccess: handleSyncSuccess,
  })

  const tipo = (visita?.tipo ?? "PROYECTOS") as "PROYECTOS" | "VENTAS"
  const sections = useMemo(() => getSections(tipo), [tipo])

  useEffect(() => {
    fetch(`/api/visitas/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(async data => {
        if (data) {
          setVisita(data); visitaRef.current = data
          const d = typeof data.datos === "object" && data.datos !== null ? (data.datos as Record<string, unknown>) : {}
          const localDraft = await loadDraft()
          const resolved = localDraft && Object.keys(localDraft).length > Object.keys(d).length ? localDraft : d
          setDatos(resolved); datosRef.current = resolved
          // Cargar proyectos, contactos y rol usuario
          fetch(`/api/proyectos?hospitalId=${data.hospital.id}`)
            .then(r => r.ok ? r.json() : [])
            .then(pps => { if (Array.isArray(pps)) setProyectos(pps.map((p: { id: string; titulo: string; estado: string; fases: { estado: string }[] }) => ({ id: p.id, titulo: p.titulo, estado: p.estado, fases: p.fases ?? [] }))) })
            .catch(() => {})
          fetch(`/api/hospitales/${data.hospital.id}/contactos`)
            .then(r => r.ok ? r.json() : [])
            .then(cs => { if (Array.isArray(cs)) setContactos(cs.map((c: { id: string; nombre: string; cargo: string | null }) => ({ id: c.id, nombre: c.nombre, cargo: c.cargo }))) })
            .catch(() => {})
          fetch("/api/perfil")
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.rol) setUserRol(d.rol); if (d?.id) setUserId(d.id); if (d?.nombre) setUserName(d.nombre) })
            .catch(() => {})
        }
        setLoading(false)
      })
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // ── Edición colaborativa — polling cada 4s ──────────────────────────────────
  const lastEditadoRef = useRef<string>("")
  const [colabUsers, setColabUsers] = useState<string[]>([])
  const [colabToast, setColabToast] = useState<string | null>(null)

  useEffect(() => {
    if (!visita) return
    lastEditadoRef.current = visita.editadoEn ?? ""
  }, [visita?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!visita || !online) return
    const pollInterval = setInterval(async () => {
      if (saving) return
      try {
        const r = await fetch(`/api/visitas/${id}?fields=datos,editadoEn,usuario`, { signal: AbortSignal.timeout(5000) })
        if (!r.ok) return
        const remote = await r.json()
        const remoteEditado = remote.editadoEn ?? ""
        if (remoteEditado && remoteEditado > lastEditadoRef.current && !pendiente) {
          const remoteDatos = typeof remote.datos === "object" && remote.datos !== null ? (remote.datos as Record<string, unknown>) : {}
          const remoteUser = remote.usuario?.nombre ?? "Otro usuario"
          if (remoteUser !== userName && userName) {
            setColabToast(`${remoteUser} ha actualizado el formulario`)
            setTimeout(() => setColabToast(null), 4000)
          }
          setDatos(remoteDatos); datosRef.current = remoteDatos
          lastEditadoRef.current = remoteEditado
        }
        if (remote._activeUsers && Array.isArray(remote._activeUsers)) {
          setColabUsers(remote._activeUsers.filter((n: string) => n !== userName))
        }
      } catch { /* timeout or network error — skip */ }
    }, 4000)
    return () => clearInterval(pollInterval)
  }, [visita?.id, online, saving, pendiente, id, userName]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Ocultar header al hacer scroll abajo, mostrar al subir ──────────────────
  useEffect(() => {
    const main = document.getElementById("main-content")
    if (!main) return
    let lastY = 0
    let ticking = false
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = (main as HTMLElement).scrollTop
        const header = headerRef.current
        if (header) {
          if (y > lastY && y > 60) {
            // Bajando — ocultar
            header.style.transform = "translateY(-110%)"
            header.style.opacity = "0"
            header.style.pointerEvents = "none"
          } else {
            // Subiendo o en la cima — mostrar
            header.style.transform = "translateY(0)"
            header.style.opacity = "1"
            header.style.pointerEvents = ""
          }
        }
        lastY = y <= 0 ? 0 : y
        ticking = false
      })
    }
    main.addEventListener("scroll", onScroll, { passive: true })
    return () => main.removeEventListener("scroll", onScroll)
  }, [])

  const guardar = useCallback(async (nuevoEstado?: string) => {
    if (!visitaRef.current) return
    const body: Record<string, unknown> = { datos: datosRef.current }
    if (nuevoEstado) body.estado = nuevoEstado
    if (!online) { await syncToServer(body); return }
    setSaving(true)
    setSaveError(false)
    try {
      const r = await fetch(`/api/visitas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      })
      if (r.ok) {
        const updated = await r.json()
        setVisita(v => { const next = v ? { ...v, estado: updated.estado, editadoEn: updated.editadoEn } : v; visitaRef.current = next; return next })
        if (updated.editadoEn) lastEditadoRef.current = updated.editadoEn
        setSavedAt(new Date()); setPendiente(false)
      } else {
        setSaveError(true)
      }
    } catch {
      setSaveError(true)
    } finally { setSaving(false) }
  }, [id, online, syncToServer])

  const guardarRef = useRef(guardar)
  useEffect(() => { guardarRef.current = guardar }, [guardar])

  function setField(fieldId: string, value: unknown) {
    setDatos(prev => { const next = { ...prev, [fieldId]: value }; datosRef.current = next; return next })
    setPendiente(true); setSavedAt(null)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => guardarRef.current(), 2000)
    // Limpiar error cuando el usuario empieza a rellenar
    if (fieldErrors[fieldId]) setFieldErrors(prev => { const n = { ...prev }; delete n[fieldId]; return n })
  }

  // Validación en blur — solo para campos req visibles
  function handleBlur(field: FormField) {
    if (!field.req) return
    const err = validateField(field, datosRef.current[field.id])
    if (err) setFieldErrors(prev => ({ ...prev, [field.id]: err }))
    else setFieldErrors(prev => { const n = { ...prev }; delete n[field.id]; return n })
  }

  const setFotos = useCallback((sectionId: string, fotos: Foto[]) => {
    setDatos(prev => {
      const fotosMap = ((prev.fotos as FotosMap) ?? {})
      const next = { ...prev, fotos: { ...fotosMap, [sectionId]: fotos } }
      datosRef.current = next
      return next
    })
    setPendiente(true); setSavedAt(null)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => guardarRef.current(), 2000)
  }, [])

  function setTodos(todos: TodoItem[]) {
    setDatos(prev => { const next = { ...prev, todos }; datosRef.current = next; return next })
    setPendiente(true); setSavedAt(null)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => guardarRef.current(), 2000)
  }

  function setAudioNotas(audioNotas: AudioNota[]) {
    setDatos(prev => { const next = { ...prev, audioNotas }; datosRef.current = next; return next })
    setPendiente(true); setSavedAt(null)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => guardarRef.current(), 2000)
  }

  function setNotasLibres(notasLibres: string) {
    setDatos(prev => { const next = { ...prev, notasLibres }; datosRef.current = next; return next })
    setPendiente(true); setSavedAt(null)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => guardarRef.current(), 2000)
  }

  const vincularProyecto = useCallback(async (proyectoId: string | null) => {
    if (!visitaRef.current) return
    setVinculandoPP(true)
    try {
      const r = await fetch(`/api/visitas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proyectoId }),
      })
      if (r.ok) {
        const updated = await r.json()
        setVisita(v => v ? { ...v, proyectoId: updated.proyectoId, proyecto: updated.proyecto ?? null } : v)
      }
    } catch { /* silencioso */ } finally {
      setVinculandoPP(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const vincularContacto = useCallback(async (contactoPrincipalId: string | null) => {
    if (!visitaRef.current) return
    setVinculandoContacto(true)
    try {
      const r = await fetch(`/api/visitas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactoPrincipalId }),
      })
      if (r.ok) {
        const updated = await r.json()
        setVisita(v => v ? { ...v, contactoPrincipalId: updated.contactoPrincipalId, contactoPrincipal: updated.contactoPrincipal ?? null } : v)
      }
    } catch { /* silencioso */ } finally {
      setVinculandoContacto(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function guardarComoPlantilla() {
    if (!nombrePlantilla.trim() || !visita) return
    setGuardandoPlantilla(true)
    try {
      const r = await fetch("/api/plantillas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombrePlantilla.trim(),
          tipo: visita.tipo,
          datos: datosRef.current,
        }),
      })
      if (r.ok) {
        setMostrarGuardarPlantilla(false)
        setNombrePlantilla("")
      }
    } finally {
      setGuardandoPlantilla(false)
    }
  }

  const cambiarEstado = useCallback(async (estado: string) => {
    setCambiandoEstado(true); await guardar(estado); setCambiandoEstado(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Navega a sección y hace scroll
  function goToSection(sectionId: string) {
    setOpenSection(sectionId)
    setNavOpen(false)
    setTimeout(() => {
      document.getElementById(`sec-${sectionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 50)
  }

  // Derived values
  const readOnly = visita?.estado === "ARCHIVADA"
  const completadas = sections.filter(s => calcProgress(s, datos) === 100).length
  const progreso = sections.length ? Math.round((completadas / sections.length) * 100) : 0
  const fotosMap = (datos.fotos as FotosMap) ?? {}
  const totalFotos = Object.values(fotosMap).reduce((acc, arr) => acc + arr.length, 0)
  const { score, scoreColor, scoreLabel } = useMemo(
    () => visita ? calcularScore(datos) : { score: 0, scoreColor: "#16a34a", scoreLabel: "Bajo" },
    [datos, visita]
  )

  // Toast cuando una sección recién se completa
  useEffect(() => {
    if (!visita || completadas <= prevCompletadasRef.current) { prevCompletadasRef.current = completadas; return }
    prevCompletadasRef.current = completadas
    const seccion = sections.find(s => calcProgress(s, datos) === 100 && s.id === openSection)
    if (seccion) {
      setSectionToast(seccion.title)
      setTimeout(() => setSectionToast(null), 2200)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completadas])

  // ─ Loading ─
  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: TEAL }} />
    </div>
  )

  // ─ Not found ─
  if (!visita) return (
    <div className="text-center py-24">
      <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 mb-4">
        <IconSearch size={24} className="text-gray-400" />
      </span>
      <p className="text-gray-700 font-semibold">Visita no encontrada</p>
      <p className="text-gray-400 text-sm mt-1">No existe o no tienes acceso a esta visita.</p>
      <button onClick={() => router.back()} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: TEAL }}>
        <IconArrowLeft size={14} /> Volver
      </button>
    </div>
  )

  // ─ Vista de impresión ─
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
              <IconPrint size={15} /> Imprimir / Guardar PDF
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
      {/* ═══════════════════════════════════════════════════════════════════════
          HEADER FIJO — Hospital · Progreso · Acciones
          (sticky top-0 funciona porque globals.css ya no usa transform en pageIn)
      ══════════════════════════════════════════════════════════════════════════ */}
      <div ref={headerRef} className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 mb-5"
        style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid #f0f0f0", boxShadow: "0 1px 8px rgba(0,0,0,0.04)", transition: "transform 220ms ease, opacity 220ms ease" }}>

        {/* ── Fila 1: Contexto + acciones ── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-2 flex items-center gap-3">

          {/* Menú secciones mobile */}
          <button type="button" onClick={() => setNavOpen(o => !o)} title="Ver secciones"
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer lg:hidden">
            <IconMenu size={15} />
          </button>

          {/* Título + Hospital + estado */}
          <div className="flex-1 min-w-0">
            {readOnly ? (
              visita.titulo && <p className="text-[13px] font-semibold text-gray-800 truncate mb-0.5">{visita.titulo}</p>
            ) : (
              <input
                value={visita.titulo ?? ""}
                onChange={e => setVisita(v => v ? { ...v, titulo: e.target.value } : v)}
                onBlur={e => {
                  const val = e.target.value.trim() || null
                  if (val !== (visitaRef.current?.titulo ?? null)) {
                    fetch(`/api/visitas/${visita.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ titulo: val ?? "" }) })
                      .then(r => r.ok ? r.json() : null)
                      .then(d => { if (d) { setVisita(v => v ? { ...v, titulo: d.titulo } : v); if (visitaRef.current) visitaRef.current.titulo = d.titulo } })
                  }
                }}
                placeholder="Nombre de la visita (opcional)"
                className="w-full text-[13px] font-semibold text-gray-800 bg-transparent border-none outline-none placeholder:text-gray-300 placeholder:font-normal truncate mb-0.5 p-0 focus:ring-0"
              />
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-gray-900 truncate max-w-[200px] sm:max-w-xs">
                {visita.hospital.nombre}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                visita.estado === "COMPLETADA" ? "bg-green-50 text-green-700" :
                visita.estado === "ARCHIVADA"  ? "bg-gray-100 text-gray-500"  :
                "bg-amber-50 text-amber-700"
              }`}>
                {visita.estado === "COMPLETADA" ? "Completada" : visita.estado === "ARCHIVADA" ? "Archivada" : "Borrador"}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5 hidden sm:block">
              {visita.hospital.ciudad}
              {visita.tipo === "VENTAS" ? " · Visita comercial" : " · Visita técnica"}
            </p>
          </div>

          {/* Colaboradores activos */}
          {colabUsers.length > 0 && (
            <div className="hidden sm:flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg border border-blue-200 bg-blue-50" title={`Editando también: ${colabUsers.join(", ")}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-medium text-blue-600 max-w-[80px] truncate">{colabUsers[0]}</span>
              {colabUsers.length > 1 && <span className="text-[10px] text-blue-400">+{colabUsers.length - 1}</span>}
            </div>
          )}

          {/* Auto-save */}
          <div className="text-xs shrink-0 hidden sm:block">
            <SaveIndicator saving={saving} pendiente={pendiente} savedAt={savedAt} error={saveError} />
          </div>

          {/* Score */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-xl border cursor-default"
            style={{ borderColor: `${scoreColor}40`, backgroundColor: `${scoreColor}0c` }}
            title={`Complejidad de instalación: ${score}/100`}>
            <span className="text-sm font-bold tabular-nums" style={{ color: scoreColor }}>{score}</span>
            <span className="text-[10px] font-medium" style={{ color: scoreColor, opacity: 0.75 }}>{scoreLabel}</span>
          </div>

          {/* Offline badge */}
          {!online && (
            <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
              Offline
            </span>
          )}

          {/* Botones de acción */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => setVistaResumen(true)} title="Vista resumen 360°"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-[36px]"
              style={vistaResumen
                ? { backgroundColor: `${TEAL}15`, color: TEAL, border: `1px solid ${TEAL}30` }
                : { color: "#6b7280", border: "1px solid #e5e7eb", backgroundColor: "transparent" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <span className="hidden sm:inline">Resumen</span>
            </button>
            {userRol === "ADMIN" && (
              <button onClick={() => { setNombrePlantilla(""); setMostrarGuardarPlantilla(true) }}
                title="Guardar como plantilla"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors cursor-pointer min-h-[36px] border border-gray-200">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                <span className="hidden md:inline">Plantilla</span>
              </button>
            )}
            <button onClick={() => setShowPrint(true)} title="PDF / Imprimir"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors cursor-pointer min-h-[36px] border border-gray-200">
              <IconPrint size={14} />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button onClick={() => exportarJSON(visita, datos, sections)} title="Exportar datos"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors cursor-pointer min-h-[36px] border border-gray-200">
              <IconDownload size={14} />
              <span className="hidden md:inline">Exportar</span>
            </button>
          </div>
        </div>

        {/* ── Fila 2: Progreso ── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-2.5">
          {/* Barra global */}
          <div className="flex items-center gap-3 mb-1.5">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progreso}%`, backgroundColor: progreso === 100 ? "#10b981" : TEAL }} />
            </div>
            <span className="text-[11px] font-semibold tabular-nums shrink-0"
              style={{ color: progreso === 100 ? "#10b981" : "#6b7280" }}>
              {completadas}/{sections.length} secciones
              {progreso === 100 && <span className="ml-1">✓</span>}
            </span>
          </div>
          {/* Mapa de segmentos — cada sección es un botón clickable */}
          <div className="flex gap-[3px]">
            {sections.map((s, i) => {
              const pct = calcProgress(s, datos)
              const isAct = openSection === s.id
              return (
                <button key={s.id} type="button" title={`${i + 1}. ${s.title} — ${pct}%`}
                  onClick={() => goToSection(s.id)}
                  className="flex-1 rounded-full transition-all duration-200 cursor-pointer hover:scale-y-150 origin-bottom"
                  style={{
                    height: isAct ? 5 : 3,
                    backgroundColor: pct === 100 ? "#10b981" : isAct ? TEAL : pct > 0 ? `${TEAL}55` : "#e5e7eb",
                  }} />
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          Overlay de navegación mobile
      ══════════════════════════════════════════════════════════════════════════ */}
      {navOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={() => setNavOpen(false)}
          />
          <div className="fixed top-0 left-0 bottom-0 z-40 w-72 bg-white shadow-xl flex flex-col lg:hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Secciones</p>
              <button onClick={() => setNavOpen(false)} aria-label="Cerrar navegación" className="text-gray-400 hover:text-gray-700 p-1">
                <IconX size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <SectionNav
                sections={sections}
                datos={datos}
                openSection={openSection}
                onSelect={goToSection}
                fotosMap={fotosMap}
              />
            </div>
            {/* Resumen de progreso en el panel */}
            <div className="px-4 py-3 border-t border-gray-100">
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>{completadas} de {sections.length} secciones</span>
                <span>{progreso}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${progreso}%`, backgroundColor: progreso === 100 ? "#10b981" : TEAL }} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          Layout principal: sidebar nav (lg) + contenido
      ══════════════════════════════════════════════════════════════════════════ */}
      <div className="max-w-5xl mx-auto lg:grid lg:grid-cols-[220px_1fr] lg:gap-5 lg:items-start pb-32 lg:pb-8">

        {/* ─── Sidebar navegación desktop ─────────────────────────────────── */}
        <aside className="hidden lg:block sticky top-16">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Secciones</p>
            </div>
            <div className="p-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              <SectionNav
                sections={sections}
                datos={datos}
                openSection={openSection}
                onSelect={goToSection}
                fotosMap={fotosMap}
              />
            </div>
          </div>
        </aside>

        {/* ─── Contenido principal ────────────────────────────────────────── */}
        <div className="min-w-0">

          {/* Context strip */}
          <div className="mb-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-start gap-3">
            <button
              onClick={() => router.back()}
              className="shrink-0 mt-0.5 w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <IconArrowLeft size={16} />
            </button>
            {/* Avatar hospital */}
            <div
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white select-none"
              style={{ backgroundColor: (() => { const c=["#0d9488","#0891b2","#7c3aed","#db2777","#ea580c","#65a30d","#2563eb","#9333ea"]; let h=0; for(let i=0;i<visita.hospital.nombre.length;i++) h=(h*31+visita.hospital.nombre.charCodeAt(i))&0xffff; return c[h%c.length] })() }}
            >
              {visita.hospital.nombre.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-gray-900 leading-tight truncate">{visita.hospital.nombre}</h1>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLOR[visita.estado]}`}>
                  {ESTADO_LABEL[visita.estado]}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {visita.hospital.ciudad}
                </span>
                <span className="opacity-40">·</span>
                <span>{new Date(visita.fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}</span>
                <span className="opacity-40">·</span>
                <span className="capitalize">{tipo.toLowerCase()}</span>
                <span className="opacity-40">·</span>
                <span className="flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  {visita.usuario.nombre}
                </span>
                {totalFotos > 0 && (
                  <><span className="opacity-40">·</span><span className="flex items-center gap-1"><IconCamera size={10} /> {totalFotos} fotos</span></>
                )}
              </p>
            </div>
            {/* Score badge */}
            <div
              className="hidden sm:flex shrink-0 flex-col items-center justify-center w-12 h-12 rounded-xl border-2 cursor-default"
              style={{ color: scoreColor, borderColor: `${scoreColor}60`, backgroundColor: `${scoreColor}10` }}
              title={`Complejidad de instalación: ${score}/100`}
            >
              <span className="text-base font-bold leading-none">{score}</span>
              <span className="text-[9px] font-medium opacity-75 mt-0.5">{scoreLabel}</span>
            </div>
          </div>

          {/* Vincular proyecto (pre-proyecto) */}
          <div className="mb-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00A99D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                </svg>
              </span>
              <span className="text-xs font-semibold text-gray-600">Proyecto</span>
            </div>
            {visita.proyecto ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border min-h-[32px]"
                style={{ backgroundColor: `${TEAL}10`, borderColor: `${TEAL}30`, color: TEAL }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 11l3 3L22 4"/></svg>
                {visita.proyecto.titulo}
                {!readOnly && (
                  <button onClick={() => vincularProyecto(null)} disabled={vinculandoPP}
                    className="ml-1 opacity-50 hover:opacity-100 hover:text-red-500 transition-all"
                    title="Desvincular proyecto">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </span>
            ) : proyectos.length > 0 ? (
              <select
                disabled={readOnly || vinculandoPP}
                onChange={e => e.target.value && vincularProyecto(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-500 bg-white focus:outline-none focus:border-teal-300 disabled:opacity-50 min-h-[32px] flex-1 max-w-xs"
                defaultValue=""
              >
                <option value="">Sin proyecto asociado</option>
                {proyectos.map(pp => {
                  const fasOk = pp.fases.filter(f => f.estado === "COMPLETADA").length
                  return (
                    <option key={pp.id} value={pp.id}>
                      {pp.titulo} — {fasOk}/{pp.fases.length} fases
                    </option>
                  )
                })}
              </select>
            ) : (
              <span className="text-xs text-gray-400 italic">
                {readOnly ? "Sin proyecto asociado" : "No hay proyectos creados para este hospital"}
              </span>
            )}
          </div>

          {/* Vincular contacto principal */}
          {(contactos.length > 0 || visita.contactoPrincipal) && (
            <div className="mb-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 shrink-0">
                <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <span className="text-xs font-semibold text-gray-600">Contacto</span>
              </div>
              {visita.contactoPrincipal ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 min-h-[32px]">
                  {visita.contactoPrincipal.nombre}
                  {visita.contactoPrincipal.cargo && <span className="opacity-60">· {visita.contactoPrincipal.cargo}</span>}
                  {!readOnly && (
                    <button onClick={() => vincularContacto(null)} disabled={vinculandoContacto}
                      className="ml-1 opacity-50 hover:opacity-100 hover:text-red-500 transition-all"
                      title="Desvincular contacto">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </span>
              ) : (
                <select
                  disabled={readOnly || vinculandoContacto}
                  onChange={e => e.target.value && vincularContacto(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-500 bg-white focus:outline-none focus:border-teal-300 disabled:opacity-50 min-h-[32px] flex-1 max-w-xs"
                  defaultValue=""
                >
                  <option value="">Sin contacto principal</option>
                  {contactos.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}{c.cargo ? ` — ${c.cargo}` : ""}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Galería de fotos */}
          {totalFotos > 0 && (
            <div className="mb-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowGaleria(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors min-h-[48px]"
              >
                <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 shrink-0">
                  <IconCamera size={14} className="text-gray-500" />
                </span>
                <span className="text-sm font-semibold text-gray-700 flex-1 text-left">Galería de fotos</span>
                <span className="text-xs text-gray-400 mr-1">{totalFotos}</span>
                <span className="text-gray-400 shrink-0 transition-transform" style={{ transform: showGaleria ? "rotate(90deg)" : "none", display: "inline-flex" }}>
                  <IconChevronRight size={14} />
                </span>
              </button>
              {showGaleria && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  {sections.filter(s => (fotosMap[s.id] ?? []).length > 0).map(s => (
                    <div key={s.id}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{s.title}</p>
                      <div className="flex flex-wrap gap-2">
                        {(fotosMap[s.id] ?? []).map(foto => (
                          <div key={foto.id} className="relative group w-20 h-20 shrink-0">
                            <img
                              src={foto.data}
                              alt={foto.caption || foto.name}
                              className="w-full h-full object-cover rounded-lg border border-gray-200"
                            />
                            {foto.caption && (
                              <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                                <p className="text-white text-[10px] leading-tight line-clamp-3">{foto.caption}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Acordeón secciones */}
          <div className="space-y-2">
            {sections.map((section, idx) => {
              const pct = calcProgress(section, datos)
              const isOpen = openSection === section.id
              const nFotos = (fotosMap[section.id] ?? []).length
              // Campos visibles (respetando showIf)
              const visibleFields = section.fields.filter(f => shouldShowField(f, datos))

              return (
                <div key={section.id} id={`sec-${section.id}`}
                  className="bg-white rounded-2xl overflow-hidden transition-all duration-200"
                  style={{
                    border: isOpen ? `1.5px solid ${TEAL}40` : "1.5px solid #f0f0f0",
                    boxShadow: isOpen ? `0 4px 20px ${TEAL}12, 0 1px 4px rgba(0,0,0,0.04)` : "0 1px 4px rgba(0,0,0,0.04)",
                  }}>
                  <button onClick={() => setOpenSection(isOpen ? "" : section.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50/60 active:bg-gray-100/60 transition-colors min-h-[60px] cursor-pointer">
                    {/* Badge numérico + icono */}
                    <div className="shrink-0 flex flex-col items-center gap-0.5">
                      <span className="text-[9px] font-bold tabular-nums" style={{ color: isOpen ? TEAL : pct === 100 ? "#10b981" : "#d1d5db" }}>{idx + 1}</span>
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
                        pct === 100 ? "bg-green-50 text-green-600" : isOpen ? "text-white" : "bg-gray-100 text-gray-400"
                      }`} style={isOpen && pct < 100 ? { backgroundColor: TEAL } : {}}>
                        {SECTION_ICON[section.icon] ?? <IconClipboard size={18} />}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold" style={{ color: isOpen ? "#111827" : "#374151" }}>{section.title}</p>
                        {pct === 100 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full">
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            Completa
                          </span>
                        )}
                        {nFotos > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                            <IconCamera size={9} /> {nFotos}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="h-1 w-28 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#10b981" : isOpen ? TEAL : `${TEAL}80` }} />
                        </div>
                        <span className="text-[11px] tabular-nums font-medium" style={{ color: pct === 100 ? "#10b981" : "#9ca3af" }}>{pct}%</span>
                      </div>
                    </div>
                    <span className="transition-transform duration-200 shrink-0"
                      style={{ transform: isOpen ? "rotate(90deg)" : "none", color: isOpen ? TEAL : "#d1d5db" }}>
                      <IconChevronRight size={16} />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 px-4 py-5 space-y-6">
                      {visibleFields.map(field => {
                        // Sub-cabecera de bloque — separador visual dentro de la sección
                        if (field.type === 'subheader') {
                          return (
                            <div key={field.id} className="flex items-center gap-3 !mt-8 !mb-0 first:!mt-0">
                              <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: TEAL }}>
                                {field.label}
                              </span>
                              <div className="flex-1 h-px bg-teal-100" />
                            </div>
                          )
                        }
                        const err = fieldErrors[field.id]
                        return (
                          <div key={field.id}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {field.label}
                              {field.req && <span className="text-red-400 ml-1">*</span>}
                            </label>
                            {field.hint && (
                              <p className="text-xs text-gray-400 mb-2.5 flex items-start gap-1.5">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 text-gray-300">
                                  <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                                </svg>
                                {field.hint}
                              </p>
                            )}
                            <CampoField
                              field={field}
                              value={datos[field.id]}
                              onChange={v => setField(field.id, v)}
                              onBlur={() => handleBlur(field)}
                              error={err}
                              readOnly={readOnly}
                            />
                            {/* Error inline */}
                            {err && (
                              <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                                {err}
                              </p>
                            )}
                          </div>
                        )
                      })}

                      {/* Fotos de esta sección */}
                      <FotosSeccion
                        sectionId={section.id}
                        fotos={fotosMap[section.id] ?? []}
                        onChange={fotos => setFotos(section.id, fotos)}
                        readOnly={readOnly}
                      />

                      {/* Navegación anterior / siguiente */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-2">
                        {idx > 0 ? (
                          <button onClick={() => goToSection(sections[idx - 1].id)}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-700 min-h-[44px] px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                            <IconArrowLeft size={14} /> Anterior
                          </button>
                        ) : <span />}
                        {idx < sections.length - 1 ? (
                          <button onClick={() => goToSection(sections[idx + 1].id)}
                            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-xl text-white min-h-[44px] transition-opacity hover:opacity-90 cursor-pointer"
                            style={{ backgroundColor: TEAL }}>
                            Siguiente <IconArrowRight size={14} />
                          </button>
                        ) : !readOnly && visita.estado === "BORRADOR" ? (
                          <button onClick={() => cambiarEstado("COMPLETADA")} disabled={cambiandoEstado}
                            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-xl text-white bg-green-500 min-h-[44px] disabled:opacity-50 hover:bg-green-600 transition-colors cursor-pointer">
                            {cambiandoEstado
                              ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                              : <IconCheck size={14} />}
                            {cambiandoEstado ? "Completando…" : "Completar visita"}
                          </button>
                        ) : <span />}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* TO-DO */}
          <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-5">
              <TodoChecklist
                items={(datos.todos as TodoItem[]) ?? []}
                onChange={setTodos}
                readOnly={readOnly}
              />
            </div>
          </div>

          {/* Notas libres */}
          <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                  <IconPenLine size={14} />
                </span>
                <h3 className="text-sm font-semibold text-gray-700">Notas libres</h3>
              </div>
              <textarea
                value={(datos.notasLibres as string) ?? ""}
                onChange={e => setNotasLibres(e.target.value)}
                disabled={readOnly}
                rows={5}
                placeholder="Escribe aqui cualquier observacion, comentario o informacion adicional de la visita..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 bg-white resize-none placeholder-gray-300"
                style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Notas de voz */}
          <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-5">
              <VoiceNotes
                notas={(datos.audioNotas as AudioNota[]) ?? []}
                onChange={setAudioNotas}
                readOnly={readOnly}
              />
            </div>
          </div>

          {/* Panel de análisis */}
          <div className="mt-4">
            <AnalisisPanel datos={datos} hospitalId={visita.hospital.id} />
          </div>

          {/* Comentarios del equipo */}
          {visita && userId && (
            <div className="mt-4">
              <ComentariosPanel
                endpoint={`/api/visitas/${visita.id}/comentarios`}
                usuarioId={userId}
                esAdmin={userRol === "ADMIN"}
              />
            </div>
          )}

          {readOnly && (
            <div className="mt-4 bg-gray-50 rounded-xl border border-gray-200 px-5 py-4 text-center">
              <p className="text-sm text-gray-400">Esta visita esta archivada.</p>
            </div>
          )}
        </div>
      </div>

      
      {/* Barra sticky mobile (guardar + completar) */}
      {!readOnly && (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
          <div className="bg-white border-t border-gray-200 px-4 py-3 safe-area-bottom">
            <div className="flex gap-2">
              <button onClick={() => guardar()} disabled={saving || !pendiente}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: TEAL }}>
                {saving ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Guardando...</>
                ) : pendiente ? "Guardar cambios" : savedAt ? (
                  <><IconCheck size={14} /> Guardado</>
                ) : "Sin cambios"}
              </button>
              {visita.estado === "BORRADOR" && !pendiente && (
                <button onClick={() => cambiarEstado("COMPLETADA")} disabled={cambiandoEstado}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-green-500 disabled:opacity-50 flex items-center justify-center gap-2">
                  {cambiandoEstado ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <IconCheck size={14} />}
                  {cambiandoEstado ? "Completando..." : "Completar visita"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barra flotante desktop */}
      {!readOnly && (
        <div className="hidden lg:block fixed bottom-6 right-6 z-40">
          <div className="flex items-center gap-2 bg-white rounded-2xl px-3 py-2.5"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.07)" }}>

            {/* Progreso mini */}
            <div className="flex items-center gap-2 pr-2 border-r border-gray-100">
              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progreso}%`, backgroundColor: progreso === 100 ? "#10b981" : TEAL }} />
              </div>
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: progreso === 100 ? "#10b981" : "#9ca3af" }}>
                {progreso}%
              </span>
            </div>

            {!online && (
              <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                Offline
              </span>
            )}

            {/* Guardar */}
            <button onClick={() => guardar()} disabled={saving || !pendiente}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:cursor-default"
              style={{
                backgroundColor: saving ? `${TEAL}20` : pendiente ? TEAL : "#f3f4f6",
                color: saving ? TEAL : pendiente ? "white" : "#9ca3af",
              }}>
              {saving
                ? <><span className="w-3 h-3 border-2 border-current/40 border-t-current rounded-full animate-spin" /> Guardando…</>
                : pendiente
                ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Guardar</>
                : savedAt
                ? <><IconCheck size={13} /> Guardado</>
                : "Sin cambios"}
            </button>

            {/* Completar */}
            {visita.estado === "BORRADOR" && !pendiente && (
              <button onClick={() => cambiarEstado("COMPLETADA")} disabled={cambiandoEstado}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:bg-green-600 disabled:opacity-60 cursor-pointer"
                style={{ backgroundColor: "#10b981" }}>
                {cambiandoEstado
                  ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <IconCheck size={13} />}
                {cambiandoEstado ? "Completando…" : "Completar visita"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Vista resumen overlay */}
      {vistaResumen && (
        <VistaResumen
          visita={visita}
          datos={datos}
          sections={sections}
          fotosMap={fotosMap}
          score={score}
          scoreColor={scoreColor}
          scoreLabel={scoreLabel}
          completadas={completadas}
          progreso={progreso}
          onClose={() => setVistaResumen(false)}
          onGoToSection={goToSection}
          onSetField={setField}
        />
      )}

      {/* Toast sección completada */}
      {sectionToast && (
        <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap">
          <div className="flex items-center gap-2 bg-gray-900/95 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-2xl">
            <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
            <span>«{sectionToast}» completada</span>
          </div>
        </div>
      )}

      {/* Toast colaboración */}
      {colabToast && (
        <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2 bg-blue-600/95 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-2xl">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>{colabToast}</span>
          </div>
        </div>
      )}

      {/* Modal guardar como plantilla */}
      {mostrarGuardarPlantilla && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
                <h2 className="text-base font-bold text-gray-900">Guardar como plantilla</h2>
              </div>
              <button onClick={() => setMostrarGuardarPlantilla(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500">Los datos actuales del formulario se guardarán como plantilla. Los usuarios podrán seleccionarla al crear nuevas visitas.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de la plantilla *</label>
                <input
                  autoFocus
                  value={nombrePlantilla}
                  onChange={e => setNombrePlantilla(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && guardarComoPlantilla()}
                  placeholder="Ej: Implantación BC Robo estándar"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setMostrarGuardarPlantilla(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={guardarComoPlantilla}
                  disabled={guardandoPlantilla || !nombrePlantilla.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
                  style={{ backgroundColor: TEAL }}
                >
                  {guardandoPlantilla ? "Guardando…" : "Guardar plantilla"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
