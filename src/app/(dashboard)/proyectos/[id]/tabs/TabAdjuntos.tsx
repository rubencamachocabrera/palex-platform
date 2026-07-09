"use client"

import { useState, useEffect, useRef } from "react"
import { TEAL } from "@/lib/brand"
import { useToast } from "@/components/Toast"
import type { Proyecto, Adjunto } from "../types"

export function TabAdjuntos({ pp, onUpdate }: { pp: Proyecto; onUpdate: (p: Proyecto) => void }) {
  const { success, error: toastError } = useToast()
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([])
  const [loadingAdj, setLoadingAdj] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/proyectos/${pp.id}/adjuntos`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setAdjuntos(d) })
      .finally(() => setLoadingAdj(false))
  }, [pp.id])

  async function subir(file: File) {
    if (file.size > 10 * 1024 * 1024) { toastError("El archivo no puede superar 10 MB"); return }
    setSubiendo(true)
    try {
      const fd = new FormData(); fd.append("file", file)
      const r = await fetch(`/api/proyectos/${pp.id}/adjuntos`, { method: "POST", body: fd })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? "Error") }
      const nuevo: Adjunto = await r.json()
      setAdjuntos(prev => [nuevo, ...prev])
      onUpdate({ ...pp, adjuntos: [{ id: nuevo.id }, ...(pp.adjuntos ?? [])] })
      success("Archivo adjuntado")
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : "Error al subir")
    } finally {
      setSubiendo(false)
    }
  }

  async function eliminar(adjuntoId: string) {
    if (!confirm("¿Eliminar este adjunto? Esta acción no se puede deshacer.")) return
    try {
      await fetch(`/api/proyectos/${pp.id}/adjuntos/${adjuntoId}`, { method: "DELETE" })
      setAdjuntos(prev => prev.filter(a => a.id !== adjuntoId))
      onUpdate({ ...pp, adjuntos: (pp.adjuntos ?? []).filter(a => a.id !== adjuntoId) })
      success("Eliminado")
    } catch { toastError("Error") }
  }

  function fmtTamano(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function colorTipo(tipo: string) {
    if (tipo.includes("pdf")) return { bg: "#fef2f2", color: "#dc2626", label: "PDF" }
    if (tipo.includes("image")) return { bg: "#f0fdf4", color: "#16a34a", label: "IMG" }
    if (tipo.includes("word") || tipo.includes("document")) return { bg: "#eff6ff", color: "#2563eb", label: "DOC" }
    if (tipo.includes("excel") || tipo.includes("spreadsheet") || tipo.includes("csv")) return { bg: "#f0fdf4", color: "#16a34a", label: "XLS" }
    if (tipo.includes("zip") || tipo.includes("compressed")) return { bg: "#fef3c7", color: "#d97706", label: "ZIP" }
    return { bg: "#f3f4f6", color: "#6b7280", label: "FILE" }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{adjuntos.length} archivo{adjuntos.length !== 1 ? "s" : ""} adjunto{adjuntos.length !== 1 ? "s" : ""}</p>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" className="hidden" multiple
            onChange={e => { Array.from(e.target.files ?? []).forEach(subir); e.target.value = "" }} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={subiendo}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ backgroundColor: TEAL }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
            {subiendo ? "Subiendo…" : "Subir archivo"}
          </button>
        </div>
      </div>

      {/* Drop hint */}
      {!loadingAdj && adjuntos.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-teal-300 hover:bg-teal-50/30 transition-all"
          onClick={() => fileRef.current?.click()}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: `${TEAL}18`, color: TEAL }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">Haz clic para adjuntar archivos</p>
          <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, imágenes… hasta 10 MB cada uno</p>
        </div>
      )}

      {/* Lista de adjuntos */}
      {loadingAdj ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {adjuntos.map(adj => {
            const ct = colorTipo(adj.tipo)
            return (
              <div key={adj.id} className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 hover:border-gray-200 transition-colors group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-bold" style={{ backgroundColor: ct.bg, color: ct.color }}>
                  {ct.label}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{adj.nombre}</p>
                  <p className="text-xs text-gray-400">{fmtTamano(adj.tamano)} · {adj.creadoPor} · {new Date(adj.creadoEn).toLocaleDateString("es-ES")}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`/api/proyectos/${pp.id}/adjuntos/${adj.id}`}
                    download={adj.nombre}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                    title="Descargar"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  </a>
                  <button onClick={() => eliminar(adj.id)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Eliminar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

