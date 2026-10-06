"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const ref = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    const el = ref.current
    if (el) {
      el.classList.remove("page-enter")
      void el.offsetHeight
      el.classList.add("page-enter")
    }
    // Barra de energía superior: confirma el cambio de ruta (no en la carga inicial)
    if (firstRender.current) { firstRender.current = false; return }
    const bar = barRef.current
    if (bar) {
      bar.classList.remove("is-running")
      void bar.offsetWidth
      bar.classList.add("is-running")
    }
  }, [pathname])

  return (
    <>
      <div ref={barRef} className="route-progress" aria-hidden="true" />
      <div ref={ref} className="page-enter page-content h-full">
        {children}
      </div>
    </>
  )
}
