"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { TEAL, TEAL_LIGHT } from "@/lib/brand"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Incidencia {
  id: string
  codigo: string
  titulo: string
  prioridad: string
  estado: string
  creadoEn: string
  slaHoras: number | null
  slaPausadoMs: number
  slaPausadoEn: string | null
  hospital: { id: string; nombre: string; ciudad: string }
}

type SlaEstado = "VENCIDO" | "EN_RIESGO" | "OK" | "RESUELTA"

// ─── Constantes ───────────────────────────────────────────────────────────────

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const SLA_COLOR: Record<SlaEstado, { bg: string; text: string; dot: string; label: string }> = {
  VENCIDO:   { bg: "bg-red-50",   text: "text-red-700",   dot: "#DC2626", label: "SLA vencido" },
  EN_RIESGO: { bg: "bg-amber-50", text: "text-amber-700", dot: "#F59E0B", label: "SLA <4h" },
  OK:        { bg: "bg-teal-50",  text: "text-teal-700",  dot: TEAL,      label: "SLA en curso" },
  RESUELTA:  { bg: "bg-gray-100", text: "text-gray-500",  dot: "#9CA3AF", label: "Resuelta/cerrada" },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function primerDiaMes(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

function diasEnMes(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function fechaKey(date: Date): string {
  return date.getFullYear() + "-" +
    String(date.getMonth() + 1).padStart(2, "0") + "-" +
    String(date.getDate()).padStart(2, "0")
}

function slaRestanteMs(inc: Incidencia): number {
  if (!inc.slaHoras) return Infinity
  const slaMs = inc.slaHoras * 3_600_000
  const pausadoMs = inc.slaPausadoMs + (inc.slaPausadoEn ? Date.now() - new Date(inc.slaPausadoEn).getTime() : 0)
  return new Date(inc.creadoEn).getTime() + slaMs - pausadoMs - Date.now()
}

function slaEstadoDe(inc: Incidencia): SlaEstado {
  if (["RESUELTA", "CERRADA"].includes(inc.estado)) return "RESUELTA"
  const restante = slaRestanteMs(inc)
  if (restante <= 0) return "VENCIDO"
  if (restante < 4 * 3_600_000) return "EN_RIESGO"
  return "OK"
}

// ─── Iconos ───────────────────────────────────────────────────────────────────

function IcoChevLeft() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
}
function IcoChevRight() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
}
function IcoList() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )
}
function IcoX() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
function IcoChevRight2() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CalendarioIncidenciasPage() {
  const hoy = new Date()

  const [year, setYear] = useState(hoy.getFullYear())
  const [month, setMonth] = useState(hoy.getMonth())
  const [incidencias, setIncidencias] = useState<Incidencia[]>([])
  const [cargando, setCargando] = useState(true)
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null)

  useEffect(() => {
    setCargando(true)
    const desde = new Date(year, month, 1).toISOString().slice(0, 10)
    const hasta = new Date(year, month + 1, 0).toISOString().slice(0, 10)
    fetch(`/api/incidencias?desde=${desde}&hasta=${hasta}&limit=500`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Incidencia[]) => setIncidencias(Array.isArray(data) ? data : []))
      .catch(() => setIncidencias([]))
      .finally(() => setCargando(false))
  }, [year, month])

  const incidenciasPorDia = useMemo(() => {
    const mapa: Record<string, Incidencia[]> = {}
    incidencias.forEach(inc => {
      const key = inc.creadoEn.slice(0, 10)
      if (!mapa[key]) mapa[key] = []
      mapa[key].push(inc)
    })
    return mapa
  }, [incidencias])

  function prevMes() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setDiaSeleccionado(null)
  }
  function nextMes() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setDiaSeleccionado(null)
  }
  function irHoy() {
    setYear(hoy.getFullYear())
    setMonth(hoy.getMonth())
    setDiaSeleccionado(fechaKey(hoy))
  }

  const offset = primerDiaMes(year, month)
  const totalDias = diasEnMes(year, month)
  const celdas: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ]
  while (celdas.length % 7 !== 0) celdas.push(null)

  const incidenciasDia = diaSeleccionado ? (incidenciasPorDia[diaSeleccionado] ?? []) : []
  const hoyKey = fechaKey(hoy)

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Calendario de incidencias</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {cargando ? "Cargando…" : incidencias.length > 0 ? `${incidencias.length} incidencias este mes` : "Sin incidencias este mes"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/incidencias"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <IcoList />
            <span className="hidden sm:inline">Vista lista</span>
          </Link>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">

        {/* Calendario */}
        <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">

          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <button onClick={prevMes} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <IcoChevLeft />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">{MESES[month]} {year}</h2>
              <button onClick={irHoy} className="text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Hoy
              </button>
            </div>
            <button onClick={nextMes} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <IcoChevRight />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">{d}</div>
            ))}
          </div>

          {cargando ? (
            <div className="py-20 text-center text-sm text-gray-400">Cargando incidencias...</div>
          ) : (
            <div className="grid grid-cols-7">
              {celdas.map((dia, i) => {
                if (!dia) return <div key={"empty-" + i} className="min-h-[80px] border-b border-r border-gray-50 dark:border-gray-800 last:border-r-0" />

                const key = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(dia).padStart(2, "0")
                const incsEste = incidenciasPorDia[key] ?? []
                const esHoy = key === hoyKey
                const esSeleccionado = key === diaSeleccionado
                const tieneIncidencias = incsEste.length > 0
                const peorEstado: SlaEstado | null = tieneIncidencias
                  ? (incsEste.some(i => slaEstadoDe(i) === "VENCIDO") ? "VENCIDO"
                    : incsEste.some(i => slaEstadoDe(i) === "EN_RIESGO") ? "EN_RIESGO"
                    : incsEste.some(i => slaEstadoDe(i) === "OK") ? "OK" : "RESUELTA")
                  : null

                return (
                  <button
                    key={key}
                    onClick={() => setDiaSeleccionado(prev => prev === key ? null : key)}
                    className="min-h-[80px] p-2 border-b border-r border-gray-50 dark:border-gray-800 last:border-r-0 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 flex flex-col"
                    style={esSeleccionado ? { backgroundColor: TEAL_LIGHT } : undefined}
                  >
                    <span
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 transition-colors ${
                        esHoy ? "text-white" : esSeleccionado ? "" : "text-gray-700 dark:text-gray-300"
                      }`}
                      style={esHoy ? { backgroundColor: TEAL } : esSeleccionado ? { color: TEAL } : undefined}
                    >
                      {dia}
                    </span>

                    {tieneIncidencias && (
                      <div className="flex flex-wrap gap-0.5 mt-auto">
                        {incsEste.slice(0, 3).map(inc => (
                          <span
                            key={inc.id}
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: SLA_COLOR[slaEstadoDe(inc)].dot }}
                            title={`${inc.codigo} · ${inc.hospital.nombre}`}
                          />
                        ))}
                        {incsEste.length > 3 && <span className="text-[9px] font-bold text-gray-400">+{incsEste.length - 3}</span>}
                      </div>
                    )}

                    {tieneIncidencias && peorEstado && (
                      <p className="hidden xl:block text-[10px] text-gray-500 truncate mt-0.5 w-full">
                        {incsEste[0].codigo}
                        {incsEste.length > 1 ? " +" + (incsEste.length - 1) : ""}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Panel lateral */}
        {diaSeleccionado && (
          <div className="w-full lg:w-72 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden shrink-0">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  {new Date(diaSeleccionado + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                  {incidenciasDia.length === 0 ? "Sin incidencias" : `${incidenciasDia.length} incidencia${incidenciasDia.length > 1 ? "s" : ""}`}
                </p>
              </div>
              <button onClick={() => setDiaSeleccionado(null)} className="text-gray-300 hover:text-gray-500 transition-colors p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                <IcoX />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
              {incidenciasDia.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-400">No hay incidencias creadas este día</p>
                </div>
              ) : (
                incidenciasDia.map(inc => {
                  const sc = SLA_COLOR[slaEstadoDe(inc)]
                  return (
                    <Link key={inc.id} href={`/incidencias/${inc.id}`} className="flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                      <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: sc.dot }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono font-bold text-gray-400">{inc.codigo}</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate group-hover:text-gray-900 dark:group-hover:text-white">{inc.titulo}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{inc.hospital.nombre}</p>
                        <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                      </div>
                      <span className="text-gray-300 group-hover:text-gray-500 transition-colors mt-1 shrink-0"><IcoChevRight2 /></span>
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-5 mt-4 px-1 flex-wrap">
        {(Object.keys(SLA_COLOR) as SlaEstado[]).map(k => (
          <span key={k} className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SLA_COLOR[k].dot }} />
            {SLA_COLOR[k].label}
          </span>
        ))}
      </div>

    </div>
  )
}
