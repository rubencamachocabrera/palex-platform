"use client"

import { useRef, useState } from "react"
import { comprimirImagen } from "@/lib/img-compress"
import { TEAL } from "@/lib/brand"
import { IconCamera, IconTrash } from "@/components/ui/Icons"
import type { Foto } from "../types"

// ─── Compresión + upload fotos ────────────────────────────────────────────────
export function FotosSeccion({ fotos, onChange, readOnly }: {
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
                  aria-label="Eliminar foto"
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
                aria-label="Descripción de la foto"
                className="mt-1.5 w-full text-xs border-0 bg-transparent text-gray-500 placeholder-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-300"
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
