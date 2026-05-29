"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { TEAL, ORANGE } from "@/lib/brand"
import { exportarCSV } from "@/lib/csv"
import { useToast } from "@/components/Toast"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface HardwareTipo {
  id: string; nombre: string; color: string
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
  preProyecto: { id: string; titulo: string } | null
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
                      <p className="text-xs text-gray-500">{u.numSerie ? `S/N: ${u.numSerie}` : "Sin nº serie"} · {u.hospital?.nombre ?? u.preProyecto?.titulo ?? "—"}</p>
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
            <button onClick={() => onTabChange("catalogo")} className="text-xs font-medium hover:underline" style={{ color: TEAL }}>Gestionar catálogo</button>
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

// ─── Modal edición de unidad ──────────────────────────────────────────────────

function EditUnidadModal({ unidad, onClose, onSaved }: {
  unidad: HardwareUnidad
  onClose: () => void
  onSaved: (u: HardwareUnidad) => void
}) {
  const { success, error: toastError } = useToast()
  const [form, setForm] = useState({
    numSerie: unidad.numSerie ?? "",
    estado: unidad.estado,
    notas: unidad.notas ?? "",
    fechaCompra: unidad.fechaCompra ? unidad.fechaCompra.slice(0, 10) : "",
    fechaGarantia: unidad.fechaGarantia ? unidad.fechaGarantia.slice(0, 10) : "",
    proximoMantenimiento: unidad.proximoMantenimiento ? unidad.proximoMantenimiento.slice(0, 10) : "",
    hospitalId: unidad.hospital?.id ?? "",
  })
  const [guardando, setGuardando] = useState(false)
  const [hospitales, setHospitales] = useState<{ id: string; nombre: string; ciudad: string }[]>([])

  useEffect(() => {
    fetch("/api/hospitales").then(r => r.ok ? r.json() : []).then(d => {
      if (Array.isArray(d)) setHospitales(d.sort((a: { nombre: string }, b: { nombre: string }) => a.nombre.localeCompare(b.nombre)))
    }).catch(() => {})
  }, [])

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    try {
      const r = await fetch(`/api/hardware/unidades/${unidad.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numSerie: form.numSerie || null,
          estado: form.estado,
          notas: form.notas || null,
          fechaCompra: form.fechaCompra || null,
          fechaGarantia: form.fechaGarantia || null,
          proximoMantenimiento: form.proximoMantenimiento || null,
          hospitalId: form.hospitalId || null,
        }),
      })
      if (!r.ok) throw new Error()
      const updated = await r.json()
      const hosp = hospitales.find(h => h.id === form.hospitalId) ?? null
      onSaved({ ...unidad, ...updated, hospital: hosp ? { id: hosp.id, nombre: hosp.nombre, ciudad: hosp.ciudad } : (form.hospitalId ? unidad.hospital : null) })
      success("Unidad actualizada")
      onClose()
    } catch {
      toastError("Error al guardar")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-150">
      <div className="slide-up bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Editar unidad</h2>
            <p className="text-xs text-gray-400 mt-0.5">{unidad.catalogo.marca} {unidad.catalogo.modelo} · {tipoLabel(unidad.catalogo)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={guardar} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={LABEL}>Nº de serie</label>
              <input value={form.numSerie} onChange={e => setForm(p => ({ ...p, numSerie: e.target.value }))}
                placeholder="S/N opcional" className={INPUT + " font-mono"} />
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Estado</label>
              <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))} className={INPUT}>
                {Object.entries(HW_ESTADO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Hospital asignado</label>
              <select value={form.hospitalId} onChange={e => setForm(p => ({ ...p, hospitalId: e.target.value }))} className={INPUT}>
                <option value="">— Sin asignar —</option>
                {hospitales.map(h => <option key={h.id} value={h.id}>{h.nombre} ({h.ciudad})</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Fecha de compra</label>
              <input type="date" value={form.fechaCompra} onChange={e => setForm(p => ({ ...p, fechaCompra: e.target.value }))} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Fin de garantía</label>
              <input type="date" value={form.fechaGarantia} onChange={e => setForm(p => ({ ...p, fechaGarantia: e.target.value }))} className={INPUT} />
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Próximo mantenimiento</label>
              <input type="date" value={form.proximoMantenimiento} onChange={e => setForm(p => ({ ...p, proximoMantenimiento: e.target.value }))} className={INPUT} />
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Notas</label>
              <textarea rows={2} value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                placeholder="Observaciones…" className={INPUT + " resize-none"} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: TEAL }}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Tab: Inventario ──────────────────────────────────────────────────────────

type SortCol = "tipo" | "modelo" | "estado" | "hospital" | "antiguedad" | "garantia" | null
type SortDir = "asc" | "desc"

function InventarioTab({ unidades, onUpdated, onDeleted, esAdmin, tipos }: {
  unidades: HardwareUnidad[]
  onUpdated: (u: HardwareUnidad) => void
  onDeleted: (id: string) => void
  esAdmin: boolean
  tipos: HardwareTipo[]
}) {
  const { success, error: toastError } = useToast()
  const [q, setQ] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroHospital, setFiltroHospital] = useState("")
  const [sortCol, setSortCol] = useState<SortCol>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [vistaCards, setVistaCards] = useState(false)
  const [editando, setEditando] = useState<HardwareUnidad | null>(null)

  const hospitalesUnicos = Array.from(new Map(
    unidades.filter(u => u.hospital).map(u => [u.hospital!.id, u.hospital!])
  ).values()).sort((a, b) => a.nombre.localeCompare(b.nombre))

  function toggleSort(col: SortCol) {
    if (sortCol === col) {
      if (sortDir === "asc") setSortDir("desc")
      else { setSortCol(null) }
    } else {
      setSortCol(col); setSortDir("asc")
    }
  }

  const filtered = unidades.filter(u => {
    const matchQ = !q || [u.numSerie, u.catalogo.marca, u.catalogo.modelo, u.notas, u.hospital?.nombre, u.preProyecto?.titulo]
      .some(s => s?.toLowerCase().includes(q.toLowerCase()))
    const matchTipo    = !filtroTipo    || u.catalogo.tipoId === filtroTipo
    const matchEstado  = !filtroEstado  || u.estado === filtroEstado
    const matchHosp    = !filtroHospital || u.hospital?.id === filtroHospital
    return matchQ && matchTipo && matchEstado && matchHosp
  })

  const sorted = [...filtered].sort((a, b) => {
    if (!sortCol) return 0
    let va = "", vb = ""
    if (sortCol === "tipo")      { va = tipoLabel(a.catalogo);      vb = tipoLabel(b.catalogo) }
    if (sortCol === "modelo")    { va = `${a.catalogo.marca} ${a.catalogo.modelo}`; vb = `${b.catalogo.marca} ${b.catalogo.modelo}` }
    if (sortCol === "estado")    { va = a.estado;                   vb = b.estado }
    if (sortCol === "hospital")  { va = a.hospital?.nombre ?? "";   vb = b.hospital?.nombre ?? "" }
    if (sortCol === "antiguedad") {
      const da = diasDesde(a.fechaCompra) ?? -1
      const db = diasDesde(b.fechaCompra) ?? -1
      return sortDir === "asc" ? da - db : db - da
    }
    if (sortCol === "garantia") {
      const da = a.fechaGarantia ? new Date(a.fechaGarantia).getTime() : Infinity
      const db = b.fechaGarantia ? new Date(b.fechaGarantia).getTime() : Infinity
      return sortDir === "asc" ? da - db : db - da
    }
    return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
  })

  async function cambiarEstado(u: HardwareUnidad, nuevoEstado: string) {
    const r = await fetch(`/api/hardware/unidades/${u.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    })
    if (r.ok) { onUpdated({ ...u, estado: nuevoEstado }); success("Estado actualizado") }
    else toastError("Error al actualizar")
  }

  async function eliminar(u: HardwareUnidad) {
    if (!confirm(`¿Eliminar ${u.catalogo.marca} ${u.catalogo.modelo}${u.numSerie ? ` (${u.numSerie})` : ""}?`)) return
    const r = await fetch(`/api/hardware/unidades/${u.id}`, { method: "DELETE" })
    if (r.ok) { onDeleted(u.id); success("Unidad eliminada") }
    else toastError("Error al eliminar")
  }

  function exportar() {
    exportarCSV(sorted.map(u => ({
      Tipo: tipoLabel(u.catalogo),
      Marca: u.catalogo.marca, Modelo: u.catalogo.modelo,
      "Nº Serie": u.numSerie ?? "",
      Estado: HW_ESTADO[u.estado]?.label ?? u.estado,
      Hospital: u.hospital?.nombre ?? "", Ciudad: u.hospital?.ciudad ?? "",
      Proyecto: u.preProyecto?.titulo ?? "",
      "Fecha Compra": fmtFecha(u.fechaCompra),
      "Fin Garantía": fmtFecha(u.fechaGarantia),
      "Próx. Mantenimiento": fmtFecha(u.proximoMantenimiento),
      "Precio Unitario (€)": u.catalogo.precio ?? "",
      Notas: u.notas ?? "",
    })), "hardware_inventario")
  }

  const hayFiltros = q || filtroTipo || filtroEstado || filtroHospital

  function ThSort({ col, children }: { col: SortCol; children: React.ReactNode }) {
    return (
      <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">
        <button onClick={() => toggleSort(col)} className="flex items-center gap-1 hover:text-gray-600 transition-colors">
          {children}
          <IcoSort dir={sortCol === col ? sortDir : null} />
        </button>
      </th>
    )
  }

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"><IcoSearch /></span>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar modelo, marca, nº serie, hospital…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
          <option value="">Todos los tipos</option>
          {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
          <option value="">Todos los estados</option>
          {Object.entries(HW_ESTADO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filtroHospital} onChange={e => setFiltroHospital(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
          <option value="">Todos los hospitales</option>
          {hospitalesUnicos.map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}
        </select>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setVistaCards(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            title={vistaCards ? "Vista tabla" : "Vista tarjetas"}>
            {vistaCards ? <IcoList /> : <IcoGrid />}
          </button>
          <button onClick={exportar}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <IcoDownload /><span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Breadcrumb filtros activos */}
      {hayFiltros && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-gray-400">Filtros:</span>
          {filtroTipo && <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">{filtroTipo}</span>}
          {filtroEstado && <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">{HW_ESTADO[filtroEstado]?.label}</span>}
          {filtroHospital && <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">{hospitalesUnicos.find(h => h.id === filtroHospital)?.nombre}</span>}
          {q && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">"{q}"</span>}
          <button onClick={() => { setQ(""); setFiltroTipo(""); setFiltroEstado(""); setFiltroHospital("") }}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-1">Limpiar</button>
        </div>
      )}

      {/* Empty state */}
      {sorted.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-2xl border border-gray-100">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
            <IcoSearch />
          </div>
          <p className="text-sm font-medium text-gray-600">
            {unidades.length === 0 ? "Sin unidades registradas" : hayFiltros ? "Sin resultados para los filtros activos" : "Sin unidades"}
          </p>
          {unidades.length > 0 && hayFiltros && (
            <p className="text-xs text-gray-400 mt-1">Prueba a cambiar o limpiar los filtros</p>
          )}
        </div>
      ) : vistaCards ? (
        /* Vista Tarjetas */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map(u => {
            const hw = HW_ESTADO[u.estado] ?? { label: u.estado, color: "#6b7280", bg: "#f3f4f6" }
            const dias = diasHasta(u.fechaGarantia)
            const garantiaAlerta = dias !== null && dias <= 30
            return (
              <div key={u.id} className="kanban-card bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{tipoLabel(u.catalogo)}</span>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{u.catalogo.marca} {u.catalogo.modelo}</p>
                    {u.numSerie && <code className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mt-1 inline-block">{u.numSerie}</code>}
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0" style={{ backgroundColor: hw.bg, color: hw.color }}>{hw.label}</span>
                </div>
                <div className="space-y-1 text-xs text-gray-500">
                  {(u.hospital || u.preProyecto) && (
                    <div className="flex items-center gap-1.5"><IcoHospital /><span className="truncate">{u.hospital?.nombre ?? u.preProyecto?.titulo}</span></div>
                  )}
                  {u.fechaGarantia && (
                    <div className={`flex items-center gap-1.5 ${garantiaAlerta ? "text-red-600 font-semibold" : ""}`}>
                      <IcoWarning /><span>Garantía: {fmtFecha(u.fechaGarantia)}{garantiaAlerta ? ` (${dias}d)` : ""}</span>
                    </div>
                  )}
                  {u.fechaCompra && <div className="text-gray-400">Antigüedad: {fmtAntiguedad(u.fechaCompra)}</div>}
                </div>
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-50 justify-end">
                  <button onClick={() => setEditando(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors" title="Editar"><IcoEdit /></button>
                  {esAdmin && <button onClick={() => eliminar(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Eliminar"><IcoTrash /></button>}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Vista Tabla */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <ThSort col="tipo">Tipo</ThSort>
                  <ThSort col="modelo">Dispositivo</ThSort>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">Nº Serie</th>
                  <ThSort col="estado">Estado</ThSort>
                  <ThSort col="hospital">Hospital / Proyecto</ThSort>
                  <ThSort col="antiguedad">Antigüedad</ThSort>
                  <ThSort col="garantia">Garantía</ThSort>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((u, i) => {
                  const hw = HW_ESTADO[u.estado] ?? { label: u.estado, color: "#6b7280", bg: "#f3f4f6" }
                  const dias = diasHasta(u.fechaGarantia)
                  const garantiaAlerta = dias !== null && dias <= 30
                  return (
                    <tr key={u.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i % 2 !== 0 ? "bg-gray-50/20" : ""}`}>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">{tipoLabel(u.catalogo)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-gray-900">{u.catalogo.marca} {u.catalogo.modelo}</p>
                        {u.catalogo.precio && <p className="text-xs text-gray-400">{fmtEuros(u.catalogo.precio)}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        {u.numSerie ? <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">{u.numSerie}</code> : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <select value={u.estado} onChange={e => cambiarEstado(u, e.target.value)}
                          className="text-xs font-bold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400"
                          style={{ backgroundColor: hw.bg, color: hw.color }}>
                          {Object.entries(HW_ESTADO).map(([k, v]) => <option key={k} value={k} className="bg-white text-gray-800">{v.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3.5">
                        {u.hospital
                          ? <div><p className="text-xs font-medium text-gray-700">{u.hospital.nombre}</p><p className="text-xs text-gray-400">{u.hospital.ciudad}</p></div>
                          : u.preProyecto
                          ? <Link href={`/pre-proyectos/${u.preProyecto.id}`} className="text-xs font-medium hover:underline" style={{ color: TEAL }}>{u.preProyecto.titulo}</Link>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-gray-500">{fmtAntiguedad(u.fechaCompra)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        {u.fechaGarantia
                          ? <span className={`text-xs font-medium ${garantiaAlerta ? "text-red-600" : "text-gray-500"}`}>
                              {fmtFecha(u.fechaGarantia)}
                              {garantiaAlerta && <span className="ml-1 font-bold">{` (${dias}d)`}</span>}
                            </span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => setEditando(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors" title="Editar / Asignar"><IcoEdit /></button>
                          {esAdmin && <button onClick={() => eliminar(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Eliminar"><IcoTrash /></button>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            {sorted.length} unidad{sorted.length !== 1 ? "es" : ""}
            {sorted.length !== unidades.length && ` (de ${unidades.length} en total)`}
          </div>
        </div>
      )}

      {editando && (
        <EditUnidadModal unidad={editando} onClose={() => setEditando(null)} onSaved={u => { onUpdated(u); setEditando(null) }} />
      )}
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
    } else if (u.preProyecto) {
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
          <h3 className="text-sm font-semibold text-gray-700 mb-3">En pre-proyecto ({enProyecto.length})</h3>
          <div className="space-y-1.5">
            {enProyecto.map(u => (
              <div key={u.id} className="flex items-center gap-3 text-xs text-gray-600">
                <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{tipoLabel(u.catalogo)}</span>
                <span className="font-medium">{u.catalogo.marca} {u.catalogo.modelo}</span>
                {u.numSerie && <code className="font-mono text-gray-400">{u.numSerie}</code>}
                <Link href={`/pre-proyectos/${u.preProyecto!.id}`} className="ml-auto hover:underline shrink-0" style={{ color: TEAL }}>{u.preProyecto!.titulo}</Link>
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

// ─── Tab: Catálogo ────────────────────────────────────────────────────────────

function CatalogoTab({ catalogo, setCatalogo, esAdmin, tipos }: {
  catalogo: HardwareCatalogo[]
  setCatalogo: React.Dispatch<React.SetStateAction<HardwareCatalogo[]>>
  esAdmin: boolean
  tipos: HardwareTipo[]
}) {
  const { success, error: toastError } = useToast()
  const [busqueda, setBusqueda] = useState("")
  const [filtroTipoId, setFiltroTipoId] = useState("")
  const [mostrarForm, setMostrarForm] = useState(false)
  const FORM_VACIO = { tipoId: "", marca: "", modelo: "", referenciaPalex: "", proveedor: "", descripcion: "", precio: "", fichaUrl: "" }
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [unidadesCache, setUnidadesCache] = useState<Record<string, HardwareUnidad[]>>({})
  const [loadingUnidades, setLoadingUnidades] = useState<string | null>(null)
  const [stockForm, setStockForm] = useState<{ catalogoId: string; series: { numSerie: string; notas: string; fechaCompra: string; fechaGarantia: string }[] } | null>(null)
  const [guardandoStock, setGuardandoStock] = useState(false)
  const [editItem, setEditItem] = useState<HardwareCatalogo | null>(null)
  const [editForm, setEditForm] = useState({ tipoId: "", marca: "", modelo: "", referenciaPalex: "", proveedor: "", descripcion: "", precio: "", fichaUrl: "" })
  const [guardandoEdit, setGuardandoEdit] = useState(false)

  const filtrados = catalogo.filter(c => {
    if (filtroTipoId && c.tipoId !== filtroTipoId) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (
        c.marca.toLowerCase().includes(q) ||
        c.modelo.toLowerCase().includes(q) ||
        (c.referenciaPalex?.toLowerCase().includes(q) ?? false) ||
        (c.proveedor?.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  })

  async function toggleExpandido(id: string) {
    if (expandido === id) { setExpandido(null); return }
    setExpandido(id)
    if (unidadesCache[id]) return
    setLoadingUnidades(id)
    const r = await fetch(`/api/hardware/${id}`)
    if (r.ok) {
      const data = await r.json()
      setUnidadesCache(prev => ({ ...prev, [id]: data.unidades ?? [] }))
    }
    setLoadingUnidades(null)
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    if (!form.marca.trim() || !form.modelo.trim()) { toastError("Marca y modelo son obligatorios"); return }
    setGuardando(true)
    try {
      const r = await fetch("/api/hardware", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tipoId: form.tipoId || null, precio: form.precio || null }),
      })
      if (!r.ok) throw new Error()
      const nuevo = await r.json()
      setCatalogo(prev => [{ ...nuevo, _stock: { total: 0, disponibles: 0, asignados: 0, mantenimiento: 0 } }, ...prev])
      setForm(FORM_VACIO)
      setMostrarForm(false)
      success("Modelo creado")
    } catch {
      toastError("Error al crear el modelo")
    } finally {
      setGuardando(false)
    }
  }

  function abrirEditar(item: HardwareCatalogo) {
    setEditItem(item)
    setEditForm({
      tipoId: item.tipoId ?? "",
      marca: item.marca,
      modelo: item.modelo,
      referenciaPalex: item.referenciaPalex ?? "",
      proveedor: item.proveedor ?? "",
      descripcion: item.descripcion ?? "",
      precio: item.precio != null ? String(item.precio) : "",
      fichaUrl: item.fichaUrl ?? "",
    })
  }

  async function guardarEditar(e: React.FormEvent) {
    e.preventDefault()
    if (!editItem) return
    setGuardandoEdit(true)
    try {
      const r = await fetch(`/api/hardware/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, tipoId: editForm.tipoId || null, precio: editForm.precio || null }),
      })
      if (!r.ok) throw new Error()
      const updated = await r.json()
      setCatalogo(prev => prev.map(c => c.id === editItem.id ? { ...c, ...updated } : c))
      setEditItem(null)
      success("Modelo actualizado")
    } catch {
      toastError("Error al actualizar")
    } finally {
      setGuardandoEdit(false)
    }
  }

  async function toggleActivo(item: HardwareCatalogo) {
    const r = await fetch(`/api/hardware/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !item.activo }),
    })
    if (r.ok) {
      setCatalogo(prev => prev.map(c => c.id === item.id ? { ...c, activo: !c.activo } : c))
      success(item.activo ? "Desactivado" : "Activado")
    }
  }

  async function añadirStock(e: React.FormEvent) {
    e.preventDefault()
    if (!stockForm) return
    setGuardandoStock(true)
    try {
      const payload = stockForm.series
        .filter(s => stockForm.series.length === 1 || s.numSerie.trim())
        .map(s => ({
          catalogoId: stockForm.catalogoId,
          numSerie: s.numSerie.trim() || null,
          notas: s.notas.trim() || null,
          fechaCompra: s.fechaCompra || null,
          fechaGarantia: s.fechaGarantia || null,
          estado: "DISPONIBLE",
        }))
      const r = await fetch("/api/hardware/unidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!r.ok) throw new Error()
      const nuevas: HardwareUnidad[] = await r.json()
      setUnidadesCache(prev => ({ ...prev, [stockForm.catalogoId]: [...(prev[stockForm.catalogoId] ?? []), ...nuevas] }))
      setCatalogo(prev => prev.map(c => c.id === stockForm.catalogoId
        ? { ...c, _stock: { total: (c._stock?.total ?? 0) + nuevas.length, disponibles: (c._stock?.disponibles ?? 0) + nuevas.length, asignados: c._stock?.asignados ?? 0, mantenimiento: c._stock?.mantenimiento ?? 0 } }
        : c))
      setStockForm(null)
      success(`${nuevas.length} unidad${nuevas.length !== 1 ? "es" : ""} añadida${nuevas.length !== 1 ? "s" : ""}`)
    } catch {
      toastError("Error al añadir al stock")
    } finally {
      setGuardandoStock(false)
    }
  }

  const emptyStockRow = { numSerie: "", notas: "", fechaCompra: "", fechaGarantia: "" }

  return (
    <div className="space-y-4">
      {/* Barra de filtros y acciones */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Buscador */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><IcoSearch /></span>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar modelo, marca, referencia…"
              className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white w-52"
            />
          </div>
          {/* Tipo pills */}
          <button
            onClick={() => setFiltroTipoId("")}
            className="px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer"
            style={{ backgroundColor: !filtroTipoId ? `${TEAL}18` : "#f9fafb", borderColor: !filtroTipoId ? TEAL : "#e5e7eb", color: !filtroTipoId ? TEAL : "#374151" }}>
            Todos
          </button>
          {tipos.map(t => (
            <button key={t.id}
              onClick={() => setFiltroTipoId(filtroTipoId === t.id ? "" : t.id)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer"
              style={{
                backgroundColor: filtroTipoId === t.id ? `${t.color}22` : "#f9fafb",
                borderColor: filtroTipoId === t.id ? t.color : "#e5e7eb",
                color: filtroTipoId === t.id ? t.color : "#374151",
              }}>
              {t.nombre}
            </button>
          ))}
        </div>
        {esAdmin && (
          <button onClick={() => setMostrarForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shrink-0 hover:opacity-90 transition-opacity cursor-pointer"
            style={{ backgroundColor: TEAL }}>
            <IcoPlus />
            Nuevo modelo
          </button>
        )}
      </div>

      {/* Form nuevo modelo */}
      {mostrarForm && (
        <form onSubmit={crear} className="slide-down bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Añadir modelo al catálogo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div><label className={LABEL}>Tipo</label>
              <select value={form.tipoId} onChange={e => setForm(p => ({ ...p, tipoId: e.target.value }))} className={INPUT}>
                <option value="">Sin tipo</option>
                {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div><label className={LABEL}>Marca *</label>
              <input value={form.marca} onChange={e => setForm(p => ({ ...p, marca: e.target.value }))} placeholder="Zebra, Honeywell…" className={INPUT} required />
            </div>
            <div><label className={LABEL}>Modelo *</label>
              <input value={form.modelo} onChange={e => setForm(p => ({ ...p, modelo: e.target.value }))} placeholder="MC3300, DS2208…" className={INPUT} required />
            </div>
            <div><label className={LABEL}>Ref. Palex</label>
              <input value={form.referenciaPalex} onChange={e => setForm(p => ({ ...p, referenciaPalex: e.target.value }))} placeholder="PAL-XXXX" className={INPUT + " font-mono"} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div><label className={LABEL}>Proveedor</label>
              <input value={form.proveedor} onChange={e => setForm(p => ({ ...p, proveedor: e.target.value }))} placeholder="Nombre proveedor" className={INPUT} />
            </div>
            <div><label className={LABEL}>Precio unitario (€)</label>
              <input type="number" step="0.01" min="0" value={form.precio} onChange={e => setForm(p => ({ ...p, precio: e.target.value }))} placeholder="0.00" className={INPUT} />
            </div>
            <div><label className={LABEL}>URL ficha técnica</label>
              <input type="url" value={form.fichaUrl} onChange={e => setForm(p => ({ ...p, fichaUrl: e.target.value }))} placeholder="https://…" className={INPUT} />
            </div>
            <div><label className={LABEL}>Descripción</label>
              <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Opcional…" className={INPUT} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setMostrarForm(false)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">Cancelar</button>
            <button type="submit" disabled={guardando}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity cursor-pointer"
              style={{ backgroundColor: TEAL }}>{guardando ? "Guardando…" : "Guardar modelo"}</button>
          </div>
        </form>
      )}

      {/* Grid de tarjetas */}
      {filtrados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <IcoSearch />
          </div>
          <p className="text-sm font-medium text-gray-600">Sin resultados</p>
          <p className="text-xs text-gray-400 mt-1">{catalogo.length === 0 ? "El catálogo está vacío. Añade el primer modelo." : "Prueba a cambiar los filtros de búsqueda."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map(item => {
            const stock = item._stock ?? { total: 0, disponibles: 0, asignados: 0, mantenimiento: 0 }
            const isOpen = expandido === item.id
            const unidades = unidadesCache[item.id] ?? []
            const tipoColor = item.tipo?.color ?? "#6b7280"
            const pctDisp = stock.total > 0 ? Math.round((stock.disponibles / stock.total) * 100) : 0

            return (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                {/* Franja de color tipo */}
                <div className="h-1 w-full" style={{ backgroundColor: item.activo ? tipoColor : "#e5e7eb" }} />

                <div className="p-4 flex-1 flex flex-col gap-3">
                  {/* Cabecera tarjeta */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Badge tipo */}
                      {item.tipo && (
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5"
                          style={{ backgroundColor: `${tipoColor}18`, color: tipoColor }}>
                          {item.tipo.nombre}
                        </span>
                      )}
                      <p className="font-bold text-gray-900 text-sm leading-snug">{item.marca} {item.modelo}</p>
                      {item.referenciaPalex && (
                        <code className="text-[11px] font-mono font-semibold mt-0.5 block" style={{ color: TEAL }}>
                          {item.referenciaPalex}
                        </code>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {esAdmin && (
                        <button onClick={() => abrirEditar(item)} title="Editar modelo"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors cursor-pointer">
                          <IcoEdit />
                        </button>
                      )}
                      <button onClick={() => toggleExpandido(item.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        title={isOpen ? "Cerrar stock" : "Ver stock"}>
                        <IcoChevron open={isOpen} />
                      </button>
                    </div>
                  </div>

                  {/* Metadatos */}
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    {item.proveedor && (
                      <span className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5 text-gray-600">{item.proveedor}</span>
                    )}
                    {item.precio != null && (
                      <span className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5">
                        {item.precio.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                      </span>
                    )}
                    {item.fichaUrl && (
                      <a href={item.fichaUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5 hover:border-teal-300 transition-colors"
                        style={{ color: TEAL }}>
                        <IcoDownload />
                        Ficha
                      </a>
                    )}
                  </div>

                  {item.descripcion && (
                    <p className="text-xs text-gray-400 line-clamp-2">{item.descripcion}</p>
                  )}

                  {/* Barra de stock */}
                  <div className="mt-auto pt-2 border-t border-gray-50">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-gray-600">{stock.total} unidades</span>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 font-semibold">{stock.disponibles} disp.</span>
                        <span className="text-gray-400">{stock.asignados} asig.</span>
                        {!item.activo && <span className="text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-medium">Inactivo</span>}
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pctDisp}%`, backgroundColor: pctDisp > 50 ? "#16a34a" : pctDisp > 20 ? TEAL : "#d97706" }} />
                    </div>
                  </div>
                </div>

                {/* Panel stock expandido */}
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        {stock.disponibles} disp. · {stock.asignados} asig. · {stock.total} total
                      </p>
                      <button
                        onClick={() => setStockForm(stockForm?.catalogoId === item.id ? null : { catalogoId: item.id, series: [{ ...emptyStockRow }] })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white hover:opacity-90 transition-opacity cursor-pointer"
                        style={{ backgroundColor: TEAL }}>
                        <IcoPlus />
                        Añadir stock
                      </button>
                    </div>

                    {stockForm?.catalogoId === item.id && (
                      <form onSubmit={añadirStock} className="slide-down bg-white border border-teal-100 rounded-xl p-4 mb-3 space-y-3">
                        <p className="text-xs font-semibold text-gray-700">Nueva entrada de stock</p>
                        <div className="space-y-2">
                          {stockForm.series.map((s, i) => (
                            <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                              <div>
                                {i === 0 && <label className={LABEL}>Nº serie</label>}
                                <input value={s.numSerie}
                                  onChange={e => setStockForm(p => p ? { ...p, series: p.series.map((x, j) => j === i ? { ...x, numSerie: e.target.value } : x) } : p)}
                                  placeholder="Opcional" className={INPUT + " font-mono text-xs"} />
                              </div>
                              <div>
                                {i === 0 && <label className={LABEL}>Fecha compra</label>}
                                <input type="date" value={s.fechaCompra}
                                  onChange={e => setStockForm(p => p ? { ...p, series: p.series.map((x, j) => j === i ? { ...x, fechaCompra: e.target.value } : x) } : p)}
                                  className={INPUT + " text-xs"} />
                              </div>
                              <div>
                                {i === 0 && <label className={LABEL}>Fin garantía</label>}
                                <input type="date" value={s.fechaGarantia}
                                  onChange={e => setStockForm(p => p ? { ...p, series: p.series.map((x, j) => j === i ? { ...x, fechaGarantia: e.target.value } : x) } : p)}
                                  className={INPUT + " text-xs"} />
                              </div>
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  {i === 0 && <label className={LABEL}>Notas</label>}
                                  <input value={s.notas}
                                    onChange={e => setStockForm(p => p ? { ...p, series: p.series.map((x, j) => j === i ? { ...x, notas: e.target.value } : x) } : p)}
                                    placeholder="—" className={INPUT + " text-xs"} />
                                </div>
                                {stockForm.series.length > 1 && (
                                  <button type="button"
                                    onClick={() => setStockForm(p => p ? { ...p, series: p.series.filter((_, j) => j !== i) } : p)}
                                    className="mb-0 p-2 rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50 self-end transition-colors cursor-pointer"><IcoTrash /></button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <button type="button"
                          onClick={() => setStockForm(p => p ? { ...p, series: [...p.series, { ...emptyStockRow }] } : p)}
                          className="text-xs font-medium transition-colors hover:opacity-80 cursor-pointer" style={{ color: TEAL }}>
                          + Añadir fila
                        </button>
                        <div className="flex gap-2 pt-1">
                          <button type="button" onClick={() => setStockForm(null)}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 cursor-pointer">Cancelar</button>
                          <button type="submit" disabled={guardandoStock}
                            className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50 hover:opacity-90 cursor-pointer"
                            style={{ backgroundColor: TEAL }}>
                            {guardandoStock ? "Guardando…" : `Añadir ${stockForm.series.length} ud.`}
                          </button>
                        </div>
                      </form>
                    )}

                    {loadingUnidades === item.id ? (
                      <div className="space-y-1">{[1, 2].map(i => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
                    ) : unidades.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">Sin unidades en stock.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-400 border-b border-gray-200">
                              <th className="text-left pb-2 font-medium">Nº serie</th>
                              <th className="text-left pb-2 font-medium">Estado</th>
                              <th className="text-left pb-2 font-medium">Asignado a</th>
                              <th className="text-left pb-2 font-medium">Garantía</th>
                            </tr>
                          </thead>
                          <tbody>
                            {unidades.map(u => {
                              const es = HW_ESTADO[u.estado] ?? { label: u.estado, color: "#6b7280", bg: "#f3f4f6" }
                              return (
                                <tr key={u.id} className="border-b border-gray-100 last:border-0">
                                  <td className="py-2 pr-3">
                                    {u.numSerie
                                      ? <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{u.numSerie}</code>
                                      : <span className="text-gray-300">—</span>}
                                  </td>
                                  <td className="py-2 pr-3">
                                    <span className="px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: es.bg, color: es.color }}>{es.label}</span>
                                  </td>
                                  <td className="py-2 pr-3 text-gray-500">
                                    {u.preProyecto
                                      ? <Link href={`/pre-proyectos/${u.preProyecto.id}`} className="hover:underline" style={{ color: TEAL }}>{u.preProyecto.titulo}</Link>
                                      : u.hospital?.nombre ?? <span className="text-gray-300">—</span>}
                                  </td>
                                  <td className="py-2 text-gray-400">{fmtFecha(u.fechaGarantia)}</td>
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
            )
          })}
        </div>
      )}

      {/* Modal editar modelo */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-150">
          <div className="slide-up bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Editar modelo</h2>
              <button onClick={() => setEditItem(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={guardarEditar} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div><label className={LABEL}>Tipo</label>
                  <select value={editForm.tipoId} onChange={e => setEditForm(p => ({ ...p, tipoId: e.target.value }))} className={INPUT}>
                    <option value="">Sin tipo</option>
                    {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>
                <div><label className={LABEL}>Marca</label>
                  <input value={editForm.marca} onChange={e => setEditForm(p => ({ ...p, marca: e.target.value }))} className={INPUT} required />
                </div>
                <div><label className={LABEL}>Modelo</label>
                  <input value={editForm.modelo} onChange={e => setEditForm(p => ({ ...p, modelo: e.target.value }))} className={INPUT} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LABEL}>Ref. Palex</label>
                  <input value={editForm.referenciaPalex} onChange={e => setEditForm(p => ({ ...p, referenciaPalex: e.target.value }))} placeholder="PAL-XXXX" className={INPUT + " font-mono"} />
                </div>
                <div><label className={LABEL}>Proveedor</label>
                  <input value={editForm.proveedor} onChange={e => setEditForm(p => ({ ...p, proveedor: e.target.value }))} className={INPUT} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LABEL}>Precio (€)</label>
                  <input type="number" step="0.01" value={editForm.precio} onChange={e => setEditForm(p => ({ ...p, precio: e.target.value }))} placeholder="0.00" className={INPUT} />
                </div>
                <div><label className={LABEL}>URL ficha</label>
                  <input type="url" value={editForm.fichaUrl} onChange={e => setEditForm(p => ({ ...p, fichaUrl: e.target.value }))} placeholder="https://…" className={INPUT} />
                </div>
              </div>
              <div><label className={LABEL}>Descripción</label>
                <input value={editForm.descripcion} onChange={e => setEditForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Opcional…" className={INPUT} />
              </div>
              {esAdmin && (
                <div className="flex items-center gap-2 pt-1">
                  <button type="button" onClick={() => toggleActivo(editItem).then(() => setEditItem(null))}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer">
                    {editItem.activo ? "Desactivar modelo" : "Activar modelo"}
                  </button>
                  <div className="flex-1" />
                  <button type="button" onClick={() => setEditItem(null)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">Cancelar</button>
                  <button type="submit" disabled={guardandoEdit}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 cursor-pointer"
                    style={{ backgroundColor: TEAL }}>{guardandoEdit ? "Guardando…" : "Guardar cambios"}</button>
                </div>
              )}
              {!esAdmin && (
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setEditItem(null)}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">Cancelar</button>
                  <button type="submit" disabled={guardandoEdit}
                    className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 cursor-pointer"
                    style={{ backgroundColor: TEAL }}>{guardandoEdit ? "Guardando…" : "Guardar cambios"}</button>
                </div>
              )}
            </form>
          </div>
        </div>
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
  const huerfanos        = unidades.filter(u => u.estado === "ASIGNADO" && !u.preProyecto && !u.hospital)

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
      Hospital: u.hospital?.nombre ?? "", Proyecto: u.preProyecto?.titulo ?? "",
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
                    {(u.hospital || u.preProyecto) && <span>· {u.hospital?.nombre ?? u.preProyecto?.titulo}</span>}
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
                    className="text-xs font-bold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 shrink-0"
                    style={{ backgroundColor: HW_ESTADO[u.estado]?.bg ?? "#f3f4f6", color: HW_ESTADO[u.estado]?.color ?? "#6b7280" }}>
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
  { id: "inventario",     label: "Inventario" },
  { id: "instalaciones",  label: "Instalaciones" },
  { id: "catalogo",       label: "Catálogo" },
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
    fetch("/api/perfil").then(r => r.ok ? r.json() : null).then(d => { if (d?.role) setRol(d.role) }).catch(() => {})
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
          {tab === "inventario" && (
            <InventarioTab
              unidades={unidades}
              onUpdated={u => setUnidades(prev => prev.map(x => x.id === u.id ? u : x))}
              onDeleted={id => setUnidades(prev => prev.filter(x => x.id !== id))}
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
          {tab === "catalogo" && (
            <CatalogoTab catalogo={catalogo} setCatalogo={setCatalogo} esAdmin={esAdmin} tipos={tipos} />
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
