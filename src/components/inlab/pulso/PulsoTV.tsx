"use client"

/**
 * Modo pantalla del Pulso: para una tele del laboratorio o para abrir una reunión. Pantalla
 * completa en tinta, escenas que rotan solas (cifras → reloj del día → río → año → hallazgos),
 * reloj reproduciéndose en bucle, pantalla siempre encendida (Wake Lock, si el navegador lo
 * permite) y cursor/controles que se ocultan sin actividad. ←/→ cambian de escena, espacio
 * pausa, Esc sale. Con prefers-reduced-motion no rota solo ni anima el reloj.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { BrandLockup } from "@/components/ui/BrandLockup"
import { IconChevronLeft, IconChevronRight, IconPause, IconPlay, IconX } from "@/components/ui/Icons"
import { etiquetaArea, type Dataset, type Filtros, type Rango } from "@/lib/inlab/analytics"
import { OTRAS_AREAS, fmtHora, type DiaActividad, type FlujoPruebas, type Reloj } from "@/lib/inlab/pulso"
import type { Hallazgo } from "@/lib/inlab/hallazgos"
import { fmtDia, fmtN } from "../charts"
import { GRIS } from "../colores"
import s from "../share/share.module.css"
import { CalendarioAnual } from "./CalendarioAnual"
import { RelojDia, useReproduccion, usePrefiereMenosMovimiento } from "./RelojDia"
import { RioPruebas } from "./RioPruebas"
import { CifraViva, TarjetaHallazgo, type CifraDato } from "./piezas"

const DURACION_ESCENA_MS = 15_000

interface Escena { id: string; eyebrow: string; titulo: string; contenido: React.ReactNode }

export function PulsoTV({ onCerrar, hospitalNombre, rango, filtros, hastaCobertura, cifras, reloj, colorArea, flujo, porDia, dsTodo, unidadCal, hallazgos }: {
  onCerrar: () => void
  hospitalNombre: string
  rango: Rango
  filtros: Filtros
  hastaCobertura?: string
  cifras: CifraDato[]
  reloj: Reloj
  colorArea: (a: string) => string
  flujo: FlujoPruebas | null
  porDia: Map<string, DiaActividad>
  dsTodo: Dataset
  unidadCal: string
  hallazgos: Hallazgo[]
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reducido = usePrefiereMenosMovimiento()
  const [i, setI] = useState(0)
  const [pausa, setPausa] = useState(false)
  const [quieto, setQuieto] = useState(false)
  const [hora, setHora] = useState(() => new Date())
  const cerrarRef = useRef(onCerrar)
  useEffect(() => { cerrarRef.current = onCerrar }, [onCerrar])
  const { t: tRepro, reproducir, parar } = useReproduccion({ bucle: true })
  const colores = reloj.grupos.map(g => (g === OTRAS_AREAS ? GRIS : colorArea(g)))

  const escenas: Escena[] = [
    {
      id: "cifras", eyebrow: "El periodo en cifras", titulo: `${fmtDia(rango.desde, { day: "numeric", month: "long" })} — ${fmtDia(rango.hasta, { day: "numeric", month: "long", year: "numeric" })}`,
      contenido: <div className={`grid gap-5 ${cifras.length === 5 ? "grid-cols-2 xl:grid-cols-5" : "grid-cols-2 xl:grid-cols-4"}`}>{cifras.map(c => <CifraViva key={c.id} c={c} grande />)}</div>,
    },
    {
      id: "reloj", eyebrow: "El reloj de 24 horas", titulo: "Un día laborable, hora a hora",
      contenido: (
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
          <div className="text-slate-100"><RelojDia reloj={reloj} colores={colores} t={tRepro} tamano={560} subtitulo="en un día laborable" /></div>
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {[["Hora punta", reloj.pico ? `${reloj.pico.h}:00` : "—", reloj.pico ? `${fmtN(reloj.pico.pct, 0)} % del día` : ""], ["Mitad del día", fmtHora(reloj.mitadA), "50 % del trabajo"], ["Grueso del día", `${fmtHora(reloj.inicio)}–${fmtHora(reloj.fin)}`, "90 % del trabajo"]].map(([t, v, d]) => (
                <div key={t} className="rounded-2xl bg-white/[.06] p-5"><p className="text-sm font-bold text-slate-400">{t}</p><p className="mt-2 text-3xl font-extrabold tabular-nums">{v}</p><p className="mt-1 text-sm text-slate-400">{d}</p></div>
              ))}
            </div>
            <ul className="space-y-2.5">
              {reloj.grupos.map((g, k) => {
                const tot = reloj.horas.reduce((a, h) => a + h.v[k], 0)
                return <li key={g} className="flex items-center justify-between text-lg"><span className="flex items-center gap-3"><span className="h-3.5 w-3.5 rounded-full" style={{ background: colores[k] }} /><span className="font-bold">{g === OTRAS_AREAS ? g : etiquetaArea(g)}</span></span><span className="tabular-nums text-slate-300">{fmtN(reloj.total ? (tot / reloj.total) * 100 : 0, 0)} %</span></li>
              })}
            </ul>
          </div>
        </div>
      ),
    },
    ...(flujo && flujo.total > 0 ? [{
      id: "rio", eyebrow: "El río", titulo: "De dónde viene el trabajo y adónde va",
      contenido: <div className="text-slate-100"><RioPruebas flujo={flujo} colorArea={colorArea} alto={500} oscuro /></div>,
    }] : []),
    ...(dsTodo.dias.length && hastaCobertura ? [{
      id: "anio", eyebrow: "El año en un vistazo", titulo: `Cada día cargado, por ${unidadCal}`,
      contenido: <div className="flex justify-center text-slate-400"><div className="max-w-full"><CalendarioAnual porDia={porDia} desde={dsTodo.dias[0]} hasta={hastaCobertura} rango={rango} seleccionado={null} unidad={unidadCal} escala={1.45} /></div></div>,
    }] : []),
    ...Array.from({ length: Math.ceil(hallazgos.length / 3) }, (_, k) => ({
      id: `hallazgos-${k}`, eyebrow: "Lo que dicen los datos", titulo: k === 0 ? "Hallazgos del periodo" : "Más hallazgos",
      contenido: <div className="grid gap-6 lg:grid-cols-3">{hallazgos.slice(k * 3, k * 3 + 3).map((h, j) => <TarjetaHallazgo key={h.id} h={h} grande i={j} />)}</div>,
    })),
  ]
  const n = escenas.length
  const idx = Math.min(i, n - 1)
  const e = escenas[idx]
  const ir = useCallback((d: number) => setI(x => ((x + d) % n + n) % n), [n])

  // Pantalla completa, foco, scroll bloqueado y Wake Lock
  useEffect(() => {
    const el = ref.current
    const previo = document.activeElement as HTMLElement | null
    el?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    if (el?.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => {})
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock?.request("screen").then(l => { lock = l }).catch(() => {})
    return () => {
      document.body.style.overflow = overflow
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
      lock?.release().catch(() => {})
      previo?.focus?.()
    }
  }, [])

  // Rotación automática
  useEffect(() => {
    if (pausa || reducido || n <= 1) return
    const t = setTimeout(() => ir(1), DURACION_ESCENA_MS)
    return () => clearTimeout(t)
  }, [idx, pausa, reducido, n, ir])

  // El reloj se reproduce en bucle mientras su escena está visible
  useEffect(() => {
    if (e.id === "reloj" && !reducido) reproducir(0)
    else parar()
  }, [e.id, reducido, reproducir, parar])

  // Hora en la cabecera
  useEffect(() => { const t = setInterval(() => setHora(new Date()), 20_000); return () => clearInterval(t) }, [])

  // Teclado
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "ArrowRight" || ev.key === "PageDown") { ev.preventDefault(); ir(1) }
      else if (ev.key === "ArrowLeft" || ev.key === "PageUp") { ev.preventDefault(); ir(-1) }
      else if (ev.key === " ") { ev.preventDefault(); setPausa(p => !p) }
      else if (ev.key === "Escape") cerrarRef.current()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [ir])

  // Cursor y controles se ocultan tras 3 s sin mover el ratón
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const despertar = useCallback(() => {
    setQuieto(false)
    if (temporizador.current) clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => setQuieto(true), 3000)
  }, [])
  useEffect(() => {
    temporizador.current = setTimeout(() => setQuieto(true), 3000)
    return () => { if (temporizador.current) clearTimeout(temporizador.current) }
  }, [])

  const btn = "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-teal-300"
  const controles = `transition-opacity duration-500 ${quieto ? "pointer-events-none opacity-0" : "opacity-100"}`

  return createPortal(
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-roledescription="modo pantalla" aria-label={`Pulso del laboratorio · ${hospitalNombre}`}
      className={`dark ${s.ink} ${s.overlayIn} fixed inset-0 z-[90] flex flex-col text-white outline-none ${quieto ? "cursor-none" : ""}`}
      onMouseMove={despertar} onPointerDown={despertar}>
      <span className={s.aurora} style={{ width: 640, height: 640, left: "-12%", top: "-22%", background: "#00A99D" }} />
      <span className={s.aurora} style={{ width: 520, height: 520, right: "-10%", bottom: "-20%", background: "#F7941D", animationDelay: "-7s" }} />

      <header className="relative flex items-center justify-between gap-4 px-6 py-4 sm:px-10" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        <div className="flex min-w-0 items-center gap-5">
          <BrandLockup size="lg" />
          <div className="min-w-0 border-l border-white/15 pl-5">
            <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.2em] text-teal-300"><span className="pulso-latido" aria-hidden="true" />Pulso del laboratorio</p>
            <p className="truncate text-lg font-extrabold">{hospitalNombre}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="font-mono text-2xl font-bold tabular-nums">{hora.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</p>
            {hastaCobertura && <p className="text-[11px] text-slate-400">datos hasta el {fmtDia(hastaCobertura, { day: "numeric", month: "short", year: "numeric" })}{filtros.areas.length ? ` · ${filtros.areas.length === 1 ? etiquetaArea(filtros.areas[0]) : `${filtros.areas.length} work areas`}` : ""}</p>}
          </div>
          <button type="button" onClick={onCerrar} className={`${btn} ${controles}`} aria-label="Salir del modo pantalla" title="Salir (Esc)"><IconX size={18} /></button>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden px-6 pb-4 sm:px-10">
        <section key={e.id} className={`${s.slideNext} mx-auto w-full max-w-[1500px]`} aria-label={e.titulo} aria-live="polite">
          <p className="text-sm font-extrabold uppercase tracking-[.22em] text-teal-300">{e.eyebrow}</p>
          <h2 className="mb-7 mt-1.5 text-3xl font-extrabold tracking-[-.02em] sm:text-4xl">{e.titulo}</h2>
          {e.contenido}
        </section>
      </main>

      <footer className="relative px-6 pb-5 sm:px-10" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
        <div className={`mb-3 flex items-center justify-center gap-3 ${controles}`}>
          <button type="button" onClick={() => ir(-1)} className={btn} aria-label="Escena anterior"><IconChevronLeft size={18} /></button>
          <button type="button" onClick={() => setPausa(p => !p)} className={btn} aria-label={pausa ? "Reanudar" : "Pausar"} title={pausa ? "Reanudar (espacio)" : "Pausar (espacio)"}>{pausa ? <IconPlay size={16} /> : <IconPause size={16} />}</button>
          <button type="button" onClick={() => ir(1)} className={btn} aria-label="Escena siguiente"><IconChevronRight size={18} /></button>
        </div>
        <div className="flex gap-1.5" aria-hidden="true">
          {escenas.map((x, k) => (
            <div key={x.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-200 ${k === idx && !pausa && !reducido ? "pulso-tv-progreso" : ""}`}
                style={{ width: k < idx ? "100%" : k === idx && (pausa || reducido) ? "100%" : k === idx ? undefined : "0%", animationDuration: `${DURACION_ESCENA_MS}ms` }} key={`${x.id}-${k === idx ? idx : "x"}`} />
            </div>
          ))}
        </div>
      </footer>
    </div>,
    document.body,
  )
}
