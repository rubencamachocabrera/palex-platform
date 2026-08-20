"use client"

import { useEffect, useRef } from "react"

// Cierre con Escape + devolución de foco al elemento que abrió el modal.
// No hace focus trap completo (no es necesario con backdrop + pocos elementos focusables);
// sí mueve el foco al contenedor del modal al abrir para que el lector de pantalla lo anuncie.
export function useModalA11y(abierto: boolean, onCerrar: () => void) {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const previoRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!abierto) return

    previoRef.current = document.activeElement as HTMLElement | null
    // Si un campo interno ya tiene el foco (p.ej. autoFocus en un input), lo respetamos.
    if (!contenedorRef.current?.contains(document.activeElement)) {
      contenedorRef.current?.focus()
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar()
    }
    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
      previoRef.current?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  return contenedorRef
}
