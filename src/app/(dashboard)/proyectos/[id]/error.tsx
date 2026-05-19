"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { TEAL } from "@/lib/brand"

export default function ProyectoError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Proyecto error]", error)
  }, [error])

  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
      <div>
        <h2 className="text-base font-semibold text-gray-800">Error al cargar el proyecto</h2>
        <p className="text-sm text-gray-500 mt-1">No se pudo obtener la información de este proyecto.</p>
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
          onClick={() => router.push("/proyectos")}
          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50"
        >
          Proyectos
        </button>
      </div>
    </div>
  )
}
