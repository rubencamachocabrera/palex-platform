"use client"

import { useEffect, useRef } from "react"

/**
 * Conecta una acción del QuickActionsFAB (CustomEvent "fab:*") con la página.
 *
 * El FAB despacha eventos cancelables: el receptor que la atiende llama a
 * preventDefault(). Si nadie la atiende (p. ej. el formulario vive en una
 * pestaña aún no montada), el FAB la guarda como "pendiente" y el primer
 * useFabAction con ese nombre que se monte la ejecuta. Así una pestaña puede
 * cambiar de tab sin consumir el evento y el componente hijo lo recoge al montar.
 */
type PendingWindow = Window & { __palexFabPending?: { name: string; detail: unknown; at: number } }

const PENDING_TTL_MS = 4000

export function dispatchFabAction(name: string, detail?: unknown) {
  const ev = new CustomEvent(name, { detail, cancelable: true })
  const handled = !window.dispatchEvent(ev)
  if (!handled) (window as PendingWindow).__palexFabPending = { name, detail, at: Date.now() }
}

export function useFabAction<T = unknown>(
  name: string,
  handler: (detail: T) => void,
  { consume = true }: { consume?: boolean } = {},
) {
  const ref = useRef(handler)
  useEffect(() => { ref.current = handler })

  useEffect(() => {
    const onEvent = (e: Event) => {
      if (consume) e.preventDefault()
      ref.current((e as CustomEvent<T>).detail)
    }
    window.addEventListener(name, onEvent)

    // Acción pendiente lanzada justo antes de montar este componente
    const w = window as PendingWindow
    const p = w.__palexFabPending
    if (consume && p && p.name === name && Date.now() - p.at < PENDING_TTL_MS) {
      w.__palexFabPending = undefined
      // Diferido: deja que el componente termine de montar antes de abrir modales
      setTimeout(() => ref.current(p.detail as T), 0)
    }
    return () => window.removeEventListener(name, onEvent)
  }, [name, consume])
}
