"use client"

/**
 * Reloj de 24 horas: tubos y etiquetas de cada hora de un día (medio o concreto), apilados por
 * work area, en un anillo con la medianoche arriba. «Reproducir el día» recorre las horas con
 * una aguja: el anillo se llena, la hora y el acumulado cuentan en el centro.
 *
 * El radio es proporcional a la raíz del valor (área del sector ∝ tubos), para no exagerar
 * las horas punta. Sin dependencias; respeta prefers-reduced-motion (sin reproducción automática).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { IconClock } from "@/components/ui/Icons"
import type { Reloj } from "@/lib/inlab/pulso"
import { fmtHora } from "@/lib/inlab/pulso"
import { fmtN } from "../charts"

const DURACION_MS = 10_000

const polar = (c: number, r: number, a: number) => [c + r * Math.cos(a), c + r * Math.sin(a)] as const
function sector(c: number, r0: number, r1: number, a0: number, a1: number): string {
  if (r1 - r0 < 0.15) return ""
  const [x0, y0] = polar(c, r1, a0), [x1, y1] = polar(c, r1, a1), [x2, y2] = polar(c, r0, a1), [x3, y3] = polar(c, r0, a0)
  return `M${x0.toFixed(2)},${y0.toFixed(2)}A${r1},${r1} 0 0 1 ${x1.toFixed(2)},${y1.toFixed(2)}L${x2.toFixed(2)},${y2.toFixed(2)}A${r0},${r0} 0 0 0 ${x3.toFixed(2)},${y3.toFixed(2)}Z`
}

const quiereMenosMovimiento = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

export function usePrefiereMenosMovimiento() {
  const [reducido, setReducido] = useState(quiereMenosMovimiento)
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => setReducido(m.matches)
    m.addEventListener("change", on)
    return () => m.removeEventListener("change", on)
  }, [])
  return reducido
}

/**
 * Reproducción del día: `t` va de 0 a 24 (null = día completo, sin reproducir).
 * `auto`: arranca sola la primera vez que el reloj entra en pantalla; `bucle`: vuelve a empezar.
 */
export function useReproduccion(opts: { auto?: boolean; bucle?: boolean; clave?: string } = {}) {
  const { auto = false, bucle = false, clave = "" } = opts
  const reducido = usePrefiereMenosMovimiento()
  const [t, setT] = useState<number | null>(null)
  const [reproduciendo, setReproduciendo] = useState(false)
  const frame = useRef(0)
  const ref = useRef<HTMLDivElement>(null)
  const yaAuto = useRef(false)

  const espera = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reproducirRef = useRef<(desde?: number) => void>(() => {})
  const cancelar = () => { cancelAnimationFrame(frame.current); if (espera.current) clearTimeout(espera.current) }
  const parar = useCallback(() => { cancelar(); setReproduciendo(false) }, [])
  const reproducir = useCallback((desde = 0) => {
    cancelar()
    setReproduciendo(true)
    const inicio = performance.now() - (desde / 24) * DURACION_MS
    const paso = (ahora: number) => {
      const x = ((ahora - inicio) / DURACION_MS) * 24
      if (x >= 24) {
        // En bucle (modo pantalla): pausa con el día completo y vuelve a empezar
        if (bucle) { setT(24); espera.current = setTimeout(() => reproducirRef.current(0), 2500); return }
        setT(null); setReproduciendo(false); return
      }
      setT(x)
      frame.current = requestAnimationFrame(paso)
    }
    frame.current = requestAnimationFrame(paso)
  }, [bucle])
  useEffect(() => { reproducirRef.current = reproducir }, [reproducir])

  // Al cambiar los datos (otro día, otro periodo) se para y se muestra el día completo
  const [clavePrev, setClavePrev] = useState(clave)
  if (clavePrev !== clave) { setClavePrev(clave); setT(null); setReproduciendo(false) }
  useEffect(() => cancelar, [clave])

  useEffect(() => {
    if (!auto || reducido || quiereMenosMovimiento() || yaAuto.current) return
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !yaAuto.current) { yaAuto.current = true; reproducir(0); io.disconnect() }
    }, { threshold: 0.5 })
    io.observe(el)
    return () => io.disconnect()
  }, [auto, reducido, reproducir])

  return { t, setT, reproduciendo, reproducir, parar, ref, reducido }
}

export interface RelojDiaProps {
  reloj: Reloj
  /** color de cada grupo de `reloj.grupos` */
  colores: string[]
  /** hora actual de la reproducción (0–24) o null = día completo */
  t: number | null
  tamano?: number
  /** etiqueta del centro cuando no se reproduce («día laborable medio»…) */
  subtitulo?: string
  compacto?: boolean
}

export function RelojDia({ reloj, colores, t, tamano = 400, subtitulo = "al día", compacto = false }: RelojDiaProps) {
  const [hover, setHover] = useState<number | null>(null)
  const c = tamano / 2
  const r0 = tamano * (compacto ? 0.24 : 0.2), R = tamano * (compacto ? 0.47 : 0.43)
  const gap = 0.012
  const max = reloj.max || 1
  const rad = useCallback((v: number) => Math.sqrt(r0 * r0 + ((R * R - r0 * r0) * Math.max(0, v)) / max), [r0, R, max])

  // Sectores apilados (memo: el hover y la aguja no recalculan la geometría del día)
  const geometria = useMemo(() => reloj.horas.map(x => {
    const a0 = (x.h / 24) * Math.PI * 2 - Math.PI / 2 + gap, a1 = ((x.h + 1) / 24) * Math.PI * 2 - Math.PI / 2 - gap
    let acc = 0
    const capas = x.v.map((v, g) => { const ri = rad(acc); acc += v; return { g, d: sector(c, ri, rad(acc), a0, a1) } })
    return { h: x.h, a0, a1, capas, fondo: sector(c, r0, R, a0, a1) }
  }), [reloj, rad, c, r0, R])

  const hActual = t === null ? null : Math.min(23, Math.floor(t))
  const frac = t === null ? 1 : t - Math.floor(t)
  // Acumulado hasta la aguja
  let acumulado = 0
  if (t !== null) for (const x of reloj.horas) acumulado += x.h < Math.floor(t) ? x.total : x.h === hActual ? x.total * frac : 0
  const foco = hover ?? hActual
  const hf = foco !== null ? reloj.horas[foco] : null
  const angAguja = t === null ? null : (t / 24) * Math.PI * 2 - Math.PI / 2
  const [ax, ay] = angAguja === null ? [0, 0] : polar(c, R + 6, angAguja)

  return (
    <div className="relative mx-auto" style={{ width: "100%", maxWidth: tamano }}>
      <svg viewBox={`0 0 ${tamano} ${tamano}`} className="block h-auto w-full" role="img"
        aria-label={`Tubos y etiquetas por hora: ${fmtN(reloj.total)} ${subtitulo}${reloj.pico ? `, hora punta ${reloj.pico.h}:00 (${fmtN(reloj.pico.pct, 0)} %)` : ""}`}>
        <defs>
          <radialGradient id="pulso-reloj-brillo" cx="50%" cy="50%" r="50%">
            <stop offset="55%" stopColor="#5eead4" stopOpacity="0" />
            <stop offset="100%" stopColor="#5eead4" stopOpacity=".08" />
          </radialGradient>
        </defs>
        <circle cx={c} cy={c} r={R + 4} fill="url(#pulso-reloj-brillo)" />
        {/* Anillos guía */}
        {[0.25, 0.5, 1].map(q => <circle key={q} cx={c} cy={c} r={rad(max * q)} fill="none" stroke="currentColor" strokeOpacity={0.08} strokeDasharray="2 4" />)}
        {/* Sectores */}
        {geometria.map(s => {
          const pendiente = t !== null && s.h > (hActual ?? -1)
          const enCurso = t !== null && s.h === hActual
          return (
            <g key={s.h} onMouseEnter={() => setHover(s.h)} onMouseLeave={() => setHover(null)} style={{ cursor: "default" }}>
              <path d={s.fondo} fill="currentColor" fillOpacity={hover === s.h ? 0.1 : 0.04} />
              {!pendiente && s.capas.map(k => k.d && (
                <path key={k.g} d={k.d} fill={colores[k.g]} className="pulso-sector"
                  style={{ opacity: hover !== null && hover !== s.h ? 0.45 : 1, transformOrigin: `${c}px ${c}px`, transform: enCurso ? `scale(${0.6 + 0.4 * frac})` : undefined, transition: "opacity 150ms ease" }} />
              ))}
            </g>
          )
        })}
        {/* Horas */}
        {Array.from({ length: 24 }, (_, h) => {
          const a = (h / 24) * Math.PI * 2 - Math.PI / 2
          const [x1, y1] = polar(c, R + 3, a), [x2, y2] = polar(c, R + (h % 6 === 0 ? 11 : 7), a)
          const [lx, ly] = polar(c, R + (compacto ? 14 : 20), a)
          return (
            <g key={h}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeOpacity={h % 6 === 0 ? 0.5 : 0.22} strokeWidth={h % 6 === 0 ? 1.5 : 1} />
              {(!compacto ? h % 3 === 0 : h % 6 === 0) && <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="currentColor" fillOpacity={0.6} fontSize={compacto ? 10 : 11} fontWeight={700}>{h}</text>}
            </g>
          )
        })}
        {/* Aguja */}
        {angAguja !== null && (
          <g className="pulso-aguja">
            <line x1={c} y1={c} x2={ax} y2={ay} stroke="#5eead4" strokeWidth={2} strokeLinecap="round" />
            <circle cx={ax} cy={ay} r={4} fill="#5eead4" />
            <circle cx={c} cy={c} r={3} fill="#5eead4" />
          </g>
        )}
      </svg>
      {/* Centro */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {hf && (t !== null || hover !== null) ? (
          <>
            <span className={`${compacto ? "text-lg" : "text-2xl sm:text-3xl"} font-extrabold tabular-nums tracking-[-.03em]`}>{String(hf.h).padStart(2, "0")}:00</span>
            <span className="mt-0.5 text-[11px] font-bold tabular-nums opacity-80">{fmtN(hf.total, hf.total < 10 ? 1 : 0)} tubos</span>
            {t !== null && !compacto && <span className="mt-1 rounded-full bg-teal-400/15 px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-teal-200">{fmtN(reloj.total ? (acumulado / reloj.total) * 100 : 0, 0)} % del día</span>}
          </>
        ) : (
          <>
            {!compacto && <IconClock size={16} className="mb-1 opacity-60" />}
            <span className={`${compacto ? "text-lg" : "text-2xl sm:text-3xl"} font-extrabold tabular-nums tracking-[-.03em]`}>{fmtN(reloj.total, 0)}</span>
            <span className="mt-0.5 max-w-[120px] text-[10px] font-bold uppercase leading-tight tracking-wide opacity-70">tubos {subtitulo}</span>
            {!compacto && reloj.mitadA !== null && <span className="mt-1 text-[10px] font-semibold opacity-70">mitad del día a las {fmtHora(reloj.mitadA)}</span>}
          </>
        )}
      </div>
    </div>
  )
}
