"use client"

import { useEffect } from "react"
import { TEAL } from "@/lib/brand"

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Dashboard error]", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div>
        <h2 className="text-base font-semibold text-gray-800">Error al cargar el dashboard</h2>
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
