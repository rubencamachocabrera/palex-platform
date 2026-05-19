"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { TEAL } from "@/lib/brand"

export default function HospitalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Hospital error]", error)
  }, [error])

  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
      <div>
        <h2 className="text-base font-semibold text-gray-800">Error al cargar el hospital</h2>
        <p className="text-sm text-gray-500 mt-1">No se pudo obtener la información de este hospital.</p>
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
          onClick={() => router.push("/hospitales")}
          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50"
        >
          Hospitales
        </button>
      </div>
    </div>
  )
}
