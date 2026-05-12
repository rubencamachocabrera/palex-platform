"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function useKeyboardShortcuts() {
  const router = useRouter()

  useEffect(() => {
    let gPressed = false
    let gTimer: ReturnType<typeof setTimeout>

    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

      const ctrl = e.metaKey || e.ctrlKey

      // Cmd/Ctrl+K -> abrir busqueda
      if (ctrl && e.key === "k") {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent("palex:search"))
        return
      }

      // Escape -> cerrar modales
      if (e.key === "Escape") {
        window.dispatchEvent(new CustomEvent("palex:escape"))
        return
      }

      // G+X navegacion rapida
      if (e.key === "g" && !ctrl) {
        gPressed = true
        clearTimeout(gTimer)
        gTimer = setTimeout(() => { gPressed = false }, 1000)
        return
      }

      if (gPressed) {
        gPressed = false
        clearTimeout(gTimer)
        const routes: Record<string, string> = {
          h: "/dashboard",
          v: "/visitas",
          p: "/ventas/pipeline",
          d: "/admin/usuarios",
        }
        const route = routes[e.key]
        if (route) router.push(route)
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [router])
}
