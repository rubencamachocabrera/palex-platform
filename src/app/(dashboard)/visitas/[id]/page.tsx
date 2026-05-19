"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { getSections } from "@/lib/form-schema"
import type { FormField, FormSection } from "@/lib/form-schema"
import { comprimirImagen } from "@/lib/img-compress"
import { TodoChecklist } from "@/components/visitas/TodoChecklist"
import type { TodoItem } from "@/components/visitas/TodoChecklist"
import { VoiceNotes } from "@/components/visitas/VoiceNotes"
import type { AudioNota } from "@/components/visitas/VoiceNotes"
import { useOfflineSync } from "@/hooks/useOfflineSync"
import { AnalisisPanel } from "@/components/visitas/AnalisisPanel"

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

interface OportunidadItem { id: string; titulo: string; etapa: string }

interface VisitaData {
  id: string; estado: string; tipo: string; fecha: string
  oportunidadId?: string | null
  oportunidad?: OportunidadItem | null
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
  // Solo contar campos visibles (respetando showIf)
  const visibleFields = section.fields.filter(f => shouldShowField(f, datos))
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
  // Errores de validación inline por campo
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  // Panel lateral de navegación (mobile: colapsable)
  const [navOpen, setNavOpen] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [oportunidades, setOportunidades] = useState<OportunidadItem[]>([])
  const [vinculandoOp, setVinculandoOp] = useState(false)

  const datosRef = useRef<Record<string, unknown>>({})
  const visitaRef = useRef<VisitaData | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
          // Cargar oportunidades del hospital para el picker
          fetch(`/api/oportunidades?hospitalId=${data.hospital.id}`)
            .then(r => r.ok ? r.json() : [])
            .then(ops => { if (Array.isArray(ops)) setOportunidades(ops.map((o: { id: string; titulo: string; etapa: string }) => ({ id: o.id, titulo: o.titulo, etapa: o.etapa }))) })
            .catch(() => {})
        }
        setLoading(false)
      })
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

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
        setVisita(v => { const next = v ? { ...v, estado: updated.estado } : v; visitaRef.current = next; return next })
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

  const vincularOportunidad = useCallback(async (oportunidadId: string | null) => {
    if (!visitaRef.current) return
    setVinculandoOp(true)
    try {
      const r = await fetch(`/api/visitas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oportunidadId }),
      })
      if (r.ok) {
        const updated = await r.json()
        setVisita(v => v ? { ...v, oportunidadId: updated.oportunidadId, oportunidad: updated.oportunidad ?? null } : v)
      }
    } catch { /* silencioso */ } finally {
      setVinculandoOp(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

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
          Barra sticky de progreso + indicador de guardado (Google Docs style)
      ══════════════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2.5 mb-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">

          {/* Botón nav lateral — visible siempre pero más prominente en mobile */}
          <button
            type="button"
            onClick={() => setNavOpen(o => !o)}
            title="Navegación de secciones"
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors lg:hidden"
          >
            <IconMenu size={15} />
          </button>

          {/* Barra de progreso */}
          <div className="flex-1 flex items-center gap-2.5">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progreso}%`, backgroundColor: progreso === 100 ? "#10b981" : TEAL }}
              />
            </div>
            <span className="text-xs text-gray-400 tabular-nums shrink-0">
              {completadas}/{sections.length}
            </span>
          </div>

          {/* Indicador de guardado */}
          <div className="text-xs shrink-0">
            <SaveIndicator saving={saving} pendiente={pendiente} savedAt={savedAt} error={saveError} />
          </div>

          {/* Acciones rápidas */}
          <div className="flex items-center gap-1 shrink-0">
            {!online && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                <span className="hidden sm:inline">Offline</span>
              </span>
            )}
            <button onClick={() => setShowPrint(true)} title="Vista previa PDF"
              className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 transition-colors">
              <IconPrint size={14} />
            </button>
            <button onClick={() => exportarJSON(visita, datos, sections)} title="Exportar JSON"
              className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 transition-colors">
              <IconDownload size={14} />
            </button>
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
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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

          {/* Cabecera de la visita */}
          <div className="flex items-start gap-2 mb-4">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
              <IconArrowLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-800 leading-tight truncate">{visita.hospital.nombre}</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {visita.hospital.ciudad} · {new Date(visita.fecha).toLocaleDateString("es-ES")} · {tipo}
                {totalFotos > 0 && <span className="ml-2 inline-flex items-center gap-1">· <IconCamera size={11} /> {totalFotos} fotos</span>}
              </p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${ESTADO_COLOR[visita.estado]}`}>
              {ESTADO_LABEL[visita.estado]}
            </span>
          </div>

          {/* Vincular oportunidad */}
          {(oportunidades.length > 0 || visita.oportunidad) && (
            <div className="mb-4 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 shrink-0">Oportunidad:</span>
              {visita.oportunidad ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {visita.oportunidad.titulo}
                  {!readOnly && (
                    <button
                      onClick={() => vincularOportunidad(null)}
                      disabled={vinculandoOp}
                      className="ml-0.5 text-teal-400 hover:text-red-400 transition-colors"
                      title="Desvincular"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </span>
              ) : (
                <select
                  disabled={readOnly || vinculandoOp}
                  onChange={e => e.target.value && vincularOportunidad(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-500 bg-white focus:outline-none focus:border-teal-300 disabled:opacity-50"
                  defaultValue=""
                >
                  <option value="" disabled>Vincular a oportunidad…</option>
                  {oportunidades.map(op => (
                    <option key={op.id} value={op.id}>{op.titulo}</option>
                  ))}
                </select>
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
                <div key={section.id} id={`sec-${section.id}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button onClick={() => setOpenSection(isOpen ? "" : section.id)}
                    className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[60px]">
                    {/* Icono de sección con fondo de color según estado */}
                    <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      pct === 100 ? "bg-green-50 text-green-600" : isOpen ? "text-white" : "bg-gray-100 text-gray-500"
                    }`} style={isOpen && pct < 100 ? { backgroundColor: TEAL } : {}}>
                      {SECTION_ICON[section.icon] ?? <IconClipboard size={18} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800">{section.title}</p>
                        {pct === 100 && (
                          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                            <IconCheck size={10} /> Completa
                          </span>
                        )}
                        {nFotos > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                            <IconCamera size={10} /> {nFotos}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="h-1 w-24 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#10b981" : TEAL }} />
                        </div>
                        <span className="text-xs text-gray-400 tabular-nums">{pct}%</span>
                      </div>
                    </div>
                    <span className="text-gray-300 transition-transform duration-200 shrink-0"
                      style={{ transform: isOpen ? "rotate(90deg)" : "none" }}>
                      <IconChevronRight size={16} />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 px-4 py-5 space-y-6">
                      {visibleFields.map(field => {
                        const err = fieldErrors[field.id]
                        return (
                          <div key={field.id}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {field.label}
                              {field.req && <span className="text-red-400 ml-1">*</span>}
                            </label>
                            {field.hint && <p className="text-xs text-gray-400 mb-2">{field.hint}</p>}
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
                      <div className="flex justify-between pt-3 border-t border-gray-100">
                        {idx > 0 ? (
                          <button onClick={() => goToSection(sections[idx - 1].id)}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-700 min-h-[44px] px-2 transition-colors">
                            <IconArrowLeft size={14} /> Anterior
                          </button>
                        ) : <span />}
                        {idx < sections.length - 1 ? (
                          <button onClick={() => goToSection(sections[idx + 1].id)}
                            className="inline-flex items-center gap-1.5 text-sm font-medium min-h-[44px] px-2 transition-colors" style={{ color: TEAL }}>
                            Siguiente <IconArrowRight size={14} />
                          </button>
                        ) : !readOnly && visita.estado === "BORRADOR" ? (
                          <button onClick={() => cambiarEstado("COMPLETADA")} disabled={cambiandoEstado}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 disabled:opacity-50 min-h-[44px] px-2">
                            <IconCheck size={14} /> Marcar completa
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
          <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-5">
              <TodoChecklist
                items={(datos.todos as TodoItem[]) ?? []}
                onChange={setTodos}
                readOnly={readOnly}
              />
            </div>
          </div>

          {/* Notas libres */}
          <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
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
          <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
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
            <AnalisisPanel datos={datos} />
          </div>

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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg px-4 py-3 flex items-center gap-3">
            {!online && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                Sin conexion
              </span>
            )}
            <button onClick={() => guardar()} disabled={saving || !pendiente}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: saving || !pendiente ? "#9ca3af" : TEAL }}>
              {saving ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Guardando...</>
              ) : pendiente ? "Guardar" : savedAt ? (
                <><IconCheck size={13} /> Guardado</>
              ) : "Sin cambios"}
            </button>
            {visita.estado === "BORRADOR" && !pendiente && (
              <button onClick={() => cambiarEstado("COMPLETADA")} disabled={cambiandoEstado}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-green-500 disabled:opacity-50 flex items-center gap-2">
                {cambiandoEstado ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <IconCheck size={13} />}
                {cambiandoEstado ? "Completando..." : "Completar"}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
