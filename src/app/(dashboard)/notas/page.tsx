"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { TEAL } from "@/lib/brand"
import { useToast } from "@/components/Toast"
import { usePerfil } from "@/hooks/usePerfil"
import { PageHeader } from "@/components/ui/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { MentionInput, extractMentionIds } from "@/components/MentionInput"
import { MentionText } from "@/components/MentionText"

interface Autor { id: string; nombre: string; rol: string }
interface Nota {
  id: string
  texto: string
  autorId: string
  autor: Autor
  mencionIds: string[]
  fijada: boolean
  creadoEn: string
  editadoEn: string
}

function avatarColor(nombre: string) {
  const colors = ["#0d9488", "#0891b2", "#7c3aed", "#db2777", "#ea580c", "#65a30d", "#2563eb"]
  let h = 0
  for (let i = 0; i < nombre.length; i++) h = nombre.charCodeAt(i) + ((h << 5) - h)
  return colors[Math.abs(h) % colors.length]
}

function fmtRel(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "ahora"
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const d = Math.floor(hrs / 24)
  if (d === 1) return "ayer"
  if (d < 7) return `hace ${d} días`
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtFull(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function NotaCard({
  nota, userId, esAdmin, onPin, onDelete, onEdit,
}: {
  nota: Nota; userId: string; esAdmin: boolean
  onPin: (id: string, fijada: boolean) => void
  onDelete: (id: string) => void
  onEdit: (nota: Nota) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const canEdit = nota.autorId === userId || esAdmin

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [menuOpen])

  const editado = nota.editadoEn !== nota.creadoEn

  return (
    <div className={`relative bg-white dark:bg-gray-900 rounded-2xl border shadow-sm p-4 transition-all ${
      nota.fijada ? "border-amber-200 dark:border-amber-800/60" : "border-gray-100 dark:border-gray-800"
    }`}>
      {nota.fijada && (
        <div className="absolute top-3 right-10 flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
          Fijada
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ backgroundColor: avatarColor(nota.autor.nombre) }}>
          {nota.autor.nombre.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{nota.autor.nombre}</span>
          <span className="text-[11px] ml-2 px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: `${avatarColor(nota.autor.nombre)}18`, color: avatarColor(nota.autor.nombre) }}>
            {nota.autor.rol}
          </span>
          <p className="text-xs text-gray-400" title={fmtFull(nota.creadoEn)}>
            {fmtRel(nota.creadoEn)}
            {editado && <span className="ml-1.5 italic text-gray-300 dark:text-gray-600">· editada</span>}
          </p>
        </div>

        {canEdit && (
          <div className="relative shrink-0" ref={menuRef}>
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 min-w-[140px] py-1">
                <button onClick={() => { onEdit(nota); setMenuOpen(false) }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Editar
                </button>
                <button onClick={() => { onPin(nota.id, !nota.fijada); setMenuOpen(false) }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={nota.fijada ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
                  {nota.fijada ? "Desfijar" : "Fijar"}
                </button>
                <button onClick={() => { onDelete(nota.id); setMenuOpen(false) }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  Eliminar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
        <MentionText text={nota.texto} />
      </div>
    </div>
  )
}

export default function NotasPage() {
  const { perfil } = usePerfil()
  const { success, error: toastError } = useToast()

  const [notas, setNotas] = useState<Nota[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const LIMIT = 30

  const [texto, setTexto] = useState("")
  const [enviando, setEnviando] = useState(false)

  const [editando, setEditando] = useState<Nota | null>(null)
  const [textoEdit, setTextoEdit] = useState("")
  const [guardandoEdit, setGuardandoEdit] = useState(false)

  const fetchNotas = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/notas?limit=${LIMIT}&offset=${offset}`)
    if (r.ok) {
      const d = await r.json()
      setNotas(d.notas ?? [])
      setTotal(d.total ?? 0)
    }
    setLoading(false)
  }, [offset])

  useEffect(() => { fetchNotas() }, [fetchNotas])

  async function enviarNota() {
    if (!texto.trim()) return
    setEnviando(true)
    try {
      const r = await fetch("/api/notas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: texto.trim(), mencionIds: extractMentionIds(texto) }),
      })
      if (!r.ok) throw new Error()
      setTexto("")
      success("Nota publicada")
      fetchNotas()
    } catch { toastError("Error al publicar la nota") }
    finally { setEnviando(false) }
  }

  async function handlePin(id: string, fijada: boolean) {
    const r = await fetch(`/api/notas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fijada }),
    })
    if (r.ok) {
      setNotas(prev => prev.map(n => n.id === id ? { ...n, fijada } : n)
        .sort((a, b) => (b.fijada ? 1 : 0) - (a.fijada ? 1 : 0) || new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime()))
      success(fijada ? "Nota fijada" : "Nota desfijada")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta nota?")) return
    const r = await fetch(`/api/notas/${id}`, { method: "DELETE" })
    if (r.ok) {
      setNotas(prev => prev.filter(n => n.id !== id))
      setTotal(t => t - 1)
      success("Nota eliminada")
    } else { toastError("Error al eliminar") }
  }

  function handleEdit(nota: Nota) {
    setEditando(nota)
    setTextoEdit(nota.texto)
  }

  async function guardarEdit() {
    if (!editando || !textoEdit.trim()) return
    setGuardandoEdit(true)
    try {
      const r = await fetch(`/api/notas/${editando.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: textoEdit.trim(), mencionIds: extractMentionIds(textoEdit) }),
      })
      if (!r.ok) throw new Error()
      const updated = await r.json()
      setNotas(prev => prev.map(n => n.id === editando.id ? updated : n))
      setEditando(null)
      success("Nota actualizada")
    } catch { toastError("Error al actualizar") }
    finally { setGuardandoEdit(false) }
  }

  const totalPages = Math.ceil(total / LIMIT)
  const currentPage = Math.floor(offset / LIMIT) + 1

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Notas del equipo"
        subtitle={`${total} nota${total !== 1 ? "s" : ""} publicada${total !== 1 ? "s" : ""}`}
      />

      {/* Composer */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 mb-6">
        <MentionInput
          value={texto}
          onChange={setTexto}
          placeholder="Escribe una nota para el equipo… (@menciona usuarios)"
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-400">{texto.length}/5000 caracteres</p>
          <button
            onClick={enviarNota}
            disabled={!texto.trim() || enviando}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer"
            style={{ backgroundColor: TEAL }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            {enviando ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : notas.length === 0 ? (
        <EmptyState
          icon="document"
          title="Sin notas aún"
          description="Publica la primera nota para que el equipo la vea aquí."
        />
      ) : (
        <div className="space-y-3">
          {notas.map(nota => (
            <NotaCard
              key={nota.id}
              nota={nota}
              userId={perfil?.id ?? ""}
              esAdmin={perfil?.rol === "ADMIN"}
              onPin={handlePin}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={() => setOffset(Math.max(0, offset - LIMIT))} disabled={offset === 0}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors">
            Anterior
          </button>
          <span className="text-xs text-gray-400">Página {currentPage} de {totalPages}</span>
          <button onClick={() => setOffset(offset + LIMIT)} disabled={offset + LIMIT >= total}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors"
            style={{ borderColor: offset + LIMIT < total ? TEAL : undefined, color: offset + LIMIT < total ? TEAL : undefined }}>
            Siguiente
          </button>
        </div>
      )}

      {/* Modal edición */}
      {editando && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setEditando(null) }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg" style={{ borderTop: `3px solid ${TEAL}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Editar nota</p>
              <button onClick={() => setEditando(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 cursor-pointer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-5 py-4">
              <MentionInput
                value={textoEdit}
                onChange={setTextoEdit}
                placeholder="Escribe tu nota…"
              />
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => setEditando(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                Cancelar
              </button>
              <button onClick={guardarEdit} disabled={!textoEdit.trim() || guardandoEdit}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 cursor-pointer hover:opacity-90 transition-opacity"
                style={{ backgroundColor: TEAL }}>
                {guardandoEdit ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
