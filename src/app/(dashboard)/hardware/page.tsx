"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { TEAL, ORANGE } from "@/lib/brand"
import { exportarCSV } from "@/lib/csv"
import { useToast } from "@/components/Toast"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface HardwareTipo {
  id: string; nombre: string; color: string
}
interface CatalogoDoc {
  id: string; nombre: string; tipo: string; tamano: number; creadoEn: string
}
interface HardwareCatalogo {
  id: string
  tipoId: string | null
  tipo: HardwareTipo | null
  marca: string; modelo: string
  referenciaPalex: string | null
  proveedor: string | null
  descripcion: string | null; precio: number | null; fichaUrl: string | null
  activo: boolean
  _stock?: { total: number; disponibles: number; asignados: number; mantenimiento: number }
}
interface HardwareUnidad {
  id: string; numSerie: string | null; estado: string; notas: string | null
  creadoEn: string; fechaCompra: string | null; fechaGarantia: string | null
  proximoMantenimiento: string | null
  catalogo: HardwareCatalogo
  hospital: { id: string; nombre: string; ciudad: string } | null
  proyecto: { id: string; titulo: string } | null
}

// ─── Constantes ───────────────────────────────────────────────────────────────

// tipos se carga dinámicamente desde /api/hardware/tipos
function tipoLabel(c: HardwareCatalogo): string { return c.tipo?.nombre ?? "Sin tipo" }

const HW_ESTADO: Record<string, { label: string; color: string; bg: string }> = {
  DISPONIBLE:       { label: "Disponible",    color: "#16a34a", bg: "#f0fdf4" },
  ASIGNADO:         { label: "Asignado",      color: TEAL,      bg: `${TEAL}18` },
  EN_MANTENIMIENTO: { label: "Mantenimiento", color: "#d97706", bg: "#fef3c7" },
  RETIRADO:         { label: "Retirado",      color: "#6b7280", bg: "#f3f4f6" },
  BAJA:             { label: "Baja",          color: "#dc2626", bg: "#fef2f2" },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtFecha(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}
function diasHasta(s: string | null) {
  if (!s) return null
  return Math.ceil((new Date(s).getTime() - Date.now()) / 86400000)
}
function diasDesde(s: string | null) {
  if (!s) return null
  return Math.floor((Date.now() - new Date(s).getTime()) / 86400000)
}
function fmtAntiguedad(s: string | null) {
  const d = diasDesde(s)
  if (d === null) return "—"
  if (d < 30) return `${d}d`
  const m = Math.floor(d / 30)
  if (m < 24) return `${m}m`
  const y = Math.floor(m / 12); const rm = m % 12
  return rm > 0 ? `${y}a ${rm}m` : `${y}a`
}
function fmtEuros(n: number) {
  return n.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
}

// ─── Iconos ───────────────────────────────────────────────────────────────────

function IcoPlus() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function IcoEdit() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function IcoTrash() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg> }
function IcoChevron({ open }: { open: boolean }) { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }}><polyline points="6 9 12 15 18 9"/></svg> }
function IcoDownload() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
function IcoSearch() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function IcoWarning() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> }
function IcoGrid() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> }
function IcoList() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> }
function IcoHospital() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> }
function IcoCheck() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> }
function IcoSort({ dir }: { dir: "asc"|"desc"|null }) {
  if (!dir) return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>
  return dir === "asc"
    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5l-7 7h14z"/></svg>
    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19l7-7H5z"/></svg>
}
function IcoX()      { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
function IcoLink()   { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> }
function IcoShield() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
function IcoTag()    { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> }
function IcoBox()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> }
function IcoGear()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> }

// ─── DonutChart ──────────────────────────────────────────────────────────────

function DonutChart({ segments, total }: {
  segments: { label: string; count: number; color: string }[]
  total: number
}) {
  const nonZero = segments.filter(s => s.count > 0)
  if (total === 0 || nonZero.length === 0) {
    return (
      <div className="flex items-center justify-center">
        <div style={{ width: 140, height: 140, borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="text-xs text-gray-400">Sin datos</span>
        </div>
      </div>
    )
  }
  let acc = 0
  const stops = nonZero.map(s => {
    const from = acc; acc += (s.count / total) * 100
    return `${s.color} ${from.toFixed(2)}% ${acc.toFixed(2)}%`
  }).join(", ")
  return (
    <div className="flex items-center gap-5 flex-wrap">
      <div style={{ position: "relative", width: 140, height: 140, borderRadius: "50%", background: `conic-gradient(${stops})`, flexShrink: 0 }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 86, height: 86, borderRadius: "50%", background: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#111827", lineHeight: 1 }}>{total}</span>
          <span style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>total</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 min-w-0">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: s.color, flexShrink: 0 }} />
            <span className="text-xs text-gray-600 truncate">{s.label}</span>
            <span className="text-xs font-bold text-gray-800 ml-auto pl-3">{s.count}</span>
            <span className="text-xs text-gray-400 w-9 text-right">{total > 0 ? Math.round((s.count / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Shared input class ───────────────────────────────────────────────────────
const INPUT = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
const LABEL = "block text-xs font-medium text-gray-600 mb-1"

// ─── Tab: Resumen ─────────────────────────────────────────────────────────────

function ResumenTab({ unidades, catalogo, onTabChange }: {
  unidades: HardwareUnidad[]
  catalogo: HardwareCatalogo[]
  onTabChange: (t: string) => void
}) {
  const total         = unidades.length
  const disponibles   = unidades.filter(u => u.estado === "DISPONIBLE").length
  const asignados     = unidades.filter(u => u.estado === "ASIGNADO").length
  const mantenimiento = unidades.filter(u => u.estado === "EN_MANTENIMIENTO").length
  const retirado      = unidades.filter(u => u.estado === "RETIRADO").length
  const baja          = unidades.filter(u => u.estado === "BAJA").length

  // KPIs financieros
  const valorTotal    = unidades.reduce((s, u) => s + (u.catalogo.precio ?? 0), 0)
  const valorEnCampo  = unidades.filter(u => u.estado === "ASIGNADO").reduce((s, u) => s + (u.catalogo.precio ?? 0), 0)
  const pctUtil       = total > 0 ? Math.round((asignados / total) * 100) : 0
  const pctCobertura  = total > 0 ? Math.round((unidades.filter(u => u.fechaGarantia).length / total) * 100) : 0

  // Antigüedad media parque asignado
  const asigConCompra = unidades.filter(u => u.estado === "ASIGNADO" && u.fechaCompra)
  const antigMediaMeses = asigConCompra.length > 0
    ? Math.round(asigConCompra.reduce((s, u) => s + (diasDesde(u.fechaCompra) ?? 0) / 30, 0) / asigConCompra.length)
    : 0

  // Top hospitales
  const topHospMap: Record<string, { id: string; nombre: string; ciudad: string; count: number; valor: number }> = {}
  unidades.forEach(u => {
    if (!u.hospital) return
    if (!topHospMap[u.hospital.id]) topHospMap[u.hospital.id] = { id: u.hospital.id, nombre: u.hospital.nombre, ciudad: u.hospital.ciudad, count: 0, valor: 0 }
    topHospMap[u.hospital.id].count++
    topHospMap[u.hospital.id].valor += u.catalogo.precio ?? 0
  })
  const topHosp = Object.values(topHospMap).sort((a, b) => b.count - a.count).slice(0, 7)
  const maxHosp = Math.max(...topHosp.map(h => h.count), 1)

  // Calendario 12 meses de garantías
  const meses12 = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + i)
    return { y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleDateString("es-ES", { month: "short" }) }
  })
  const calData = meses12.map(mes => ({
    label: mes.label,
    count: unidades.filter(u => {
      if (!u.fechaGarantia) return false
      const fg = new Date(u.fechaGarantia)
      return fg.getFullYear() === mes.y && fg.getMonth() === mes.m
    }).length,
    esActual: mes.y === new Date().getFullYear() && mes.m === new Date().getMonth(),
  }))
  const maxCal = Math.max(...calData.map(c => c.count), 1)

  const garantiaProxima = unidades
    .filter(u => u.fechaGarantia && (diasHasta(u.fechaGarantia) ?? 999) <= 90 && (diasHasta(u.fechaGarantia) ?? 999) >= 0)
    .sort((a, b) => new Date(a.fechaGarantia!).getTime() - new Date(b.fechaGarantia!).getTime())
    .slice(0, 5)

  const kpis1 = [
    { label: "Total unidades",  value: total,         color: "#111827",  bg: "#f9fafb" },
    { label: "Disponibles",     value: disponibles,   color: "#16a34a",  bg: "#f0fdf4" },
    { label: "Asignados",       value: asignados,     color: TEAL,       bg: `${TEAL}10` },
    { label: "Mantenimiento",   value: mantenimiento, color: "#d97706",  bg: "#fef3c7" },
    { label: "Baja / Retirado", value: baja + retirado, color: "#dc2626", bg: "#fef2f2" },
  ]

  return (
    <div className="space-y-5">
      {/* Fila 1: KPIs de estado */}
      <div className="stagger-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis1.map(k => (
          <div key={k.label} className="card-hover bg-white rounded-2xl border border-gray-100 p-5 shadow-sm" style={{ borderTop: `3px solid ${k.color}` }}>
            <p className="text-3xl font-bold number-reveal" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs font-medium text-gray-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Fila 2: KPIs financieros */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Valor total parque</p>
          <p className="text-2xl font-bold text-gray-900">{valorTotal > 0 ? fmtEuros(valorTotal) : "—"}</p>
          <p className="text-xs text-gray-400 mt-0.5">coste total inventario</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Valor en campo</p>
          <p className="text-2xl font-bold" style={{ color: TEAL }}>{valorEnCampo > 0 ? fmtEuros(valorEnCampo) : "—"}</p>
          <p className="text-xs text-gray-400 mt-0.5">hardware instalado en clientes</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Utilización</p>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-gray-900">{pctUtil}%</p>
            <div className="flex-1 mb-1">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pctUtil}%`, backgroundColor: pctUtil > 80 ? "#16a34a" : pctUtil > 50 ? TEAL : "#d97706" }} />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{asignados} de {total} unidades asignadas</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Antigüedad media</p>
          <p className="text-2xl font-bold text-gray-900">{antigMediaMeses > 0 ? `${antigMediaMeses}m` : "—"}</p>
          <p className="text-xs text-gray-400 mt-0.5">parque instalado · {pctCobertura}% con garantía</p>
        </div>
      </div>

      {/* Fila 3: Donut + Top hospitales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Estado del parque</h3>
          <DonutChart
            total={total}
            segments={[
              { label: "Disponible",    count: disponibles,   color: "#16a34a" },
              { label: "Asignado",      count: asignados,     color: TEAL },
              { label: "Mantenimiento", count: mantenimiento, color: "#d97706" },
              { label: "Retirado",      count: retirado,      color: "#9ca3af" },
              { label: "Baja",          count: baja,          color: "#dc2626" },
            ]}
          />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Top clientes por equipamiento</h3>
            <button onClick={() => onTabChange("instalaciones")} className="text-xs font-medium hover:underline" style={{ color: TEAL }}>Ver todos</button>
          </div>
          {topHosp.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin equipamiento asignado a hospitales</p>
          ) : (
            <div className="space-y-2.5">
              {topHosp.map((h, i) => (
                <div key={h.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-300 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <Link href={`/hospitales/${h.id}`} className="text-xs font-semibold text-gray-800 truncate hover:underline" style={{ maxWidth: "60%" }}>{h.nombre}</Link>
                      <span className="text-xs text-gray-500 shrink-0">{h.count} ud{h.count !== 1 ? "s" : ""}{h.valor > 0 ? ` · ${fmtEuros(h.valor)}` : ""}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(h.count / maxHosp) * 100}%`, backgroundColor: TEAL }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fila 4: Calendario 12 meses garantías */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Vencimientos de garantía — próximos 12 meses</h3>
            <p className="text-xs text-gray-400 mt-0.5">Unidades cuya garantía expira cada mes</p>
          </div>
          <button onClick={() => onTabChange("alertas")} className="text-xs font-medium hover:underline" style={{ color: TEAL }}>Ver alertas</button>
        </div>
        <div className="flex items-end gap-1.5 h-24">
          {calData.map((mes, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: 72 }}>
                {mes.count > 0 ? (
                  <div
                    className="w-full rounded-t-md transition-all duration-500 relative group"
                    style={{ height: `${Math.max(8, (mes.count / maxCal) * 68)}px`, backgroundColor: mes.esActual ? TEAL : i <= 1 ? "#fca5a5" : i <= 2 ? "#fcd34d" : "#c7d2fe" }}>
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-600">{mes.count}</span>
                  </div>
                ) : (
                  <div className="w-full rounded-t-md" style={{ height: 4, backgroundColor: "#f3f4f6" }} />
                )}
              </div>
              <span className="text-[9px] text-gray-400 font-medium">{mes.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fila 5: Garantías próximas + catálogo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Garantías próximas a vencer</h3>
            {garantiaProxima.length > 0 && (
              <button onClick={() => onTabChange("alertas")} className="text-xs font-medium hover:underline" style={{ color: TEAL }}>Ver todas</button>
            )}
          </div>
          {garantiaProxima.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-5 text-center">
              <div className="w-9 h-9 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: `${TEAL}18` }}>
                <IcoCheck />
              </div>
              <p className="text-sm font-medium text-gray-700">Sin vencimientos próximos</p>
              <p className="text-xs text-gray-400 mt-0.5">Ninguna garantía vence en 90 días</p>
            </div>
          ) : (
            <div className="space-y-2">
              {garantiaProxima.map(u => {
                const dias = diasHasta(u.fechaGarantia)!
                const urgente = dias <= 30
                return (
                  <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ backgroundColor: urgente ? "#fef2f2" : "#fef3c7" }}>
                    <span style={{ color: urgente ? "#dc2626" : "#d97706" }}><IcoWarning /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{u.catalogo.marca} {u.catalogo.modelo}</p>
                      <p className="text-xs text-gray-500">{u.numSerie ? `S/N: ${u.numSerie}` : "Sin nº serie"} · {u.hospital?.nombre ?? u.proyecto?.titulo ?? "—"}</p>
                    </div>
                    <span className="text-xs font-bold shrink-0" style={{ color: urgente ? "#dc2626" : "#d97706" }}>{dias === 0 ? "Hoy" : `${dias}d`}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Catálogo de modelos</h3>
            <button onClick={() => onTabChange("materiales")} className="text-xs font-medium hover:underline" style={{ color: TEAL }}>Gestionar materiales</button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {catalogo.slice(0, 6).map(c => (
              <div key={c.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50 hover:border-teal-200 transition-colors">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{tipoLabel(c)}</span>
                <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{c.marca} {c.modelo}</p>
                <div className="flex items-center gap-2 mt-1.5 text-xs">
                  <span className="text-green-700 font-medium">{c._stock?.disponibles ?? 0} disp.</span>
                  <span className="text-gray-400">{c._stock?.total ?? 0} total</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Instalaciones ───────────────────────────────────────────────────────

type SaludParque = "ok" | "alerta" | "critico"

function salud(uds: HardwareUnidad[]): SaludParque {
  if (uds.some(u => u.estado === "BAJA" || (u.fechaGarantia && (diasHasta(u.fechaGarantia) ?? 999) < 0))) return "critico"
  if (uds.some(u => u.estado === "EN_MANTENIMIENTO" || (u.fechaGarantia && (diasHasta(u.fechaGarantia) ?? 999) <= 30))) return "alerta"
  return "ok"
}
const SALUD_META: Record<SaludParque, { label: string; color: string; bg: string; dot: string }> = {
  ok:      { label: "OK",      color: "#16a34a", bg: "#f0fdf4", dot: "#16a34a" },
  alerta:  { label: "Alerta",  color: "#d97706", bg: "#fef3c7", dot: "#d97706" },
  critico: { label: "Crítico", color: "#dc2626", bg: "#fef2f2", dot: "#dc2626" },
}

function InstalacionesTab({ unidades, onUpdated, tipos }: {
  unidades: HardwareUnidad[]
  onUpdated: (u: HardwareUnidad) => void
  tipos: HardwareTipo[]
}) {
  const [q, setQ] = useState("")
  const [filtroSalud, setFiltroSalud] = useState<"" | SaludParque>("")
  const [filtroTipo, setFiltroTipo] = useState("")
  const [expandido, setExpandido] = useState<string | null>(null)

  // Agrupar por hospital
  const byHosp: Record<string, { hospital: { id: string; nombre: string; ciudad: string }; uds: HardwareUnidad[] }> = {}
  const huerfanos: HardwareUnidad[] = []
  const enProyecto: HardwareUnidad[] = []

  unidades.forEach(u => {
    if (u.hospital) {
      if (!byHosp[u.hospital.id]) byHosp[u.hospital.id] = { hospital: u.hospital, uds: [] }
      byHosp[u.hospital.id].uds.push(u)
    } else if (u.proyecto) {
      enProyecto.push(u)
    } else if (u.estado === "ASIGNADO") {
      huerfanos.push(u)
    }
  })

  const hospitalesData = Object.values(byHosp)
    .map(h => ({ ...h, s: salud(h.uds) }))
    .filter(h => {
      const matchQ = !q || h.hospital.nombre.toLowerCase().includes(q.toLowerCase()) || h.hospital.ciudad.toLowerCase().includes(q.toLowerCase())
      const matchSalud = !filtroSalud || h.s === filtroSalud
      const matchTipo = !filtroTipo || h.uds.some(u => u.catalogo.tipoId === filtroTipo)
      return matchQ && matchSalud && matchTipo
    })
    .sort((a, b) => b.uds.length - a.uds.length)

  function exportarHospital(hospital: { nombre: string }, uds: HardwareUnidad[]) {
    exportarCSV(uds.map(u => ({
      Tipo: tipoLabel(u.catalogo),
      Marca: u.catalogo.marca, Modelo: u.catalogo.modelo,
      "Nº Serie": u.numSerie ?? "",
      Estado: HW_ESTADO[u.estado]?.label ?? u.estado,
      "Fecha Compra": fmtFecha(u.fechaCompra),
      "Fin Garantía": fmtFecha(u.fechaGarantia),
      "Próx. Mantenimiento": fmtFecha(u.proximoMantenimiento),
      "Precio (€)": u.catalogo.precio ?? "",
      Notas: u.notas ?? "",
    })), `hardware_${hospital.nombre.replace(/\s+/g, "_").toLowerCase()}`)
  }

  const totalInstalado = Object.values(byHosp).reduce((s, h) => s + h.uds.length, 0)
  const totalValor = Object.values(byHosp).reduce((s, h) => s + h.uds.reduce((sv, u) => sv + (u.catalogo.precio ?? 0), 0), 0)

  return (
    <div className="space-y-4">
      {/* Resumen rápido */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{Object.keys(byHosp).length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Hospitales con hardware</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: TEAL }}>{totalInstalado}</p>
          <p className="text-xs text-gray-500 mt-0.5">Unidades instaladas</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{totalValor > 0 ? fmtEuros(totalValor) : "—"}</p>
          <p className="text-xs text-gray-500 mt-0.5">Valor total en campo</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><IcoSearch /></span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar hospital o ciudad…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        <select value={filtroSalud} onChange={e => setFiltroSalud(e.target.value as ""| SaludParque)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
          <option value="">Todos los estados</option>
          <option value="ok">OK</option>
          <option value="alerta">Alerta</option>
          <option value="critico">Crítico</option>
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
          <option value="">Todos los tipos</option>
          {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
      </div>

      {/* Cards hospitales */}
      {hospitalesData.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-2xl border border-gray-100">
          <p className="text-sm font-medium text-gray-600">{Object.keys(byHosp).length === 0 ? "Sin hardware asignado a hospitales" : "Sin resultados para los filtros"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {hospitalesData.map(({ hospital, uds, s }) => {
            const meta = SALUD_META[s]
            const isOpen = expandido === hospital.id
            const byEstado = Object.entries(HW_ESTADO).map(([k, v]) => ({ k, v, n: uds.filter(u => u.estado === k).length })).filter(x => x.n > 0)
            const valorHosp = uds.reduce((sv, u) => sv + (u.catalogo.precio ?? 0), 0)
            const alertasHosp = uds.filter(u => {
              const d = diasHasta(u.fechaGarantia); return (d !== null && d <= 30) || u.estado === "EN_MANTENIMIENTO" || u.estado === "BAJA"
            }).length
            return (
              <div key={hospital.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpandido(isOpen ? null : hospital.id)}>
                  {/* Semáforo */}
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: meta.dot }} />
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/hospitales/${hospital.id}`} onClick={e => e.stopPropagation()}
                        className="text-sm font-bold text-gray-900 hover:underline">{hospital.nombre}</Link>
                      <span className="text-xs text-gray-400">{hospital.ciudad}</span>
                      {alertasHosp > 0 && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}>
                          {alertasHosp} alerta{alertasHosp !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {byEstado.map(x => (
                        <span key={x.k} className="text-xs font-medium" style={{ color: x.v.color }}>{x.n} {x.v.label.toLowerCase()}</span>
                      ))}
                    </div>
                  </div>
                  {/* Stats */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{uds.length} ud{uds.length !== 1 ? "s" : ""}</p>
                    {valorHosp > 0 && <p className="text-xs text-gray-400">{fmtEuros(valorHosp)}</p>}
                  </div>
                  <IcoChevron open={isOpen} />
                </div>

                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50/30 px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{uds.length} unidades instaladas</p>
                      <button onClick={() => exportarHospital(hospital, uds)}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border border-gray-200 rounded-xl hover:bg-white transition-colors text-gray-600">
                        <IcoDownload />Exportar CSV
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-200">
                            <th className="text-left pb-2 font-medium">Tipo</th>
                            <th className="text-left pb-2 font-medium">Dispositivo</th>
                            <th className="text-left pb-2 font-medium">Nº serie</th>
                            <th className="text-left pb-2 font-medium">Estado</th>
                            <th className="text-left pb-2 font-medium">Antigüedad</th>
                            <th className="text-left pb-2 font-medium">Garantía</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uds.map(u => {
                            const es = HW_ESTADO[u.estado] ?? { label: u.estado, color: "#6b7280", bg: "#f3f4f6" }
                            const dias = diasHasta(u.fechaGarantia)
                            const gAlerta = dias !== null && dias <= 30
                            return (
                              <tr key={u.id} className="border-b border-gray-100 last:border-0">
                                <td className="py-2 pr-3">
                                  <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{tipoLabel(u.catalogo)}</span>
                                </td>
                                <td className="py-2 pr-3 font-medium text-gray-800">{u.catalogo.marca} {u.catalogo.modelo}</td>
                                <td className="py-2 pr-3">
                                  {u.numSerie ? <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{u.numSerie}</code> : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="py-2 pr-3">
                                  <span className="px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: es.bg, color: es.color }}>{es.label}</span>
                                </td>
                                <td className="py-2 pr-3 text-gray-500">{fmtAntiguedad(u.fechaCompra)}</td>
                                <td className={`py-2 ${gAlerta ? "text-red-600 font-semibold" : "text-gray-400"}`}>
                                  {u.fechaGarantia ? `${fmtFecha(u.fechaGarantia)}${gAlerta ? ` (${dias}d)` : ""}` : "—"}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* En proyecto */}
      {enProyecto.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">En proyecto ({enProyecto.length})</h3>
          <div className="space-y-1.5">
            {enProyecto.map(u => (
              <div key={u.id} className="flex items-center gap-3 text-xs text-gray-600">
                <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{tipoLabel(u.catalogo)}</span>
                <span className="font-medium">{u.catalogo.marca} {u.catalogo.modelo}</span>
                {u.numSerie && <code className="font-mono text-gray-400">{u.numSerie}</code>}
                <Link href={`/proyectos/${u.proyecto!.id}`} className="ml-auto hover:underline shrink-0" style={{ color: TEAL }}>{u.proyecto!.titulo}</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Huérfanos */}
      {huerfanos.length > 0 && (
        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <IcoWarning />
            <h3 className="text-sm font-semibold text-gray-700">Sin destino registrado ({huerfanos.length})</h3>
            <span className="text-xs text-gray-400">— Estado "Asignado" pero sin hospital ni proyecto vinculado</span>
          </div>
          <div className="space-y-1.5">
            {huerfanos.map(u => (
              <div key={u.id} className="flex items-center gap-3 text-xs">
                <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{tipoLabel(u.catalogo)}</span>
                <span className="font-medium text-gray-800">{u.catalogo.marca} {u.catalogo.modelo}</span>
                {u.numSerie && <code className="font-mono text-gray-400">{u.numSerie}</code>}
                <span className="ml-auto text-gray-400 shrink-0">{fmtFecha(u.creadoEn)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Colores preset para tipos ───────────────────────────────────────────────

const TIPO_COLORES_PRESET = ["#6366f1","#3b82f6","#06b6d4","#10b981","#f59e0b","#f97316","#ef4444","#8b5cf6","#ec4899","#6b7280"]

// ─── MaterialDrawer — crear / editar un modelo de catálogo ───────────────────

function fmtTamano(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

const CAT_FORM_EMPTY = { tipoId:"", marca:"", modelo:"", referenciaPalex:"", proveedor:"", descripcion:"", precio:"", garantiaMeses:"", fichaUrl:"" }

function MaterialDrawer({ tipos, item, onClose, onSaved }: {
  tipos: HardwareTipo[]
  item: HardwareCatalogo | null
  onClose: () => void
  onSaved: (saved: HardwareCatalogo) => void
}) {
  const { success, error: toastError } = useToast()
  const [form, setForm] = useState(item ? {
    tipoId: item.tipoId ?? "",
    marca: item.marca,
    modelo: item.modelo,
    referenciaPalex: item.referenciaPalex ?? "",
    proveedor: item.proveedor ?? "",
    descripcion: item.descripcion ?? "",
    precio: item.precio != null ? String(item.precio) : "",
    garantiaMeses: "",
    fichaUrl: item.fichaUrl ?? "",
  } : { ...CAT_FORM_EMPTY })
  const [saving, setSaving] = useState(false)
  const tipoSel = tipos.find(t => t.id === form.tipoId)

  // ── Documentos adjuntos ──────────────────────────────────────────────────
  const [docs,        setDocs]        = useState<CatalogoDoc[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [subiendo,    setSubiendo]    = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const cargarDocs = useCallback(async () => {
    if (!item) return
    setLoadingDocs(true)
    const r = await fetch(`/api/hardware/${item.id}/docs`)
    if (r.ok) setDocs(await r.json())
    setLoadingDocs(false)
  }, [item])

  useEffect(() => { if (item) cargarDocs() }, [item, cargarDocs])

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !item) return
    if (file.size > 20 * 1024 * 1024) { toastError("El archivo no puede superar 20 MB"); return }
    setSubiendo(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = () => resolve((reader.result as string).split(",")[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const r = await fetch(`/api/hardware/${item.id}/docs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: file.name, tipo: file.type || "application/octet-stream", tamano: file.size, contenido: base64 }),
      })
      if (!r.ok) throw new Error()
      const doc = await r.json()
      setDocs(p => [doc, ...p])
      success("Documento añadido")
    } catch { toastError("Error al subir el documento") }
    finally { setSubiendo(false); if (fileInputRef.current) fileInputRef.current.value = "" }
  }

  async function eliminarDoc(docId: string) {
    try {
      await fetch(`/api/hardware/docs/${docId}`, { method: "DELETE" })
      setDocs(p => p.filter(d => d.id !== docId))
      success("Documento eliminado")
    } catch { toastError("Error al eliminar") }
  }
  // ────────────────────────────────────────────────────────────────────────

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.marca.trim() || !form.modelo.trim()) { toastError("Marca y modelo son obligatorios"); return }
    setSaving(true)
    try {
      const payload = {
        tipoId: form.tipoId || null,
        marca: form.marca,
        modelo: form.modelo,
        referenciaPalex: form.referenciaPalex || null,
        proveedor: form.proveedor || null,
        descripcion: form.descripcion || null,
        precio: form.precio || null,
        fichaUrl: form.fichaUrl || null,
      }
      const r = item
        ? await fetch(`/api/hardware/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/hardware", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!r.ok) throw new Error()
      const saved = await r.json()
      onSaved(saved)
      success(item ? "Material actualizado" : "Material creado en catálogo")
      onClose()
    } catch { toastError("Error al guardar") }
    finally { setSaving(false) }
  }

  const FLDCLS = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-white placeholder:text-gray-300 transition-colors"
  const FLBL   = "block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5"
  const ringCss = { "--tw-ring-color": tipoSel?.color ?? TEAL } as React.CSSProperties

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0"
          style={{ borderTop: `3px solid ${tipoSel?.color ?? TEAL}` }}>
          <div>
            <h2 className="text-base font-bold text-gray-900">{item ? "Editar material" : "Nuevo material"}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{item ? `${item.marca} ${item.modelo}` : "Añadir al catálogo Palex"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer" aria-label="Cerrar">
            <IcoX />
          </button>
        </div>

        {/* Body scrollable */}
        <form id="mat-drawer-form" onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Tipo */}
          <div>
            <label className={FLBL}>Tipo de hardware</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {tipos.length === 0
                ? <p className="text-xs text-gray-400 italic">Sin tipos — créalos con el botón Tipos</p>
                : tipos.map(t => (
                  <button key={t.id} type="button"
                    onClick={() => set("tipoId", form.tipoId === t.id ? "" : t.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-150 cursor-pointer"
                    style={form.tipoId === t.id
                      ? { backgroundColor: t.color, borderColor: t.color, color: "white" }
                      : { backgroundColor: "white", borderColor: "#e5e7eb", color: "#374151" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", display: "inline-block", flexShrink: 0,
                      backgroundColor: form.tipoId === t.id ? "rgba(255,255,255,0.6)" : t.color }} />
                    {t.nombre}
                  </button>
                ))}
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Marca + Modelo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={FLBL}>Marca <span className="text-red-400">*</span></label>
              <input value={form.marca} onChange={e => set("marca", e.target.value)}
                placeholder="Zebra, Honeywell…" required className={FLDCLS} style={ringCss} />
            </div>
            <div>
              <label className={FLBL}>Modelo <span className="text-red-400">*</span></label>
              <input value={form.modelo} onChange={e => set("modelo", e.target.value)}
                placeholder="MC3300, ZD421…" required className={FLDCLS} style={ringCss} />
            </div>
          </div>

          {/* Ref. Palex */}
          <div>
            <label className={FLBL}>Referencia interna Palex</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tipoSel?.color ?? TEAL }}>
                <IcoTag />
              </span>
              <input value={form.referenciaPalex} onChange={e => set("referenciaPalex", e.target.value)}
                placeholder="PAL-001234" className={`${FLDCLS} pl-8 font-mono`} style={ringCss} />
            </div>
          </div>

          {/* Proveedor + Precio */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={FLBL}>Proveedor</label>
              <input value={form.proveedor} onChange={e => set("proveedor", e.target.value)}
                placeholder="Nombre del proveedor" className={FLDCLS} style={ringCss} />
            </div>
            <div>
              <label className={FLBL}>Precio unitario (€)</label>
              <input type="number" min="0" step="0.01" value={form.precio} onChange={e => set("precio", e.target.value)}
                placeholder="0.00" className={FLDCLS} style={ringCss} />
            </div>
          </div>

          {/* Garantía + URL externa */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={FLBL}>Garantía fabricante (meses)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300"><IcoShield /></span>
                <input type="number" min="0" step="1" value={form.garantiaMeses} onChange={e => set("garantiaMeses", e.target.value)}
                  placeholder="24" className={`${FLDCLS} pl-8`} style={ringCss} />
              </div>
            </div>
            <div>
              <label className={FLBL}>URL externa (opcional)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300"><IcoLink /></span>
                <input value={form.fichaUrl} onChange={e => set("fichaUrl", e.target.value)}
                  placeholder="https://fabricante.com/…" className={`${FLDCLS} pl-8`} style={ringCss} />
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className={FLBL}>Descripción / Notas técnicas</label>
            <textarea value={form.descripcion} onChange={e => set("descripcion", e.target.value)}
              placeholder="Características relevantes, versión de firmware, observaciones…"
              rows={3} className={`${FLDCLS} resize-none`} style={ringCss} />
          </div>

          {/* ── Documentos adjuntos ── */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0 flex items-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Fichas técnicas y documentos
              </span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            {item ? (
              <>
                {loadingDocs ? (
                  <div className="h-10 bg-gray-100 rounded-xl animate-pulse mb-2" />
                ) : docs.length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-2 mb-2">Sin documentos todavía</p>
                ) : (
                  <div className="space-y-1.5 mb-2.5">
                    {docs.map(doc => (
                      <div key={doc.id} className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate">{doc.nombre}</p>
                          <p className="text-[10px] text-gray-400">{fmtTamano(doc.tamano)}</p>
                        </div>
                        <a href={`/api/hardware/docs/${doc.id}`} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors shrink-0 cursor-pointer"
                          title="Descargar">
                          <IcoDownload />
                        </a>
                        <button type="button" onClick={() => eliminarDoc(doc.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                          title="Eliminar documento">
                          <IcoTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Zona de subida */}
                <label className={`flex items-center gap-2.5 px-4 py-3 border-2 border-dashed rounded-xl transition-colors ${subiendo ? "opacity-50 cursor-not-allowed border-gray-200" : "cursor-pointer border-gray-200 hover:border-teal-300 hover:bg-teal-50/30"}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={subiendo ? "#9ca3af" : TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: subiendo ? "#9ca3af" : TEAL }}>
                      {subiendo ? "Subiendo documento…" : "Subir documento"}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">PDF, Word, Excel, imágenes — máx. 20 MB</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="sr-only"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
                    onChange={handleDocUpload}
                    disabled={subiendo}
                  />
                </label>
              </>
            ) : (
              <div className="flex items-start gap-2.5 bg-gray-50 rounded-xl px-3.5 py-3 border border-gray-100">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                <p className="text-xs text-gray-500">Los documentos (fichas técnicas, datasheets, manuales…) se pueden adjuntar una vez creado el material.</p>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0 bg-gray-50/80">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-white transition-colors cursor-pointer">
            Cancelar
          </button>
          <button form="mat-drawer-form" type="submit" disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity cursor-pointer hover:opacity-90"
            style={{ backgroundColor: tipoSel?.color ?? TEAL }}>
            {saving ? "Guardando…" : item ? "Guardar cambios" : "Crear material"}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Modal: Gestionar tipos ───────────────────────────────────────────────────

function CatTiposModal({ tipos, onClose, onChanged }: {
  tipos: HardwareTipo[]
  onClose: () => void
  onChanged: () => void
}) {
  const { success, error: toastError } = useToast()
  const [nombre, setNombre] = useState("")
  const [color, setColor] = useState(TIPO_COLORES_PRESET[0])
  const [creando, setCreando] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState("")
  const [editColor, setEditColor] = useState("")

  async function crear() {
    if (!nombre.trim()) return
    setCreando(true)
    try {
      const r = await fetch("/api/hardware/tipos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), color }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      setNombre(""); onChanged(); success("Tipo creado")
    } catch (e: unknown) { toastError((e as Error).message || "Error") }
    finally { setCreando(false) }
  }

  async function guardarEdit(id: string) {
    try {
      const r = await fetch(`/api/hardware/tipos/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: editNombre, color: editColor }),
      })
      if (!r.ok) throw new Error()
      setEditId(null); onChanged(); success("Tipo actualizado")
    } catch { toastError("Error") }
  }

  async function eliminarTipo(id: string) {
    try {
      const r = await fetch(`/api/hardware/tipos/${id}`, { method: "DELETE" })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      onChanged(); success("Tipo eliminado")
    } catch (e: unknown) { toastError((e as Error).message || "Error") }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0" style={{ borderTop: `3px solid ${TEAL}` }}>
          <div>
            <h2 className="text-base font-bold text-gray-900">Tipos de hardware</h2>
            <p className="text-xs text-gray-400 mt-0.5">Categorías para clasificar los materiales del catálogo</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"><IcoX /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-1">
          {tipos.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">Sin tipos creados aún</p>
            : tipos.map(t => (
              <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                {editId === t.id ? (
                  <>
                    <div className="flex gap-1 flex-wrap">
                      {TIPO_COLORES_PRESET.map(c => (
                        <button key={c} type="button" onClick={() => setEditColor(c)}
                          className="w-5 h-5 rounded-full border-2 transition-all cursor-pointer"
                          style={{ backgroundColor: c, borderColor: editColor === c ? "#374151" : "transparent" }} />
                      ))}
                    </div>
                    <input value={editNombre} onChange={e => setEditNombre(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 min-w-0"
                      onKeyDown={e => e.key === "Enter" && guardarEdit(t.id)} />
                    <button onClick={() => guardarEdit(t.id)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-white cursor-pointer shrink-0"
                      style={{ backgroundColor: TEAL }}>OK</button>
                    <button onClick={() => setEditId(null)} className="text-xs text-gray-400 cursor-pointer shrink-0">✕</button>
                  </>
                ) : (
                  <>
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                    <span className="flex-1 text-sm font-medium text-gray-800">{t.nombre}</span>
                    <button onClick={() => { setEditId(t.id); setEditNombre(t.nombre); setEditColor(t.color) }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"><IcoEdit /></button>
                    <button onClick={() => eliminarTipo(t.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-300 hover:text-red-500 cursor-pointer"><IcoTrash /></button>
                  </>
                )}
              </div>
            ))
          }
        </div>
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">Nuevo tipo</p>
          <div className="flex gap-1.5 mb-2.5 flex-wrap">
            {TIPO_COLORES_PRESET.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className="w-6 h-6 rounded-full border-2 transition-all cursor-pointer"
                style={{ backgroundColor: c, borderColor: color === c ? "#374151" : "transparent" }} />
            ))}
          </div>
          <div className="flex gap-2">
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del tipo…"
              onKeyDown={e => e.key === "Enter" && !creando && crear()}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
            <button onClick={crear} disabled={creando || !nombre.trim()}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 cursor-pointer"
              style={{ backgroundColor: TEAL }}>
              {creando ? "…" : "Añadir"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Asignar / reasignar unidad ──────────────────────────────────────────────

function AsignarUnidadModal({ unidad, onClose, onSaved }: {
  unidad: HardwareUnidad
  onClose: () => void
  onSaved: (u: HardwareUnidad) => void
}) {
  const { success, error: toastError } = useToast()
  const [hospitales, setHospitales] = useState<{ id: string; nombre: string; ciudad: string }[]>([])
  const [proyectos,  setProyectos]  = useState<{ id: string; titulo: string }[]>([])
  const [destino, setDestino] = useState<"hospital"|"proyecto"|"libre">(
    unidad.hospital ? "hospital" : unidad.proyecto ? "proyecto" : "libre"
  )
  const [hospitalId,  setHospitalId]  = useState(unidad.hospital?.id ?? "")
  const [proyectoId,  setProyectoId]  = useState(unidad.proyecto?.id ?? "")
  const [estado,      setEstado]      = useState(unidad.estado)
  const [saving,      setSaving]      = useState(false)
  const [busqHosp,    setBusqHosp]    = useState("")
  const [busqProy,    setBusqProy]    = useState("")

  useEffect(() => {
    Promise.all([
      fetch("/api/hospitales").then(r => r.ok ? r.json() : []),
      fetch("/api/proyectos").then(r => r.ok ? r.json() : []),
    ]).then(([h, p]) => {
      if (Array.isArray(h)) setHospitales(h.sort((a: { nombre: string }, b: { nombre: string }) => a.nombre.localeCompare(b.nombre)))
      if (Array.isArray(p)) setProyectos(p.sort((a: { titulo: string }, b: { titulo: string }) => a.titulo.localeCompare(b.titulo)))
    })
  }, [])

  async function guardar() {
    setSaving(true)
    try {
      const payload = {
        hospitalId:    destino === "hospital"  ? (hospitalId || null) : null,
        proyectoId: destino === "proyecto"  ? (proyectoId || null) : null,
        estado:        destino === "libre"     ? "DISPONIBLE"         : estado,
      }
      const r = await fetch(`/api/hardware/unidades/${unidad.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!r.ok) throw new Error()
      const updated = await r.json()
      const hosp = destino === "hospital" && hospitalId
        ? (hospitales.find(h => h.id === hospitalId) ?? null) : null
      const proy = destino === "proyecto" && proyectoId
        ? (proyectos.find(p => p.id === proyectoId) ? { id: proyectoId, titulo: proyectos.find(p => p.id === proyectoId)!.titulo } : null) : null
      onSaved({ ...unidad, ...updated, hospital: hosp, proyecto: proy })
      success("Asignación actualizada")
      onClose()
    } catch { toastError("Error al guardar") }
    finally { setSaving(false) }
  }

  const tipoColor = unidad.catalogo.tipo?.color ?? TEAL
  const FL = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-white"
  const ring = { "--tw-ring-color": tipoColor } as React.CSSProperties

  const hospFiltrados = hospitales.filter(h =>
    !busqHosp || h.nombre.toLowerCase().includes(busqHosp.toLowerCase()) || h.ciudad.toLowerCase().includes(busqHosp.toLowerCase()))
  const proyFiltrados = proyectos.filter(p =>
    !busqProy || p.titulo.toLowerCase().includes(busqProy.toLowerCase()))

  const DEST_OPTS: { k: "hospital"|"proyecto"|"libre"; label: string; sub: string }[] = [
    { k: "hospital",  label: "Hospital",    sub: "Instalar en un centro" },
    { k: "proyecto",  label: "Proyecto",    sub: "Proyecto activo"   },
    { k: "libre",     label: "Sin asignar", sub: "Stock disponible"      },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{ borderTop: `3px solid ${tipoColor}` }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          {unidad.catalogo.tipo && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full text-white shrink-0"
              style={{ backgroundColor: tipoColor }}>{unidad.catalogo.tipo.nombre}</span>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">{unidad.catalogo.marca} {unidad.catalogo.modelo}</p>
            {unidad.numSerie && <code className="text-xs text-gray-400 font-mono">{unidad.numSerie}</code>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"><IcoX /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Destino de la unidad</p>
            <div className="grid grid-cols-3 gap-2">
              {DEST_OPTS.map(o => (
                <button key={o.k} type="button" onClick={() => setDestino(o.k)}
                  className="flex flex-col items-center gap-0.5 py-3 px-2 rounded-xl border text-center transition-all cursor-pointer"
                  style={destino === o.k
                    ? { backgroundColor: tipoColor, borderColor: tipoColor, color: "white" }
                    : { backgroundColor: "white", borderColor: "#e5e7eb", color: "#6b7280" }}>
                  <span className="text-xs font-bold">{o.label}</span>
                  <span className="text-[10px] opacity-70">{o.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {destino === "hospital" && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">Hospital</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"><IcoSearch /></span>
                <input value={busqHosp} onChange={e => setBusqHosp(e.target.value)} placeholder="Filtrar hospitales…"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-white mb-1"
                  style={ring} />
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-50">
                {hospFiltrados.length === 0
                  ? <p className="text-xs text-gray-400 text-center py-4">Sin resultados</p>
                  : hospFiltrados.map(h => (
                    <button key={h.id} type="button" onClick={() => setHospitalId(h.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer text-left"
                      style={hospitalId === h.id ? { backgroundColor: `${tipoColor}10` } : {}}>
                      <span className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{h.nombre}</p>
                        <p className="text-xs text-gray-400">{h.ciudad}</p>
                      </span>
                      {hospitalId === h.id && <span style={{ color: tipoColor }}><IcoCheck /></span>}
                    </button>
                  ))
                }
              </div>
            </div>
          )}

          {destino === "proyecto" && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">Proyecto</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"><IcoSearch /></span>
                <input value={busqProy} onChange={e => setBusqProy(e.target.value)} placeholder="Filtrar proyectos…"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-white mb-1"
                  style={ring} />
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-50">
                {proyFiltrados.length === 0
                  ? <p className="text-xs text-gray-400 text-center py-4">Sin resultados</p>
                  : proyFiltrados.map(p => (
                    <button key={p.id} type="button" onClick={() => setProyectoId(p.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer text-left"
                      style={proyectoId === p.id ? { backgroundColor: `${tipoColor}10` } : {}}>
                      <span className="flex-1 text-sm font-medium text-gray-800 truncate">{p.titulo}</span>
                      {proyectoId === p.id && <span style={{ color: tipoColor }}><IcoCheck /></span>}
                    </button>
                  ))
                }
              </div>
            </div>
          )}

          {destino === "libre" && (
            <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2.5 text-xs text-green-700 flex items-center gap-2">
              <IcoCheck /> La unidad quedará como <strong>Disponible</strong> sin destino asignado.
            </div>
          )}

          {destino !== "libre" && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Estado</label>
              <select value={estado} onChange={e => setEstado(e.target.value)} className={FL} style={ring}>
                {Object.entries(HW_ESTADO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 bg-gray-50 rounded-b-2xl shrink-0">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-white cursor-pointer transition-colors">Cancelar</button>
          <button onClick={guardar}
            disabled={saving || (destino === "hospital" && !hospitalId) || (destino === "proyecto" && !proyectoId)}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 cursor-pointer hover:opacity-90 transition-opacity"
            style={{ backgroundColor: tipoColor }}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Drawer: editar todos los campos de una unidad ───────────────────────────

function EditUnidadDrawer({ unidad, onClose, onSaved }: {
  unidad: HardwareUnidad
  onClose: () => void
  onSaved: (u: HardwareUnidad) => void
}) {
  const { success, error: toastError } = useToast()
  const [form, setForm] = useState({
    numSerie:            unidad.numSerie ?? "",
    estado:              unidad.estado,
    hospitalId:          unidad.hospital?.id ?? "",
    notas:               unidad.notas ?? "",
    fechaCompra:         unidad.fechaCompra         ? unidad.fechaCompra.slice(0,10)         : "",
    fechaGarantia:       unidad.fechaGarantia       ? unidad.fechaGarantia.slice(0,10)       : "",
    proximoMantenimiento: unidad.proximoMantenimiento ? unidad.proximoMantenimiento.slice(0,10) : "",
  })
  const [hospitales, setHospitales] = useState<{ id: string; nombre: string; ciudad: string }[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/hospitales").then(r => r.ok ? r.json() : []).then((d: { id: string; nombre: string; ciudad: string }[]) => {
      if (Array.isArray(d)) setHospitales(d.sort((a, b) => a.nombre.localeCompare(b.nombre)))
    })
  }, [])

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await fetch(`/api/hardware/unidades/${unidad.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numSerie:             form.numSerie || null,
          estado:               form.estado,
          hospitalId:           form.hospitalId || null,
          notas:                form.notas || null,
          fechaCompra:          form.fechaCompra || null,
          fechaGarantia:        form.fechaGarantia || null,
          proximoMantenimiento: form.proximoMantenimiento || null,
        }),
      })
      if (!r.ok) throw new Error()
      const updated = await r.json()
      const hosp = form.hospitalId ? (hospitales.find(h => h.id === form.hospitalId) ?? null) : null
      onSaved({ ...unidad, ...updated, hospital: hosp })
      success("Unidad actualizada")
      onClose()
    } catch { toastError("Error al guardar") }
    finally { setSaving(false) }
  }

  const tipoColor = unidad.catalogo.tipo?.color ?? TEAL
  const FL   = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-white placeholder:text-gray-300 transition-colors"
  const FLBL = "block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5"
  const ring = { "--tw-ring-color": tipoColor } as React.CSSProperties
  const hw   = HW_ESTADO[form.estado] ?? { label: form.estado, color: "#6b7280", bg: "#f3f4f6" }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white shadow-2xl flex flex-col">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 shrink-0"
          style={{ borderTop: `3px solid ${tipoColor}` }}>
          {unidad.catalogo.tipo && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full text-white shrink-0"
              style={{ backgroundColor: tipoColor }}>{unidad.catalogo.tipo.nombre}</span>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900">{unidad.catalogo.marca} {unidad.catalogo.modelo}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {unidad.catalogo.referenciaPalex && (
                <code className="font-mono font-semibold mr-2" style={{ color: tipoColor }}>{unidad.catalogo.referenciaPalex}</code>
              )}
              Editar unidad
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 cursor-pointer"><IcoX /></button>
        </div>

        <form id="edit-unit-form" onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Estado — destacado */}
          <div>
            <label className={FLBL}>Estado actual</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {Object.entries(HW_ESTADO).map(([k, v]) => (
                <button key={k} type="button" onClick={() => set("estado", k)}
                  className="py-2 px-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center"
                  style={form.estado === k
                    ? { backgroundColor: v.bg, borderColor: v.color, color: v.color }
                    : { backgroundColor: "white", borderColor: "#e5e7eb", color: "#9ca3af" }}>
                  {v.label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: hw.color }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: hw.color, display: "inline-block" }} />
              Estado actual: <strong>{hw.label}</strong>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Nº serie */}
          <div>
            <label className={FLBL}>Número de serie</label>
            <input value={form.numSerie} onChange={e => set("numSerie", e.target.value)}
              placeholder="S/N del dispositivo (opcional)" className={`${FL} font-mono`} style={ring} />
          </div>

          {/* Hospital asignado */}
          <div>
            <label className={FLBL}>Hospital asignado</label>
            <select value={form.hospitalId} onChange={e => {
              set("hospitalId", e.target.value)
              if (e.target.value && form.estado === "DISPONIBLE") set("estado", "ASIGNADO")
              if (!e.target.value && form.estado === "ASIGNADO") set("estado", "DISPONIBLE")
            }} className={FL} style={ring}>
              <option value="">— Sin asignar a hospital —</option>
              {hospitales.map(h => <option key={h.id} value={h.id}>{h.nombre} ({h.ciudad})</option>)}
            </select>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={FLBL}>Fecha de compra</label>
              <input type="date" value={form.fechaCompra} onChange={e => set("fechaCompra", e.target.value)} className={FL} style={ring} />
            </div>
            <div>
              <label className={FLBL}>Fin de garantía</label>
              <input type="date" value={form.fechaGarantia} onChange={e => set("fechaGarantia", e.target.value)} className={FL} style={ring} />
              {form.fechaGarantia && (() => {
                const d = diasHasta(form.fechaGarantia)
                return d !== null && d <= 90 ? (
                  <p className="text-[11px] mt-1" style={{ color: d <= 30 ? "#dc2626" : "#d97706" }}>
                    {d < 0 ? `Vencida hace ${Math.abs(d)}d` : d === 0 ? "Vence hoy" : `Vence en ${d}d`}
                  </p>
                ) : null
              })()}
            </div>
          </div>

          {/* Próximo mantenimiento */}
          <div>
            <label className={FLBL}>Próximo mantenimiento</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"><IcoShield /></span>
              <input type="date" value={form.proximoMantenimiento} onChange={e => set("proximoMantenimiento", e.target.value)}
                className={`${FL} pl-8`} style={ring} />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className={FLBL}>Notas internas</label>
            <textarea value={form.notas} onChange={e => set("notas", e.target.value)}
              placeholder="Observaciones, incidencias, historial relevante…"
              rows={3} className={`${FL} resize-none`} style={ring} />
          </div>

          {/* Info del modelo */}
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Modelo</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div><span className="text-gray-400">Marca: </span>{unidad.catalogo.marca}</div>
              <div><span className="text-gray-400">Modelo: </span>{unidad.catalogo.modelo}</div>
              {unidad.catalogo.proveedor && <div><span className="text-gray-400">Proveedor: </span>{unidad.catalogo.proveedor}</div>}
              {unidad.catalogo.precio != null && <div><span className="text-gray-400">Precio: </span>{fmtEuros(unidad.catalogo.precio)}</div>}
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0 bg-gray-50/80">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-white cursor-pointer transition-colors">Cancelar</button>
          <button form="edit-unit-form" type="submit" disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 cursor-pointer hover:opacity-90 transition-opacity"
            style={{ backgroundColor: tipoColor }}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Modal: añadir nueva unidad (con selector de modelo) ─────────────────────

function NuevaUnidadModal({ catalogo, onClose, onCreated }: {
  catalogo: HardwareCatalogo[]
  onClose: () => void
  onCreated: (u: HardwareUnidad) => void
}) {
  const { success, error: toastError } = useToast()
  const [busqModelo, setBusqModelo] = useState("")
  const [modeloId, setModeloId]   = useState("")
  const [hospitales, setHospitales] = useState<{ id: string; nombre: string; ciudad: string }[]>([])
  const EMPTY = { numSerie: "", notas: "", fechaCompra: "", fechaGarantia: "", estado: "DISPONIBLE", hospitalId: "" }
  const [rows, setRows] = useState([{ ...EMPTY }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/hospitales").then(r => r.ok ? r.json() : []).then((d: { id: string; nombre: string; ciudad: string }[]) => {
      if (Array.isArray(d)) setHospitales(d.sort((a, b) => a.nombre.localeCompare(b.nombre)))
    })
  }, [])

  const modeloSel  = catalogo.find(c => c.id === modeloId)
  const tipoColor  = modeloSel?.tipo?.color ?? TEAL
  const catActivos = catalogo.filter(c => c.activo && (!busqModelo ||
    [c.marca, c.modelo, c.referenciaPalex].some(v => v?.toLowerCase().includes(busqModelo.toLowerCase()))))

  function setRow(i: number, k: string, v: string) {
    setRows(p => p.map((r, j) => j === i ? { ...r, [k]: v } : r))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!modeloId) { toastError("Selecciona un modelo"); return }
    setSaving(true)
    try {
      const payload = rows.filter((r, i) => rows.length === 1 || r.numSerie.trim()).map(r => ({
        catalogoId:   modeloId,
        numSerie:     r.numSerie.trim() || null,
        estado:       r.estado || "DISPONIBLE",
        hospitalId:   r.hospitalId || null,
        notas:        r.notas.trim() || null,
        fechaCompra:  r.fechaCompra || null,
        fechaGarantia: r.fechaGarantia || null,
      }))
      const r = await fetch("/api/hardware/unidades", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.length === 1 ? payload[0] : payload),
      })
      if (!r.ok) throw new Error()
      const result = await r.json()
      const nuevas: HardwareUnidad[] = Array.isArray(result) ? result : [result]
      nuevas.forEach(u => onCreated(u))
      success(`${nuevas.length} unidad${nuevas.length !== 1 ? "es" : ""} añadida${nuevas.length !== 1 ? "s" : ""}`)
      onClose()
    } catch { toastError("Error al crear") }
    finally { setSaving(false) }
  }

  const FL = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col"
        style={{ borderTop: `3px solid ${tipoColor}` }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Nueva unidad de hardware</h2>
            <p className="text-xs text-gray-400 mt-0.5">Registra una o varias unidades físicas en el inventario</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"><IcoX /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Selector de modelo */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">1. Seleccionar modelo</p>
            <div className="relative mb-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"><IcoSearch /></span>
              <input value={busqModelo} onChange={e => setBusqModelo(e.target.value)} placeholder="Buscar por marca, modelo o referencia…"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
            </div>
            <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-50">
              {catActivos.length === 0
                ? <p className="text-xs text-gray-400 text-center py-4">Sin modelos activos{busqModelo ? " para esta búsqueda" : ""}</p>
                : catActivos.map(c => {
                  const tc = c.tipo?.color ?? "#9ca3af"
                  return (
                    <button key={c.id} type="button" onClick={() => setModeloId(c.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer text-left"
                      style={modeloId === c.id ? { backgroundColor: `${tc}10` } : {}}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: tc, flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{c.marca} {c.modelo}</p>
                        <p className="text-xs text-gray-400">{c.tipo?.nombre ?? "Sin tipo"}{c.referenciaPalex ? ` · ${c.referenciaPalex}` : ""}</p>
                      </div>
                      {c.precio != null && <span className="text-xs text-gray-400 shrink-0">{fmtEuros(c.precio)}</span>}
                      {modeloId === c.id && <span style={{ color: tc }}><IcoCheck /></span>}
                    </button>
                  )
                })
              }
            </div>
          </div>

          {/* Filas de unidades */}
          {modeloId && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">2. Detalles de la{rows.length > 1 ? "s" : ""} unidad{rows.length > 1 ? "es" : ""}</p>
              <div className="space-y-3">
                {rows.map((row, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl border border-gray-100 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-500">Unidad {i + 1}</p>
                      {rows.length > 1 && (
                        <button type="button" onClick={() => setRows(p => p.filter((_, j) => j !== i))}
                          className="p-1 rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50 cursor-pointer"><IcoTrash /></button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">Nº serie</label>
                        <input value={row.numSerie} onChange={e => setRow(i, "numSerie", e.target.value)}
                          placeholder="Opcional" className={FL + " font-mono text-xs"} />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">Estado</label>
                        <select value={row.estado} onChange={e => setRow(i, "estado", e.target.value)} className={FL + " text-xs"}>
                          {Object.entries(HW_ESTADO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">Hospital</label>
                        <select value={row.hospitalId} onChange={e => setRow(i, "hospitalId", e.target.value)} className={FL + " text-xs"}>
                          <option value="">Sin asignar</option>
                          {hospitales.map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">Fecha compra</label>
                        <input type="date" value={row.fechaCompra} onChange={e => setRow(i, "fechaCompra", e.target.value)} className={FL + " text-xs"} />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">Fin garantía</label>
                        <input type="date" value={row.fechaGarantia} onChange={e => setRow(i, "fechaGarantia", e.target.value)} className={FL + " text-xs"} />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">Notas</label>
                        <input value={row.notas} onChange={e => setRow(i, "notas", e.target.value)} placeholder="—" className={FL + " text-xs"} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setRows(p => [...p, { ...EMPTY }])}
                className="mt-2 text-xs font-medium cursor-pointer hover:opacity-80" style={{ color: tipoColor }}>
                + Añadir otra unidad
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0 bg-gray-50/80">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-white cursor-pointer">Cancelar</button>
          <button onClick={submit} disabled={saving || !modeloId}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 cursor-pointer hover:opacity-90"
            style={{ backgroundColor: tipoColor }}>
            {saving ? "Creando…" : `Crear ${rows.length} unidad${rows.length !== 1 ? "es" : ""}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tarjeta de modelo con unidades expandibles ───────────────────────────────

function ModelCard({ item, units, esAdmin, onEdit, onToggle, onUnitUpdated, onUnitDeleted, onUnitCreated }: {
  item: HardwareCatalogo
  units: HardwareUnidad[]
  esAdmin: boolean
  onEdit: () => void
  onToggle: () => void
  onUnitUpdated: (u: HardwareUnidad) => void
  onUnitDeleted: (id: string) => void
  onUnitCreated: (u: HardwareUnidad) => void
}) {
  const { success, error: toastError } = useToast()
  const [expanded, setExpanded]       = useState(false)
  const [editUnit, setEditUnit]       = useState<HardwareUnidad | null>(null)
  const [assignUnit, setAssignUnit]   = useState<HardwareUnidad | null>(null)
  const [addingRow, setAddingRow]     = useState(false)
  const [addForm, setAddForm] = useState({ numSerie:"", notas:"", fechaCompra:"", fechaGarantia:"", estado:"DISPONIBLE" })
  const [saving, setSaving]           = useState(false)

  const stock    = item._stock ?? { total: units.length, disponibles: units.filter(u => u.estado === "DISPONIBLE").length, asignados: units.filter(u => u.estado === "ASIGNADO").length, mantenimiento: units.filter(u => u.estado === "EN_MANTENIMIENTO").length }
  const tipoColor = item.tipo?.color ?? "#9ca3af"
  const pct      = stock.total > 0 ? Math.round((stock.disponibles / stock.total) * 100) : 0
  const barColor  = pct >= 70 ? "#16a34a" : pct >= 30 ? TEAL : "#f59e0b"

  async function cambiarEstadoInline(u: HardwareUnidad, nuevoEstado: string) {
    const r = await fetch(`/api/hardware/unidades/${u.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    })
    if (r.ok) { onUnitUpdated({ ...u, estado: nuevoEstado }); success("Estado actualizado") }
    else toastError("Error")
  }

  async function eliminarUnidad(id: string) {
    if (!confirm("¿Eliminar esta unidad?")) return
    const r = await fetch(`/api/hardware/unidades/${id}`, { method: "DELETE" })
    if (r.ok) { onUnitDeleted(id); success("Unidad eliminada") }
    else toastError("Error")
  }

  async function addUnit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await fetch("/api/hardware/unidades", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalogoId: item.id,
          numSerie: addForm.numSerie || null,
          notas: addForm.notas || null,
          fechaCompra: addForm.fechaCompra || null,
          fechaGarantia: addForm.fechaGarantia || null,
          estado: addForm.estado || "DISPONIBLE",
        }),
      })
      if (!r.ok) throw new Error()
      const nueva: HardwareUnidad = await r.json()
      onUnitCreated(nueva)
      setAddForm({ numSerie:"", notas:"", fechaCompra:"", fechaGarantia:"", estado:"DISPONIBLE" })
      setAddingRow(false)
      success("Unidad añadida")
    } catch { toastError("Error al añadir") }
    finally { setSaving(false) }
  }

  const FL = "w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 bg-white"

  return (
    <>
      <div className={`group bg-white rounded-2xl border flex flex-col overflow-hidden transition-all duration-200
        ${item.activo ? "border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200" : "border-gray-100 shadow-sm opacity-60"}`}>
        <div className="h-1 w-full shrink-0" style={{ backgroundColor: item.activo ? tipoColor : "#e5e7eb" }} />

        <div className="p-4 flex-1 flex flex-col">
          {/* Badge tipo + hover actions */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {item.tipo
                ? <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${tipoColor}18`, color: tipoColor }}>{item.tipo.nombre}</span>
                : <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Sin tipo</span>}
              {!item.activo && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-50 text-red-400">Inactivo</span>}
            </div>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-teal-50 text-gray-300 hover:text-teal-600 cursor-pointer" title="Editar modelo"><IcoEdit /></button>
              {esAdmin && <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 cursor-pointer" title={item.activo ? "Desactivar" : "Activar"}><IcoTrash /></button>}
            </div>
          </div>

          {/* Marca + Modelo */}
          <div className="mb-2">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{item.marca}</p>
            <h3 className="text-base font-bold text-gray-900 leading-tight mt-0.5">{item.modelo}</h3>
            {item.descripcion && <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{item.descripcion}</p>}
          </div>

          {/* Ref. Palex */}
          {item.referenciaPalex && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl mb-2 w-fit" style={{ backgroundColor: `${TEAL}0e` }}>
              <span style={{ color: TEAL }}><IcoTag /></span>
              <span className="text-xs font-mono font-bold" style={{ color: TEAL }}>{item.referenciaPalex}</span>
            </div>
          )}

          {/* Chips: proveedor, precio, ficha, garantía */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {item.proveedor && <span className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5 text-gray-600 truncate max-w-[140px]">{item.proveedor}</span>}
            {item.precio != null && <span className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5 font-semibold text-gray-700">{fmtEuros(item.precio)}</span>}
            {item.fichaUrl && (
              <a href={item.fichaUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs rounded-lg px-2 py-0.5 border cursor-pointer"
                style={{ borderColor: `${TEAL}40`, color: TEAL }}>
                <IcoLink /> Datasheet
              </a>
            )}
          </div>

          {/* Stock bar */}
          <div className="mt-auto pt-3 border-t border-gray-50">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-1">
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#16a34a", display: "inline-block" }} />
                  <span className="text-gray-600 font-medium">{stock.disponibles} disp.</span>
                </span>
                {stock.asignados > 0 && (
                  <span className="flex items-center gap-1">
                    <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: TEAL, display: "inline-block" }} />
                    <span className="text-gray-500">{stock.asignados} asig.</span>
                  </span>
                )}
                {stock.mantenimiento > 0 && (
                  <span className="flex items-center gap-1">
                    <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#f59e0b", display: "inline-block" }} />
                    <span className="text-amber-600">{stock.mantenimiento} mant.</span>
                  </span>
                )}
              </div>
              <span className="text-gray-400">{stock.total} total</span>
            </div>
            {stock.total > 0
              ? <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: barColor }} /></div>
              : <div className="h-1.5 bg-gray-100 rounded-full" />}
          </div>
        </div>

        {/* Footer: expand + add */}
        <div className="px-4 pb-4 flex gap-2">
          <button onClick={() => setExpanded(v => !v)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer">
            <IcoChevron open={expanded} />
            {expanded ? "Ocultar" : "Ver"} unidades ({units.length})
          </button>
          <button onClick={() => { setExpanded(true); setAddingRow(true) }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            style={{ color: tipoColor, border: "1px solid", borderColor: `${tipoColor}40` }}>
            <IcoPlus /> Añadir
          </button>
        </div>

        {/* Expansión: unidades del modelo */}
        {expanded && (
          <div className="border-t border-gray-100 bg-gray-50/60 px-4 pt-4 pb-4">
            {/* Form añadir unidad */}
            {addingRow && (
              <form onSubmit={addUnit} className="bg-white border border-gray-200 rounded-xl p-3 mb-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nueva unidad</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Nº serie</label>
                    <input value={addForm.numSerie} onChange={e => setAddForm(p => ({ ...p, numSerie: e.target.value }))}
                      placeholder="Opcional" className={FL + " font-mono"} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Estado</label>
                    <select value={addForm.estado} onChange={e => setAddForm(p => ({ ...p, estado: e.target.value }))} className={FL}>
                      {Object.entries(HW_ESTADO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Fecha compra</label>
                    <input type="date" value={addForm.fechaCompra} onChange={e => setAddForm(p => ({ ...p, fechaCompra: e.target.value }))} className={FL} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Fin garantía</label>
                    <input type="date" value={addForm.fechaGarantia} onChange={e => setAddForm(p => ({ ...p, fechaGarantia: e.target.value }))} className={FL} />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setAddingRow(false)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-white cursor-pointer">Cancelar</button>
                  <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: tipoColor }}>{saving ? "…" : "Añadir"}</button>
                </div>
              </form>
            )}

            {units.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Sin unidades — usa el botón Añadir para registrar la primera.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] text-gray-400 uppercase tracking-wide border-b border-gray-200">
                      <th className="text-left pb-2 font-semibold">Nº serie</th>
                      <th className="text-left pb-2 font-semibold">Estado</th>
                      <th className="text-left pb-2 font-semibold hidden sm:table-cell">Asignado a</th>
                      <th className="text-left pb-2 font-semibold hidden md:table-cell">Garantía</th>
                      <th className="pb-2 w-24 sticky right-0 bg-gray-50/60" />
                    </tr>
                  </thead>
                  <tbody>
                    {units.map(u => {
                      const es = HW_ESTADO[u.estado] ?? { label: u.estado, color: "#6b7280", bg: "#f3f4f6" }
                      return (
                        <tr key={u.id} className="border-b border-gray-100 last:border-0 hover:bg-white/70 transition-colors">
                          <td className="py-2 pr-3">
                            {u.numSerie
                              ? <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{u.numSerie}</code>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="py-2 pr-3">
                            <select value={u.estado} onChange={e => cambiarEstadoInline(u, e.target.value)}
                              className="text-xs font-bold px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 appearance-none"
                              style={{ backgroundColor: es.bg, color: es.color, minWidth: "fit-content" }}>
                              {Object.entries(HW_ESTADO).map(([k, v]) => <option key={k} value={k} className="bg-white text-gray-800">{v.label}</option>)}
                            </select>
                          </td>
                          <td className="py-2 pr-3 text-gray-500 hidden sm:table-cell max-w-[130px] truncate">
                            {u.hospital?.nombre ?? u.proyecto?.titulo ?? <span className="text-gray-300">—</span>}
                          </td>
                          <td className="py-2 pr-3 text-gray-400 hidden md:table-cell">
                            {u.fechaGarantia ? fmtFecha(u.fechaGarantia) : "—"}
                          </td>
                          <td className="py-2 sticky right-0 bg-white border-l border-gray-50">
                            <div className="flex items-center justify-end gap-0.5">
                              <button onClick={() => setAssignUnit(u)} className="p-1.5 rounded-lg hover:bg-teal-50 text-gray-300 hover:text-teal-600 cursor-pointer" title="Asignar"><IcoHospital /></button>
                              <button onClick={() => setEditUnit(u)} className="p-1.5 rounded-lg hover:bg-teal-50 text-gray-300 hover:text-teal-600 cursor-pointer" title="Editar"><IcoEdit /></button>
                              {esAdmin && <button onClick={() => eliminarUnidad(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 cursor-pointer" title="Eliminar"><IcoTrash /></button>}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {editUnit && <EditUnidadDrawer unidad={editUnit} onClose={() => setEditUnit(null)} onSaved={u => { onUnitUpdated(u); setEditUnit(null) }} />}
      {assignUnit && <AsignarUnidadModal unidad={assignUnit} onClose={() => setAssignUnit(null)} onSaved={u => { onUnitUpdated(u); setAssignUnit(null) }} />}
    </>
  )
}

// ─── Tab: Materiales (catálogo + inventario unificado) ────────────────────────

type MatSortKey = "nombre"|"tipo"|"estado"|"hospital"|"antiguedad"|"garantia"|"stock_desc"|"precio_desc"
type MatVista   = "modelos"|"unidades"

function MaterialesTab({ unidades, onUpdated, onDeleted, onCreated, catalogo, setCatalogo, esAdmin, tipos }: {
  unidades:    HardwareUnidad[]
  onUpdated:   (u: HardwareUnidad) => void
  onDeleted:   (id: string) => void
  onCreated:   (u: HardwareUnidad) => void
  catalogo:    HardwareCatalogo[]
  setCatalogo: React.Dispatch<React.SetStateAction<HardwareCatalogo[]>>
  esAdmin:     boolean
  tipos:       HardwareTipo[]
}) {
  const { success, error: toastError } = useToast()
  const [vista,        setVista]        = useState<MatVista>("modelos")
  const [busqueda,     setBusqueda]     = useState("")
  const [filtroTipoId, setFiltroTipoId] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroHosp,   setFiltroHosp]   = useState("")
  const [sortKey,      setSortKey]      = useState<MatSortKey>("nombre")
  const [vistaGrid,    setVistaGrid]    = useState(true)
  const [drawer,       setDrawer]       = useState<HardwareCatalogo|"new"|null>(null)
  const [tiposModal,   setTiposModal]   = useState(false)
  const [tiposLocal,   setTiposLocal]   = useState<HardwareTipo[]>(tipos)
  const [nuevaUnidad,  setNuevaUnidad]  = useState(false)
  const [editUnitGlobal, setEditUnitGlobal] = useState<HardwareUnidad|null>(null)
  const [assignUnitGlobal, setAssignUnitGlobal] = useState<HardwareUnidad|null>(null)

  useEffect(() => { setTiposLocal(tipos) }, [tipos])

  // Stats
  const activos    = catalogo.filter(c => c.activo)
  const totalMod   = activos.length
  const totalUds   = unidades.length
  const totalDisp  = unidades.filter(u => u.estado === "DISPONIBLE").length
  const totalAsig  = unidades.filter(u => u.estado === "ASIGNADO").length
  const pctDisp    = totalUds > 0 ? Math.round((totalDisp / totalUds) * 100) : 0
  const valorFlota = unidades.reduce((s, u) => s + (u.catalogo.precio ?? 0), 0)

  // Hospitales únicos para filtro
  const hospsUnicos = Array.from(new Map(
    unidades.filter(u => u.hospital).map(u => [u.hospital!.id, u.hospital!])
  ).values()).sort((a, b) => a.nombre.localeCompare(b.nombre))

  // ── Toggle activo/inactivo modelo ──────────────────────────────────────────
  async function toggleActivo(item: HardwareCatalogo) {
    try {
      await fetch(`/api/hardware/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !item.activo }) })
      setCatalogo(p => p.map(c => c.id === item.id ? { ...c, activo: !c.activo } : c))
      success(item.activo ? "Desactivado" : "Activado")
    } catch { toastError("Error") }
  }

  // ── Cambiar estado inline (unidades view) ─────────────────────────────────
  async function cambiarEstado(u: HardwareUnidad, nuevoEstado: string) {
    const r = await fetch(`/api/hardware/unidades/${u.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    })
    if (r.ok) { onUpdated({ ...u, estado: nuevoEstado }); success("Estado actualizado") }
    else toastError("Error")
  }

  // ── Eliminar unidad ────────────────────────────────────────────────────────
  async function eliminarUnidad(id: string) {
    if (!confirm("¿Eliminar esta unidad del inventario?")) return
    const r = await fetch(`/api/hardware/unidades/${id}`, { method: "DELETE" })
    if (r.ok) { onDeleted(id); success("Unidad eliminada") }
    else toastError("Error")
  }

  // ── CSV export unidades ────────────────────────────────────────────────────
  function exportarCSVUnidades() {
    exportarCSV(unidadesFiltradas.map(u => ({
      Tipo: u.catalogo.tipo?.nombre ?? "",
      Marca: u.catalogo.marca, Modelo: u.catalogo.modelo,
      "Ref. Palex": u.catalogo.referenciaPalex ?? "",
      "Nº Serie": u.numSerie ?? "",
      Estado: HW_ESTADO[u.estado]?.label ?? u.estado,
      Hospital: u.hospital?.nombre ?? "",
      Ciudad: u.hospital?.ciudad ?? "",
      Proyecto: u.proyecto?.titulo ?? "",
      "Fecha Compra": fmtFecha(u.fechaCompra),
      "Fin Garantía": fmtFecha(u.fechaGarantia),
      "Próx. Mantenimiento": fmtFecha(u.proximoMantenimiento),
      "Precio (€)": u.catalogo.precio ?? "",
      Proveedor: u.catalogo.proveedor ?? "",
      Notas: u.notas ?? "",
    })), "hardware_materiales")
  }

  // ── Filtros y sort para VISTA UNIDADES ─────────────────────────────────────
  const unidadesFiltradas = unidades
    .filter(u => !filtroTipoId  || u.catalogo.tipoId === filtroTipoId)
    .filter(u => !filtroEstado  || u.estado === filtroEstado)
    .filter(u => !filtroHosp   || u.hospital?.id === filtroHosp)
    .filter(u => !busqueda     || [u.numSerie, u.catalogo.marca, u.catalogo.modelo, u.catalogo.referenciaPalex, u.notas, u.hospital?.nombre, u.proyecto?.titulo]
      .some(v => v?.toLowerCase().includes(busqueda.toLowerCase())))

  const unidadesOrdenadas = [...unidadesFiltradas].sort((a, b) => {
    if (sortKey === "tipo")        return (a.catalogo.tipo?.nombre ?? "").localeCompare(b.catalogo.tipo?.nombre ?? "")
    if (sortKey === "nombre")      return `${a.catalogo.marca} ${a.catalogo.modelo}`.localeCompare(`${b.catalogo.marca} ${b.catalogo.modelo}`)
    if (sortKey === "estado")      return a.estado.localeCompare(b.estado)
    if (sortKey === "hospital")    return (a.hospital?.nombre ?? "").localeCompare(b.hospital?.nombre ?? "")
    if (sortKey === "antiguedad")  return (diasDesde(a.fechaCompra) ?? -1) - (diasDesde(b.fechaCompra) ?? -1)
    if (sortKey === "garantia")    return (a.fechaGarantia ? new Date(a.fechaGarantia).getTime() : Infinity) - (b.fechaGarantia ? new Date(b.fechaGarantia).getTime() : Infinity)
    if (sortKey === "stock_desc")  return (b.catalogo._stock?.total ?? 0) - (a.catalogo._stock?.total ?? 0)
    if (sortKey === "precio_desc") return (b.catalogo.precio ?? 0) - (a.catalogo.precio ?? 0)
    return 0
  })

  // ── Filtros para VISTA MODELOS ─────────────────────────────────────────────
  const catalogoFiltrado = catalogo
    .filter(c => !filtroTipoId || c.tipoId === filtroTipoId)
    .filter(c => !busqueda || [c.marca, c.modelo, c.referenciaPalex, c.proveedor]
      .some(v => v?.toLowerCase().includes(busqueda.toLowerCase())))
    .sort((a, b) => {
      if (sortKey === "stock_desc")  return (b._stock?.total ?? 0) - (a._stock?.total ?? 0)
      if (sortKey === "precio_desc") return (b.precio ?? 0) - (a.precio ?? 0)
      return `${a.marca} ${a.modelo}`.localeCompare(`${b.marca} ${b.modelo}`)
    })

  const catalogoActivos   = catalogoFiltrado.filter(c => c.activo)
  const catalogoInactivos = catalogoFiltrado.filter(c => !c.activo)

  const RNGSTY = { "--tw-ring-color": TEAL } as React.CSSProperties

  return (
    <div className="space-y-5">

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Modelos en catálogo",  value: String(totalMod),                              sub: `${catalogo.length - totalMod} inactivos`,           color: TEAL      },
          { label: "Unidades registradas", value: String(totalUds),                              sub: "en inventario total",                               color: "#6366f1" },
          { label: "Disponibles",          value: `${totalDisp} (${pctDisp}%)`,                  sub: `${totalAsig} asignadas a clientes`,                  color: "#16a34a" },
          { label: "Valor de la flota",    value: valorFlota > 0 ? fmtEuros(valorFlota) : "—",  sub: "coste acumulado de unidades",                       color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm" style={{ borderTop: `3px solid ${s.color}` }}>
            <p className="text-xl font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs font-semibold text-gray-700 mt-1.5">{s.label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Vista toggle + toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Vista modelos / unidades */}
        <div className="flex bg-gray-100 p-0.5 rounded-xl shrink-0">
          <button onClick={() => setVista("modelos")}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${vista === "modelos" ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
            Por modelo
          </button>
          <button onClick={() => setVista("unidades")}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${vista === "unidades" ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
            Todas las unidades
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><IcoSearch /></span>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder={vista === "modelos" ? "Buscar modelo, marca, referencia…" : "Buscar modelo, nº serie, hospital…"}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-white"
            style={RNGSTY} />
        </div>

        {/* Sort */}
        <select value={sortKey} onChange={e => setSortKey(e.target.value as MatSortKey)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-600 focus:outline-none focus:ring-2 cursor-pointer"
          style={RNGSTY}>
          <option value="nombre">Nombre A→Z</option>
          <option value="tipo">Tipo</option>
          {vista === "unidades" && <>
            <option value="estado">Estado</option>
            <option value="hospital">Hospital</option>
            <option value="antiguedad">Antigüedad</option>
            <option value="garantia">Garantía próxima</option>
          </>}
          <option value="stock_desc">Más stock</option>
          <option value="precio_desc">Mayor precio</option>
        </select>

        {/* Grid/List toggle (modelos view) */}
        {vista === "modelos" && (
          <div className="flex bg-gray-100 p-0.5 rounded-xl">
            <button onClick={() => setVistaGrid(true)} title="Cuadrícula"
              className={`p-2 rounded-lg transition-all cursor-pointer ${vistaGrid ? "bg-white shadow-sm text-gray-700" : "text-gray-400 hover:text-gray-600"}`}><IcoGrid /></button>
            <button onClick={() => setVistaGrid(false)} title="Lista"
              className={`p-2 rounded-lg transition-all cursor-pointer ${!vistaGrid ? "bg-white shadow-sm text-gray-700" : "text-gray-400 hover:text-gray-600"}`}><IcoList /></button>
          </div>
        )}

        {vista === "unidades" && (
          <button onClick={exportarCSVUnidades}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors">
            <IcoDownload /> CSV
          </button>
        )}

        <button onClick={() => setTiposModal(true)}
          className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors">
          <IcoGear /> Tipos
        </button>

        {/* Nuevo dropdown */}
        <div className="flex gap-1.5">
          <button onClick={() => setDrawer("new")}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 cursor-pointer transition-opacity"
            style={{ backgroundColor: TEAL }}>
            <IcoPlus /> Modelo
          </button>
          <button onClick={() => setNuevaUnidad(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 cursor-pointer transition-opacity"
            style={{ backgroundColor: ORANGE }}>
            <IcoPlus /> Unidad
          </button>
        </div>
      </div>

      {/* ── Tipo pills ── */}
      {tiposLocal.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFiltroTipoId("")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer"
            style={!filtroTipoId ? { backgroundColor: TEAL, borderColor: TEAL, color: "white" } : { backgroundColor: "white", borderColor: "#e5e7eb", color: "#6b7280" }}>
            Todos <span className="text-[10px] font-bold opacity-80">{vista === "modelos" ? activos.length : unidades.length}</span>
          </button>
          {tiposLocal.map(t => {
            const count = vista === "modelos"
              ? catalogo.filter(c => c.tipoId === t.id && c.activo).length
              : unidades.filter(u => u.catalogo.tipoId === t.id).length
            return (
              <button key={t.id} onClick={() => setFiltroTipoId(filtroTipoId === t.id ? "" : t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer"
                style={filtroTipoId === t.id
                  ? { backgroundColor: t.color, borderColor: t.color, color: "white" }
                  : { backgroundColor: "white", borderColor: "#e5e7eb", color: "#6b7280" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", display: "inline-block", flexShrink: 0,
                  backgroundColor: filtroTipoId === t.id ? "rgba(255,255,255,0.6)" : t.color }} />
                {t.nombre} <span className="text-[10px] font-bold opacity-70">{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Filtros extra (vista unidades) ── */}
      {vista === "unidades" && (
        <div className="flex flex-wrap gap-2">
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white text-gray-600 focus:outline-none focus:ring-2 cursor-pointer"
            style={RNGSTY}>
            <option value="">Todos los estados</option>
            {Object.entries(HW_ESTADO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filtroHosp} onChange={e => setFiltroHosp(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white text-gray-600 focus:outline-none focus:ring-2 cursor-pointer"
            style={RNGSTY}>
            <option value="">Todos los hospitales</option>
            {hospsUnicos.map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}
          </select>
          {(filtroEstado || filtroHosp) && (
            <button onClick={() => { setFiltroEstado(""); setFiltroHosp("") }}
              className="px-3 py-2 text-xs text-gray-400 hover:text-red-500 cursor-pointer transition-colors">
              Limpiar filtros
            </button>
          )}
          <span className="text-xs text-gray-400 self-center ml-1">
            {unidadesFiltradas.length} unidad{unidadesFiltradas.length !== 1 ? "es" : ""}
          </span>
        </div>
      )}

      {/* ══ VISTA: POR MODELO ══════════════════════════════════════════════════ */}
      {vista === "modelos" && (
        catalogoFiltrado.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border-2 border-dashed border-gray-200 text-gray-300"><IcoBox /></div>
            <h3 className="text-base font-bold text-gray-700 mb-1">{busqueda || filtroTipoId ? "Sin resultados" : "Catálogo vacío"}</h3>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
              {busqueda || filtroTipoId ? "Prueba a cambiar los filtros." : "Añade el primer modelo con el botón Modelo."}
            </p>
            {!busqueda && !filtroTipoId && (
              <button onClick={() => setDrawer("new")}
                className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer hover:opacity-90"
                style={{ backgroundColor: TEAL }}>
                <IcoPlus /> Nuevo modelo
              </button>
            )}
          </div>
        ) : (
          <>
            {vistaGrid ? (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catalogoActivos.map(item => (
                    <ModelCard key={item.id} item={item} esAdmin={esAdmin}
                      units={unidades.filter(u => u.catalogo.id === item.id)}
                      onEdit={() => setDrawer(item)}
                      onToggle={() => toggleActivo(item)}
                      onUnitUpdated={onUpdated}
                      onUnitDeleted={onDeleted}
                      onUnitCreated={u => {
                        onCreated(u)
                        setCatalogo(p => p.map(c => c.id === item.id
                          ? { ...c, _stock: { total: (c._stock?.total ?? 0) + 1, disponibles: (c._stock?.disponibles ?? 0) + 1, asignados: c._stock?.asignados ?? 0, mantenimiento: c._stock?.mantenimiento ?? 0 } }
                          : c))
                      }}
                    />
                  ))}
                </div>
                {catalogoInactivos.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none py-2 flex items-center gap-1.5 list-none">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                      {catalogoInactivos.length} modelo{catalogoInactivos.length !== 1 ? "s" : ""} inactivo{catalogoInactivos.length !== 1 ? "s" : ""}
                    </summary>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                      {catalogoInactivos.map(item => (
                        <ModelCard key={item.id} item={item} esAdmin={esAdmin}
                          units={unidades.filter(u => u.catalogo.id === item.id)}
                          onEdit={() => setDrawer(item)}
                          onToggle={() => toggleActivo(item)}
                          onUnitUpdated={onUpdated}
                          onUnitDeleted={onDeleted}
                          onUnitCreated={u => { onCreated(u) }}
                        />
                      ))}
                    </div>
                  </details>
                )}
              </>
            ) : (
              /* Vista lista de modelos */
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      {["Tipo","Dispositivo","Ref. Palex","Proveedor","Precio","Stock",""].map((h, i) => (
                        <th key={i} className={`px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide ${i >= 3 ? "hidden md:table-cell" : i >= 2 ? "hidden sm:table-cell" : ""}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {catalogoFiltrado.map((item, i) => {
                      const stock = item._stock ?? { total: 0, disponibles: 0, asignados: 0, mantenimiento: 0 }
                      const tc = item.tipo?.color ?? "#9ca3af"
                      const pct = stock.total > 0 ? Math.round((stock.disponibles / stock.total) * 100) : 0
                      return (
                        <tr key={item.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors ${!item.activo ? "opacity-50" : ""} ${i % 2 !== 0 ? "bg-gray-50/20" : ""}`}>
                          <td className="px-4 py-3.5">
                            {item.tipo
                              ? <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: `${tc}18`, color: tc }}>{item.tipo.nombre}</span>
                              : <span className="text-xs bg-gray-100 text-gray-400 px-2.5 py-1 rounded-full font-semibold">Sin tipo</span>}
                          </td>
                          <td className="px-4 py-3.5"><p className="font-semibold text-gray-900">{item.modelo}</p><p className="text-xs text-gray-400">{item.marca}</p></td>
                          <td className="px-4 py-3.5 hidden sm:table-cell">{item.referenciaPalex ? <code className="text-xs font-mono font-semibold" style={{ color: TEAL }}>{item.referenciaPalex}</code> : <span className="text-gray-300 text-xs">—</span>}</td>
                          <td className="px-4 py-3.5 text-xs text-gray-500 hidden md:table-cell">{item.proveedor || "—"}</td>
                          <td className="px-4 py-3.5 text-xs font-semibold text-gray-700 hidden md:table-cell">{item.precio != null ? fmtEuros(item.precio) : "—"}</td>
                          <td className="px-4 py-3.5 hidden md:table-cell">
                            <div className="flex items-center gap-2 min-w-[80px]">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= 70 ? "#16a34a" : pct >= 30 ? TEAL : "#f59e0b" }} />
                              </div>
                              <span className="text-xs text-gray-500 shrink-0">{stock.disponibles}/{stock.total}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setDrawer(item)} className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 cursor-pointer"><IcoEdit /></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )
      )}

      {/* ══ VISTA: TODAS LAS UNIDADES ══════════════════════════════════════════ */}
      {vista === "unidades" && (
        unidadesOrdenadas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border-2 border-dashed border-gray-200 text-gray-300"><IcoBox /></div>
            <p className="text-sm font-semibold text-gray-600">{unidades.length === 0 ? "Sin unidades registradas" : "Sin resultados para los filtros activos"}</p>
            {unidades.length === 0 && <button onClick={() => setNuevaUnidad(true)} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer" style={{ backgroundColor: ORANGE }}><IcoPlus /> Nueva unidad</button>}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Dispositivo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Nº Serie</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Hospital / Proyecto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Antigüedad</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Garantía</th>
                    <th className="px-3 py-3 w-24 sticky right-0 bg-gray-50/80 border-l border-gray-100" />
                  </tr>
                </thead>
                <tbody>
                  {unidadesOrdenadas.map((u, i) => {
                    const es = HW_ESTADO[u.estado] ?? { label: u.estado, color: "#6b7280", bg: "#f3f4f6" }
                    const tc = u.catalogo.tipo?.color ?? "#9ca3af"
                    const dias = diasHasta(u.fechaGarantia)
                    const gAlerta = dias !== null && dias <= 30
                    const rowBg = i % 2 !== 0 ? "#f9fafb" : "#ffffff"
                    return (
                      <tr key={u.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors ${i % 2 !== 0 ? "bg-gray-50/20" : ""}`}>
                        <td className="px-4 py-3.5">
                          {u.catalogo.tipo
                            ? <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: `${tc}18`, color: tc }}>{u.catalogo.tipo.nombre}</span>
                            : <span className="w-2.5 h-2.5 rounded-full bg-gray-200 inline-block" />}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-gray-900 text-xs">{u.catalogo.modelo}</p>
                          <p className="text-[10px] text-gray-400">{u.catalogo.marca}</p>
                          {u.catalogo.referenciaPalex && <code className="text-[10px] font-mono" style={{ color: TEAL }}>{u.catalogo.referenciaPalex}</code>}
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          {u.numSerie ? <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{u.numSerie}</code> : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <select value={u.estado} onChange={e => cambiarEstado(u, e.target.value)}
                            className="text-xs font-bold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 appearance-none"
                            style={{ backgroundColor: es.bg, color: es.color, minWidth: "fit-content" }}>
                            {Object.entries(HW_ESTADO).map(([k, v]) => <option key={k} value={k} className="bg-white text-gray-800">{v.label}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          {u.hospital
                            ? <div><p className="text-xs font-medium text-gray-700">{u.hospital.nombre}</p><p className="text-[10px] text-gray-400">{u.hospital.ciudad}</p></div>
                            : u.proyecto
                            ? <span className="text-xs font-medium" style={{ color: TEAL }}>{u.proyecto.titulo}</span>
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-500 hidden lg:table-cell">{fmtAntiguedad(u.fechaCompra)}</td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          {u.fechaGarantia
                            ? <span className={`text-xs font-medium ${gAlerta ? "text-red-600" : "text-gray-500"}`}>
                                {fmtFecha(u.fechaGarantia)}{gAlerta && <span className="ml-1 font-bold">({dias}d)</span>}
                              </span>
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        {/* Columna de acciones — sticky a la derecha, siempre visible */}
                        <td className="px-3 py-3.5 sticky right-0 border-l border-gray-50" style={{ background: rowBg }}>
                          <div className="flex items-center justify-end gap-0.5">
                            <button onClick={() => setAssignUnitGlobal(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 cursor-pointer transition-colors" title="Asignar a hospital/proyecto"><IcoHospital /></button>
                            <button onClick={() => setEditUnitGlobal(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 cursor-pointer transition-colors" title="Editar unidad"><IcoEdit /></button>
                            {esAdmin && <button onClick={() => eliminarUnidad(u.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors" title="Eliminar"><IcoTrash /></button>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
              {unidadesOrdenadas.length} unidad{unidadesOrdenadas.length !== 1 ? "es" : ""}
              {unidadesOrdenadas.length !== unidades.length && ` (de ${unidades.length} en total)`}
            </div>
          </div>
        )
      )}

      {/* ── Modales y drawers globales ── */}
      {drawer !== null && (
        <MaterialDrawer tipos={tiposLocal} item={drawer === "new" ? null : drawer} onClose={() => setDrawer(null)}
          onSaved={saved => {
            if (drawer === "new") setCatalogo(p => [{ ...saved, _stock: { total: 0, disponibles: 0, asignados: 0, mantenimiento: 0 } }, ...p])
            else setCatalogo(p => p.map(c => c.id === saved.id ? { ...c, ...saved } : c))
            setDrawer(null)
          }} />
      )}
      {nuevaUnidad && (
        <NuevaUnidadModal catalogo={catalogo.filter(c => c.activo)} onClose={() => setNuevaUnidad(false)}
          onCreated={u => {
            onCreated(u)
            setCatalogo(p => p.map(c => c.id === u.catalogo.id
              ? { ...c, _stock: { total: (c._stock?.total ?? 0) + 1, disponibles: (c._stock?.disponibles ?? 0) + 1, asignados: c._stock?.asignados ?? 0, mantenimiento: c._stock?.mantenimiento ?? 0 } }
              : c))
          }} />
      )}
      {editUnitGlobal && <EditUnidadDrawer unidad={editUnitGlobal} onClose={() => setEditUnitGlobal(null)} onSaved={u => { onUpdated(u); setEditUnitGlobal(null) }} />}
      {assignUnitGlobal && <AsignarUnidadModal unidad={assignUnitGlobal} onClose={() => setAssignUnitGlobal(null)} onSaved={u => { onUpdated(u); setAssignUnitGlobal(null) }} />}
      {tiposModal && (
        <CatTiposModal tipos={tiposLocal} onClose={() => setTiposModal(false)}
          onChanged={async () => {
            const r = await fetch("/api/hardware/tipos")
            if (r.ok) setTiposLocal(await r.json())
            setTiposModal(false)
          }} />
      )}
    </div>
  )
}

// ─── Tab: Alertas ─────────────────────────────────────────────────────────────

function AlertasTab({ unidades, onUpdated }: {
  unidades: HardwareUnidad[]
  onUpdated: (u: HardwareUnidad) => void
}) {
  const { success, error: toastError } = useToast()

  const garantiaVencida  = unidades.filter(u => { const d = diasHasta(u.fechaGarantia); return d !== null && d < 0 })
  const garantia30       = unidades.filter(u => { const d = diasHasta(u.fechaGarantia); return d !== null && d >= 0 && d <= 30 })
  const garantia90       = unidades.filter(u => { const d = diasHasta(u.fechaGarantia); return d !== null && d > 30 && d <= 90 })
  const mantVencido      = unidades.filter(u => { const d = diasHasta(u.proximoMantenimiento); return d !== null && d < 0 })
  const mantProximo      = unidades.filter(u => { const d = diasHasta(u.proximoMantenimiento); return d !== null && d >= 0 && d <= 14 })
  const mantenimiento    = unidades.filter(u => u.estado === "EN_MANTENIMIENTO")
  const baja             = unidades.filter(u => u.estado === "BAJA")
  const huerfanos        = unidades.filter(u => u.estado === "ASIGNADO" && !u.proyecto && !u.hospital)

  async function cambiarEstado(u: HardwareUnidad, nuevoEstado: string) {
    const r = await fetch(`/api/hardware/unidades/${u.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    })
    if (r.ok) { onUpdated({ ...u, estado: nuevoEstado }); success("Estado actualizado") }
    else toastError("Error al actualizar")
  }

  function exportarAlertas() {
    const todas = [
      ...garantiaVencida, ...garantia30, ...garantia90,
      ...mantVencido, ...mantProximo, ...mantenimiento, ...baja, ...huerfanos,
    ]
    const unicos = Array.from(new Map(todas.map(u => [u.id, u])).values())
    exportarCSV(unicos.map(u => ({
      Tipo: tipoLabel(u.catalogo),
      Marca: u.catalogo.marca, Modelo: u.catalogo.modelo,
      "Nº Serie": u.numSerie ?? "",
      Estado: HW_ESTADO[u.estado]?.label ?? u.estado,
      Hospital: u.hospital?.nombre ?? "", Proyecto: u.proyecto?.titulo ?? "",
      "Fin Garantía": fmtFecha(u.fechaGarantia),
      "Próx. Mantenimiento": fmtFecha(u.proximoMantenimiento),
      Notas: u.notas ?? "",
    })), "hardware_alertas")
  }

  const totalAlertas = garantiaVencida.length + garantia30.length + garantia90.length + mantVencido.length + mantProximo.length + mantenimiento.length + baja.length + huerfanos.length

  if (totalAlertas === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: `${TEAL}18` }}>
          <IcoCheck />
        </div>
        <p className="text-base font-semibold text-gray-800">Sin alertas activas</p>
        <p className="text-sm text-gray-400 mt-1">Todo el inventario está en orden</p>
      </div>
    )
  }

  function SeccionAlertas({ titulo, items, color, bg, mostrarDias, campo }: {
    titulo: string; items: HardwareUnidad[]; color: string; bg: string
    mostrarDias?: "garantia" | "mantenimiento"; campo?: string
  }) {
    if (items.length === 0) return null
    const ordenados = [...items].sort((a, b) => {
      const fa = mostrarDias === "mantenimiento" ? a.proximoMantenimiento : a.fechaGarantia
      const fb = mostrarDias === "mantenimiento" ? b.proximoMantenimiento : b.fechaGarantia
      return (new Date(fa ?? "9999").getTime()) - (new Date(fb ?? "9999").getTime())
    })
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100" style={{ borderLeft: `4px solid ${color}` }}>
          <span style={{ color }}><IcoWarning /></span>
          <h3 className="text-sm font-semibold text-gray-800">{titulo}</h3>
          <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: bg, color }}>{items.length}</span>
        </div>
        <div className="divide-y divide-gray-50">
          {ordenados.map(u => {
            const fechaRef = mostrarDias === "mantenimiento" ? u.proximoMantenimiento : u.fechaGarantia
            const dias = diasHasta(fechaRef)
            return (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{u.catalogo.marca} {u.catalogo.modelo}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 flex-wrap">
                    {u.numSerie && <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{u.numSerie}</code>}
                    <span>{tipoLabel(u.catalogo)}</span>
                    {(u.hospital || u.proyecto) && <span>· {u.hospital?.nombre ?? u.proyecto?.titulo}</span>}
                  </div>
                </div>
                {dias !== null && (
                  <span className="text-xs font-bold shrink-0" style={{ color }}>
                    {dias === 0 ? "Hoy" : dias < 0 ? `${Math.abs(dias)}d vencido` : `${dias}d`}
                  </span>
                )}
                {fechaRef && <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">{fmtFecha(fechaRef)}</span>}
                {campo && (
                  <select value={u.estado} onChange={e => cambiarEstado(u, e.target.value)}
                    className="text-xs font-bold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 shrink-0 appearance-none"
                    style={{ backgroundColor: HW_ESTADO[u.estado]?.bg ?? "#f3f4f6", color: HW_ESTADO[u.estado]?.color ?? "#6b7280", minWidth: "fit-content" }}>
                    {Object.entries(HW_ESTADO).map(([k, v]) => <option key={k} value={k} className="bg-white text-gray-800">{v.label}</option>)}
                  </select>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{totalAlertas} elemento{totalAlertas !== 1 ? "s" : ""} requieren atención</p>
        <button onClick={exportarAlertas}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          <IcoDownload />Exportar alertas CSV
        </button>
      </div>
      <SeccionAlertas titulo="Garantía vencida" items={garantiaVencida} color="#7f1d1d" bg="#fef2f2" mostrarDias="garantia" campo="estado" />
      <SeccionAlertas titulo="Garantía vence en menos de 30 días" items={garantia30} color="#dc2626" bg="#fef2f2" mostrarDias="garantia" campo="estado" />
      <SeccionAlertas titulo="Garantía vence en 30–90 días" items={garantia90} color="#d97706" bg="#fef3c7" mostrarDias="garantia" campo="estado" />
      <SeccionAlertas titulo="Mantenimiento vencido" items={mantVencido} color="#7c3aed" bg="#f5f3ff" mostrarDias="mantenimiento" campo="estado" />
      <SeccionAlertas titulo="Mantenimiento próximo (≤14 días)" items={mantProximo} color="#6d28d9" bg="#ede9fe" mostrarDias="mantenimiento" campo="estado" />
      <SeccionAlertas titulo="En mantenimiento actualmente" items={mantenimiento} color="#d97706" bg="#fef3c7" campo="estado" />
      <SeccionAlertas titulo="Dados de baja" items={baja} color="#6b7280" bg="#f3f4f6" campo="estado" />
      <SeccionAlertas titulo="Asignados sin destino registrado" items={huerfanos} color={TEAL} bg={`${TEAL}18`} campo="estado" />
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const TABS = [
  { id: "resumen",        label: "Resumen" },
  { id: "materiales",     label: "Materiales" },
  { id: "instalaciones",  label: "Instalaciones" },
  { id: "alertas",        label: "Alertas" },
]

export default function HardwarePage() {
  const [tab, setTab] = useState("resumen")
  const [rol, setRol] = useState("")
  const [unidades, setUnidades] = useState<HardwareUnidad[]>([])
  const [catalogo, setCatalogo] = useState<HardwareCatalogo[]>([])
  const [tipos, setTipos] = useState<HardwareTipo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/perfil").then(r => r.ok ? r.json() : null).then(d => { if (d?.rol) setRol(d.rol) }).catch(() => {})
  }, [])

  const cargar = useCallback(async () => {
    setLoading(true)
    const [ru, rc, rt] = await Promise.all([
      fetch("/api/hardware/unidades").then(r => r.ok ? r.json() : []),
      fetch("/api/hardware?activo=false").then(r => r.ok ? r.json() : []),
      fetch("/api/hardware/tipos").then(r => r.ok ? r.json() : []),
    ])
    if (Array.isArray(ru)) setUnidades(ru)
    if (Array.isArray(rc)) setCatalogo(rc)
    if (Array.isArray(rt)) setTipos(rt)
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const esAdmin = rol === "ADMIN"

  const alertasCount = loading ? 0 : unidades.filter(u => {
    const dg = diasHasta(u.fechaGarantia)
    const dm = diasHasta(u.proximoMantenimiento)
    return (dg !== null && dg <= 90) || (dm !== null && dm <= 14) || u.estado === "EN_MANTENIMIENTO" || u.estado === "BAJA"
  }).length

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hardware & Materiales</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión completa del inventario de dispositivos</p>
        </div>
        <button onClick={cargar} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="relative px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === t.id
              ? { backgroundColor: "white", color: TEAL, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
              : { color: "#6b7280" }}>
            {t.label}
            {t.id === "alertas" && alertasCount > 0 && (
              <span className="pop-in absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                style={{ backgroundColor: "#ef4444" }}>
                {alertasCount > 9 ? "9+" : alertasCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="space-y-4">
          <div className="stagger-grid grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
          <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      ) : (
        <div className="slide-down">
          {tab === "resumen" && (
            <ResumenTab unidades={unidades} catalogo={catalogo} onTabChange={setTab} />
          )}
          {tab === "materiales" && (
            <MaterialesTab
              unidades={unidades}
              onUpdated={u => setUnidades(prev => prev.map(x => x.id === u.id ? u : x))}
              onDeleted={id => setUnidades(prev => prev.filter(x => x.id !== id))}
              onCreated={u => setUnidades(prev => [u, ...prev])}
              catalogo={catalogo}
              setCatalogo={setCatalogo}
              esAdmin={esAdmin}
              tipos={tipos}
            />
          )}
          {tab === "instalaciones" && (
            <InstalacionesTab
              unidades={unidades}
              onUpdated={u => setUnidades(prev => prev.map(x => x.id === u.id ? u : x))}
              tipos={tipos}
            />
          )}
          {tab === "alertas" && (
            <AlertasTab
              unidades={unidades}
              onUpdated={u => setUnidades(prev => prev.map(x => x.id === u.id ? u : x))}
            />
          )}
        </div>
      )}
    </div>
  )
}
