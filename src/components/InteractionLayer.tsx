"use client"

import { useEffect } from "react"

/**
 * InteractionLayer — foco de luz que sigue al cursor sobre las superficies.
 *
 * Un único listener delegado en document: localiza la tarjeta bajo el puntero
 * y escribe --mx/--my (coordenadas locales) que globals.css usa como centro de
 * un radial-gradient. No renderiza nada ni toca el layout. Se desactiva en
 * dispositivos táctiles y con prefers-reduced-motion.
 */
const SELECTOR = [
  ".card",
  ".stat-card",
  ".data-table-surface",
  ".dashboard-kpi",
  ".app-main .bg-white.rounded-xl",
  ".app-main .bg-white.rounded-2xl",
  ".app-main .bg-white.rounded-3xl",
].join(",")

export function InteractionLayer() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)")
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (!fine.matches || reduced.matches) return

    let current: HTMLElement | null = null
    let frame = 0
    let lastX = 0
    let lastY = 0

    const clear = (el: HTMLElement) => {
      el.style.removeProperty("--mx")
      el.style.removeProperty("--my")
      el.classList.remove("is-spotlit")
    }

    const paint = () => {
      frame = 0
      const target = document.elementFromPoint(lastX, lastY) as HTMLElement | null
      // closest() devuelve la tarjeta más interna: el foco sigue a la superficie
      // concreta bajo el puntero, también en tarjetas anidadas.
      const el = target?.closest<HTMLElement>(SELECTOR) ?? null
      if (el !== current) {
        if (current) clear(current)
        current = el
        if (el) el.classList.add("is-spotlit")
      }
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.setProperty("--mx", `${lastX - r.left}px`)
      el.style.setProperty("--my", `${lastY - r.top}px`)
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return
      lastX = e.clientX
      lastY = e.clientY
      if (!frame) frame = requestAnimationFrame(paint)
    }

    const onLeave = () => {
      if (current) clear(current)
      current = null
    }

    document.addEventListener("pointermove", onMove, { passive: true })
    document.addEventListener("pointerleave", onLeave)
    window.addEventListener("blur", onLeave)
    return () => {
      document.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerleave", onLeave)
      window.removeEventListener("blur", onLeave)
      if (frame) cancelAnimationFrame(frame)
      if (current) clear(current)
    }
  }, [])

  return null
}
