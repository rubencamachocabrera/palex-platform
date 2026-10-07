"use client"

import { useEffect, useRef, useState } from "react"

/**
 * ActivityIndicator — feedback global de red.
 *
 * Envuelve window.fetch (una sola vez, idempotente) para contar las peticiones
 * a /api en curso. Si alguna tarda más de 150 ms se muestra una línea de energía
 * indeterminada bajo la topbar y se marca <html data-busy> (la topbar pulsa).
 * Las peticiones rápidas no producen parpadeo. No altera la respuesta ni los errores.
 */
const EVENT = "palex:net"
type NetWindow = Window & { __palexFetchPatched?: boolean; __palexInflight?: number }

function patchFetch() {
  const w = window as NetWindow
  if (w.__palexFetchPatched) return
  w.__palexFetchPatched = true
  w.__palexInflight = 0
  const original = window.fetch.bind(window)

  const isApi = (input: RequestInfo | URL) => {
    try {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
      const u = new URL(url, location.origin)
      // Polling de fondo (notificaciones, presencia) no debe encender el indicador
      return u.origin === location.origin && u.pathname.startsWith("/api/")
        && !u.pathname.startsWith("/api/presence") && !u.pathname.startsWith("/api/notificaciones")
    } catch { return false }
  }

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (!isApi(input)) return original(input, init)
    w.__palexInflight = (w.__palexInflight ?? 0) + 1
    window.dispatchEvent(new CustomEvent(EVENT))
    return original(input, init).finally(() => {
      w.__palexInflight = Math.max(0, (w.__palexInflight ?? 1) - 1)
      window.dispatchEvent(new CustomEvent(EVENT))
    })
  }
}

export function ActivityIndicator() {
  const [busy, setBusy] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    patchFetch()
    const onNet = () => {
      const n = (window as NetWindow).__palexInflight ?? 0
      if (n > 0) {
        if (!timer.current) timer.current = setTimeout(() => { timer.current = null; setBusy(true) }, 150)
      } else {
        if (timer.current) { clearTimeout(timer.current); timer.current = null }
        setBusy(false)
      }
    }
    window.addEventListener(EVENT, onNet)
    return () => {
      window.removeEventListener(EVENT, onNet)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  useEffect(() => {
    if (busy) document.documentElement.setAttribute("data-busy", "")
    else document.documentElement.removeAttribute("data-busy")
  }, [busy])

  return (
    <div className={`net-activity${busy ? " is-busy" : ""}`} role="progressbar" aria-hidden={!busy} aria-label="Cargando datos">
      <span className="net-activity-beam" />
    </div>
  )
}
