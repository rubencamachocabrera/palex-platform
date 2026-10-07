"use client"

/**
 * Gráficos SVG propios de Inteligencia InLab (sin dependencias).
 * Reglas: un único eje Y, marcas finas con extremos redondeados, tooltip en hover,
 * colores por entidad (nunca por ranking) y texto siempre en tinta neutra.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { TEAL, ORANGE } from "@/lib/brand"
import type { Punto } from "@/lib/inlab/analytics"

// ─── Formato ─────────────────────────────────────────────────────────────────

export const fmtN = (v: number | null | undefined, dec = 0) =>
  v === null || v === undefined || !isFinite(v) ? "—" : v.toLocaleString("es-ES", { maximumFractionDigits: dec, minimumFractionDigits: 0 })

export const fmtCompacto = (v: number) =>
  Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toLocaleString("es-ES", { maximumFractionDigits: 2 })} M`
    : Math.abs(v) >= 10_000 ? `${(v / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })} k`
      : fmtN(v)

/**
 * Duración legible. Por debajo de 10 min con un decimal ("3,8 min"): en extracciones la
 * mayoría de medianas están entre 0,5 y 6 min y redondear a minutos enteros hacía que
 * áreas distintas mostraran el mismo "2 min". Se redondea primero para no mostrar
 * "60 min" ni "1 h 60 min".
 */
export function fmtMin(min: number | null | undefined): string {
  if (min === null || min === undefined || !isFinite(min)) return "—"
  const d1 = Math.round(min * 10) / 10
  if (d1 < 10) return `${d1.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} min`
  const r = Math.round(min)
  if (r < 60) return `${r} min`
  if (r < 1440) { const h = Math.floor(r / 60), m = r % 60; return m ? `${h} h ${m} min` : `${h} h` }
  return `${(min / 1440).toLocaleString("es-ES", { maximumFractionDigits: 1 })} d`
}

export const fmtDia = (d: string, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" }) =>
  new Intl.DateTimeFormat("es-ES", { ...opts, timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`))

export const fmtEur = (v: number | null | undefined, moneda = "EUR") =>
  v === null || v === undefined ? "—" : v.toLocaleString("es-ES", { style: "currency", currency: moneda, maximumFractionDigits: 2 })

// ─── Colores ─────────────────────────────────────────────────────────────────

/** Paleta categórica en orden fijo (validada: banda de luminosidad y separación CVD). Gris solo para "Otros". */
export const SERIE = [TEAL, ORANGE, "#6366F1", "#E11D48", "#0EA5E9", "#A16207", "#7C3AED"]
export const GRIS = "#94A3B8"

/** Color de tapón convencional para tubos conocidos; el resto, paleta en orden fijo por nombre. */
const TUBOS: [RegExp, string][] = [
  [/suero|rojo|sst|bioq/i, "#BD1A15"],
  [/edta|malva|lila|morad|hemato/i, "#765C98"],
  [/coag|citrat|azul/i, "#10AADE"],
  [/hepar|verde|hlit/i, "#1E7A45"],
  [/vsg|negro/i, "#334155"],
  [/gluc|gris|fluor/i, "#78716C"],
  [/orina|amarill/i, "#D4A017"],
  [/serolog/i, "#E5B45A"],
  [/inmuno/i, "#38BDF8"],
]

export function colorConsumible(nombre: string, universo: string[]): string {
  for (const [re, c] of TUBOS) if (re.test(nombre)) return c
  if (/etiqueta|label/i.test(nombre)) return "#64748B"
  if (/^otros|^sin /i.test(nombre)) return GRIS
  const i = universo.indexOf(nombre)
  return i >= 0 ? SERIE[i % SERIE.length] : GRIS
}

// ─── Utilidades ──────────────────────────────────────────────────────────────

function useAncho<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(entries => setW(Math.floor(entries[0].contentRect.width)))
    ro.observe(el)
    setW(Math.floor(el.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

function ticksBonitos(max: number, n = 4): number[] {
  if (max <= 0) return [0]
  const paso0 = max / n
  const mag = Math.pow(10, Math.floor(Math.log10(paso0)))
  const paso = [1, 2, 2.5, 5, 10].map(m => m * mag).find(p => p >= paso0) ?? paso0
  const out: number[] = []
  for (let v = 0; v <= max + paso * 0.001; v += paso) out.push(v)
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + paso)
  return out
}

function TooltipBox({ x, y, ancho, children }: { x: number; y: number; ancho: number; children: React.ReactNode }) {
  const izquierda = x > ancho * 0.6
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 min-w-[140px] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-[11px] shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95"
      style={{ left: izquierda ? undefined : x + 12, right: izquierda ? ancho - x + 12 : undefined, top: Math.max(0, y - 10) }}
    >
      {children}
    </div>
  )
}

// ─── Serie temporal (línea/área) ─────────────────────────────────────────────

export interface Serie { nombre: string; color: string; puntos: Punto[]; discontinua?: boolean; area?: boolean }

export function TimeChart({ series, alto = 220, formato = fmtN, etiquetaX = (x: string) => fmtDia(x), vacio = "Sin datos en el periodo" }: {
  series: Serie[]; alto?: number; formato?: (v: number) => string; etiquetaX?: (x: string) => string; vacio?: string
}) {
  const [ref, ancho] = useAncho<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const xs = useMemo(() => [...new Set(series.flatMap(s => s.puntos.map(p => p.x)))].sort(), [series])
  const max = useMemo(() => Math.max(0, ...series.flatMap(s => s.puntos.map(p => p.v ?? 0))), [series])
  const ticks = ticksBonitos(max)
  const yMax = ticks[ticks.length - 1] || 1
  const m = { l: 44, r: 12, t: 12, b: 26 }
  const w = Math.max(ancho - m.l - m.r, 10), h = alto - m.t - m.b
  const X = (i: number) => m.l + (xs.length <= 1 ? w / 2 : (i / (xs.length - 1)) * w)
  const Y = (v: number) => m.t + h - (v / yMax) * h
  const idx = new Map(xs.map((x, i) => [x, i]))
  const hayDatos = series.some(s => s.puntos.some(p => p.v !== null && p.v !== 0))

  const path = (s: Serie) => {
    let d = "", abierto = false
    for (const p of s.puntos) {
      const i = idx.get(p.x)!
      if (p.v === null) { abierto = false; continue }
      d += `${abierto ? "L" : "M"}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`
      abierto = true
    }
    return d
  }
  const areaPath = (s: Serie) => {
    const pts = s.puntos.filter(p => p.v !== null)
    if (pts.length < 2) return ""
    const first = idx.get(pts[0].x)!, last = idx.get(pts[pts.length - 1].x)!
    return `${path(s)}L${X(last).toFixed(1)},${Y(0)}L${X(first).toFixed(1)},${Y(0)}Z`
  }
  const nEtiquetas = Math.max(2, Math.min(7, Math.floor(w / 90)))
  const pasoEt = Math.max(1, Math.ceil(xs.length / nEtiquetas))

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = xs.length <= 1 ? 0 : Math.round((px / rect.width) * (xs.length - 1))
    setHover(Math.max(0, Math.min(xs.length - 1, i)))
  }

  return (
    <div ref={ref} className="relative w-full" style={{ height: alto }}>
      {ancho > 0 && !hayDatos && <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">{vacio}</div>}
      {ancho > 0 && hayDatos && (
        <svg width={ancho} height={alto} role="img" aria-label={series.map(s => s.nombre).join(", ")}>
          {ticks.map(t => (
            <g key={t}>
              <line x1={m.l} x2={m.l + w} y1={Y(t)} y2={Y(t)} className="stroke-slate-100 dark:stroke-slate-700/60" strokeWidth={1} />
              <text x={m.l - 8} y={Y(t) + 3} textAnchor="end" className="fill-slate-400 text-[10px] tabular-nums">{fmtCompacto(t)}</text>
            </g>
          ))}
          {xs.map((x, i) => i % pasoEt === 0 && (
            <text key={x} x={X(i)} y={alto - 8} textAnchor="middle" className="fill-slate-400 text-[10px]">{etiquetaX(x)}</text>
          ))}
          {series.map(s => s.area && <path key={`a-${s.nombre}`} d={areaPath(s)} fill={s.color} opacity={0.1} />)}
          {series.map(s => (
            <path key={s.nombre} d={path(s)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.discontinua ? "5 5" : undefined} />
          ))}
          {hover !== null && (
            <g>
              <line x1={X(hover)} x2={X(hover)} y1={m.t} y2={m.t + h} className="stroke-slate-300 dark:stroke-slate-600" strokeWidth={1} />
              {series.map(s => {
                const p = s.puntos.find(pp => pp.x === xs[hover])
                return p && p.v !== null ? <circle key={s.nombre} cx={X(hover)} cy={Y(p.v)} r={4.5} fill={s.color} className="stroke-white dark:stroke-slate-900" strokeWidth={2} /> : null
              })}
            </g>
          )}
          <rect x={m.l} y={m.t} width={w} height={h} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
        </svg>
      )}
      {hover !== null && ancho > 0 && (
        <TooltipBox x={X(hover)} y={m.t} ancho={ancho}>
          <p className="mb-1 font-bold text-gray-700 dark:text-gray-200">{etiquetaX(xs[hover])}</p>
          {series.map(s => {
            const p = s.puntos.find(pp => pp.x === xs[hover])
            if (!p) return null
            return (
              <p key={s.nombre} className="flex items-center justify-between gap-3 text-gray-500 dark:text-slate-300">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.nombre}</span>
                <strong className="tabular-nums text-gray-800 dark:text-white">{p.v === null ? "sin datos" : formato(p.v)}</strong>
              </p>
            )
          })}
        </TooltipBox>
      )}
    </div>
  )
}

export function Leyenda({ items }: { items: { nombre: string; color: string; discontinua?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 dark:text-slate-300">
      {items.map(i => (
        <span key={i.nombre} className="inline-flex items-center gap-1.5">
          <svg width="16" height="6" aria-hidden><line x1="1" x2="15" y1="3" y2="3" stroke={i.color} strokeWidth="2" strokeLinecap="round" strokeDasharray={i.discontinua ? "3 3" : undefined} /></svg>
          {i.nombre}
        </span>
      ))}
    </div>
  )
}

// ─── Lista de barras horizontales (clicable para filtrar) ────────────────────

/** Selección simple (string) o múltiple (lista de claves, p. ej. work areas). */
const esActivo = (sel: string | readonly string[] | null | undefined, clave: string) => (Array.isArray(sel) ? sel.includes(clave) : sel === clave)
const haySeleccion = (sel: string | readonly string[] | null | undefined) => (Array.isArray(sel) ? sel.length > 0 : !!sel)

export interface ItemBarra { clave: string; label?: string; valor: number; sub?: string; color?: string }

export function BarList({ items, seleccionado, onSelect, formato = fmtN, max: maxProp, limite = 12, etiquetaAccion = "Filtrar por" }: {
  items: ItemBarra[]; seleccionado?: string | readonly string[] | null; onSelect?: (clave: string | null, item: string) => void
  formato?: (v: number) => string; max?: number; limite?: number; etiquetaAccion?: string
}) {
  const [todos, setTodos] = useState(false)
  const visibles = todos ? items : items.slice(0, limite)
  const max = maxProp ?? Math.max(1, ...items.map(i => i.valor))
  const total = items.reduce((s, i) => s + i.valor, 0)
  if (items.length === 0) return <p className="py-6 text-center text-xs text-gray-400">Sin datos en el periodo</p>
  return (
    <div className="space-y-1">
      {visibles.map(it => {
        const activo = esActivo(seleccionado, it.clave)
        const atenuado = haySeleccion(seleccionado) && !activo
        const contenido = (
          <>
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                {it.color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: it.color }} />}
                <span className="truncate text-xs font-bold text-gray-700 dark:text-gray-200">{it.label ?? it.clave}</span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-gray-800 dark:text-white">
                <strong className="font-extrabold">{formato(it.valor)}</strong>
                <span className="ml-1.5 text-[10px] font-medium text-gray-400">{total ? fmtN((it.valor / total) * 100, 1) : 0} %</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/70">
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(1, (it.valor / max) * 100)}%`, background: it.color ?? TEAL }} />
            </div>
            {it.sub && <p className="mt-0.5 text-[10px] text-gray-400">{it.sub}</p>}
          </>
        )
        return onSelect ? (
          <button
            key={it.clave}
            type="button"
            onClick={() => onSelect(activo ? null : it.clave, it.clave)}
            aria-pressed={activo}
            title={`${activo ? "Quitar filtro" : etiquetaAccion}: ${it.label ?? it.clave}`}
            className={`block w-full rounded-lg px-2 py-1.5 text-left transition-all hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-500 dark:hover:bg-slate-800/60 ${activo ? "bg-teal-50/70 ring-1 ring-teal-200 dark:bg-teal-950/30 dark:ring-teal-800" : ""} ${atenuado ? "opacity-45" : ""}`}
          >
            {contenido}
          </button>
        ) : <div key={it.clave} className="px-2 py-1.5">{contenido}</div>
      })}
      {items.length > limite && (
        <button type="button" onClick={() => setTodos(v => !v)} className="mt-1 px-2 text-[11px] font-bold text-teal-700 hover:text-teal-800 dark:text-teal-300">
          {todos ? "Ver menos" : `Ver ${items.length - limite} más`}
        </button>
      )}
    </div>
  )
}

// ─── Columnas verticales ─────────────────────────────────────────────────────

export function Columnas({ items, formato = fmtN, alto = 180, color = TEAL, resaltar }: {
  items: { label: string; valor: number; detalle?: string }[]; formato?: (v: number) => string; alto?: number; color?: string; resaltar?: number
}) {
  const [ref, ancho] = useAncho<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...items.map(i => i.valor))
  const m = { t: 18, b: 22 }
  const h = alto - m.t - m.b
  const slot = ancho / Math.max(1, items.length)
  const bw = Math.max(4, Math.min(42, slot - 6))
  return (
    <div ref={ref} className="relative w-full" style={{ height: alto }}>
      {ancho > 0 && (
        <svg width={ancho} height={alto} role="img">
          <line x1={0} x2={ancho} y1={m.t + h} y2={m.t + h} className="stroke-slate-200 dark:stroke-slate-700" />
          {items.map((it, i) => {
            const bh = (it.valor / max) * h
            const x = i * slot + (slot - bw) / 2
            const destacado = resaltar === i || hover === i
            return (
              <g key={it.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={i * slot} y={m.t} width={slot} height={h} fill="transparent" />
                <path className="chart-bar" d={barraRedondeada(x, m.t + h - bh, bw, bh)} fill={color} opacity={destacado || resaltar === undefined ? 1 : 0.55} />
                {destacado && <text x={x + bw / 2} y={m.t + h - bh - 5} textAnchor="middle" className="fill-slate-600 text-[10px] font-bold tabular-nums dark:fill-slate-200">{formato(it.valor)}</text>}
                <text x={i * slot + slot / 2} y={alto - 6} textAnchor="middle" className="fill-slate-400 text-[10px]">{it.label}</text>
              </g>
            )
          })}
        </svg>
      )}
      {hover !== null && items[hover]?.detalle && (
        <TooltipBox x={hover * slot + slot / 2} y={0} ancho={ancho}><p className="text-gray-600 dark:text-slate-200">{items[hover].detalle}</p></TooltipBox>
      )}
    </div>
  )
}

/** Barra con esquinas superiores redondeadas (4px) y base recta en la línea base. */
function barraRedondeada(x: number, y: number, w: number, h: number) {
  if (h <= 0) return ""
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

// ─── Heatmap día de la semana × hora ─────────────────────────────────────────

const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

export function HeatmapSemana({ m, max, formato = (v: number) => fmtN(v, 1) }: { m: number[][]; max: number; formato?: (v: number) => string }) {
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null)
  if (max <= 0) return <p className="py-6 text-center text-xs text-gray-400">Sin datos horarios en el periodo</p>
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        <div className="grid gap-[2px]" style={{ gridTemplateColumns: "34px repeat(24, minmax(0, 1fr))" }}>
          <span />
          {Array.from({ length: 24 }, (_, h) => <span key={h} className="text-center text-[9px] text-gray-400">{h % 3 === 0 ? h : ""}</span>)}
          {m.map((fila, d) => (
            <div key={d} className="contents">
              <span className="pr-1 text-right text-[10px] font-bold leading-5 text-gray-400">{DOW[d]}</span>
              {fila.map((v, h) => {
                const a = v / max
                const activo = hover?.d === d && hover?.h === h
                return (
                  <span
                    key={h}
                    onMouseEnter={() => setHover({ d, h })}
                    onMouseLeave={() => setHover(null)}
                    className={`h-5 rounded-[3px] ${activo ? "ring-2 ring-slate-700 dark:ring-white" : ""}`}
                    style={{ background: v > 0 ? `rgba(0, 169, 157, ${0.08 + a * 0.92})` : "var(--heat-empty, rgba(148,163,184,.12))" }}
                    title={`${DOW[d]} ${h}:00 — ${formato(v)} registros/día`}
                  />
                )
              })}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
          <span>{hover ? <><strong className="text-gray-700 dark:text-gray-200">{DOW[hover.d]} · {hover.h}:00–{hover.h + 1}:00</strong> · {formato(m[hover.d][hover.h])} registros de media</> : "Pasa el cursor por una celda para ver el detalle"}</span>
          <span className="flex items-center gap-1">Menos<span className="h-2 w-16 rounded-full" style={{ background: "linear-gradient(90deg, rgba(0,169,157,.08), rgba(0,169,157,1))" }} />Más</span>
        </div>
      </div>
    </div>
  )
}

// ─── Donut ───────────────────────────────────────────────────────────────────

export function Donut({ items, centro, subcentro, tamano = 160 }: { items: { label: string; valor: number; color: string }[]; centro: string; subcentro?: string; tamano?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const total = items.reduce((s, i) => s + i.valor, 0)
  const r = tamano / 2 - 10, c = tamano / 2, sw = 16
  const circ = 2 * Math.PI * r
  let acc = 0
  return (
    <div className="relative mx-auto" style={{ width: tamano, height: tamano }}>
      <svg width={tamano} height={tamano} role="img" aria-label={items.map(i => `${i.label}: ${i.valor}`).join(", ")}>
        <circle cx={c} cy={c} r={r} fill="none" className="stroke-slate-100 dark:stroke-slate-700" strokeWidth={sw} />
        {total > 0 && items.map((it, i) => {
          const frac = it.valor / total
          const gap = items.length > 1 ? 2 : 0
          const len = Math.max(0, frac * circ - gap)
          const el = (
            <circle
              key={it.label}
              cx={c} cy={c} r={r} fill="none" stroke={it.color} strokeWidth={hover === i ? sw + 3 : sw}
              strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-acc * circ}
              transform={`rotate(-90 ${c} ${c})`}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              style={{ transition: "stroke-width 150ms ease" }}
            />
          )
          acc += frac
          return el
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-lg font-extrabold tabular-nums text-gray-900 dark:text-white">{hover !== null ? fmtN(items[hover].valor) : centro}</span>
        <span className="max-w-[90px] text-[9px] font-extrabold uppercase tracking-wide text-gray-400">{hover !== null ? items[hover].label : subcentro}</span>
      </div>
    </div>
  )
}

// ─── Barras de rango P50–P90 (tiempos) ───────────────────────────────────────

export function RangoTiempos({ items, onSelect, seleccionado }: {
  items: { clave: string; p50: number | null; p90: number | null; n: number }[]; onSelect?: (c: string | null, item: string) => void; seleccionado?: string | readonly string[] | null
}) {
  const max = Math.max(1, ...items.map(i => i.p90 ?? 0))
  if (items.length === 0) return <p className="py-6 text-center text-xs text-gray-400">Sin tiempos calculables en el periodo</p>
  return (
    <div className="space-y-2.5">
      {items.map(it => {
        const activo = esActivo(seleccionado, it.clave)
        const atenuado = haySeleccion(seleccionado) && !activo
        const Comp = onSelect ? "button" : "div"
        return (
          <Comp
            key={it.clave}
            {...(onSelect ? { type: "button" as const, onClick: () => onSelect(activo ? null : it.clave, it.clave), "aria-pressed": activo } : {})}
            className={`block w-full rounded-lg px-2 py-1 text-left transition-opacity ${onSelect ? "hover:bg-slate-50 dark:hover:bg-slate-800/60" : ""} ${activo ? "bg-indigo-50/70 ring-1 ring-indigo-200 dark:bg-indigo-950/30 dark:ring-indigo-800" : ""} ${atenuado ? "opacity-45" : ""}`}
            title={`${it.clave}: mediana ${fmtMin(it.p50)}, P90 ${fmtMin(it.p90)} (${fmtN(it.n)} mediciones)`}
          >
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-bold text-gray-700 dark:text-gray-200">{it.clave}</span>
              <span className="shrink-0 tabular-nums text-gray-500 dark:text-slate-300"><strong className="text-gray-900 dark:text-white">{fmtMin(it.p50)}</strong> · P90 {fmtMin(it.p90)}</span>
            </div>
            <div className="relative h-2.5 rounded-full bg-slate-100 dark:bg-slate-700/70">
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${((it.p90 ?? 0) / max) * 100}%`, background: "rgba(99,102,241,.28)" }} />
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${((it.p50 ?? 0) / max) * 100}%`, background: "#6366F1" }} />
            </div>
          </Comp>
        )
      })}
      <div className="flex items-center gap-4 px-2 pt-1 text-[10px] text-gray-400">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-full" style={{ background: "#6366F1" }} />Mediana</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-full" style={{ background: "rgba(99,102,241,.28)" }} />Hasta P90</span>
      </div>
    </div>
  )
}

// ─── Calendario de cobertura ─────────────────────────────────────────────────

export function CalendarioCobertura({ dias, desde, hasta }: { dias: Set<string>; desde: string; hasta: string }) {
  const semanas: string[][] = []
  const inicio = new Date(`${desde}T00:00:00Z`)
  inicio.setUTCDate(inicio.getUTCDate() - ((inicio.getUTCDay() + 6) % 7))
  const fin = new Date(`${hasta}T00:00:00Z`)
  for (const d = new Date(inicio); d <= fin;) {
    const sem: string[] = []
    for (let i = 0; i < 7; i++) { sem.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1) }
    semanas.push(sem)
  }
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex gap-[3px]" role="img" aria-label="Calendario de días con datos">
        {semanas.map(sem => (
          <div key={sem[0]} className="flex flex-col gap-[3px]">
            {sem.map(d => {
              const fuera = d < desde || d > hasta
              const con = dias.has(d)
              return <span key={d} title={`${fmtDia(d, { day: "2-digit", month: "short", year: "numeric" })}: ${fuera ? "fuera del rango" : con ? "con datos" : "SIN DATOS"}`} className={`h-3 w-3 rounded-[3px] ${fuera ? "opacity-0" : con ? "" : "ring-1 ring-inset ring-orange-300 dark:ring-orange-700"}`} style={{ background: fuera ? "transparent" : con ? TEAL : "rgba(247,148,29,.12)" }} />
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
