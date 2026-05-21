"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { exportarCSV } from "@/lib/csv"
import { TEAL, ORANGE } from "@/lib/brand"

const TIPO_LABELS: Record<string, string> = {
  HOSPITAL_PUBLICO: "H. Público",
  HOSPITAL_PRIVADO: "H. Privado",
  CLINICA_PRIVADA: "Clínica",
  LABORATORIO: "Laboratorio",
  CENTRO_SALUD: "C. Salud",
  UNIVERSIDAD: "Universidad",
  OTRO: "Otro",
}
const TIPO_LABELS_FULL: Record<string, string> = {
  HOSPITAL_PUBLICO: "Hospital Público",
  HOSPITAL_PRIVADO: "Hospital Privado",
  CLINICA_PRIVADA: "Clínica Privada",
  LABORATORIO: "Laboratorio",
  CENTRO_SALUD: "Centro de Salud",
  UNIVERSIDAD: "Universidad",
  OTRO: "Otro",
}

const TIPO_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  HOSPITAL_PUBLICO: { bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6" },
  HOSPITAL_PRIVADO: { bg: "#f5f3ff", text: "#6d28d9", dot: "#8b5cf6" },
  CLINICA_PRIVADA:  { bg: "#eef2ff", text: "#4338ca", dot: "#6366f1" },
  LABORATORIO:      { bg: "#fffbeb", text: "#b45309", dot: "#f59e0b" },
  CENTRO_SALUD:     { bg: "#f0fdf4", text: "#15803d", dot: "#22c55e" },
  UNIVERSIDAD:      { bg: "#fff7ed", text: "#c2410c", dot: "#f97316" },
  OTRO:             { bg: "#f9fafb", text: "#6b7280", dot: "#9ca3af" },
}

function TipoIcon({ tipo }: { tipo: string }) {
  const col = TIPO_COLOR[tipo]?.dot ?? "#9ca3af"
  if (tipo === "LABORATORIO") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11l-5 5"/><path d="M3 9h18"/>
    </svg>
  )
  if (tipo === "UNIVERSIDAD") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  )
  if (tipo === "CENTRO_SALUD") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/>
    </svg>
  )
}

interface Zona { id: string; nombre: string }
interface Hospital {
  id: string; nombre: string; ciudad: string; provincia: string | null
  tipo: string; activo: boolean; camas: number | null
  latitud: number | null; longitud: number | null
  zona: { id: string; nombre: string }
  _count?: { visitas: number; contactos: number }
}

const FORM_EMPTY = {
  nombre: "", ciudad: "", provincia: "", pais: "España",
  tipo: "HOSPITAL_PUBLICO", camas: "", zonaId: "", activo: true,
  latitud: "", longitud: "",
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-12 gap-3 px-5 py-4 items-center border-b border-gray-50 last:border-0">
      <div className="col-span-4 space-y-1.5">
        <div className="h-3.5 bg-gray-100 rounded-full w-3/4 animate-pulse" />
        <div className="h-2.5 bg-gray-100 rounded-full w-1/2 animate-pulse" />
      </div>
      <div className="col-span-2"><div className="h-5 bg-gray-100 rounded-full w-16 animate-pulse" /></div>
      <div className="col-span-2"><div className="h-5 bg-gray-100 rounded-full w-20 animate-pulse" /></div>
      <div className="col-span-1"><div className="h-3 bg-gray-100 rounded-full w-10 animate-pulse" /></div>
      <div className="col-span-1"><div className="h-3 bg-gray-100 rounded-full w-8 animate-pulse" /></div>
      <div className="col-span-2 flex gap-1.5 justify-end">
        <div className="h-7 w-14 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-7 w-14 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    </div>
  )
}

export default function HospitalesAdminPage() {
  const [hospitales, setHospitales] = useState<Hospital[]>([])
  const [zonas, setZonas] = useState<Zona[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroZona, setFiltroZona] = useState("TODAS")
  const [filtroTipo, setFiltroTipo] = useState("TODOS")
  const [filtroActivo, setFiltroActivo] = useState<"TODOS" | "ACTIVOS" | "INACTIVOS">("TODOS")
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...FORM_EMPTY })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")
  const [fetchError, setFetchError] = useState("")
  const nombreRef = useRef<HTMLInputElement>(null)

  const cargar = useCallback(async () => {
    setLoading(true); setFetchError("")
    try {
      const [rH, rZ] = await Promise.all([fetch("/api/hospitales"), fetch("/api/zonas")])
      if (!rH.ok || !rZ.ok) throw new Error(`HTTP ${rH.status}/${rZ.status}`)
      const [dataH, dataZ] = await Promise.all([rH.json(), rZ.json()])
      setHospitales(Array.isArray(dataH) ? dataH : [])
      setZonas(Array.isArray(dataZ) ? dataZ : [])
    } catch (e) {
      console.error("Error cargando:", e)
      setFetchError("No se pudieron cargar los datos. Comprueba la conexión.")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    if (!modalOpen) return
    const t = setTimeout(() => nombreRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [modalOpen])

  useEffect(() => {
    if (!modalOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setModalOpen(false)
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) guardar()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  })

  const activos = hospitales.filter(h => h.activo).length
  const inactivos = hospitales.length - activos
  const sinVisitas = hospitales.filter(h => (h._count?.visitas ?? 0) === 0).length
  const avgCamas = hospitales.filter(h => h.camas).length
    ? Math.round(hospitales.filter(h => h.camas).reduce((s, h) => s + (h.camas ?? 0), 0) / hospitales.filter(h => h.camas).length)
    : 0

  const tiposDisponibles = Array.from(new Set(hospitales.map(h => h.tipo))).sort()
  const zonasUnicas = Array.from(new Set(hospitales.map(h => h.zona.nombre))).sort()

  const maxVisitas = Math.max(...hospitales.map(h => h._count?.visitas ?? 0), 1)

  const filtrados = hospitales.filter(h => {
    const q = busqueda.toLowerCase()
    if (q && !h.nombre.toLowerCase().includes(q) && !h.ciudad.toLowerCase().includes(q) && !h.zona.nombre.toLowerCase().includes(q)) return false
    if (filtroZona !== "TODAS" && h.zona.nombre !== filtroZona) return false
    if (filtroTipo !== "TODOS" && h.tipo !== filtroTipo) return false
    if (filtroActivo === "ACTIVOS" && !h.activo) return false
    if (filtroActivo === "INACTIVOS" && h.activo) return false
    return true
  })

  function exportar() {
    exportarCSV(filtrados.map(h => ({
      Nombre: h.nombre,
      Ciudad: h.ciudad,
      Provincia: h.provincia ?? "",
      Tipo: TIPO_LABELS_FULL[h.tipo] ?? h.tipo,
      Zona: h.zona.nombre,
      Camas: h.camas ?? "",
      Activo: h.activo ? "Sí" : "No",
      Visitas: h._count?.visitas ?? 0,
      Contactos: h._count?.contactos ?? 0,
    })), "hospitales")
  }

  function abrirCrear() {
    setEditId(null)
    setForm({ ...FORM_EMPTY, zonaId: zonas[0]?.id ?? "" })
    setError(""); setModalOpen(true)
  }

  function abrirEditar(h: Hospital) {
    setEditId(h.id)
    setForm({
      nombre: h.nombre, ciudad: h.ciudad, provincia: h.provincia ?? "",
      pais: "España", tipo: h.tipo, camas: h.camas?.toString() ?? "",
      zonaId: h.zona.id, activo: h.activo,
      latitud: h.latitud?.toString() ?? "", longitud: h.longitud?.toString() ?? "",
    })
    setError(""); setModalOpen(true)
  }

  async function guardar() {
    if (!form.nombre.trim() || !form.ciudad.trim() || !form.zonaId) {
      setError("Nombre, ciudad y zona son obligatorios"); return
    }
    setGuardando(true); setError("")
    try {
      const payload = {
        nombre: form.nombre.trim(), ciudad: form.ciudad.trim(),
        provincia: form.provincia.trim() || null, pais: "España",
        tipo: form.tipo, camas: form.camas ? parseInt(form.camas) : null,
        zonaId: form.zonaId, activo: form.activo,
        latitud: form.latitud ? parseFloat(form.latitud) : null,
        longitud: form.longitud ? parseFloat(form.longitud) : null,
      }
      const url = editId ? `/api/hospitales/${editId}` : "/api/hospitales"
      const method = editId ? "PATCH" : "POST"
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!r.ok) { const d = await r.json(); setError(d.error ?? "Error al guardar"); return }
      setModalOpen(false); await cargar()
    } finally { setGuardando(false) }
  }

  const f = (k: keyof typeof FORM_EMPTY, v: string | boolean) => setForm(prev => ({ ...prev, [k]: v }))

  const INPUT = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent bg-white transition-shadow"
  const RING = { "--tw-ring-color": TEAL } as React.CSSProperties

  return (
    <div className="space-y-5">

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Hospitales</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {loading ? "Cargando..." : `${hospitales.length} centros registrados`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={exportar}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            CSV
          </button>
          <button
            onClick={abrirCrear}
            className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg hover:opacity-90 transition shadow-sm"
            style={{ backgroundColor: ORANGE }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo hospital
          </button>
        </div>
      </div>

      {/* Error de carga */}
      {fetchError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-sm text-red-600 flex-1">{fetchError}</p>
          <button onClick={cargar} className="text-xs font-semibold text-red-600 hover:text-red-800 underline">Reintentar</button>
        </div>
      )}

      {/* KPI chips */}
      {!loading && !fetchError && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total", value: hospitales.length, sub: "centros",
              icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>,
              bg: "#f0fdfa", ring: "#99f6e4",
            },
            {
              label: "Activos", value: activos, sub: `${Math.round((activos / (hospitales.length || 1)) * 100)}% del total`,
              icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>,
              bg: "#f0fdf4", ring: "#86efac",
            },
            {
              label: "Inactivos", value: inactivos, sub: "deshabilitados",
              icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
              bg: "#f9fafb", ring: "#e5e7eb",
            },
            {
              label: "Camas (media)", value: avgCamas || "—", sub: sinVisitas + " sin visitas",
              icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><line x1="12" y1="4" x2="12" y2="10"/></svg>,
              bg: "#fff7ed", ring: "#fed7aa",
            },
          ].map(k => (
            <div key={k.label}
              className="rounded-xl border px-4 py-3.5 flex items-center gap-3"
              style={{ backgroundColor: k.bg, borderColor: k.ring }}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: k.ring }}>
                {k.icon}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-gray-900 leading-none">{k.value}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-tight">{k.label}</p>
                <p className="text-[10px] text-gray-400 truncate">{k.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Barra de filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, ciudad o zona…"
            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent bg-white"
            style={RING}
          />
          {busqueda && (
            <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
        {zonasUnicas.length > 1 && (
          <select
            value={filtroZona}
            onChange={e => setFiltroZona(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:border-transparent min-w-0 sm:w-44"
            style={RING}
          >
            <option value="TODAS">Todas las zonas</option>
            {zonasUnicas.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        )}
      </div>

      {/* Filtros de tipo + estado — pills */}
      {!loading && !fetchError && (tiposDisponibles.length > 1 || true) && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFiltroTipo("TODOS")}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
            style={filtroTipo === "TODOS"
              ? { backgroundColor: TEAL, color: "#fff", borderColor: TEAL }
              : { backgroundColor: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}
          >
            Todos los tipos
            <span className="text-[10px] opacity-70 font-normal">({hospitales.length})</span>
          </button>
          {tiposDisponibles.map(tipo => {
            const col = TIPO_COLOR[tipo] ?? { bg: "#f9fafb", text: "#6b7280", dot: "#9ca3af" }
            const cnt = hospitales.filter(h => h.tipo === tipo).length
            const active = filtroTipo === tipo
            return (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(active ? "TODOS" : tipo)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
                style={active
                  ? { backgroundColor: col.dot, color: "#fff", borderColor: col.dot }
                  : { backgroundColor: col.bg, color: col.text, borderColor: col.dot + "55" }}
              >
                <TipoIcon tipo={tipo} />
                {TIPO_LABELS[tipo] ?? tipo}
                <span className="text-[10px] opacity-70 font-normal">({cnt})</span>
              </button>
            )
          })}
          <div className="w-px bg-gray-200 self-stretch mx-1" />
          {(["TODOS", "ACTIVOS", "INACTIVOS"] as const).map(k => (
            <button
              key={k}
              onClick={() => setFiltroActivo(k)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
              style={filtroActivo === k
                ? { backgroundColor: k === "ACTIVOS" ? "#16a34a" : k === "INACTIVOS" ? "#6b7280" : TEAL, color: "#fff", borderColor: "transparent" }
                : { backgroundColor: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}
            >
              {k === "TODOS" ? "Todos" : k === "ACTIVOS" ? "Activos" : "Inactivos"}
            </button>
          ))}
        </div>
      )}

      {/* Tabla / contenido */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-gray-50 bg-gray-50">
            {["Hospital", "Zona", "Tipo", "Camas", "Visitas", "Acciones"].map(h => (
              <p key={h} className={`text-xs font-semibold text-gray-300 uppercase tracking-wider ${h === "Acciones" ? "col-span-2 text-right" : h === "Camas" || h === "Visitas" ? "col-span-1" : "col-span-2 " + (h === "Hospital" ? "col-span-4" : "")}`}>{h}</p>
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/>
            </svg>
          </div>
          <p className="text-gray-500 text-sm font-semibold">
            {busqueda ? "Sin resultados para la búsqueda" : "No hay hospitales"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {busqueda ? `"${busqueda}" no coincide con ningún centro` : "Crea el primer hospital con el botón superior"}
          </p>
          {(busqueda || filtroTipo !== "TODOS" || filtroZona !== "TODAS" || filtroActivo !== "TODOS") && (
            <button
              onClick={() => { setBusqueda(""); setFiltroTipo("TODOS"); setFiltroZona("TODAS"); setFiltroActivo("TODOS") }}
              className="text-xs mt-3 font-semibold px-3 py-1.5 rounded-lg border transition-colors"
              style={{ color: TEAL, borderColor: TEAL + "44", backgroundColor: TEAL + "0f" }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header tabla */}
          <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/80">
            <p className="col-span-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Hospital</p>
            <p className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Zona</p>
            <p className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipo</p>
            <p className="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Camas</p>
            <p className="col-span-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Visitas</p>
            <p className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Acciones</p>
          </div>

          <div className="divide-y divide-gray-50">
            {filtrados.map(h => {
              const tipoCol = TIPO_COLOR[h.tipo] ?? TIPO_COLOR.OTRO
              const visitasCount = h._count?.visitas ?? 0
              const barPct = Math.round((visitasCount / maxVisitas) * 100)
              return (
                <div key={h.id}
                  className="group grid grid-cols-12 gap-2 px-5 py-3.5 items-center hover:bg-gray-50/80 transition-colors"
                >
                  {/* Hospital name */}
                  <div className="col-span-4 min-w-0 flex items-center gap-2.5">
                    <div className="relative shrink-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: tipoCol.bg, color: tipoCol.text }}
                      >
                        {h.nombre.charAt(0).toUpperCase()}
                      </div>
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                        style={{ backgroundColor: h.activo ? "#22c55e" : "#d1d5db" }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{h.nombre}</p>
                      <p className="text-xs text-gray-400 truncate">{h.ciudad}{h.provincia ? `, ${h.provincia}` : ""}</p>
                    </div>
                  </div>

                  {/* Zona */}
                  <div className="col-span-2">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full truncate block w-fit max-w-full"
                      style={{ backgroundColor: TEAL + "15", color: TEAL }}
                    >
                      {h.zona.nombre}
                    </span>
                  </div>

                  {/* Tipo */}
                  <div className="col-span-2">
                    <span
                      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: tipoCol.bg, color: tipoCol.text }}
                    >
                      <TipoIcon tipo={h.tipo} />
                      {TIPO_LABELS[h.tipo] ?? h.tipo}
                    </span>
                  </div>

                  {/* Camas */}
                  <div className="col-span-1">
                    <span className="text-xs text-gray-500 font-medium tabular-nums">
                      {h.camas ? h.camas.toLocaleString() : <span className="text-gray-300">—</span>}
                    </span>
                  </div>

                  {/* Visitas con mini-barra */}
                  <div className="col-span-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-gray-700 tabular-nums w-4 text-right shrink-0">{visitasCount}</span>
                      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden min-w-0">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${barPct}%`, backgroundColor: visitasCount > 0 ? TEAL : "#e5e7eb" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="col-span-2 flex gap-1.5 justify-end">
                    <Link
                      href={`/hospitales/${h.id}`}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                      Ver
                    </Link>
                    <button
                      onClick={() => abrirEditar(h)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Editar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/60 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Mostrando <span className="font-semibold text-gray-600">{filtrados.length}</span> de <span className="font-semibold text-gray-600">{hospitales.length}</span> hospitales
            </p>
            {filtrados.length !== hospitales.length && (
              <button
                onClick={() => { setBusqueda(""); setFiltroTipo("TODOS"); setFiltroZona("TODAS"); setFiltroActivo("TODOS") }}
                className="text-xs font-medium transition-colors"
                style={{ color: TEAL }}
              >
                Ver todos
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal crear / editar */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            {/* Header modal */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: TEAL + "18" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">{editId ? "Editar hospital" : "Nuevo hospital"}</h2>
                  <p className="text-xs text-gray-400">{editId ? "Modifica los datos del centro" : "Introduce los datos del nuevo centro"}</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                aria-label="Cerrar"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* Sección: Información básica */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Información básica</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">Nombre del centro <span className="text-red-400">*</span></label>
                    <input
                      ref={nombreRef}
                      value={form.nombre}
                      onChange={e => f("nombre", e.target.value)}
                      placeholder="Hospital Universitario de..."
                      className={INPUT}
                      style={RING}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">Ciudad <span className="text-red-400">*</span></label>
                      <input
                        value={form.ciudad}
                        onChange={e => f("ciudad", e.target.value)}
                        placeholder="Madrid"
                        className={INPUT}
                        style={RING}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">Provincia</label>
                      <input
                        value={form.provincia}
                        onChange={e => f("provincia", e.target.value)}
                        placeholder="Madrid"
                        className={INPUT}
                        style={RING}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección: Clasificación */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Clasificación</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-2">Tipo de centro</label>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(TIPO_LABELS_FULL).map(([k, v]) => {
                        const col = TIPO_COLOR[k] ?? TIPO_COLOR.OTRO
                        const sel = form.tipo === k
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => f("tipo", k)}
                            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-all"
                            style={sel
                              ? { backgroundColor: col.dot, color: "#fff", borderColor: col.dot }
                              : { backgroundColor: col.bg, color: col.text, borderColor: col.dot + "66" }}
                          >
                            <TipoIcon tipo={k} />
                            {v}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">Zona <span className="text-red-400">*</span></label>
                      <select
                        value={form.zonaId}
                        onChange={e => f("zonaId", e.target.value)}
                        className={INPUT + " bg-white"}
                        style={RING}
                      >
                        <option value="">Seleccionar zona...</option>
                        {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">Núm. de camas</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={form.camas}
                        onChange={e => f("camas", e.target.value)}
                        placeholder="500"
                        className={INPUT}
                        style={RING}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección: Coordenadas (colapsable / secundaria) */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Coordenadas GPS <span className="text-gray-300 normal-case font-normal">(opcional)</span></p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">Latitud</label>
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={form.latitud}
                      onChange={e => f("latitud", e.target.value)}
                      placeholder="40.4168"
                      className={INPUT}
                      style={RING}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">Longitud</label>
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={form.longitud}
                      onChange={e => f("longitud", e.target.value)}
                      placeholder="-3.7038"
                      className={INPUT}
                      style={RING}
                    />
                  </div>
                </div>
              </div>

              {/* Toggle activo (solo en edición) */}
              {editId && (
                <div className="flex items-center justify-between py-1 px-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Hospital activo</p>
                    <p className="text-xs text-gray-400">Los centros inactivos no aparecen en las listas</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => f("activo", !form.activo)}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0"
                    style={{ backgroundColor: form.activo ? TEAL : "#e5e7eb" }}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.activo ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-2.5 rounded-xl">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}
            </div>

            {/* Footer modal */}
            <div className="flex gap-3 px-6 pb-6 pt-1">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: ORANGE }}
              >
                {guardando ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Guardando…
                  </>
                ) : (
                  editId ? "Guardar cambios" : "Crear hospital"
                )}
              </button>
            </div>

            <p className="text-center text-[10px] text-gray-300 pb-4">⌘ + Enter para guardar · Esc para cerrar</p>
          </div>
        </div>
      )}
    </div>
  )
}
