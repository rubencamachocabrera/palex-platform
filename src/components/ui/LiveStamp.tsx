"use client"

import { useEffect, useState } from "react"

const fmt = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "2-digit", month: "short" })
const fmtHora = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" })

/**
 * Sello temporal en vivo para cabeceras ("● LUN 06 OCT · 18:42").
 * Se renderiza solo en cliente para evitar desajustes de hidratación por zona horaria.
 */
export function LiveStamp() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const tick = () => setNow(new Date())
    const first = setTimeout(tick, 0)
    const id = setInterval(tick, 30_000)
    return () => { clearTimeout(first); clearInterval(id) }
  }, [])

  return (
    <span className="page-header-eyebrow inline-flex items-center gap-2 text-gray-500 dark:text-slate-400">
      <span className="live-dot" aria-hidden="true" />
      <span className="min-w-[9.5rem]">
        {now ? `${fmt.format(now).replace(/\./g, "")} · ${fmtHora.format(now)}` : " "}
      </span>
    </span>
  )
}
