"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { TEAL } from "@/lib/brand"
import { useToast } from "@/components/Toast"
import type { Proyecto, HardwareUnidad, Solicitud } from "../types"
import { HW_TIPO_LABEL, HW_ESTADO, SOLICITUD_ESTADO } from "../types"

interface CatalogoItemPicker {
  id: string; tipo: string; marca: string; modelo: string
  _stock: { total: number; disponibles: number; asignados: number }
}
interface UnidadDisponible {
  id: string; numSerie: string | null; notas: string | null
}

function SolicitudRow({ sol, ppId, onEstadoChange }: {
  sol: Solicitud; ppId: string; onEstadoChange: (id: string, estado: string) => void
}) {
  const { success, error: toastError } = useToast()
  const [saving, setSaving] = useState(false)

  async function cambiarEstado(nuevoEstado: string) {
    setSaving(true)
    try {
      const r = await fetch(`/api/proyectos/${ppId}/solicitudes/${sol.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      if (!r.ok) throw new Error()
      onEstadoChange(sol.id, nuevoEstado)
      success("Estado actualizado")
    } catch { toastError("Error al actualizar") }
    finally { setSaving(false) }
  }

  const est = SOLICITUD_ESTADO[sol.estado] ?? { label: sol.estado, color: "#6b7280", bg: "#f3f4f6" }
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{sol.titulo}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(sol.fechaSolicitud).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
            {sol.lineas.length > 0 && ` · ${sol.lineas.length} línea${sol.lineas.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <select
          value={sol.estado}
          onChange={e => cambiarEstado(e.target.value)}
          disabled={saving}
          className="text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-400 shrink-0 border-0 appearance-none"
          style={{ backgroundColor: est.bg, color: est.color, minWidth: "fit-content" }}>
          {Object.entries(SOLICITUD_ESTADO).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

export function TabMateriales({ pp, onUpdate }: { pp: Proyecto; onUpdate: (p: Proyecto) => void }) {
  const { success, error: toastError } = useToast()
  const [mostrarPicker, setMostrarPicker] = useState(false)
  const [catalogo, setCatalogo] = useState<CatalogoItemPicker[]>([])
  const [catalogoId, setCatalogoId] = useState("")
  const [unidadesDisp, setUnidadesDisp] = useState<UnidadDisponible[]>([])
  const [loadingUnidades, setLoadingUnidades] = useState(false)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [asignando, setAsignando] = useState(false)
  const [modoGestion, setModoGestion] = useState(false)
  const [selDesasign, setSelDesasign] = useState<Set<string>>(new Set())

  function toggleDesasign(id: string) {
    setSelDesasign(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function desasignarSeleccionados() {
    if (selDesasign.size === 0) return
    setAsignando(true)
    try {
      await Promise.all(
        Array.from(selDesasign).map(id =>
          fetch(`/api/hardware/unidades/${id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ proyectoId: null, estado: "DISPONIBLE" }),
          })
        )
      )
      const ids = selDesasign
      onUpdate({ ...pp, hardwareUnidades: pp.hardwareUnidades.filter(u => !ids.has(u.id)) })
      setSelDesasign(new Set()); setModoGestion(false)
      success(`${ids.size} unidad${ids.size !== 1 ? "es" : ""} desasignada${ids.size !== 1 ? "s" : ""}`)
    } catch {
      toastError("Error al desasignar")
    } finally {
      setAsignando(false)
    }
  }

  useEffect(() => {
    fetch("/api/hardware").then(r => r.json()).then(data => {
      setCatalogo(Array.isArray(data) ? data : [])
    })
  }, [])

  async function onModelChange(id: string) {
    setCatalogoId(id)
    setSeleccionados(new Set())
    setUnidadesDisp([])
    if (!id) return
    setLoadingUnidades(true)
    try {
      const r = await fetch(`/api/hardware/unidades?catalogoId=${id}&estado=DISPONIBLE`)
      const data = await r.json()
      setUnidadesDisp(Array.isArray(data) ? data : [])
    } finally {
      setLoadingUnidades(false)
    }
  }

  function toggleSeleccion(id: string) {
    setSeleccionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function confirmarAsignacion() {
    if (seleccionados.size === 0) return
    setAsignando(true)
    try {
      const r = await fetch("/api/hardware/unidades", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(seleccionados),
          proyectoId: pp.id,
          hospitalId: pp.hospital.id,
          estado: "ASIGNADO",
        }),
      })
      if (!r.ok) throw new Error()
      const asignadas: HardwareUnidad[] = await r.json()
      onUpdate({ ...pp, hardwareUnidades: [...pp.hardwareUnidades, ...asignadas] })
      cerrarPicker()
      success(`${asignadas.length} unidad${asignadas.length !== 1 ? "es" : ""} asignada${asignadas.length !== 1 ? "s" : ""}`)
    } catch {
      toastError("Error al asignar")
    } finally {
      setAsignando(false)
    }
  }

  function cerrarPicker() {
    setMostrarPicker(false)
    setCatalogoId("")
    setUnidadesDisp([])
    setSeleccionados(new Set())
  }

  async function desasignarHW(unidadId: string) {
    try {
      await fetch(`/api/hardware/unidades/${unidadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proyectoId: null, estado: "DISPONIBLE" }),
      })
      onUpdate({ ...pp, hardwareUnidades: pp.hardwareUnidades.filter(u => u.id !== unidadId) })
      success("Hardware desasignado")
    } catch {
      toastError("Error")
    }
  }

  const byTipo = pp.hardwareUnidades.reduce<Record<string, HardwareUnidad[]>>((acc, u) => {
    const t = u.catalogo.tipo
    if (!acc[t]) acc[t] = []
    acc[t].push(u)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-gray-900">Materiales asignados</h3>
        <div className="flex items-center gap-2">
          {pp.hardwareUnidades.length > 0 && (
            <button onClick={() => { setModoGestion(g => !g); setSelDesasign(new Set()) }}
              className="px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors"
              style={modoGestion
                ? { backgroundColor: "#fef2f2", borderColor: "#fecaca", color: "#dc2626" }
                : { borderColor: "#e5e7eb", color: "#6b7280" }}>
              {modoGestion ? "Cancelar" : "Gestionar"}
            </button>
          )}
          <button onClick={() => setMostrarPicker(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Añadir
          </button>
        </div>
      </div>

      {mostrarPicker && (
        <div className="bg-white rounded-2xl border border-teal-200 p-5 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-3">Seleccionar del stock disponible</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Modelo</label>
              <select value={catalogoId} onChange={e => onModelChange(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
                <option value="">Seleccionar modelo…</option>
                {catalogo.map(c => (
                  <option key={c.id} value={c.id} disabled={c._stock.disponibles === 0}>
                    {HW_TIPO_LABEL[c.tipo] ?? c.tipo} — {c.marca} {c.modelo}
                    {c._stock.disponibles > 0 ? ` (${c._stock.disponibles} disp.)` : " — sin stock"}
                  </option>
                ))}
              </select>
            </div>

            {catalogoId && (
              loadingUnidades ? (
                <p className="text-sm text-gray-400">Cargando stock…</p>
              ) : unidadesDisp.length === 0 ? (
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-700">
                  Sin unidades disponibles para este modelo.{" "}
                  <Link href="/admin/configuracion" className="font-medium underline hover:text-amber-800">
                    Añadir stock en Configuración
                  </Link>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-600">Unidades disponibles</label>
                    <span className="text-xs text-gray-400">{seleccionados.size} seleccionada{seleccionados.size !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {unidadesDisp.map(u => (
                      <label key={u.id}
                        className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
                        style={seleccionados.has(u.id) ? { borderColor: TEAL, backgroundColor: `${TEAL}08` } : { borderColor: "#e5e7eb", backgroundColor: "#fff" }}>
                        <input type="checkbox" checked={seleccionados.has(u.id)} onChange={() => toggleSeleccion(u.id)}
                          className="w-4 h-4 rounded accent-teal-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          {u.numSerie ? (
                            <span className="text-xs font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded">S/N: {u.numSerie}</span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Sin número de serie</span>
                          )}
                          {u.notas && <p className="text-xs text-gray-400 mt-0.5">{u.notas}</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={cerrarPicker}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="button" onClick={confirmarAsignacion} disabled={asignando || seleccionados.size === 0}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: TEAL }}>
              {asignando ? "Asignando…" : `Asignar ${seleccionados.size || ""} unidad${seleccionados.size !== 1 ? "es" : ""}`}
            </button>
          </div>
        </div>
      )}

      {pp.hardwareUnidades.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-sm">Sin materiales asignados a este proyecto</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byTipo).map(([tipo, unidades]) => (
            <div key={tipo}>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                {HW_TIPO_LABEL[tipo] ?? tipo} <span className="text-gray-400 font-normal">({unidades.length})</span>
              </h4>
              <div className="space-y-2">
                {unidades.map(u => {
                  const hw = HW_ESTADO[u.estado] ?? { label: u.estado, color: "#6b7280", bg: "#f3f4f6" }
                  const seleccionadoDesasign = selDesasign.has(u.id)
                  return (
                    <div key={u.id}
                      className="flex items-center justify-between bg-white rounded-xl border p-3.5 transition-colors"
                      style={{ borderColor: seleccionadoDesasign ? "#fca5a5" : "#f3f4f6", backgroundColor: seleccionadoDesasign ? "#fff5f5" : "white" }}>
                      {modoGestion && (
                        <input type="checkbox" checked={seleccionadoDesasign} onChange={() => toggleDesasign(u.id)}
                          className="w-4 h-4 rounded mr-3 shrink-0 accent-red-500" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: hw.bg, color: hw.color }}>{hw.label}</span>
                          {u.numSerie && <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">S/N: {u.numSerie}</span>}
                        </div>
                        <p className="text-sm font-medium text-gray-900">{u.catalogo.marca} {u.catalogo.modelo}</p>
                        {u.notas && <p className="text-xs text-gray-400 mt-0.5">{u.notas}</p>}
                      </div>
                      {!modoGestion && (
                      <button onClick={() => desasignarHW(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors ml-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk desasign bar */}
      {modoGestion && (
        <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <span className="text-sm text-red-600">
            {selDesasign.size === 0 ? "Selecciona unidades para desasignar" : `${selDesasign.size} unidad${selDesasign.size !== 1 ? "es" : ""} seleccionada${selDesasign.size !== 1 ? "s" : ""}`}
          </span>
          <button onClick={desasignarSeleccionados} disabled={asignando || selDesasign.size === 0}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: "#dc2626" }}>
            {asignando ? "Desasignando…" : "Desasignar"}
          </button>
        </div>
      )}

      {/* Solicitudes de material */}
      {pp.solicitudes.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3">Solicitudes de material <span className="text-xs font-normal text-gray-400">({pp.solicitudes.length})</span></h3>
          <div className="space-y-2">
            {pp.solicitudes.map(sol => (
              <SolicitudRow key={sol.id} sol={sol} ppId={pp.id} onEstadoChange={(id, estado) =>
                onUpdate({ ...pp, solicitudes: pp.solicitudes.map(s => s.id === id ? { ...s, estado } : s) })
              }/>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

