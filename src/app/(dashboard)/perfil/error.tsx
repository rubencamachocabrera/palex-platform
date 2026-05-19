"use client"

import { useEffect } from "react"
import { TEAL } from "@/lib/brand"

export default function PerfilError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Perfil error]", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      <div>
        <h2 className="text-base font-semibold text-gray-800">Error al cargar el perfil</h2>
        <p className="text-sm text-gray-500 mt-1">No se pudieron obtener tus datos.</p>
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
