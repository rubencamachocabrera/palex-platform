"use client"

import { useEffect, useRef, useState } from "react"

/**
 * CountUp — anima una cifra desde 0 hasta su valor al aparecer.
 * Acepta números o strings con un número embebido ("24%", "€1.200", "3/5");
 * si no hay número, muestra el valor tal cual. Respeta prefers-reduced-motion.
 * El HTML inicial (SSR) ya contiene el valor final: sin JS, se ve correcto.
 */
export function CountUp({ value, duration = 900 }: { value: string | number; duration?: number }) {
  const text = String(value)
  const match = text.match(/-?\d+(?:[.,]\d+)?/)
  const [display, setDisplay] = useState(text)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!match) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const raw = match[0]
    const target = parseFloat(raw.replace(",", "."))
    if (!isFinite(target) || target === 0) return
    const decimals = raw.includes(".") || raw.includes(",") ? raw.split(/[.,]/)[1].length : 0
    const sep = raw.includes(",") ? "," : "."
    const [pre, post] = [text.slice(0, match.index), text.slice((match.index ?? 0) + raw.length)]

    let frame = 0
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 4) // ease-out-quart
      const n = (target * eased).toFixed(decimals).replace(".", sep)
      setDisplay(pre + n + post)
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, duration])

  return <span ref={ref} className="tabular-nums">{display}</span>
}
