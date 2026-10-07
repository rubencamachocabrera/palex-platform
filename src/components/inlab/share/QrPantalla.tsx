"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { BrandLockup } from "@/components/ui/BrandLockup"
import { IconX } from "@/components/ui/Icons"
import { QrCodigo } from "./QrCodigo"
import type { QrGeometria } from "./qr"
import s from "./share.module.css"

/**
 * "Presentar en pantalla": QR a pantalla completa para que los asistentes de una
 * reunión lo escaneen desde su móvil. Pantalla completa real si el navegador lo
 * permite (iPhone no: queda como overlay fijo). Esc o el botón cierran.
 */
export function QrPantalla({ g, url, hospital, periodo, alcance, onCerrar }: {
  g: QrGeometria; url: string; hospital: string; periodo: string; alcance: string; onCerrar: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const cerrarRef = useRef(onCerrar)
  useEffect(() => { cerrarRef.current = onCerrar }, [onCerrar])

  useEffect(() => {
    const el = ref.current
    const previo = document.activeElement as HTMLElement | null
    el?.focus()
    let entro = false
    if (el?.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().then(() => { entro = true }).catch(() => {})
    }
    // Con pantalla completa el navegador consume Esc: al salir de ella cerramos
    const onFs = () => { if (!document.fullscreenElement && entro) cerrarRef.current() }
    // Captura: el Esc cierra solo esta capa, no el modal que hay debajo
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); cerrarRef.current() } }
    document.addEventListener("fullscreenchange", onFs)
    window.addEventListener("keydown", onKey, true)
    return () => {
      document.removeEventListener("fullscreenchange", onFs)
      window.removeEventListener("keydown", onKey, true)
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
      previo?.focus?.()
    }
  }, [])

  const corto = url.replace(/^https?:\/\//, "").replace(/(\/share\/inlab\/.{6}).+$/, "$1…")

  return createPortal(
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`QR del informe InLab de ${hospital}`}
      className={`${s.ink} ${s.overlayIn} fixed inset-0 z-[90] flex flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-10 outline-none`}>
      <span className={s.aurora} style={{ width: 520, height: 520, left: "-10%", top: "-15%", background: "#00A99D" }} />
      <span className={s.aurora} style={{ width: 420, height: 420, right: "-8%", bottom: "-12%", background: "#F7941D", animationDelay: "-6s" }} />
      <button type="button" onClick={onCerrar} aria-label="Cerrar" className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur hover:bg-white/20" style={{ top: "max(1rem, env(safe-area-inset-top))" }}>
        <IconX size={20} />
      </button>
      <div className={s.rise}><BrandLockup size="lg" /></div>
      <div className={`${s.rise} text-center`} style={{ ["--d" as string]: "80ms" }}>
        <p className="text-[11px] font-extrabold uppercase tracking-[.22em] text-teal-200">Informe Inteligencia InLab</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-[-.02em] sm:text-4xl">{hospital}</h2>
        <p className="mt-1 text-sm text-slate-300 sm:text-base">{periodo} · {alcance}</p>
      </div>
      <div className={`${s.pulse} ${s.rise} rounded-[28px] bg-[#fff] p-4 shadow-[0_40px_120px_-30px_rgba(0,169,157,.65)] sm:p-6`} style={{ ["--d" as string]: "160ms" }}>
        <QrCodigo g={g} tamano="min(56vh, 78vw)" etiqueta={`Código QR del enlace ${url}`} />
      </div>
      <div className={`${s.rise} text-center`} style={{ ["--d" as string]: "240ms" }}>
        <p className="text-lg font-bold sm:text-xl">Escanea con la cámara del móvil</p>
        <p className="mt-1 font-mono text-xs text-slate-400">{corto}</p>
      </div>
      <p className="absolute bottom-4 hidden text-[11px] text-slate-500 sm:block">Esc para salir</p>
    </div>,
    document.body,
  )
}
