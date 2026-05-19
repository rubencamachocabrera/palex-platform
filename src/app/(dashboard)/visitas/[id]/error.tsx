"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { TEAL } from "@/lib/brand"

export default function VisitaError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Visita error]", error)
  }, [error])

  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="12" y1="13" x2="12" y2="17"/>
        <line x1="12" y1="10" x2="12.01" y2="10"/>
      </svg>
      <div>
        <h2 className="text-base font-semibold text-gray-800">Error al cargar la visita</h2>
        <p className="text-sm text-gray-500 mt-1">No se pudo obtener la información de esta visita.</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: TEAL }}
        >
          Reintentar
        </button>
        <button
          onClick={() => router.push("/visitas")}
          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50"
        >
          Mis visitas
        </button>
      </div>
    </div>
  )
}
