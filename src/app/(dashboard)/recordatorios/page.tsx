"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { TEAL } from "@/lib/brand"
import { EmptyState } from "@/components/ui/EmptyState"
import { PageHeader } from "@/components/ui/PageHeader"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Recordatorio {
  id: string
  titulo: string
  descripcion: string | null
  fecha: string
  completado: boolean
  creadoEn: string
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function ClockIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      className="transition-transform duration-200"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  })
}

function fmtHora(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
}

function isHoy(iso: string): boolean {
  const d = new Date(iso)
  const hoy = new Date()
  return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth() && d.getDate() === hoy.getDate()
}

function isVencido(iso: string): boolean {
  const d = new Date(iso)
  const hoy = new Date()
  hoy.setHours(23, 59, 59, 999)
  return d < hoy && !isHoy(iso)
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RecordatoriosPage() {
  const [items, setItems] = useState<Recordatorio[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showCompletados, setShowCompletados] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Form state
  const [titulo, setTitulo] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [fecha, setFecha] = useState("")
  const [saving, setSaving] = useState(false)

  // Edit state
  const [editTitulo, setEditTitulo] = useState("")
  const [editDescripcion, setEditDescripcion] = useState("")
  const [editFecha, setEditFecha] = useState("")

  const tituloRef = useRef<HTMLInputElement>(null)

  const fetchItems = useCallback(async () => {
    try {
      const r = await fetch("/api/recordatorios")
      if (!r.ok) return
      const data = await r.json()
      if (Array.isArray(data)) setItems(data)
    } catch { /* noop */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  useEffect(() => {
    if (showForm) {
      setTimeout(() => tituloRef.current?.focus(), 100)
    }
  }, [showForm])

  const handleCreate = async () => {
    if (!titulo.trim() || !fecha) return
    setSaving(true)
    try {
      const r = await fetch("/api/recordatorios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: titulo.trim(), descripcion: descripcion.trim() || null, fecha }),
      })
      if (r.ok) {
        setTitulo("")
        setDescripcion("")
        setFecha("")
        setShowForm(false)
        fetchItems()
      }
    } catch { /* noop */ } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (item: Recordatorio) => {
    const nuevoEstado = !item.completado
    // Optimistic update
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, completado: nuevoEstado } : i))
    try {
      const r = await fetch(`/api/recordatorios/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completado: nuevoEstado }),
      })
      if (!r.ok) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, completado: !nuevoEstado } : i))
      }
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, completado: !nuevoEstado } : i))
    }
  }

  const handleDelete = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    setDeleteConfirm(null)
    try {
      await fetch(`/api/recordatorios/${id}`, { method: "DELETE" })
    } catch {
      fetchItems()
    }
  }

  const startEdit = (item: Recordatorio) => {
    setEditingId(item.id)
    setEditTitulo(item.titulo)
    setEditDescripcion(item.descripcion ?? "")
    setEditFecha(new Date(item.fecha).toISOString().slice(0, 16))
  }

  const handleUpdate = async () => {
    if (!editingId || !editTitulo.trim() || !editFecha) return
    setSaving(true)
    try {
      const r = await fetch(`/api/recordatorios/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: editTitulo.trim(),
          descripcion: editDescripcion.trim() || null,
          fecha: editFecha,
        }),
      })
      if (r.ok) {
        setEditingId(null)
        fetchItems()
      }
    } catch { /* noop */ } finally {
      setSaving(false)
    }
  }

  // ── Group items ───────────────────────────────────────────────────────────
  const vencidos = items.filter(i => !i.completado && isVencido(i.fecha))
  const hoy = items.filter(i => !i.completado && isHoy(i.fecha))
  const proximos = items.filter(i => !i.completado && !isVencido(i.fecha) && !isHoy(i.fecha))
  const completados = items.filter(i => i.completado)
  const pendientesCount = vencidos.length + hoy.length + proximos.length

  // ── Render item ────────────────────────────────────────────────────────────
  function renderItem(item: Recordatorio, colorScheme: "red" | "amber" | "teal" | "gray") {
    const isEditing = editingId === item.id
    const isDeleting = deleteConfirm === item.id
    const colors = {
      red: { dot: "#ef4444", dateBg: "bg-red-50 dark:bg-red-950", dateText: "text-red-600 dark:text-red-400" },
      amber: { dot: "#f59e0b", dateBg: "bg-amber-50 dark:bg-amber-950", dateText: "text-amber-600 dark:text-amber-400" },
      teal: { dot: TEAL, dateBg: "bg-teal-50 dark:bg-teal-950", dateText: "text-teal-600 dark:text-teal-400" },
      gray: { dot: "#9ca3af", dateBg: "bg-gray-50 dark:bg-gray-800", dateText: "text-gray-400 dark:text-gray-500" },
    }
    const c = colors[colorScheme]

    if (isEditing) {
      return (
        <div key={item.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1e293b] animate-in fade-in duration-200">
          <div className="space-y-3">
            <input
              type="text"
              value={editTitulo}
              onChange={e => setEditTitulo(e.target.value)}
              className="w-full text-sm font-medium px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#243147] dark:text-slate-200 focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
              placeholder="Titulo"
            />
            <textarea
              value={editDescripcion}
              onChange={e => setEditDescripcion(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#243147] dark:text-slate-200 focus:outline-none focus:ring-2 resize-none"
              style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
              placeholder="Descripcion (opcional)"
              rows={2}
            />
            <input
              type="datetime-local"
              value={editFecha}
              onChange={e => setEditFecha(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#243147] dark:text-slate-200 focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setEditingId(null)}
                className="text-sm font-medium px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving || !editTitulo.trim() || !editFecha}
                className="text-sm font-medium px-4 py-1.5 rounded-lg text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: TEAL }}
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div
        key={item.id}
        className="group flex items-start gap-3 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-[#1e293b] hover:border-gray-200 dark:hover:border-gray-600 transition-all animate-in fade-in duration-300"
      >
        {/* Checkbox */}
        <button
          onClick={() => handleToggle(item)}
          className="mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
          style={{
            borderColor: item.completado ? "#9ca3af" : c.dot,
            backgroundColor: item.completado ? "#9ca3af" : "transparent",
          }}
          aria-label={item.completado ? "Marcar como pendiente" : "Completar"}
        >
          {item.completado && (
            <span className="text-white">
              <CheckIcon />
            </span>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium leading-tight transition-all ${
              item.completado
                ? "text-gray-400 dark:text-gray-500 line-through"
                : "text-gray-800 dark:text-slate-200"
            }`}
          >
            {item.titulo}
          </p>
          {item.descripcion && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2">{item.descripcion}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${c.dateBg} ${c.dateText}`}>
              <ClockIcon size={10} />
              {fmtFecha(item.fecha)} {fmtHora(item.fecha)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {!item.completado && (
            <button
              onClick={() => startEdit(item)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Editar"
            >
              <EditIcon />
            </button>
          )}
          {isDeleting ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleDelete(item.id)}
                className="text-[11px] font-medium px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-400 transition-colors"
              >
                Eliminar
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="text-[11px] font-medium px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDeleteConfirm(item.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
              title="Eliminar"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <PageHeader title="Recordatorios" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#E6F7F6", color: TEAL }}>
              <ClockIcon size={18} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Recordatorios</h1>
              {pendientesCount > 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {pendientesCount} pendiente{pendientesCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          {vencidos.length > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
              {vencidos.length} vencido{vencidos.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            setFecha(new Date(Date.now() + 3600000).toISOString().slice(0, 16))
          }}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl text-white transition-colors hover:opacity-90 shadow-sm"
          style={{ backgroundColor: TEAL, minHeight: 44 }}
        >
          <PlusIcon />
          <span className="hidden sm:inline">Nuevo recordatorio</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* ── New recordatorio form ─────────────────────────────────────────── */}
      {showForm && (
        <div className="mb-6 p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] shadow-sm animate-in slide-in-from-top-2 duration-200">
          <h3 className="text-sm font-bold text-gray-800 dark:text-slate-200 mb-3">Nuevo recordatorio</h3>
          <div className="space-y-3">
            <input
              ref={tituloRef}
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Titulo del recordatorio"
              className="w-full text-sm font-medium px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#243147] dark:text-slate-200 focus:outline-none focus:ring-2 transition-colors"
              style={{ "--tw-ring-color": TEAL, minHeight: 44 } as React.CSSProperties}
              onKeyDown={e => { if (e.key === "Enter" && titulo.trim() && fecha) handleCreate() }}
            />
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Descripcion (opcional)"
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#243147] dark:text-slate-200 focus:outline-none focus:ring-2 resize-none transition-colors"
              style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
              rows={2}
            />
            <input
              type="datetime-local"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#243147] dark:text-slate-200 focus:outline-none focus:ring-2 transition-colors"
              style={{ "--tw-ring-color": TEAL, minHeight: 44 } as React.CSSProperties}
            />
            <div className="flex items-center gap-2 justify-end pt-1">
              <button
                onClick={() => { setShowForm(false); setTitulo(""); setDescripcion(""); setFecha("") }}
                className="text-sm font-medium px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                style={{ minHeight: 44 }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !titulo.trim() || !fecha}
                className="text-sm font-medium px-5 py-2 rounded-lg text-white transition-colors disabled:opacity-50 hover:opacity-90"
                style={{ backgroundColor: TEAL, minHeight: 44 }}
              >
                {saving ? "Creando..." : "Crear recordatorio"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {items.length === 0 && !showForm && (
        <EmptyState
          icon="document"
          title="Sin recordatorios"
          description="Crea tu primer recordatorio para no olvidar nada."
          action={{ label: "Nuevo recordatorio", onClick: () => {
            setShowForm(true)
            setFecha(new Date(Date.now() + 3600000).toISOString().slice(0, 16))
          }}}
        />
      )}

      {/* ── Vencidos ─────────────────────────────────────────────────────── */}
      {vencidos.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <h2 className="text-sm font-bold text-red-600 dark:text-red-400">Vencidos</h2>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400">{vencidos.length}</span>
          </div>
          <div className="space-y-2">
            {vencidos.map(item => renderItem(item, "red"))}
          </div>
        </div>
      )}

      {/* ── Hoy ──────────────────────────────────────────────────────────── */}
      {hoy.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h2 className="text-sm font-bold text-amber-600 dark:text-amber-400">Hoy</h2>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-500 dark:bg-amber-950 dark:text-amber-400">{hoy.length}</span>
          </div>
          <div className="space-y-2">
            {hoy.map(item => renderItem(item, "amber"))}
          </div>
        </div>
      )}

      {/* ── Proximos ─────────────────────────────────────────────────────── */}
      {proximos.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TEAL }} />
            <h2 className="text-sm font-bold" style={{ color: TEAL }}>Proximos</h2>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950" style={{ color: TEAL }}>{proximos.length}</span>
          </div>
          <div className="space-y-2">
            {proximos.map(item => renderItem(item, "teal"))}
          </div>
        </div>
      )}

      {/* ── Completados ──────────────────────────────────────────────────── */}
      {completados.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowCompletados(v => !v)}
            className="flex items-center gap-2 mb-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
          >
            <ChevronDownIcon open={showCompletados} />
            <h2 className="text-sm font-bold">Completados</h2>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">{completados.length}</span>
          </button>
          {showCompletados && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
              {completados.map(item => renderItem(item, "gray"))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
