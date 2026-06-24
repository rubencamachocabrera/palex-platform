"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { TEAL, TEAL_LIGHT, TEAL_DARK, ORANGE } from "@/lib/brand"
import { PageHeader } from "@/components/ui/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton"
import { useToast } from "@/components/Toast"
import { usePerfil } from "@/hooks/usePerfil"
import { IconSearch, IconPlus, IconX, IconChevronDown, IconFileExport } from "@/components/ui/Icons"

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

interface Incidencia {
  id: string
  codigo: string
  titulo: string
  tipo: "HARDWARE" | "SOFTWARE"
  categoria: string
  prioridad: "BAJA" | "MEDIA" | "ALTA" | "CRITICA"
  estado: string
  equipoResponsable: string
  slaHoras: number | null
  creadoEn: string
  actualizadoEn: string
  fechaResolucion: string | null
  fechaCierre: string | null
  hospital: { id: string; nombre: string; ciudad: string }
  contacto: { id: string; nombre: string; cargo: string | null } | null
  reportadoPor: { id: string; nombre: string }
  asignadoA: { id: string; nombre: string } | null
  hardwareUnidad: { id: string; numSerie: string | null; catalogo: { marca: string; modelo: string } } | null
  _count: { eventos: number }
}

interface Hospital { id: string; nombre: string; ciudad: string }
interface Usuario { id: string; nombre: string }

const ESTADOS = [
  { value: "ABIERTA", label: "Abierta", color: "#ef4444", bg: "#fef2f2" },
  { value: "EN_PROGRESO", label: "En progreso", color: "#f59e0b", bg: "#fffbeb" },
  { value: "PENDIENTE_CLIENTE", label: "Pend. cliente", color: "#8b5cf6", bg: "#f5f3ff" },
  { value: "PENDIENTE_PROVEEDOR", label: "Pend. proveedor", color: "#6366f1", bg: "#eef2ff" },
  { value: "RESUELTA", label: "Resuelta", color: "#10b981", bg: "#ecfdf5" },
  { value: "CERRADA", label: "Cerrada", color: "#6b7280", bg: "#f3f4f6" },
]

const PRIORIDADES = [
  { value: "CRITICA", label: "Crítica", color: "#dc2626", bg: "#fef2f2" },
  { value: "ALTA", label: "Alta", color: "#f97316", bg: "#fff7ed" },
  { value: "MEDIA", label: "Media", color: "#f59e0b", bg: "#fffbeb" },
  { value: "BAJA", label: "Baja", color: TEAL, bg: TEAL_LIGHT },
]

const CATEGORIAS: Record<string, string> = {
  BC_ROBO: "BC Robo", ZEBRA_MC: "Zebra MC", ZEBRA_IMPRESORA: "Zebra Impresora",
  READER_RFID: "Reader RFID", GATEWAY_BT: "Gateway BT", MINI_PC: "Mini-PC",
  NEVERA: "Nevera", PANTALLA: "Pantalla", INLAB: "InLab", OTRO: "Otro",
}

const EQUIPOS: Record<string, string> = {
  SERVICIO_TECNICO: "Servicio Técnico", APLICACIONES: "Aplicaciones", AMBOS: "Ambos",
}

function getEstadoStyle(estado: string) {
  return ESTADOS.find(e => e.value === estado) ?? { label: estado, color: "#6b7280", bg: "#f3f4f6" }
}

function getPrioridadStyle(prioridad: string) {
  return PRIORIDADES.find(p => p.value === prioridad) ?? { label: prioridad, color: "#6b7280", bg: "#f3f4f6" }
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return "Ahora"
  if (min < 60) return `Hace ${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Hace ${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return "Ayer"
  if (d < 7) return `Hace ${d} días`
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
}

function slaStatus(creadoEn: string, slaHoras: number | null, estado: string): { label: string; color: string } {
  if (["RESUELTA", "CERRADA"].includes(estado)) return { label: "Cumplido", color: "#10b981" }
  if (!slaHoras) return { label: "Sin SLA", color: "#9ca3af" }
  const elapsed = (Date.now() - new Date(creadoEn).getTime()) / 3600000
  const pct = elapsed / slaHoras
  if (pct > 1) return { label: "Vencido", color: "#ef4444" }
  if (pct > 0.75) return { label: "En riesgo", color: "#f59e0b" }
  return { label: "En plazo", color: "#10b981" }
}

export default function IncidenciasPage() {
  const { success, error: toastError } = useToast()
  const { perfil, rol } = usePerfil()

  const [items, setItems] = useState<Incidencia[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroPrioridad, setFiltroPrioridad] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [showModal, setShowModal] = useState(false)

  // Create form
  const [hospitales, setHospitales] = useState<Hospital[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [form, setForm] = useState({
    titulo: "", descripcion: "", tipo: "HARDWARE" as "HARDWARE" | "SOFTWARE",
    categoria: "BC_ROBO", prioridad: "MEDIA", equipoResponsable: "SERVICIO_TECNICO",
    hospitalId: "", contactoId: "", asignadoAId: "", slaHoras: "48",
    hardwareUnidadId: "",
  })
  const [contactos, setContactos] = useState<{ id: string; nombre: string; cargo: string | null }[]>([])
  const [hwUnidades, setHwUnidades] = useState<{ id: string; numSerie: string | null; catalogo: { marca: string; modelo: string } }[]>([])
  const [creando, setCreando] = useState(false)

  // Export modal
  const [showExport, setShowExport] = useState(false)
  const [exportDesde, setExportDesde] = useState("")
  const [exportHasta, setExportHasta] = useState("")
  const [exportHospitalId, setExportHospitalId] = useState("")
  const [exportEstado, setExportEstado] = useState("")

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams()
    if (filtroEstado) params.set("estado", filtroEstado)
    if (filtroPrioridad) params.set("prioridad", filtroPrioridad)
    if (filtroTipo) params.set("tipo", filtroTipo)
    if (busqueda.trim()) params.set("q", busqueda.trim())
    const r = await fetch(`/api/incidencias?${params}`)
    if (r.ok) {
      const data = await r.json()
      setItems(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }, [filtroEstado, filtroPrioridad, filtroTipo, busqueda])

  useEffect(() => { fetchItems() }, [fetchItems])

  useEffect(() => {
    if (!showModal) return
    fetch("/api/hospitales?limit=500").then(r => r.ok ? r.json() : []).then(d => {
      if (Array.isArray(d)) setHospitales(d)
    })
    fetch("/api/usuarios").then(r => r.ok ? r.json() : []).then(d => {
      if (Array.isArray(d)) setUsuarios(d)
    })
  }, [showModal])

  useEffect(() => {
    if (!form.hospitalId) { setContactos([]); setHwUnidades([]); return }
    fetch(`/api/hospitales/${form.hospitalId}/contactos`).then(r => r.ok ? r.json() : []).then(d => {
      if (Array.isArray(d)) setContactos(d)
    })
    fetch(`/api/hardware/unidades?hospitalId=${form.hospitalId}`).then(r => r.ok ? r.json() : []).then(d => {
      if (Array.isArray(d)) setHwUnidades(d)
    })
  }, [form.hospitalId])

  async function crear() {
    if (!form.titulo.trim() || !form.hospitalId || !form.descripcion.trim()) {
      toastError("Completa los campos obligatorios")
      return
    }
    setCreando(true)
    try {
      const body: Record<string, unknown> = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        tipo: form.tipo,
        categoria: form.categoria,
        prioridad: form.prioridad,
        equipoResponsable: form.equipoResponsable,
        hospitalId: form.hospitalId,
        slaHoras: parseInt(form.slaHoras) || 48,
      }
      if (form.contactoId) body.contactoId = form.contactoId
      if (form.asignadoAId) body.asignadoAId = form.asignadoAId
      if (form.hardwareUnidadId) body.hardwareUnidadId = form.hardwareUnidadId

      const r = await fetch("/api/incidencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? "Error") }
      setShowModal(false)
      setForm({ titulo: "", descripcion: "", tipo: "HARDWARE", categoria: "BC_ROBO", prioridad: "MEDIA", equipoResponsable: "SERVICIO_TECNICO", hospitalId: "", contactoId: "", asignadoAId: "", slaHoras: "48", hardwareUnidadId: "" })
      success("Incidencia creada correctamente")
      fetchItems()
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : "Error al crear")
    } finally {
      setCreando(false)
    }
  }

  function exportarInforme() {
    const params = new URLSearchParams()
    if (exportEstado) params.set("estado", exportEstado)
    if (exportHospitalId) params.set("hospitalId", exportHospitalId)
    if (exportDesde) params.set("desde", exportDesde)
    if (exportHasta) params.set("hasta", exportHasta)

    fetch(`/api/incidencias?${params}&limit=500`).then(r => r.ok ? r.json() : []).then((data: Incidencia[]) => {
      if (!Array.isArray(data) || data.length === 0) { toastError("No hay incidencias con esos filtros"); return }

      const hospitalName = esc(exportHospitalId ? hospitales.find(h => h.id === exportHospitalId)?.nombre ?? "" : "Todos")
      const rangoStr = [exportDesde, exportHasta].filter(Boolean).join(" — ") || "Todas las fechas"

      const kpiAbiertas = data.filter(i => i.estado === "ABIERTA").length
      const kpiProgreso = data.filter(i => i.estado === "EN_PROGRESO").length
      const kpiPendientes = data.filter(i => i.estado.startsWith("PENDIENTE")).length
      const kpiResueltas = data.filter(i => ["RESUELTA", "CERRADA"].includes(i.estado)).length
      const kpiHW = data.filter(i => i.tipo === "HARDWARE").length
      const kpiSW = data.filter(i => i.tipo === "SOFTWARE").length

      const rows = data.map(i => {
        const est = getEstadoStyle(i.estado)
        const sla = slaStatus(i.creadoEn, i.slaHoras, i.estado)
        return `<tr>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;font-family:monospace;color:#64748b">${esc(i.codigo)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px">${esc(i.titulo)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px">${esc(i.hospital.nombre)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9"><span style="font-size:11px;font-weight:600;color:${est.color};background:${est.bg};padding:2px 8px;border-radius:10px">${est.label}</span></td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px">${i.tipo === "HARDWARE" ? "HW" : "SW"} · ${esc(CATEGORIAS[i.categoria] ?? i.categoria)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px">${esc(EQUIPOS[i.equipoResponsable] ?? i.equipoResponsable)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:center"><span style="color:${sla.color};font-weight:600">${esc(sla.label)}</span></td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#64748b">${new Date(i.creadoEn).toLocaleDateString("es-ES")}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px">${esc(i.asignadoA?.nombre ?? "—")}</td>
        </tr>`
      }).join("")

      const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Informe Incidencias — Palex</title>
      <style>@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:15mm}}</style></head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:1100px;margin:30px auto;color:#1e293b;padding:0 20px">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid ${TEAL};padding-bottom:14px;margin-bottom:20px">
          <div>
            <h1 style="margin:0;font-size:20px;color:#0f172a">Informe de Incidencias</h1>
            <p style="margin:4px 0 0;font-size:12px;color:#64748b">Hospital: ${hospitalName} · Periodo: ${rangoStr}</p>
          </div>
          <div style="text-align:right">
            <p style="margin:0;font-size:11px;color:#94a3b8">Generado: ${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</p>
            <p style="margin:2px 0 0;font-size:13px;font-weight:700;color:${TEAL}">Palex Medical</p>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:24px">
          ${[
            { l: "Total", v: data.length, c: "#0f172a" },
            { l: "Abiertas", v: kpiAbiertas, c: "#ef4444" },
            { l: "En progreso", v: kpiProgreso, c: "#f59e0b" },
            { l: "Pendientes", v: kpiPendientes, c: "#8b5cf6" },
            { l: "Resueltas", v: kpiResueltas, c: "#10b981" },
            { l: "HW / SW", v: kpiHW + " / " + kpiSW, c: "#3b82f6" },
          ].map(k => `<div style="background:#f8fafc;padding:10px 12px;border-radius:8px;text-align:center"><p style="margin:0;font-size:10px;text-transform:uppercase;color:#94a3b8;font-weight:700">${k.l}</p><p style="margin:4px 0 0;font-size:18px;font-weight:800;color:${k.c}">${k.v}</p></div>`).join("")}
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
          <thead><tr style="background:#f8fafc">
            ${["Código", "Título", "Hospital", "Estado", "Tipo", "Equipo", "SLA", "Fecha", "Asignado"].map(h => `<th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;border-bottom:2px solid #e2e8f0">${h}</th>`).join("")}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="text-align:center;font-size:10px;color:#94a3b8;margin-top:32px">${data.length} incidencias · Informe generado automáticamente — Palex Medical</p>
      </body></html>`

      const w = window.open("", "_blank")
      if (w) { w.document.write(html); w.document.close(); w.print() }
      setShowExport(false)
    })
  }

  const hwCategorias = ["BC_ROBO", "ZEBRA_MC", "ZEBRA_IMPRESORA", "READER_RFID", "GATEWAY_BT", "MINI_PC", "NEVERA", "PANTALLA"]
  const swCategorias = ["INLAB", "OTRO"]

  const abiertas = items.filter(i => i.estado === "ABIERTA").length
  const enProgreso = items.filter(i => i.estado === "EN_PROGRESO").length
  const pendientes = items.filter(i => i.estado.startsWith("PENDIENTE")).length
  const resueltas = items.filter(i => ["RESUELTA", "CERRADA"].includes(i.estado)).length

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Incidencias"
        subtitle="Gestión de incidencias de hardware y software"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (hospitales.length === 0) fetch("/api/hospitales?limit=500").then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setHospitales(d) }); setShowExport(true) }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <IconFileExport size={16} />
              <span className="hidden sm:inline">Informe</span>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: TEAL }}
            >
              <IconPlus size={16} />
              <span className="hidden sm:inline">Nueva incidencia</span>
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Abiertas", value: abiertas, color: "#ef4444", bg: "#fef2f2", darkBg: "dark:bg-red-950/20", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
          { label: "En progreso", value: enProgreso, color: "#f59e0b", bg: "#fffbeb", darkBg: "dark:bg-amber-950/20", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
          { label: "Pendientes", value: pendientes, color: "#8b5cf6", bg: "#f5f3ff", darkBg: "dark:bg-violet-950/20", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg> },
          { label: "Resueltas", value: resueltas, color: "#10b981", bg: "#ecfdf5", darkBg: "dark:bg-emerald-950/20", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
        ].map(kpi => (
          <button key={kpi.label} onClick={() => setFiltroEstado(filtroEstado === kpi.label.toUpperCase().replace(/ /g, "_") ? "" : kpi.label === "Abiertas" ? "ABIERTA" : kpi.label === "En progreso" ? "EN_PROGRESO" : kpi.label === "Pendientes" ? "" : kpi.label === "Resueltas" ? "RESUELTA" : "")}
            className={`bg-white ${kpi.darkBg} dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm text-left transition-all hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700`}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{kpi.label}</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>{kpi.icon}</div>
            </div>
            <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
            {items.length > 0 && <div className="mt-2 w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.max(2, (kpi.value / items.length) * 100)}%`, backgroundColor: kpi.color }} /></div>}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por código, título..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white dark:bg-gray-900 dark:text-white"
          />
          {busqueda && (
            <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <IconX size={14} />
            </button>
          )}
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 dark:text-white focus:outline-none">
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <select value={filtroPrioridad} onChange={e => setFiltroPrioridad(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 dark:text-white focus:outline-none">
          <option value="">Todas las prioridades</option>
          {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 dark:text-white focus:outline-none">
          <option value="">HW + SW</option>
          <option value="HARDWARE">Hardware</option>
          <option value="SOFTWARE">Software</option>
        </select>
      </div>

      {/* Active filter chips */}
      {(filtroEstado || filtroPrioridad || filtroTipo) && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-gray-400">Filtros:</span>
          {filtroEstado && (
            <button onClick={() => setFiltroEstado("")} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              style={{ borderColor: getEstadoStyle(filtroEstado).color, color: getEstadoStyle(filtroEstado).color }}>
              {getEstadoStyle(filtroEstado).label} <IconX size={11} />
            </button>
          )}
          {filtroPrioridad && (
            <button onClick={() => setFiltroPrioridad("")} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              style={{ borderColor: getPrioridadStyle(filtroPrioridad).color, color: getPrioridadStyle(filtroPrioridad).color }}>
              {getPrioridadStyle(filtroPrioridad).label} <IconX size={11} />
            </button>
          )}
          {filtroTipo && (
            <button onClick={() => setFiltroTipo("")} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
              {filtroTipo === "HARDWARE" ? "Hardware" : "Software"} <IconX size={11} />
            </button>
          )}
          <button onClick={() => { setFiltroEstado(""); setFiltroPrioridad(""); setFiltroTipo("") }} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline ml-1">
            Limpiar todos
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Sin incidencias"
          description="No hay incidencias registradas con estos filtros."
          icon={
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          }
        />
      ) : (
        <div className="space-y-2">
          {items.map(inc => {
            const est = getEstadoStyle(inc.estado)
            const pri = getPrioridadStyle(inc.prioridad)
            const sla = slaStatus(inc.creadoEn, inc.slaHoras, inc.estado)
            return (
              <Link
                key={inc.id}
                href={`/incidencias/${inc.id}`}
                className="block bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-all hover:border-gray-200 dark:hover:border-gray-700"
              >
                <div className="flex items-start gap-3">
                  {/* Priority bar */}
                  <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: pri.color }} />

                  <div className="flex-1 min-w-0">
                    {/* Top row */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono font-bold text-gray-400">{inc.codigo}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: est.bg, color: est.color }}>{est.label}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: pri.bg, color: pri.color }}>{pri.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {inc.tipo === "HARDWARE" ? "HW" : "SW"} · {CATEGORIAS[inc.categoria] ?? inc.categoria}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${sla.color}15`, color: sla.color }}>
                        SLA: {sla.label}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{inc.titulo}</h3>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                      <span>{inc.hospital.nombre}</span>
                      <span>·</span>
                      <span>{EQUIPOS[inc.equipoResponsable] ?? inc.equipoResponsable}</span>
                      {inc.asignadoA && <><span>·</span><span>Asignada a {inc.asignadoA.nombre}</span></>}
                      {inc.hardwareUnidad && (
                        <><span>·</span><span>{inc.hardwareUnidad.catalogo.marca} {inc.hardwareUnidad.catalogo.modelo}{inc.hardwareUnidad.numSerie ? ` (${inc.hardwareUnidad.numSerie})` : ""}</span></>
                      )}
                      <span className="ml-auto shrink-0">{timeAgo(inc.creadoEn)}</span>
                      {inc._count.eventos > 1 && <span className="text-gray-400">{inc._count.eventos} eventos</span>}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] px-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[calc(100vh-2rem)] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nueva incidencia</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1"><IconX size={18} /></button>
              </div>

              <div className="px-6 py-4 space-y-4">
                {/* Hospital */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Hospital *</label>
                  <select value={form.hospitalId} onChange={e => setForm(f => ({ ...f, hospitalId: e.target.value, contactoId: "", hardwareUnidadId: "" }))}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400">
                    <option value="">Seleccionar hospital...</option>
                    {hospitales.map(h => <option key={h.id} value={h.id}>{h.nombre} — {h.ciudad}</option>)}
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Título *</label>
                  <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                    placeholder="Descripción breve del problema..."
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>

                {/* Type + Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Tipo *</label>
                    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                      {(["HARDWARE", "SOFTWARE"] as const).map(t => (
                        <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t, categoria: t === "HARDWARE" ? "BC_ROBO" : "INLAB" }))}
                          className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${form.tipo === t ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500"}`}>
                          {t === "HARDWARE" ? "Hardware" : "Software"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Categoría *</label>
                    <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none">
                      {(form.tipo === "HARDWARE" ? hwCategorias : swCategorias).map(c =>
                        <option key={c} value={c}>{CATEGORIAS[c]}</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Priority + Team */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Prioridad</label>
                    <div className="flex gap-1 flex-wrap">
                      {PRIORIDADES.map(p => (
                        <button key={p.value} onClick={() => setForm(f => ({ ...f, prioridad: p.value }))}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                          style={form.prioridad === p.value ? { backgroundColor: p.bg, color: p.color, borderColor: p.color } : { borderColor: "#e5e7eb", color: "#9ca3af" }}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Equipo</label>
                    <select value={form.equipoResponsable} onChange={e => setForm(f => ({ ...f, equipoResponsable: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none">
                      <option value="SERVICIO_TECNICO">Servicio Técnico</option>
                      <option value="APLICACIONES">Aplicaciones</option>
                      <option value="AMBOS">Ambos</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Descripción *</label>
                  <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                    rows={3} placeholder="Describe el problema en detalle..."
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
                </div>

                {/* Optional fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Contacto hospital</label>
                    <select value={form.contactoId} onChange={e => setForm(f => ({ ...f, contactoId: e.target.value }))}
                      disabled={!form.hospitalId}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none disabled:opacity-50">
                      <option value="">Sin contacto</option>
                      {contactos.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.cargo ? ` — ${c.cargo}` : ""}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Asignar a</label>
                    <select value={form.asignadoAId} onChange={e => setForm(f => ({ ...f, asignadoAId: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none">
                      <option value="">Sin asignar</option>
                      {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </div>
                </div>

                {/* Hardware unit */}
                {form.tipo === "HARDWARE" && form.hospitalId && hwUnidades.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Unidad de hardware afectada</label>
                    <select value={form.hardwareUnidadId} onChange={e => setForm(f => ({ ...f, hardwareUnidadId: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none">
                      <option value="">No especificada</option>
                      {hwUnidades.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.catalogo.marca} {u.catalogo.modelo}{u.numSerie ? ` — SN: ${u.numSerie}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* SLA */}
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 shrink-0">SLA (horas)</label>
                  <input type="number" value={form.slaHoras} onChange={e => setForm(f => ({ ...f, slaHoras: e.target.value }))}
                    min="1" max="9999"
                    className="w-24 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none" />
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-4 flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800 transition-colors">Cancelar</button>
                <button onClick={crear} disabled={creando || !form.titulo.trim() || !form.hospitalId || !form.descripcion.trim()}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: TEAL }}>
                  {creando ? "Creando..." : "Crear incidencia"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Export Modal */}
      {showExport && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowExport(false)} />
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Exportar informe</h2>
                <button onClick={() => setShowExport(false)} className="text-gray-400 hover:text-gray-600 p-1"><IconX size={18} /></button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Hospital</label>
                  <select value={exportHospitalId} onChange={e => setExportHospitalId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400">
                    <option value="">Todos los hospitales</option>
                    {hospitales.map(h => <option key={h.id} value={h.id}>{h.nombre} — {h.ciudad}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Desde</label>
                    <input type="date" value={exportDesde} onChange={e => setExportDesde(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Hasta</label>
                    <input type="date" value={exportHasta} onChange={e => setExportHasta(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Estado</label>
                  <select value={exportEstado} onChange={e => setExportEstado(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none">
                    <option value="">Todos los estados</option>
                    {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                <button onClick={() => setShowExport(false)} className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800 transition-colors">Cancelar</button>
                <button onClick={exportarInforme}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: TEAL }}>
                  <IconFileExport size={15} />
                  Generar informe
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
