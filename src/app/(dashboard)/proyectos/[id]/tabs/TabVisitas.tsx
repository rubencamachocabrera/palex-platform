"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { TEAL } from "@/lib/brand"
import { useToast } from "@/components/Toast"
import type { Proyecto } from "../types"
import { fmtFecha, VISITA_ESTADO_COLOR } from "../types"

export function TabVisitas({ pp, onUpdate }: { pp: Proyecto; onUpdate: (p: Proyecto) => void }) {
  const router = useRouter()
  const { error: toastError } = useToast()
  const estadoColor = (e: string) => VISITA_ESTADO_COLOR[e] ?? "#6b7280"
  const [mostrarCrear, setMostrarCrear] = useState(false)
  const [tipoCrear, setTipoCrear] = useState("PROYECTOS")
  const [creando, setCreando] = useState(false)
  const [filtroVisita, setFiltroVisita] = useState("TODAS")

  const visitasFiltradas = filtroVisita === "TODAS"
    ? pp.visitas
    : pp.visitas.filter(v => v.estado === filtroVisita)

  async function crearVisita() {
    setCreando(true)
    try {
      const r = await fetch("/api/visitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalId: pp.hospital.id, tipo: tipoCrear, proyectoId: pp.id }),
      })
      if (!r.ok) throw new Error()
      const nueva = await r.json()
      onUpdate({ ...pp, visitas: [{ id: nueva.id, fecha: nueva.fecha, estado: nueva.estado, tipo: nueva.tipo, usuario: { nombre: "" } }, ...pp.visitas] })
      router.push(`/visitas/${nueva.id}`)
    } catch {
      toastError("Error al crear la visita")
    } finally {
      setCreando(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Visitas vinculadas</h3>
        <div className="flex items-center gap-2">
          <Link href={`/visitas?proyectoId=${pp.id}`}
            className="text-sm text-gray-400 hover:text-teal-600 font-medium transition-colors">Ver todas</Link>
          <button onClick={() => setMostrarCrear(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl text-white transition-colors"
            style={{ backgroundColor: TEAL }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Visita
          </button>
        </div>
      </div>

      {/* Filtros de estado */}
      {pp.visitas.length > 0 && (
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {(["TODAS", "BORRADOR", "COMPLETADA", "ARCHIVADA"] as const).map(e => {
            const color = e === "TODAS" ? "#6b7280" : (VISITA_ESTADO_COLOR[e] ?? "#6b7280")
            const active = filtroVisita === e
            const count = e === "TODAS" ? pp.visitas.length : pp.visitas.filter(v => v.estado === e).length
            if (e !== "TODAS" && count === 0) return null
            return (
              <button key={e} onClick={() => setFiltroVisita(e)}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                style={active
                  ? { backgroundColor: color + "18", borderColor: color, color }
                  : { backgroundColor: "#f9fafb", borderColor: "#e5e7eb", color: "#9ca3af" }}>
                {e === "TODAS" ? "Todas" : e === "BORRADOR" ? "Borrador" : e === "COMPLETADA" ? "Completada" : "Archivada"}
                <span className="ml-1 opacity-70">{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {mostrarCrear && (
        <div className="bg-white rounded-2xl border border-teal-200 p-5 shadow-sm mb-4">
          <h4 className="font-semibold text-gray-900 mb-3">Nueva visita vinculada</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo de visita</label>
              <div className="flex gap-2">
                {["PROYECTOS", "VENTAS"].map(t => (
                  <button key={t} type="button" onClick={() => setTipoCrear(t)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      tipoCrear === t ? "text-white" : "bg-white text-gray-700 border-gray-200"
                    }`}
                    style={tipoCrear === t ? { backgroundColor: TEAL, borderColor: TEAL } : undefined}>
                    {t === "PROYECTOS" ? "Proyectos" : "Ventas"}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-400">Se creará en borrador vinculada a <span className="font-medium text-gray-600">{pp.hospital.nombre}</span></p>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setMostrarCrear(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={crearVisita} disabled={creando}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: TEAL }}>
              {creando ? "Creando…" : "Crear y abrir"}
            </button>
          </div>
        </div>
      )}

      {pp.visitas.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Sin visitas vinculadas</p>
          <p className="text-xs mt-1">Crea una nueva visita con el botón de arriba</p>
        </div>
      ) : visitasFiltradas.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-sm">Sin visitas con estado <span className="font-medium">{filtroVisita.toLowerCase()}</span></p>
        </div>
      ) : (
        <div className="space-y-2">
          {visitasFiltradas.map(v => (
            <Link key={v.id} href={`/visitas/${v.id}`}
              className="flex items-center justify-between bg-white rounded-xl border border-gray-100 p-4 hover:border-teal-200 transition-colors group">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                    backgroundColor: estadoColor(v.estado) + "18",
                    color: estadoColor(v.estado),
                  }}>
                    {v.estado}
                  </span>
                  <span className="text-xs text-gray-400">{v.tipo}</span>
                </div>
                <p className="text-sm font-medium text-gray-900">{fmtFecha(v.fecha)}</p>
                <p className="text-xs text-gray-400">{v.usuario.nombre}</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="text-gray-300 group-hover:text-teal-400 transition-colors">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

