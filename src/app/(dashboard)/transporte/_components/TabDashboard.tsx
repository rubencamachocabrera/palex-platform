"use client"

import { useEffect, useState } from "react"
import { TEAL, ORANGE } from "@/lib/brand"
import type { Ruta, Nevera, AlertaTransporte, KpiResumen, EstadoRuta } from "../_lib/types"
import { getRutas, getNeveras, getIncidencias, getKpis, getAlertas } from "../_lib/data-service"

const ESTADO_RUTA_LABEL: Record<EstadoRuta, string> = {
  PROGRAMADA: "Programada", EN_CURSO: "En curso", COMPLETADA: "Completada", RETRASADA: "Retrasada",
}
const ESTADO_RUTA_COLOR: Record<EstadoRuta, string> = {
  PROGRAMADA: "#6b7280", EN_CURSO: TEAL, COMPLETADA: "#10b981", RETRASADA: "#ef4444",
}

function KpiCard({ label, value, sub, color, icon }: {
  label: string; value: string; sub: string; color: string; icon: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
      style={{ borderTop: `3px solid ${color}` }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mb-3" style={{ backgroundColor: `${color}15` }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <p className="text-2xl font-bold tabular-nums leading-none mb-1" style={{ color }}>{value}</p>
      <p className="text-xs font-semibold text-gray-700 mb-0.5">{label}</p>
      <p className="text-[10px] text-gray-400 truncate">{sub}</p>
    </div>
  )
}

function RutaCard({ ruta, nevera }: { ruta: Ruta; nevera: Nevera | undefined }) {
  const total = ruta.paradas.length
  const completadas = ruta.paradas.filter(p => p.estado === "COMPLETADA").length
  const color = ESTADO_RUTA_COLOR[ruta.estado]
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-sm font-bold text-gray-800">{ruta.nombre}</p>
          <p className="text-[11px] text-gray-400">{ruta.zona} · {ruta.conductor}</p>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{ backgroundColor: `${color}15`, color }}>
          {ESTADO_RUTA_LABEL[ruta.estado]}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(completadas / total) * 100}%`, backgroundColor: color }} />
        </div>
        <span className="text-[10px] font-bold text-gray-500 tabular-nums shrink-0">{completadas}/{total} paradas</span>
      </div>
      <div className="flex items-center justify-between text-[11px] text-gray-400">
        <span>{ruta.horaInicio} → {ruta.horaFinReal ?? ruta.horaFinEstimada}{ruta.horaFinReal ? "" : " (est.)"}</span>
        {nevera && (
          <span className="flex items-center gap-1 font-semibold"
            style={{ color: nevera.temperaturaActual > nevera.rangoMax ? "#ef4444" : "#6b7280" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
            </svg>
            {nevera.codigo} · {nevera.temperaturaActual}°C
          </span>
        )}
      </div>
    </div>
  )
}

export function TabDashboard() {
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [neveras, setNeveras] = useState<Nevera[]>([])
  const [alertas, setAlertas] = useState<AlertaTransporte[]>([])
  const [kpis, setKpis] = useState<KpiResumen | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const r = await getRutas()
      const [n, inc] = await Promise.all([getNeveras(r), getIncidencias()])
      const [k, a] = await Promise.all([getKpis(r, n, inc), getAlertas(r, n)])
      setRutas(r); setNeveras(n); setKpis(k); setAlertas(a.filter(x => x.activa))
      setLoading(false)
    })()
  }, [])

  if (loading || !kpis) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse" />)}
      </div>
      <div className="h-64 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse" />
    </div>
  )

  const rutasActivas = rutas.filter(r => r.estado === "EN_CURSO" || r.estado === "RETRASADA")
  const rutasOtras = rutas.filter(r => !(r.estado === "EN_CURSO" || r.estado === "RETRASADA"))

  return (
    <div className="space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Rutas activas hoy" value={String(kpis.rutasActivas)} sub={`${kpis.rutasProgramadas} programadas pendientes de salir`}
          color={TEAL} icon="M3 6h18M3 12h18M3 18h18" />
        <KpiCard label="Neveras en tránsito" value={String(kpis.neverasEnTransito)} sub="Sensores RFID/BT activos en ruta"
          color="#6366f1" icon="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
        <KpiCard label="Paradas completadas" value={`${kpis.paradasCompletadas}/${kpis.paradasTotales}`} sub="Centros de recogida visitados hoy"
          color="#10b981" icon="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        <KpiCard label="Excursiones de temperatura" value={String(kpis.excursionesHoy)} sub="Fuera de rango 2–8°C hoy"
          color={kpis.excursionesHoy > 0 ? "#ef4444" : ORANGE} icon="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Rutas activas */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-800">Rutas en curso</h2>
            <span className="text-[11px] text-gray-400">{rutasActivas.length} activas</span>
          </div>
          {rutasActivas.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No hay rutas en curso en este momento.</p>
          ) : (
            <div className="space-y-2.5">
              {rutasActivas.map(r => <RutaCard key={r.id} ruta={r} nevera={neveras.find(n => n.id === r.neveraId)} />)}
            </div>
          )}
          {rutasOtras.length > 0 && (
            <>
              <h2 className="text-sm font-bold text-gray-800 mt-5 mb-3">Otras rutas del día</h2>
              <div className="space-y-2.5">
                {rutasOtras.map(r => <RutaCard key={r.id} ruta={r} nevera={neveras.find(n => n.id === r.neveraId)} />)}
              </div>
            </>
          )}
        </div>

        {/* Alertas + tiempo medio */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-3">Tiempos y cumplimiento</h2>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-gray-800 tabular-nums">{kpis.tiempoMedioMin}<span className="text-xs text-gray-400"> min</span></p>
                <p className="text-[10px] text-gray-400 mt-1">Tiempo medio ruta</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold tabular-nums" style={{ color: kpis.cumplimientoPct >= 95 ? "#10b981" : "#ef4444" }}>{kpis.cumplimientoPct}%</p>
                <p className="text-[10px] text-gray-400 mt-1">Cumplimiento térmico</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-800">Alertas activas</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${ORANGE}15`, color: ORANGE }}>{alertas.length}</span>
            </div>
            {alertas.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">Sin alertas activas.</p>
            ) : (
              <div className="space-y-2.5">
                {alertas.slice(0, 4).map(a => {
                  const color = a.severidad === "CRITICA" ? "#ef4444" : a.severidad === "ALTA" ? ORANGE : "#6b7280"
                  return (
                    <div key={a.id} className="flex gap-2.5 p-2.5 rounded-xl border" style={{ backgroundColor: `${color}08`, borderColor: `${color}25` }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: color }} />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold leading-snug" style={{ color }}>{a.titulo}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{a.detalle}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
