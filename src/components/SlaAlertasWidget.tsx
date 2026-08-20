"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { TEAL } from "@/lib/brand"

interface IncSla {
  id: string
  codigo: string
  titulo: string
  prioridad: string
  hospital: { nombre: string }
  creadoEn: string
  slaHoras: number | null
  slaPausadoMs: number
  slaPausadoEn: string | null
  asignadoA: { nombre: string } | null
}

const PRIO_COLOR: Record<string, string> = {
  CRITICA: "#dc2626",
  ALTA:    "#f97316",
}

function slaRestante(inc: IncSla): number {
  if (!inc.slaHoras) return Infinity
  const slaMs = inc.slaHoras * 3_600_000
  const pausadoMs = inc.slaPausadoMs + (inc.slaPausadoEn ? Date.now() - new Date(inc.slaPausadoEn).getTime() : 0)
  return new Date(inc.creadoEn).getTime() + slaMs - pausadoMs - Date.now()
}

function fmtCountdown(ms: number): { label: string; urgente: boolean } {
  if (ms <= 0) return { label: "VENCIDO", urgente: true }
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h >= 24) return { label: `${Math.floor(h / 24)}d ${h % 24}h`, urgente: false }
  return { label: h > 0 ? `${h}h ${m}m` : `${m}m`, urgente: h < 2 }
}

export function SlaAlertasWidget() {
  const [incidencias, setIncidencias] = useState<IncSla[]>([])
  const [tick, setTick] = useState(0)

  const cargar = useCallback(() => {
    Promise.all([
      fetch("/api/incidencias?prioridad=CRITICA&limit=20&estado=ABIERTA").then(r => r.ok ? r.json() : []),
      fetch("/api/incidencias?prioridad=ALTA&limit=20&estado=ABIERTA").then(r => r.ok ? r.json() : []),
      fetch("/api/incidencias?prioridad=CRITICA&limit=20&estado=EN_PROGRESO").then(r => r.ok ? r.json() : []),
      fetch("/api/incidencias?prioridad=ALTA&limit=20&estado=EN_PROGRESO").then(r => r.ok ? r.json() : []),
    ]).then(([c1, c2, c3, c4]) => {
      const all: IncSla[] = [...(Array.isArray(c1) ? c1 : []), ...(Array.isArray(c2) ? c2 : []), ...(Array.isArray(c3) ? c3 : []), ...(Array.isArray(c4) ? c4 : [])]
      // Deduplicate
      const seen = new Set<string>()
      const deduped = all.filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true })
      // Only show those expiring within 24h or already vencidas
      const relevantes = deduped
        .filter(i => slaRestante(i) < 24 * 3_600_000)
        .sort((a, b) => slaRestante(a) - slaRestante(b))
        .slice(0, 6)
      setIncidencias(relevantes)
    }).catch(() => {})
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Refresh data every 60s, tick countdown every 30s
  useEffect(() => {
    const data = setInterval(cargar, 60_000)
    const countdown = setInterval(() => setTick(t => t + 1), 30_000)
    return () => { clearInterval(data); clearInterval(countdown) }
  }, [cargar])

  if (incidencias.length === 0) return null

  const vencidas = incidencias.filter(i => slaRestante(i) <= 0).length
  const criticas = incidencias.filter(i => i.prioridad === "CRITICA").length

  return (
    <div className="mb-6 rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: "#fca5a5" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: "linear-gradient(135deg, #fef2f2 0%, #fff7f7 100%)" }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#dc262618" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-red-700 leading-none">Alertas SLA</p>
          <p className="text-xs text-red-400 mt-0.5" aria-live="polite">
            {vencidas > 0 && <span className="font-semibold">{vencidas} vencida{vencidas !== 1 ? "s" : ""} · </span>}
            {criticas} crítica{criticas !== 1 ? "s" : ""} · {incidencias.length} expiran en &lt;24h
          </p>
        </div>
        <Link href="/incidencias" className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-700 transition-colors px-2.5 py-1 rounded-lg hover:bg-red-50">
          Ver todas →
        </Link>
      </div>

      {/* List */}
      <div className="divide-y divide-red-50 bg-white dark:bg-gray-900">
        {incidencias.map(inc => {
          const restante = slaRestante(inc)
          const { label, urgente } = fmtCountdown(restante)
          const color = PRIO_COLOR[inc.prioridad] ?? "#6b7280"
          return (
            <Link
              key={inc.id}
              href={`/incidencias/${inc.id}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50/40 dark:hover:bg-red-950/10 transition-colors group"
            >
              {/* Priority dot */}
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono font-bold text-gray-400">{inc.codigo}</span>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{inc.titulo}</span>
                </div>
                <p className="text-[10px] text-gray-400 truncate">
                  {inc.hospital.nombre}{inc.asignadoA ? ` · ${inc.asignadoA.nombre}` : " · Sin asignar"}
                </p>
              </div>

              {/* Countdown */}
              <div
                className={`shrink-0 text-right ${urgente ? "sla-urgent" : ""}`}
              >
                <p className="text-xs font-black tabular-nums leading-none" style={{ color: urgente ? "#dc2626" : color }}>
                  {label}
                </p>
                <p className="text-[9px] font-medium" style={{ color: urgente ? "#fca5a5" : "#d1d5db" }}>SLA</p>
              </div>

              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:stroke-red-400 transition-colors">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
