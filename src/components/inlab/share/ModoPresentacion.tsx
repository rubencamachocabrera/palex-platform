"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { BrandLockup } from "@/components/ui/BrandLockup"
import { IconArrowLeft, IconArrowRight, IconMonitor, IconX } from "@/components/ui/Icons"
import s from "./share.module.css"

export interface Diapositiva { id: string; titulo: string; eyebrow?: string; contenido: React.ReactNode }

/**
 * Modo presentación del informe público: diapositivas a pantalla completa, siempre en
 * tema oscuro (clase `dark` local: las vistas usan variantes dark:), navegación con
 * ←/→, espacio, RePág/AvPág, Inicio/Fin, deslizar en táctil y puntos clicables.
 * Esc sale (en pantalla completa real, el navegador consume Esc y cerramos al salir).
 */
export function ModoPresentacion({ diapositivas, titulo, onCerrar }: { diapositivas: Diapositiva[]; titulo: string; onCerrar: () => void }) {
  const [i, setI] = useState(0)
  const [dir, setDir] = useState<1 | -1>(1)
  const [fs, setFs] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const toque = useRef<{ x: number; y: number } | null>(null)
  const cerrarRef = useRef(onCerrar)
  useEffect(() => { cerrarRef.current = onCerrar }, [onCerrar])
  const n = diapositivas.length

  const ir = useCallback((destino: number) => {
    const d = Math.max(0, Math.min(n - 1, destino))
    if (d === i) return
    setDir(d > i ? 1 : -1)
    setI(d)
  }, [i, n])

  // Cada diapositiva empieza arriba
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }) }, [i])

  useEffect(() => {
    const el = ref.current
    const previo = document.activeElement as HTMLElement | null
    el?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onFs = () => setFs(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onFs)
    // Se abre desde un clic (activación de usuario vigente): intentamos pantalla completa real.
    // Si el navegador no la permite (iPhone), queda como overlay fijo. Esc dentro de ella solo
    // sale de la pantalla completa; un segundo Esc cierra la presentación.
    if (el?.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => {})
    return () => {
      document.removeEventListener("fullscreenchange", onFs)
      document.body.style.overflow = overflow
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
      previo?.focus?.()
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return
      if (e.key === "ArrowRight" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)) { e.preventDefault(); ir(i + 1) }
      else if (e.key === "ArrowLeft" || e.key === "PageUp" || (e.key === " " && e.shiftKey)) { e.preventDefault(); ir(i - 1) }
      else if (e.key === "Home") { e.preventDefault(); ir(0) }
      else if (e.key === "End") { e.preventDefault(); ir(n - 1) }
      else if (e.key === "Escape") cerrarRef.current()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [ir, i, n])

  const alternarFs = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else ref.current?.requestFullscreen?.().catch(() => {})
  }
  const puedeFs = typeof document !== "undefined" && !!document.documentElement.requestFullscreen

  const d = diapositivas[i]
  const btn = "flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-30"

  return createPortal(
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-roledescription="presentación" aria-label={`Presentación · ${titulo}`}
      className={`dark ${s.ink} ${s.overlayIn} fixed inset-0 z-[90] flex flex-col outline-none`}
      onPointerDown={e => { if (e.pointerType === "touch") toque.current = { x: e.clientX, y: e.clientY } }}
      onPointerUp={e => {
        const t0 = toque.current; toque.current = null
        if (!t0) return
        const dx = e.clientX - t0.x, dy = e.clientY - t0.y
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) ir(i + (dx < 0 ? 1 : -1))
      }}
      onPointerCancel={() => { toque.current = null }}
    >
      <span className={s.aurora} style={{ width: 560, height: 560, left: "-12%", top: "-20%", background: "#00A99D" }} />
      <span className={s.aurora} style={{ width: 460, height: 460, right: "-10%", bottom: "-18%", background: "#F7941D", animationDelay: "-7s" }} />

      {/* Progreso */}
      <div className="h-1 w-full bg-white/10" aria-hidden="true">
        <div className={`${s.progress} h-full`} style={{ width: `${((i + 1) / n) * 100}%`, background: "linear-gradient(90deg, #00A99D, #5ff2e4 70%, #F7941D)" }} />
      </div>

      <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-8" style={{ paddingTop: "max(.75rem, env(safe-area-inset-top))" }}>
        <div className="flex min-w-0 items-center gap-4">
          <span className="hidden sm:inline-flex"><BrandLockup /></span>
          <p className="truncate text-xs font-semibold text-slate-300">{titulo}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-xs tabular-nums text-slate-400" aria-live="polite">{i + 1} / {n}</span>
          {puedeFs && <button type="button" onClick={alternarFs} className={btn} aria-label={fs ? "Salir de pantalla completa" : "Pantalla completa"} title={fs ? "Salir de pantalla completa" : "Pantalla completa"}><IconMonitor size={17} /></button>}
          <button type="button" onClick={onCerrar} className={btn} aria-label="Salir de la presentación" title="Salir (Esc)"><IconX size={18} /></button>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 sm:px-8">
        <section key={d.id} className={`${dir === 1 ? s.slideNext : s.slidePrev} mx-auto max-w-6xl`} aria-label={d.titulo}>
          {d.id !== "portada" && (
            <div className="mb-5 mt-2">
              {d.eyebrow && <p className="text-[11px] font-extrabold uppercase tracking-[.2em] text-teal-300">{d.eyebrow}</p>}
              <h2 className="mt-1 text-2xl font-extrabold tracking-[-.02em] text-white sm:text-3xl">{d.titulo}</h2>
            </div>
          )}
          {d.contenido}
        </section>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 sm:px-8" style={{ paddingBottom: "max(.75rem, env(safe-area-inset-bottom))" }}>
        <button type="button" onClick={() => ir(i - 1)} disabled={i === 0} className={btn} aria-label="Diapositiva anterior"><IconArrowLeft size={18} /></button>
        <div className="flex flex-wrap items-center justify-center gap-1.5" role="tablist" aria-label="Diapositivas">
          {diapositivas.map((x, k) => (
            <button key={x.id} type="button" role="tab" aria-selected={k === i} aria-label={x.titulo} title={x.titulo} onClick={() => ir(k)}
              className="flex h-8 items-center justify-center px-0.5">
              <span className={`block h-2 rounded-full transition-all duration-300 ${k === i ? "w-7 bg-teal-300" : "w-2 bg-white/30 hover:bg-white/60"}`} />
            </button>
          ))}
        </div>
        <button type="button" onClick={() => ir(i + 1)} disabled={i === n - 1} className={btn} aria-label="Diapositiva siguiente"><IconArrowRight size={18} /></button>
      </footer>
      <p className="pointer-events-none absolute bottom-16 left-1/2 hidden -translate-x-1/2 text-[10px] text-slate-500 lg:block">← → para navegar · Esc para salir</p>
    </div>,
    document.body,
  )
}
