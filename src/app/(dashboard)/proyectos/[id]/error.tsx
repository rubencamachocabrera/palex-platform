"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { TEAL } from "@/lib/brand"

export default function ProyectoError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[Pre-Proyecto]", error) }, [error])
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "#FEF3E5" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F7941D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
      </div>
      <div>
        <h2 className="text-base font-semibold text-gray-800">Error al cargar el proyecto</h2>
        <p className="text-sm text-gray-500 mt-1">No se pudo obtener la información de este proyecto.</p>
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
        <button
          onClick={() => router.push("/proyectos")}
          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          Volver
        </button>
      </div>
    </div>
  )
}
