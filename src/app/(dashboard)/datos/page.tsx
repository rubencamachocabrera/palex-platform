"use client"

import { useEffect, useState } from "react"
import { TEAL, ORANGE } from "@/lib/brand"

interface Stats {
  hospitales: number
  visitas: number
  proyectos: number
  loaded: boolean
}

export default function DatosPage() {
  const [stats, setStats] = useState<Stats>({ hospitales: 0, visitas: 0, proyectos: 0, loaded: false })

  useEffect(() => {
    Promise.all([
      fetch("/api/hospitales").then(r => r.ok ? r.json() : []),
      fetch("/api/visitas?limit=1").then(r => ({ total: parseInt(r.headers.get("X-Total-Count") ?? "0") })),
      fetch("/api/pre-proyectos").then(r => r.ok ? r.json() : []),
    ]).then(([hosp, vis, pps]) => {
      setStats({
        hospitales: Array.isArray(hosp) ? hosp.length : 0,
        visitas: vis.total,
        proyectos: Array.isArray(pps) ? pps.length : 0,
        loaded: true,
      })
    }).catch(() => setStats(s => ({ ...s, loaded: true })))
  }, [])

  const kpis = [
    { label: "Centros", value: stats.hospitales, icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    )},
    { label: "Visitas", value: stats.visitas, icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    )},
    { label: "Proyectos", value: stats.proyectos, icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    )},
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow"
          style={{ backgroundColor: `${TEAL}15`, border: `1.5px solid ${TEAL}25` }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
            <line x1="2" y1="20" x2="22" y2="20"/>
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-xl font-bold text-gray-900">Explotación de datos</h1>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: `${ORANGE}15`, color: ORANGE, border: `1px solid ${ORANGE}25` }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2.2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
              En construcción
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Análisis de consumos, flujos y KPIs por hospital. Módulo en desarrollo activo.
          </p>
        </div>
      </div>

      {/* Live KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 px-4 py-4 shadow-sm text-center">
            <div className="flex justify-center mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${TEAL}12` }}>
                {k.icon}
              </div>
            </div>
            <div className="text-2xl font-bold tabular-nums text-gray-900 leading-none mb-0.5">
              {stats.loaded ? k.value.toLocaleString("es-ES") : (
                <div className="h-7 w-10 skeleton-shimmer rounded mx-auto" />
              )}
            </div>
            <p className="text-xs text-gray-400">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Roadmap */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mb-6">
        <div className="px-4 py-3.5 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">Lo que viene</p>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { title: "Consumo de tubos por centro", desc: "Volúmenes diarios, semanales y mensuales por área", ready: false },
            { title: "KPIs de flujo preanalítico", desc: "Tiempos de espera, cuellos de botella, picos de actividad", ready: false },
            { title: "Comparativa entre centros", desc: "Benchmarking y rankings por zona geográfica", ready: false },
            { title: "Exportación de informes", desc: "PDF y Excel descargables con filtros personalizados", ready: false },
            { title: "Alertas automáticas de consumo", desc: "Notificación cuando un centro supera umbrales definidos", ready: false },
          ].map(item => (
            <div key={item.title} className="flex items-center gap-3 px-4 py-3.5">
              <span className="w-5 h-5 rounded-full border-2 border-gray-200 flex items-center justify-center shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700">{item.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 shrink-0">
                Próximamente
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3.5 text-sm"
        style={{ backgroundColor: `${TEAL}08`, border: `1px solid ${TEAL}20` }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-gray-600">
          Mientras este módulo se desarrolla, puedes consultar datos de consumo directamente desde cada ficha de hospital y en los informes de visita exportables en PDF.
        </p>
      </div>
    </div>
  )
}
