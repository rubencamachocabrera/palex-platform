"use client"

import { useEffect } from "react"
import { TEAL } from "@/lib/brand"

export default function ProyectosError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Proyectos error]", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
      <div>
        <h2 className="text-base font-semibold text-gray-800">Error al cargar proyectos</h2>
        <p className="text-sm text-gray-500 mt-1">Algo salió mal. Intenta de nuevo.</p>
      </div>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg text-sm font-medium text-white"
        style={{ backgroundColor: TEAL }}
      >
        Reintentar
      </button>
    </div>
  )
}
