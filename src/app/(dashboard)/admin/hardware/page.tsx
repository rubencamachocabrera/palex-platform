"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useToast } from "@/components/Toast"
import { TEAL } from "@/lib/brand"

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface HardwareTipo {
  id: string; nombre: string; color: string; orden: number; activo: boolean
  _count?: { catalogos: number }
}

interface CatalogoDoc {
  id: string; nombre: string; tipo: string; tamano: number; creadoEn: string
}

interface CatalogoItem {
  id: string
  tipoId: string | null
  tipo: HardwareTipo | null
  marca: string; modelo: string
  referenciaPalex: string | null
  proveedor: string | null
  descripcion: string | null
  precio: number | null
  garantiaMeses: number | null
  fichaUrl: string | null
  activo: boolean; creadoEn: string
  docsCount?: number
  _stock?: { total: number; disponibles: number; asignados: number; mantenimiento: number }
}

interface UnidadItem {
  id: string; numSerie: string | null; estado: string; notas: string | null
  fechaCompra: string | null; fechaGarantia: string | null
  creadoEn: string
  catalogo: CatalogoItem
  hospital: { id: string; nombre: string; ciudad: string } | null
  proyecto: { id: string; titulo: string } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ESTADO_INFO: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  DISPONIBLE:       { label: "Disponible",     dot: "#16a34a", bg: "#f0fdf4", text: "#15803d" },
  ASIGNADO:         { label: "Asignado",       dot: TEAL,      bg: `${TEAL}18`, text: TEAL },
  EN_MANTENIMIENTO: { label: "Mantenimiento",  dot: "#d97706", bg: "#fef3c7", text: "#b45309" },
  RETIRADO:         { label: "Retirado",       dot: "#6b7280", bg: "#f3f4f6", text: "#4b5563" },
  BAJA:             { label: "Baja",           dot: "#dc2626", bg: "#fef2f2", text: "#b91c1c" },
}

const COLORES_PRESET = [
  "#6366f1","#3b82f6","#06b6d4","#10b981","#f59e0b",
  "#f97316","#ef4444","#8b5cf6","#ec4899","#6b7280",
]

function fmtFecha(s: string) {
  return new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}
function fmtEuros(n: number) {
  return n.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
}
function fmtTamano(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Shared classes ───────────────────────────────────────────────────────────

const INPUT_CLS = "w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 bg-white dark:bg-gray-800 dark:text-gray-200 transition-colors placeholder:text-gray-300 dark:placeholder:text-gray-500"
const ringStyle = { "--tw-ring-color": TEAL } as React.CSSProperties

// ─── Iconos inline ────────────────────────────────────────────────────────────

function IcoX()        { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
function IcoPlus()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function IcoEdit()     { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function IcoTrash()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg> }
function IcoLink()     { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> }
function IcoGear()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> }
function IcoBox()      { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> }
function IcoShield()   { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
function IcoFile()     { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> }
function IcoDownload() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
function IcoUpload()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> }

// ─── Drawer (crear / editar material) ─────────────────────────────────────────

const FORM_EMPTY = {
  tipoId: "", marca: "", modelo: "",
  referenciaPalex: "", proveedor: "",
  precio: "", garantiaMeses: "", fichaUrl: "", descripcion: "",
}

function MaterialDrawer({ tipos, item, onClose, onSaved }: {
  tipos: HardwareTipo[]
  item: CatalogoItem | null
  onClose: () => void
  onSaved: (saved: CatalogoItem) => void
}) {
  const { success, error: toastError } = useToast()
  const [form, setForm] = useState(item ? {
    tipoId: item.tipoId ?? "",
    marca: item.marca,
    modelo: item.modelo,
    referenciaPalex: item.referenciaPalex ?? "",
    proveedor: item.proveedor ?? "",
    precio: item.precio != null ? String(item.precio) : "",
    garantiaMeses: item.garantiaMeses != null ? String(item.garantiaMeses) : "",
    fichaUrl: item.fichaUrl ?? "",
    descripcion: item.descripcion ?? "",
  } : { ...FORM_EMPTY })
  const [guardando, setGuardando] = useState(false)

  // Docs state (only relevant when editing an existing item)
  const [docs, setDocs] = useState<CatalogoDoc[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const cargarDocs = useCallback(async () => {
    if (!item) return
    setLoadingDocs(true)
    const r = await fetch(`/api/hardware/${item.id}/docs`)
    if (r.ok) setDocs(await r.json())
    setLoadingDocs(false)
  }, [item])

  useEffect(() => { if (item) cargarDocs() }, [item, cargarDocs])

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.marca.trim() || !form.modelo.trim()) { toastError("Marca y modelo son obligatorios"); return }
    setGuardando(true)
    try {
      const payload = {
        ...form,
        precio: form.precio || null,
        garantiaMeses: form.garantiaMeses || null,
        tipoId: form.tipoId || null,
        referenciaPalex: form.referenciaPalex || null,
        proveedor: form.proveedor || null,
        fichaUrl: form.fichaUrl || null,
        descripcion: form.descripcion || null,
      }
      const r = item
        ? await fetch(`/api/hardware/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/hardware", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!r.ok) throw new Error()
      const saved = await r.json()
      onSaved(saved)
      success(item ? "Material actualizado" : "Material creado en catálogo")
    } catch {
      toastError("Error al guardar")
    } finally {
      setGuardando(false)
    }
  }

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !item) return
    if (file.size > 20 * 1024 * 1024) { toastError("El archivo no puede superar 20 MB"); return }
    setSubiendo(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(",")[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const r = await fetch(`/api/hardware/${item.id}/docs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: file.name, tipo: file.type || "application/octet-stream", tamano: file.size, contenido: base64 }),
      })
      if (!r.ok) throw new Error()
      const doc = await r.json()
      setDocs(p => [doc, ...p])
      success("Documento añadido")
    } catch {
      toastError("Error al subir el documento")
    } finally {
      setSubiendo(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function eliminarDoc(docId: string) {
    try {
      await fetch(`/api/hardware/docs/${docId}`, { method: "DELETE" })
      setDocs(p => p.filter(d => d.id !== docId))
      success("Documento eliminado")
    } catch {
      toastError("Error al eliminar")
    }
  }

  const tipoSeleccionado = tipos.find(t => t.id === form.tipoId)

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">{item ? "Editar material" : "Nuevo material"}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{item ? `${item.marca} ${item.modelo}` : "Añadir al catálogo"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <IcoX />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Tipo */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tipo de hardware</label>
            <div className="flex flex-wrap gap-2">
              {tipos.map(t => (
                <button key={t.id} type="button"
                  onClick={() => set("tipoId", form.tipoId === t.id ? "" : t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer ${
                    form.tipoId === t.id ? "text-white" : "bg-white text-gray-700 border-gray-200"
                  }`}
                  style={form.tipoId === t.id
                    ? { backgroundColor: t.color, borderColor: t.color }
                    : undefined
                  }>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: form.tipoId === t.id ? "rgba(255,255,255,0.7)" : t.color, display: "inline-block", flexShrink: 0 }} />
                  {t.nombre}
                </button>
              ))}
              {tipos.length === 0 && (
                <p className="text-xs text-gray-400 italic">Sin tipos creados — crea uno en la pestaña Tipos</p>
              )}
            </div>
            {tipoSeleccionado && (
              <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: tipoSeleccionado.color, display: "inline-block" }} />
                Tipo seleccionado: <strong className="text-gray-600">{tipoSeleccionado.nombre}</strong>
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100" />

          {/* Marca + Modelo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Marca <span className="text-red-400">*</span></label>
              <input value={form.marca} onChange={e => set("marca", e.target.value)} placeholder="Zebra, Honeywell…" required className={INPUT_CLS} style={ringStyle} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Modelo <span className="text-red-400">*</span></label>
              <input value={form.modelo} onChange={e => set("modelo", e.target.value)} placeholder="ZD411, TC73…" required className={INPUT_CLS} style={ringStyle} />
            </div>
          </div>

          {/* Referencia Palex */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Referencia interna Palex</label>
            <input value={form.referenciaPalex} onChange={e => set("referenciaPalex", e.target.value)}
              placeholder="Ej: PAL-001234"
              className={`${INPUT_CLS} font-mono`} style={ringStyle} />
            <p className="text-xs text-gray-400 mt-1 flex items-start gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 text-gray-300"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              Código de material en el sistema interno de Palex (SAP/ERP)
            </p>
          </div>

          {/* Proveedor + Precio */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Proveedor</label>
              <input value={form.proveedor} onChange={e => set("proveedor", e.target.value)} placeholder="Nombre del proveedor" className={INPUT_CLS} style={ringStyle} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Precio (€)</label>
              <input type="number" min="0" step="0.01" value={form.precio} onChange={e => set("precio", e.target.value)} placeholder="0.00" className={INPUT_CLS} style={ringStyle} />
            </div>
          </div>

          {/* Garantía */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Garantía del fabricante (meses)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                <IcoShield />
              </span>
              <input type="number" min="0" step="1" value={form.garantiaMeses} onChange={e => set("garantiaMeses", e.target.value)}
                placeholder="24"
                className={`${INPUT_CLS} pl-8`} style={ringStyle} />
            </div>
            <p className="text-xs text-gray-400 mt-1">Meses de garantía estándar del fabricante para este modelo</p>
          </div>

          {/* URL Datasheet */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">URL Datasheet / Ficha técnica</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                <IcoLink />
              </span>
              <input value={form.fichaUrl} onChange={e => set("fichaUrl", e.target.value)}
                placeholder="https://…"
                className={`${INPUT_CLS} pl-8`} style={ringStyle} />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Descripción / Notas</label>
            <textarea value={form.descripcion} onChange={e => set("descripcion", e.target.value)}
              placeholder="Características relevantes, versión de firmware recomendada…"
              rows={3} className={`${INPUT_CLS} resize-none`} style={ringStyle} />
          </div>

          {/* ── Documentos adjuntos (solo edición) ── */}
          {item && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0">Documentos adjuntos</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>

              {loadingDocs ? (
                <div className="space-y-2">
                  <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                </div>
              ) : docs.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-2">Sin documentos — añade fichas técnicas, datasheets o manuales</p>
              ) : (
                <div className="space-y-1.5 mb-2.5">
                  {docs.map(doc => (
                    <div key={doc.id} className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                      <span className="text-gray-300 shrink-0"><IcoFile /></span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{doc.nombre}</p>
                        <p className="text-[10px] text-gray-400">{fmtTamano(doc.tamano)} · {fmtFecha(doc.creadoEn)}</p>
                      </div>
                      <a href={`/api/hardware/docs/${doc.id}`} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                        title="Ver / Descargar">
                        <IcoDownload />
                      </a>
                      <button type="button" onClick={() => eliminarDoc(doc.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                        title="Eliminar documento">
                        <IcoTrash />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label className={`flex items-center gap-2.5 px-4 py-2.5 border border-dashed rounded-xl transition-colors ${subiendo ? "opacity-50 cursor-not-allowed border-gray-200" : "cursor-pointer border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}>
                <span className="text-gray-400"><IcoUpload /></span>
                <span className="text-xs text-gray-500 flex-1">{subiendo ? "Subiendo documento…" : "Añadir documento (PDF, datasheet, manual…)"}</span>
                <input ref={fileInputRef} type="file" className="sr-only"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
                  onChange={handleDocUpload} disabled={subiendo} />
              </label>
              <p className="text-[10px] text-gray-400 mt-1.5">Máx. 20 MB por documento. Formatos: PDF, Office, imágenes.</p>
            </div>
          )}

          {!item && (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100 flex items-start gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 text-gray-300"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              Los documentos adjuntos (fichas técnicas, datasheets…) se pueden añadir después de crear el material.
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0 bg-gray-50">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-white transition-colors cursor-pointer">
            Cancelar
          </button>
          <button onClick={submit} disabled={guardando}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity cursor-pointer"
            style={{ backgroundColor: TEAL }}>
            {guardando ? "Guardando…" : item ? "Guardar cambios" : "Crear material"}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Modal Gestionar Tipos ─────────────────────────────────────────────────────

function TiposModal({ tipos, onClose, onTiposChanged }: {
  tipos: HardwareTipo[]
  onClose: () => void
  onTiposChanged: () => void
}) {
  const { success, error: toastError } = useToast()
  const [nuevoNombre, setNuevoNombre] = useState("")
  const [nuevoColor, setNuevoColor] = useState(COLORES_PRESET[0])
  const [creando, setCreando] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState("")
  const [editColor, setEditColor] = useState("")

  async function crear() {
    if (!nuevoNombre.trim()) return
    setCreando(true)
    try {
      const r = await fetch("/api/hardware/tipos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevoNombre.trim(), color: nuevoColor }),
      })
      if (!r.ok) {
        const d = await r.json()
        throw new Error(d.error)
      }
      setNuevoNombre("")
      onTiposChanged()
      success("Tipo creado")
    } catch (e: unknown) {
      toastError((e as Error).message || "Error al crear")
    } finally {
      setCreando(false)
    }
  }

  async function guardarEdit(id: string) {
    try {
      const r = await fetch(`/api/hardware/tipos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: editNombre, color: editColor }),
      })
      if (!r.ok) throw new Error()
      setEditId(null)
      onTiposChanged()
      success("Tipo actualizado")
    } catch {
      toastError("Error al guardar")
    }
  }

  async function eliminar(id: string) {
    try {
      const r = await fetch(`/api/hardware/tipos/${id}`, { method: "DELETE" })
      if (!r.ok) {
        const d = await r.json()
        throw new Error(d.error)
      }
      onTiposChanged()
      success("Tipo desactivado")
    } catch (e: unknown) {
      toastError((e as Error).message || "Error al eliminar")
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <div>
              <h2 className="text-base font-bold text-gray-900">Tipos de hardware</h2>
              <p className="text-xs text-gray-400 mt-0.5">Categorías disponibles para clasificar materiales</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"><IcoX /></button>
          </div>

          {/* Lista */}
          <div className="overflow-y-auto flex-1 px-5 py-3 space-y-1">
            {tipos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Sin tipos creados aún</p>
            ) : tipos.map(t => (
              <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                {editId === t.id ? (
                  <>
                    <div className="flex gap-1 flex-wrap">
                      {COLORES_PRESET.map(c => (
                        <button key={c} type="button" onClick={() => setEditColor(c)}
                          className="w-5 h-5 rounded-full border-2 transition-all cursor-pointer"
                          style={{ backgroundColor: c, borderColor: editColor === c ? "#374151" : "transparent" }} />
                      ))}
                    </div>
                    <input value={editNombre} onChange={e => setEditNombre(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                      onKeyDown={e => e.key === "Enter" && guardarEdit(t.id)} />
                    <button onClick={() => guardarEdit(t.id)} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-white cursor-pointer" style={{ backgroundColor: TEAL }}>OK</button>
                    <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
                  </>
                ) : (
                  <>
                    <span style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: t.color, flexShrink: 0 }} />
                    <span className="flex-1 text-sm font-medium text-gray-800">{t.nombre}</span>
                    {t._count !== undefined && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                        {t._count.catalogos} item{t._count.catalogos !== 1 ? "s" : ""}
                      </span>
                    )}
                    <button onClick={() => { setEditId(t.id); setEditNombre(t.nombre); setEditColor(t.color) }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                      <IcoEdit />
                    </button>
                    <button onClick={() => eliminar(t.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors cursor-pointer">
                      <IcoTrash />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Crear nuevo tipo */}
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Nuevo tipo</p>
            <div className="flex gap-2 mb-2.5">
              {COLORES_PRESET.map(c => (
                <button key={c} type="button" onClick={() => setNuevoColor(c)}
                  className="w-6 h-6 rounded-full border-2 transition-all cursor-pointer shrink-0"
                  style={{ backgroundColor: c, borderColor: nuevoColor === c ? "#374151" : "transparent" }} />
              ))}
            </div>
            <div className="flex gap-2">
              <input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)}
                placeholder="Nombre del tipo…"
                onKeyDown={e => e.key === "Enter" && !creando && crear()}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
              <button onClick={crear} disabled={creando || !nuevoNombre.trim()}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-opacity cursor-pointer"
                style={{ backgroundColor: TEAL }}>
                {creando ? "…" : "Añadir"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Tarjeta de material ───────────────────────────────────────────────────────

function CatalogoCard({ item, onEditar, onVerUnidades, onDesactivar }: {
  item: CatalogoItem
  onEditar: () => void
  onVerUnidades: () => void
  onDesactivar: () => void
}) {
  const stock = item._stock ?? { total: 0, disponibles: 0, asignados: 0, mantenimiento: 0 }
  const pctDisp = stock.total > 0 ? Math.round((stock.disponibles / stock.total) * 100) : 0

  return (
    <div className={`bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden transition-all hover:shadow-md ${!item.activo ? "opacity-50" : "border-gray-100"}`}>
      {/* Cabecera de tarjeta */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {item.tipo ? (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-white"
              style={{ backgroundColor: item.tipo.color }}>
              {item.tipo.nombre}
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gray-100 text-gray-400">
              Sin tipo
            </span>
          )}
          {!item.activo && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-red-50 text-red-400">
              Inactivo
            </span>
          )}
        </div>
        <div className="flex gap-0.5 shrink-0">
          <button onClick={onEditar} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer" title="Editar">
            <IcoEdit />
          </button>
          <button onClick={onDesactivar} className="p-1.5 rounded-lg hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors cursor-pointer" title={item.activo ? "Desactivar" : "Activar"}>
            <IcoTrash />
          </button>
        </div>
      </div>

      {/* Marca + modelo */}
      <div className="px-4 pb-3">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{item.marca}</p>
        <h3 className="text-lg font-bold text-gray-900 leading-tight mt-0.5">{item.modelo}</h3>
        {item.descripcion && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.descripcion}</p>
        )}
      </div>

      {/* Referencia Palex — destacada */}
      {item.referenciaPalex && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-xl flex items-center gap-2" style={{ backgroundColor: `${TEAL}10` }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: TEAL, flexShrink: 0 }}>
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
          <span className="text-xs font-mono font-bold" style={{ color: TEAL }}>{item.referenciaPalex}</span>
          <span className="text-[10px] text-gray-400 ml-auto">Ref. Palex</span>
        </div>
      )}

      {/* Metadatos */}
      <div className="px-4 pb-3 space-y-1.5">
        {item.proveedor && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 shrink-0"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span className="truncate">{item.proveedor}</span>
          </div>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          {item.precio != null && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 shrink-0"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              <span className="font-semibold text-gray-700">{fmtEuros(item.precio)}</span>
            </div>
          )}
          {item.garantiaMeses != null && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="text-gray-300 shrink-0"><IcoShield /></span>
              <span>{item.garantiaMeses} meses</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {item.fichaUrl && (
            <a href={item.fichaUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:underline"
              style={{ color: TEAL }}>
              <IcoLink /> Datasheet
            </a>
          )}
          {(item.docsCount ?? 0) > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="text-gray-300"><IcoFile /></span>
              {item.docsCount} doc{(item.docsCount ?? 0) !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Divisor */}
      <div className="h-px bg-gray-100 mx-4" />

      {/* Stock */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          <span className="font-medium">{stock.disponibles} disponible{stock.disponibles !== 1 ? "s" : ""}</span>
          <span className="text-gray-400">{stock.total} total</span>
        </div>
        {stock.total > 0 ? (
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pctDisp}%`, backgroundColor: pctDisp === 100 ? "#16a34a" : TEAL }} />
          </div>
        ) : (
          <p className="text-xs text-gray-300 italic">Sin unidades registradas</p>
        )}
        {stock.mantenimiento > 0 && (
          <p className="text-[10px] text-amber-500 mt-1">{stock.mantenimiento} en mantenimiento</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 flex gap-2 mt-auto">
        <button onClick={onVerUnidades}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
          <IcoBox /> Unidades ({stock.total})
        </button>
        <button onClick={onEditar}
          className="flex items-center justify-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-medium transition-colors cursor-pointer"
          style={{ borderColor: TEAL, color: TEAL }}>
          <IcoEdit /> Editar
        </button>
      </div>
    </div>
  )
}

// ─── Modal Unidades ───────────────────────────────────────────────────────────

function UnidadesModal({ item, onClose, onChanged }: {
  item: CatalogoItem
  onClose: () => void
  onChanged: () => void
}) {
  const { success, error: toastError } = useToast()
  const [unidades, setUnidades] = useState<UnidadItem[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ numSerie: "", notas: "", fechaCompra: "", fechaGarantia: "" })
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/hardware/${item.id}`)
    if (r.ok) { const d = await r.json(); setUnidades(d.unidades ?? []) }
    setLoading(false)
  }, [item.id])

  useEffect(() => { cargar() }, [cargar])

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    try {
      const r = await fetch("/api/hardware/unidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogoId: item.id, ...form }),
      })
      if (!r.ok) throw new Error()
      await cargar()
      setForm({ numSerie: "", notas: "", fechaCompra: "", fechaGarantia: "" })
      onChanged()
      success("Unidad añadida")
    } catch {
      toastError("Error al añadir")
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(id: string) {
    try {
      await fetch(`/api/hardware/unidades/${id}`, { method: "DELETE" })
      setUnidades(p => p.filter(u => u.id !== id))
      onChanged()
      success("Unidad eliminada")
    } catch {
      toastError("Error")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
          {item.tipo && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full text-white shrink-0"
              style={{ backgroundColor: item.tipo.color }}>
              {item.tipo.nombre}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900">{item.marca} {item.modelo}</h2>
            {item.referenciaPalex && (
              <span className="text-xs font-mono" style={{ color: TEAL }}>{item.referenciaPalex}</span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer shrink-0"><IcoX /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Form añadir unidad */}
          <form onSubmit={crear} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Registrar nueva unidad</p>
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <input value={form.numSerie} onChange={e => setForm(p => ({ ...p, numSerie: e.target.value }))}
                placeholder="Nº de serie (opcional)"
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
              <input value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                placeholder="Notas"
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Fecha compra</label>
                <input type="date" value={form.fechaCompra} onChange={e => setForm(p => ({ ...p, fechaCompra: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Fecha garantía</label>
                <input type="date" value={form.fechaGarantia} onChange={e => setForm(p => ({ ...p, fechaGarantia: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
              </div>
            </div>
            <button type="submit" disabled={guardando}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: TEAL }}>
              {guardando ? "Añadiendo…" : "Añadir unidad"}
            </button>
          </form>

          {/* Lista unidades */}
          {loading ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : unidades.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin unidades registradas para este modelo</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left pb-2 font-semibold">Nº Serie</th>
                  <th className="text-left pb-2 font-semibold">Estado</th>
                  <th className="text-left pb-2 font-semibold">Asignado a</th>
                  <th className="text-left pb-2 font-semibold">Garantía</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {unidades.map(u => {
                  const est = ESTADO_INFO[u.estado] ?? { label: u.estado, dot: "#6b7280", bg: "#f3f4f6", text: "#4b5563" }
                  return (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-2.5">
                        {u.numSerie
                          ? <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{u.numSerie}</code>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: est.bg, color: est.text }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: est.dot, display: "inline-block" }} />
                          {est.label}
                        </span>
                      </td>
                      <td className="py-2.5 text-xs text-gray-500 max-w-[160px] truncate">
                        {u.hospital?.nombre ?? u.proyecto?.titulo ?? "—"}
                      </td>
                      <td className="py-2.5 text-xs text-gray-400">
                        {u.fechaGarantia ? fmtFecha(u.fechaGarantia) : "—"}
                      </td>
                      <td className="py-2.5 text-right">
                        <button onClick={() => eliminar(u.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors cursor-pointer">
                          <IcoTrash />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Catálogo ─────────────────────────────────────────────────────────────

function CatalogoTab({ tipos, onTiposChanged }: {
  tipos: HardwareTipo[]
  onTiposChanged: () => void
}) {
  const { success, error: toastError } = useToast()
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipoId, setFiltroTipoId] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [drawerItem, setDrawerItem] = useState<CatalogoItem | "new" | null>(null)
  const [unidadesItem, setUnidadesItem] = useState<CatalogoItem | null>(null)
  const [tiposModal, setTiposModal] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const r = await fetch("/api/hardware?activo=false")
    if (r.ok) setCatalogo(await r.json())
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function desactivar(item: CatalogoItem) {
    try {
      await fetch(`/api/hardware/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !item.activo }),
      })
      setCatalogo(p => p.map(c => c.id === item.id ? { ...c, activo: !c.activo } : c))
      success(item.activo ? "Material desactivado" : "Material activado")
    } catch {
      toastError("Error")
    }
  }

  const filtrados = catalogo
    .filter(c => !filtroTipoId || c.tipoId === filtroTipoId)
    .filter(c => !busqueda || [c.marca, c.modelo, c.referenciaPalex, c.proveedor].some(v => v?.toLowerCase().includes(busqueda.toLowerCase())))

  const activos = filtrados.filter(c => c.activo)
  const inactivos = filtrados.filter(c => !c.activo)

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por marca, modelo, referencia…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-white"
            style={ringStyle} />
        </div>
        <button onClick={() => setTiposModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer">
          <IcoGear /> Tipos
        </button>
        <button onClick={() => setDrawerItem("new")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
          style={{ backgroundColor: TEAL }}>
          <IcoPlus /> Nuevo material
        </button>
      </div>

      {/* Filtros por tipo */}
      {tipos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFiltroTipoId("")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer"
            style={!filtroTipoId
              ? { backgroundColor: TEAL, borderColor: TEAL, color: "white" }
              : { backgroundColor: "white", borderColor: "#e5e7eb", color: "#6b7280" }}>
            Todos
            <span className="text-[10px] font-bold">{catalogo.filter(c => c.activo).length}</span>
          </button>
          {tipos.map(t => {
            const count = catalogo.filter(c => c.tipoId === t.id && c.activo).length
            return (
              <button key={t.id} onClick={() => setFiltroTipoId(filtroTipoId === t.id ? "" : t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer"
                style={filtroTipoId === t.id
                  ? { backgroundColor: t.color, borderColor: t.color, color: "white" }
                  : { backgroundColor: "white", borderColor: "#e5e7eb", color: "#6b7280" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: filtroTipoId === t.id ? "rgba(255,255,255,0.7)" : t.color, display: "inline-block" }} />
                {t.nombre}
                <span className="text-[10px] font-bold ml-0.5">{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <IcoBox />
          </div>
          <p className="text-sm font-semibold text-gray-500">Sin materiales en catálogo</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            {busqueda || filtroTipoId ? "Prueba con otros filtros" : "Crea el primer material con el botón Nuevo material"}
          </p>
          {!busqueda && !filtroTipoId && (
            <button onClick={() => setDrawerItem("new")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
              style={{ backgroundColor: TEAL }}>
              <IcoPlus /> Nuevo material
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activos.map(item => (
              <CatalogoCard key={item.id} item={item}
                onEditar={() => setDrawerItem(item)}
                onVerUnidades={() => setUnidadesItem(item)}
                onDesactivar={() => desactivar(item)}
              />
            ))}
          </div>
          {inactivos.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none py-2">
                {inactivos.length} material{inactivos.length !== 1 ? "es" : ""} inactivo{inactivos.length !== 1 ? "s" : ""}
              </summary>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                {inactivos.map(item => (
                  <CatalogoCard key={item.id} item={item}
                    onEditar={() => setDrawerItem(item)}
                    onVerUnidades={() => setUnidadesItem(item)}
                    onDesactivar={() => desactivar(item)}
                  />
                ))}
              </div>
            </details>
          )}
        </>
      )}

      {/* Drawer crear/editar */}
      {drawerItem !== null && (
        <MaterialDrawer
          tipos={tipos}
          item={drawerItem === "new" ? null : drawerItem}
          onClose={() => setDrawerItem(null)}
          onSaved={saved => {
            if (drawerItem === "new") {
              setCatalogo(p => [{ ...saved, _stock: { total: 0, disponibles: 0, asignados: 0, mantenimiento: 0 } }, ...p])
            } else {
              setCatalogo(p => p.map(c => c.id === saved.id ? { ...c, ...saved } : c))
            }
            setDrawerItem(null)
          }}
        />
      )}

      {/* Modal unidades */}
      {unidadesItem && (
        <UnidadesModal item={unidadesItem} onClose={() => setUnidadesItem(null)} onChanged={cargar} />
      )}

      {/* Modal tipos */}
      {tiposModal && (
        <TiposModal tipos={tipos} onClose={() => setTiposModal(false)} onTiposChanged={() => { onTiposChanged(); setTiposModal(false) }} />
      )}
    </div>
  )
}

// ─── Tab: Inventario ──────────────────────────────────────────────────────────

function InventarioTab({ tipos }: { tipos: HardwareTipo[] }) {
  const [unidades, setUnidades] = useState<UnidadItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroTipoId, setFiltroTipoId] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")

  const cargar = useCallback(async () => {
    setLoading(true)
    const r = await fetch("/api/hardware/unidades")
    if (r.ok) setUnidades(await r.json())
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const filtradas = unidades
    .filter(u => !filtroTipoId || u.catalogo.tipoId === filtroTipoId)
    .filter(u => !filtroEstado || u.estado === filtroEstado)
    .filter(u => !busqueda || [u.numSerie, u.catalogo.marca, u.catalogo.modelo, u.catalogo.referenciaPalex, u.hospital?.nombre].some(v => v?.toLowerCase().includes(busqueda.toLowerCase())))

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Nº serie, modelo, hospital…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-white"
            style={ringStyle} />
        </div>
        <select value={filtroTipoId} onChange={e => setFiltroTipoId(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-white text-gray-600"
          style={ringStyle}>
          <option value="">Todos los tipos</option>
          {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-white text-gray-600"
          style={ringStyle}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Contador */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {filtradas.length} unidad{filtradas.length !== 1 ? "es" : ""}
          {(filtroTipoId || filtroEstado || busqueda) && " · filtrado"}
        </p>
        <button onClick={cargar} className="text-xs font-medium hover:underline cursor-pointer" style={{ color: TEAL }}>Actualizar</button>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-14 text-gray-400 text-sm">Sin unidades registradas</div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-gray-400 uppercase tracking-wide border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold">Modelo</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Ref. Palex</th>
                <th className="text-left px-4 py-3 font-semibold">Nº Serie</th>
                <th className="text-left px-4 py-3 font-semibold">Estado</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Asignado a</th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Garantía</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((u, i) => {
                const est = ESTADO_INFO[u.estado] ?? { label: u.estado, dot: "#6b7280", bg: "#f3f4f6", text: "#4b5563" }
                return (
                  <tr key={u.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {u.catalogo.tipo && (
                          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: u.catalogo.tipo.color, flexShrink: 0 }} />
                        )}
                        <div>
                          <p className="font-semibold text-gray-900 text-xs">{u.catalogo.modelo}</p>
                          <p className="text-[10px] text-gray-400">{u.catalogo.marca}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {u.catalogo.referenciaPalex
                        ? <code className="text-xs font-mono" style={{ color: TEAL }}>{u.catalogo.referenciaPalex}</code>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {u.numSerie
                        ? <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{u.numSerie}</code>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: est.bg, color: est.text }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: est.dot, display: "inline-block" }} />
                        {est.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell max-w-[160px] truncate">
                      {u.hospital?.nombre ?? u.proyecto?.titulo ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">
                      {u.fechaGarantia ? fmtFecha(u.fechaGarantia) : "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const TABS = [
  { id: "catalogo",   label: "Catálogo" },
  { id: "inventario", label: "Inventario" },
]

export default function AdminHardwarePage() {
  const [tab, setTab] = useState("catalogo")
  const [tipos, setTipos] = useState<HardwareTipo[]>([])

  const cargarTipos = useCallback(async () => {
    const r = await fetch("/api/hardware/tipos")
    if (r.ok) setTipos(await r.json())
  }, [])

  useEffect(() => { cargarTipos() }, [cargarTipos])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hardware &amp; Materiales</h1>
        <p className="text-sm text-gray-500 mt-0.5">Catálogo de modelos, referencias Palex e inventario de unidades</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
            style={tab === t.id
              ? { backgroundColor: "white", color: TEAL, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
              : { color: "#6b7280" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "catalogo"   && <CatalogoTab tipos={tipos} onTiposChanged={cargarTipos} />}
      {tab === "inventario" && <InventarioTab tipos={tipos} />}
    </div>
  )
}
