"use client"

import { useEffect } from "react"
import { TEAL } from "@/lib/brand"

export default function MapaError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Mapa error]", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
        <line x1="9" y1="3" x2="9" y2="18" />
        <line x1="15" y1="6" x2="15" y2="21" />
      </svg>
      <div>
        <h2 className="text-base font-semibold text-gray-800">Error al cargar el mapa</h2>
        <p className="text-sm text-gray-500 mt-1">No se pudieron obtener los datos de hospitales.</p>
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
