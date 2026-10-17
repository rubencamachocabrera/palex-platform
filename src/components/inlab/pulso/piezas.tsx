"use client"

/** Piezas de la pantalla «Pulso»: cifras vivas (sobre tinta) y tarjetas de hallazgos. */
import {
  IconActivity, IconAlertTriangle, IconArrowRight, IconCalendar, IconClipboardList, IconClock, IconMap, IconMicroscope, IconTrendingDown, IconTrendingUp,
} from "@/components/ui/Icons"
import type { Punto } from "@/lib/inlab/analytics"
import type { Hallazgo, IconoHallazgo } from "@/lib/inlab/hallazgos"
import { fmtN } from "../charts"
import { ValorAnimado } from "../ui"

// ─── Cifras vivas ────────────────────────────────────────────────────────────

export interface CifraDato {
  id: string
  label: string
  valor: string
  detalle?: string
  /** variación % frente al periodo anterior (null = no comparable) */
  delta: number | null
  mejorSiBaja?: boolean
  /** variación sin juicio de valor (gris) */
  neutra?: boolean
  motivoNeutra?: string | null
  serie: Punto[]
  color: string
  aviso?: string | null
}

function Sparkline({ puntos, color, alto = 34 }: { puntos: Punto[]; color: string; alto?: number }) {
  const vals = puntos.map(p => p.v).filter((v): v is number => v !== null)
  if (vals.length < 2) return <div style={{ height: alto }} />
  const max = Math.max(...vals), min = Math.min(0, ...vals)
  const W = 120, n = puntos.length
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * W : 0)
  const y = (v: number) => alto - 2 - ((v - min) / (max - min || 1)) * (alto - 6)
  let d = "", area = "", abierto = false, inicio = 0
  puntos.forEach((p, i) => {
    if (p.v === null) { if (abierto) { area += `L${x(i - 1)},${alto}L${x(inicio)},${alto}Z`; abierto = false } return }
    if (!abierto) { d += `M${x(i)},${y(p.v)}`; area += `M${x(i)},${y(p.v)}`; inicio = i; abierto = true } else { d += `L${x(i)},${y(p.v)}`; area += `L${x(i)},${y(p.v)}` }
  })
  if (abierto) area += `L${x(n - 1)},${alto}L${x(inicio)},${alto}Z`
  const gid = `spark-${color.replace("#", "")}`
  return (
    <svg viewBox={`0 0 ${W} ${alto}`} preserveAspectRatio="none" className="block h-[34px] w-full" aria-hidden="true">
      <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".35" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill={`url(#${gid})`} className="inlab-area" />
      <path d={d} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={1} className="inlab-linea" />
    </svg>
  )
}

export function CifraViva({ c, grande = false }: { c: CifraDato; grande?: boolean }) {
  const hay = c.delta !== null && isFinite(c.delta)
  const r = hay ? Math.round(c.delta! * 10) / 10 : 0
  const neutro = !hay || c.neutra || Math.abs(r) < 0.5
  const bueno = hay && (c.mejorSiBaja ? r < 0 : r > 0)
  // "62.073" lleva separador de miles: no se anima (se leería como decimal a mitad)
  const animable = !/\d\.\d{3}/.test(c.valor)
  return (
    <article className={`pulso-cifra relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.05] ${grande ? "p-6" : "p-4"}`}>
      <span className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${c.color}, transparent)` }} aria-hidden="true" />
      <div className="flex items-start justify-between gap-2">
        <p className={`${grande ? "text-xs" : "text-[10px]"} font-extrabold uppercase tracking-[.14em] text-slate-300`}>{c.label}</p>
        {hay && (
          <span title={c.neutra && c.motivoNeutra ? `Sin valorar: ${c.motivoNeutra}` : "Variación frente al periodo anterior de la misma duración"}
            className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums ${neutro ? "bg-white/10 text-slate-200" : bueno ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}>
            {r >= 0 ? <IconTrendingUp size={11} /> : <IconTrendingDown size={11} />}{r > 0 ? "+" : ""}{fmtN(r, 1)} %
          </span>
        )}
      </div>
      <p className={`${grande ? "mt-3 text-5xl" : "mt-2 text-[28px]"} font-extrabold leading-none tracking-[-.04em] text-white`}>{animable ? <ValorAnimado valor={c.valor} /> : c.valor}</p>
      {c.detalle && <p className={`${grande ? "mt-2 text-sm" : "mt-1.5 text-[11px]"} leading-snug text-slate-400`}>{c.detalle}</p>}
      {c.aviso && <p className="mt-1.5 flex items-start gap-1 text-[10.5px] font-semibold leading-snug text-amber-300"><IconAlertTriangle size={11} className="mt-0.5 shrink-0" />{c.aviso}</p>}
      <div className="mt-2"><Sparkline puntos={c.serie} color={c.color} /></div>
    </article>
  )
}

// ─── Hallazgos ───────────────────────────────────────────────────────────────

const ICONO: Record<IconoHallazgo, React.ReactNode> = {
  aviso: <IconAlertTriangle size={18} />,
  reloj: <IconClock size={18} />,
  calendario: <IconCalendar size={18} />,
  tendencia: <IconTrendingUp size={18} />,
  area: <IconMap size={18} />,
  prueba: <IconMicroscope size={18} />,
  tiempo: <IconActivity size={18} />,
  calidad: <IconClipboardList size={18} />,
  juntas: <IconActivity size={18} />,
}

const DESTINO: Record<string, string> = { consumo: "Ver consumo", pruebas: "Ver pruebas", tiempos: "Ver tiempos", calidad: "Ver calidad", resumen: "Ver resumen" }

export function TarjetaHallazgo({ h, onIr, grande = false, i = 0 }: { h: Hallazgo; onIr?: (h: Hallazgo) => void; grande?: boolean; i?: number }) {
  const aviso = h.tono === "aviso"
  const accion = h.ir ? ("dia" in h.ir ? "Ver ese día" : DESTINO[h.ir.tab]) : null
  return (
    <article className={`pulso-hallazgo card relative flex flex-col overflow-hidden ${grande ? "p-7" : "p-5"} ${aviso ? "ring-1 ring-amber-300 dark:ring-amber-700/70" : ""}`} style={{ animationDelay: `${i * 70}ms` }}>
      {aviso && <span className="absolute inset-x-0 top-0 h-1 bg-amber-400" aria-hidden="true" />}
      <div className="flex items-start gap-3">
        <span className={`flex ${grande ? "h-12 w-12" : "h-10 w-10"} shrink-0 items-center justify-center rounded-xl ${aviso ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" : "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"}`}>{ICONO[h.icono]}</span>
        <div className="min-w-0">
          <p className={`${grande ? "text-5xl" : "text-3xl"} font-extrabold leading-none tracking-[-.04em] tabular-nums ${aviso ? "text-amber-700 dark:text-amber-300" : "text-gray-900 dark:text-white"}`}>{h.cifra}</p>
          <h3 className={`${grande ? "mt-3 text-xl" : "mt-2 text-sm"} font-extrabold leading-snug text-gray-900 dark:text-white`}>{h.titulo}</h3>
        </div>
      </div>
      <p className={`${grande ? "mt-3 text-base leading-7" : "mt-2 text-xs leading-5"} flex-1 text-gray-500 dark:text-slate-300`}>{h.texto}</p>
      {accion && onIr && (
        <button type="button" onClick={() => onIr(h)} className="mt-3 inline-flex min-h-[36px] cursor-pointer items-center gap-1 self-start rounded-full px-1 text-[11px] font-extrabold text-teal-700 hover:text-teal-900 focus-visible:outline-2 focus-visible:outline-teal-500 dark:text-teal-300 dark:hover:text-teal-200">
          {accion}<IconArrowRight size={13} />
        </button>
      )}
    </article>
  )
}
