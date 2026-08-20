"use client"

import { useEffect, useState } from "react"
import { TEAL, ORANGE } from "@/lib/brand"
import { PageHeader } from "@/components/ui/PageHeader"

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface PeriodStats {
  visitas: number; proyectos: number; incidencias: number
  llamadas: number; checkins: number; horas: number
}
interface ComparadorData {
  periodo: number
  actual: PeriodStats
  anterior: PeriodStats
  sparklines: { visitas: number[]; incidencias: number[] }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function delta(act: number, ant: number) {
  if (ant === 0) return act > 0 ? 100 : 0
  return Math.round(((act - ant) / ant) * 100)
}
function fmtNum(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

// ─── Sparkline SVG puro ───────────────────────────────────────────────────────
function Sparkline({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null
  const W = 120, H = height, PAD = 2
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
    const y = PAD + (1 - (v - min) / range) * (H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(" ")

  // Área
  const first = `${PAD.toFixed(1)},${H}`
  const last  = `${(PAD + W - PAD * 2).toFixed(1)},${H}`
  const areaPts = `${first} ${pts} ${last}`

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id={`sg-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill={`url(#sg-${color.slice(1)})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Delta badge ──────────────────────────────────────────────────────────────
function DeltaBadge({ pct }: { pct: number }) {
  const up = pct >= 0
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "3px 8px", borderRadius: 20,
      fontSize: 12, fontWeight: 700,
      background: up ? "#f0fdf4" : "#fef2f2",
      color: up ? "#15803d" : "#dc2626",
    }}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        {up
          ? <path d="M5 8V2M2 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          : <path d="M5 2v6M2 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        }
      </svg>
      {Math.abs(pct)}%
    </span>
  )
}

// ─── Tarjeta métrica ──────────────────────────────────────────────────────────
function MetricCard({
  label, icon, actual, anterior, sparkData, color,
}: {
  label: string; icon: React.ReactNode
  actual: number; anterior: number
  sparkData?: number[]; color: string
}) {
  const pct = delta(actual, anterior)
  return (
    <div style={{
      background: "var(--card, #fff)", borderRadius: 16,
      border: "1px solid var(--border, #e5e7eb)",
      padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color, opacity: 0.85 }}>{icon}</span>
        <span style={{ fontSize: 13, color: "var(--muted, #64748b)", fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 700, lineHeight: 1, color: "var(--fg, #1e293b)" }}>
            {fmtNum(actual)}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted, #64748b)" }}>
            Anterior: <strong>{fmtNum(anterior)}</strong>
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <DeltaBadge pct={pct} />
          {sparkData && sparkData.length > 1 && <Sparkline data={sparkData} color={color} />}
        </div>
      </div>
    </div>
  )
}

// ─── Selector de periodo ──────────────────────────────────────────────────────
const PERIODOS = [
  { value: 30,  label: "30 días" },
  { value: 90,  label: "90 días" },
  { value: 365, label: "1 año"   },
]

// ─── Página ───────────────────────────────────────────────────────────────────
export default function ComparadorPage() {
  const [periodo, setPeriodo] = useState(30)
  const [data, setData] = useState<ComparadorData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    fetch(`/api/stats/comparador?periodo=${periodo}`, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .catch(e => { if (e.name !== "AbortError") console.error(e) })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [periodo])

  return (
    <div>
      <PageHeader
        title="Comparador de periodos"
        subtitle="Compara la actividad del periodo actual con el anterior equivalente"
      />

      {/* ── Selector periodo ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {PERIODOS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriodo(p.value)}
            style={{
              padding: "8px 18px", borderRadius: 20,
              background: periodo === p.value ? TEAL : "var(--card, #fff)",
              color: periodo === p.value ? "#fff" : "var(--muted, #64748b)",
              fontWeight: periodo === p.value ? 600 : 500,
              fontSize: 14, cursor: "pointer",
              boxShadow: periodo === p.value ? "0 2px 8px rgba(0,169,157,0.3)" : "0 1px 3px rgba(0,0,0,0.08)",
              border: `1px solid ${periodo === p.value ? TEAL : "var(--border, #e5e7eb)"}`,
              transition: "all 0.15s",
            }}
          >
            {p.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, color: "var(--muted, #64748b)", fontSize: 13 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {periodo === 30 ? "Último mes vs mes anterior" : periodo === 90 ? "Último trimestre vs trimestre anterior" : "Último año vs año anterior"}
        </div>
      </div>

      {/* ── Skeleton / Métricas ── */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              background: "var(--card, #fff)", borderRadius: 16,
              border: "1px solid var(--border, #e5e7eb)",
              padding: "18px 20px", height: 110,
              animation: "pulse 1.4s ease-in-out infinite",
            }} />
          ))}
        </div>
      ) : data ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16, marginBottom: 24 }}>
            <MetricCard
              label="Visitas" color={TEAL} icon={<IcoDoc />}
              actual={data.actual.visitas} anterior={data.anterior.visitas}
              sparkData={data.sparklines.visitas}
            />
            <MetricCard
              label="Proyectos creados" color="#6366f1" icon={<IcoProyecto />}
              actual={data.actual.proyectos} anterior={data.anterior.proyectos}
            />
            <MetricCard
              label="Incidencias" color={ORANGE} icon={<IcoAlert />}
              actual={data.actual.incidencias} anterior={data.anterior.incidencias}
              sparkData={data.sparklines.incidencias}
            />
            <MetricCard
              label="Llamadas" color="#0891b2" icon={<IcoPhone />}
              actual={data.actual.llamadas} anterior={data.anterior.llamadas}
            />
            <MetricCard
              label="Check-ins en campo" color="#15803d" icon={<IcoCheckin />}
              actual={data.actual.checkins} anterior={data.anterior.checkins}
            />
            <MetricCard
              label="Horas en campo" color="#7c3aed" icon={<IcoClock />}
              actual={data.actual.horas} anterior={data.anterior.horas}
            />
          </div>

          {/* ── Tabla resumen ── */}
          <div style={{
            background: "var(--card, #fff)", borderRadius: 16,
            border: "1px solid var(--border, #e5e7eb)", overflow: "hidden"
          }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border, #f1f5f9)" }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--fg, #1e293b)" }}>Resumen comparativo</h2>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "var(--surface, #f8fafc)" }}>
                    {["Métrica", `Periodo actual (${periodo}d)`, `Periodo anterior`, "Variación"].map(h => (
                      <th key={h} scope="col" style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: 12, color: "var(--muted, #64748b)", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(["visitas","proyectos","incidencias","llamadas","checkins","horas"] as (keyof PeriodStats)[]).map((key, i) => {
                    const labels: Record<string, string> = {
                      visitas: "Visitas", proyectos: "Proyectos", incidencias: "Incidencias",
                      llamadas: "Llamadas", checkins: "Check-ins", horas: "Horas en campo",
                    }
                    const act = data.actual[key]
                    const ant = data.anterior[key]
                    const pct = delta(act, ant)
                    return (
                      <tr key={key} style={{ borderTop: "1px solid var(--border, #f1f5f9)", background: i % 2 === 0 ? "transparent" : "var(--surface, #f8fafc)" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 500, color: "var(--fg, #1e293b)" }}>{labels[key]}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 700, color: "var(--fg, #1e293b)" }}>{fmtNum(act)}</td>
                        <td style={{ padding: "12px 16px", color: "var(--muted, #64748b)" }}>{fmtNum(ant)}</td>
                        <td style={{ padding: "12px 16px" }}><DeltaBadge pct={pct} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted, #9ca3af)" }}>
          <p>No se pudieron cargar los datos</p>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  )
}

// ─── Iconos internos ──────────────────────────────────────────────────────────
const IcoDoc = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
)
const IcoProyecto = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
  </svg>
)
const IcoAlert = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)
const IcoPhone = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.58 4.24 2 2 0 0 1 3.54 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
)
const IcoCheckin = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)
const IcoClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
