"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { TEAL, ORANGE } from "@/lib/brand"
import { EmptyState } from "@/components/ui/EmptyState"
import { PageHeader } from "@/components/ui/PageHeader"

interface ModuloInlab { id: string; nombre: string }
interface ProyectoModulo { modulo: ModuloInlab }
interface Hospital { id: string; nombre: string; ciudad: string }
interface Proyecto {
  id: string
  nombre: string
  hospital: Hospital
  fechaInicio: string
  fechaFin: string | null
  refConcurso: string | null
  mapaHtml: string | null
  modulos: ProyectoModulo[]
  creadoEn: string
}

// ─── Helpers ──────────────────────────────────────────────

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

function duracionProyecto(p: Proyecto) {
  const inicio = new Date(p.fechaInicio)
  const fin = p.fechaFin ? new Date(p.fechaFin) : new Date()
  const dias = Math.round((fin.getTime() - inicio.getTime()) / 86400000)
  if (dias < 1) return "< 1 día"
  if (dias < 30) return `${dias} día${dias !== 1 ? "s" : ""}`
  const meses = Math.floor(dias / 30)
  const resto = dias % 30
  if (resto === 0) return `${meses} mes${meses !== 1 ? "es" : ""}`
  return `${meses} mes${meses !== 1 ? "es" : ""} ${resto}d`
}

function estadoProyecto(p: Proyecto) {
  const hoy = new Date()
  const inicio = new Date(p.fechaInicio)
  const fin = p.fechaFin ? new Date(p.fechaFin) : null
  if (fin && fin < hoy) return { label: "Finalizado", color: "bg-gray-100 text-gray-500" }
  if (inicio > hoy) return { label: "Pendiente", color: "bg-amber-50 text-amber-600" }
  return { label: "En curso", color: "bg-emerald-50 text-emerald-600" }
}

// ─── Iconos ───────────────────────────────────────────────

function IconFolder() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}
function IconMap() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  )
}
function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}
function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

// ─── Modal Nuevo Proyecto ──────────────────────────────────

interface ModalProps {
  onClose: () => void
  onCreado: () => void
}

function ModalNuevoProyecto({ onClose, onCreado }: ModalProps) {
  const [hospitales, setHospitales] = useState<Hospital[]>([])
  const [modulos, setModulos] = useState<ModuloInlab[]>([])
  const [form, setForm] = useState({
    nombre: "",
    hospitalId: "",
    fechaInicio: "",
    fechaFin: "",
    refConcurso: "",
    moduloIds: [] as string[],
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/hospitales").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setHospitales(d)
    })
    fetch("/api/modulos-inlab").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setModulos(d)
    })
  }, [])

  function toggleModulo(id: string) {
    setForm(f => ({
      ...f,
      moduloIds: f.moduloIds.includes(id)
        ? f.moduloIds.filter(m => m !== id)
        : [...f.moduloIds, id],
    }))
  }

  async function submit() {
    if (!form.nombre || !form.hospitalId || !form.fechaInicio) {
      setError("Nombre, hospital y fecha de inicio son obligatorios")
      return
    }
    setGuardando(true)
    setError("")
    const r = await fetch("/api/proyectos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setGuardando(false)
    if (!r.ok) {
      const d = await r.json()
      setError(d.error ?? "Error al crear el proyecto")
      return
    }
    onCreado()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Nuevo proyecto</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <IconX />
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); submit() }} className="overflow-y-auto flex-1 p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Nombre del proyecto *</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ ["--tw-ring-color" as string]: TEAL }}
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Implantación INLAB H. La Paz"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Hospital *</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white"
              style={{ ["--tw-ring-color" as string]: TEAL }}
              value={form.hospitalId}
              onChange={e => setForm(f => ({ ...f, hospitalId: e.target.value }))}
            >
              <option value="">Seleccionar hospital...</option>
              {hospitales.map(h => (
                <option key={h.id} value={h.id}>{h.nombre} — {h.ciudad}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Fecha inicio *</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ ["--tw-ring-color" as string]: TEAL }}
                value={form.fechaInicio}
                onChange={e => setForm(f => ({ ...f, fechaInicio: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Fecha fin</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ ["--tw-ring-color" as string]: TEAL }}
                value={form.fechaFin}
                onChange={e => setForm(f => ({ ...f, fechaFin: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Referencia concurso</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ ["--tw-ring-color" as string]: TEAL }}
              value={form.refConcurso}
              onChange={e => setForm(f => ({ ...f, refConcurso: e.target.value }))}
              placeholder="Ej: EXP-2024-MAD-0123"
            />
          </div>
          {modulos.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">Módulos INLAB incluidos</label>
              <div className="space-y-2">
                {modulos.map(m => (
                  <label key={m.id} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={form.moduloIds.includes(m.id)}
                      onChange={() => toggleModulo(m.id)}
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{m.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>
        <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={guardando}
            className="px-4 py-2 text-sm font-medium text-white rounded-xl transition-opacity disabled:opacity-50"
            style={{ backgroundColor: TEAL }}
          >
            {guardando ? "Guardando..." : "Crear proyecto"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
          <div className="h-4 bg-gray-100 rounded w-3/4 mb-3" />
          <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
          <div className="flex gap-2">
            <div className="h-5 bg-gray-100 rounded-full w-20" />
            <div className="h-5 bg-gray-100 rounded-full w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [showModal, setShowModal] = useState(false)

  const cargar = useCallback(() => {
    setLoading(true)
    fetch("/api/proyectos")
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setProyectos(d) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const filtrados = proyectos.filter(p => {
    const texto = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.hospital.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.hospital.ciudad.toLowerCase().includes(busqueda.toLowerCase())
    if (!texto) return false
    if (!filtroEstado) return true
    return estadoProyecto(p).label === filtroEstado
  })

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Proyectos"
        subtitle={`${proyectos.length} proyecto${proyectos.length !== 1 ? "s" : ""}`}
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-xl transition-opacity hover:opacity-90"
            style={{ backgroundColor: TEAL }}
          >
            <IconPlus />
            Nuevo proyecto
          </button>
        }
      />

      {/* Buscador + filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <IconSearch />
          </span>
          <input
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 bg-white"
            style={{ ["--tw-ring-color" as string]: TEAL }}
            placeholder="Buscar proyectos..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 bg-white"
          style={{ ["--tw-ring-color" as string]: TEAL }}
        >
          <option value="">Todos los estados</option>
          <option value="En curso">En curso</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Finalizado">Finalizado</option>
        </select>
        {(busqueda || filtroEstado) && (
          <button
            onClick={() => { setBusqueda(""); setFiltroEstado("") }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <IconX /> Limpiar
          </button>
        )}
      </div>

      {/* Contenido */}
      {loading ? (
        <Skeleton />
      ) : filtrados.length === 0 ? (
        <EmptyState
          title={busqueda ? "Sin resultados" : "Sin proyectos todavía"}
          description={busqueda ? "Prueba con otro término de búsqueda" : "Crea el primer proyecto para empezar"}
          icon={<IconFolder />}
          action={!busqueda ? { label: "Nuevo proyecto", onClick: () => setShowModal(true) } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map(p => {
            const estado = estadoProyecto(p)
            return (
              <Link
                key={p.id}
                href={`/proyectos/${p.id}`}
                className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all flex flex-col gap-3 group"
              >
                {/* Cabecera */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-teal-600 transition-colors" style={{ ["--tw-text-opacity" as string]: "1" }}>
                      {p.nombre}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{p.hospital.nombre} · {p.hospital.ciudad}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${estado.color}`}>
                    {estado.label}
                  </span>
                </div>

                {/* Fechas + duración */}
                <div className="text-xs text-gray-400 flex items-center gap-1.5 flex-wrap">
                  <span>{fmtFecha(p.fechaInicio)}</span>
                  {p.fechaFin && <><span>→</span><span>{fmtFecha(p.fechaFin)}</span></>}
                  <span className="ml-auto shrink-0 font-medium" style={{ color: "#9CA3AF" }}>
                    {duracionProyecto(p)}{!p.fechaFin ? " (en curso)" : ""}
                  </span>
                </div>

                {/* Módulos */}
                {p.modulos.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.modulos.slice(0, 2).map(pm => (
                      <span
                        key={pm.modulo.id}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "#e6f7f6", color: TEAL }}
                      >
                        {pm.modulo.nombre.split(" ").slice(0, 3).join(" ")}
                      </span>
                    ))}
                    {p.modulos.length > 2 && (
                      <span className="text-[10px] text-gray-400 px-1 py-0.5">
                        +{p.modulos.length - 2} más
                      </span>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-1">
                  {p.refConcurso && (
                    <span className="text-[10px] text-gray-400 truncate max-w-[140px]">
                      Ref: {p.refConcurso}
                    </span>
                  )}
                  {p.mapaHtml && (
                    <span className="flex items-center gap-1 text-[10px] ml-auto" style={{ color: ORANGE }}>
                      <IconMap />
                      Mapa disponible
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {showModal && (
        <ModalNuevoProyecto
          onClose={() => setShowModal(false)}
          onCreado={() => { setShowModal(false); cargar() }}
        />
      )}
    </div>
  )
}
