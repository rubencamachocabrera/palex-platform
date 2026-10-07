"use client"

import { CountUp } from "@/components/ui/CountUp"
import { IconAlertTriangle, IconTrendingDown, IconTrendingUp } from "@/components/ui/Icons"

export function Panel({ eyebrow, titulo, texto, accion, children, className = "" }: {
  eyebrow?: string; titulo: string; texto?: React.ReactNode; accion?: React.ReactNode; children: React.ReactNode; className?: string
}) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          {eyebrow && <p className="kpi-label mb-1.5 flex items-center gap-2 text-teal-700 dark:text-teal-400"><span className="section-title-mark" />{eyebrow}</p>}
          <h2 className="text-base font-extrabold tracking-[-0.01em] text-gray-900 dark:text-white">{titulo}</h2>
          {texto && <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-400">{texto}</p>}
        </div>
        {accion}
      </div>
      {children}
    </section>
  )
}

/**
 * KPI con tendencia frente al periodo anterior.
 * `mejorSiBaja` invierte el color (p. ej. tiempos o incidencias: bajar es bueno).
 * `tendenciaNeutra` pinta la variación en gris (sin juicio): p. ej. un tiempo que baja porque
 * se valida sin extraer no es una mejora (`motivoNeutra` va al tooltip). `aviso` añade una
 * línea de advertencia en ámbar bajo el detalle.
 */
export function Kpi({ label, valor, detalle, delta, mejorSiBaja = false, icono, color, comparadoCon, tendenciaNeutra = false, motivoNeutra, aviso }: {
  label: string; valor: string; detalle?: string; delta?: number | null; mejorSiBaja?: boolean; icono: React.ReactNode; color: string
  /** Periodo de referencia de la variación, p. ej. "vs 1 mar – 29 may" */
  comparadoCon?: string
  tendenciaNeutra?: boolean
  motivoNeutra?: string | null
  aviso?: string | null
}) {
  const hayDelta = delta !== null && delta !== undefined && isFinite(delta)
  const bueno = hayDelta && (mejorSiBaja ? delta! < 0 : delta! > 0)
  const neutro = hayDelta && (tendenciaNeutra || Math.abs(delta!) < 0.5)
  // Se redondea a 1 decimal ANTES de elegir signo/flecha: evita "−0 %" o "+0 %" con flecha engañosa
  const redondeado = hayDelta ? Math.round(delta! * 10) / 10 : 0
  // CountUp interpreta "62.073" como decimal: solo animamos cifras sin separador de miles
  const animable = !/\d\.\d{3}/.test(valor)
  return (
    <article className="stat-card relative overflow-hidden p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ color, background: `${color}16` }}>{icono}</span>
        {hayDelta && (
          <span className="flex flex-col items-end gap-1">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold tabular-nums ${neutro ? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200" : bueno ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"}`}
            title={`Variación frente al periodo anterior de la misma duración${comparadoCon ? ` (${comparadoCon.replace(/^vs /, "")})` : ""}${tendenciaNeutra && motivoNeutra ? `. Sin valorar: ${motivoNeutra}` : ""}`}
          >
            {redondeado >= 0 ? <IconTrendingUp size={12} /> : <IconTrendingDown size={12} />}
            {redondeado > 0 ? "+" : ""}{(redondeado === 0 ? 0 : redondeado).toLocaleString("es-ES", { maximumFractionDigits: 1 })} %
          </span>
          {comparadoCon && <span className="text-[9.5px] font-semibold text-gray-400 dark:text-slate-400">{comparadoCon}</span>}
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold leading-none tracking-[-0.04em] text-gray-900 dark:text-white sm:text-[28px]">{animable ? <CountUp value={valor} /> : valor}</p>
      <p className="kpi-label mt-2.5 text-gray-500 dark:text-slate-300">{label}</p>
      {detalle && <p className="mt-1 text-xs leading-relaxed text-gray-400">{detalle}</p>}
      {aviso && <p role="note" className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-semibold leading-snug text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><IconAlertTriangle size={12} className="mt-0.5 shrink-0" />{aviso}</p>}
    </article>
  )
}

export function Segmentado<T extends string>({ opciones, valor, onChange, etiqueta }: {
  opciones: { value: T; label: string }[]; valor: T; onChange: (v: T) => void; etiqueta: string
}) {
  return (
    <div className="flex flex-wrap rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label={etiqueta}>
      {opciones.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={valor === o.value}
          className={`rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold transition-all ${valor === o.value ? "bg-white text-teal-700 shadow-sm dark:bg-slate-700 dark:text-teal-300" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Nota({ children, tono = "info" }: { children: React.ReactNode; tono?: "info" | "aviso" }) {
  return (
    <p className={`rounded-xl px-3 py-2 text-[11px] leading-relaxed ${tono === "aviso" ? "bg-amber-50 text-amber-800 dark:bg-amber-950/25 dark:text-amber-200" : "bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300"}`}>
      {children}
    </p>
  )
}

/**
 * Explica contra qué se comparan las variaciones (%) de las tarjetas: periodo anterior de la
 * misma duración, días con datos en cada periodo y aviso si la cobertura no es comparable.
 */
export function NotaComparacion({ actual, anterior, diasActual, diasAnterior, fmt }: {
  actual: { desde: string; hasta: string }
  anterior: { desde: string; hasta: string }
  diasActual: number
  diasAnterior: number
  fmt: (d: string) => string
}) {
  const largo = (r: { desde: string; hasta: string }) => Math.round((Date.parse(r.hasta) - Date.parse(r.desde)) / 86400000) + 1
  const desigual = diasAnterior > 0 && Math.abs(diasActual - diasAnterior) / Math.max(diasActual, diasAnterior) > 0.1
  return (
    <p className="rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-[11px] leading-5 text-gray-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
      <strong className="text-gray-700 dark:text-gray-100">Variaciones (%):</strong> comparan con el periodo anterior de la misma duración, con los mismos filtros (work areas y prioridad). Los volúmenes se comparan por día con datos; tasas y tiempos, directamente.
      Actual <strong>{fmt(actual.desde)} – {fmt(actual.hasta)}</strong> ({largo(actual)} días, {diasActual} con datos) frente a <strong>{fmt(anterior.desde)} – {fmt(anterior.hasta)}</strong> ({largo(anterior)} días, {diasAnterior} con datos).
      {desigual && <span className="mt-1 block font-semibold text-amber-700 dark:text-amber-300">⚠ Los dos periodos no tienen la misma cobertura de datos ({diasActual} frente a {diasAnterior} días con datos): las variaciones de totales no son comparables; fíjate mejor en medias por día, tasas y tiempos.</span>}
    </p>
  )
}
