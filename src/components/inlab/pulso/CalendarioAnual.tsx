"use client"

/**
 * El año en un vistazo: un cuadrado por día de toda la cobertura cargada (semanas en columnas,
 * lunes arriba), más intenso cuanta más actividad. Días sin datos cargados: rayados (no son
 * días sin trabajo). Fuera del periodo elegido: atenuados. Clic en un día = seleccionarlo.
 * Intensidad por cuantiles (nivelesCalendario): los fines de semana no aplastan la escala.
 */
import { useId, useMemo, useRef, useState } from "react"
import { TEAL, ORANGE } from "@/lib/brand"
import type { Rango } from "@/lib/inlab/analytics"
import { nivelDe, nivelesCalendario, valorDia, type DiaActividad } from "@/lib/inlab/pulso"
import { fmtDia, fmtN } from "../charts"

const CELDA = 15, HUECO = 3, PASO = CELDA + HUECO
const IZQ = 22, ARRIBA = 18
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
const OPACIDAD = [0, 0.18, 0.36, 0.56, 0.78, 1]

function semanasDe(desde: string, hasta: string): string[][] {
  const out: string[][] = []
  const d = new Date(`${desde}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  const fin = new Date(`${hasta}T00:00:00Z`)
  while (d <= fin) {
    const sem: string[] = []
    for (let i = 0; i < 7; i++) { sem.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1) }
    out.push(sem)
  }
  return out
}

export function CalendarioAnual({ porDia, desde, hasta, rango, seleccionado, onDia, unidad = "peticiones", color = TEAL, escala = 1 }: {
  porDia: Map<string, DiaActividad>
  /** cobertura completa */
  desde: string
  hasta: string
  /** periodo elegido en el dashboard (el resto se atenúa) */
  rango: Rango
  seleccionado: string | null
  onDia?: (d: string) => void
  unidad?: string
  color?: string
  /** tamaño (modo pantalla) */
  escala?: number
}) {
  const uid = useId().replace(/:/g, "")
  const caja = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ d: string; x: number; y: number } | null>(null)
  const semanas = useMemo(() => semanasDe(desde, hasta), [desde, hasta])
  const umbrales = useMemo(() => nivelesCalendario([...porDia.values()].map(valorDia)), [porDia])
  const ancho = IZQ + semanas.length * PASO, alto = ARRIBA + 7 * PASO
  // Etiqueta de mes en la semana que contiene el día 1 (y en la primera, si el mes no empieza enseguida)
  const meses = useMemo(() => {
    const out: { i: number; m: string }[] = []
    semanas.forEach((sem, i) => {
      const uno = sem.find(d => d.slice(8) === "01" && d >= desde && d <= hasta)
      if (uno) out.push({ i, m: MESES[Number(uno.slice(5, 7)) - 1] })
      else if (i === 0 && !semanas.slice(1, 3).some(x => x.some(d => d.slice(8) === "01"))) out.push({ i, m: MESES[Number(desde.slice(5, 7)) - 1] })
    })
    return out
  }, [semanas, desde, hasta])
  const hx = hover ? porDia.get(hover.d) : undefined

  return (
    <div ref={caja} className="relative">
      <div className="overflow-x-auto pb-1 [contain:inline-size]">
        <svg viewBox={`0 0 ${ancho} ${alto}`} width={ancho * escala} height={alto * escala} className="block max-w-none" role="img"
          aria-label={`Actividad diaria del ${fmtDia(desde, { day: "numeric", month: "short", year: "numeric" })} al ${fmtDia(hasta, { day: "numeric", month: "short", year: "numeric" })}`}
          onMouseLeave={() => setHover(null)}>
          <defs>
            <pattern id={`${uid}-rayas`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="4" height="4" fill="currentColor" fillOpacity={0.04} />
              <line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" strokeOpacity={0.22} strokeWidth="1.5" />
            </pattern>
          </defs>
          {meses.map(({ i, m }) => <text key={`${i}${m}`} x={IZQ + i * PASO} y={11} fontSize={10} fontWeight={700} fill="currentColor" fillOpacity={0.55}>{m}</text>)}
          {["L", "", "X", "", "V", "", "D"].map((t, i) => t && <text key={i} x={0} y={ARRIBA + i * PASO + CELDA - 3} fontSize={9.5} fontWeight={700} fill="currentColor" fillOpacity={0.45}>{t}</text>)}
          {semanas.map((sem, si) => sem.map((d, di) => {
            if (d < desde || d > hasta) return null
            const x = IZQ + si * PASO, y = ARRIBA + di * PASO
            const info = porDia.get(d)
            const fuera = d < rango.desde || d > rango.hasta
            const sel = d === seleccionado
            const nivel = info ? nivelDe(valorDia(info), umbrales) : 0
            return (
              <g key={d} className="pulso-dia" style={{ animationDelay: `${Math.min(si, 60) * 9}ms` }}>
                {info
                  ? <rect x={x} y={y} width={CELDA} height={CELDA} rx={3} fill={nivel ? color : "currentColor"} fillOpacity={nivel ? OPACIDAD[nivel] * (fuera ? 0.35 : 1) : 0.06} />
                  : <rect x={x} y={y} width={CELDA} height={CELDA} rx={3} fill={`url(#${uid}-rayas)`} opacity={fuera ? 0.5 : 1} />}
                {sel && <rect x={x - 1.5} y={y - 1.5} width={CELDA + 3} height={CELDA + 3} rx={4} fill="none" stroke={ORANGE} strokeWidth={2} />}
                <rect x={x} y={y} width={CELDA} height={CELDA} fill="transparent" style={{ cursor: info && onDia ? "pointer" : "default" }}
                  onMouseEnter={e => { const r = (e.currentTarget as SVGRectElement).getBoundingClientRect(), b = caja.current?.getBoundingClientRect(); if (b) setHover({ d, x: r.left + r.width / 2 - b.left, y: r.top - b.top }) }} onClick={info && onDia ? () => onDia(d) : undefined} />
              </g>
            )
          }))}
        </svg>
      </div>
      {hover && (
        <div role="tooltip" className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 text-[11px] shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95"
          style={{ left: Math.max(70, hover.x), top: hover.y - 4 }}>
          <strong className="text-gray-800 dark:text-white">{fmtDia(hover.d, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</strong>
          <span className="ml-1.5 text-gray-500 dark:text-slate-300">{hx ? `${fmtN(valorDia(hx))} ${unidad}` : "sin datos cargados"}</span>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-400">
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5"><svg width="12" height="12" aria-hidden="true"><rect width="12" height="12" rx="3" fill="none" stroke={ORANGE} strokeWidth="2" /></svg>Día elegido</span>
          <span className="inline-flex items-center gap-1.5"><svg width="12" height="12" aria-hidden="true" className="text-slate-500"><defs><pattern id={`${uid}-ley`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" strokeOpacity={0.5} strokeWidth="1.5" /></pattern></defs><rect width="12" height="12" rx="3" fill={`url(#${uid}-ley)`} /></svg>Sin datos cargados</span>
        </span>
        <span className="flex items-center gap-1">Menos{OPACIDAD.slice(1).map(o => <span key={o} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color, opacity: o }} />)}Más</span>
      </div>
    </div>
  )
}
