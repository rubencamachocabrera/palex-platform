"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"

// ---- types ----

interface HospitalShare {
  nombre: string; ciudad: string; provincia: string | null
  tipo: string; camas: number | null; direccion: string | null; pais: string
  zona: { nombre: string }
}
interface FaseShare { id: string; nombre: string; tipo: string; orden: number; estado: string; fechaPlan: string | null; fechaReal: string | null }
interface HitoShare { id: string; titulo: string; fecha: string; completado: boolean }
interface ContactoShare { id: string; nombre: string; cargo: string | null; email: string | null; telefono: string | null; principal: boolean }
interface UnidadShare {
  id: string; numSerie: string | null; estado: string; notas: string | null
  catalogo: { tipo: string; marca: string; modelo: string; precio: number | null }
}
interface VisitaShare { id: string; fecha: string; estado: string; tipo: string; usuario: { nombre: string } }
interface ShareData {
  id: string; titulo: string; descripcion: string | null; estado: string; prioridad: number
  presupuesto: number | null; fechaInicio: string | null; fechaFinPlan: string | null; fechaFinReal: string | null
  notas: string | null; mapaHtml: string | null; creadoEn: string
  hospital: HospitalShare
  responsable: { nombre: string; email: string } | null
  fases: FaseShare[]
  hitos: HitoShare[]
  contactos: { contacto: ContactoShare }[]
  visitas: VisitaShare[]
  hardwareUnidades: UnidadShare[]
}

// ---- constants ----

const TEAL = "#00A99D"
const ORANGE = "#F7941D"

const ESTADO_LABEL: Record<string, string> = {
  NUEVO: "Nuevo", EN_CURSO: "En curso", PAUSADO: "Pausado", COMPLETADO: "Completado", CANCELADO: "Cancelado",
}
const ESTADO_COLOR: Record<string, { bg: string; text: string }> = {
  NUEVO:      { bg: "#f0f9ff", text: "#0369a1" },
  EN_CURSO:   { bg: `${TEAL}18`, text: TEAL },
  PAUSADO:    { bg: "#fef3c7", text: "#d97706" },
  COMPLETADO: { bg: "#f0fdf4", text: "#16a34a" },
  CANCELADO:  { bg: "#fef2f2", text: "#dc2626" },
}
const FASE_COLOR: Record<string, { dot: string; bg: string; text: string }> = {
  PENDIENTE:   { dot: "#d1d5db", bg: "#f9fafb", text: "#6b7280" },
  EN_PROGRESO: { dot: TEAL,     bg: `${TEAL}10`, text: TEAL },
  COMPLETADO:  { dot: "#16a34a", bg: "#f0fdf4",  text: "#16a34a" },
  BLOQUEADO:   { dot: "#dc2626", bg: "#fef2f2",  text: "#dc2626" },
}
const HW_TIPO: Record<string, string> = {
  BC_ROBOT: "BC Robot", ZEBRA_MC: "Zebra MC", ZEBRA_PRINTER: "Zebra Printer",
  LECTOR_BARRAS: "Lector Barras", SERVIDOR: "Servidor", SWITCH_RED: "Switch Red", TABLET: "Tablet", OTRO: "Otro",
}
const TIPO_H: Record<string, string> = {
  HOSPITAL_PUBLICO: "Hospital Público", HOSPITAL_PRIVADO: "Hospital Privado",
  CLINICA_PRIVADA: "Clínica Privada", LABORATORIO: "Laboratorio",
  CENTRO_SALUD: "Centro de Salud", UNIVERSIDAD: "Universidad", OTRO: "Otro",
}
const PRIORIDAD: Record<number, string> = { 1: "Alta", 2: "Crítica" }

function fmt(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

// ---- main ----

export default function ShareProyectoPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<ShareData | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [mapHeight, setMapHeight] = useState(500)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const genDate = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })

  useEffect(() => {
    fetch(`/api/share/proyecto/${token}`)
      .then(r => r.ok ? r.json() : r.json().then((d: { error: string }) => { throw new Error(d.error) }))
      .then(setData)
      .catch(e => setError(e.message ?? "Enlace no válido"))
      .finally(() => setLoading(false))
  }, [token])

  function handleMapLoad(e: React.SyntheticEvent<HTMLIFrameElement>) {
    try {
      const doc = e.currentTarget.contentDocument
      if (doc) setMapHeight(Math.max(400, Math.min(doc.documentElement.scrollHeight + 32, 8000)))
    } catch { setMapHeight(3000) }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: TEAL }} />
    </div>
  )
  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3 p-6">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p className="text-gray-700 font-semibold">Enlace no disponible</p>
      <p className="text-sm text-gray-400 text-center max-w-xs">{error}</p>
    </div>
  )
  if (!data) return null

  const d = data
  const pct = d.fases.length ? Math.round(d.fases.filter(f => f.estado === "COMPLETADO").length / d.fases.length * 100) : 0
  const fasesOK = d.fases.filter(f => f.estado === "COMPLETADO").length
  const totalHW = d.hardwareUnidades.reduce((s, u) => s + (u.catalogo.precio ?? 0), 0)
  const visitasOK = d.visitas.filter(v => v.estado === "COMPLETADA").length
  const estadoStyle = ESTADO_COLOR[d.estado] ?? { bg: "#f3f4f6", text: "#6b7280" }

  // hardware grouped by tipo
  const byTipo = d.hardwareUnidades.reduce<Record<string, UnidadShare[]>>((acc, u) => {
    const t = u.catalogo.tipo; if (!acc[t]) acc[t] = []; acc[t].push(u); return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <style>{`
        @media print {
          @page { margin: 1.5cm 2cm; size: A4 portrait; }
          body { font-size: 11pt; color: #111; }
          .print-section { break-inside: avoid; }
          .print-break { break-before: page; }
          .shadow-sm, .shadow-md, .shadow-2xl { box-shadow: none !important; }
          .border, .border-gray-100 { border-color: #e5e7eb !important; }
          a { color: inherit !important; text-decoration: none !important; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 6px 8px; }
        }
      `}</style>

      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center gap-3 sticky top-0 z-10 print:hidden">
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white whitespace-nowrap" style={{ backgroundColor: TEAL }}>InLab</span>
          <span className="text-xs text-gray-300 hidden sm:block">|</span>
          <span className="text-xs text-gray-400 hidden sm:block whitespace-nowrap">Palex Medical</span>
        </div>
        <div className="flex-1 min-w-0 hidden sm:block">
          <p className="text-sm font-semibold text-gray-800 truncate">{d.titulo}</p>
          <p className="text-xs text-gray-400 truncate">{d.hospital.nombre} · {d.hospital.ciudad}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-80 whitespace-nowrap"
            style={{ backgroundColor: TEAL }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Imprimir
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-6 print:px-0 print:py-4 print:space-y-4">

        {/* Print header */}
        <div className="hidden print:flex items-start justify-between border-b border-gray-200 pb-5 mb-2">
          <div>
            <p className="text-xl font-bold" style={{ color: TEAL }}>Palex Medical · InLab</p>
            <p className="text-sm text-gray-500 mt-0.5">Informe de Proyecto — Uso confidencial</p>
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>Generado: {genDate}</p>
            <p className="mt-0.5 font-semibold" style={{ color: TEAL }}>{d.hospital.nombre}</p>
          </div>
        </div>

        {/* Project header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 print-section">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: estadoStyle.bg, color: estadoStyle.text }}>{ESTADO_LABEL[d.estado]}</span>
                {d.prioridad > 0 && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-50" style={{ color: ORANGE }}>{PRIORIDAD[d.prioridad]}</span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{d.titulo}</h1>
              <p className="text-gray-600">
                <span className="font-semibold text-gray-800">{d.hospital.nombre}</span>
                {" · "}{d.hospital.ciudad}{d.hospital.provincia ? `, ${d.hospital.provincia}` : ""}
                {" · "}<span className="text-gray-500">{TIPO_H[d.hospital.tipo] ?? d.hospital.tipo}</span>
                {d.hospital.camas ? ` · ${d.hospital.camas} camas` : ""}
              </p>
              <p className="text-sm text-gray-400 mt-0.5">
                {d.responsable && <><span className="font-medium text-gray-600">{d.responsable.nombre}</span>{" · "}</>}
                Zona: <span className="font-medium text-gray-600">{d.hospital.zona.nombre}</span>
              </p>
            </div>
            <div className="shrink-0 text-right">
              {d.presupuesto && <p className="text-2xl font-bold text-gray-900">{d.presupuesto.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</p>}
              <p className="text-sm text-gray-400">{fmt(d.fechaInicio)} → {fmt(d.fechaFinPlan)}</p>
              {d.fechaFinReal && <p className="text-xs font-semibold text-green-600 mt-0.5">Entregado: {fmt(d.fechaFinReal)}</p>}
            </div>
          </div>
          <div className="mt-5">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>{fasesOK} de {d.fases.length} fases completadas</span>
              <span className="font-bold" style={{ color: pct === 100 ? "#16a34a" : TEAL }}>{pct}%</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#16a34a" : TEAL }} />
            </div>
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print-section">
          {[
            { label: "Progreso", value: `${pct}%`, sub: `${fasesOK}/${d.fases.length} fases`, color: pct === 100 ? "#16a34a" : TEAL },
            { label: "Hardware", value: String(d.hardwareUnidades.length), sub: totalHW > 0 ? totalHW.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }) : "Sin precios", color: "#7c3aed" },
            { label: "Visitas", value: String(d.visitas.length), sub: `${visitasOK} completadas`, color: "#0369a1" },
            { label: "Contactos", value: String(d.contactos.length), sub: "del proyecto", color: ORANGE },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{k.label}</p>
              <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Hospital + contactos */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Hospital</h3>
            <div className="space-y-2 text-sm">
              <Row label="Tipo" value={TIPO_H[d.hospital.tipo] ?? d.hospital.tipo} />
              <Row label="Ciudad" value={`${d.hospital.ciudad}${d.hospital.provincia ? `, ${d.hospital.provincia}` : ""}`} />
              {d.hospital.camas && <Row label="Camas" value={String(d.hospital.camas)} />}
              {d.hospital.direccion && <Row label="Dirección" value={d.hospital.direccion} />}
              <Row label="Zona" value={d.hospital.zona.nombre} />
              <Row label="País" value={d.hospital.pais} />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Contactos del proyecto</h3>
            {d.contactos.length === 0 ? (
              <p className="text-sm text-gray-400">Sin contactos asignados</p>
            ) : (
              <div className="space-y-2.5">
                {d.contactos.map(({ contacto: c }) => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5" style={{ backgroundColor: TEAL }}>
                      {c.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                        {c.nombre}
                        {c.principal && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${TEAL}18`, color: TEAL }}>Principal</span>}
                      </p>
                      {c.cargo && <p className="text-xs text-gray-500">{c.cargo}</p>}
                      <div className="flex gap-2 mt-0.5 text-xs text-gray-400 flex-wrap">
                        {c.email && <span>{c.email}</span>}
                        {c.telefono && <span>{c.telefono}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        {d.fases.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 print-break print-section">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Fases del proyecto</h3>
            <div className="space-y-2">
              {d.fases.map(f => {
                const s = FASE_COLOR[f.estado] ?? FASE_COLOR.PENDIENTE
                return (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: s.bg }}>
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{f.nombre}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-semibold" style={{ color: s.text }}>{f.estado === "PENDIENTE" ? "Pendiente" : f.estado === "EN_PROGRESO" ? "En progreso" : f.estado === "COMPLETADO" ? "Completado" : "Bloqueado"}</span>
                      {(f.fechaPlan || f.fechaReal) && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {f.fechaReal ? fmt(f.fechaReal) : fmt(f.fechaPlan)}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {d.hitos.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Hitos</h4>
                <div className="flex flex-wrap gap-2">
                  {d.hitos.map(h => (
                    <span key={h.id} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border"
                      style={h.completado ? { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0", color: "#16a34a" } : { backgroundColor: "#fffbeb", borderColor: "#fde68a", color: "#d97706" }}>
                      <span className="text-[10px]">{h.completado ? "✓" : "◇"}</span>
                      {h.titulo} · {fmt(h.fecha)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hardware inventory */}
        {d.hardwareUnidades.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 print-break print-section">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Inventario de hardware</h3>
            <div className="space-y-5">
              {Object.entries(byTipo).map(([tipo, units]) => {
                const subtotal = units.reduce((s, u) => s + (u.catalogo.precio ?? 0), 0)
                return (
                  <div key={tipo}>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                      {HW_TIPO[tipo] ?? tipo} <span className="font-normal text-gray-400">({units.length})</span>
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left text-xs font-semibold text-gray-400 pb-2 pr-4">Modelo</th>
                            <th className="text-left text-xs font-semibold text-gray-400 pb-2 pr-4">N/S</th>
                            <th className="text-left text-xs font-semibold text-gray-400 pb-2 pr-4">Estado</th>
                            <th className="text-right text-xs font-semibold text-gray-400 pb-2">Precio/ud</th>
                          </tr>
                        </thead>
                        <tbody>
                          {units.map(u => (
                            <tr key={u.id} className="border-b border-gray-50 last:border-0">
                              <td className="py-2 pr-4 font-medium text-gray-800">{u.catalogo.marca} {u.catalogo.modelo}</td>
                              <td className="py-2 pr-4 font-mono text-xs text-gray-500">{u.numSerie ?? <span className="text-gray-300">—</span>}</td>
                              <td className="py-2 pr-4">
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                  style={u.estado === "ASIGNADO" ? { backgroundColor: `${TEAL}18`, color: TEAL } : { backgroundColor: "#f3f4f6", color: "#6b7280" }}>
                                  {u.estado === "ASIGNADO" ? "Asignado" : u.estado}
                                </span>
                              </td>
                              <td className="py-2 text-right text-gray-600">
                                {u.catalogo.precio != null ? u.catalogo.precio.toLocaleString("es-ES", { style: "currency", currency: "EUR" }) : <span className="text-gray-300">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {subtotal > 0 && (
                          <tfoot>
                            <tr className="border-t border-gray-200">
                              <td colSpan={3} className="pt-2 text-xs font-semibold text-gray-500">Subtotal {HW_TIPO[tipo] ?? tipo}</td>
                              <td className="pt-2 text-right text-sm font-bold text-gray-800">{subtotal.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
            {totalHW > 0 && (
              <div className="mt-5 pt-4 border-t-2 border-gray-200 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-700">Total hardware</span>
                <span className="text-xl font-bold" style={{ color: TEAL }}>{totalHW.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}</span>
              </div>
            )}
          </div>
        )}

        {/* Visitas */}
        {d.visitas.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Visitas ({d.visitas.length})</h3>
            <div className="space-y-2">
              {d.visitas.slice(0, 8).map(v => (
                <div key={v.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={v.estado === "COMPLETADA" ? { backgroundColor: "#f0fdf4", color: "#16a34a" }
                           : v.estado === "BORRADOR"   ? { backgroundColor: "#fffbeb", color: "#d97706" }
                           :                             { backgroundColor: "#f3f4f6", color: "#6b7280" }}>
                      {v.estado}
                    </span>
                    <span className="text-xs text-gray-500">{v.tipo}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{fmt(v.fecha)}</p>
                    <p className="text-xs text-gray-400">{v.usuario.nombre}</p>
                  </div>
                </div>
              ))}
              {d.visitas.length > 8 && (
                <p className="text-xs text-center text-gray-400 pt-1">+{d.visitas.length - 8} visitas más</p>
              )}
            </div>
          </div>
        )}

        {/* Map */}
        {d.mapaHtml && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mapa de la instalación</h3>
            </div>
            <iframe
              ref={iframeRef}
              srcDoc={d.mapaHtml}
              sandbox="allow-scripts allow-same-origin"
              onLoad={handleMapLoad}
              className="w-full border-0 block"
              style={{ height: mapHeight }}
              title="Mapa del proyecto"
            />
          </div>
        )}

        {/* Notas */}
        {(d.descripcion || d.notas) && (
          <div className="grid sm:grid-cols-2 gap-4">
            {d.descripcion && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Descripción</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{d.descripcion}</p>
              </div>
            )}
            {d.notas && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Notas internas</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{d.notas}</p>
              </div>
            )}
          </div>
        )}

        {/* Print footer */}
        <div className="hidden print:flex items-center justify-between pt-6 border-t border-gray-200 text-xs text-gray-400">
          <span>Palex Medical · InLab — Uso confidencial</span>
          <span>Generado: {genDate}</span>
        </div>

      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-20 shrink-0">{label}</span>
      <span className="text-gray-700 font-medium">{value}</span>
    </div>
  )
}
