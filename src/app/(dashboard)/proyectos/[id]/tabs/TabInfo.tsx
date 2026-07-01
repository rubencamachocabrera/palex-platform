"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { TEAL } from "@/lib/brand"
import { useToast } from "@/components/Toast"
import { usePerfil } from "@/hooks/usePerfil"
import type { Proyecto } from "../types"

const ComentariosPanel = dynamic(
  () => import("@/components/ComentariosPanel").then(m => ({ default: m.ComentariosPanel })),
  { ssr: false }
)
import { fmtFechaInput } from "../types"

function ComentariosInInfo({ ppId }: { ppId: string }) {
  const { perfil } = usePerfil()
  if (!perfil) return null
  const userInfo = { id: perfil.id, rol: perfil.rol }
  return (
    <ComentariosPanel
      endpoint={`/api/proyectos/${ppId}/comentarios`}
      usuarioId={userInfo.id}
      esAdmin={userInfo.rol === "ADMIN"}
    />
  )
}

export function TabInfo({ pp, onUpdate }: { pp: Proyecto; onUpdate: (p: Proyecto) => void }) {
  const { success, error: toastError } = useToast()
  const [form, setForm] = useState({
    titulo: pp.titulo, descripcion: pp.descripcion ?? "", estado: pp.estado,
    prioridad: String(pp.prioridad), presupuesto: pp.presupuesto != null ? String(pp.presupuesto) : "",
    fechaInicio: fmtFechaInput(pp.fechaInicio), fechaFinPlan: fmtFechaInput(pp.fechaFinPlan),
    fechaFinReal: fmtFechaInput(pp.fechaFinReal), notas: pp.notas ?? "",
    proyectoId: pp.proyectoId ?? "", refContrato: pp.refContrato ?? "",
  })
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    try {
      const r = await fetch(`/api/proyectos/${pp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          prioridad: parseInt(form.prioridad),
          presupuesto: form.presupuesto ? parseFloat(form.presupuesto) : null,
          refContrato: form.refContrato.trim() || null,
        }),
      })
      if (!r.ok) throw new Error()
      success("Guardado correctamente")
      onUpdate({ ...pp, ...form, prioridad: parseInt(form.prioridad), presupuesto: form.presupuesto ? parseFloat(form.presupuesto) : null, refContrato: form.refContrato.trim() || null })
    } catch {
      toastError("Error al guardar")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
    <form onSubmit={guardar} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Título</label>
          <input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
          <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
            {Object.entries({ NUEVO: "Nuevo", EN_CURSO: "En curso", PAUSADO: "Pausado", COMPLETADO: "Completado", CANCELADO: "Cancelado" }).map(([k, v]) =>
              <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Prioridad</label>
          <select value={form.prioridad} onChange={e => setForm(p => ({ ...p, prioridad: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
            <option value="0">Normal</option><option value="1">Alta</option><option value="2">Crítica</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Presupuesto (€)</label>
          <input type="number" step="0.01" value={form.presupuesto} onChange={e => setForm(p => ({ ...p, presupuesto: e.target.value }))}
            placeholder="0.00"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Inicio planificado</label>
          <input type="date" value={form.fechaInicio} onChange={e => setForm(p => ({ ...p, fechaInicio: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Fin planificado</label>
          <input type="date" value={form.fechaFinPlan} onChange={e => setForm(p => ({ ...p, fechaFinPlan: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Fin real</label>
          <input type="date" value={form.fechaFinReal} onChange={e => setForm(p => ({ ...p, fechaFinReal: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción</label>
          <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} rows={3}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas internas</label>
          <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={3}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Referencia de contrato</label>
          <input
            value={form.refContrato}
            onChange={e => setForm(p => ({ ...p, refContrato: e.target.value }))}
            placeholder="Ej. EXP-2025-0042, Contrato 456/2025…"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <p className="text-xs text-gray-400 mt-1">Número de expediente, licitación o referencia del contrato asociado</p>
        </div>
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={guardando}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: TEAL }}>
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>

    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-gray-100" />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Comentarios del equipo
        </span>
        <div className="h-px flex-1 bg-gray-100" />
      </div>
      <ComentariosInInfo ppId={pp.id} />
    </div>
    </>
  )
}
