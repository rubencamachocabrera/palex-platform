"use client"

import { useEffect, useState } from "react"
import { TEAL, ORANGE } from "@/lib/brand"
import type { AlertaTransporte, Ruta, Nevera, TipoAlertaTransporte, SeveridadAlerta } from "../_lib/types"
import { getRutas, getNeveras, getAlertas } from "../_lib/data-service"

const TIPO_LABEL: Record<TipoAlertaTransporte, string> = {
  TEMPERATURA: "Temperatura", BATERIA: "Batería", RETRASO: "Retraso", CONECTIVIDAD: "Conectividad", MANTENIMIENTO: "Mantenimiento",
}
const TIPO_ICON: Record<TipoAlertaTransporte, string> = {
  TEMPERATURA:   "M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z",
  BATERIA:       "M5 9h14a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1zM22 11v2",
  RETRASO:       "M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
  CONECTIVIDAD:  "M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01",
  MANTENIMIENTO: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
}
const SEV_COLOR: Record<SeveridadAlerta, string> = { CRITICA: "#ef4444", ALTA: ORANGE, MEDIA: "#6366f1" }
const SEV_LABEL: Record<SeveridadAlerta, string> = { CRITICA: "Crítica", ALTA: "Alta", MEDIA: "Media" }

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `Hace ${mins} min`
  return `Hace ${Math.round(mins / 60)} h`
}

export function TabAlertas() {
  const [alertas, setAlertas] = useState<AlertaTransporte[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"activas" | "historico">("activas")

  useEffect(() => {
    (async () => {
      const r: Ruta[] = await getRutas()
      const n: Nevera[] = await getNeveras(r)
      const a = await getAlertas(r, n)
      setAlertas(a); setLoading(false)
    })()
  }, [])

  if (loading) return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse" />)}
    </div>
  )

  const activas = alertas.filter(a => a.activa)
  const historico = alertas.filter(a => !a.activa)
  const lista = tab === "activas" ? activas : historico

  const porSeveridad = (sev: SeveridadAlerta) => activas.filter(a => a.severidad === sev).length

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" style={{ borderTop: `3px solid ${SEV_COLOR.CRITICA}` }}>
          <p className="text-2xl font-bold tabular-nums" style={{ color: SEV_COLOR.CRITICA }}>{porSeveridad("CRITICA")}</p>
          <p className="text-xs font-semibold text-gray-700 mt-1">Críticas</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" style={{ borderTop: `3px solid ${SEV_COLOR.ALTA}` }}>
          <p className="text-2xl font-bold tabular-nums" style={{ color: SEV_COLOR.ALTA }}>{porSeveridad("ALTA")}</p>
          <p className="text-xs font-semibold text-gray-700 mt-1">Altas</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" style={{ borderTop: `3px solid ${SEV_COLOR.MEDIA}` }}>
          <p className="text-2xl font-bold tabular-nums" style={{ color: SEV_COLOR.MEDIA }}>{porSeveridad("MEDIA")}</p>
          <p className="text-xs font-semibold text-gray-700 mt-1">Medias</p>
        </div>
      </div>

      <div className="flex bg-gray-100 p-0.5 rounded-xl w-fit">
        {(["activas", "historico"] as const).map(k => (
          <button key={k} onClick={() => setTab(k)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            style={tab === k ? { backgroundColor: "white", color: TEAL, boxShadow: "0 1px 4px rgba(0,0,0,.08)" } : { color: "#6b7280" }}>
            {k === "activas" ? `Activas (${activas.length})` : `Histórico (${historico.length})`}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {lista.length === 0 && <p className="text-xs text-gray-400 text-center py-10">No hay alertas {tab === "activas" ? "activas" : "en el histórico"}.</p>}
        {lista.map(a => {
          const color = SEV_COLOR[a.severidad]
          return (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-3" style={{ borderLeft: `3px solid ${color}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={TIPO_ICON[a.tipo]} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-0.5">
                  <p className="text-sm font-bold text-gray-800">{a.titulo}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: `${color}15`, color }}>
                    {SEV_LABEL[a.severidad]}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{a.detalle}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400">
                  <span className="font-semibold">{TIPO_LABEL[a.tipo]}</span>
                  <span>·</span>
                  <span>{a.entidad}</span>
                  <span>·</span>
                  <span>{timeAgo(a.timestamp)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
