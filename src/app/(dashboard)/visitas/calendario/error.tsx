"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { TEAL } from "@/lib/brand"

export default function CalendarioError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Calendario error]", error)
  }, [error])

  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <line x1="12" y1="15" x2="12" y2="17"/>
      </svg>
      <div>
        <h2 className="text-base font-semibold text-gray-800">Error al cargar el calendario</h2>
        <p className="text-sm text-gray-500 mt-1">No se pudieron obtener las visitas del mes.</p>
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
