"use client"

import { useEffect } from "react"
import { TEAL, ORANGE, ORANGE_LIGHT } from "@/lib/brand"

export default function ProyectosError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[Pre-Proyectos]", error) }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: ORANGE_LIGHT }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div>
        <h2 className="text-base font-semibold text-gray-800">Error al cargar proyectos</h2>
        <p className="text-sm text-gray-500 mt-1">No se pudo obtener la lista. Intenta de nuevo.</p>
        {error.digest && <p className="text-xs text-gray-300 font-mono mt-2">ref: {error.digest}</p>}
      </div>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: TEAL }}
        >
          Reintentar
        </button>
        <a
          href="/dashboard"
          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          Dashboard
        </a>
      </div>
    </div>
  )
}
