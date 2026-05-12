"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { TEAL, TEAL_LIGHT } from "@/lib/brand"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Visita {
  id: string
  estado: string
  tipo: string
  fecha: string
  hospital: { id: string; nombre: string; ciudad: string }
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const ESTADO_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  BORRADOR:   { bg: "bg-amber-50",  text: "text-amber-700",  dot: "#F59E0B" },
  COMPLETADA: { bg: "bg-green-50",  text: "text-green-700",  dot: "#10B981" },
  ARCHIVADA:  { bg: "bg-gray-100",  text: "text-gray-500",   dot: "#9CA3AF" },
}
const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador", COMPLETADA: "Completada", ARCHIVADA: "Archivada",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function primerDiaMes(year: number, month: number): number {
  // 0=Dom, ajustamos a Lun=0
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

// ─── Iconos ───────────────────────────────────────────────────────────────────

function IcoChevLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
}
function IcoChevRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}
function IcoList() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )
}
function IcoX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}
function IcoPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}
function IcoChevRight2() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CalendarioPage() {
  const router = useRouter()
  const hoy = new Date()

  const [year, setYear] = useState(hoy.getFullYear())
  const [month, setMonth] = useState(hoy.getMonth())
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [cargando, setCargando] = useState(true)
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null)

  // Cargar visitas — filtradas por mes visible para no traer todo
  useEffect(() => {
    setCargando(true)
    const desde = new Date(year, month, 1).toISOString().slice(0, 10)
    const hasta = new Date(year, month + 1, 0).toISOString().slice(0, 10)
    fetch("/api/visitas?desde=" + desde + "&hasta=" + hasta)
      .then(r => r.ok ? r.json() : [])
      .then((data: Visita[]) => setVisitas(Array.isArray(data) ? data : []))
      .catch(() => setVisitas([]))
      .finally(() => setCargando(false))
  }, [year, month])

  // Agrupar visitas por día
  const visitasPorDia = useMemo(() => {
    const mapa: Record<string, Visita[]> = {}
    visitas.forEach(v => {
      const key = v.fecha.slice(0, 10) // YYYY-MM-DD
      if (!mapa[key]) mapa[key] = []
      mapa[key].push(v)
    })
    return mapa
  }, [visitas])

  // Navegar mes
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

  // Construir grid del mes
  const offset = primerDiaMes(year, month)
  const totalDias = diasEnMes(year, month)
  const celdas: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ]
  // Rellenar hasta múltiplo de 7
  while (celdas.length % 7 !== 0) celdas.push(null)

  const visitasDia = diaSeleccionado ? (visitasPorDia[diaSeleccionado] ?? []) : []

  const hoyKey = fechaKey(hoy)

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Calendario de visitas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {visitas.length > 0 ? visitas.length + " visitas en total" : "Cargando visitas..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/visitas"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <IcoList />
            Vista lista
          </Link>
          <Link
            href="/visitas"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: TEAL }}
          >
            <IcoPlus />
            Nueva visita
          </Link>
        </div>
      </div>

      <div className="flex gap-5 items-start">

        {/* Calendario */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 overflow-hidden">

          {/* Navegación de mes */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <button
              onClick={prevMes}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <IcoChevLeft />
            </button>

            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-gray-900">
                {MESES[month]} {year}
              </h2>
              <button
                onClick={irHoy}
                className="text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Hoy
              </button>
            </div>

            <button
              onClick={nextMes}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <IcoChevRight />
            </button>
          </div>

          {/* Cabecera días semana */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Grid días */}
          {cargando ? (
            <div className="py-20 text-center text-sm text-gray-400">Cargando visitas...</div>
          ) : (
            <div className="grid grid-cols-7">
              {celdas.map((dia, i) => {
                if (!dia) return <div key={"empty-" + i} className="min-h-[80px] border-b border-r border-gray-50 last:border-r-0" />

                const key = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(dia).padStart(2, "0")
                const vsEste = visitasPorDia[key] ?? []
                const esHoy = key === hoyKey
                const esSeleccionado = key === diaSeleccionado
                const tieneVisitas = vsEste.length > 0

                return (
                  <button
                    key={key}
                    onClick={() => setDiaSeleccionado(prev => prev === key ? null : key)}
                    className="min-h-[80px] p-2 border-b border-r border-gray-50 last:border-r-0 text-left transition-colors hover:bg-gray-50 flex flex-col"
                    style={esSeleccionado ? { backgroundColor: TEAL_LIGHT } : undefined}
                  >
                    {/* Número del día */}
                    <span
                      className="w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 transition-colors"
                      style={esHoy
                        ? { backgroundColor: TEAL, color: "#fff" }
                        : { color: esSeleccionado ? TEAL : "#374151" }
                      }
                    >
                      {dia}
                    </span>

                    {/* Dots de visitas */}
                    {tieneVisitas && (
                      <div className="flex flex-wrap gap-0.5 mt-auto">
                        {vsEste.slice(0, 3).map(v => (
                          <span
                            key={v.id}
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: ESTADO_COLOR[v.estado]?.dot ?? "#9CA3AF" }}
                            title={v.hospital.nombre}
                          />
                        ))}
                        {vsEste.length > 3 && (
                          <span className="text-[9px] font-bold text-gray-400">+{vsEste.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Preview primera visita en móvil grande */}
                    {tieneVisitas && (
                      <p className="hidden xl:block text-[10px] text-gray-500 truncate mt-0.5 w-full">
                        {vsEste[0].hospital.nombre}
                        {vsEste.length > 1 ? " +" + (vsEste.length - 1) : ""}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Panel lateral — visitas del día seleccionado */}
        {diaSeleccionado && (
          <div className="w-72 bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden shrink-0">

            {/* Header panel */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  {new Date(diaSeleccionado + "T12:00:00").toLocaleDateString("es-ES", {
                    weekday: "long", day: "numeric", month: "long",
                  })}
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {visitasDia.length === 0
                    ? "Sin visitas"
                    : visitasDia.length + " visita" + (visitasDia.length > 1 ? "s" : "")}
                </p>
              </div>
              <button
                onClick={() => setDiaSeleccionado(null)}
                className="text-gray-300 hover:text-gray-500 transition-colors p-1 rounded-lg hover:bg-gray-50"
              >
                <IcoX />
              </button>
            </div>

            {/* Lista visitas del día */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {visitasDia.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-400 mb-3">No hay visitas este día</p>
                  <Link
                    href="/visitas/nueva"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-80"
                    style={{ backgroundColor: TEAL }}
                  >
                    <IcoPlus />
                    Crear visita
                  </Link>
                </div>
              ) : (
                visitasDia.map(v => {
                  const ec = ESTADO_COLOR[v.estado] ?? ESTADO_COLOR.ARCHIVADA
                  return (
                    <Link
                      key={v.id}
                      href={"/visitas/" + v.id}
                      className="flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors group"
                    >
                      <span
                        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: ec.dot }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-gray-900">
                          {v.hospital.nombre}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{v.hospital.ciudad}</p>
                        <span className={"inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full " + ec.bg + " " + ec.text}>
                          {ESTADO_LABEL[v.estado] ?? v.estado}
                        </span>
                      </div>
                      <span className="text-gray-300 group-hover:text-gray-500 transition-colors mt-1 shrink-0">
                        <IcoChevRight2 />
                      </span>
                    </Link>
                  )
                })
              )}
            </div>

            {/* Footer del panel */}
            {visitasDia.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100">
                <Link
                  href={"/visitas?abrir=1&fecha=" + (diaSeleccionado ?? "")}
                  className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-semibold rounded-lg border border-dashed border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors"
                >
                  <IcoPlus />
                  Añadir visita este día
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-5 mt-4 px-1">
        {Object.entries(ESTADO_LABEL).map(([k, label]) => (
          <span key={k} className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ESTADO_COLOR[k]?.dot }} />
            {label}
          </span>
        ))}
      </div>

    </div>
  )
}
