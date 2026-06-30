"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { TEAL, ORANGE } from "@/lib/brand"
import type { Proyecto, Fase, Hito, Tarea } from "../types"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtFecha(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

function progreso(fases: Fase[]) {
  if (!fases.length) return 0
  return Math.round((fases.filter(f => f.estado === "COMPLETADO").length / fases.length) * 100)
}

const ESTADO_FASE: Record<string, { label: string; color: string; dot: string }> = {
  PENDIENTE:   { label: "Pendiente",   color: "#6b7280", dot: "#d1d5db" },
  EN_PROGRESO: { label: "En progreso", color: TEAL,      dot: TEAL },
  COMPLETADO:  { label: "Completado",  color: "#16a34a", dot: "#16a34a" },
  BLOQUEADO:   { label: "Bloqueado",   color: "#dc2626", dot: "#dc2626" },
  CANCELADO:   { label: "Cancelado",   color: "#9ca3af", dot: "#9ca3af" },
}

const ESTADO_PROY: Record<string, { label: string; color: string }> = {
  NUEVO:      { label: "Nuevo",      color: "#0369a1" },
  EN_CURSO:   { label: "En curso",   color: TEAL },
  PAUSADO:    { label: "Pausado",    color: "#d97706" },
  COMPLETADO: { label: "Completado", color: "#16a34a" },
  CANCELADO:  { label: "Cancelado",  color: "#dc2626" },
}

const PRIORIDAD_COLOR: Record<number, string> = {
  0: "#6b7280", 1: ORANGE, 2: "#dc2626",
}

// ─── Slide components ─────────────────────────────────────────────────────────

function SlidePortada({ pp }: { pp: Proyecto }) {
  const pct = progreso(pp.fases)
  const est = ESTADO_PROY[pp.estado] ?? { label: pp.estado, color: TEAL }
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-16">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white mb-8 shadow-xl"
        style={{ backgroundColor: TEAL }}>
        {pp.titulo.charAt(0).toUpperCase()}
      </div>
      <span className="text-xs font-bold px-3 py-1 rounded-full mb-4"
        style={{ backgroundColor: `${est.color}20`, color: est.color }}>{est.label}</span>
      <h1 className="text-4xl font-black text-white mb-3 leading-tight max-w-3xl">{pp.titulo}</h1>
      <p className="text-lg text-white/60 mb-8">{pp.hospital.nombre} · {pp.hospital.ciudad}</p>
      {pp.descripcion && <p className="text-base text-white/50 max-w-2xl leading-relaxed mb-8">{pp.descripcion}</p>}
      <div className="flex gap-8 text-center">
        <div>
          <p className="text-3xl font-black" style={{ color: pct === 100 ? "#4ade80" : TEAL }}>{pct}%</p>
          <p className="text-xs text-white/40 mt-1">Progreso</p>
        </div>
        <div className="w-px bg-white/10" />
        <div>
          <p className="text-3xl font-black text-white">{pp.fases.length}</p>
          <p className="text-xs text-white/40 mt-1">Fases</p>
        </div>
        <div className="w-px bg-white/10" />
        <div>
          <p className="text-3xl font-black text-white">{pp.tareas.filter(t => t.parentId === null).length}</p>
          <p className="text-xs text-white/40 mt-1">Tareas</p>
        </div>
        <div className="w-px bg-white/10" />
        <div>
          <p className="text-3xl font-black text-white">{pp.hitos.length}</p>
          <p className="text-xs text-white/40 mt-1">Hitos</p>
        </div>
      </div>
      <div className="mt-8 flex gap-6 text-sm text-white/40">
        {pp.responsable && <span>Responsable: <span className="text-white/60">{pp.responsable.nombre}</span></span>}
        {pp.fechaInicio && <span>Inicio: <span className="text-white/60">{fmtFecha(pp.fechaInicio)}</span></span>}
        {pp.fechaFinPlan && <span>Fin planificado: <span className="text-white/60">{fmtFecha(pp.fechaFinPlan)}</span></span>}
      </div>
    </div>
  )
}

function SlideFases({ fases }: { fases: Fase[] }) {
  return (
    <div className="h-full flex flex-col px-16 py-12">
      <h2 className="text-3xl font-black text-white mb-8">Fases del proyecto</h2>
      <div className="flex-1 grid grid-cols-1 gap-3 overflow-hidden">
        {fases.slice(0, 10).map((f, i) => {
          const est = ESTADO_FASE[f.estado] ?? ESTADO_FASE.PENDIENTE
          return (
            <div key={f.id} className="flex items-center gap-4 p-4 rounded-2xl" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                style={{ backgroundColor: `${est.dot}20`, color: est.dot }}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: est.dot }} />
                  <p className="text-base font-semibold text-white truncate">{f.nombre}</p>
                </div>
                <p className="text-xs text-white/40 ml-4">{est.label}</p>
              </div>
              <div className="text-right shrink-0">
                {f.fechaPlan && <p className="text-xs text-white/40">{fmtFecha(f.fechaPlan)}</p>}
                {f.fechaReal && <p className="text-xs" style={{ color: "#4ade80" }}>{fmtFecha(f.fechaReal)}</p>}
              </div>
            </div>
          )
        })}
        {fases.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white/30 text-lg">Sin fases definidas</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SlideTareas({ tareas }: { tareas: Tarea[] }) {
  const raiz = tareas.filter(t => t.parentId === null)
  const pendientes = raiz.filter(t => t.estado === "PENDIENTE" || t.estado === "EN_PROGRESO")
  const completadas = raiz.filter(t => t.estado === "COMPLETADA")
  const PRIOCOLOR: Record<string, string> = { BAJA: "#6b7280", MEDIA: "#2563eb", ALTA: ORANGE, CRITICA: "#dc2626" }

  return (
    <div className="h-full flex flex-col px-16 py-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black text-white">Tareas</h2>
        <div className="flex gap-4 text-sm">
          <span className="text-white/60">{pendientes.length} pendientes</span>
          <span style={{ color: "#4ade80" }}>{completadas.length} completadas</span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Activas</p>
          <div className="space-y-2">
            {pendientes.slice(0, 8).map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PRIOCOLOR[t.prioridad] ?? "#6b7280" }} />
                <p className="text-sm text-white truncate flex-1">{t.titulo}</p>
                {t.asignado && <p className="text-[10px] text-white/40 shrink-0">{t.asignado.nombre.split(" ")[0]}</p>}
              </div>
            ))}
            {pendientes.length === 0 && <p className="text-white/30 text-sm">Sin tareas activas</p>}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Completadas</p>
          <div className="space-y-2">
            {completadas.slice(0, 8).map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl opacity-50" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <p className="text-sm text-white truncate flex-1">{t.titulo}</p>
              </div>
            ))}
            {completadas.length === 0 && <p className="text-white/30 text-sm">Sin tareas completadas</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function SlideHitos({ hitos }: { hitos: Hito[] }) {
  const now = new Date()
  return (
    <div className="h-full flex flex-col px-16 py-12">
      <h2 className="text-3xl font-black text-white mb-8">Hitos clave</h2>
      {hitos.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/30 text-lg">Sin hitos definidos</p>
        </div>
      ) : (
        <div className="flex-1 relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-white/10" />
          <div className="space-y-4">
            {hitos.slice(0, 8).map(h => {
              const past = new Date(h.fecha) < now
              const done = h.completado
              return (
                <div key={h.id} className="flex items-start gap-6 pl-12 relative">
                  <div className="absolute left-3.5 top-1.5 w-3 h-3 rounded-full border-2"
                    style={{
                      backgroundColor: done ? "#4ade80" : past ? "#f59e0b" : "transparent",
                      borderColor: done ? "#4ade80" : past ? "#f59e0b" : "rgba(255,255,255,0.2)",
                    }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="text-base font-semibold" style={{ color: done ? "#4ade80" : past ? "#fbbf24" : "white" }}>{h.titulo}</p>
                      {done && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-900/30 text-green-400">Completado</span>}
                      {!done && past && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-900/30 text-yellow-400">Vencido</span>}
                    </div>
                    <p className="text-xs text-white/40 mt-0.5">
                      {fmtFecha(h.fecha)}
                      {h.fechaReal && <span className="ml-2 text-green-400">· Completado {fmtFecha(h.fechaReal)}</span>}
                    </p>
                    {h.descripcion && <p className="text-xs text-white/30 mt-1">{h.descripcion}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function SlideKPIs({ pp }: { pp: Proyecto }) {
  const pct = progreso(pp.fases)
  const fasesCompletas = pp.fases.filter(f => f.estado === "COMPLETADO").length
  const tareasCompletas = pp.tareas.filter(t => t.estado === "COMPLETADA" && t.parentId === null).length
  const hitosCompletos = pp.hitos.filter(h => h.completado).length
  const hitosPendientes = pp.hitos.filter(h => !h.completado && new Date(h.fecha) < new Date()).length

  return (
    <div className="h-full flex flex-col px-16 py-12">
      <h2 className="text-3xl font-black text-white mb-8">Resumen ejecutivo</h2>
      <div className="flex-1 grid grid-cols-2 gap-6">
        {/* Progress donut */}
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
          <div className="relative w-40 h-40 mb-4">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
              <circle cx="60" cy="60" r="50" fill="none" strokeWidth="10"
                stroke={pct === 100 ? "#4ade80" : TEAL}
                strokeDasharray={`${2 * Math.PI * 50 * pct / 100} ${2 * Math.PI * 50 * (100 - pct) / 100}`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black" style={{ color: pct === 100 ? "#4ade80" : TEAL }}>{pct}%</span>
              <span className="text-xs text-white/40 mt-1">progreso</span>
            </div>
          </div>
          <p className="text-base font-semibold text-white">{fasesCompletas}/{pp.fases.length} fases completadas</p>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Visitas", value: pp.visitas.length, color: TEAL },
            { label: "Hardware", value: pp.hardwareUnidades.length, color: ORANGE },
            { label: "Tareas completadas", value: tareasCompletas, color: "#4ade80" },
            { label: "Hitos pendientes", value: hitosPendientes, color: hitosPendientes > 0 ? "#f59e0b" : "#4ade80" },
            { label: "Solicitudes", value: pp.solicitudes.length, color: "#818cf8" },
            { label: "Contactos", value: pp.contactos.length, color: "#22d3ee" },
          ].map(m => (
            <div key={m.label} className="p-4 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
              <p className="text-3xl font-black mb-1" style={{ color: m.color }}>{m.value}</p>
              <p className="text-xs text-white/40">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
      {pp.presupuesto != null && (
        <div className="mt-4 p-4 rounded-xl text-center" style={{ backgroundColor: `${ORANGE}15`, borderColor: `${ORANGE}30`, border: "1px solid" }}>
          <span className="text-2xl font-black" style={{ color: ORANGE }}>
            {pp.presupuesto.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
          </span>
          <span className="text-sm text-white/40 ml-2">presupuesto total</span>
        </div>
      )}
    </div>
  )
}

// ─── Main presentation page ───────────────────────────────────────────────────

export default function PresentacionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [pp, setPp] = useState<Proyecto | null>(null)
  const [loading, setLoading] = useState(true)
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    fetch(`/api/proyectos/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPp(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const slides = pp ? [
    { label: "Portada",  render: () => <SlidePortada pp={pp} /> },
    { label: "Fases",    render: () => <SlideFases fases={pp.fases} /> },
    { label: "Tareas",   render: () => <SlideTareas tareas={pp.tareas} /> },
    { label: "Hitos",    render: () => <SlideHitos hitos={pp.hitos} /> },
    { label: "Resumen",  render: () => <SlideKPIs pp={pp} /> },
  ] : []

  const prev = useCallback(() => setSlide(s => Math.max(0, s - 1)), [])
  const next = useCallback(() => setSlide(s => Math.min(slides.length - 1, s + 1)), [slides.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next()
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") prev()
      if (e.key === "Escape") router.push(`/proyectos/${id}`)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [next, prev, router, id])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: TEAL, borderTopColor: "transparent" }} />
      </div>
    )
  }

  if (!pp) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center">
        <p className="text-white/40">Proyecto no encontrado</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col" style={{ zIndex: 9999 }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TEAL }} />
          <span className="text-xs font-semibold text-white/40 uppercase tracking-wider truncate max-w-xs">{pp.titulo}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Slide dots */}
          <div className="flex items-center gap-1.5">
            {slides.map((s, i) => (
              <button key={i} onClick={() => setSlide(i)}
                className="transition-all cursor-pointer rounded-full"
                style={{
                  width: i === slide ? "20px" : "6px",
                  height: "6px",
                  backgroundColor: i === slide ? TEAL : "rgba(255,255,255,0.15)",
                }}
                title={s.label}
              />
            ))}
          </div>
          <span className="text-xs text-white/30">{slide + 1}/{slides.length}</span>
          <button onClick={() => router.push(`/proyectos/${id}`)}
            className="ml-2 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar (Esc)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Slide content */}
      <div className="flex-1 relative overflow-hidden">
        {slides[slide]?.render()}
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
        <button
          onClick={prev}
          disabled={slide === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-20"
          style={{ color: slide > 0 ? "white" : "rgba(255,255,255,0.2)", backgroundColor: slide > 0 ? "rgba(255,255,255,0.08)" : "transparent" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Anterior
        </button>
        <span className="text-xs font-semibold text-white/30 uppercase tracking-widest">{slides[slide]?.label}</span>
        <button
          onClick={next}
          disabled={slide === slides.length - 1}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-20"
          style={{ color: slide < slides.length - 1 ? "white" : "rgba(255,255,255,0.2)", backgroundColor: slide < slides.length - 1 ? "rgba(255,255,255,0.08)" : "transparent" }}
        >
          Siguiente
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  )
}
