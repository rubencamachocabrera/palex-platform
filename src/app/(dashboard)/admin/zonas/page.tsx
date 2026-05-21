"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/components/Toast"
import { TEAL, ORANGE } from "@/lib/brand"

interface Zona {
  id: string
  nombre: string
  descripcion: string | null
  activo: boolean
  _count?: { hospitales: number; usuarios: number }
}

// Color determinista por nombre de zona
function zonaColor(nombre: string): { bg: string; ring: string; text: string } {
  const palette = [
    { bg: "#E0F7F5", ring: "#00A99D", text: "#007F75" },
    { bg: "#EEF2FF", ring: "#6366F1", text: "#4338CA" },
    { bg: "#FEF3C7", ring: "#F59E0B", text: "#92400E" },
    { bg: "#FCE7F3", ring: "#EC4899", text: "#9D174D" },
    { bg: "#D1FAE5", ring: "#10B981", text: "#065F46" },
    { bg: "#E0F2FE", ring: "#0EA5E9", text: "#0369A1" },
    { bg: "#F3E8FF", ring: "#A855F7", text: "#6B21A8" },
    { bg: "#FEE2E2", ring: "#EF4444", text: "#991B1B" },
  ]
  let h = 0
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) & 0xffff
  return palette[h % palette.length]
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl skeleton-shimmer shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 w-36 rounded skeleton-shimmer" />
          <div className="h-3 w-52 rounded skeleton-shimmer" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-24 rounded-full skeleton-shimmer" />
        <div className="h-6 w-20 rounded-full skeleton-shimmer" />
      </div>
    </div>
  )
}

// Icono zona
function IconZona({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  )
}

export default function ZonasPage() {
  const { success, error: toastError } = useToast()
  const [zonas, setZonas] = useState<Zona[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Zona | null>(null)
  const [form, setForm] = useState({ nombre: "", descripcion: "" })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")

  async function cargar() {
    setLoading(true)
    const r = await fetch("/api/zonas")
    const data = await r.json()
    setZonas(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  function abrirCrear() {
    setEditando(null); setForm({ nombre: "", descripcion: "" }); setError(""); setModalOpen(true)
  }
  function abrirEditar(z: Zona) {
    setEditando(z); setForm({ nombre: z.nombre, descripcion: z.descripcion ?? "" }); setError(""); setModalOpen(true)
  }
  function cerrar() { setModalOpen(false) }

  async function guardar() {
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return }
    setGuardando(true); setError("")
    try {
      const url = editando ? `/api/zonas/${editando.id}` : "/api/zonas"
      const r = await fetch(url, {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null }),
      })
      if (!r.ok) { const d = await r.json(); setError(d.error ?? "Error al guardar"); toastError(d.error ?? "Error"); return }
      cerrar()
      success(editando ? "Zona actualizada" : "Zona creada")
      await cargar()
    } finally { setGuardando(false) }
  }

  async function eliminar(z: Zona) {
    if (!confirm(`¿Eliminar la zona "${z.nombre}"? Esta acción no se puede deshacer.`)) return
    const r = await fetch(`/api/zonas/${z.id}`, { method: "DELETE" })
    if (!r.ok) { toastError("No se pudo eliminar la zona"); return }
    success(`Zona "${z.nombre}" eliminada`)
    await cargar()
  }

  const filtradas = zonas.filter(z =>
    !busqueda || z.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (z.descripcion ?? "").toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalHospitales = zonas.reduce((s, z) => s + (z._count?.hospitales ?? 0), 0)
  const totalUsuarios   = zonas.reduce((s, z) => s + (z._count?.usuarios ?? 0), 0)

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Cabecera ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: TEAL }}>
              <IconZona size={15} />
            </span>
            Zonas geográficas
          </h1>
          <p className="text-sm text-gray-400 mt-1 ml-10">
            Organización territorial de la red de centros Palex
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all hover:opacity-90 shrink-0"
          style={{ backgroundColor: ORANGE }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva zona
        </button>
      </div>

      {/* ── KPI chips ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          {
            label: "Zonas activas",
            value: loading ? "—" : zonas.length,
            icon: <IconZona size={15} />,
            color: TEAL,
            bg: "#E0F7F5",
          },
          {
            label: "Hospitales asignados",
            value: loading ? "—" : totalHospitales,
            icon: (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            ),
            color: "#6366F1",
            bg: "#EEF2FF",
          },
          {
            label: "Usuarios en zonas",
            value: loading ? "—" : totalUsuarios,
            icon: (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            ),
            color: ORANGE,
            bg: "#FEF3C7",
          },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-100 px-4 py-3.5 shadow-sm flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: k.bg, color: k.color }}>
              {k.icon}
            </span>
            <div>
              <p className="text-xl font-bold tabular-nums leading-none" style={{ color: k.color }}>{k.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Buscador ── */}
      {!loading && zonas.length > 0 && (
        <div className="relative mb-5">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar zona por nombre o descripción…"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 shadow-sm"
            style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
          />
        </div>
      )}

      {/* ── Contenido ── */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "#E0F7F5" }}>
            <IconZona size={24} />
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">
            {busqueda ? "Sin resultados" : "Aún no hay zonas"}
          </p>
          <p className="text-xs text-gray-400 mb-4">
            {busqueda
              ? `No se encontró ninguna zona con "${busqueda}"`
              : "Las zonas geográficas organizan los hospitales y técnicos por territorio"}
          </p>
          {busqueda
            ? <button onClick={() => setBusqueda("")} className="text-xs font-medium" style={{ color: TEAL }}>Limpiar búsqueda</button>
            : <button onClick={abrirCrear} className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white" style={{ backgroundColor: TEAL }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Crear primera zona
              </button>
          }
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtradas.map(z => {
            const col = zonaColor(z.nombre)
            const hosp  = z._count?.hospitales ?? 0
            const users = z._count?.usuarios ?? 0
            const pct   = totalHospitales > 0 ? Math.round((hosp / totalHospitales) * 100) : 0
            return (
              <div key={z.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden group">

                {/* Franja de color superior */}
                <div className="h-1.5 w-full" style={{ backgroundColor: col.ring }} />

                <div className="p-5 flex-1 flex flex-col">
                  {/* Header tarjeta */}
                  <div className="flex items-start gap-3.5 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0 select-none"
                      style={{ backgroundColor: col.bg, color: col.text, border: `1.5px solid ${col.ring}25` }}
                    >
                      {z.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate leading-tight">{z.nombre}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {z.descripcion || <span className="italic opacity-60">Sin descripción</span>}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-2 mb-4">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                      style={{ backgroundColor: col.bg, color: col.text }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                      {hosp} {hosp === 1 ? "hospital" : "hospitales"}
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-500">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                      </svg>
                      {users} {users === 1 ? "usuario" : "usuarios"}
                    </div>
                  </div>

                  {/* Barra proporción */}
                  <div className="mt-auto">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                      <span>Proporción de centros</span>
                      <span className="font-semibold tabular-nums">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: col.ring }} />
                    </div>
                  </div>
                </div>

                {/* Footer acciones */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50 bg-gray-50/50">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-300">ZONA</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => abrirEditar(z)}
                      title="Editar zona"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-white transition-colors"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => eliminar(z)}
                      title="Eliminar zona"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal crear/editar ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onMouseDown={e => { if (e.target === e.currentTarget) cerrar() }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in scale-in duration-150">
            {/* Cabecera modal */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: editando ? TEAL : ORANGE }}>
                  <IconZona size={14} />
                </span>
                <h2 className="text-base font-bold text-gray-900">
                  {editando ? `Editar — ${editando.nombre}` : "Nueva zona"}
                </h2>
              </div>
              <button onClick={cerrar} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Cuerpo modal */}
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Nombre <span className="text-red-400">*</span>
                </label>
                <input
                  autoFocus
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") guardar(); if (e.key === "Escape") cerrar() }}
                  placeholder="Ej: Zona Norte, Levante, Andalucía…"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 bg-gray-50 focus:bg-white transition-colors"
                  style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Descripción <span className="text-gray-300 font-normal normal-case">(opcional)</span>
                </label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Provincias, comunidades autónomas o área de cobertura de esta zona…"
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 bg-gray-50 focus:bg-white transition-colors resize-none"
                  style={{ "--tw-ring-color": TEAL } as React.CSSProperties}
                />
              </div>

              {error && (
                <div role="alert" aria-live="polite" className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-xs px-3.5 py-2.5 rounded-xl">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}
            </div>

            {/* Footer modal */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={cerrar}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: editando ? TEAL : ORANGE }}
              >
                {guardando ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Guardando…
                  </>
                ) : (editando ? "Guardar cambios" : "Crear zona")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
