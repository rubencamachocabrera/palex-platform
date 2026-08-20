"use client"

import { useEffect, useState, useRef } from "react"

interface TagItem {
  id: string
  nombre: string
  color: string
  tipo: string
  activo: boolean
}

interface TagSelectorProps {
  entityType: "VISITA" | "PROYECTO"
  entityId: string
  tagIds: string[]
  onUpdate: (tagIds: string[]) => void
  readOnly?: boolean
}

export function TagSelector({ entityType, entityId, tagIds, onUpdate, readOnly }: TagSelectorProps) {
  const [allTags, setAllTags] = useState<TagItem[]>([])
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (loaded) return
    fetch(`/api/tags?tipo=${entityType}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setAllTags(d.filter((t: TagItem) => t.activo)) })
      .finally(() => setLoaded(true))
  }, [entityType, loaded])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const assigned = allTags.filter(t => tagIds.includes(t.id))
  const available = allTags.filter(t => !tagIds.includes(t.id))

  function addTag(tagId: string) {
    const next = [...tagIds, tagId]
    onUpdate(next)
    syncToServer(next)
  }

  function removeTag(tagId: string) {
    const next = tagIds.filter(id => id !== tagId)
    onUpdate(next)
    syncToServer(next)
  }

  function syncToServer(ids: string[]) {
    const url = entityType === "VISITA"
      ? `/api/visitas/${entityId}`
      : `/api/proyectos/${entityId}`
    fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagIds: ids }),
    }).catch(() => {})
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap relative" ref={ref}>
      {assigned.map(tag => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full text-white transition-all"
          style={{ backgroundColor: tag.color }}
        >
          {tag.nombre}
          {!readOnly && (
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); removeTag(tag.id) }}
              className="ml-0.5 hover:opacity-70 transition-opacity leading-none"
              title="Quitar etiqueta"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </span>
      ))}
      {!readOnly && available.length > 0 && (
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) }}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors shrink-0"
          title="Asignar etiqueta"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      )}
      {open && available.length > 0 && (
        <div role="menu" aria-label="Etiquetas disponibles" className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg py-1.5 min-w-[160px] animate-in fade-in zoom-in-95 duration-150">
          {available.map(tag => (
            <button
              key={tag.id}
              role="menuitem"
              onClick={e => { e.preventDefault(); e.stopPropagation(); addTag(tag.id); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
              {tag.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Small read-only tag pills for list cards */
export function TagPills({ tags }: { tags: { tag: { id: string; nombre: string; color: string } }[] }) {
  if (!tags || tags.length === 0) return null
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {tags.map(({ tag }) => (
        <span
          key={tag.id}
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white leading-none"
          style={{ backgroundColor: tag.color }}
        >
          {tag.nombre}
        </span>
      ))}
    </div>
  )
}
